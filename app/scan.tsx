import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera, ImageIcon, PlusCircle, X } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useScanBill } from '@/api/scan';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ScanningOverlay } from '@/components/ScanningOverlay';
import { setScanDraft } from '@/lib/draft';
import { colors, fonts, TOUCH } from '@/theme';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: false };

export default function Scan() {
  const scan = useScanBill();
  const [photo, setPhoto] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const handle = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPhoto(asset.uri);
    scan.mutate(
      { uri: asset.uri, width: asset.width },
      {
        onSuccess: (draft) => {
          setScanDraft(draft);
          router.replace('/review');
        },
      },
    );
  };

  const takePhoto = async () => {
    setPermissionError(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setPermissionError('Camera access is off. Allow it in your phone settings, or pick a photo from the gallery.');
      return;
    }
    handle(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
  };

  const pickPhoto = async () => {
    setPermissionError(null);
    handle(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
  };

  const busy = scan.isPending;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        <AppText style={styles.title} accessibilityRole="header">
          Scan a bill
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close scanner"
          onPress={() => router.back()}
          style={styles.close}
          disabled={busy}>
          <X size={24} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.frameWrap}>
        <View style={styles.frame}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} resizeMode="contain" accessibilityIgnoresInvertColors />
          ) : (
            <AppText style={styles.hint}>Lay the bill flat in good light and fit the whole bill in the photo.</AppText>
          )}
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
          {busy && <ScanningOverlay />}
        </View>
      </View>

      <View style={styles.bottom}>
        {(scan.isError || permissionError) && (
          <View style={styles.error} accessibilityRole="alert">
            <AppText style={styles.errorText}>{permissionError ?? scan.error?.message}</AppText>
          </View>
        )}
        <Button
          label={photo && !busy ? 'Take another photo' : 'Take photo'}
          icon={<Camera size={20} color={colors.white} />}
          onPress={takePhoto}
          disabled={busy}
        />
        <Button
          label="Choose from gallery"
          kind="secondary"
          icon={<ImageIcon size={20} color={colors.ink} />}
          onPress={pickPhoto}
          disabled={busy}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/add')}
          disabled={busy}
          style={styles.manual}>
          <PlusCircle size={18} color={colors.welcomeText} />
          <AppText style={styles.manualText}>No bill? Add manually</AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const CORNER = 28;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B1410' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  title: { fontFamily: fonts.semibold, fontSize: 20, color: colors.white },
  close: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  frameWrap: { flex: 1, padding: 24, justifyContent: 'center' },
  frame: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  hint: { fontFamily: fonts.regular, fontSize: 15, color: colors.welcomeText, textAlign: 'center', paddingHorizontal: 32 },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.scanAccent },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
  bottom: { paddingHorizontal: 24, paddingBottom: 16, gap: 12 },
  error: { backgroundColor: colors.dangerBg, borderRadius: 12, padding: 12 },
  errorText: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
  manual: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: TOUCH },
  manualText: { fontFamily: fonts.medium, fontSize: 15, color: colors.welcomeText },
});
