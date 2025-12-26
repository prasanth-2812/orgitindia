import api from './api';

export const getMessages = async (conversationId, limit = 50, offset = 0) => {
  const response = await api.get(`/api/messages/${conversationId}`, {
    params: { limit, offset },
  });
  // Backend returns: { messages: [...] } (no success field)
  if (response.data && response.data.messages) {
    return response.data.messages;
  }
  // Fallback for old format
  if (response.data && response.data.success && response.data.messages) {
    return response.data.messages;
  }
  // Another fallback
  if (response.data && response.data.data) {
    return response.data.data;
  }
  return [];
};

export const markMessagesAsRead = async (conversationId) => {
  const response = await api.put(`/api/messages/${conversationId}/read`);
  return response.data;
};

export const searchMessages = async (query, conversationId = null, limit = 50) => {
  const url = conversationId 
    ? `/api/messages/search/${conversationId}`
    : '/api/messages/search';
  const response = await api.get(url, {
    params: { q: query, limit }, // Backend expects 'q' not 'query'
  });
  // Backend returns: { success: true, messages: [...] } or { success: true, data: [...] }
  return response.data.success ? (response.data.messages || response.data.data || []) : [];
};

export const addReaction = async (messageId, reaction) => {
  const response = await api.post(`/api/messages/${messageId}/reactions`, { reaction });
  return response.data;
};

export const removeReaction = async (messageId, reaction) => {
  const response = await api.delete(`/api/messages/${messageId}/reactions/${reaction}`);
  return response.data;
};

export const starMessage = async (messageId) => {
  const response = await api.post(`/api/messages/${messageId}/star`);
  return response.data;
};

export const unstarMessage = async (messageId) => {
  const response = await api.delete(`/api/messages/${messageId}/star`);
  return response.data;
};

export const getStarredMessages = async () => {
  const response = await api.get('/api/messages/starred/all');
  // Backend returns: { success: true, messages: [...] }
  return response.data.success ? response.data.messages : [];
};

export const editMessage = async (messageId, content) => {
  const response = await api.put(`/api/messages/${messageId}`, { content });
  return response.data;
};

export const deleteMessage = async (messageId, deleteForAll = false) => {
  const response = await api.delete(`/api/messages/${messageId}`, {
    data: { deleteForAll },
  });
  return response.data;
};

