# Messaging Mobile App

React Native mobile application for the messaging POC using Expo.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (iOS/Android) or iOS Simulator/Android Emulator

## Setup

1. Install dependencies:
```bash
npm install
```

2. Update `config.js` with your backend server URL:
   - For physical device: Use your computer's IP address (e.g., `http://192.168.1.100:3000`)
   - For emulator/simulator: Use `http://localhost:3000` or `http://10.0.2.2:3000` (Android)

3. Start the development server:
```bash
npm start
```

4. Run on your device:
   - Scan the QR code with Expo Go app (iOS/Android)
   - Or press `i` for iOS simulator, `a` for Android emulator

## Project Structure

```
mobile/
├── screens/          # Screen components
│   ├── LoginScreen.js
│   ├── RegisterScreen.js
│   ├── ConversationsScreen.js
│   ├── ChatScreen.js
│   └── NewChatScreen.js
├── services/         # API and socket services
│   ├── api.js
│   ├── socket.js
│   ├── authService.js
│   ├── conversationService.js
│   └── messageService.js
├── context/          # React Context
│   └── AuthContext.js
├── config.js         # Configuration
└── App.js            # Main app component
```

## Features

- User authentication (Register/Login)
- Real-time messaging with Socket.IO
- Conversation list
- Chat screen with message status
- Typing indicators
- Offline message handling
- Message read receipts

## Configuration

Update `config.js` to point to your backend server:

```javascript
export const API_BASE_URL = 'http://YOUR_IP_ADDRESS:3000';
export const SOCKET_URL = 'http://YOUR_IP_ADDRESS:3000';
```

For Android emulator, use `http://10.0.2.2:3000`
For iOS simulator, use `http://localhost:3000`
For physical device, use your computer's local IP address

