# Yarrow Admin - Android App

A native Android WebView wrapper for the Yarrow Weddings admin panel.

## Features

- 📱 Native Android app experience
- 🔄 Pull-to-refresh functionality  
- 🔐 Persistent authentication (cookies stored)
- 📴 Offline error handling with retry
- ⬅️ Hardware back button navigation
- 🎨 Matches admin panel dark theme

## Building the APK

### Option 1: GitHub Actions (Recommended)

1. Push this code to GitHub
2. Go to **Actions** tab
3. Click **"Build Android APK"** workflow
4. Click **"Run workflow"** button
5. Wait for build to complete (~3-5 minutes)
6. Download APK from **Artifacts** section

### Option 2: Local Build (Requires Android Studio)

```bash
cd android-admin-app
./gradlew assembleDebug
```

APK will be at: `app/build/outputs/apk/debug/app-debug.apk`

## Installing the APK

1. Transfer the APK to your Android device
2. Enable "Install from unknown sources" in Settings
3. Open the APK file to install
4. Launch "Yarrow Admin" from your app drawer

## App Icons

Replace the placeholder icons in these directories:
- `app/src/main/res/mipmap-mdpi/` (48x48)
- `app/src/main/res/mipmap-hdpi/` (72x72)
- `app/src/main/res/mipmap-xhdpi/` (96x96)
- `app/src/main/res/mipmap-xxhdpi/` (144x144)
- `app/src/main/res/mipmap-xxxhdpi/` (192x192)

Use [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html) to generate all sizes from a single image.

## Configuration

Edit `MainActivity.kt` to change:
- `adminUrl` - The admin panel URL
- `allowedHost` - Allowed domain for navigation

## Future: Push Notifications

To add push notifications:
1. Create a Firebase project
2. Add `google-services.json` to `app/` directory
3. Add Firebase dependencies
4. Implement FCM token registration
