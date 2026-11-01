import type { AuthError, Session } from '@supabase/supabase-js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { setScanDraft } from '@/lib/draft';
import { supabase } from '@/lib/supabase';

type AuthState = { ready: boolean; session: Session | null };

const AuthContext = createContext<AuthState>({ ready: false, session: null });

/** Tracks the Supabase session and clears cached data whenever the signed-in user changes. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [state, setState] = useState<AuthState>({ ready: false, session: null });
  const userId = useRef<string | null>(null);

  useEffect(() => {
    const apply = (session: Session | null) => {
      const id = session?.user.id ?? null;
      if (id !== userId.current) {
        // Never show one account's cached data (or a half-finished scan) to another.
        userId.current = id;
        qc.clear();
        setScanDraft(null);
      }
      setState({ ready: true, session });
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => apply(session));

    // Refresh tokens only while the app is in the foreground (Supabase's React Native advice).
    if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();
    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => {
      data.subscription.unsubscribe();
      appState.remove();
    };
  }, [qc]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const { ready, session } = useContext(AuthContext);
  const user = session?.user ?? null;
  // Anonymous sessions come from the earlier no-login version; they must create an account.
  const signedIn = !!user && !user.is_anonymous;
  return { ready, user, signedIn };
}

/** Friendly text for the auth errors people actually hit. */
export function authErrorMessage(error: unknown): string {
  const e = error as Partial<AuthError> | null;
  switch (e?.code) {
    case 'invalid_credentials':
      return 'Wrong email or password.';
    case 'email_exists':
    case 'user_already_exists':
      return 'An account with this email already exists. Log in instead.';
    case 'email_not_confirmed':
      return 'Confirm your email first — open the link we sent you, then log in.';
    case 'weak_password':
      return 'Choose a stronger password: at least 8 characters with letters and numbers.';
    case 'email_address_invalid':
      return "That email address doesn't look right.";
    case 'email_address_not_authorized':
      return "We can't send a confirmation email to this address yet. Try another email or ask the app owner.";
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many attempts. Please wait a bit and try again.';
    default:
      return e?.message || 'Something went wrong. Check your connection and try again.';
  }
}

export type SignUpResult = { needsConfirmation: boolean };

/**
 * Creates an account. If this phone already has an anonymous session (from the
 * no-login version), that user is upgraded in place so its bills are kept.
 */
async function signUp({ email, password }: { email: string; password: string }): Promise<SignUpResult> {
  const { data: current } = await supabase.auth.getSession();
  if (current.session?.user.is_anonymous) {
    const { data, error } = await supabase.auth.updateUser({ email, password });
    if (error) throw error;
    return { needsConfirmation: !!data.user.is_anonymous };
  }
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  // With email confirmation on, Supabase returns no session until the link is opened.
  return { needsConfirmation: !data.session };
}

export function useSignUp() {
  return useMutation({ mutationFn: signUp });
}

export function useSignIn() {
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
  });
}

export function useSignOut() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });
}
