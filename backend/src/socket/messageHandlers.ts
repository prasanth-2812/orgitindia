import { Server, Socket } from 'socket.io';
import { createMessage, updateMessageStatus, markMessagesAsRead } from '../services/messageService';
import { verifyToken } from '../utils/jwt';
import { query } from '../config/database';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  organizationId?: string;
}

/**
 * Authenticate socket connection
 */
export const authenticateSocket = async (socket: AuthenticatedSocket, next: any) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.substring(7);

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = verifyToken(token);
    socket.userId = decoded.userId;
    socket.organizationId = decoded.organizationId;

    next();
  } catch (error: any) {
    next(new Error('Authentication error: ' + error.message));
  }
};

/**
 * Setup message socket handlers
 */
export const setupMessageHandlers = (io: Server) => {
  io.use(authenticateSocket);

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    const organizationId = socket.organizationId!;

    console.log(`User ${userId} connected via socket`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Handle sending messages
    socket.on('message:send', async (data) => {
      try {
        const {
          receiverId,
          groupId,
          messageType,
          content,
          mediaUrl,
          fileName,
          fileSize,
          mimeType,
          visibilityMode = 'shared_to_group',
          replyToMessageId,
          forwardedFromMessageId,
          mentions = [],
          taskMentions = [],
        } = data;

        const message = await createMessage(
          userId,
          receiverId || null,
          groupId || null,
          messageType,
          content || null,
          mediaUrl || null,
          fileName || null,
          fileSize || null,
          mimeType || null,
          visibilityMode,
          organizationId,
          replyToMessageId || null,
          forwardedFromMessageId || null,
          mentions,
          taskMentions
        );

        // Emit to receiver (one-to-one) or group members
        if (receiverId) {
          // One-to-one message
          io.to(`user:${receiverId}`).emit('message:received', message);
          socket.emit('message:sent', message);
        } else if (groupId) {
          // Group message - get all members
          const membersResult = await query(
            `SELECT user_id, organization_id FROM group_members WHERE group_id = $1`,
            [groupId]
          );

          // Emit to all members who can see the message
          for (const member of membersResult.rows) {
            if (member.user_id === userId) {
              socket.emit('message:sent', message);
            } else if (
              visibilityMode === 'shared_to_group' ||
              (visibilityMode === 'org_only' && member.organization_id === organizationId)
            ) {
              io.to(`user:${member.user_id}`).emit('message:received', message);
            }
          }
        }
      } catch (error: any) {
        socket.emit('message:error', { error: error.message });
      }
    });

    // Handle message delivery confirmation
    socket.on('message:delivered', async (data) => {
      try {
        const { messageId } = data;
        await updateMessageStatus(messageId, userId, 'delivered');
        socket.emit('message:delivered:confirmed', { messageId });
      } catch (error: any) {
        socket.emit('message:error', { error: error.message });
      }
    });

    // Handle message read receipt
    socket.on('message:read', async (data) => {
      try {
        const { messageId } = data;
        await updateMessageStatus(messageId, userId, 'read');

        // Notify sender
        const messageResult = await query('SELECT sender_id FROM messages WHERE id = $1', [messageId]);
        if (messageResult.rows.length > 0) {
          const senderId = messageResult.rows[0].sender_id;
          io.to(`user:${senderId}`).emit('message:read:notification', {
            messageId,
            readBy: userId,
          });
        }
      } catch (error: any) {
        socket.emit('message:error', { error: error.message });
      }
    });

    // Handle marking messages as read
    socket.on('messages:mark-read', async (data) => {
      try {
        const { receiverId, groupId } = data;
        await markMessagesAsRead(userId, receiverId || null, groupId || null);

        // Notify the other party
        if (receiverId) {
          io.to(`user:${receiverId}`).emit('messages:read:notification', {
            readBy: userId,
          });
        } else if (groupId) {
          // Notify all group members
          const membersResult = await query(
            `SELECT user_id FROM group_members WHERE group_id = $1 AND user_id != $2`,
            [groupId, userId]
          );
          for (const member of membersResult.rows) {
            io.to(`user:${member.user_id}`).emit('messages:read:notification', {
              groupId,
              readBy: userId,
            });
          }
        }
      } catch (error: any) {
        socket.emit('message:error', { error: error.message });
      }
    });

    // Join group room
    socket.on('group:join', (groupId: string) => {
      socket.join(`group:${groupId}`);
      console.log(`User ${userId} joined group ${groupId}`);
    });

    // Leave group room
    socket.on('group:leave', (groupId: string) => {
      socket.leave(`group:${groupId}`);
      console.log(`User ${userId} left group ${groupId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
    });
  });
};

