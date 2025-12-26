# Enhanced Messaging System Features

This document describes the enhanced features added to the messaging system.

## Database Schema

Run the enhanced schema:
```bash
psql -U postgres -d messaging_db -f database/schema_enhanced.sql
```

## New Features

### 1. OTP-Based Authentication
- **Generate OTP**: `POST /api/auth/generate-otp`
  - Input: `{ phone: "10-digit-number" }`
  - Returns: OTP code (6 digits, valid for 3 minutes)
  
- **Verify OTP**: `POST /api/auth/verify-otp`
  - Input: `{ phone, otp, deviceId?, deviceInfo? }`
  - Creates user if new, returns JWT token

### 2. User Profiles
- **Update Profile**: `POST /api/auth/profile`
  - Input: `{ name, profile_photo?, bio? }`
  
- **Get Profile**: `GET /api/auth/me`

### 3. Contact Syncing
- **Sync Contacts**: `POST /api/contacts/sync`
  - Input: `{ contacts: [{name, phone}] }`
  - Matches contacts with app users
  
- **Get Contacts**: `GET /api/contacts`
- **Get App Users**: `GET /api/contacts/app-users`

### 4. Enhanced Conversations

#### Manual Groups
- **Create Group**: `POST /api/conversations/groups/create`
  - Input: `{ name, memberIds: [], group_photo? }`
  
- **Add Members**: `POST /api/conversations/groups/:id/members`
- **Remove Member**: `DELETE /api/conversations/groups/:id/members/:memberId`
- **Update Group**: `PUT /api/conversations/groups/:id` (admin only)
  - Input: `{ name?, group_photo? }`

#### Task-Based Auto Groups
- **Create Task Group**: `POST /api/conversations/groups/task-group`
  - Input: `{ taskId, name, memberIds: [] }`

#### Pin Conversations
- **Pin/Unpin**: `PUT /api/conversations/:id/pin`
  - Input: `{ is_pinned: true/false }`

### 5. Enhanced Messages

#### Media Messages
Supported types:
- `text`, `image`, `video`, `audio`, `voice`
- `document` (PDF, DOC, XLS)
- `contact`, `location`, `live_location`

#### Message Actions
- **Reply**: Include `replyToMessageId` in send_message
- **Edit**: `PUT /api/messages/:messageId`
  - Input: `{ content }`
  
- **Delete**: `DELETE /api/messages/:messageId`
  - Input: `{ deleteForAll: true/false }`
  - `deleteForAll=true`: Delete for everyone
  - `deleteForAll=false`: Delete for self only

#### Reactions
- **Add Reaction**: `POST /api/messages/:messageId/reactions`
  - Input: `{ reaction: "emoji" }`
  
- **Remove Reaction**: `DELETE /api/messages/:messageId/reactions/:reaction`

#### Star/Favorite Messages
- **Star**: `POST /api/messages/:messageId/star`
- **Unstar**: `DELETE /api/messages/:messageId/star`
- **Get Starred**: `GET /api/messages/starred/all`

#### Message Search
- **Global Search**: `GET /api/messages/search?query=text&limit=50`
- **Chat Search**: `GET /api/messages/search/:conversationId?query=text&limit=50`

### 6. Socket.IO Events

#### Client → Server
- `send_message` - Enhanced with media support
  ```javascript
  {
    conversationId,
    content?,
    messageType: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'document' | 'contact' | 'location' | 'live_location',
    mediaUrl?,
    mediaThumbnail?,
    fileName?,
    fileSize?,
    duration?,
    replyToMessageId?,
    locationLat?,
    locationLng?,
    locationAddress?,
    isLiveLocation?,
    liveLocationExpiresAt?
  }
  ```
- `message_reaction` - `{ messageId, conversationId, reaction }`
- `remove_reaction` - `{ messageId, conversationId, reaction }`
- `typing` - `{ conversationId, isTyping }`
- `message_read` - `{ messageId, conversationId }`

#### Server → Client
- `new_message` - Enhanced message object
- `message_status_update` - `{ messageId, status }`
- `message_reaction_added` - `{ messageId, userId, reaction }`
- `message_reaction_removed` - `{ messageId, userId, reaction }`
- `typing` - `{ userId, isTyping }`

### 7. Notifications

Notifications are automatically created for:
- New messages (for offline users)
- Group member additions/removals
- Mentions (future feature)
- Task-based alerts (future feature)

Get notifications: `GET /api/notifications` (to be implemented)

## Migration Guide

### Backend Updates

1. **Update server.js** to use enhanced routes:
```javascript
const authRoutes = require('./routes/auth_enhanced');
const conversationRoutes = require('./routes/conversations_enhanced');
const messageRoutes = require('./routes/messages_enhanced');
const contactRoutes = require('./routes/contacts');
const { handleSocketConnection } = require('./socket/socketHandler_enhanced');
```

2. **Run enhanced schema**:
```bash
psql -U postgres -d messaging_db -f database/schema_enhanced.sql
```

3. **Update .env** if needed (no changes required)

### Mobile App Updates

The mobile app needs to be updated to:
1. Use OTP authentication flow
2. Support contact syncing
3. Handle media messages
4. Support reactions, replies, edits, deletes
5. Implement group creation and management
6. Add message search
7. Support pinning and starring

## Notes

- OTP is currently logged to console (remove in production!)
- Media uploads need to be handled (S3, Cloudinary, etc.)
- Notifications endpoint needs to be implemented
- Task integration needs to be connected to task module

