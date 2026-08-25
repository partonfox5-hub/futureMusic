# Blockbuild — Quest Store exclusive (private URL)

Paid Horizon Store build. **Not linked** from the website. The home-gated `/blockbuild` page is a separate copy.

Hosted start URL:

```
https://futuremusic.online/bbqst-h8k2m9q4/
```

Manifest (Bubblewrap needs this HTTPS URL):

```
https://futuremusic.online/bbqst-h8k2m9q4/manifest.webmanifest
```

Package id to use: `online.futuremusic.blockbuild`  
App mode: **immersive**

## What’s different from the website

- Boots straight into `immersive-vr` (`local-floor`). No 2D start menu.
- Three.js 0.170 and addons are vendored (no jsDelivr).
- No Google Fonts.
- This path is **not** home-network gated (store buyers are not on your Wi-Fi).
- `X-Robots-Tag: noindex`. Do not add it to Projects, nav, or the sitemap.

## Package for Quest (on your PC)

1. Create the app in the [Developer Dashboard](https://developers.meta.com/horizon/) as a paid Quest title.
2. Install Bubblewrap:

```bash
npm install --global @meta-quest/bubblewrap-cli
```

3. Init from an empty folder:

```bash
mkdir blockbuild-pwa
cd blockbuild-pwa
bubblewrap init --manifest=https://futuremusic.online/bbqst-h8k2m9q4/manifest.webmanifest --metaquest
```

When prompted: **immersive**, package `online.futuremusic.blockbuild`, Horizon Billing **off** unless you add IAP later. Save the keystore.

4. After the signing key exists, copy the SHA-256 fingerprint into `public/.well-known/assetlinks.json` (site origin). An empty `[]` placeholder is live until you replace it. Immersive PWAs **will not launch** until this file matches the APK.

```bash
keytool -list -v -keystore android.keystore -alias android
bubblewrap fingerprint add <sha256>
```

Publish the generated `assetlinks.json` to `https://futuremusic.online/.well-known/assetlinks.json`.

5. Build and sideload:

```bash
bubblewrap build
adb install app-release-signed.apk
```

Launch from **Unknown Sources** on the headset.

## Local folder

This same tree also lives at `Desktop/blockbuild-quest` for offline copies. The store TWA always loads the **hosted** HTTPS URL, not the desktop files.
