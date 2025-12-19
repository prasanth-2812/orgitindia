import { Request, Response } from 'express';
import { createMessage, getMessages, editMessage, deleteMessage, togglePinMessage, toggleStarMessage, searchMessages, markMessagesAsRead, updateMessageStatus } from '../services/messageService';
import { query } from '../config/database';

/**
 * Send a message
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const organizationId = (req as any).user?.organizationId;

    if (!userId || !organizationId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

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
    } = req.body;

    if (!receiverId && !groupId) {
      return res.status(400).json({
        success: false,
        error: 'Either receiverId or groupId must be provided',
      });
    }

    // Validate visibility mode for group messages
    if (groupId && !['org_only', 'shared_to_group'].includes(visibilityMode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid visibility mode',
      });
    }

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

    res.json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send message',
    });
  }
};

/**
 * Get messages for a chat
 */
export const getChatMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { receiverId, groupId } = req.query;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string | null;

    if (!receiverId && !groupId) {
      return res.status(400).json({
        success: false,
        error: 'Either receiverId or groupId must be provided',
      });
    }

    const messages = await getMessages(
      userId,
      (receiverId as string) || null,
      (groupId as string) || null,
      limit,
      before
    );

    res.json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get messages',
    });
  }
};

/**
 * Mark messages as read
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { receiverId, groupId } = req.body;

    if (!receiverId && !groupId) {
      return res.status(400).json({
        success: false,
        error: 'Either receiverId or groupId must be provided',
      });
    }

    await markMessagesAsRead(
      userId,
      receiverId || null,
      groupId || null
    );

    res.json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark messages as read',
    });
  }
};

/**
 * Edit a message
 */
export const editMessageHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
      });
    }

    const message = await editMessage(messageId, userId, content);

    res.json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    console.error('Edit message error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to edit message',
    });
  }
};

/**
 * Delete a message
 */
export const deleteMessageHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body;

    await deleteMessage(messageId, userId, deleteForEveryone || false);

    res.json({
      success: true,
      message: 'Message deleted',
    });
  } catch (error: any) {
    console.error('Delete message error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to delete message',
    });
  }
};

/**
 * Pin/unpin a message
 */
export const togglePin = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { messageId } = req.params;
    const { groupId, isPinned } = req.body;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: 'groupId is required',
      });
    }

    await togglePinMessage(messageId, groupId, userId, isPinned);

    res.json({
      success: true,
      message: `Message ${isPinned ? 'pinned' : 'unpinned'}`,
    });
  } catch (error: any) {
    console.error('Toggle pin error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to toggle pin',
    });
  }
};

/**
 * Star/unstar a message
 */
export const toggleStar = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { messageId } = req.params;
    const { isStarred } = req.body;

    await toggleStarMessage(messageId, userId, isStarred);

    res.json({
      success: true,
      message: `Message ${isStarred ? 'starred' : 'unstarred'}`,
    });
  } catch (error: any) {
    console.error('Toggle star error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to toggle star',
    });
  }
};

/**
 * Search messages
 */
export const searchMessagesHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { q, receiverId, groupId } = req.query;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    const messages = await searchMessages(
      userId,
      q as string,
      (receiverId as string) || null,
      (groupId as string) || null,
      limit
    );

    res.json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    console.error('Search messages error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search messages',
    });
  }
};

