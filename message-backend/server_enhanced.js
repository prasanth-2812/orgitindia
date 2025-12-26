const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

// Enhanced routes
const authRoutes = require('./routes/auth_enhanced');
const conversationRoutes = require('./routes/conversations_enhanced');
const messageRoutes = require('./routes/messages_enhanced');
const contactRoutes = require('./routes/contacts');
const { handleSocketConnection } = require('./socket/socketHandler_enhanced');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased for media uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/contacts', contactRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: 'enhanced' });
});

// Socket.IO connection handling
handleSocketConnection(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Enhanced server running on port ${PORT}`);
  console.log(`Socket.IO server ready`);
  console.log(`\nFeatures enabled:`);
  console.log(`- OTP Authentication`);
  console.log(`- User Profiles`);
  console.log(`- Contact Syncing`);
  console.log(`- Group Chats (Manual & Task-based)`);
  console.log(`- Media Messages`);
  console.log(`- Message Reactions`);
  console.log(`- Message Replies, Edits, Deletes`);
  console.log(`- Message Search`);
  console.log(`- Pin Conversations`);
  console.log(`- Star/Favorite Messages`);
});

