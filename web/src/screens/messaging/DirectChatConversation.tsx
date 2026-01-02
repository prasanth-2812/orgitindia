import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { format } from 'date-fns';
import { messageService } from '../../services/messageService';
import { conversationService } from '../../services/conversationService';
import { waitForSocketConnection, joinConversationRoom, leaveConversationRoom, onSocketEvent, offSocketEvent, sendMessageViaSocket, getSocket } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import { BottomNav } from '../../components/shared';
import { ReplyMessage } from '../../components/messaging/ReplyMessage';
import { MessageReactions } from '../../components/messaging/MessageReactions';
import { MessageActionSheet } from '../../components/messaging/MessageActionSheet';
import { EmojiPicker } from '../../components/messaging/EmojiPicker';
import { ImageMessage } from '../../components/messaging/ImageMessage';
import { VideoMessage } from '../../components/messaging/VideoMessage';
import { DocumentMessage } from '../../components/messaging/DocumentMessage';
import { LocationMessage } from '../../components/messaging/LocationMessage';
import { VoiceMessage } from '../../components/messaging/VoiceMessage';
import { MediaUpload } from '../../components/messaging/MediaUpload';
import { VoiceRecorder } from '../../components/messaging/VoiceRecorder';
import { LocationPicker } from '../../components/messaging/LocationPicker';

