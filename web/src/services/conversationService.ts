import api from './api';

export interface Conversation {
  conversationId: string; // UUID or "direct_<userId>"
  id?: string; // Alias for conversationId
  type?: 'direct' | 'group';
  is_group?: boolean;
  name: string;
  photoUrl?: string;
  group_photo?: string;
  isPinned?: boolean;
  is_pinned?: boolean;
  unreadCount?: number;
  unread_count?: number;
  lastMessage?: {
    id: string;
    content: string;
    messageType?: string;
    message_type?: string;
    senderId?: string;
    sender_id?: string;
    senderName?: string;
    sender_name?: string;
    createdAt?: string;
    created_at?: string;
  };
  last_message?: any;
  lastMessageTime?: string;
  last_message_time?: string;
  otherMembers?: Array<{ id: string; name: string; profile_photo_url?: string; profile_photo?: string; phone?: string }>;
  other_members?: Array<{ id: string; name: string; profile_photo_url?: string; profile_photo?: string; phone?: string }>;
  isTaskGroup?: boolean;
  is_task_group?: boolean;
  role?: string;
  createdAt?: string;
  created_at?: string;
}

export interface ConversationResponse {
  conversations: Conversation[];
}

export interface CreateConversationRequest {
  otherUserId: string;
}

export interface CreateConversationResponse {
  conversationId: string;
}

export interface ConversationDetailsResponse {
  conversation: Conversation;
}

export interface PinConversationRequest {
  is_pinned: boolean;
}

export interface CreateGroupRequest {
  name: string;
  memberIds: string[];
  group_photo?: string;
}

export interface CreateGroupResponse {
  conversationId: string;
}

export interface AddGroupMembersRequest {
  memberIds: string[];
}

export interface UpdateGroupRequest {
  name?: string;
  group_photo?: string;
}

export interface User {
  id: string;
  name: string;
  mobile?: string;
  phone?: string;
  profile_photo_url?: string;
  profile_photo?: string;
}

export interface UsersListResponse {
  users: User[];
}

