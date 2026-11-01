import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/api/auth';
import { useProfile } from '@/api/profile';
import { AlertProvider } from '@/components/AlertProvider';
import { ErrorState } from '@/components/StateView';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
  });
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AlertProvider>
            <StatusBar style="dark" />
            <AppStack />
          </AlertProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * Logged out → Welcome / Auth. Logged in without a name → Name.
 * Otherwise the main app. Expo Router sends the user to the first reachable screen.
 */
function AppStack() {
  const { ready, signedIn } = useAuth();
  const profile = useProfile(signedIn);
  const loading = !ready || (signedIn && profile.isPending);
  const hasName = !!profile.data?.name;

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  if (signedIn && profile.isError) {
    return (
      <View style={styles.error}>
        <ErrorState message="Couldn't connect to SlipScan. Check your internet and try again." onRetry={() => profile.refetch()} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={signedIn && hasName}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="scan" options={{ animation: 'slide_from_bottom', contentStyle: { backgroundColor: '#000' } }} />
        <Stack.Screen name="review" />
        <Stack.Screen name="bill/[id]" />
        <Stack.Screen name="set-limit" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="name" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="auth" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  error: { flex: 1, justifyContent: 'center', backgroundColor: colors.bg },
});
