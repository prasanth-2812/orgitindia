import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
  Pressable,
  Dimensions,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { getMessages, markMessagesAsRead, editMessage, deleteMessage, addReaction, removeReaction, starMessage, unstarMessage } from '../services/messageService';
import { getConversationDetails } from '../services/conversationService';
import { waitForSocketConnection } from '../services/socket';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
// Corporate Purple Theme
const PRIMARY_COLOR = '#7C3AED'; // Purple
const PRIMARY_LIGHT = '#A78BFA'; // Light purple
const CHAT_BG = '#F9FAFB'; // Light grey background
const CARD_BG = '#F9FAFB';
const BUBBLE_OUTGOING = '#EDE9FE'; // Light purple for outgoing
const BUBBLE_INCOMING = '#F9FAFB'; // White for incoming
const TEXT_PRIMARY = '#1F2937'; // Dark text
const TEXT_SECONDARY = '#6B7280'; // Medium grey
const BORDER_COLOR = '#E5E7EB'; // Light border
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.05)'; // Minimal shadow
const READ_INDICATOR = '#7C3AED'; // Purple for read indicator

const ChatScreen = ({ route, navigation }) => {
  const { conversationId, conversationName, isGroup } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [otherUserId, setOtherUserId] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [isTaskGroup, setIsTaskGroup] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const { user } = useAuth();

  useEffect(() => {
    let socketCleanup = null;
    isMountedRef.current = true;
    
    const initialize = async () => {
      try {
        await loadConversationDetails();
        await loadMessages();
        
        // CRITICAL FIX: Wait for socket setup to complete
        socketCleanup = await setupSocket();
        
        // If component unmounted during setup, cleanup immediately
        if (!isMountedRef.current && socketCleanup) {
          socketCleanup();
        }
      } catch (error) {
        console.error('❌ Initialization error:', error);
      }
    };
    
    initialize();

    const unsubscribe = navigation.addListener('focus', async () => {
      // Mark all messages as read when chat screen is focused
      try {
        // Call API endpoint first (it will update database and emit socket events)
        await markMessagesAsRead(conversationId);
        
        // Also emit socket event to ensure backend processes it correctly
        // (Backend API already emits, but this ensures real-time updates)
        const socket = await waitForSocketConnection();
        socket.emit('message_read', {
          conversationId,
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
      // Clear unread count when screen is focused (messages are being read)
      setUnreadCount(0);
      // Check online status when screen is focused
      checkOnlineStatus();
    });

    return () => {
      isMountedRef.current = false;
      // Cleanup socket listeners
      if (socketCleanup) {
        socketCleanup();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      unsubscribe();
    };
  }, [conversationId]);

  const loadConversationDetails = async () => {
    try {
      const details = await getConversationDetails(conversationId);
      // Backend returns { conversation, members, userRole, isPinned }
      const conversation = details.conversation || {};
      const members = details.members || [];

      // Check if this is a task group
      if (conversation.is_task_group && conversation.task_id) {
        setIsTaskGroup(true);
        setTaskId(conversation.task_id);
      }

      // For 1-to-1 conversations, get the other user's ID from members
      if (!conversation.is_group && !conversation.is_task_group && members.length > 0) {
        const currentUserId = user?.id || user?.userId;
        const otherUser =
          members.find((m) => (m.id || m.user_id) !== currentUserId) ||
          members[0];

        if (otherUser && (otherUser.id || otherUser.user_id)) {
          const newOtherUserId = otherUser.id || otherUser.user_id;
          setOtherUserId(newOtherUserId);
          // CRITICAL FIX: Check online status after getting other user ID
          // Wait a bit for socket listeners to be set up
          setTimeout(async () => {
            try {
              await waitForSocketConnection();
              checkOnlineStatus(newOtherUserId);
            } catch (error) {
              console.error('Error checking online status after load:', error);
            }
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Load conversation details error:', error);
    }
  };

  const checkOnlineStatus = async (userId = otherUserId) => {
    if (!userId || isGroup) return; // Only for 1-to-1 conversations
    
    try {
      const socket = await waitForSocketConnection();
      console.log('🔍 Checking online status for user:', userId);
      
      // CRITICAL FIX: Use both callback and event-based response for reliability
      let statusReceived = false;
      let timeoutId = null;
      
      // Set up event listener first (before emitting) - use persistent listener
      const statusListener = (data) => {
        if (data.userId === userId && !statusReceived) {
          statusReceived = true;
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          console.log('✅ Online status from event:', data.isOnline);
          setIsOnline(data.isOnline === true);
          // Remove listener after receiving status to avoid memory leaks
          socket.off('user_online_status', statusListener);
        }
      };
      
      socket.on('user_online_status', statusListener);
      
        // Emit event to check if user is online
        socket.emit('check_user_online', { userId }, (isOnline) => {
        if (!statusReceived && isOnline !== undefined && isOnline !== null) {
          statusReceived = true;
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          console.log('✅ Online status callback received:', isOnline);
          setIsOnline(isOnline === true);
          // Remove listener after receiving status
          socket.off('user_online_status', statusListener);
        }
      });
      
      // Timeout fallback - if no response in 3 seconds, assume offline
      timeoutId = setTimeout(() => {
        if (!statusReceived) {
          console.warn('⚠️ Online status check timeout, assuming offline');
          setIsOnline(false);
          socket.off('user_online_status', statusListener);
      }
      }, 3000);
    } catch (error) {
      console.error('❌ Check online status error:', error);
      setIsOnline(false);
    }
  };

  // Recalculate unread count whenever messages change
  useEffect(() => {
    const currentUserId = user?.id || user?.userId;
    const unread = messages.filter(
      (msg) => {
        const msgSenderId = msg.sender_id || msg.senderId;
        return msgSenderId !== currentUserId && msg.status !== 'read' && !msg.deleted_at;
      }
    ).length;
    setUnreadCount(unread);
  }, [messages, user?.id, user?.userId]);

  // CRITICAL FIX: Check online status when otherUserId is set AND when socket is ready
  // This effect ensures we check status whenever otherUserId changes
  useEffect(() => {
    if (otherUserId && !isGroup) {
      // Wait a bit for socket to be ready, then check status
      const checkStatus = async () => {
        try {
          await waitForSocketConnection();
          // Add retry logic - try up to 3 times
          let retries = 0;
          const maxRetries = 3;
          const tryCheck = async () => {
            try {
              await checkOnlineStatus(otherUserId);
            } catch (error) {
              retries++;
              if (retries < maxRetries) {
                setTimeout(tryCheck, 1000 * retries); // Exponential backoff
              } else {
                console.error('Failed to check online status after retries:', error);
              }
            }
          };
          tryCheck();
        } catch (error) {
          console.error('Error checking online status:', error);
        }
      };
      
      // Check immediately
      checkStatus();
      
      // Also set up a periodic check (every 15 seconds) to ensure status is up to date
      const statusCheckInterval = setInterval(() => {
        checkStatus();
      }, 15000);
      
      return () => clearInterval(statusCheckInterval);
    }
  }, [otherUserId, isGroup]);

  const setupSocket = async () => {
    try {
      // CRITICAL FIX: Wait for socket connection instead of infinite retry
      const socket = await waitForSocketConnection();
      console.log('✅ Socket connected, setting up listeners for conversation:', conversationId);

      // CRITICAL FIX: Set up ALL listeners BEFORE joining conversation room
      // This ensures we don't miss any events that are emitted immediately after joining

      // ========== MESSAGE LISTENERS (set up first) ==========
      socket.on('new_message', (message) => {
        // CRITICAL FIX: Only process messages for this conversation
        if (message.conversation_id !== conversationId) {
          return;
        }
        
        const currentUserId = user?.id || user?.userId;
        const isMyMessage = message.sender_id === currentUserId || message.senderId === currentUserId;
        
        console.log('📨 New message received in ChatScreen:', {
          id: message.id,
          conversationId: message.conversation_id,
          senderId: message.sender_id,
          currentUserId: currentUserId,
          isMyMessage: isMyMessage,
          status: message.status,
          content: message.content?.substring(0, 30),
        });
        
        // Normalize the message to ensure consistent field names
        const normalizedMessage = normalizeMessage(message);
        if (!normalizedMessage) {
          console.warn('⚠️ Failed to normalize message, skipping');
          return;
        }
        
        // CRITICAL FIX: Update messages state IMMEDIATELY with improved deduplication
        setMessages((prev) => {
          const isMyMessageInState = normalizedMessage.sender_id === currentUserId || normalizedMessage.senderId === currentUserId;
          
          // Use Set for faster duplicate checking (O(1) lookup)
          const messageIds = new Set(prev.map(msg => msg.id));
          
          // Check if message already exists to avoid duplicates
          if (messageIds.has(normalizedMessage.id)) {
            console.log('✅ Message exists, updating status:', normalizedMessage.id);
            // Update existing message (status might have changed)
            return prev.map((msg) => 
              msg.id === normalizedMessage.id ? normalizedMessage : msg
            );
          }
          
          // CRITICAL FIX: For our own messages, ALWAYS remove ALL temp messages from this user
          // This prevents duplicates - we never want both temp and real messages for our own messages
          if (isMyMessageInState) {
            const allTempMessagesFromUser = prev.filter(msg => {
              if (!msg.id || !msg.id.startsWith('temp_')) return false;
              return (msg.sender_id === currentUserId || msg.senderId === currentUserId);
            });
            
            if (allTempMessagesFromUser.length > 0) {
              // Remove all temp messages from this user and the real message if it already exists
              const tempIds = allTempMessagesFromUser.map(m => m.id);
              const updated = prev
                .filter(msg => !tempIds.includes(msg.id))
                .filter(msg => msg.id !== normalizedMessage.id);
              
              // Always add the real message
              updated.push(normalizedMessage);
              
              console.log('✅ Replaced temp messages for own message:', {
                tempIds,
                realMessageId: normalizedMessage.id,
                content: normalizedMessage.content?.substring(0, 50),
                beforeCount: prev.length,
                afterCount: updated.length
              });
              
              // Sort after replacement to ensure correct order
              updated.sort((a, b) => {
                const timeA = new Date(a.created_at || 0).getTime();
                const timeB = new Date(b.created_at || 0).getTime();
                return timeA - timeB;
              });
              return updated;
            }
          }
          
          // For other users' messages, check if this is replacing a temp message (optimistic update)
          if (!isMyMessageInState) {
            const tempMessageIndex = prev.findIndex((msg) => {
              // Must be a temp message
              if (!msg.id || !msg.id.startsWith('temp_')) return false;
              
              // Check sender match
              const msgSenderId = msg.sender_id || msg.senderId;
              const newSenderId = normalizedMessage.sender_id || normalizedMessage.senderId;
              const sameSender = msgSenderId === newSenderId;
              
              // Check content match (normalize whitespace)
              const msgContent = (msg.content || '').trim();
              const newContent = (normalizedMessage.content || '').trim();
              const sameContent = msgContent === newContent;
              
              // Check time difference (allow up to 15 seconds for network delay)
              const msgTime = new Date(msg.created_at || 0).getTime();
              const newTime = new Date(normalizedMessage.created_at || 0).getTime();
              const timeDiff = Math.abs(msgTime - newTime);
              
              // Match if: temp message, same sender, same content, and within 15 seconds
              return sameSender && sameContent && timeDiff < 15000;
            });
            
            if (tempMessageIndex !== -1) {
              // Replace temp message with real one
              console.log('✅ Replacing temp message with real message:', {
                tempId: prev[tempMessageIndex].id,
                realId: normalizedMessage.id,
                tempIndex: tempMessageIndex
              });
              const updated = [...prev];
              updated[tempMessageIndex] = normalizedMessage;
              // Sort after replacement to ensure correct order
              updated.sort((a, b) => {
                const timeA = new Date(a.created_at || 0).getTime();
                const timeB = new Date(b.created_at || 0).getTime();
                return timeA - timeB;
              });
              return updated;
            }
          }
          
          // CRITICAL FIX: For messages from current user, check for duplicate by content + sender + time
          // This handles the case where the same message is received twice via socket (shouldn't happen, but safety check)
          if (isMyMessageInState) {
            const duplicateIndex = prev.findIndex((msg) => {
              // Skip temp messages (already handled above)
              if (msg.id && msg.id.startsWith('temp_')) return false;
              
              const msgSenderId = msg.sender_id || msg.senderId;
              const msgIsMine = msgSenderId === currentUserId;
              const msgContent = (msg.content || '').trim();
              const newContent = (normalizedMessage.content || '').trim();
              const sameContent = msgContent === newContent;
              
              const timeDiff = Math.abs(
                new Date(msg.created_at || 0).getTime() - 
                new Date(normalizedMessage.created_at || 0).getTime()
              );
              
              // Match if: same sender, same content, and within 5 seconds (tighter window for duplicates)
              return msgIsMine && sameContent && timeDiff < 5000;
            });
            
            if (duplicateIndex !== -1) {
              // Replace the duplicate (update status if needed)
              console.log('✅ Replacing duplicate message with updated version:', {
                oldId: prev[duplicateIndex].id,
                newId: normalizedMessage.id,
                oldStatus: prev[duplicateIndex].status,
                newStatus: normalizedMessage.status
              });
              const updated = [...prev];
              updated[duplicateIndex] = normalizedMessage;
              // Sort after replacement to ensure correct order
              updated.sort((a, b) => {
                const timeA = new Date(a.created_at || 0).getTime();
                const timeB = new Date(b.created_at || 0).getTime();
                return timeA - timeB;
              });
              return updated;
            }
          }
          
          // CRITICAL FIX: Add new message immediately and sort by timestamp
          console.log('✅ Adding new message to list immediately');
          const updated = [...prev, normalizedMessage];
          // Sort messages by created_at to ensure correct chronological order
          updated.sort((a, b) => {
            const timeA = new Date(a.created_at || 0).getTime();
            const timeB = new Date(b.created_at || 0).getTime();
            return timeA - timeB;
          });
          return updated;
        });
        
        // CRITICAL FIX: Scroll to bottom immediately (don't wait)
        setTimeout(() => scrollToBottom(), 50);
        
        // Mark messages as read when new message arrives (user is viewing chat)
        // Note: currentUserId is already declared above in the socket.on handler
        if (normalizedMessage.sender_id !== currentUserId) {
          // CRITICAL FIX: Mark as read immediately for real-time status updates
          setTimeout(async () => {
            try {
              // Call API endpoint first (it will update database and emit socket events)
              await markMessagesAsRead(conversationId);
              
              // Also emit socket event to ensure backend processes it correctly
              socket.emit('message_read', {
                messageId: normalizedMessage.id,
                conversationId,
              });
            } catch (err) {
              console.error('Mark as read error:', err);
            }
          }, 300);
        } else {
          // For own messages, status will be updated via message_status_update event
          if (normalizedMessage.status === 'sent') {
            console.log('📤 Own message with sent status, waiting for status update');
          }
        }
      });

      // ========== TYPING INDICATOR LISTENER (set up before join) ==========
      socket.on('typing', (data) => {
        console.log('⌨️ Typing event received:', data);
        const currentUserId = user?.id || user?.userId;
        // Only process typing events for this conversation and from other users
        if (data.conversationId === conversationId && data.userId !== currentUserId) {
          setIsTyping(data.isTyping);
          // CRITICAL FIX: Auto-clear typing indicator after 3 seconds if isTyping is true
          if (data.isTyping) {
            // Clear any existing timeout
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }
            // Set new timeout to clear typing indicator
            typingTimeoutRef.current = setTimeout(() => {
              setIsTyping(false);
            }, 3000);
          } else {
            // Clear typing immediately if isTyping is false
            setIsTyping(false);
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = null;
            }
          }
        }
      });

      // ========== ONLINE/OFFLINE STATUS LISTENERS (set up before join) ==========
      // CRITICAL FIX: Use persistent listeners (not 'once') to catch all events
        socket.on('user_online', (data) => {
        console.log('🟢 User online event received:', data);
        // Update status if this is the other user in the conversation
        if (!isGroup && otherUserId && data.userId === otherUserId) {
          console.log('✅ Setting user online:', otherUserId);
            setIsOnline(true);
          }
        });

        socket.on('user_offline', (data) => {
        console.log('🔴 User offline event received:', data);
        // Update status if this is the other user in the conversation
        if (!isGroup && otherUserId && data.userId === otherUserId) {
          console.log('✅ Setting user offline:', otherUserId);
            setIsOnline(false);
          }
        });

        socket.on('user_online_status', (data) => {
        console.log('📡 User online status event received:', data);
        // Update status if this is the other user in the conversation
        if (!isGroup && otherUserId && data.userId === otherUserId) {
          console.log('✅ Setting online status from event:', data.isOnline);
          setIsOnline(data.isOnline === true);
          }
        });

      // ========== STATUS UPDATE LISTENERS (set up before join) ==========

      socket.on('message_status_update', (data) => {
        console.log('📊 Message status update received:', data);
        const currentUserId = user?.id || user?.userId;
        
        setMessages((prev) =>
          prev.map((msg) => {
            // CRITICAL FIX: Update specific message by ID (highest priority)
            if (msg.id === data.messageId) {
              console.log('✅ Updating message status by ID:', {
                messageId: msg.id,
                oldStatus: msg.status,
                newStatus: data.status,
              });
              return { ...msg, status: data.status };
            }
            
            // CRITICAL FIX: Also update status for messages in the same conversation if it's a bulk update
            // Only update messages sent by current user (we don't update other users' messages)
            if (data.conversationId && 
                msg.conversation_id === data.conversationId && 
                (msg.sender_id === currentUserId || msg.senderId === currentUserId)) {
              
              // For read status: Update messages sent by current user that are delivered or sent
              if (data.status === 'read' && msg.status !== 'read') {
                console.log('✅ Bulk updating message to read:', msg.id);
                return { ...msg, status: 'read' };
              }
              
              // For delivered status: Update messages sent by current user that are still 'sent'
              if (data.status === 'delivered' && msg.status === 'sent') {
                console.log('✅ Bulk updating message to delivered:', msg.id);
                return { ...msg, status: 'delivered' };
              }
            }
            return msg;
          })
        );
      });

      // Listen for conversation-level status updates (when all messages are read)
      socket.on('conversation_messages_read', (data) => {
        console.log('Conversation messages read event:', data);
        if (data.conversationId === conversationId) {
          setMessages((prev) =>
            prev.map((msg) => {
              const currentUserId = user?.id || user?.userId;
              const msgSenderId = msg.sender_id || msg.senderId;
              // Mark messages from current user as read if they were delivered or sent
              if (msgSenderId === currentUserId && (msg.status === 'delivered' || msg.status === 'sent')) {
                console.log('Marking message as read:', msg.id);
                return { ...msg, status: 'read' };
              }
              return msg;
            })
          );
        }
      });

      socket.on('message_reaction_added', (data) => {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === data.messageId) {
              const reactions = msg.reactions || [];
              if (!reactions.find(r => r.user_id === data.userId && r.reaction === data.reaction)) {
                return {
                  ...msg,
                  reactions: [...reactions, { user_id: data.userId, reaction: data.reaction }],
                };
              }
            }
            return msg;
          })
        );
      });

      socket.on('message_reaction_removed', (data) => {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === data.messageId) {
              return {
                ...msg,
                reactions: (msg.reactions || []).filter(
                  r => !(r.user_id === data.userId && r.reaction === data.reaction)
                ),
              };
            }
            return msg;
          })
        );
      });

      // ========== NOW JOIN CONVERSATION ROOM (after all listeners are set up) ==========
      socket.emit('join_conversation', conversationId);
      console.log('✅ Joined conversation room:', conversationId);

      // ========== CHECK ONLINE STATUS (after listeners and join) ==========
      // CRITICAL FIX: Check online status immediately after joining room
      // Also set up periodic checks (only for 1-to-1 conversations)
      let onlineCheckInterval = null;
      if (!isGroup && otherUserId) {
        // Check immediately (with small delay to ensure room join is complete)
        setTimeout(() => {
          checkOnlineStatus(otherUserId);
        }, 500);
        
        // Also check periodically
        onlineCheckInterval = setInterval(() => {
          checkOnlineStatus(otherUserId);
        }, 10000); // Check every 10 seconds
      } else if (!isGroup) {
        // If otherUserId is not set yet, check again after a delay
        setTimeout(() => {
          if (otherUserId) {
            checkOnlineStatus(otherUserId);
          }
        }, 2000);
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
      
      // Return cleanup function
      return () => {
        try {
          // Clear online check interval if it exists
          if (onlineCheckInterval) {
            clearInterval(onlineCheckInterval);
            onlineCheckInterval = null;
          }
          
          // Clear temp message cleanup interval
          if (tempMessageCleanupInterval) {
            clearInterval(tempMessageCleanupInterval);
          }
          
          // Leave conversation room
        socket.emit('leave_conversation', conversationId);
          
          // Remove all listeners
        socket.off('new_message');
        socket.off('typing');
        socket.off('message_status_update');
          socket.off('conversation_messages_read');
        socket.off('message_reaction_added');
        socket.off('message_reaction_removed');
          socket.off('user_online');
        socket.off('user_offline');
        socket.off('user_online_status');
        } catch (error) {
          console.error('Socket cleanup error:', error);
        }
      };
    } catch (error) {
      console.error('Socket setup error:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const data = await getMessages(conversationId);
      console.log('Loaded messages from API:', data.length);
      
      // Normalize messages to ensure consistent field names
      const normalizedMessages = data.map((msg) => normalizeMessage(msg)).filter(msg => msg !== null);
      
      // Remove any temp messages when loading from API (they should have been replaced by real messages)
      const currentUserId = user?.id || user?.userId;
      const messagesWithoutTemp = normalizedMessages.filter(msg => {
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
      messagesWithoutTemp.sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return timeA - timeB;
      });
      
      console.log('Normalized and sorted messages:', messagesWithoutTemp.length);
      setMessages(messagesWithoutTemp);
      // Calculate unread count (messages from other users that are not read)
      const unread = messagesWithoutTemp.filter(
        (msg) => {
          const msgSenderId = msg.sender_id || msg.senderId;
          return msgSenderId !== currentUserId && msg.status !== 'read' && !msg.deleted_at;
        }
      ).length;
      setUnreadCount(unread);
      
      // Mark messages as read when they're loaded (user is viewing the chat)
      if (unread > 0) {
        setTimeout(async () => {
          try {
            // Call API endpoint first (it will update database and emit socket events)
            await markMessagesAsRead(conversationId);
            
            // Also emit socket event to ensure backend processes it correctly
            const socket = await waitForSocketConnection();
            socket.emit('message_read', {
              conversationId,
            });
          } catch (error) {
            console.error('Error marking messages as read after load:', error);
          }
        }, 500);
      }
      
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Normalize message object to ensure consistent field names
  const normalizeMessage = (msg) => {
    if (!msg) return null;
    
    const normalized = {
      id: msg.id,
      conversation_id: msg.conversation_id || msg.conversationId,
      sender_id: msg.sender_id || msg.senderId,
      receiver_id: msg.receiver_id || msg.receiverId,
      group_id: msg.group_id || msg.groupId,
      message_type: msg.message_type || msg.messageType,
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
      created_at: msg.created_at || msg.createdAt,
      updated_at: msg.updated_at || msg.updatedAt,
    };
    
    // Debug: Log normalization (will be called during loadMessages)
    // console.log('Normalized message:', {
    //   original: { sender_id: msg.sender_id, senderId: msg.senderId },
    //   normalized: { sender_id: normalized.sender_id },
    //   user: { id: user?.id, userId: user?.userId },
    // });
    
    return normalized;
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && !replyingTo && !editingMessage) return;

    try {
      const socket = await waitForSocketConnection();
      
      if (editingMessage) {
        // Edit existing message
        editMessage(editingMessage.id, inputText.trim()).then(() => {
          socket.emit('send_message', {
            conversationId,
            content: inputText.trim(),
            messageType: 'text',
            isEdit: true,
            messageId: editingMessage.id,
          });
          setEditingMessage(null);
          setInputText('');
        });
      } else {
        // Create optimistic message with temporary ID
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const currentUserId = user?.id || user?.userId;
        const tempMessage = {
          id: tempId,
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: inputText.trim(),
          message_type: 'text',
          status: 'sent', // Initial status
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
        };
        
        // Add optimistic message immediately
        setMessages((prev) => [...prev, normalizeMessage(tempMessage)]);
        setInputText('');
        setReplyingTo(null);
        setTimeout(() => scrollToBottom(), 100);
        
        // Step 1: User types message - Send via socket
        // socket.emit("send_message", { conversationId, text: "Hi bro" })
        socket.emit('send_message', {
          conversationId,
          text: inputText.trim(), // Use 'text' field as per specification
          content: inputText.trim(), // Also include 'content' for compatibility
          messageType: 'text',
          replyToMessageId: replyingTo?.id || null,
        });
        
        // The real message will replace the temp one when received via socket
      }
      
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleTyping = async (text) => {
    setInputText(text);

    try {
      const socket = await waitForSocketConnection();
      const currentUserId = user?.id || user?.userId;
      
      // CRITICAL FIX: Emit typing event with userId included for backend verification
      if (!typing && text.length > 0) {
        setTyping(true);
        socket.emit('typing', { 
          conversationId, 
          isTyping: true,
          userId: currentUserId, // Include userId for backend verification
        });
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(async () => {
        try {
          const stopSocket = await waitForSocketConnection();
        setTyping(false);
          stopSocket.emit('typing', { 
            conversationId, 
            isTyping: false,
            userId: currentUserId, // Include userId for backend verification
          });
        } catch (error) {
          console.error('Error stopping typing:', error);
          setTyping(false);
        }
      }, 2000); // Stop typing after 2 seconds of inactivity
    } catch (error) {
      console.error('Typing indicator error:', error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        sendMediaMessage('image', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
    }
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        sendMediaMessage('video', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Video picker error:', error);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        sendMediaMessage('document', result.assets[0].uri, result.assets[0].name, result.assets[0].size);
      }
    } catch (error) {
      console.error('Document picker error:', error);
    }
  };

  const sendMediaMessage = async (type, uri, fileName = null, fileSize = null) => {
    try {
      const socket = await waitForSocketConnection();
      socket.emit('send_message', {
        conversationId,
        messageType: type,
        mediaUrl: uri,
        fileName,
        fileSize,
        replyToMessageId: replyingTo?.id || null,
      });
      setReplyingTo(null);
    } catch (error) {
      console.error('Send media error:', error);
    }
  };

  const handleLongPress = (message) => {
    setSelectedMessage(message);
  };

  const handleReaction = async (emoji) => {
    if (!selectedMessage) return;
    
    const currentUserId = user?.id || user?.userId;
    const existingReaction = selectedMessage.reactions?.find(
      r => (r.user_id || r.userId) === currentUserId && r.reaction === emoji
    );

    try {
      const socket = await waitForSocketConnection();
      if (existingReaction) {
        await removeReaction(selectedMessage.id, emoji);
        socket.emit('remove_reaction', {
          messageId: selectedMessage.id,
          conversationId,
          reaction: emoji,
        });
      } else {
        await addReaction(selectedMessage.id, emoji);
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

  const handleCopy = () => {
    if (selectedMessage?.content) {
      Clipboard.setString(selectedMessage.content);
      setSelectedMessage(null);
      Alert.alert('Copied', 'Message copied to clipboard');
    }
  };

  const handleReply = () => {
    if (selectedMessage) {
      setReplyingTo(selectedMessage);
      setSelectedMessage(null);
    }
  };

  const handleEdit = () => {
    const currentUserId = user?.id || user?.userId;
    const msgSenderId = selectedMessage?.sender_id || selectedMessage?.senderId;
    if (selectedMessage && msgSenderId === currentUserId) {
      setEditingMessage(selectedMessage);
      setInputText(selectedMessage.content || '');
      setSelectedMessage(null);
    }
  };

  const handleDelete = () => {
    if (!selectedMessage) return;

    Alert.alert(
      'Delete message',
      'Delete for everyone or just for you?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete for me',
          onPress: async () => {
            try {
              await deleteMessage(selectedMessage.id, false);
              setMessages((prev) => prev.filter((msg) => msg.id !== selectedMessage.id));
              setSelectedMessage(null);
            } catch (error) {
              console.error('Delete error:', error);
            }
          },
        },
        {
          text: 'Delete for everyone',
          onPress: async () => {
            try {
              await deleteMessage(selectedMessage.id, true);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === selectedMessage.id
                    ? { ...msg, deleted_at: new Date(), deleted_for_all: true }
                    : msg
                )
              );
              setSelectedMessage(null);
            } catch (error) {
              console.error('Delete error:', error);
            }
          },
        },
      ]
    );
  };

  const handleStar = async () => {
    if (!selectedMessage) return;
    
    try {
      if (selectedMessage.starred) {
        await unstarMessage(selectedMessage.id);
      } else {
        await starMessage(selectedMessage.id);
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

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
    }
  };

  const shouldShowDateSeparator = (currentMessage, previousMessage) => {
    if (!previousMessage) return true;
    const currentDate = new Date(currentMessage.created_at).toDateString();
    const previousDate = new Date(previousMessage.created_at).toDateString();
    return currentDate !== previousDate;
  };

  const renderMessage = ({ item, index }) => {
    // Ensure we're comparing the right fields - normalize both
    const messageSenderId = item.sender_id || item.senderId;
    const currentUserId = user?.id || user?.userId;
    const isMyMessage = messageSenderId === currentUserId;
    
    // Debug logging for first and last messages (enable for debugging)
    if (index === 0 || index === messages.length - 1) {
      console.log('🔵 Message render:', {
        messageId: item.id,
        messageSenderId: String(messageSenderId),
        currentUserId: String(currentUserId),
        isMyMessage,
        hasContent: !!item.content,
        messageType: item.message_type,
        status: item.status,
        match: messageSenderId === currentUserId,
      });
    }
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showDateSeparator = shouldShowDateSeparator(item, previousMessage);
    
    // CRITICAL FIX: Message lifecycle: sent (✓) → delivered (✓✓) → read (✓✓ blue)
    // Status can be: 'sent', 'delivered', 'read', or undefined
    const messageStatus = item.status || 'sent';
    
    // Determine status icon and color based on message status
    // Only show status indicators for messages sent by current user
    let statusIcon = null;
    let statusColor = TEXT_SECONDARY; // Default gray color
    
    if (isMyMessage) {
      if (messageStatus === 'read') {
        statusIcon = '✓✓'; // Double tick for read
        statusColor = READ_INDICATOR; // Blue/purple color for read (using READ_INDICATOR constant)
      } else if (messageStatus === 'delivered') {
        statusIcon = '✓✓'; // Double tick for delivered
        statusColor = TEXT_SECONDARY; // Gray color for delivered
      } else {
        statusIcon = '✓'; // Single tick for sent
        statusColor = TEXT_SECONDARY; // Gray color for sent
      }
    }
    
    const isRead = messageStatus === 'read' && isMyMessage;
    const isDelivered = messageStatus === 'delivered' && isMyMessage;

    if (item.deleted_at && item.deleted_for_all) {
      return (
        <View style={styles.messageContainer}>
          {showDateSeparator && (
            <View style={styles.dateSeparator}>
              <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
            </View>
          )}
          <View style={styles.deletedMessage}>
            <Text style={styles.deletedText}>This message was deleted</Text>
          </View>
        </View>
      );
    }

    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        )}
        
        <View style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
        ]}>
        <Pressable
          onLongPress={() => handleLongPress(item)}
          style={[
            styles.messageWrapper,
            isMyMessage ? styles.myMessage : styles.otherMessage,
          ]}
        >
          {item.reply_to && (
            <View style={styles.replyPreview}>
              <View style={styles.replyLine} />
              <View style={styles.replyContent}>
                <Text style={styles.replySender}>{item.reply_to.sender_name}</Text>
                <Text style={styles.replyText} numberOfLines={1}>
                  {item.reply_to.content || `Sent a ${item.reply_to.message_type}`}
                </Text>
              </View>
            </View>
          )}

          {!isMyMessage && (
            <Text style={styles.senderName}>{item.sender_name}</Text>
          )}

          {item.message_type === 'image' && item.media_url && (
            <Image source={{ uri: item.media_url }} style={styles.mediaImage} />
          )}

          {item.message_type === 'video' && item.media_url && (
            <View style={styles.mediaVideo}>
              <Image source={{ uri: item.media_thumbnail }} style={styles.mediaImage} />
              <View style={styles.playButton}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
            </View>
          )}

          {item.message_type === 'document' && (
            <View style={styles.documentContainer}>
              <Text style={styles.documentIcon}>📄</Text>
              <View style={styles.documentInfo}>
                <Text style={styles.documentName} numberOfLines={1}>
                  {item.file_name || 'Document'}
                </Text>
                {item.file_size && (
                  <Text style={styles.documentSize}>
                    {(item.file_size / 1024).toFixed(1)} KB
                  </Text>
                )}
              </View>
            </View>
          )}

          {item.content && (
            <View
              style={[
                styles.messageBubble,
                isMyMessage ? styles.myBubble : styles.otherBubble,
              ]}
            >
              {item.edited_at && (
                <Text style={styles.editedLabel}>Edited</Text>
              )}
              <Text
                style={[
                  styles.messageText,
                  isMyMessage ? styles.myMessageText : styles.otherMessageText,
                ]}
              >
                {item.content}
              </Text>
              <View style={styles.messageFooter}>
                <Text
                  style={[
                    styles.messageTime,
                    isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
                  ]}
                >
                  {formatTime(item.created_at)}
                </Text>
                {isMyMessage && statusIcon && (
                  <View style={styles.statusContainer}>
                    <Text style={[
                      styles.statusIcon,
                      { color: statusColor } // CRITICAL FIX: Use dynamic color based on status
                    ]}>
                    {statusIcon}
                  </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {item.reactions && item.reactions.length > 0 && (
            <View style={styles.reactionsContainer}>
              {item.reactions.map((reaction, idx) => (
                <View key={idx} style={styles.reaction}>
                  <Text style={styles.reactionEmoji}>{reaction.reaction}</Text>
                </View>
              ))}
            </View>
          )}
        </Pressable>
        </View>
      </View>
    );
  };

  const commonEmojis = ['❤️', '😂', '😮', '😢', '🙏', '👍'];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerCenter}
            activeOpacity={0.8}
            onPress={() => {
              // Navigate to user profile for 1-to-1 chats
              if (!isGroup && !isTaskGroup && otherUserId) {
                navigation.navigate('UserProfile', { userId: otherUserId });
              }
              // Navigate to task details for task groups
              else if (isTaskGroup && taskId) {
                navigation.navigate('TaskDetail', { taskId });
              }
            }}
          >
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>
                {conversationName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.headerTitleContainer}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {conversationName}
                </Text>
                {unreadCount > 0 && (
                  <View style={styles.headerUnreadBadge}>
                    <Text style={styles.headerUnreadText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
              {isTyping ? (
                <View style={[styles.headerSubtitle, { flexDirection: 'row', alignItems: 'center' }]}>
                  <Text style={styles.typingText}>typing</Text>
                  <View style={[styles.typingDots, { marginLeft: 4 }]}>
                    <Text style={styles.typingDot}>.</Text>
                    <Text style={styles.typingDot}>.</Text>
                    <Text style={styles.typingDot}>.</Text>
                  </View>
                </View>
              ) : unreadCount > 0 ? (
              <Text style={styles.headerSubtitle}>
                  {`${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`}
              </Text>
              ) : isOnline && !isGroup ? (
                <View style={[styles.headerSubtitle, { flexDirection: 'row', alignItems: 'center' }]}>
                  <View style={styles.onlineIndicator} />
                  <Text style={styles.onlineText}>online</Text>
                </View>
              ) : !isGroup ? (
                <Text style={styles.headerSubtitle}>
                  <Text style={styles.offlineText}>offline</Text>
                </Text>
              ) : (
                <Text style={styles.headerSubtitle}></Text>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {/* More options placeholder */}}>
            <Text style={styles.headerIcon}>⋮</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={scrollToBottom}
          keyboardShouldPersistTaps="handled"
        />

        {replyingTo && (
          <View style={styles.replyBar}>
            <View style={styles.replyBarContent}>
              <View style={styles.replyBarLine} />
              <View style={styles.replyBarInfo}>
                <Text style={styles.replyBarSender}>{replyingTo.sender_name}</Text>
                <Text style={styles.replyBarText} numberOfLines={1}>
                  {replyingTo.content || `Sent a ${replyingTo.message_type}`}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Text style={styles.replyBarClose}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {editingMessage && (
          <View style={styles.editBar}>
            <Text style={styles.editBarText}>Editing message</Text>
            <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(''); }}>
              <Text style={styles.editBarClose}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton} onPress={() => {
            Alert.alert('Attach', 'Choose an option', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Photo', onPress: pickImage },
              { text: 'Video', onPress: pickVideo },
              { text: 'Document', onPress: pickDocument },
            ]);
          }}>
            <Text style={styles.attachIcon}>📎</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={handleTyping}
            placeholder={editingMessage ? "Edit message..." : "Type a message..."}
            multiline
            maxLength={1000}
          />
          {inputText.trim() || replyingTo || editingMessage ? (
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.emojiButton} onPress={() => setShowEmojiPicker(!showEmojiPicker)}>
              <Text style={styles.emojiIcon}>😊</Text>
            </TouchableOpacity>
          )}
        </View>

        <Modal
          visible={showEmojiPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEmojiPicker(false)}
        >
          <Pressable style={styles.emojiModal} onPress={() => setShowEmojiPicker(false)}>
            <View style={styles.emojiPicker}>
              <Text style={styles.emojiPickerTitle}>Add reaction</Text>
              <View style={styles.emojiGrid}>
                {commonEmojis.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.emojiOption}
                    onPress={() => handleReaction(emoji)}
                  >
                    <Text style={styles.emojiOptionText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Pressable>
        </Modal>

        <Modal
          visible={!!selectedMessage}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedMessage(null)}
        >
          <Pressable style={styles.actionModal} onPress={() => setSelectedMessage(null)}>
            <View style={styles.actionSheet}>
              <TouchableOpacity style={styles.actionItem} onPress={handleReply}>
                <Text style={styles.actionText}>Reply</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionItem} onPress={handleCopy}>
                <Text style={styles.actionText}>Copy</Text>
              </TouchableOpacity>
              {(selectedMessage?.sender_id || selectedMessage?.senderId) === (user?.id || user?.userId) && (
                <>
                  <TouchableOpacity style={styles.actionItem} onPress={handleEdit}>
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionItem} onPress={handleDelete}>
                    <Text style={styles.actionText}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={styles.actionItem} onPress={handleStar}>
                <Text style={styles.actionText}>
                  {selectedMessage?.starred ? 'Unstar' : 'Star'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionItem} onPress={() => setShowEmojiPicker(true)}>
                <Text style={styles.actionText}>React</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionItem, styles.actionCancel]}
                onPress={() => setSelectedMessage(null)}
              >
                <Text style={styles.actionCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CHAT_BG,
  },
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: PRIMARY_COLOR,
    elevation: 4,
  },
  backButton: {
    fontSize: 26,
    color: '#FFFFFF',
    paddingRight: 12,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    maxWidth: 180,
    marginRight: 8,
  },
  headerUnreadBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerUnreadText: {
    color: PRIMARY_COLOR,
    fontSize: 12,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  headerIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    paddingLeft: 12,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  messageContainer: {
    marginBottom: 4,
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    fontWeight: '500',
  },
  messageWrapper: {
    maxWidth: '75%',
    minWidth: 60,
  },
  myMessage: {
    // Messages align to right via parent container
  },
  otherMessage: {
    // Messages align to left via parent container
  },
  senderName: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 4,
    marginLeft: 10,
    fontWeight: '600',
  },
  replyPreview: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY_COLOR,
  },
  replyLine: {
    width: 3,
    backgroundColor: PRIMARY_COLOR,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replySender: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  replyText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: BUBBLE_OUTGOING,
    borderBottomRightRadius: 4,
    borderColor: PRIMARY_LIGHT,
  },
  otherBubble: {
    backgroundColor: BUBBLE_INCOMING,
    borderBottomLeftRadius: 4,
    borderColor: BORDER_COLOR,
  },
  editedLabel: {
    fontSize: 10,
    color: TEXT_SECONDARY,
    fontStyle: 'italic',
    marginBottom: 2,
  },
      messageText: {
        fontSize: 16,
        lineHeight: 22,
        fontWeight: '500',
      },
      myMessageText: {
        color: TEXT_PRIMARY,
      },
      otherMessageText: {
        color: TEXT_PRIMARY,
      },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: 11,
    marginRight: 4,
  },
  myMessageTime: {
    color: TEXT_SECONDARY,
  },
  statusContainer: {
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: '600',
  },
  deliveredIcon: {
    color: TEXT_SECONDARY,
  },
  readIcon: {
    color: PRIMARY_COLOR,
  },
  onlineStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  onlineText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
  },
  offlineText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
  },
  typingText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    marginHorizontal: 1,
  },
  otherMessageTime: {
    color: TEXT_SECONDARY,
  },
  deliveredIcon: {
    color: TEXT_SECONDARY,
  },
      readIcon: {
    color: PRIMARY_COLOR,
      },
  mediaImage: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 8,
    marginBottom: 4,
  },
  mediaVideo: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 8,
    marginBottom: 4,
    position: 'relative',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: BUBBLE_INCOMING,
    borderRadius: 8,
    marginBottom: 4,
  },
  documentIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  documentSize: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
  deletedMessage: {
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    alignSelf: 'center',
  },
  deletedText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontStyle: 'italic',
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginLeft: 10,
  },
  reaction: {
    backgroundColor: BUBBLE_INCOMING,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E1E4E8',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  typingIndicator: {
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  typingText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontStyle: 'italic',
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BG,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  replyBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyBarLine: {
    width: 3,
    height: 40,
    backgroundColor: PRIMARY_COLOR,
    marginRight: 8,
  },
  replyBarInfo: {
    flex: 1,
  },
  replyBarSender: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  replyBarText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  replyBarClose: {
    fontSize: 18,
    color: TEXT_SECONDARY,
    paddingLeft: 12,
  },
  editBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BG,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  editBarText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontStyle: 'italic',
  },
  editBarClose: {
    fontSize: 18,
    color: TEXT_SECONDARY,
  },
      inputContainer: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: CARD_BG,
        borderTopWidth: 1,
        borderTopColor: BORDER_COLOR,
        alignItems: 'flex-end',
      },
  attachButton: {
    padding: 8,
    marginRight: 4,
  },
  attachIcon: {
    fontSize: 24,
  },
      input: {
        flex: 1,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginRight: 10,
        maxHeight: 100,
        fontSize: 16,
        fontWeight: '500',
        backgroundColor: '#FFFFFF',
      },
      sendButton: {
        backgroundColor: PRIMARY_COLOR,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 24,
        shadowColor: SHADOW_COLOR,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 2,
      },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emojiButton: {
    padding: 8,
  },
  emojiIcon: {
    fontSize: 24,
  },
  emojiModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  emojiPicker: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  emojiPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  emojiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  emojiOption: {
    padding: 12,
  },
  emojiOptionText: {
    fontSize: 32,
  },
  actionModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  actionItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E1E4E8',
  },
  actionText: {
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  actionCancel: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  actionCancelText: {
    fontSize: 16,
    color: '#F15B5B',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ChatScreen;
