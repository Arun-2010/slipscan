import { useLocalSearchParams } from 'expo-router';
import { Eye, EyeOff, MailCheck } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authErrorMessage, useSignIn, useSignUp } from '@/api/auth';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Form';
import { Header } from '@/components/Header';
import { colors, fonts, radius, TOUCH } from '@/theme';

type Mode = 'signup' | 'login';

const MIN_PASSWORD = 8;

export default function AuthScreen() {
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'login' ? 'login' : 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const signUp = useSignUp();
  const signIn = useSignIn();

  const active = mode === 'signup' ? signUp : signIn;
  const cleanEmail = email.trim().toLowerCase();
  const errors = {
    email: /^\S+@\S+\.\S+$/.test(cleanEmail) ? null : 'Enter a valid email address.',
    // Same rule as the Supabase project setting (8+ chars, letters and digits).
    password:
      mode === 'login' || (password.length >= MIN_PASSWORD && /[A-Za-z]/.test(password) && /\d/.test(password))
        ? password.length > 0
          ? null
          : 'Enter your password.'
        : `Use at least ${MIN_PASSWORD} characters with letters and numbers.`,
  };
  const valid = !errors.email && !errors.password;

  const switchMode = (next: Mode) => {
    setMode(next);
    setSubmitted(false);
    signUp.reset();
    signIn.reset();
  };

  // On success the session changes and the root layout moves on to the name screen.
  const onSubmit = () => {
    setSubmitted(true);
    if (!valid) return;
    if (mode === 'login') {
      signIn.mutate({ email: cleanEmail, password });
      return;
    }
    signUp.mutate(
      { email: cleanEmail, password },
      {
        onSuccess: ({ needsConfirmation }) => {
          if (needsConfirmation) {
            setSentTo(cleanEmail);
            switchMode('login');
          }
        },
      },
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Header title={mode === 'signup' ? 'Create your account' : 'Welcome back'} back />
          <AppText variant="body" color={colors.muted} style={styles.lead}>
            {mode === 'signup'
              ? 'Your bills are saved to your account, so they are safe even if you change phones.'
              : 'Log in to see your bills and monthly limit.'}
          </AppText>

          <View style={styles.tabs} accessibilityRole="tablist">
            {(['signup', 'login'] as const).map((m) => (
              <Pressable
                key={m}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === m }}
                onPress={() => switchMode(m)}
                style={[styles.tab, mode === m && styles.tabActive]}>
                <AppText style={[styles.tabText, mode === m && styles.tabTextActive]}>
                  {m === 'signup' ? 'Create account' : 'Log in'}
                </AppText>
              </Pressable>
            ))}
          </View>

          {sentTo && (
            <View style={styles.notice} accessibilityRole="alert">
              <MailCheck size={20} color={colors.primary} />
              <AppText variant="body" color={colors.primaryDeep} style={styles.flex}>
                We sent a confirmation link to {sentTo}. Open it, then log in here.
              </AppText>
            </View>
          )}

          <Field label="Email" error={submitted ? errors.email : null}>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              maxLength={254}
            />
          </Field>

          <Field label="Password" error={submitted ? errors.password : null}>
            <View>
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'signup' ? '8+ characters, letters and numbers' : 'Your password'}
                maxLength={72}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                textContentType={mode === 'signup' ? 'newPassword' : 'password'}
                style={styles.passwordInput}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                onPress={() => setShowPassword((s) => !s)}
                style={styles.eye}>
                {showPassword ? <EyeOff size={20} color={colors.muted} /> : <Eye size={20} color={colors.muted} />}
              </Pressable>
            </View>
          </Field>

          {active.isError && (
            <AppText variant="body" color={colors.danger} accessibilityLiveRegion="polite">
              {authErrorMessage(active.error)}
            </AppText>
          )}

          <Button label={mode === 'signup' ? 'Create account' : 'Log in'} onPress={onSubmit} loading={active.isPending} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 18 },
  lead: { marginTop: -12 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radius.button,
    padding: 4,
  },
  tab: { flex: 1, minHeight: TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: radius.button - 4 },
  tabActive: { backgroundColor: colors.card },
  tabText: { fontFamily: fonts.medium, fontSize: 15, color: colors.muted },
  tabTextActive: { fontFamily: fonts.semibold, color: colors.ink },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
  },
  passwordInput: { paddingRight: 52 },
  eye: { position: 'absolute', right: 2, top: 2, width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
});
