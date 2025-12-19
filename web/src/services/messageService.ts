import api from './api';
import { Message, MessageType, MessageVisibilityMode } from '../../../shared/src/types';

export interface SendMessageRequest {
  receiverId?: string;
  groupId?: string;
  messageType: MessageType;
  content?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  visibilityMode?: MessageVisibilityMode;
  replyToMessageId?: string;
  forwardedFromMessageId?: string;
  mentions?: string[];
  taskMentions?: string[];
}

export const messageService = {
  sendMessage: async (data: SendMessageRequest) => {
    const response = await api.post('/messages/send', data);
    return response.data;
  },

  getMessages: async (receiverId?: string, groupId?: string, limit = 50, before?: string) => {
    const params = new URLSearchParams();
    if (receiverId) params.append('receiverId', receiverId);
    if (groupId) params.append('groupId', groupId);
    params.append('limit', limit.toString());
    if (before) params.append('before', before);

    const response = await api.get(`/messages?${params.toString()}`);
    return response.data;
  },

  markAsRead: async (receiverId?: string, groupId?: string) => {
    const response = await api.post('/messages/mark-read', { receiverId, groupId });
    return response.data;
  },

  editMessage: async (messageId: string, content: string) => {
    const response = await api.put(`/messages/${messageId}/edit`, { content });
    return response.data;
  },

  deleteMessage: async (messageId: string, deleteForEveryone = false) => {
    const response = await api.delete(`/messages/${messageId}`, {
      data: { deleteForEveryone },
    });
    return response.data;
  },

  pinMessage: async (messageId: string, groupId: string, isPinned: boolean) => {
    const response = await api.post(`/messages/${messageId}/pin`, { groupId, isPinned });
    return response.data;
  },

  starMessage: async (messageId: string, isStarred: boolean) => {
    const response = await api.post(`/messages/${messageId}/star`, { isStarred });
    return response.data;
  },

  searchMessages: async (query: string, receiverId?: string, groupId?: string, limit = 50) => {
    const params = new URLSearchParams({ q: query, limit: limit.toString() });
    if (receiverId) params.append('receiverId', receiverId);
    if (groupId) params.append('groupId', groupId);

    const response = await api.get(`/messages/search?${params.toString()}`);
    return response.data;
  },
};

