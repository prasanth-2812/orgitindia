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

  // Fetch messages
  const { data: messagesData, refetch: refetchMessages } = useQuery(
    ['messages', conversationId],
    async () => {
      const response = await messageService.getMessagesByConversationId(conversationId!, 50, 0);
      const rawMessages = response.messages || response.data || [];
      return rawMessages.map((msg: any) => normalizeMessage(msg)).filter((msg: any) => msg !== null);
    },
    { 
      enabled: !!conversationId,
      onSuccess: (data) => {
        // Sort messages by created_at
        const sorted = [...data].sort((a, b) => {
          const timeA = new Date(a.created_at || 0).getTime();
          const timeB = new Date(b.created_at || 0).getTime();
          return timeA - timeB;
        });
        setMessages(sorted);
        setHasMoreMessages(data.length >= 50);
        
        // Calculate unread count
        const currentUserId = user?.id || user?.userId;
        const unread = sorted.filter(
          (msg: any) => {
            const msgSenderId = msg.sender_id || msg.senderId;
            return msgSenderId !== currentUserId && msg.status !== 'read' && !msg.deleted_at;
          }
        ).length;
        setUnreadCount(unread);
        
        setTimeout(() => scrollToBottom(), 100);
      }
    }
  );

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

  // Send message mutation
  const sendMessageMutation = useMutation(
    (data: { content: string; replyToMessageId?: string }) => messageService.sendMessage({
      conversationId: conversationId!,
      messageType: 'text',
      content: data.content,
      replyToMessageId: data.replyToMessageId,
    }),
    {
      onSuccess: () => {
        refetchMessages();
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
          if (newMsg.conversation_id !== conversationId) return;
          
          const currentUserId = user?.id || user?.userId;
          const isMyMessage = newMsg.sender_id === currentUserId || newMsg.senderId === currentUserId;
          
          const normalizedMessage = normalizeMessage(newMsg);
          if (!normalizedMessage) return;

          setMessages((prev) => {
            // Check if message already exists
            if (prev.some(msg => msg.id === normalizedMessage.id)) {
              return prev.map(msg => 
                msg.id === normalizedMessage.id ? normalizedMessage : msg
              );
            }
            
            // Check for temp message replacement
            const tempIndex = prev.findIndex((msg) => {
              if (!msg.id || !msg.id.startsWith('temp_')) return false;
              const msgSenderId = msg.sender_id || msg.senderId;
              const newSenderId = normalizedMessage.sender_id || normalizedMessage.senderId;
              const sameSender = msgSenderId === newSenderId;
              const msgContent = (msg.content || '').trim();
              const newContent = (normalizedMessage.content || '').trim();
              const sameContent = msgContent === newContent;
              const msgTime = new Date(msg.created_at || 0).getTime();
              const newTime = new Date(normalizedMessage.created_at || 0).getTime();
              const timeDiff = Math.abs(msgTime - newTime);
              return sameSender && sameContent && timeDiff < 15000;
            });
            
            if (tempIndex !== -1) {
              const updated = [...prev];
              updated[tempIndex] = normalizedMessage;
              updated.sort((a, b) => {
                const timeA = new Date(a.created_at || 0).getTime();
                const timeB = new Date(b.created_at || 0).getTime();
                return timeA - timeB;
              });
              return updated;
            }
            
            // Add new message
            const updated = [...prev, normalizedMessage].sort((a, b) => {
              const timeA = new Date(a.created_at || 0).getTime();
              const timeB = new Date(b.created_at || 0).getTime();
              return timeA - timeB;
            });
            return updated;
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

        return () => {
          if (onlineCheckInterval) {
            clearInterval(onlineCheckInterval);
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
        
        // Send via socket
        socket.emit('send_message', {
          conversationId,
          text: message.trim(),
          content: message.trim(),
          messageType: 'text',
          replyToMessageId: replyingTo?.id || null,
        });
        
        // Also send via API
        sendMessageMutation.mutate({
          content: message.trim(),
          replyToMessageId: replyingTo?.id,
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
  const handleForward = () => {
    // TODO: Implement forward functionality
    setSelectedMessage(null);
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
            <div className="flex justify-center py-2">
              <span className="bg-gray-200/70 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-medium px-3 py-1 rounded-full">
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
        
        <div className={`flex items-end gap-3 group ${isMyMessage ? 'justify-end' : ''}`}>
          {!isMyMessage && (
            <div 
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 shrink-0 mb-1 shadow-sm"
              style={{ 
                backgroundImage: conversationPhoto ? `url("${conversationPhoto}")` : 'none',
                backgroundColor: conversationPhoto ? 'transparent' : '#7C3AED'
              }}
            >
              {!conversationPhoto && (
                <div className="w-full h-full flex items-center justify-center text-white text-xs font-semibold">
                  {conversationName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}
          
          <div 
            className={`flex flex-col gap-1 ${isMyMessage ? 'items-end' : 'items-start'} max-w-[80%]`}
            onContextMenu={(e) => handleMessageContextMenu(e, msg)}
          >
            {/* Reply Preview */}
            {msg.reply_to && (
              <div className="border-l-4 border-primary/50 pl-2 ml-2 mb-1">
                <p className="text-xs font-semibold text-primary">
                  {msg.reply_to.sender_name || 'Unknown'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {msg.reply_to.content || `Sent a ${msg.reply_to.message_type}`}
                </p>
              </div>
            )}

            {/* Sender name for group chats */}
            {!isMyMessage && ((conversationData?.type === 'group' || conversationData?.is_group) || (conversationData?.isTaskGroup || conversationData?.is_task_group)) && (
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium px-1">
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
                latitude={msg.latitude}
                longitude={msg.longitude}
                locationName={msg.location_name}
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
              <div className={`relative px-4 py-3 rounded-2xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] border ${isMyMessage ? 'bg-primary text-white rounded-br-none shadow-primary/20 border-transparent' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none border-gray-200 dark:border-gray-700'}`}>
                {msg.edited_at && (
                  <span className="text-[10px] opacity-70 mr-2">Edited</span>
                )}
                <p className="text-[15px] font-normal leading-relaxed">{msg.content}</p>
                <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? '' : 'absolute bottom-1 right-3'}`}>
                  <span className={`text-[10px] ${isMe ? 'text-white/80' : 'text-gray-400'}`}>
                    {formatTime(msg.created_at)}
                  </span>
                  {isMe && statusIcon && (
                    <span className="text-[12px]" style={{ color: statusColor }}>
                      {statusIcon}
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
    <div className="bg-background-light dark:bg-background-dark text-text-main dark:text-white font-display antialiased overflow-hidden flex flex-col h-screen w-full max-w-md mx-auto shadow-2xl border-x border-gray-200 dark:border-gray-800">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-surface-light/95 dark:bg-background-dark/95 backdrop-blur-sm z-20 border-b border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-primary transition-colors p-1 -ml-2 dark:text-gray-400">
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <div className="relative">
            <div 
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border border-gray-200 dark:border-gray-700 shadow-sm"
              style={{ backgroundImage: conversationPhoto ? `url("${conversationPhoto}")` : 'none' }}
            >
              {!conversationPhoto && (
                <div className="w-full h-full bg-primary/20 rounded-full flex items-center justify-center">
                  <span className="text-primary text-lg font-semibold">
                    {conversationName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <h2 className="text-gray-900 dark:text-white text-base font-bold leading-tight">{conversationName}</h2>
            <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">
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
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-full">
            <span className="material-symbols-outlined text-[24px]">videocam</span>
          </button>
          <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-full">
            <span className="material-symbols-outlined text-[24px]">call</span>
          </button>
          <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-full">
            <span className="material-symbols-outlined text-[24px]">info</span>
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-4 bg-[#f8f9fa] dark:bg-[#1c1022]" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(164, 19, 236, 0.04) 0%, transparent 60%)' }}>
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

        {messages.length === 0 && !messagesData ? (
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
      <footer className="bg-surface-light/90 dark:bg-background-dark/90 backdrop-blur-md px-4 py-3 pb-6 border-t border-gray-200 dark:border-gray-800 z-20">
        <div className="flex items-end gap-3">
          <button 
            className="text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors p-2 rounded-full mb-1"
            onClick={() => {
              // TODO: Show attachment menu
            }}
          >
            <span className="material-symbols-outlined text-[26px]">add_circle</span>
          </button>
          <div className="flex-1 bg-gray-100 dark:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 rounded-[24px] px-4 py-2 flex items-center gap-2 focus-within:bg-white dark:focus-within:bg-[#2d1b36] focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <input
              className="bg-transparent border-none text-gray-900 dark:text-white placeholder-gray-400 text-base w-full focus:ring-0 p-0 max-h-24 py-1"
              placeholder={editingMessage ? "Edit message..." : "Type a message..."}
              type="text"
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
              className="text-gray-400 hover:text-primary transition-colors p-1"
              onClick={() => setShowEmojiPicker(true)}
            >
              <span className="material-symbols-outlined text-[20px]">sticky_note_2</span>
            </button>
          </div>
          <div className="flex gap-1 mb-1">
            <button className="text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors p-2 rounded-full">
              <span className="material-symbols-outlined text-[24px]">photo_camera</span>
            </button>
            <button 
              onClick={handleSend} 
              disabled={(!message.trim() && !replyingTo && !editingMessage) || sendMessageMutation.isLoading}
              className="bg-primary hover:bg-primary-dark transition-colors text-white rounded-full size-10 flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px] ml-0.5">
                {message.trim() || replyingTo || editingMessage ? 'send' : 'mic'}
              </span>
            </button>
          </div>
        </div>
      </footer>

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

      <BottomNav />
    </div>
  );
};
