# PowerShell script to fix Expo SDK 54 dependencies

Write-Host "Fixing Expo dependencies..." -ForegroundColor Green
Set-Location mobile

# Remove node_modules and lock files
Write-Host "Cleaning up..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue

# Install base dependencies
Write-Host "Installing base dependencies..." -ForegroundColor Yellow
npm install

# Use expo install for all Expo packages to ensure compatibility
Write-Host "Installing Expo packages with correct versions..." -ForegroundColor Yellow
npx expo install expo@~54.0.0
npx expo install expo-status-bar@~2.0.0
npx expo install react@18.3.1
npx expo install react-native@0.76.5
npx expo install @react-native-async-storage/async-storage
npx expo install react-native-gesture-handler
npx expo install react-native-screens
npx expo install react-native-safe-area-context
npx expo install expo-linear-gradient

Write-Host "Done! Now run: npx expo start --clear" -ForegroundColor Green

