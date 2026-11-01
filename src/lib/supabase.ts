import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

import { authStorage } from './secureStorage';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { storage: authStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } }
);