export const conversationService = {
  /**
   * Get all conversations for the current user
   */
  getConversations: async (): Promise<Conversation[]> => {
    const response = await api.get<ConversationResponse>('/conversations');
    // Normalize the response to match our Conversation interface
    return (response.data.conversations || response.data as any).map((conv: any) => ({
      conversationId: conv.id || conv.conversationId,
      id: conv.id || conv.conversationId,
      type: conv.is_group ? 'group' : 'direct',
      is_group: conv.is_group,
      name: conv.name || '',
      photoUrl: conv.group_photo || conv.photoUrl,
      group_photo: conv.group_photo || conv.photoUrl,
      isPinned: conv.is_pinned ?? conv.isPinned ?? false,
      is_pinned: conv.is_pinned ?? conv.isPinned ?? false,
      unreadCount: conv.unread_count ?? conv.unreadCount ?? 0,
      unread_count: conv.unread_count ?? conv.unreadCount ?? 0,
      lastMessage: conv.last_message ? {
        id: conv.last_message.id || '',
        content: conv.last_message.content || '',
        messageType: conv.last_message.message_type || conv.last_message.messageType || 'text',
        message_type: conv.last_message.message_type || conv.last_message.messageType || 'text',
        senderId: conv.last_message.sender_id || conv.last_message.senderId || '',
        sender_id: conv.last_message.sender_id || conv.last_message.senderId || '',
        senderName: conv.last_message.sender_name || conv.last_message.senderName || '',
        sender_name: conv.last_message.sender_name || conv.last_message.senderName || '',
        createdAt: conv.last_message.created_at || conv.last_message.createdAt || '',
        created_at: conv.last_message.created_at || conv.last_message.createdAt || '',
      } : undefined,
      last_message: conv.last_message,
      lastMessageTime: conv.last_message_time || conv.lastMessageTime || conv.created_at || conv.createdAt,
      last_message_time: conv.last_message_time || conv.lastMessageTime || conv.created_at || conv.createdAt,
      otherMembers: conv.other_members || conv.otherMembers || [],
      other_members: conv.other_members || conv.otherMembers || [],
      isTaskGroup: conv.is_task_group ?? conv.isTaskGroup ?? false,
      is_task_group: conv.is_task_group ?? conv.isTaskGroup ?? false,
      role: conv.role,
      createdAt: conv.created_at || conv.createdAt,
      created_at: conv.created_at || conv.createdAt,
    }));
  },

  /**
   * Create a direct conversation with another user
   */
  createConversation: async (otherUserId: string): Promise<string> => {
    const response = await api.post<CreateConversationResponse>('/conversations/create', {
      otherUserId,
    });
    return response.data.conversationId;
  },

  /**
   * Get conversation details by conversationId
   */
  getConversationDetails: async (conversationId: string): Promise<Conversation> => {
    const response = await api.get<ConversationDetailsResponse>(`/conversations/${conversationId}`);
    const conv = response.data.conversation || response.data as any;
    return {
      conversationId: conv.id || conv.conversationId || conversationId,
      id: conv.id || conv.conversationId || conversationId,
      type: conv.is_group ? 'group' : 'direct',
      is_group: conv.is_group,
      name: conv.name || '',
      photoUrl: conv.group_photo || conv.photoUrl,
      group_photo: conv.group_photo || conv.photoUrl,
      isPinned: conv.is_pinned ?? conv.isPinned ?? false,
      is_pinned: conv.is_pinned ?? conv.isPinned ?? false,
      unreadCount: conv.unread_count ?? conv.unreadCount ?? 0,
      unread_count: conv.unread_count ?? conv.unreadCount ?? 0,
      lastMessage: conv.last_message,
      last_message: conv.last_message,
      lastMessageTime: conv.last_message_time || conv.lastMessageTime,
      last_message_time: conv.last_message_time || conv.lastMessageTime,
      otherMembers: conv.other_members || conv.otherMembers || [],
      other_members: conv.other_members || conv.otherMembers || [],
      isTaskGroup: conv.is_task_group ?? conv.isTaskGroup ?? false,
      is_task_group: conv.is_task_group ?? conv.isTaskGroup ?? false,
      role: conv.role,
      createdAt: conv.created_at || conv.createdAt,
      created_at: conv.created_at || conv.createdAt,
    };
  },

  /**
   * Get all users (for creating new conversations)
   */
  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get<UsersListResponse>('/conversations/users/list');
    return response.data.users || [];
  },

  /**
   * Pin or unpin a conversation
   */
  pinConversation: async (conversationId: string, isPinned: boolean): Promise<any> => {
    const response = await api.put(`/conversations/${conversationId}/pin`, {
      is_pinned: isPinned,
    });
    return response.data;
  },

  /**
   * Create a group conversation
   */
  createGroup: async (name: string, memberIds: string[], groupPhoto?: string): Promise<string> => {
    const response = await api.post<CreateGroupResponse>('/conversations/groups/create', {
      name,
      memberIds,
      group_photo: groupPhoto,
    });
    return response.data.conversationId;
  },

  /**
   * Add members to a group conversation
   */
  addGroupMembers: async (conversationId: string, memberIds: string[]): Promise<any> => {
    const response = await api.post(`/conversations/groups/${conversationId}/members`, {
      memberIds,
    });
    return response.data;
  },

  /**
   * Remove a member from a group conversation
   */
  removeGroupMember: async (conversationId: string, memberId: string): Promise<any> => {
    const response = await api.delete(`/conversations/groups/${conversationId}/members/${memberId}`);
    return response.data;
  },

  /**
   * Update group conversation details
   */
  updateGroup: async (conversationId: string, name?: string, groupPhoto?: string): Promise<any> => {
    const response = await api.put(`/conversations/groups/${conversationId}`, {
      name,
      group_photo: groupPhoto,
    });
    return response.data;
  },
};

