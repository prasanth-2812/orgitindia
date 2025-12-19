import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { Message, MessageStatus, MessageType, MessageVisibilityMode } from '../../../shared/src/types';
import { handleTaskMentionInPersonalChat } from './taskMentionService';

/**
 * Create a new message
 */
export const createMessage = async (
  senderId: string,
  receiverId: string | null,
  groupId: string | null,
  messageType: MessageType,
  content: string | null,
  mediaUrl: string | null,
  fileName: string | null,
  fileSize: number | null,
  mimeType: string | null,
  visibilityMode: MessageVisibilityMode,
  senderOrganizationId: string,
  replyToMessageId: string | null = null,
  forwardedFromMessageId: string | null = null,
  mentions: string[] = [],
  taskMentions: string[] = []
): Promise<Message> => {
  if (!receiverId && !groupId) {
    throw new Error('Either receiverId or groupId must be provided');
  }

  const result = await query(
    `INSERT INTO messages (
      id, sender_id, receiver_id, group_id, message_type, content, media_url,
      file_name, file_size, mime_type, visibility_mode, sender_organization_id,
      reply_to_message_id, forwarded_from_message_id, mentions, task_mentions
    )
    VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
    )
    RETURNING *`,
    [
      senderId,
      receiverId,
      groupId,
      messageType,
      content,
      mediaUrl,
      fileName,
      fileSize,
      mimeType,
      visibilityMode,
      senderOrganizationId,
      replyToMessageId,
      forwardedFromMessageId,
      JSON.stringify(mentions),
      JSON.stringify(taskMentions),
    ]
  );

  const message = result.rows[0];

  // Handle task mentions in personal chat - cross-post to task groups
  if (receiverId && taskMentions.length > 0) {
    // This is a personal chat with task mentions
    await handleTaskMentionInPersonalChat(
      message.id,
      senderId,
      receiverId,
      taskMentions,
      content || '',
      senderOrganizationId
    );
  }

  // Create initial 'sent' status for sender
  await query(
    `INSERT INTO message_status (id, message_id, user_id, status, status_at)
     VALUES (gen_random_uuid(), $1, $2, 'sent', NOW())`,
    [message.id, senderId]
  );

  // If it's a one-to-one message, mark as delivered to receiver
  if (receiverId) {
    await query(
      `INSERT INTO message_status (id, message_id, user_id, status, status_at)
       VALUES (gen_random_uuid(), $1, $2, 'delivered', NOW())`,
      [message.id, receiverId]
    );
  } else if (groupId) {
    // For group messages, mark as delivered to all group members except sender
    const membersResult = await query(
      `SELECT user_id FROM group_members WHERE group_id = $1 AND user_id != $2`,
      [groupId, senderId]
    );

    for (const member of membersResult.rows) {
      await query(
        `INSERT INTO message_status (id, message_id, user_id, status, status_at)
         VALUES (gen_random_uuid(), $1, $2, 'delivered', NOW())`,
        [message.id, member.user_id]
      );
    }
  }

  return {
    ...message,
    mentions: typeof message.mentions === 'string' ? JSON.parse(message.mentions) : message.mentions,
    taskMentions: typeof message.task_mentions === 'string' ? JSON.parse(message.task_mentions) : message.task_mentions,
  } as Message;
};

/**
 * Get messages for a chat (one-to-one or group)
 */
