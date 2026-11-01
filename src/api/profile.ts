import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import type { Profile } from './types';

export const profileKey = ['profile'] as const;

export function useProfile(enabled = true) {
  return useQuery({
    queryKey: profileKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').maybeSingle<Profile>();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data: auth } = await supabase.auth.getSession();
      const userId = auth.session?.user.id;
      if (!userId) throw new Error('Not signed in');
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ user_id: userId, name: name.trim() }, { onConflict: 'user_id' })
        .select('*')
        .single<Profile>();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.setQueryData(profileKey, data),
  });
}
