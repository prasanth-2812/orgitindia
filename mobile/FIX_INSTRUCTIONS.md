# Fix TurboModuleRegistry PlatformConstants Error

## Quick Fix (Recommended)

Run these commands in order:

```bash
cd mobile

# 1. Clean everything
rm -rf node_modules .expo package-lock.json
npm cache clean --force

# 2. Reinstall base packages
npm install

# 3. Use expo install to fix all Expo packages (this ensures compatibility)
npx expo install --fix

# 4. Start with cleared cache
npx expo start --clear
```

## Alternative: Use the Fix Script

**On Windows (PowerShell):**
```powershell
cd mobile
.\fix-dependencies.ps1
npx expo start --clear
```

**On Mac/Linux:**
```bash
cd mobile
chmod +x fix-dependencies.sh
./fix-dependencies.sh
npx expo start --clear
```

## If Still Not Working

The issue might be that your Expo Go app version doesn't match. Try:

1. **Update Expo Go app** on your device to the latest version
2. **Or downgrade to SDK 53** (more stable):
   ```bash
   cd mobile
   npm install expo@~53.0.0
   npx expo install --fix
   npx expo start --clear
   ```

3. **Check Expo Go version compatibility:**
   - Open Expo Go app
   - Check the SDK version it supports
   - Make sure your project matches

## What Changed

- Added `expo-constants` package (provides PlatformConstants)
- Created `metro.config.js` for proper Metro bundler configuration
- Added fix scripts to ensure all packages use compatible versions

The key is using `npx expo install --fix` which automatically aligns all Expo packages to compatible versions.

