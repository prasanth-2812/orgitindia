import api from './api';

export const getConversations = async () => {
  const response = await api.get('/api/conversations');
  return response.data.conversations;
};

export const createConversation = async (otherUserId) => {
  const response = await api.post('/api/conversations/create', {
    otherUserId,
  });
  return response.data.conversationId;
};

export const getConversationDetails = async (conversationId) => {
  const response = await api.get(`/api/conversations/${conversationId}`);
  return response.data;
};

export const getAllUsers = async () => {
  const response = await api.get('/api/conversations/users/list');
  return response.data.users;
};

export const pinConversation = async (conversationId, isPinned) => {
  const response = await api.put(`/api/conversations/${conversationId}/pin`, {
    is_pinned: isPinned,
  });
  return response.data;
};

export const createGroup = async (name, memberIds, groupPhoto = null) => {
  const response = await api.post('/api/conversations/groups/create', {
    name,
    memberIds,
    group_photo: groupPhoto,
  });
  return response.data.conversationId;
};

export const addGroupMembers = async (conversationId, memberIds) => {
  const response = await api.post(`/api/conversations/groups/${conversationId}/members`, {
    memberIds,
  });
  return response.data;
};

export const removeGroupMember = async (conversationId, memberId) => {
  const response = await api.delete(`/api/conversations/groups/${conversationId}/members/${memberId}`);
  return response.data;
};

export const updateGroup = async (conversationId, name, groupPhoto) => {
  const response = await api.put(`/api/conversations/groups/${conversationId}`, {
    name,
    group_photo: groupPhoto,
  });
  return response.data;
};

