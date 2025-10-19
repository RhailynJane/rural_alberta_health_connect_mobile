# Fix Skia Canvas "onLayout not supported on new architecture" Error

## Problem
Even though `newArchEnabled: false` is set in app.json, you're getting:
```
<Canvas onLayout={onLayout} /> is not supported on the new architecture
```

This means the native build was created with the new architecture enabled, and the app.json change hasn't been reflected in the native code yet.

## Solution: Clean Rebuild

### For Android:

1. **Stop Metro bundler** (close the terminal running `npx expo start`)

2. **Clean Android build artifacts:**
   ```powershell
   cd android
   .\gradlew clean
   cd ..
   ```

3. **Delete build folders:**
   ```powershell
   Remove-Item -Recurse -Force android\app\build -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force android\.gradle -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
   ```

4. **Rebuild with EAS (development build):**
   ```powershell
   npx eas build --profile development --platform android --local
   ```

   OR if you want to build in the cloud:
   ```powershell
   npx eas build --profile development --platform android
   ```

5. **Install the new build on your device**

6. **Start Metro:**
   ```powershell
   npx expo start --dev-client
   ```

### For iOS:

1. **Stop Metro bundler**

2. **Clean iOS build:**
   ```powershell
   cd ios
   pod deintegrate
   pod install
   cd ..
   ```

3. **Delete build folders:**
   ```powershell
   Remove-Item -Recurse -Force ios/build -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force ~/Library/Developer/Xcode/DerivedData/* -ErrorAction SilentlyContinue
   ```

4. **Rebuild with EAS:**
   ```powershell
   npx eas build --profile development --platform ios --local
   ```

5. **Install and run**

---

## Why This Happens

The `newArchEnabled` flag in app.json controls how Expo **generates** the native code during build time. Once the native code is built with the new architecture, changing app.json doesn't automatically update the compiled native code.

**Key points:**
- `app.json` changes only take effect during **native build time**
- Metro bundler reload does NOT rebuild native code
- You must rebuild the development client for app.json changes to apply

---

## Quick Test (Alternative - Slower but Simpler)

If EAS build is slow, you can try disabling React Compiler temporarily:

1. Edit `app.json`:
   ```json
   "experiments": {
     "typedRoutes": true,
     "reactCompiler": false  // ← Change this
   }
   ```

2. Clear Metro cache and restart:
   ```powershell
   npx expo start --clear
   ```

However, this might not fix the Skia issue if the native build already has new architecture compiled in.

---

## Verify Fix

After rebuilding, the camera should:
- ✅ Show live feed (not white screen)
- ✅ Display bounding boxes on detected objects  
- ✅ No "[Canvas onLayout] not supported" error
- ✅ No session configuration errors

---

## What Changed in Code

Also fixed the Reanimated warnings by:
- Added `isCapturingState` (regular state) alongside `isCapturing` (shared value)
- Use `isCapturingState` for UI rendering (no .value access during render)
- Use `isCapturing` (shared value) for worklet communication

This eliminates the "Reading from `value` during component render" warnings.
