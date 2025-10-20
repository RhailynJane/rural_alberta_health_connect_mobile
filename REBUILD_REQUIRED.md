# URGENT: Native Module Rebuild Required

## Current Error
```
Invariant Violation: View config not found for component `AIRMap`
```

This error means the native module for `react-native-maps` is not available in your current development client.

## Why This Happens
- `react-native-maps` requires native code (iOS/Android)
- You're using Expo development client (not Expo Go)
- The native module wasn't included when you built the dev client
- Adding it via npm doesn't automatically add it to the native binary

## Required Steps to Fix

### Step 1: Clear Cache
```bash
npx expo start --clear
```
Stop the server (Ctrl+C)

### Step 2: Prebuild Native Projects
This generates the native iOS/Android folders with all required native modules:

```bash
npx expo prebuild --clean
```

This will:
- ✅ Generate `ios/` and `android/` folders
- ✅ Link `react-native-maps` native module
- ✅ Configure location permissions
- ✅ Add Google Maps SDK

### Step 3: Rebuild for Your Platform

#### For Android:
```bash
npx expo run:android
```

This will:
- Build the Android APK with maps support
- Install on connected device/emulator
- Start the dev server

#### For iOS (Mac only):
```bash
npx expo run:ios
```

This will:
- Install CocoaPods dependencies
- Build the iOS app with maps support
- Launch in simulator

### Step 4: Test the Fix
1. App should rebuild and launch
2. Navigate to Emergency tab
3. Enable location services
4. Map should now load correctly! 🎉

## Alternative: Remove Maps Temporarily

If you need the app working NOW and can wait for maps:

### 1. Comment out the map section in `app/(tabs)/emergency/index.tsx`:

Find this section (around line 444):
```typescript
{/* Offline Map Section */}
{locationStatus?.locationServicesEnabled && realTimeClinics.length > 0 && (
  <>
    <Text style={styles.sectionTitle}>Clinic Locations Map</Text>
    // ... map code
  </>
)}
```

Change to:
```typescript
{/* Offline Map Section - TEMPORARILY DISABLED */}
{/* TODO: Rebuild app with: npx expo prebuild --clean && npx expo run:android */}
{false && locationStatus?.locationServicesEnabled && realTimeClinics.length > 0 && (
  <>
    <Text style={styles.sectionTitle}>Clinic Locations Map</Text>
    // ... map code
  </>
)}
```

### 2. Restart the dev server:
```bash
npx expo start --clear
```

The app will work without maps, and you can rebuild later.

## Important Notes

### ⚠️ First Time Setup
If this is your first time running `expo prebuild`:
- It will create `ios/` and `android/` folders
- These should be added to `.gitignore` (usually automatic)
- Build times will be longer (5-15 minutes first time)

### ⚠️ Expo Go Not Supported
`react-native-maps` does NOT work in Expo Go app. You MUST use:
- Development build (what you have)
- Production build
- Or remove the maps feature

### ⚠️ After Rebuild
Every time you add a native module (like maps), you need to:
1. Run `npx expo prebuild --clean`
2. Run `npx expo run:android` or `npx expo run:ios`

### ⚠️ Google Maps API Keys
Before deploying, make sure to:
1. Get real API keys from Google Cloud Console
2. Replace placeholders in `app.json`
3. Rebuild the app

## Expected Build Time
- **First build**: 5-15 minutes
- **Subsequent builds**: 2-5 minutes
- **Dev server restart**: 30 seconds

## Troubleshooting

### Build Fails on Android
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

### Build Fails on iOS
```bash
cd ios
pod deintegrate
pod install
cd ..
npx expo run:ios
```

### Still Getting Error
1. Make sure you stopped the old dev server
2. Close and restart the app on your device
3. Make sure you're running the newly built app, not the old one

## Quick Commands Reference

```bash
# Full rebuild from scratch
npx expo prebuild --clean
npx expo run:android  # or npx expo run:ios

# After code changes (no native changes)
npx expo start --clear

# Clean everything and start over
rm -rf node_modules ios android
npm install
npx expo prebuild
npx expo run:android
```

## Need Help?
If you continue having issues:
1. Check that `react-native-maps` is in `package.json`
2. Verify `expo-location` plugin is in `app.json`
3. Make sure you're building a development client, not using Expo Go
4. Check build logs for specific errors

## Status Check
- ✅ Packages installed: `react-native-maps`, `expo-location`
- ✅ Config updated: `app.json` has expo-location plugin
- ✅ Component created: `OfflineMap.tsx`
- ✅ Integrated: Emergency page has map section
- ❌ **Native build**: YOU NEED TO DO THIS NOW ⬆️

Run the commands above to complete the setup! 🚀
