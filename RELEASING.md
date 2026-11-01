# Releasing SlipScan (Android APK)

SlipScan is shared as an `.apk` file built in the cloud by **EAS Build** (free plan).
No Play Store needed yet.

## One-time setup (already done once)

- `eas login` — your Expo account.
- `eas.json` profiles:
  - `preview` → `.apk` for sharing (`npm run build:apk`)
  - `production` → `.aab` for the Play Store later (`npm run build:store`)
- EAS environment variables (the build server never sees your local `.env`):
  - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the **preview** environment
    (and in **production** before your first store build).
  - Check them: `eas env:list --environment preview`
- The AI key (`GEMINI_API_KEY`) is **not** in the app. It stays in Supabase secrets.
- **Android keystore**: created by Expo on the first build and stored in your Expo account.
  Every update must be signed with the same keystore, or phones refuse to install it over the old app.
  Never delete it. Back it up with `eas credentials -p android` → *Download credentials*.

## a) Release an update

1. Test the change in **Expo Go** first (`npx expo start`).
2. In `app.json` bump both numbers:
   - `expo.version` — what people see, e.g. `1.0.0` → `1.0.1` (or `1.1.0` for new features)
   - `expo.android.versionCode` — must go up by 1 every build, e.g. `1` → `2`
3. Build:
   ```bash
   npm run build:apk
   ```
4. When it finishes, download the `.apk` from the link it prints (or expo.dev → your project → **Builds**).
5. Share the new file the same way as before.

People install the new APK over the old one. Their data is safe either way: bills live in Supabase,
tied to their account, not on the phone.

> Never change `android.package` (`com.arun.slipscan`). A different package is a different app.

## b) Share the APK

**Google Drive**
1. Upload `SlipScan-1.0.0.apk` (rename the file so the version is clear).
2. Right-click → **Share** → General access: **Anyone with the link** → Viewer → **Copy link**.

**GitHub Releases**
1. Repo → **Releases** → **Draft a new release**.
2. Tag `v1.0.0`, title `SlipScan 1.0.0`, short notes on what changed.
3. Drag the `.apk` into the assets box → **Publish release**. Share the release link.

## c) Install steps (send these to users)

1. Open the link on your Android phone and download the `.apk`.
2. Tap the downloaded file to open it.
3. If asked, allow **Install unknown apps** for your browser or Files app → go back → **Install**.
4. If Google Play Protect warns that the app is unknown, tap **More details → Install anyway**.
   (This shows for any app not from the Play Store.)
5. Open SlipScan → **Get started** → create your account.

## d) Free-plan limits

- **15 Android builds per month** on the free EAS plan. Builds may also wait in a queue.
- Test everything in **Expo Go**. Only run `npm run build:apk` when you're ready to share.

## e) Moving to the Play Store later

1. Create a Google Play Console developer account: **$25 one-time** fee.
2. Add the production env vars: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the
   **production** environment (`eas env:create --environment production ...`).
3. Build the store bundle:
   ```bash
   npm run build:store
   ```
4. New personal accounts must run a **closed test with at least 12 testers for 14 days** before
   production access is granted.
5. Upload the `.aab` (or use `eas submit -p android`), fill in the store listing, privacy policy and
   data-safety form, then publish.
