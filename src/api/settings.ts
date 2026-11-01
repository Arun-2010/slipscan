import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import type { Settings } from './types';

export const settingsKey = ['settings'] as const;

export async function fetchSettings(): Promise<Settings | null> {
  const { data, error } = await supabase.from('settings').select('*').maybeSingle<Settings>();
  if (error) throw error;
  return data;
}

export function useSettings() {
  return useQuery({ queryKey: settingsKey, queryFn: fetchSettings });
}

export type SettingsPatch = Partial<Omit<Settings, 'user_id'>>;

export async function upsertSettings(patch: SettingsPatch): Promise<Settings> {
  const { data: auth } = await supabase.auth.getSession();
  const userId = auth.session?.user.id;
  if (!userId) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('settings')
    .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' })
    .select('*')
    .single<Settings>();
  if (error) throw error;
  return data;
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertSettings,
    onSuccess: (data) => qc.setQueryData(settingsKey, data),
  });
}
