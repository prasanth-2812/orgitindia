# Messaging Backend

Backend server for the messaging POC using Node.js, Express, Socket.IO, and PostgreSQL.

## Setup

1. Install PostgreSQL and create a database:
```sql
CREATE DATABASE messaging_db;
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your database credentials.

5. Run the database schema:
```bash
psql -U postgres -d messaging_db -f database/schema.sql
```

6. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Conversations
- `GET /api/conversations` - Get all conversations for current user
- `POST /api/conversations/create` - Create or get 1-to-1 conversation
- `GET /api/conversations/:conversationId` - Get conversation details
- `GET /api/conversations/users/list` - Get all users (for creating conversations)

### Messages
- `GET /api/messages/:conversationId` - Get messages for a conversation
- `PUT /api/messages/:conversationId/read` - Mark messages as read

## Socket.IO Events

### Client → Server
- `join_conversation` - Join a conversation room
- `leave_conversation` - Leave a conversation room
- `send_message` - Send a message
- `typing` - Send typing indicator
- `message_read` - Mark message as read

### Server → Client
- `new_message` - New message received
- `message_status_update` - Message status changed (delivered/read)
- `typing` - Typing indicator from other user
- `error` - Error occurred

## Environment Variables

- `PORT` - Server port (default: 3000)
- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `JWT_SECRET` - Secret key for JWT tokens