export const getMessages = async (
  userId: string,
  receiverId: string | null,
  groupId: string | null,
  limit: number = 50,
  before: string | null = null
): Promise<Message[]> => {
  if (!receiverId && !groupId) {
    throw new Error('Either receiverId or groupId must be provided');
  }

  let queryText = '';
  let params: any[] = [];

  if (receiverId) {
    // One-to-one messages
    queryText = `
      SELECT m.*
      FROM messages m
      WHERE (
        (m.sender_id = $1 AND m.receiver_id = $2) OR
        (m.sender_id = $2 AND m.receiver_id = $1)
      )
      AND m.is_deleted = false
      ${before ? 'AND m.created_at < $3' : ''}
      ORDER BY m.created_at DESC
      LIMIT ${before ? '$4' : '$3'}
    `;
    params = before ? [userId, receiverId, before, limit] : [userId, receiverId, limit];
  } else {
    // Group messages - filter by visibility mode
    queryText = `
      SELECT m.*
      FROM messages m
      INNER JOIN group_members gm ON m.group_id = gm.group_id
      WHERE m.group_id = $1
      AND gm.user_id = $2
      AND m.is_deleted = false
      AND (
        m.visibility_mode = 'shared_to_group' OR
        (m.visibility_mode = 'org_only' AND m.sender_organization_id = gm.organization_id)
      )
      ${before ? 'AND m.created_at < $3' : ''}
      ORDER BY m.created_at DESC
      LIMIT ${before ? '$4' : '$3'}
    `;
    params = before ? [groupId, userId, before, limit] : [groupId, userId, limit];
  }

  const result = await query(queryText, params);

  return result.rows.map((row: any) => ({
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id || undefined,
    groupId: row.group_id || undefined,
    messageType: row.message_type,
    content: row.content || undefined,
    mediaUrl: row.media_url || undefined,
    fileName: row.file_name || undefined,
    fileSize: row.file_size !== null && row.file_size !== undefined ? Number(row.file_size) : undefined,
    mimeType: row.mime_type || undefined,
    visibilityMode: row.visibility_mode,
    senderOrganizationId: row.sender_organization_id,
    replyToMessageId: row.reply_to_message_id || undefined,
    forwardedFromMessageId: row.forwarded_from_messageld || undefined,
    isEdited: row.is_edited,
    isDeleted: row.is_deleted,
    deletedForEveryone: row.deleted_for_everyone,
    isPinned: row.is_pinned,
    isStarred: row.is_starred,
    mentions: typeof row.mentions === 'string' ? JSON.parse(row.mentions) : row.mentions,
    taskMentions: typeof row.task_mentions === 'string' ? JSON.parse(row.task_mentions) : row.task_mentions,
    createdAt: row.created_at?.toISOString?.() || new Date(row.created_at).toISOString?.() || new Date().toISOString(),
    updatedAt: row.updated_at?.toISOString?.() || new Date(row.updated_at).toISOString?.() || new Date().toISOString(),
  })) as Message[];
};

/**
 * Update message status (delivered/read)
 */
