import { Server, Socket } from 'socket.io';
import { createMessage, updateMessageStatus, markMessagesAsRead } from '../services/messageService';
import { verifyToken } from '../utils/jwt';
import { query } from '../config/database';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  organizationId?: string;
}

/**
 * Helper: derive receiverId / groupId and conversationId string
 * from a conversation-style identifier (direct_<userId> / group_<groupId>)
 */
const getConversationContextFromId = (conversationId: string) => {
  let receiverId: string | null = null;
  let groupId: string | null = null;

  if (conversationId?.startsWith('direct_')) {
    receiverId = conversationId.replace('direct_', '');
  } else if (conversationId?.startsWith('group_')) {
    groupId = conversationId.replace('group_', '');
  }

  return { receiverId, groupId };
};

/**
 * Authenticate socket connection
 */
export const authenticateSocket = async (socket: AuthenticatedSocket, next: any) => {
  try {
    // Match message-backend: use only socket.handshake.auth.token
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = verifyToken(token);
    socket.userId = decoded.userId;
    socket.organizationId = decoded.organizationId;

    next();
  } catch (error: any) {
    next(new Error('Authentication error'));
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

    // Join user's personal room - matching message-backend: user_${userId}
    socket.join(`user_${userId}`);

    // Notify others that this user is now online - matching message-backend: socket.broadcast.emit
    socket.broadcast.emit('user_online', { userId });

    // Step 8: Handle offline users - Send pending messages when user comes online
    // When user comes ONLINE:
    // 1. Client connects socket (already done above)
    // 2. Backend queries unread messages
    // 3. Sends pending messages
    (async () => {
      try {
        // Get all conversations user is part of
        // Note: This offline message handling is not in message-backend, but we keep it for completeness
        const conversationsResult = await query(
          `SELECT DISTINCT conversation_id 
           FROM conversation_members 
           WHERE user_id = $1`,
          [userId]
        );

        // For each conversation, get unread messages
        for (const row of conversationsResult.rows) {
          const conversationId = row.conversation_id;
          
          // Query unread messages for this conversation
          // SELECT * FROM messages WHERE conversation_id = $1 AND status != 'read'
          // Check message_status table to find messages not yet read by this user
          const unreadMessagesResult = await query(
            `SELECT m.*, u.name as sender_name,
                    COALESCE(ms.status, 'sent') as status
             FROM messages m
             LEFT JOIN users u ON m.sender_id = u.id
             LEFT JOIN message_status ms ON m.id = ms.message_id AND ms.user_id = $2
             WHERE m.conversation_id = $1 
               AND m.sender_id != $2
               AND (ms.status IS NULL OR ms.status != 'read')
               AND m.is_deleted = false
               AND m.deleted_at IS NULL
             ORDER BY m.created_at ASC
             LIMIT 50`,
            [conversationId, userId]
          );

          // Send pending messages to user
          for (const msg of unreadMessagesResult.rows) {
            const messagePayload: any = {
              id: msg.id,
              conversation_id: conversationId,
              sender_id: msg.sender_id,
              receiver_id: msg.receiver_id,
              group_id: msg.group_id,
              content: msg.content,
              text: msg.content, // Also include 'text' for compatibility
              message_type: msg.message_type,
              media_url: msg.media_url,
              media_thumbnail: msg.media_thumbnail,
              file_name: msg.file_name,
              file_size: msg.file_size,
              mime_type: msg.mime_type,
              duration: msg.duration,
              sender_name: msg.sender_name,
              created_at: msg.created_at,
              status: msg.status || 'sent', // Use status from query (sent/delivered)
              deleted_at: msg.deleted_at,
              deleted_for_all: msg.deleted_for_all,
            };

            // Emit pending message
            socket.emit('new_message', messagePayload);

            // Update status to delivered since user is now online (if not already delivered)
            if (msg.status !== 'delivered' && msg.status !== 'read') {
              await updateMessageStatus(msg.id, userId, 'delivered');
            }
          }
        }

        console.log(`Sent pending messages to user ${userId}`);
      } catch (error: any) {
        console.error(`Error sending pending messages to user ${userId}:`, error);
      }
    })();

    /**
     * CANONICAL EVENTS (used by new web/mobile code)
     * --------------------------------------------
     */

    // Handle sending messages (canonical API)
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

          // Backwards-compatible status update event for legacy mobile client
          io.to(`user:${senderId}`).emit('message_status_update', {
            messageId,
            status: 'read',
          });
        }
      } catch (error: any) {
        socket.emit('message:error', { error: error.message });
      }
    });

    // Handle marking messages as read (canonical)
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

    /**
     * LEGACY MOBILE EVENTS (compatibility layer)
     * -----------------------------------------
     * These events support the existing React Native client which uses:
     * - send_message / new_message
     * - message_read / conversation_messages_read
     * - message_status_update
     */

    // Legacy: send_message from mobile ChatScreen (enhanced with all fields and notifications)
    // Supports both 'text' and 'content' fields for compatibility
    // CRITICAL FIX: Works with UUID conversation IDs directly (not direct_/group_ format)
    socket.on('send_message', async (data) => {
      try {
        const {
          conversationId,
          messageType = 'text',
          content,
          text, // Support 'text' field as specified in flow
          mediaUrl,
          mediaThumbnail,
          fileName,
          fileSize,
          mimeType,
          duration,
          replyToMessageId,
          locationLat,
          locationLng,
          locationAddress,
          isLiveLocation,
          liveLocationExpiresAt,
        } = data;

        if (!conversationId) {
          socket.emit('error', { message: 'conversationId is required' });
          return;
        }

        // Use 'text' if provided, otherwise use 'content'
        const messageContent = text || content;

        // Handle direct_<userId> format conversations (they may not exist in conversations table)
        let isGroup = false;
        let otherUserId: string | null = null;
        
        if (conversationId.startsWith('direct_')) {
          // Direct conversation - extract other user ID
          otherUserId = conversationId.replace('direct_', '');
          
          // Verify the other user exists
          const userCheck = await query('SELECT id FROM users WHERE id = $1', [otherUserId]);
          if (userCheck.rows.length === 0) {
            socket.emit('error', { message: 'Other user not found' });
            return;
          }
          
          // For direct conversations, ensure both users are in conversation_members
          // This allows messages to be queried later
          await query(
            `INSERT INTO conversation_members (conversation_id, user_id, role, joined_at)
             VALUES ($1, $2, 'member', CURRENT_TIMESTAMP)
             ON CONFLICT (conversation_id, user_id) DO NOTHING`,
            [conversationId, userId]
          );
          await query(
            `INSERT INTO conversation_members (conversation_id, user_id, role, joined_at)
             VALUES ($1, $2, 'member', CURRENT_TIMESTAMP)
             ON CONFLICT (conversation_id, user_id) DO NOTHING`,
            [conversationId, otherUserId]
          );
          
          // Also ensure conversation exists in conversations table (for queries)
          // CRITICAL FIX: Handle conversations table with or without 'type' column
          // Try with type column first (if it exists), then fallback to without
          try {
            // First try with type column (for databases that have it)
            await query(
              `INSERT INTO conversations (id, type, is_group, is_task_group, created_at, updated_at)
               VALUES ($1, 'direct', FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               ON CONFLICT (id) DO NOTHING`,
              [conversationId]
            );
          } catch (error: any) {
            // If error is about type column not existing, try without it
            if (error.message && error.message.includes('type')) {
              await query(
                `INSERT INTO conversations (id, is_group, is_task_group, created_at, updated_at)
                 VALUES ($1, FALSE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 ON CONFLICT (id) DO NOTHING`,
                [conversationId]
              );
            } else {
              // If it's a different error (like constraint violation), that's okay - conversation might already exist
              console.log(`[send_message] Conversation ${conversationId} might already exist or error:`, error.message);
            }
          }
        } else {
          // UUID format - verify user is member and get conversation details
          const memberCheck = await query(
            'SELECT * FROM conversation_members WHERE conversation_id::text = $1::text AND user_id = $2',
            [conversationId, userId]
          );

          if (memberCheck.rows.length === 0) {
            socket.emit('error', { message: 'Not a member of this conversation' });
            return;
          }

          // Get conversation details to determine if it's a group or direct chat
          const convResult = await query(
            'SELECT is_group, is_task_group FROM conversations WHERE id::text = $1::text',
            [conversationId]
          );

          if (convResult.rows.length === 0) {
            socket.emit('error', { message: 'Conversation not found' });
            return;
          }

          isGroup = convResult.rows[0].is_group || convResult.rows[0].is_task_group;
        }
        
        // For direct conversations, get the other user's ID
        let receiverId: string | null = null;
        let groupId: string | null = null;
        
        if (!isGroup) {
          // Use otherUserId if we extracted it, otherwise query for it
          if (otherUserId) {
            receiverId = otherUserId;
          } else {
            const otherMemberResult = await query(
              'SELECT user_id FROM conversation_members WHERE conversation_id::text = $1::text AND user_id != $2 LIMIT 1',
              [conversationId, userId]
            );
            if (otherMemberResult.rows.length > 0) {
              receiverId = otherMemberResult.rows[0].user_id;
            }
          }
        } else {
          // For groups, we still need to store the group_id reference
          // Check if there's a group_id in the conversation or use conversationId
          groupId = conversationId; // Use conversationId as group reference
        }

        // Get sender info - matching message-backend: use profile_photo
        const userResult = await query(
          'SELECT name, profile_photo FROM users WHERE id = $1',
          [userId]
        );
        const senderName = userResult.rows[0]?.name || 'Unknown';
        const senderPhoto = userResult.rows[0]?.profile_photo || null;

        // Save message to database - matching EXACT table structure from database
        // Table has: receiver_id, group_id, conversation_id, sender_organization_id, visibility_mode, etc.
        console.log(`[send_message] Inserting message into database:`, {
          conversationId,
          userId,
          organizationId,
          receiverId,
          groupId,
          messageContent: messageContent?.substring(0, 50),
          messageType,
        });
        
        // INSERT matching the exact table structure shown by user
        // Table columns: sender_id, receiver_id, group_id, conversation_id, message_type, content,
        // media_url, file_name, file_size, mime_type, visibility_mode, sender_organization_id,
        // reply_to_message_id, media_thumbnail, duration, edited_at, deleted_at,
        // location_lat, location_lng, location_address, is_live_location, live_location_expires_at,
        // deleted_for_all, status
        const result = await query(
          `INSERT INTO messages (
            sender_id, receiver_id, group_id, conversation_id, message_type, content, 
            media_url, file_name, file_size, mime_type, visibility_mode, sender_organization_id,
            reply_to_message_id, media_thumbnail, duration, edited_at, deleted_at,
            location_lat, location_lng, location_address, is_live_location, live_location_expires_at,
            deleted_for_all, status
          )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
           RETURNING *`,
          [
            userId, // $1: sender_id
            receiverId || null, // $2: receiver_id (for direct messages)
            groupId || null, // $3: group_id (for group messages)
            conversationId, // $4: conversation_id (primary identifier)
            messageType, // $5: message_type
            messageContent, // $6: content
            mediaUrl || null, // $7: media_url
            fileName || null, // $8: file_name
            fileSize || null, // $9: file_size
            mimeType || null, // $10: mime_type
            'shared_to_group', // $11: visibility_mode (default as per table data)
            organizationId, // $12: sender_organization_id (required, NOT NULL)
            replyToMessageId || null, // $13: reply_to_message_id
            mediaThumbnail || null, // $14: media_thumbnail
            duration || null, // $15: duration
            null, // $16: edited_at (set when message is edited)
            null, // $17: deleted_at (set when message is deleted)
            locationLat || null, // $18: location_lat
            locationLng || null, // $19: location_lng
            locationAddress || null, // $20: location_address
            isLiveLocation || false, // $21: is_live_location
            liveLocationExpiresAt || null, // $22: live_location_expires_at
            false, // $23: deleted_for_all (default false)
            'sent', // $24: status (initial status)
          ]
        );

        if (!result.rows || result.rows.length === 0) {
          throw new Error('Message insertion failed - no rows returned');
        }

        const message = result.rows[0];
        console.log(`[send_message] Message inserted successfully:`, {
          messageId: message.id,
          conversationId: message.conversation_id,
          status: message.status,
          content: message.content?.substring(0, 30),
        });

        // Get reply info if exists
        let replyTo = null;
        if (replyToMessageId) {
          const replyResult = await query(
            `SELECT m.id, m.content, m.message_type, u.name as sender_name
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.id = $1`,
            [replyToMessageId]
          );
          if (replyResult.rows.length > 0) {
            replyTo = replyResult.rows[0];
          }
        }

        // Build message payload (matching message-backend structure exactly)
        const messagePayload: any = {
          ...message, // Start with all DB fields
          conversation_id: conversationId,
          sender_id: userId,
          content: message.content,
          text: message.content, // Also include 'text' for compatibility
          message_type: messageType,
          sender_name: senderName,
          sender_photo: senderPhoto,
          reply_to: replyTo || undefined,
          status: 'sent', // Initial status (matching message-backend)
        };

        // Get conversation members first (use ::text casting for compatibility)
        const conversationMembers = await query(
          'SELECT user_id FROM conversation_members WHERE conversation_id::text = $1::text',
          [conversationId]
        );

        // CRITICAL: Emit to both conversation room AND personal rooms
        // 1. Emit to conversation room (users who joined the conversation)
        io.to(conversationId).emit('new_message', messagePayload);
        
        // 2. Emit to each member's personal room (this ensures messages are received even if user hasn't joined conversation room)
        // Matching message-backend: user_${userId} format
        for (const member of conversationMembers.rows) {
          const personalRoom = `user_${member.user_id}`;
          io.to(personalRoom).emit('new_message', messagePayload);
          console.log(`[send_message] Emitted new_message to personal room: ${personalRoom}`);
        }
        
        console.log(`[send_message] Emitted new_message to conversation room: ${conversationId}, members: ${conversationMembers.rows.length}`);

        // Update conversation updated_at (handle both TEXT and UUID formats)
        await query(
          `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP 
           WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`,
          [conversationId]
        ).catch(() => {
          // If conversation doesn't exist yet, that's okay - it will be created on next message
          console.log(`[send_message] Conversation ${conversationId} not found in conversations table, skipping update`);
        });

        // STEP 5: Message Status Update (Delivered) - Exact flow from document
        // Check which users are online and update status to 'delivered' for them
        const otherMembers = await query(
          'SELECT user_id FROM conversation_members WHERE conversation_id::text = $1::text AND user_id != $2',
          [conversationId, userId]
        );

        const onlineUsers: string[] = [];
        for (const member of otherMembers.rows) {
          // Check if user is in their personal room (online)
          // Matching message-backend: user_${userId} format
          const sockets = await io.in(`user_${member.user_id}`).fetchSockets();
          if (sockets.length > 0) {
            onlineUsers.push(member.user_id);
            
            // Update message status to 'delivered' in database
            await query(
              `UPDATE messages SET status = $1 WHERE id = $2`,
              ['delivered', message.id]
            );
            
            console.log(`[send_message] User ${member.user_id} is online, message ${message.id} marked as delivered`);
          }
        }

        // Emit status update if delivered (matching message-backend logic exactly)
        if (onlineUsers.length > 0) {
          messagePayload.status = 'delivered';
          
          // Emit to conversation room
          io.to(conversationId).emit('message_status_update', {
            messageId: message.id,
            conversationId,
            status: 'delivered',
          });
          
          // Also emit to each member's personal room - matching message-backend: user_${userId}
          // This ensures ConversationsScreen receives status updates
          for (const member of conversationMembers.rows) {
            io.to(`user_${member.user_id}`).emit('message_status_update', {
              messageId: message.id,
              conversationId,
              status: 'delivered',
            });
          }
          
          console.log(`[send_message] Emitted 'delivered' status update for message ${message.id} to ${onlineUsers.length} online users`);
        }

        // Create notifications for offline users
        for (const member of otherMembers.rows) {
          if (!onlineUsers.includes(member.user_id)) {
            const notificationBody = messageContent 
              ? (messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent)
              : (messageType === 'image' ? '📷 Photo' 
                : messageType === 'video' ? '🎥 Video'
                : messageType === 'audio' || messageType === 'voice' ? '🎤 Audio'
                : messageType === 'document' ? '📄 Document'
                : messageType === 'location' ? '📍 Location'
                : `Sent a ${messageType}`);
            
            await query(
              `INSERT INTO notifications (user_id, type, title, body, conversation_id, message_id, created_at)
               VALUES ($1, 'message', $2, $3, $4, $5, NOW())`,
              [
                member.user_id,
                `New message in conversation`,
                notificationBody,
                conversationId,
                message.id
              ]
            );
          }
        }
      } catch (error: any) {
        // CRITICAL FIX: Use variables from outer scope or data object
        const errorConversationId = (typeof conversationId !== 'undefined' ? conversationId : null) || data?.conversationId || 'unknown';
        const errorUserId = (typeof userId !== 'undefined' ? userId : null) || socket.userId || 'unknown';
        const errorOrganizationId = (typeof organizationId !== 'undefined' ? organizationId : null) || socket.organizationId || 'unknown';
        const errorMessageContent = (typeof messageContent !== 'undefined' ? messageContent : null) || data?.content || data?.text || 'unknown';
        const errorMessageType = (typeof messageType !== 'undefined' ? messageType : null) || data?.messageType || 'unknown';
        
        console.error('[send_message] Error:', error.message);
        console.error('[send_message] Error stack:', error.stack);
        console.error('[send_message] Error details:', {
          conversationId: errorConversationId,
          userId: errorUserId,
          organizationId: errorOrganizationId,
          messageContent: typeof errorMessageContent === 'string' ? errorMessageContent.substring(0, 50) : 'unknown',
          messageType: errorMessageType,
        });
        socket.emit('error', { 
          message: 'Failed to send message',
          details: error.message 
        });
      }
    });

    // Legacy: message_read from mobile (per-message or whole conversation)
    socket.on('message_read', async (data) => {
      try {
        const { conversationId, messageId } = data || {};

        if (messageId && conversationId) {
          // Mark a single message as read
          const messageCheck = await query(
            `SELECT m.id, m.sender_id
             FROM messages m
             JOIN conversation_members cm ON m.conversation_id = cm.conversation_id
             WHERE m.id = $1 AND m.conversation_id = $2 AND cm.user_id = $3`,
            [messageId, conversationId, userId]
          );

          if (messageCheck.rows.length > 0 && messageCheck.rows[0].sender_id !== userId) {
            // CRITICAL FIX: message_status table might use 'status_at' instead of 'created_at'
            try {
              await query(
                `INSERT INTO message_status (message_id, user_id, status, status_at)
                 VALUES ($1, $2, 'read', NOW())
                 ON CONFLICT (message_id, user_id) 
                 DO UPDATE SET status = 'read', status_at = NOW()`,
                [messageId, userId]
              );
            } catch (error: any) {
              // If error is about column name, try with created_at
              if (error.message && error.message.includes('created_at')) {
                await query(
                  `INSERT INTO message_status (message_id, user_id, status, created_at)
                   VALUES ($1, $2, 'read', NOW())
                   ON CONFLICT (message_id, user_id) 
                   DO UPDATE SET status = 'read', updated_at = NOW()`,
                  [messageId, userId]
                );
              } else {
                // If message_status table doesn't exist or has different structure, skip it
                console.warn('[message_read] Could not update message_status table:', error.message);
              }
            }

            // Update message status in messages table for backwards compatibility
            await query(
              `UPDATE messages SET status = 'read' WHERE id = $1 AND status != 'read'`,
              [messageId]
            );

            io.to(conversationId).emit('message_status_update', {
              messageId,
              conversationId,
              status: 'read',
            });

            // Also emit to sender's personal room - matching message-backend: user_${userId}
            const senderId = messageCheck.rows[0].sender_id;
            io.to(`user_${senderId}`).emit('message_status_update', {
              messageId,
              conversationId,
              status: 'read',
            });
          }
        } else if (conversationId) {
          // Mark all unread messages in conversation as read
          await query(
            `UPDATE messages 
             SET status = 'read' 
             WHERE conversation_id::text = $1::text 
             AND sender_id != $2 
             AND status != 'read'
             AND deleted_at IS NULL`,
            [conversationId, userId]
          );

          // Also update message_status table
          const unreadMessages = await query(
            `SELECT id FROM messages 
             WHERE conversation_id::text = $1::text 
             AND sender_id != $2 
             AND status = 'read'
             AND deleted_at IS NULL`,
            [conversationId, userId]
          );

          for (const msg of unreadMessages.rows) {
            // CRITICAL FIX: message_status table might use 'status_at' instead of 'created_at'
            try {
              await query(
                `INSERT INTO message_status (message_id, user_id, status, status_at)
                 VALUES ($1, $2, 'read', NOW())
                 ON CONFLICT (message_id, user_id) 
                 DO UPDATE SET status = 'read', status_at = NOW()`,
                [msg.id, userId]
              );
            } catch (error: any) {
              // If error is about column name, try with created_at
              if (error.message && error.message.includes('created_at')) {
                await query(
                  `INSERT INTO message_status (message_id, user_id, status, created_at)
                   VALUES ($1, $2, 'read', NOW())
                   ON CONFLICT (message_id, user_id) 
                   DO UPDATE SET status = 'read', updated_at = NOW()`,
                  [msg.id, userId]
                );
              } else {
                // If message_status table doesn't exist or has different structure, skip it
                console.warn('[message_read] Could not update message_status table:', error.message);
              }
            }
          }

          // Get conversation members to emit to their personal rooms
          const convMembers = await query(
            'SELECT user_id FROM conversation_members WHERE conversation_id::text = $1::text',
            [conversationId]
          );
          
          // Emit a single event for all messages marked as read in this conversation
          io.to(conversationId).emit('conversation_messages_read', {
            conversationId,
            status: 'read',
          });
          
          // Also emit to each member's personal room - matching message-backend: user_${userId}
          for (const member of convMembers.rows) {
            io.to(`user_${member.user_id}`).emit('conversation_messages_read', {
              conversationId,
              status: 'read',
            });
          }
          
          // Also emit individual updates for each message
          for (const msg of unreadMessages.rows) {
            io.to(conversationId).emit('message_status_update', {
              messageId: msg.id,
              conversationId,
              status: 'read',
            });
            
            // Also emit to each member's personal room - matching message-backend: user_${userId}
            for (const member of convMembers.rows) {
              io.to(`user_${member.user_id}`).emit('message_status_update', {
                messageId: msg.id,
                conversationId,
                status: 'read',
              });
            }
          }
        }
      } catch (error: any) {
        socket.emit('message:error', { error: error.message });
      }
    });

    // Join group room (kept for potential future use)
    socket.on('group:join', (groupId: string) => {
      socket.join(`group:${groupId}`);
      console.log(`User ${userId} joined group ${groupId}`);
    });

    // Leave group room
    socket.on('group:leave', (groupId: string) => {
      socket.leave(`group:${groupId}`);
      console.log(`User ${userId} left group ${groupId}`);
    });

    // Join conversation room
    socket.on('join_conversation', async (conversationId: string) => {
      try {
        // Check membership
        const membershipCheck = await query(
          `SELECT 1 FROM conversation_members 
           WHERE conversation_id::text = $1::text AND user_id = $2`,
          [conversationId, userId]
        );

        if (membershipCheck.rows.length > 0) {
          socket.join(conversationId);
          console.log(`User ${userId} joined conversation ${conversationId}`);
          
          // CRITICAL FIX: Also ensure user is in their personal room for status updates
          // Matching message-backend: user_${userId}
          if (!socket.rooms.has(`user_${userId}`)) {
            socket.join(`user_${userId}`);
          }
        } else {
          // For direct conversations, try to create membership if messages exist
          const { receiverId } = getConversationContextFromId(conversationId);
          if (receiverId) {
            const messageCheck = await query(
              `SELECT 1 FROM messages 
               WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
                 AND group_id IS NULL
                 AND deleted_at IS NULL
               LIMIT 1`,
              [userId, receiverId]
            );
            
            if (messageCheck.rows.length > 0) {
              // Create membership if messages exist
              await query(
                `INSERT INTO conversation_members (conversation_id, user_id)
                 VALUES ($1, $2), ($1, $3)
                 ON CONFLICT (conversation_id, user_id) DO NOTHING`,
                [conversationId, userId, receiverId]
              );
              socket.join(conversationId);
              console.log(`User ${userId} auto-joined conversation ${conversationId} (direct chat)`);
            } else {
              socket.emit('message:error', { error: 'Not a member of this conversation' });
            }
          } else {
            socket.emit('message:error', { error: 'Not a member of this conversation' });
          }
        }
      } catch (error: any) {
        socket.emit('message:error', { error: error.message });
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(conversationId);
      console.log(`User ${userId} left conversation ${conversationId}`);
    });

    // Typing indicator
    socket.on('typing', async (data: { conversationId: string; isTyping: boolean }) => {
      try {
        const { conversationId, isTyping } = data;
        
        // Check membership
        const membershipCheck = await query(
          `SELECT 1 FROM conversation_members 
           WHERE conversation_id::text = $1::text AND user_id = $2`,
          [conversationId, userId]
        );

        if (membershipCheck.rows.length > 0) {
          // Emit to others in conversation
          socket.to(conversationId).emit('typing', {
            userId,
            conversationId,
            isTyping,
          });
        }
      } catch (error: any) {
        socket.emit('message:error', { error: error.message });
      }
    });

    // Check user online status - matching message-backend
    socket.on('check_user_online', async (data: { userId: string }, callback?: (isOnline: boolean) => void) => {
      try {
        const { userId: targetUserId } = data;
        // Matching message-backend: user_${userId} format
        const sockets = await io.in(`user_${targetUserId}`).fetchSockets();
        const isOnline = sockets.length > 0;
        
        if (callback && typeof callback === 'function') {
          callback(isOnline);
        }
        
        // Also emit the status - matching message-backend
        socket.emit('user_online_status', { userId: targetUserId, isOnline });
      } catch (error: any) {
        console.error('Check user online error:', error);
        if (callback && typeof callback === 'function') {
          callback(false);
        }
      }
    });

    // Add reaction (real-time)
    socket.on('message_reaction', async (data: { messageId: string; conversationId: string; reaction: string }) => {
      try {
        const { messageId, conversationId, reaction } = data;

        // Insert reaction
        await query(
          `INSERT INTO message_reactions (id, message_id, user_id, reaction, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, NOW())
           ON CONFLICT (message_id, user_id, reaction) DO NOTHING`,
          [messageId, userId, reaction]
        );

        // Emit to conversation room
        io.to(conversationId).emit('message_reaction_added', {
          messageId,
          userId,
          reaction,
        });
      } catch (error: any) {
        socket.emit('message:error', { error: error.message });
      }
    });

    // Remove reaction (real-time)
    socket.on('remove_reaction', async (data: { messageId: string; conversationId: string; reaction: string }) => {
      try {
        const { messageId, conversationId, reaction } = data;

        // Delete reaction
        await query(
          `DELETE FROM message_reactions 
           WHERE message_id = $1 AND user_id = $2 AND reaction = $3`,
          [messageId, userId, reaction]
        );

        // Emit to conversation room
        io.to(conversationId).emit('message_reaction_removed', {
          messageId,
          userId,
          reaction,
        });
      } catch (error: any) {
        socket.emit('message:error', { error: error.message });
      }
    });

    // Handle disconnect - matching message-backend
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
      // Notify others that this user is now offline - matching message-backend: socket.broadcast.emit
      socket.broadcast.emit('user_offline', { userId });
    });
  });
};

