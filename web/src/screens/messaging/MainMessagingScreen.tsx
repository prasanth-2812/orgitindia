import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { BottomNav, Avatar } from '../../components/shared';
import { conversationService, Conversation } from '../../services/conversationService';
import { waitForSocketConnection, onSocketEvent, offSocketEvent } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';

type FilterType = 'All' | 'Direct' | 'Task Groups';

export const MainMessagingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const socketRef = useRef<any>(null);

  // Fetch conversations
  const { data: conversations = [], isLoading, refetch } = useQuery(
    'conversations',
    () => conversationService.getConversations(),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Filter conversations based on filter type
  const filteredConversations = React.useMemo(() => {
    let filtered = conversations;

    // Apply type filter
    if (filter === 'Direct') {
      filtered = filtered.filter(conv => conv.type === 'direct' || !conv.is_group);
    } else if (filter === 'Task Groups') {
      filtered = filtered.filter(conv => conv.isTaskGroup || conv.is_task_group);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => {
        const nameMatch = conv.name?.toLowerCase().includes(query);
        const lastMessageMatch = conv.lastMessage?.content?.toLowerCase().includes(query);
        const memberMatch = conv.otherMembers?.some(member => 
          member.name?.toLowerCase().includes(query)
        );
        return nameMatch || lastMessageMatch || memberMatch;
      });
    }

    // Sort: pinned first, then by last message time
    return filtered.sort((a, b) => {
      const aPinned = a.isPinned || a.is_pinned || false;
      const bPinned = b.isPinned || b.is_pinned || false;
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      
      const aTime = new Date(a.lastMessageTime || a.last_message_time || 0).getTime();
      const bTime = new Date(b.lastMessageTime || b.last_message_time || 0).getTime();
      return bTime - aTime;
    });
  }, [conversations, filter, searchQuery]);

  // Setup socket listeners for real-time updates
  useEffect(() => {
    let isMounted = true;

    const setupSocket = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const socket = await waitForSocketConnection();
        if (!isMounted) return;

        // Handle new messages - update conversation list
        const handleNewMessage = (message: any) => {
          if (!message.conversation_id) return;

          // Invalidate conversations query to refetch
          queryClient.invalidateQueries('conversations');
        };

        // Handle message status updates
        const handleMessageStatusUpdate = (update: any) => {
          if (update.conversationId) {
            queryClient.invalidateQueries('conversations');
          }
        };

        // Handle conversation messages read
        const handleConversationMessagesRead = (data: any) => {
          if (data.conversationId) {
            queryClient.invalidateQueries('conversations');
          }
        };

        onSocketEvent('new_message', handleNewMessage);
        onSocketEvent('message_status_update', handleMessageStatusUpdate);
        onSocketEvent('conversation_messages_read', handleConversationMessagesRead);

        socketRef.current = socket;

        return () => {
          offSocketEvent('new_message', handleNewMessage);
          offSocketEvent('message_status_update', handleMessageStatusUpdate);
          offSocketEvent('conversation_messages_read', handleConversationMessagesRead);
        };
      } catch (error) {
        console.error('Socket setup error:', error);
      }
    };

    setupSocket();

    return () => {
      isMounted = false;
    };
  }, [queryClient]);

  // Format time for display
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return format(date, 'h:mm a');
      } else if (diffInHours < 48) {
        return 'Yesterday';
      } else if (diffInHours < 168) { // 7 days
        return format(date, 'EEE');
      } else {
        return format(date, 'MMM d');
      }
    } catch {
      return '';
    }
  };

  // Get conversation display name
  const getConversationName = (conv: Conversation) => {
    if (conv.name) return conv.name;
    if (conv.otherMembers && conv.otherMembers.length > 0) {
      return conv.otherMembers[0].name || 'Unknown';
    }
    return 'Unknown';
  };

  // Get conversation photo
  const getConversationPhoto = (conv: Conversation) => {
    return conv.photoUrl || conv.group_photo || conv.otherMembers?.[0]?.profile_photo_url || '';
  };

  // Get last message preview
  const getLastMessagePreview = (conv: Conversation) => {
    const lastMsg = conv.lastMessage || conv.last_message;
    if (!lastMsg) return 'No messages yet';
    
    const content = lastMsg.content || '';
    const senderName = lastMsg.senderName || lastMsg.sender_name || '';
    const currentUserId = user?.id || user?.userId;
    const isFromMe = (lastMsg.senderId || lastMsg.sender_id) === currentUserId;
    
    if (conv.type === 'group' || conv.is_group) {
      return `${isFromMe ? 'You' : senderName}: ${content}`;
    }
    return content;
  };

  // Get conversation ID for navigation
  const getConversationId = (conv: Conversation) => {
    return conv.conversationId || conv.id || '';
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden pb-24 bg-background-light dark:bg-background-dark font-display antialiased transition-colors duration-200">
      {/* Header */}
      <div className="sticky top-0 z-10 flex flex-col gap-2 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 pt-4 pb-2">
        <div className="flex items-center h-12 justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar src={user?.profilePhotoUrl} size="md" />
            </div>
          </div>
          <div className="flex items-center justify-end">
            <button
              onClick={() => navigate('/messages/new')}
              className="flex items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>
                edit_square
              </span>
            </button>
          </div>
        </div>
        <div className="flex justify-between items-end">
          <p className="text-text-main-light dark:text-text-main-dark tracking-tight text-[28px] font-bold leading-tight">
            Messages
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="flex w-full items-stretch rounded-xl h-12 shadow-sm bg-surface-light dark:bg-surface-dark transition-colors">
          <div className="flex items-center justify-center pl-4 text-text-sub-light dark:text-text-sub-dark">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              search
            </span>
          </div>
          <input
            className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl bg-transparent text-text-main-light dark:text-text-main-dark focus:outline-0 focus:ring-2 focus:ring-primary/50 border-none h-full placeholder:text-text-sub-light/70 dark:placeholder:text-text-sub-dark/70 px-3 text-base font-normal leading-normal"
            placeholder="Search chats or tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2">
        <div className="flex h-10 w-full items-center justify-center rounded-lg bg-surface-light dark:bg-surface-dark p-1 shadow-sm">
          {(['All', 'Direct', 'Task Groups'] as FilterType[]).map((filterType) => (
            <label key={filterType} className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 transition-all duration-200 ${filter === filterType ? 'bg-primary shadow-sm text-white' : 'hover:bg-background-light dark:hover:bg-background-dark/50 text-text-sub-light dark:text-text-sub-dark'
              }`}>
              <input
                checked={filter === filterType}
                onChange={() => setFilter(filterType)}
                className="hidden"
                name="filter-group"
                type="radio"
              />
              <span className="truncate text-sm font-medium">
                {filterType}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col mt-2 gap-1">
        {/* Conversations List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-400 text-sm">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-400 text-sm">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 mt-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-text-sub-light dark:text-text-sub-dark text-sm">
                {filter === 'Direct' ? 'person' : filter === 'Task Groups' ? 'assignment' : 'chat_bubble'}
              </span>
              <p className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
                {filter === 'Direct' ? 'Direct Messages' : filter === 'Task Groups' ? 'Task Groups' : 'All Conversations'}
              </p>
            </div>

            {filteredConversations.map((conv) => {
              const convId = getConversationId(conv);
              const convName = getConversationName(conv);
              const convPhoto = getConversationPhoto(conv);
              const lastMessage = getLastMessagePreview(conv);
              const unreadCount = conv.unreadCount || conv.unread_count || 0;
              const isPinned = conv.isPinned || conv.is_pinned || false;
              const lastMessageTime = conv.lastMessageTime || conv.last_message_time;
              const timeDisplay = formatTime(lastMessageTime);

              return (
                <div
                  key={convId}
                  className={`group flex items-center gap-4 ${isPinned ? 'bg-surface-light dark:bg-surface-dark border-l-4 border-primary' : 'bg-background-light dark:bg-background-dark'} px-4 py-3 active:bg-primary/5 transition-colors cursor-pointer`}
                  onClick={() => navigate(`/messages/${convId}`)}
                >
                <div className="relative shrink-0">
                    {conv.type === 'group' || conv.is_group ? (
                      <div className="bg-primary/10 flex items-center justify-center aspect-square rounded-xl size-14 shadow-sm">
                        {convPhoto ? (
                          <img src={convPhoto} alt={convName} className="w-full h-full rounded-xl object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-primary text-[28px]">groups</span>
                        )}
                      </div>
                    ) : (
                      <Avatar src={convPhoto} alt={convName} size="md" />
                    )}
                    {isPinned && (
                      <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full p-0.5">
                        <span className="material-symbols-outlined text-[12px]">push_pin</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                      <p className="text-text-main-light dark:text-text-main-dark text-base font-semibold leading-normal truncate">
                        {convName}
                      </p>
                      {timeDisplay && (
                        <p className="text-text-sub-light dark:text-text-sub-dark text-xs font-normal shrink-0 ml-2">
                          {timeDisplay}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-text-sub-light dark:text-text-sub-dark">
                      <p className="text-sm font-normal leading-normal truncate">{lastMessage}</p>
                  </div>
                  </div>
                  {unreadCount > 0 && (
                  <div className="shrink-0 flex flex-col items-end justify-center gap-1">
                      <div className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-bold">
                        {unreadCount > 99 ? '99+' : unreadCount}
              </div>
              </div>
            )}
                </div>
              );
            })}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
