# Fix TurboModuleRegistry Error

The TurboModuleRegistry error occurs due to version mismatches. Follow these steps:

## Solution 1: Use Expo's Version Management (Recommended)

Expo provides a tool to automatically fix version mismatches:

```bash
cd mobile
npx expo install --fix
```

This will automatically update all packages to versions compatible with Expo SDK 54.

## Solution 2: Manual Fix

If Solution 1 doesn't work, try:

1. **Clear all caches:**
```bash
cd mobile
rm -rf node_modules
rm -rf .expo
rm package-lock.json
npm cache clean --force
```

2. **Reinstall dependencies:**
```bash
npm install
```

3. **Clear Expo cache and restart:**
```bash
npx expo start --clear
```

4. **Reload the app:**
   - Shake your device/emulator
   - Press `r` in the Expo terminal to reload
   - Or close and reopen Expo Go

## Solution 3: If Still Not Working

The issue might be that Expo Go doesn't support all native modules. Try:

1. **Check Expo Go version:**
   - Make sure you're using the latest Expo Go app
   - Uninstall and reinstall Expo Go if needed

2. **Use Development Build instead:**
   - Run: `npx expo prebuild`
   - Then use a simulator/emulator instead of Expo Go

## Common Causes

- React Native version mismatch with Expo SDK
- Cached native modules
- Expo Go app version mismatch
- Incomplete dependency installation

Try Solution 1 first - it's the easiest and most reliable fix.

