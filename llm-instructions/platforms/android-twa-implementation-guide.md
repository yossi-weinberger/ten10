# Android TWA Implementation Guide for Ten10

**Complete guide for building and deploying Ten10 as an Android app using Trusted Web Activity (TWA).**

---

## Table of Contents

1. [Overview](#overview)
2. [What Was Built in Code](#what-was-built-in-code)
3. [Technical Architecture](#technical-architecture)
4. [Manual Setup Steps](#manual-setup-steps)
5. [Building the Android App](#building-the-android-app)
6. [Digital Asset Links](#digital-asset-links)
7. [Testing](#testing)
8. [Play Store Deployment](#play-store-deployment)
9. [Keystore Management](#keystore-management)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### What is TWA?

A **Trusted Web Activity (TWA)** wraps the Ten10 PWA in a native Android app container. When properly configured, it provides:

- Full-screen experience (no browser address bar)
- Home screen icon like a native app
- System notifications support
- Shares the same data with the web version (via Supabase)

### Three Platform Types in Ten10

1. **Desktop** (`platform: "desktop"`) - Tauri app with local SQLite
2. **Web** (`platform: "web"`) - Browser-based PWA with Supabase
3. **TWA** (`platform: "web"` + `isTWA: true`) - Android app wrapping the web version

The TWA is essentially the web version packaged as an Android app - it uses Supabase for data, not local storage.

---

## App Icons (Maskable) & Manifest Source of Truth (Jan 2026 Update)

### Why the Android icon was cropped

Android (and Chrome/TWA) may apply an **adaptive icon mask** (circle / rounded square). If the icon artwork is too close to the edges, it will appear **cropped** even if the background is white.

### Single manifest source of truth

Ten10 uses a **single** Web App Manifest:

- **Source**: `public/manifest.json`
- **HTML reference**: `index.html` → `<link rel="manifest" href="/manifest.json" />`

Important:
- `vite-plugin-pwa` is configured with `manifest: false` to **avoid** generating/injecting `manifest.webmanifest`. This prevents duplicate `<link rel="manifest">` tags and avoids confusion about which manifest is deployed.

### Maskable icon assets used

For the PWA (installed from Chrome):
- **Maskable icon (safe padding, SVG)**: `public/pwa-maskable.svg`
  - Declared in `public/manifest.json` with `purpose: "maskable"` and `sizes: "any"`.
  - The logo is scaled down to stay inside Android's safe area.

For the TWA / Bubblewrap build:
- **Maskable icon (safe padding, raster)**: `public/icon-maskable-512.jpg`
  - Used because Bubblewrap/TWA tooling is most reliable with raster icons for app packaging.
  - `twa-manifest.json` and `android-build/twa-manifest.json` point `iconUrl` and `maskableIconUrl` to:
    - `https://ten10-app.com/icon-maskable-512.jpg`

## What Was Built in Code

### 1. TWA Detection System

**File**: `src/contexts/TWAContext.tsx`

This context detects when the app is running inside the Android TWA:

```typescript
export const TWAProvider: React.FC<TWAProviderProps> = ({ children }) => {
  const [isTWA, setIsTWA] = useState<boolean>(() => {
    return localStorage.getItem("isTwa") === "true";
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const twaParam = urlParams.get("twa");

    if (twaParam === "true") {
      localStorage.setItem("isTwa", "true");
      setIsTWA(true);
      // Clean up URL
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  return (
    <TWAContext.Provider value={{ isTWA }}>{children}</TWAContext.Provider>
  );
};
```

**Detection Flow:**

1. Android app launches with `?twa=true` parameter
2. TWAContext detects it and saves to localStorage
3. URL is cleaned (parameter removed)
4. On subsequent launches, state is read from localStorage

### 2. Integration in App

**File**: `src/main.tsx`

```typescript
<ThemeProvider>
  <PlatformProvider>
    {" "}
    {/* Detects desktop vs. web */}
    <TWAProvider>
      {" "}
      {/* Detects TWA within web */}
      <AuthProvider>
        <RouterProvider />
      </AuthProvider>
    </TWAProvider>
  </PlatformProvider>
</ThemeProvider>
```

**File**: `src/App.tsx`

```typescript
const { isTWA } = useTWA();

<div
  className={`${platform === "desktop" ? "is-desktop" : "is-web"} ${
    isTWA ? "is-twa" : ""
  }`}
>
  <Outlet />
</div>;
```

### 3. Usage in Components

You can now use TWA detection anywhere:

```typescript
import { useTWA } from "@/contexts/TWAContext";
import { usePlatform } from "@/contexts/PlatformContext";

function MyComponent() {
  const { platform } = usePlatform();
  const { isTWA } = useTWA();

  if (platform === "desktop") return <DesktopUI />;
  if (isTWA) return <AndroidAppUI />;
  return <WebUI />;
}
```

### 4. Translations Added

**Files**: `public/locales/he/common.json` and `public/locales/en/common.json`

```json
"platform": {
  "desktop_version": "Desktop Version / גרסת דסקטופ",
  "web_version": "Web Version / גרסת ווב",
  "android_app_version": "Android App / אפליקציית אנדרואיד",
  "download_mobile_app": "Download Mobile App / הורד אפליקציה למובייל",
  "contact_us": "Contact Us / צור קשר",
  "twa_native_features": "Enjoy a native app experience...",
  "feature_notifications": "System notifications",
  "feature_home_screen": "Home screen icon",
  "feature_full_screen": "Full screen without address bar",
  "feature_offline_support": "Offline support"
}
```

### 5. Digital Asset Links Template

**File**: `public/.well-known/assetlinks.json`

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.ten10app.twa",
      "sha256_cert_fingerprints": [
        "REPLACE_WITH_YOUR_SHA256_FINGERPRINT_AFTER_GENERATING_KEYSTORE"
      ]
    }
  }
]
```

This file must be updated with the real SHA256 fingerprint after generating the keystore.

### 6. Build Directory Structure

**Directory**: `android-build/`

Contains `.gitignore` and `README.md`. The actual Android project files will be generated by Bubblewrap.

---

## Technical Architecture

### Platform Detection Flow

```
App Launch
    ↓
Check window.__TAURI_INTERNALS__
    ↓
    ├─ Exists → platform = "desktop"
    └─ Doesn't exist → platform = "web"
         ↓
         Check URL for ?twa=true
         ↓
         ├─ Found → Save to localStorage, isTWA = true
         └─ Not found → Check localStorage
              ↓
              ├─ "true" → isTWA = true
              └─ Not found → isTWA = false
```

### Security Considerations

1. **localStorage Persistence**: TWA state is stored in localStorage to avoid re-detecting on every launch
2. **URL Cleanup**: `?twa=true` is removed from URL to prevent sharing/bookmarking issues
3. **Package Verification**: Only the specific package name in `assetlinks.json` is trusted

### CSS Classes for Styling

The app adds these classes to the root div:

- `is-desktop` - When running in Tauri
- `is-web` - When running in browser
- `is-twa` - When running in Android TWA

Use them for platform-specific styling:

```css
.is-twa .container {
  padding: 1rem; /* More compact for mobile */
}

.is-desktop .container {
  padding: 3rem;
}
```

---

## Manual Setup Steps

### Prerequisites

1. **Java Development Kit (JDK) 17**

   - Download: https://adoptium.net/temurin/releases/?version=17
   - Install and set `JAVA_HOME` environment variable
   - Add `%JAVA_HOME%\bin` to PATH

2. **Bubblewrap CLI**

   ```bash
   npm install -g @bubblewrap/cli

   # Verify installation
   bubblewrap --version
   ```

3. **Git** (already installed)
4. **Production deployment** at https://ten10-app.com with `manifest.json`

### First-Time Setup

These steps are done **once** to create the Android project:

```bash
cd android-build
bubblewrap init --manifest=https://ten10-app.com/manifest.json
```

**Answer the prompts:**

```
Domain: ten10-app.com (auto-filled)
Application name: Ten10 - ניהול מעשרות חכם
Application ID: com.ten10app.twa
Display mode: standalone
Orientation: default
Status bar color: #2563eb
Splash screen color: #ffffff
Icon URL: (auto-filled from manifest)
Play Billing: N
Geolocation: N
```

**Keystore Configuration (CRITICAL!):**

```
First and Last names: [Your Name]
Organizational Unit: Developer
Organization: Ten10
Country code: IL
Keystore password: [Create a STRONG password]
Key password: [SAME password as above!]
```

**⚠️ IMMEDIATELY after this:**

1. Save the keystore password in a password manager
2. Backup the `android.keystore` file (see [Keystore Management](#keystore-management))
3. **NEVER** commit the keystore to Git (already protected by `.gitignore`)

---

## Building the Android App

### First Build

```bash
cd android-build
bubblewrap build --universalApk
```

This creates:

- `app-release-bundle.aab` - For Play Store upload
- `app-release-unsigned.apk` - For testing (needs signing)

The first build takes longer as Gradle downloads dependencies.

### Subsequent Builds (Updates)

When releasing a new version:

1. **Update version in `twa-manifest.json`:**

```json
{
  "versionCode": 2, // Increment by 1 (was 1)
  "versionName": "1.0.1" // Update version string
}
```

**Version Rules:**

- `versionCode`: Integer that MUST increase with each build (1, 2, 3...)
- `versionName`: Human-readable version (MAJOR.MINOR.PATCH)

2. **Commit the version change:**

```bash
git add android-build/twa-manifest.json
git commit -m "chore: bump Android version to 1.0.1"
git push
```

3. **Build:**

```bash
cd android-build
bubblewrap build --universalApk
```

### Build Outputs

After a successful build:

```
android-build/
├── app-release-signed.apk          # For manual testing on devices
└── app/build/outputs/
    └── bundle/release/
        └── app-release-bundle.aab  # For Play Store upload
```

---

## Digital Asset Links

This is **critical** for removing the browser address bar in the TWA.

### Step 1: Extract SHA256 Fingerprint

After the first build:

```bash
cd android-build
keytool -list -v -keystore android.keystore -alias android
```

Enter the keystore password. Look for output like:

```
Certificate fingerprints:
SHA256: 31:C6:07:DF:EE:3F:04:68:25:D5:3D:C0:25:01:56:00:5E:8B:B4:6F:FF:75:6E:B6:C6:26:A3:62:BA:AC:57:0E
```

Copy the SHA256 fingerprint (format: `XX:XX:XX:...`).

### Step 2: Update assetlinks.json

Edit `public/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.ten10app.twa",
      "sha256_cert_fingerprints": [
        "31:C6:07:DF:EE:3F:04:68:25:D5:3D:C0:25:01:56:00:5E:8B:B4:6F:FF:75:6E:B6:C6:26:A3:62:BA:AC:57:0E"
      ]
    }
  }
]
```

Replace the placeholder with your actual fingerprint.

### Step 3: Deploy to Production

```bash
git add public/.well-known/assetlinks.json
git commit -m "feat: add SHA256 fingerprint for Android TWA"
git push
```

Wait for Vercel deployment to complete (1-2 minutes).

### Step 4: Verify

1. **Check accessibility:**

   ```
   https://ten10-app.com/.well-known/assetlinks.json
   ```

   Should return the JSON content (not 404).

2. **Use Google's verification tool:**
   - https://developers.google.com/digital-asset-links/tools/generator
   - Enter domain: `ten10-app.com`
   - Enter package: `com.ten10app.twa`
   - Should show green checkmark

**Note:** Google caches this file. Wait 5-10 minutes after deployment before testing on device.

---

## Testing

### Local Testing (Web)

Test TWA behavior in a browser:

```bash
npm run dev
# Open: http://localhost:5173/?twa=true
```

Check that:

- TWA-specific UI appears
- `localStorage.getItem("isTwa")` returns `"true"`
- Refreshing maintains TWA state

### Android Device Testing

1. **Transfer APK to device:**

   - File: `android-build/app-release-signed.apk`
   - Method: USB cable, email, or cloud storage

2. **Enable installation from unknown sources:**

   - Android Settings → Security → Install unknown apps
   - Enable for your file manager/browser

3. **Install the APK:**

   - Open the APK file on device
   - Tap "Install"

4. **Test the app:**

**Critical Tests:**

- [ ] App opens successfully
- [ ] **No address bar at top** (Digital Asset Links working)
- [ ] Navigation works between pages
- [ ] RTL/LTR switching works (Hebrew ↔ English)
- [ ] Login/authentication works
- [ ] Data syncs with Supabase
- [ ] TWA-specific UI components appear

**Check TWA detection:**

- Connect device via USB
- Enable USB debugging
- Open `chrome://inspect` in Chrome desktop
- Click "Inspect" on Ten10 app
- In console: `localStorage.getItem("isTwa")` should return `"true"`

### Common Issues

**Address bar still appears:**

- Digital Asset Links not configured correctly
- Wait 5-10 minutes after deploying `assetlinks.json`
- Verify SHA256 fingerprint matches keystore
- Check that `assetlinks.json` is publicly accessible

**TWA detection not working:**

- Check `twa-manifest.json` has `"startUrl": "/?twa=true"`
- Rebuild: `bubblewrap build --universalApk`
- Clear app data before reinstalling

---

## Play Store Deployment

### Prerequisites

1. **Google Play Developer account:**

   - Sign up: https://play.google.com/console
   - One-time fee: $25
   - Complete account verification

2. **Privacy Policy page:**

   - Required by Google Play
   - Add route: `/privacy-policy` to the Ten10 app
   - Deploy to: https://ten10-app.com/privacy-policy
   - Include: data collection, usage, storage, user rights

3. **App assets:**
   - App icon: 512x512 PNG (use `public/icon-512.png`)
   - Feature graphic: 1024x500 PNG (create in design tool)
   - Screenshots: 4-8 images from Android device
     - Recommended: 3 phone + 2 tablet screenshots
   - App description (Hebrew & English)
   - Short description (max 80 characters)

### Submission Steps

1. **Create new app in Play Console:**

   - App name: `Ten10 - ניהול מעשרות חכם`
   - Default language: Hebrew (עברית)
   - App type: Free
   - Category: Finance

2. **Upload AAB:**

   - Go to: Production → Create new release
   - Upload: `android-build/app/build/outputs/bundle/release/app-release-bundle.aab`

3. **Fill required information:**

   - App content rating questionnaire
   - Target audience (18+)
   - Privacy policy URL
   - Data safety form
   - Content declarations

4. **Store listing:**

   - App name
   - Short description (80 chars max)
   - Full description
   - Screenshots
   - Feature graphic
   - App icon

5. **Submit for review:**

   - Review all information
   - Click "Submit for review"
   - Wait 1-3 days for Google approval

6. **Monitor status:**
   - Check email for updates
   - Respond to any requests from Google
   - Fix issues if rejected

### Release Notes Template

**Hebrew:**

```
גרסה 1.0.0
• גרסה ראשונית של האפליקציה
• ניהול מעשרות חכם עם חישובים אוטומטיים
• תמיכה בעברית ואנגלית
• סנכרון ענן אוטומטי
```

**English:**

```
Version 1.0.0
• Initial release
• Smart tithe management with automatic calculations
• Hebrew and English support
• Automatic cloud sync
```

---

## Keystore Management

### Critical Importance

**The keystore is your app's identity.**

- Without it: Cannot update the app on Play Store
- Lost keystore = Must publish entirely new app with different name
- Users would need to reinstall, losing reviews and downloads

**Therefore: Backup immediately and securely!**

### Backup Methods (Use at least 2!)

#### 1. Password Manager (Recommended) ⭐

Services: 1Password, Bitwarden, LastPass

```bash
1. Open password manager
2. Create new item: "Ten10 Android Keystore"
3. Upload file: android.keystore
4. Save password in password field
5. Add notes:
   - Alias: android
   - Package: com.ten10app.twa
   - SHA256 fingerprint: [paste it here]
```

**Advantages:**

- Highly secure (encrypted)
- Accessible from any device
- Automatic backup
- Version history

#### 2. Cloud Storage (Encrypted)

Services: Google Drive, Dropbox, OneDrive

**Important: Encrypt before uploading!**

```bash
# Using 7-Zip with password
7z a -p android-keystore-backup.7z android.keystore

# Upload android-keystore-backup.7z to cloud
# Store encryption password separately in password manager
```

#### 3. Encrypted USB Drive

```bash
# Copy to encrypted USB drive
cp android.keystore /path/to/usb/ten10-backup/

# Create info file
echo "Ten10 Android Keystore Backup" > /path/to/usb/ten10-backup/README.txt
echo "Password: [WRITE IT HERE]" >> /path/to/usb/ten10-backup/README.txt
echo "Package: com.ten10app.twa" >> /path/to/usb/ten10-backup/README.txt

# Store USB in secure location
```

### Backup Checklist

Save all of these:

- [ ] **android.keystore** - The file itself
- [ ] **Keystore password** - Password for the keystore
- [ ] **Key password** - Password for the key (same as keystore)
- [ ] **Alias name** - `android`
- [ ] **Package name** - `com.ten10app.twa`
- [ ] **SHA256 fingerprint** - (optional, can extract again)

### Restore from Backup

When setting up on a new machine:

```bash
# 1. Clone the repository
git clone https://github.com/[your-username]/ten10.git
cd ten10

# 2. Restore keystore from backup
cp /path/to/backup/android.keystore android-build/

# 3. Set correct permissions (Linux/Mac)
chmod 600 android-build/android.keystore

# 4. Test that it works
cd android-build
bubblewrap build --universalApk
# Enter keystore password when prompted

# 5. If build succeeds, backup is valid! ✅
```

### Security Rules

**✅ DO:**

- Backup in 2+ locations
- Use password manager
- Encrypt before uploading to cloud
- Test backup restoration
- Update backup after major changes

**❌ DON'T:**

- Commit to Git (public or private!)
- Send via unencrypted email
- Share in chat apps (WhatsApp, Telegram)
- Store in unencrypted cloud storage
- Forget the password!

### Emergency: Lost Keystore

**If you have a backup:**
✅ Restore from backup
✅ Continue as normal

**If you don't have a backup:**
❌ Cannot recover keystore (impossible!)
❌ Must publish new app with different package name
❌ Users must reinstall app
❌ Lose all reviews and download counts

**Prevention is the only solution: Backup NOW!**

---

## Troubleshooting

### Build Errors

**Error: "keystore not found"**

- `android.keystore` file is missing
- Solution: Copy from another machine or restore from backup

**Error: "wrong password"**

- Incorrect keystore password
- Solution: Check saved password in password manager

**Error: "JAVA_HOME not set"**

- JDK not installed or environment variable not set
- Solution: Install JDK 17 and set `JAVA_HOME`

**Error: Build fails with Java-related errors (CRITICAL!)**

- The `jdkPath` in Bubblewrap's config is incorrect or invalid
- **Location**: `C:\Users\[YOUR_USERNAME]\.bubblewrap\config.json` (Windows) or `~/.bubblewrap/config.json` (Mac/Linux)
- **Problem**: The path must point to a valid JDK installation
- **Solution**:
  1. Open the config file
  2. Verify `jdkPath` points to actual JDK directory (e.g., `C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.x-hotspot`)
  3. Check that the directory exists and contains `bin/java.exe`
  4. Use double backslashes (`\\`) in Windows paths
  5. Save and try building again

**Example valid config:**

```json
{
  "jdkPath": "C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.11-hotspot",
  "androidSdkPath": "C:\\Users\\YourName\\.bubblewrap\\android_sdk"
}
```

### Google Play Errors

**"Version code must be greater than X"**

- Forgot to increment `versionCode` in `twa-manifest.json`
- Solution: Edit manifest, increment version, rebuild

**"Duplicate package name"**

- Package name already exists on Play Store
- Solution: Change package name in `twa-manifest.json` (first-time only)

### TWA Issues

**Address bar appears in app**

- Digital Asset Links not configured correctly
- Solutions:
  1. Verify `assetlinks.json` is accessible at `https://ten10-app.com/.well-known/assetlinks.json`
  2. Check SHA256 fingerprint matches keystore
  3. Wait 5-10 minutes (Google caches the file)
  4. Use Google's verification tool

**TWA detection not working**

- `isTWA` is always `false`
- Solutions:
  1. Check `twa-manifest.json` has `"startUrl": "/?twa=true"`
  2. Rebuild: `bubblewrap build --universalApk`
  3. Clear app data before reinstalling
  4. Check browser console for errors (via USB debugging)

**TWA persists on web after testing**

- Tested with `?twa=true` on web, now thinks it's TWA
- Solution: Clear localStorage
  ```javascript
  localStorage.removeItem("isTwa");
  // Or in DevTools: Application → Storage → Local Storage → Clear
  ```

**Icon/logo is cropped on Android home screen**

- Cause: Android applies a mask (adaptive icon). Artwork near the edges gets cropped.
- Fix (recommended):
  1. Use a dedicated **maskable** icon with safe padding: `public/icon-maskable-512.jpg`
  2. Point `maskableIconUrl` (and `iconUrl`) in `twa-manifest.json` to `https://ten10-app.com/icon-maskable-512.jpg`
  3. Ensure Bubblewrap reads the correct manifest URL (see `webManifestUrl`), and rebuild the APK
  4. Uninstall/reinstall the app to clear icon caching

---

## Summary

### What's Already Done (In Code)

✅ TWA detection system (`TWAContext`)  
✅ Platform-aware component architecture  
✅ Multi-language support (Hebrew/English)  
✅ Digital Asset Links template  
✅ Build directory structure  
✅ Git protection (`.gitignore`)

### What You Need to Do (Manual Steps)

1. Install JDK 17 and Bubblewrap CLI (one-time)
2. Run `bubblewrap init` (one-time)
3. **Backup keystore immediately!** (critical)
4. Run `bubblewrap build` to create APK/AAB
5. Extract SHA256 fingerprint
6. Update `assetlinks.json` and deploy
7. Test on Android device
8. Prepare Play Store assets
9. Submit to Google Play Console

### File Locations

```
ten10/
├── src/
│   └── contexts/
│       └── TWAContext.tsx              # TWA detection logic
├── public/
│   ├── .well-known/
│   │   └── assetlinks.json             # Update with SHA256
│   └── locales/
│       ├── he/common.json               # Hebrew translations
│       └── en/common.json               # English translations
└── android-build/
    ├── twa-manifest.json                # App config (in Git)
    ├── android.keystore                 # Signing key (NOT in Git!)
    └── app/build/outputs/               # Build outputs (NOT in Git)
```

### Quick Commands Reference

```bash
# Install Bubblewrap
npm install -g @bubblewrap/cli

# Initialize project (first time)
cd android-build
bubblewrap init --manifest=https://ten10-app.com/manifest.json

# Build APK/AAB
bubblewrap build --universalApk

# Extract SHA256 fingerprint
keytool -list -v -keystore android.keystore -alias android

# Update and rebuild (for new version)
# 1. Edit twa-manifest.json (increment versionCode)
# 2. Commit changes
# 3. Run build command above
```

### Support Resources

- **Bubblewrap**: https://github.com/GoogleChromeLabs/bubblewrap
- **TWA Guide**: https://developers.google.com/web/android/trusted-web-activity
- **Digital Asset Links**: https://developers.google.com/digital-asset-links
- **Play Console**: https://support.google.com/googleplay/android-developer

---

**The Ten10 codebase is ready for Android deployment. Follow the manual steps above to build and publish the app!** 🚀