export const updateMessageStatus = async (
  messageId: string,
  userId: string,
  status: MessageStatus
): Promise<void> => {
  // Check if status record exists
  const existingResult = await query(
    `SELECT id FROM message_status 
     WHERE message_id = $1 AND user_id = $2`,
    [messageId, userId]
  );

  if (existingResult.rows.length > 0) {
    // Update existing status
    await query(
      `UPDATE message_status 
       SET status = $1, status_at = NOW()
       WHERE message_id = $2 AND user_id = $3`,
      [status, messageId, userId]
    );
  } else {
    // Create new status record
    await query(
      `INSERT INTO message_status (id, message_id, user_id, status, status_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
      [messageId, userId, status]
    );
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
  userId: string,
  receiverId: string | null,
  groupId: string | null
): Promise<void> => {
  if (!receiverId && !groupId) {
    throw new Error('Either receiverId or groupId must be provided');
  }

  let queryText = '';
  let params: any[] = [];

  if (receiverId) {
    queryText = `
      UPDATE message_status ms
      SET status = 'read', status_at = NOW()
      FROM messages m
      WHERE ms.message_id = m.id
      AND m.sender_id = $1
      AND m.receiver_id = $2
      AND ms.user_id = $2
      AND ms.status != 'read'
    `;
    params = [receiverId, userId];
  } else {
    queryText = `
      UPDATE message_status ms
      SET status = 'read', status_at = NOW()
      FROM messages m
      WHERE ms.message_id = m.id
      AND m.group_id = $1
      AND ms.user_id = $2
      AND ms.status != 'read'
    `;
    params = [groupId, userId];
  }

  await query(queryText, params);
};

/**
 * Edit a message
 */
export const editMessage = async (
  messageId: string,
  userId: string,
  newContent: string
): Promise<Message> => {
  const result = await query(
    `UPDATE messages 
     SET content = $1, is_edited = true, updated_at = NOW()
     WHERE id = $2 AND sender_id = $3
     RETURNING *`,
    [newContent, messageId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Message not found or unauthorized');
  }

  const message = result.rows[0];
  return {
    ...message,
    mentions: typeof message.mentions === 'string' ? JSON.parse(message.mentions) : message.mentions,
    taskMentions: typeof message.task_mentions === 'string' ? JSON.parse(message.task_mentions) : message.task_mentions,
  } as Message;
};

/**
 * Delete a message
 */
export const deleteMessage = async (
  messageId: string,
  userId: string,
  deleteForEveryone: boolean = false
): Promise<void> => {
  if (deleteForEveryone) {
    await query(
      `UPDATE messages 
       SET is_deleted = true, deleted_for_everyone = true, updated_at = NOW()
       WHERE id = $1 AND sender_id = $2`,
      [messageId, userId]
    );
  } else {
    // Soft delete for sender only (would need a separate table for per-user deletions)
    await query(
      `UPDATE messages 
       SET is_deleted = true, updated_at = NOW()
       WHERE id = $1 AND sender_id = $2`,
      [messageId, userId]
    );
  }
};

/**
 * Pin/unpin a message
 */
export const togglePinMessage = async (
  messageId: string,
  groupId: string,
  userId: string,
  isPinned: boolean
): Promise<void> => {
  // Check if user is group admin
  const memberResult = await query(
    `SELECT role FROM group_members 
     WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );

  if (memberResult.rows.length === 0) {
    throw new Error('User is not a member of this group');
  }

  await query(
    `UPDATE messages 
     SET is_pinned = $1, updated_at = NOW()
     WHERE id = $2 AND group_id = $3`,
    [isPinned, messageId, groupId]
  );
};

/**
 * Star/unstar a message
 */
export const toggleStarMessage = async (
  messageId: string,
  userId: string,
  isStarred: boolean
): Promise<void> => {
  await query(
    `UPDATE messages 
     SET is_starred = $1, updated_at = NOW()
     WHERE id = $2 AND sender_id = $3`,
    [isStarred, messageId, userId]
  );
};

/**
 * Search messages
 */
export const searchMessages = async (
  userId: string,
  query: string,
  receiverId: string | null = null,
  groupId: string | null = null,
  limit: number = 50
): Promise<Message[]> => {
  let queryText = '';
  let params: any[] = [];

  const searchTerm = `%${query}%`;

  if (receiverId) {
    queryText = `
      SELECT m.*
      FROM messages m
      WHERE (
        (m.sender_id = $1 AND m.receiver_id = $2) OR
        (m.sender_id = $2 AND m.receiver_id = $1)
      )
      AND m.is_deleted = false
      AND m.content ILIKE $3
      ORDER BY m.created_at DESC
      LIMIT $4
    `;
    params = [userId, receiverId, searchTerm, limit];
  } else if (groupId) {
    queryText = `
      SELECT m.*
      FROM messages m
      INNER JOIN group_members gm ON m.group_id = gm.group_id
      WHERE m.group_id = $1
      AND gm.user_id = $2
      AND m.is_deleted = false
      AND m.content ILIKE $3
      AND (
        m.visibility_mode = 'shared_to_group' OR
        (m.visibility_mode = 'org_only' AND m.sender_organization_id = gm.organization_id)
      )
      ORDER BY m.created_at DESC
      LIMIT $4
    `;
    params = [groupId, userId, searchTerm, limit];
  } else {
    // Global search
    queryText = `
      SELECT DISTINCT m.*
      FROM messages m
      LEFT JOIN group_members gm ON m.group_id = gm.group_id
      WHERE (
        (m.receiver_id = $1 AND m.is_deleted = false) OR
        (m.group_id IS NOT NULL AND gm.user_id = $1 AND m.is_deleted = false AND
         (m.visibility_mode = 'shared_to_group' OR 
          (m.visibility_mode = 'org_only' AND m.sender_organization_id = gm.organization_id)))
      )
      AND m.content ILIKE $2
      ORDER BY m.created_at DESC
      LIMIT $3
    `;
    params = [userId, searchTerm, limit];
  }

  const result = await query(queryText, params);

  return result.rows.map((row) => ({
    ...row,
    mentions: typeof row.mentions === 'string' ? JSON.parse(row.mentions) : row.mentions,
    taskMentions: typeof row.task_mentions === 'string' ? JSON.parse(row.task_mentions) : row.task_mentions,
  })) as Message[];
};

