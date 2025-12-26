#!/bin/bash
# Script to fix Expo SDK 54 dependencies

echo "Fixing Expo dependencies..."
cd mobile

# Remove node_modules and lock files
echo "Cleaning up..."
rm -rf node_modules
rm -f package-lock.json

# Install base dependencies
echo "Installing base dependencies..."
npm install

# Use expo install for all Expo packages to ensure compatibility
echo "Installing Expo packages with correct versions..."
npx expo install expo@~54.0.0
npx expo install expo-status-bar@~2.0.0
npx expo install react@18.3.1
npx expo install react-native@0.76.5
npx expo install @react-native-async-storage/async-storage
npx expo install react-native-gesture-handler
npx expo install react-native-screens
npx expo install react-native-safe-area-context
npx expo install expo-linear-gradient

echo "Done! Now run: npx expo start --clear"

