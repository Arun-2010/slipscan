import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProfile, useSaveName } from '@/api/profile';
import { fetchSettings } from '@/api/settings';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Form';
import { Header } from '@/components/Header';
import { colors } from '@/theme';

const MAX_NAME = 40;

/** Asked once right after creating an account; also reachable from Settings to rename. */
export default function NameScreen() {
  const profile = useProfile();
  const save = useSaveName();
  const editing = !!profile.data?.name;
  const [text, setText] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const value = text ?? profile.data?.name ?? '';
  const error = value.trim() ? null : 'Enter your name.';

  const onSave = () => {
    setSubmitted(true);
    if (error) return;
    save.mutate(value, {
      onSuccess: async () => {
        if (editing) {
          router.back();
          return;
        }
        // New users pick a monthly limit next; returning users go straight home.
        const settings = await fetchSettings().catch(() => null);
        router.replace(settings ? '/' : { pathname: '/set-limit', params: { first: '1' } });
      },
    });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {editing ? (
            <Header title="Your name" back />
          ) : (
            <View style={styles.intro}>
              <AppText variant="title" accessibilityRole="header">
                What should we call you?
              </AppText>
              <AppText variant="body" color={colors.muted}>
                This is how SlipScan will greet you.
              </AppText>
            </View>
          )}

          <Field label="Your name" error={submitted ? error : null}>
            <Input
              value={value}
              onChangeText={setText}
              placeholder="e.g. Arun"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              maxLength={MAX_NAME}
              autoFocus={!editing}
              returnKeyType="done"
              onSubmitEditing={onSave}
            />
          </Field>

          {save.isError && (
            <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
              Couldn&apos;t save. Check your connection and try again.
            </AppText>
          )}
          <Button label={editing ? 'Save' : 'Continue'} onPress={onSave} loading={save.isPending} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: 24, paddingTop: 16, gap: 20 },
  intro: { gap: 8, marginTop: 32 },
});