export const DirectChatConversation: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  
  // Mobile ChatScreen features state
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch conversation details
  const { data: conversationData } = useQuery(
    ['conversation', conversationId],
    () => conversationService.getConversationDetails(conversationId!),
    { 
      enabled: !!conversationId,
      onSuccess: (data) => {
        // Extract otherUserId for direct conversations
        const otherMembers = data.otherMembers || data.other_members || [];
        if (!data.is_group && !data.is_task_group && otherMembers.length > 0) {
          setOtherUserId(otherMembers[0].id);
        }
      }
    }
  );

  // Normalize message function (matching mobile)
  const normalizeMessage = (msg: any) => {
    if (!msg) return null;
    
    return {
      id: msg.id,
      conversation_id: msg.conversation_id || msg.conversationId,
      sender_id: msg.sender_id || msg.senderId,
      receiver_id: msg.receiver_id || msg.receiverId,
      group_id: msg.group_id || msg.groupId,
      message_type: msg.message_type || msg.messageType || 'text',
      content: msg.content,
      media_url: msg.media_url || msg.mediaUrl,
      media_thumbnail: msg.media_thumbnail || msg.mediaThumbnail,
      file_name: msg.file_name || msg.fileName,
      file_size: msg.file_size || msg.fileSize,
      mime_type: msg.mime_type || msg.mimeType,
      duration: msg.duration,
      sender_name: msg.sender_name || msg.senderName,
      sender_photo: msg.sender_photo || msg.senderPhoto,
      reply_to_message_id: msg.reply_to_message_id || msg.replyToMessageId,
      reply_to: msg.reply_to || msg.replyTo,
      edited_at: msg.edited_at || msg.editedAt,
      deleted_at: msg.deleted_at || msg.deletedAt,
      deleted_for_all: msg.deleted_for_all || msg.deletedForEveryone || false,
      status: msg.status || 'sent',
      reactions: msg.reactions || [],
      starred: msg.starred || false,
      created_at: msg.created_at || msg.createdAt,
      updated_at: msg.updated_at || msg.updatedAt,
    };
  };

  // Load messages function (matching mobile implementation exactly)
  const loadMessages = async () => {
    if (!conversationId) return;
    
    try {
      setLoading(true);
      const data = await messageService.getMessagesByConversationId(conversationId, 50, 0);
      console.log('Loaded messages from API:', data.length);
      
      // Normalize messages to ensure consistent field names
      const normalizedMessages = data.map((msg: any) => normalizeMessage(msg)).filter((msg: any) => msg !== null);
      
      // Remove any temp messages when loading from API (they should have been replaced by real messages)
      const currentUserId = user?.id || user?.userId;
      const messagesWithoutTemp = normalizedMessages.filter((msg: any) => {
        // Keep real messages and temp messages from other users (shouldn't happen, but safety check)
        if (!msg.id?.startsWith('temp_')) return true;
        // Remove temp messages from current user - they should have real messages now
        if (msg.sender_id === currentUserId || msg.senderId === currentUserId) {
          console.log('[loadMessages] Removing temp message from loaded data:', msg.id);
          return false;
        }
        return true;
      });
      
      // Sort messages by created_at to ensure correct chronological order
      messagesWithoutTemp.sort((a: any, b: any) => {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return timeA - timeB;
      });
      
      console.log('Normalized and sorted messages:', messagesWithoutTemp.length);
      setMessages(messagesWithoutTemp);
      setHasMoreMessages(data.length >= 50);
      
      // Calculate unread count (messages from other users that are not read)
      const unread = messagesWithoutTemp.filter(
        (msg: any) => {
          const msgSenderId = msg.sender_id || msg.senderId;
          return msgSenderId !== currentUserId && msg.status !== 'read' && !msg.deleted_at;
        }
      ).length;
      setUnreadCount(unread);
      
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load messages when conversationId changes
  useEffect(() => {
    if (conversationId) {
      loadMessages();
    }
  }, [conversationId]);

  // Check online status function (matching mobile)
  const checkOnlineStatus = async (userId?: string) => {
    const targetUserId = userId || otherUserId;
    const isGroup = conversationData?.type === 'group' || conversationData?.is_group;
    const isTaskGroup = conversationData?.isTaskGroup || conversationData?.is_task_group;
    if (!targetUserId || isGroup || isTaskGroup) return;
    
    try {
      const socket = await waitForSocketConnection();
      let statusReceived = false;
      let timeoutId: NodeJS.Timeout | null = null;
      
      const statusListener = (data: any) => {
        if (data.userId === targetUserId && !statusReceived) {
          statusReceived = true;
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          setIsOnline(data.isOnline === true);
          socket.off('user_online_status', statusListener);
        }
      };
      
      socket.on('user_online_status', statusListener);
      
      socket.emit('check_user_online', { userId: targetUserId }, (isOnline: boolean) => {
        if (!statusReceived && isOnline !== undefined && isOnline !== null) {
          statusReceived = true;
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          setIsOnline(isOnline === true);
          socket.off('user_online_status', statusListener);
        }
      });
      
      timeoutId = setTimeout(() => {
        if (!statusReceived) {
          setIsOnline(false);
          socket.off('user_online_status', statusListener);
        }
      }, 3000);
    } catch (error) {
      console.error('Check online status error:', error);
      setIsOnline(false);
    }
  };

  // Mark messages as read
  const markAsReadMutation = useMutation(
    () => messageService.markMessagesAsReadByConversationId(conversationId!),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['conversations']);
        setUnreadCount(0);
      }
    }
  );

  // Send message mutation (for HTTP fallback, but we primarily use socket)
  const sendMessageMutation = useMutation(
    (data: { content: string; replyToMessageId?: string }) => messageService.sendMessage({
      conversationId: conversationId!,
      messageType: 'text',
      content: data.content,
      replyToMessageId: data.replyToMessageId,
    }),
    {
      onSuccess: () => {
        // Messages will be received via socket, no need to refetch
        queryClient.invalidateQueries(['conversations']);
      }
    }
  );

  // Setup socket and join conversation room
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !conversationId) return;

    let isMounted = true;
    let onlineCheckInterval: NodeJS.Timeout | null = null;

    const setupSocket = async () => {
      try {
        const socket = await waitForSocketConnection();
        if (!isMounted) return;

        // Join conversation room
        await joinConversationRoom(conversationId);

        // Set up message listeners
        const handleNewMessage = (newMsg: any) => {
          console.log('[handleNewMessage] Received new_message event:', {
            conversationId: newMsg.conversation_id,
            messageId: newMsg.id,
            senderId: newMsg.sender_id || newMsg.senderId,
            currentConversationId: conversationId,
            matches: newMsg.conversation_id === conversationId
          });
          
          if (newMsg.conversation_id !== conversationId) {
            console.log('[handleNewMessage] Skipping - conversation ID mismatch');
            return;
          }
          
          const currentUserId = user?.id || user?.userId;
          const isMyMessage = newMsg.sender_id === currentUserId || newMsg.senderId === currentUserId;
          
          console.log('[handleNewMessage] Processing message:', {
            messageId: newMsg.id,
            isMyMessage,
            currentUserId
          });
          
          const normalizedMessage = normalizeMessage(newMsg);
          if (!normalizedMessage) {
            console.log('[handleNewMessage] Failed to normalize message');
            return;
          }

          setMessages((prev) => {
            // Check if message already exists by ID (real message from database)
            const existingIndex = prev.findIndex(msg => msg.id === normalizedMessage.id);
            if (existingIndex !== -1) {
              // Update existing message
              const updated = [...prev];
              updated[existingIndex] = normalizedMessage;
              return updated.sort((a, b) => {
                const timeA = new Date(a.created_at || 0).getTime();
                const timeB = new Date(b.created_at || 0).getTime();
                return timeA - timeB;
              });
            }
            
            // Check for temp message replacement (optimistic message should be replaced)
            const currentUserId = user?.id || user?.userId;
            const isMyMessage = normalizedMessage.sender_id === currentUserId || normalizedMessage.senderId === currentUserId;
            
            if (isMyMessage) {
              // For our own messages, ALWAYS remove ALL temp messages from this user and add real message
              // This prevents duplicates - we never want both temp and real messages for our own messages
              const allTempMessagesFromUser = prev.filter(msg => {
                if (!msg.id?.startsWith('temp_')) return false;
                return (msg.sender_id === currentUserId || msg.senderId === currentUserId);
              });
              
              // Remove all temp messages from this user and the real message if it already exists
              const tempIds = allTempMessagesFromUser.map(m => m.id);
              const updated = prev
                .filter(msg => !tempIds.includes(msg.id))
                .filter(msg => msg.id !== normalizedMessage.id);
              
              // Always add the real message
              updated.push(normalizedMessage);
              
              console.log('[handleNewMessage] ✅ Replaced temp messages for own message:', {
                tempIds,
                realMessageId: normalizedMessage.id,
                content: normalizedMessage.content?.substring(0, 50),
                beforeCount: prev.length,
                afterCount: updated.length
              });
              
              return updated.sort((a, b) => {
                const timeA = new Date(a.created_at || 0).getTime();
                const timeB = new Date(b.created_at || 0).getTime();
                return timeA - timeB;
              });
            }
            
            // For other users' messages, add new message (only if it doesn't exist)
            if (!prev.some(msg => msg.id === normalizedMessage.id)) {
              const updated = [...prev, normalizedMessage].sort((a, b) => {
                const timeA = new Date(a.created_at || 0).getTime();
                const timeB = new Date(b.created_at || 0).getTime();
                return timeA - timeB;
              });
              return updated;
            }
            
            return prev;
          });
          
          setTimeout(() => scrollToBottom(), 50);
          
          // Mark as read if not my message
          if (!isMyMessage) {
            setTimeout(() => {
              markAsReadMutation.mutate();
              socket.emit('message_read', {
                messageId: normalizedMessage.id,
                conversationId,
              });
            }, 300);
          }
        };

        const handleMessageStatusUpdate = (update: any) => {
          if (update.conversationId !== conversationId) return;
          
          setMessages((prev) => 
            prev.map(msg => {
              if (msg.id === update.messageId) {
                return { ...msg, status: update.status };
              }
              // Bulk update for read status
              const currentUserId = user?.id || user?.userId;
              const msgSenderId = msg.sender_id || msg.senderId;
              if (update.status === 'read' && 
                  update.conversationId === conversationId &&
                  msgSenderId === currentUserId && 
                  msg.status !== 'read') {
                return { ...msg, status: 'read' };
              }
              if (update.status === 'delivered' && 
                  msgSenderId === currentUserId && 
                  msg.status === 'sent') {
                return { ...msg, status: 'delivered' };
              }
              return msg;
            })
          );
        };

        const handleConversationMessagesRead = (data: any) => {
          if (data.conversationId !== conversationId) return;
          
          setMessages((prev) =>
            prev.map((msg) => {
              const currentUserId = user?.id || user?.userId;
              const msgSenderId = msg.sender_id || msg.senderId;
              if (msgSenderId === currentUserId && (msg.status === 'delivered' || msg.status === 'sent')) {
                return { ...msg, status: 'read' };
              }
              return msg;
            })
          );
        };

        const handleMessageEdited = (editedMsg: any) => {
          if (editedMsg.conversation_id !== conversationId) return;
          
          setMessages((prev) =>
            prev.map(msg =>
              msg.id === editedMsg.id ? { ...msg, ...normalizeMessage(editedMsg) } : msg
            )
          );
        };

        const handleMessageDeleted = (deletedMsg: any) => {
          if (deletedMsg.conversation_id !== conversationId) return;
          
          setMessages((prev) =>
            prev.filter(msg => msg.id !== deletedMsg.id)
          );
        };

        const handleTyping = (data: any) => {
          const currentUserId = user?.id || user?.userId;
          if (data.conversationId === conversationId && data.userId !== currentUserId) {
            setIsTyping(data.isTyping);
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }
            if (data.isTyping) {
              typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
              }, 3000);
            }
          }
        };

        const handleUserOnline = (data: any) => {
          const isGroup = conversationData?.type === 'group' || conversationData?.is_group;
          const isTaskGroup = conversationData?.isTaskGroup || conversationData?.is_task_group;
          if (!isGroup && !isTaskGroup && otherUserId && data.userId === otherUserId) {
            setIsOnline(true);
          }
        };

        const handleUserOffline = (data: any) => {
          const isGroup = conversationData?.type === 'group' || conversationData?.is_group;
          const isTaskGroup = conversationData?.isTaskGroup || conversationData?.is_task_group;
          if (!isGroup && !isTaskGroup && otherUserId && data.userId === otherUserId) {
            setIsOnline(false);
          }
        };

        const handleUserOnlineStatus = (data: any) => {
          const isGroup = conversationData?.type === 'group' || conversationData?.is_group;
          const isTaskGroup = conversationData?.isTaskGroup || conversationData?.is_task_group;
          if (!isGroup && !isTaskGroup && otherUserId && data.userId === otherUserId) {
            setIsOnline(data.isOnline === true);
          }
        };

        const handleMessageReactionAdded = (data: any) => {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === data.messageId) {
                const reactions = msg.reactions || [];
                const currentUserId = user?.id || user?.userId;
                if (!reactions.find((r: any) => (r.user_id || r.userId) === currentUserId && r.reaction === data.reaction)) {
                  return {
                    ...msg,
                    reactions: [...reactions, { user_id: data.userId, reaction: data.reaction }],
                  };
                }
              }
              return msg;
            })
          );
        };

        const handleMessageReactionRemoved = (data: any) => {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === data.messageId) {
                return {
                  ...msg,
                  reactions: (msg.reactions || []).filter(
                    (r: any) => !((r.user_id || r.userId) === data.userId && r.reaction === data.reaction)
                  ),
                };
              }
              return msg;
            })
          );
        };

        // Register all listeners
        onSocketEvent('new_message', handleNewMessage);
        onSocketEvent('message_status_update', handleMessageStatusUpdate);
        onSocketEvent('conversation_messages_read', handleConversationMessagesRead);
        onSocketEvent('message_edited', handleMessageEdited);
        onSocketEvent('message_deleted', handleMessageDeleted);
        onSocketEvent('typing', handleTyping);
        onSocketEvent('user_online', handleUserOnline);
        onSocketEvent('user_offline', handleUserOffline);
        onSocketEvent('user_online_status', handleUserOnlineStatus);
        onSocketEvent('message_reaction_added', handleMessageReactionAdded);
        onSocketEvent('message_reaction_removed', handleMessageReactionRemoved);

        socketRef.current = socket;

        // Check online status for direct conversations
        const isGroup = conversationData?.type === 'group' || conversationData?.is_group;
        const isTaskGroup = conversationData?.isTaskGroup || conversationData?.is_task_group;
        if (!isGroup && !isTaskGroup && otherUserId) {
          setTimeout(() => {
            checkOnlineStatus(otherUserId);
          }, 500);
          
          onlineCheckInterval = setInterval(() => {
            checkOnlineStatus(otherUserId);
          }, 15000);
        }

        // Cleanup: Remove old temp messages periodically (every 5 seconds)
        // This ensures temp messages don't persist if socket events fail
        const tempMessageCleanupInterval = setInterval(() => {
          setMessages((prev) => {
            const currentUserId = user?.id || user?.userId;
            const now = Date.now();
            const thirtySecondsAgo = now - 30000; // 30 seconds
            
            const oldTempMessages = prev.filter(msg => {
              if (!msg.id?.startsWith('temp_')) return false;
              if (msg.sender_id !== currentUserId && msg.senderId !== currentUserId) return false;
              const msgTime = new Date(msg.created_at || 0).getTime();
              return msgTime < thirtySecondsAgo;
            });
            
            if (oldTempMessages.length > 0) {
              console.log('[tempMessageCleanup] Removing old temp messages:', oldTempMessages.map(m => m.id));
              return prev.filter(msg => !oldTempMessages.find(t => t.id === msg.id));
            }
            
            return prev;
          });
        }, 5000);
        
        return () => {
          if (onlineCheckInterval) {
            clearInterval(onlineCheckInterval);
          }
          if (tempMessageCleanupInterval) {
            clearInterval(tempMessageCleanupInterval);
          }
          leaveConversationRoom(conversationId);
          offSocketEvent('new_message', handleNewMessage);
          offSocketEvent('message_status_update', handleMessageStatusUpdate);
          offSocketEvent('conversation_messages_read', handleConversationMessagesRead);
          offSocketEvent('message_edited', handleMessageEdited);
          offSocketEvent('message_deleted', handleMessageDeleted);
          offSocketEvent('typing', handleTyping);
          offSocketEvent('user_online', handleUserOnline);
          offSocketEvent('user_offline', handleUserOffline);
          offSocketEvent('user_online_status', handleUserOnlineStatus);
          offSocketEvent('message_reaction_added', handleMessageReactionAdded);
          offSocketEvent('message_reaction_removed', handleMessageReactionRemoved);
        };
      } catch (error) {
        console.error('Socket setup error:', error);
      }
    };

    setupSocket();

    return () => {
      isMounted = false;
      if (conversationId) {
        leaveConversationRoom(conversationId);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, user, otherUserId, conversationData]);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      markAsReadMutation.mutate();
    }
  }, [conversationId]);

  // Recalculate unread count
  useEffect(() => {
    const currentUserId = user?.id || user?.userId;
    const unread = messages.filter(
      (msg: any) => {
        const msgSenderId = msg.sender_id || msg.senderId;
        return msgSenderId !== currentUserId && msg.status !== 'read' && !msg.deleted_at;
      }
    ).length;
    setUnreadCount(unread);
  }, [messages, user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Format time helper
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    try {
      return format(new Date(timestamp), 'h:mm a');
    } catch {
      return '';
    }
  };

  // Format date helper (Today, Yesterday, or date)
  const formatDate = (timestamp?: string) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return format(date, 'MMM d, yyyy');
      }
    } catch {
      return '';
    }
  };

  // Should show date separator
  const shouldShowDateSeparator = (currentMessage: any, previousMessage: any) => {
    if (!previousMessage) return true;
    try {
      const currentDate = new Date(currentMessage.created_at).toDateString();
      const previousDate = new Date(previousMessage.created_at).toDateString();
      return currentDate !== previousDate;
    } catch {
      return false;
    }
  };

  // Handle typing (with debouncing)
  const handleTyping = async (text: string) => {
    setMessage(text);

    try {
      const socket = await waitForSocketConnection();
      const currentUserId = user?.id || user?.userId;
      
      if (!typing && text.length > 0) {
        setTyping(true);
        socket.emit('typing', { 
          conversationId, 
          isTyping: true,
          userId: currentUserId,
        });
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      typingTimeoutRef.current = setTimeout(async () => {
        try {
          const stopSocket = await waitForSocketConnection();
          setTyping(false);
          stopSocket.emit('typing', { 
            conversationId, 
            isTyping: false,
            userId: currentUserId,
          });
        } catch (error) {
          console.error('Error stopping typing:', error);
          setTyping(false);
        }
      }, 2000);
    } catch (error) {
      console.error('Typing indicator error:', error);
    }
  };

  // Handle send message
  const handleSend = async () => {
    if ((!message.trim() && !replyingTo && !editingMessage) || !conversationId) return;

    try {
      const socket = await waitForSocketConnection();
      
      if (editingMessage) {
        // Edit existing message
        await messageService.editMessage(editingMessage.id, message.trim());
        socket.emit('send_message', {
          conversationId,
          content: message.trim(),
          messageType: 'text',
          isEdit: true,
          messageId: editingMessage.id,
        });
        setEditingMessage(null);
        setMessage('');
      } else {
        // Create optimistic message
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const currentUserId = user?.id || user?.userId;
        const tempMessage = normalizeMessage({
          id: tempId,
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: message.trim(),
          message_type: 'text',
          status: 'sent',
          created_at: new Date().toISOString(),
          sender_name: user?.name || 'You',
          reply_to_message_id: replyingTo?.id || null,
          reply_to: replyingTo ? {
            id: replyingTo.id,
            sender_id: replyingTo.sender_id,
            content: replyingTo.content,
            message_type: replyingTo.message_type,
            sender_name: replyingTo.sender_name,
          } : null,
        });
        
        if (tempMessage) {
          setMessages((prev) => [...prev, tempMessage]);
          setMessage('');
          setReplyingTo(null);
          setTimeout(() => scrollToBottom(), 100);
        }
        
        // Send via socket only (socket handler will insert to database and emit new_message)
        // Do NOT call sendMessageMutation here as it causes duplicate messages
        socket.emit('send_message', {
          conversationId,
          text: message.trim(),
          content: message.trim(),
          messageType: 'text',
          replyToMessageId: replyingTo?.id || null,
        });
      }
      
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  // Handle long press (right-click or context menu)
  const handleMessageContextMenu = (e: React.MouseEvent, msg: any) => {
    e.preventDefault();
    setSelectedMessage(msg);
  };

  // Handle reaction
  const handleReaction = async (emoji: string) => {
    if (!selectedMessage) return;
    
    const currentUserId = user?.id || user?.userId;
    const existingReaction = selectedMessage.reactions?.find(
      (r: any) => (r.user_id || r.userId) === currentUserId && r.reaction === emoji
    );

    try {
      const socket = await waitForSocketConnection();
      if (existingReaction) {
        await messageService.removeReaction(selectedMessage.id, emoji);
        socket.emit('remove_reaction', {
          messageId: selectedMessage.id,
          conversationId,
          reaction: emoji,
        });
      } else {
        await messageService.addReaction(selectedMessage.id, emoji);
        socket.emit('message_reaction', {
          messageId: selectedMessage.id,
          conversationId,
          reaction: emoji,
        });
      }
      setSelectedMessage(null);
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Reaction error:', error);
    }
  };

  // Handle reply
  const handleReply = () => {
    if (selectedMessage) {
      setReplyingTo(selectedMessage);
      setSelectedMessage(null);
    }
  };

  // Handle edit
  const handleEdit = () => {
    const currentUserId = user?.id || user?.userId;
    const msgSenderId = selectedMessage?.sender_id || selectedMessage?.senderId;
    if (selectedMessage && msgSenderId === currentUserId) {
      setEditingMessage(selectedMessage);
      setMessage(selectedMessage.content || '');
      setSelectedMessage(null);
    }
  };

  // Handle delete
  const handleDelete = async (deleteForEveryone: boolean) => {
    if (!selectedMessage) return;

    try {
      await messageService.deleteMessage(selectedMessage.id, deleteForEveryone);
      if (deleteForEveryone) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === selectedMessage.id
              ? { ...msg, deleted_at: new Date().toISOString(), deleted_for_all: true }
              : msg
          )
        );
      } else {
        setMessages((prev) => prev.filter((msg) => msg.id !== selectedMessage.id));
      }
      setSelectedMessage(null);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Handle star
  const handleStar = async () => {
    if (!selectedMessage) return;
    
    try {
      if (selectedMessage.starred) {
        await messageService.unstarMessage(selectedMessage.id);
      } else {
        await messageService.starMessage(selectedMessage.id);
      }
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === selectedMessage.id
            ? { ...msg, starred: !msg.starred }
            : msg
        )
      );
      setSelectedMessage(null);
    } catch (error) {
      console.error('Star error:', error);
    }
  };

  // Handle copy
  const handleCopy = () => {
    if (selectedMessage?.content) {
      navigator.clipboard.writeText(selectedMessage.content);
      setSelectedMessage(null);
      // Show toast notification (you can add a toast library)
    }
  };

  // Handle forward
  const handleForward = async () => {
    if (!selectedMessage) return;
    
    try {
      // For now, just show a message - in future, can open a conversation picker
      const targetConversationId = prompt('Enter conversation ID to forward to:');
      if (targetConversationId) {
        await messageService.forwardMessage(selectedMessage.id, targetConversationId);
        setSelectedMessage(null);
      }
    } catch (error) {
      console.error('Forward error:', error);
    }
  };

  // Handle media upload
  const handleMediaSelect = async (file: File, type: 'image' | 'video' | 'audio' | 'document') => {
    setUploadingMedia(true);
    try {
      let uploadResponse;
      let messageType: string = type;

      switch (type) {
        case 'image':
          uploadResponse = await messageService.uploadImage(file);
          messageType = 'image';
          break;
        case 'video':
          uploadResponse = await messageService.uploadVideo(file);
          messageType = 'video';
          break;
        case 'audio':
          uploadResponse = await messageService.uploadAudio(file);
          messageType = 'audio';
          break;
        case 'document':
          uploadResponse = await messageService.uploadDocument(file);
          messageType = 'document';
          break;
      }

      const mediaUrl = uploadResponse.url || uploadResponse.mediaUrl || uploadResponse.data?.url;
      if (!mediaUrl) {
        throw new Error('No media URL returned from upload');
      }

      // Send message via socket
      const socket = await waitForSocketConnection();
      socket.emit('send_message', {
        conversationId,
        messageType,
        mediaUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        replyToMessageId: replyingTo?.id || null,
      });

      setReplyingTo(null);
    } catch (error) {
      console.error('Media upload error:', error);
      alert('Failed to upload media. Please try again.');
    } finally {
      setUploadingMedia(false);
    }
  };

  // Handle voice note
  const handleVoiceNoteComplete = async (audioBlob: Blob) => {
    setUploadingMedia(true);
    try {
      // Convert blob to file
      const audioFile = new File([audioBlob], 'voice-note.webm', { type: 'audio/webm' });
      const uploadResponse = await messageService.uploadVoiceNote(audioFile);
      
      const mediaUrl = uploadResponse.url || uploadResponse.mediaUrl || uploadResponse.data?.url;
      if (!mediaUrl) {
        throw new Error('No media URL returned from upload');
      }

      // Send message via socket
      const socket = await waitForSocketConnection();
      socket.emit('send_message', {
        conversationId,
        messageType: 'voice_note',
        mediaUrl,
        fileName: 'voice-note.webm',
        fileSize: audioBlob.size,
        mimeType: 'audio/webm',
        duration: 0, // Duration will be calculated on backend
        replyToMessageId: replyingTo?.id || null,
      });

      setReplyingTo(null);
    } catch (error) {
      console.error('Voice note upload error:', error);
      alert('Failed to upload voice note. Please try again.');
    } finally {
      setUploadingMedia(false);
    }
  };

  // Handle location share
  const handleLocationSelect = async (location: { lat: number; lng: number; address?: string }) => {
    try {
      const socket = await waitForSocketConnection();
      socket.emit('send_message', {
        conversationId,
        messageType: 'location',
        locationLat: location.lat,
        locationLng: location.lng,
        locationAddress: location.address,
        replyToMessageId: replyingTo?.id || null,
      });

      setReplyingTo(null);
    } catch (error) {
      console.error('Location share error:', error);
      alert('Failed to share location. Please try again.');
    }
  };

  // Handle message search
  const handleSearch = async () => {
    if (!searchQuery.trim() || !conversationId) return;

    try {
      const response = await messageService.searchMessagesInConversation(conversationId, searchQuery);
      const results = response.messages || response.data || [];
      setSearchResults(results.map((msg: any) => normalizeMessage(msg)).filter((msg: any) => msg !== null));
    } catch (error) {
      console.error('Search error:', error);
    }
  };


  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMoreMessages || !conversationId) return;

    setIsLoadingMore(true);
    try {
      const offset = messages.length;
      const response = await messageService.getMessagesByConversationId(conversationId, 50, offset);
      const rawMessages = response.messages || response.data || [];
      const newMessages = rawMessages.map((msg: any) => normalizeMessage(msg)).filter((msg: any) => msg !== null);
      
      if (newMessages.length > 0) {
        setMessages((prev) => {
          const combined = [...newMessages.reverse(), ...prev];
          const unique = combined.filter((msg, index, self) =>
            index === self.findIndex(m => m.id === msg.id)
          );
          return unique.sort((a, b) => {
            const timeA = new Date(a.created_at || 0).getTime();
            const timeB = new Date(b.created_at || 0).getTime();
            return timeA - timeB;
          });
        });
        setHasMoreMessages(newMessages.length >= 50);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Load more messages error:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Get conversation name and photo
  const conversationName = conversationData?.name || 
    (conversationData?.otherMembers?.[0]?.name) || 
    'Unknown User';
  const conversationPhoto = conversationData?.photoUrl || 
    conversationData?.group_photo || 
    conversationData?.otherMembers?.[0]?.profile_photo_url ||
    '';

  // Render message component
  const renderMessage = (msg: any, index: number) => {
    const messageSenderId = msg.sender_id || msg.senderId;
    const currentUserId = user?.id || user?.userId;
    const isMyMessage = messageSenderId === currentUserId;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showDateSeparator = shouldShowDateSeparator(msg, previousMessage);
    const messageStatus = msg.status || 'sent';
    const messageType = msg.message_type || 'text';

    // Status icon and color
    let statusIcon = null;
    let statusColor = '#6B7280';
    if (isMyMessage) {
      if (messageStatus === 'read') {
        statusIcon = '✓✓';
        statusColor = '#7C3AED';
      } else if (messageStatus === 'delivered') {
        statusIcon = '✓✓';
        statusColor = '#6B7280';
      } else {
        statusIcon = '✓';
        statusColor = '#6B7280';
      }
    }

    // Deleted message
    if (msg.deleted_at && msg.deleted_for_all) {
      return (
        <div key={msg.id} className="w-full">
          {showDateSeparator && (
            <div className="flex justify-center">
              <span className="text-xs font-medium text-gray-400 bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded-full">
                {formatDate(msg.created_at)}
              </span>
            </div>
          )}
          <div className="flex justify-center py-2">
            <p className="text-gray-400 dark:text-gray-500 text-sm italic">This message was deleted</p>
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} className="w-full">
        {showDateSeparator && (
          <div className="flex justify-center py-2">
            <span className="bg-gray-200/70 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-medium px-3 py-1 rounded-full">
              {formatDate(msg.created_at)}
            </span>
          </div>
        )}
        
        <div className={`flex gap-4 max-w-2xl ${isMyMessage ? 'ml-auto flex-row-reverse' : ''}`}>
          {!isMyMessage && (
            <img 
              alt="Avatar" 
              className="w-10 h-10 rounded-full object-cover self-end"
              src={conversationPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversationName)}&background=A800EB&color=fff`}
            />
          )}
          
          <div 
            className={`flex flex-col gap-1 ${isMyMessage ? 'items-end' : 'items-start'}`}
            onContextMenu={(e) => handleMessageContextMenu(e, msg)}
          >
            {/* Sender name for group chats */}
            {!isMyMessage && ((conversationData?.type === 'group' || conversationData?.is_group) || (conversationData?.isTaskGroup || conversationData?.is_task_group)) && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                {msg.sender_name || 'Unknown'}
              </span>
            )}

            {/* Message content based on type */}
            {messageType === 'image' && msg.media_url && (
              <ImageMessage 
                mediaUrl={msg.media_url} 
                mediaThumbnail={msg.media_thumbnail}
                isMyMessage={isMyMessage}
              />
            )}

            {messageType === 'video' && msg.media_url && (
              <VideoMessage 
                mediaUrl={msg.media_url} 
                mediaThumbnail={msg.media_thumbnail}
                isMyMessage={isMyMessage}
              />
            )}

            {messageType === 'document' && (
              <DocumentMessage 
                fileName={msg.file_name}
                fileSize={msg.file_size}
                mediaUrl={msg.media_url}
                isMyMessage={isMyMessage}
              />
            )}

            {messageType === 'location' && (
              <LocationMessage 
                latitude={msg.location_lat || msg.latitude}
                longitude={msg.location_lng || msg.longitude}
                locationName={msg.location_address || msg.location_name}
                isMyMessage={isMyMessage}
              />
            )}

            {messageType === 'voice' || messageType === 'voice_note' ? (
              <VoiceMessage 
                mediaUrl={msg.media_url}
                duration={msg.duration}
                isMyMessage={isMyMessage}
              />
            ) : messageType === 'text' && msg.content && (
              <div className={`${isMyMessage ? 'bg-primary text-white p-4 rounded-2xl rounded-br-none shadow-md' : 'bg-white dark:bg-gray-800 p-4 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 dark:border-gray-700'}`}>
                {msg.reply_to && (
                  <div className="border-l-4 border-primary/50 pl-2 mb-2">
                    <p className="text-xs font-semibold text-primary dark:text-primary-light">
                      {msg.reply_to.sender_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {msg.reply_to.content || `Sent a ${msg.reply_to.message_type}`}
                    </p>
                  </div>
                )}
                {msg.edited_at && (
                  <span className="text-[10px] opacity-70 mr-2">Edited</span>
                )}
                <p className="text-sm text-gray-700 dark:text-gray-200">{msg.content}</p>
                <div className={`flex items-center gap-1 mt-1 ${isMyMessage ? 'justify-end' : ''}`}>
                  <span className={`text-[10px] ${isMyMessage ? 'text-white/80' : 'text-gray-400'} ml-1`}>
                    {formatTime(msg.created_at)}
                  </span>
                  {isMyMessage && statusIcon && (
                    <span className="material-icons-round text-[12px]" style={{ color: statusColor }}>
                      {statusIcon === '✓✓' ? 'done_all' : 'done'}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Reactions */}
            {msg.reactions && msg.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {msg.reactions.map((reaction: any, idx: number) => (
                  <span key={idx} className="text-sm">
                    {reaction.reaction}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main dark:text-white font-sans antialiased overflow-hidden flex flex-col h-screen w-full">
      {/* Header */}
      <header className="h-20 border-b border-border-light dark:border-border-dark flex items-center justify-between px-6 bg-white/50 dark:bg-surface-dark/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-primary transition-colors p-1 -ml-2 dark:text-gray-400">
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <div className="relative">
            <div 
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-800 to-primary flex items-center justify-center text-white shadow-md"
              style={{ backgroundImage: conversationPhoto ? `url("${conversationPhoto}")` : 'none' }}
            >
              {conversationPhoto ? (
                <img src={conversationPhoto} alt={conversationName} className="w-full h-full rounded-xl object-cover" />
              ) : (
                <span className="material-icons-outlined opacity-50 text-xl">person</span>
              )}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {conversationName}
              {(conversationData?.isTaskGroup || conversationData?.is_task_group) && (
                <span className="bg-accent-pink dark:bg-red-900/30 text-accent-text dark:text-red-300 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Urgent</span>
              )}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isTyping ? (
                <span className="flex items-center gap-1">
                  <span>typing</span>
                  <span className="flex gap-0.5">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                  </span>
                </span>
              ) : unreadCount > 0 ? (
                `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`
              ) : isOnline && !(conversationData?.type === 'group' || conversationData?.is_group) && !(conversationData?.isTaskGroup || conversationData?.is_task_group) ? (
                <span className="flex items-center gap-1">
                  <span className="size-2 bg-green-500 rounded-full"></span>
                  <span>online</span>
                </span>
              ) : !(conversationData?.type === 'group' || conversationData?.is_group) && !(conversationData?.isTaskGroup || conversationData?.is_task_group) ? (
                <span>offline</span>
              ) : (
                ''
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-gray-400">
          <button 
            onClick={() => setShowMessageSearch(!showMessageSearch)}
            className="hover:text-primary transition"
            title="Search messages"
          >
            <span className="material-icons-outlined">search</span>
          </button>
          <button className="hover:text-primary transition">
            <span className="material-icons-outlined">push_pin</span>
          </button>
          <button className="hover:text-primary transition">
            <span className="material-icons-outlined">more_vert</span>
          </button>
        </div>
      </header>

      {/* Message Search */}
      {showMessageSearch && (
        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleSearch}
              className="bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Search
            </button>
            <button
              onClick={() => {
                setShowMessageSearch(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-[#18181b]">
        {hasMoreMessages && (
          <div className="flex justify-center py-2">
            <button
              onClick={loadMoreMessages}
              disabled={isLoadingMore}
              className="bg-gray-200/70 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-medium px-3 py-1 rounded-full shadow-sm hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {isLoadingMore ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400 text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => renderMessage(msg, index))
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Reply Bar */}
      {replyingTo && (
        <div className="bg-gray-100 dark:bg-gray-800 border-l-4 border-primary px-4 py-2 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary mb-0.5">
              Replying to {replyingTo.sender_name || 'Unknown'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {replyingTo.content || `Sent a ${replyingTo.message_type}`}
            </p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Edit Bar */}
      {editingMessage && (
        <div className="bg-primary/10 dark:bg-primary/20 border-l-4 border-primary px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-medium text-primary">Editing message</span>
          <button
            onClick={() => {
              setEditingMessage(null);
              setMessage('');
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 bg-surface-light dark:bg-surface-dark border-t border-border-light dark:border-border-dark">
        <div className="flex items-end gap-2 max-w-5xl mx-auto">
          <button 
            className="p-3 text-gray-400 hover:text-primary transition rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 relative"
            onClick={() => setShowMediaUpload(true)}
            disabled={uploadingMedia}
            title="Attach file"
          >
            {uploadingMedia ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            ) : (
              <span className="material-icons-outlined">add_circle</span>
            )}
          </button>
          <div className="flex-1 bg-gray-100 dark:bg-background-dark rounded-2xl flex items-center p-2">
            <textarea
              className="w-full bg-transparent border-none focus:ring-0 text-gray-900 dark:text-gray-100 resize-none max-h-32 placeholder-gray-400 py-2 px-3"
              placeholder={editingMessage ? "Edit message..." : "Type a message..."}
              rows={1}
              value={message}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button 
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              onClick={() => setShowEmojiPicker(true)}
            >
              <span className="material-icons-outlined">sentiment_satisfied</span>
            </button>
            <button 
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              onClick={() => setShowVoiceRecorder(true)}
              title="Voice note"
            >
              <span className="material-icons-outlined">mic</span>
            </button>
          </div>
          <button 
            onClick={handleSend} 
            disabled={(!message.trim() && !replyingTo && !editingMessage) || sendMessageMutation.isLoading || uploadingMedia}
            className="p-3 bg-primary hover:bg-primary-dark text-white rounded-full shadow-lg transition transform active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-icons-round">
              {message.trim() || replyingTo || editingMessage ? 'send' : 'mic'}
            </span>
          </button>
        </div>
      </div>

      {/* Message Action Sheet */}
      <MessageActionSheet
        visible={!!selectedMessage}
        isMyMessage={(selectedMessage?.sender_id || selectedMessage?.senderId) === (user?.id || user?.userId)}
        isGroup={(conversationData?.type === 'group' || conversationData?.is_group) || false}
        isStarred={selectedMessage?.starred || false}
        onReply={handleReply}
        onCopy={handleCopy}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStar={handleStar}
        onReact={() => setShowEmojiPicker(true)}
        onForward={handleForward}
        onClose={() => setSelectedMessage(null)}
      />

      {/* Emoji Picker */}
      <EmojiPicker
        visible={showEmojiPicker}
        onSelect={handleReaction}
        onClose={() => setShowEmojiPicker(false)}
      />

      {/* Media Upload */}
      <MediaUpload
        visible={showMediaUpload}
        onSelect={handleMediaSelect}
        onClose={() => setShowMediaUpload(false)}
      />

      {/* Voice Recorder */}
      <VoiceRecorder
        visible={showVoiceRecorder}
        onRecordComplete={handleVoiceNoteComplete}
        onClose={() => setShowVoiceRecorder(false)}
      />

      {/* Location Picker */}
      <LocationPicker
        visible={showLocationPicker}
        onLocationSelect={handleLocationSelect}
        onClose={() => setShowLocationPicker(false)}
      />

      <BottomNav />
    </div>
  );
};
