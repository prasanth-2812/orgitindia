import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Image,
  Modal,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { getConversations, pinConversation, createConversation } from '../services/conversationService';
import { matchContactsWithUsers } from '../services/contactService';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { waitForSocketConnection } from '../services/socket';

// Corporate Purple Theme
const PRIMARY_COLOR = '#7C3AED'; // Purple
const PRIMARY_LIGHT = '#A78BFA'; // Light purple
const LIGHT_BG = '#F9FAFB'; // Light grey background
const CARD_BG = '#F9FAFB'; // White
const TEXT_PRIMARY = '#1F2937'; // Dark text
const TEXT_SECONDARY = '#6B7280'; // Medium grey
const BORDER_COLOR = '#E5E7EB'; // Light border
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.05)'; // Minimal shadow

const ConversationsScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatUsers, setNewChatUsers] = useState([]);
  const [filteredNewChatUsers, setFilteredNewChatUsers] = useState([]);
  const [newChatSearchQuery, setNewChatSearchQuery] = useState('');
  const [newChatLoading, setNewChatLoading] = useState(false);
  const [syncingContacts, setSyncingContacts] = useState(false);
  const { user, logout } = useAuth();
  const { updateCounts, updateChatCount } = useNotifications();

  useEffect(() => {
    loadConversations();
    
    // Setup socket listeners after a small delay to ensure socket is connected
    const socketTimer = setTimeout(() => {
      setupSocketListeners();
    }, 500);
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadConversations();
      // Re-setup socket listeners when screen comes into focus
      setupSocketListeners();
      // Update notification counts when screen comes into focus
      updateCounts();
    });

    return () => {
      clearTimeout(socketTimer);
      cleanupSocketListeners();
      unsubscribe();
    };
  }, [navigation, user]);

  useEffect(() => {
    if (newChatSearchQuery.trim() === '') {
      setFilteredNewChatUsers(newChatUsers);
    } else {
      const filtered = newChatUsers.filter(
        (user) =>
          user.name.toLowerCase().includes(newChatSearchQuery.toLowerCase()) ||
          (user.mobile || user.phone || '').includes(newChatSearchQuery)
      );
      setFilteredNewChatUsers(filtered);
    }
  }, [newChatSearchQuery, newChatUsers]);

  const loadConversations = async () => {
    try {
      const data = await getConversations();

      // Normalize backend conversation shape into what the UI expects
      const normalizedData = data.map((conv) => {
        // Backend fields (from conversationService): 
        // conversationId, type ('direct'|'group'), otherUserId, groupId, name, photoUrl,
        // lastMessage, unreadCount, isPinned, updatedAt
        const isGroup = conv.type === 'group';

        // Build last_message object compatible with UI helpers
        let lastMessage = null;
        if (conv.lastMessage) {
          lastMessage = {
            id: conv.lastMessage.id,
            content: conv.lastMessage.content || '',
            message_type: conv.lastMessage.messageType || 'text',
            sender_id: conv.lastMessage.senderId,
            sender_name: conv.lastMessage.senderName,
            created_at: conv.lastMessage.createdAt,
            deleted_at: null,
            deleted_for_all: false,
          };
        }

        // For direct conversations, create a minimal other_members array
        let otherMembers = conv.other_members || [];
        if (!isGroup && (!otherMembers || otherMembers.length === 0)) {
          if (conv.otherUserId && conv.name) {
            otherMembers = [
              {
                id: conv.otherUserId,
                name: conv.name,
                profile_photo_url: conv.photoUrl || null,
              },
            ];
          }
        }

        return {
          ...conv,
          // Core identifiers
          id: conv.conversationId || conv.id,
          is_group: isGroup,
          is_task_group: conv.is_task_group || false,

          // Naming / avatar
          name: conv.name,
          other_members: otherMembers,
          group_photo: conv.photoUrl || conv.group_photo,

          // Last message info
          last_message: lastMessage,
          last_message_time: conv.lastMessage?.createdAt || conv.updatedAt || conv.last_message_time,

          // Pinned / unread
          is_pinned: typeof conv.isPinned === 'boolean' ? conv.isPinned : !!conv.is_pinned,
          unread_count: Number(conv.unreadCount ?? conv.unread_count) || 0,
        };
      });

      const sorted = sortConversations(normalizedData);
      setConversations(sorted);
      setFilteredConversations(sorted);
      // Update chat count after loading conversations
      updateChatCount();
    } catch (error) {
      console.error('Load conversations error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const sortConversations = (data) => {
    // Create a copy to avoid mutating the original array
    return [...data].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const aTime = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
      const bTime = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
      return bTime - aTime;
    });
  };

  const setupSocketListeners = async () => {
    try {
      // CRITICAL FIX: Wait for socket connection instead of infinite retry
      const socket = await waitForSocketConnection();
      console.log('✅ Socket connected in ConversationsScreen');
      
      // Remove existing listeners to avoid duplicates
      socket.off('new_message');
      socket.off('message_status_update');
      socket.off('conversation_messages_read');

      console.log('Setting up socket listeners in ConversationsScreen');

      // CRITICAL FIX: Listen for new messages (listen globally, not just in conversation rooms)
      socket.on('new_message', (message) => {
        console.log('📨 New message received in ConversationsScreen:', {
          conversationId: message.conversation_id,
          senderId: message.sender_id,
          userId: user?.id,
          status: message.status,
          messageId: message.id,
          content: message.content?.substring(0, 30),
        });
        
        // Ensure message has required fields
        if (!message.conversation_id || !message.id) {
          console.warn('⚠️ Invalid message received, skipping:', message);
          return;
        }
        
        // CRITICAL FIX: Update conversation immediately for real-time updates
        updateConversationWithNewMessage(message);
        // Update chat notification count in real-time
        updateChatCount();
      });

      // Listen for message status updates (when messages are read)
      socket.on('message_status_update', (data) => {
        console.log('📊 Message status update in ConversationsScreen:', data);
        if (data.status === 'read' && data.conversationId) {
          updateConversationUnreadCount(data.messageId, data.conversationId);
          // Update chat notification count in real-time
          updateChatCount();
        }
        
        // Also update the last message status in the conversation list
        if (data.conversationId && data.messageId) {
          setConversations((prev) => {
            const updated = prev.map((conv) => {
              if (conv.id === data.conversationId) {
                const lastMsg = conv.last_message;
                if (lastMsg && typeof lastMsg === 'object' && lastMsg.id === data.messageId) {
                  return {
                    ...conv,
                    last_message: {
                      ...lastMsg,
                      status: data.status,
                    },
                  };
                }
              }
              return conv;
            });
            const sorted = sortConversations(updated);
            setFilteredConversations((prevFiltered) => {
              const currentSearchQuery = searchQuery;
              if (currentSearchQuery.trim()) {
                const lower = currentSearchQuery.toLowerCase();
                return sorted.filter((conv) => {
                  const name = getConversationName(conv).toLowerCase();
                  const lastMsg = typeof conv.last_message === 'string' 
                    ? conv.last_message.toLowerCase()
                    : (conv.last_message?.content || '').toLowerCase();
                  return name.includes(lower) || lastMsg.includes(lower);
                });
              }
              return sorted;
            });
            return sorted;
          });
        }
      });

      // Listen for bulk read updates (when all messages in a conversation are marked as read)
      socket.on('conversation_messages_read', (data) => {
        console.log('Conversation messages read:', data);
        if (data.conversationId) {
          // Clear unread count for this conversation
          setConversations((prev) => {
            // Use a Map to ensure no duplicates
            const conversationMap = new Map();
            
            // First, add all existing conversations to the map
            prev.forEach((conv) => {
              conversationMap.set(conv.id, conv);
            });
            
            // Update the conversation if it exists
            if (conversationMap.has(data.conversationId)) {
              const conv = conversationMap.get(data.conversationId);
              conversationMap.set(data.conversationId, {
                ...conv,
                unread_count: 0, // Explicitly set to number 0
              });
            }
            
            // Convert map back to array and sort
            const updated = Array.from(conversationMap.values());
            const sorted = sortConversations(updated);
            
            setFilteredConversations((prevFiltered) => {
              const currentSearchQuery = searchQuery;
              if (currentSearchQuery.trim()) {
                const lower = currentSearchQuery.toLowerCase();
                return sorted.filter((conv) => {
                  const name = getConversationName(conv).toLowerCase();
                  const lastMsg = typeof conv.last_message === 'string' 
                    ? conv.last_message.toLowerCase()
                    : (conv.last_message?.content || '').toLowerCase();
                  return name.includes(lower) || lastMsg.includes(lower);
                });
              }
              return sorted;
            });
            return sorted;
          });
          // Update chat notification count in real-time
          updateChatCount();
        }
      });
    } catch (error) {
      console.error('Socket setup error:', error);
      // Try to initialize socket if it's not initialized
      if (error.message && (error.message.includes('not initialized') || error.message.includes('timeout'))) {
        import('../services/socket').then(({ initSocket, waitForSocketConnection }) => {
          initSocket().then(() => {
            // Retry setup after initialization
            setTimeout(() => {
              setupSocketListeners();
            }, 1000);
          }).catch((err) => {
            console.error('Failed to initialize socket:', err);
          });
        });
      }
    }
  };

  const cleanupSocketListeners = () => {
    // Cleanup should be non-blocking and handle errors gracefully
    // Use the already imported waitForSocketConnection if available
    waitForSocketConnection()
      .then((socket) => {
        if (socket) {
          socket.off('new_message');
          socket.off('message_status_update');
          socket.off('conversation_messages_read');
        }
      })
      .catch(() => {
        // Socket not available during cleanup, that's okay
        // This is expected if socket was never connected or was disconnected
      });
  };

  // Track processed messages to avoid duplicates
  const processedMessagesRef = useRef(new Set());

  const updateConversationWithNewMessage = (message) => {
    // Skip if we've already processed this message
    if (processedMessagesRef.current.has(message.id)) {
      return;
    }
    
    // Mark message as processed
    processedMessagesRef.current.add(message.id);
    
    // Clean up old message IDs (keep only last 100)
    if (processedMessagesRef.current.size > 100) {
      const ids = Array.from(processedMessagesRef.current);
      processedMessagesRef.current = new Set(ids.slice(-50));
    }
    
    setConversations((prev) => {
      // Use a Map to ensure no duplicates
      const conversationMap = new Map();
      
      // First, add all existing conversations to the map
      prev.forEach((conv) => {
        conversationMap.set(conv.id, conv);
      });
      
      // Update the conversation if it exists
      if (conversationMap.has(message.conversation_id)) {
        const conv = conversationMap.get(message.conversation_id);
        // Check if this is a newer message
        const currentTime = conv.last_message_time ? new Date(conv.last_message_time).getTime() : 0;
        const newTime = message.created_at ? new Date(message.created_at).getTime() : 0;

        if (newTime >= currentTime) {
          // Update unread count if message is from another user and not read
          const unreadIncrement = message.sender_id !== user.id && message.status !== 'read' ? 1 : 0;
          
          // Ensure unread_count is a number to prevent string concatenation
          const currentUnreadCount = Number(conv.unread_count) || 0;
          const newUnreadCount = currentUnreadCount + unreadIncrement;
          
          conversationMap.set(message.conversation_id, {
            ...conv,
            last_message: {
              id: message.id,
              content: message.content,
              message_type: message.message_type,
              sender_id: message.sender_id,
              sender_name: message.sender_name,
              status: message.status,
              created_at: message.created_at,
              deleted_at: message.deleted_at,
              deleted_for_all: message.deleted_for_all,
            },
            last_message_time: message.created_at,
            unread_count: newUnreadCount,
          });
        }
      } else {
        // If conversation not found, reload conversations (might be a new conversation)
        loadConversations();
        return prev;
      }

      // Convert map back to array and sort
      const updated = Array.from(conversationMap.values());
      const sorted = sortConversations(updated);
      
      // Update filtered list maintaining search filter
      setFilteredConversations((prevFiltered) => {
        const currentSearchQuery = searchQuery;
        if (currentSearchQuery.trim()) {
          const lower = currentSearchQuery.toLowerCase();
          return sorted.filter((conv) => {
            const name = getConversationName(conv).toLowerCase();
            const lastMsg = typeof conv.last_message === 'string' 
              ? conv.last_message.toLowerCase()
              : (conv.last_message?.content || '').toLowerCase();
            return name.includes(lower) || lastMsg.includes(lower);
          });
        }
        return sorted;
      });
      
      return sorted;
    });
  };

  const updateConversationUnreadCount = (messageId, conversationId) => {
    setConversations((prev) => {
      // Use a Map to ensure no duplicates
      const conversationMap = new Map();
      
      // First, add all existing conversations to the map
      prev.forEach((conv) => {
        conversationMap.set(conv.id, conv);
      });
      
      // Update the conversation if it exists
      if (conversationMap.has(conversationId)) {
        const conv = conversationMap.get(conversationId);
        // If we have a specific messageId, check if it's the last message
        const lastMsg = typeof conv.last_message === 'object' ? conv.last_message : null;
        if (lastMsg && lastMsg.id === messageId && lastMsg.sender_id !== user.id) {
          // Decrease unread count for this specific message
          // Ensure unread_count is a number to prevent string concatenation
          const currentUnreadCount = Number(conv.unread_count) || 0;
          const newUnreadCount = Math.max(0, currentUnreadCount - 1);
          conversationMap.set(conversationId, {
            ...conv,
            unread_count: newUnreadCount,
            last_message: {
              ...lastMsg,
              status: 'read',
            },
          });
        } else if (!messageId) {
          // If no messageId provided, it means all messages in conversation were marked as read
          // Recalculate unread count (should be 0 if all are read)
          const lastMsg = typeof conv.last_message === 'object' ? conv.last_message : null;
          if (lastMsg && lastMsg.sender_id !== user.id && lastMsg.status === 'read') {
            conversationMap.set(conversationId, {
              ...conv,
              unread_count: 0,
              last_message: {
                ...lastMsg,
                status: 'read',
              },
            });
          }
        }
      }
      
      // Convert map back to array and sort
      const updated = Array.from(conversationMap.values());
      const sorted = sortConversations(updated);
      
      // Update filtered list maintaining search filter
      setFilteredConversations((prevFiltered) => {
        const currentSearchQuery = searchQuery;
        if (currentSearchQuery.trim()) {
          const lower = currentSearchQuery.toLowerCase();
          return sorted.filter((conv) => {
            const name = getConversationName(conv).toLowerCase();
            const lastMsg = typeof conv.last_message === 'string' 
              ? conv.last_message.toLowerCase()
              : (conv.last_message?.content || '').toLowerCase();
            return name.includes(lower) || lastMsg.includes(lower);
          });
        }
        return sorted;
      });
      
      return sorted;
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const lower = text.toLowerCase();
    const filtered = conversations.filter((conv) => {
      const name = getConversationName(conv).toLowerCase();
      const lastMessage = (conv.last_message || '').toLowerCase();
      return name.includes(lower) || lastMessage.includes(lower);
    });
    setFilteredConversations(filtered);
  };

  const handlePin = async (conversationId, isPinned) => {
    try {
      await pinConversation(conversationId, !isPinned);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, is_pinned: !isPinned } : conv
        )
      );
      setFilteredConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, is_pinned: !isPinned } : conv
        )
      );
    } catch (error) {
      console.error('Pin error:', error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    if (minutes < 10080) return `${Math.floor(minutes / 1440)}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getConversationName = (conversation) => {
    // Task groups have a specific name format
    if (conversation.is_task_group && conversation.name) {
      // Remove "Task: " prefix if present
      return conversation.name.replace(/^Task:\s*/i, '');
    }
    if (conversation.is_group && conversation.name) {
      return conversation.name;
    }
    if (conversation.other_members && conversation.other_members.length > 0) {
      return conversation.other_members[0].name;
    }
    return 'Unknown';
  };

  const getAvatarInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getLastMessagePreview = (conversation) => {
    if (!conversation.last_message) {
      // For task groups, show a default message
      if (conversation.is_task_group) {
        return 'Task group created';
      }
      return 'No messages yet';
    }
    
    // Handle both string (old format) and object (new format)
    const lastMsg = typeof conversation.last_message === 'string' 
      ? { content: conversation.last_message, message_type: 'text' }
      : conversation.last_message;
    
    if (!lastMsg) {
      if (conversation.is_task_group) {
        return 'Task group created';
      }
      return 'No messages yet';
    }
    
    // Check if message was deleted
    if (lastMsg.deleted_at && lastMsg.deleted_for_all) {
      return 'This message was deleted';
    }
    
    // Handle different message types
    if (lastMsg.message_type === 'image') return '📷 Photo';
    if (lastMsg.message_type === 'video') return '🎥 Video';
    if (lastMsg.message_type === 'audio' || lastMsg.message_type === 'voice') return '🎤 Audio';
    if (lastMsg.message_type === 'document') return '📄 Document';
    if (lastMsg.message_type === 'location') return '📍 Location';
    if (lastMsg.message_type === 'contact') return '👤 Contact';
    
    // For text messages, show content or sender name prefix for group chats
    if (lastMsg.content) {
      if ((conversation.is_group || conversation.is_task_group) && lastMsg.sender_name && lastMsg.sender_id !== user.id) {
        return `${lastMsg.sender_name}: ${lastMsg.content}`;
      }
      return lastMsg.content;
    }
    
    // Fallback
    return lastMsg.message_type ? `Sent a ${lastMsg.message_type}` : 'Message';
  };

  const requestContactsPermissionAndSync = async () => {
    try {
      setNewChatLoading(true);
      
      // Request contacts permission
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant contacts permission to sync your contacts.',
          [{ text: 'OK' }]
        );
        setNewChatLoading(false);
        return;
      }

      // Sync contacts and load app users
      await syncAndLoadContacts();
    } catch (error) {
      console.error('Permission error:', error);
      Alert.alert('Error', 'Failed to request contacts permission');
      setNewChatLoading(false);
    }
  };

  const syncAndLoadContacts = async () => {
    try {
      setSyncingContacts(true);
      
      // Get device contacts
      const { data: deviceContacts } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });

      // Format contacts for backend
      const formattedContacts = deviceContacts
        .filter((contact) => contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .map((contact) => {
          const phoneNumbers = contact.phoneNumbers.map(p => p.number);
          return {
            name: contact.name || 'Unknown',
            phone: phoneNumbers[0],
            allPhones: phoneNumbers,
          };
        })
        .filter((contact) => contact.phone && contact.phone.replace(/\D/g, '').length >= 10);

      // Match device contacts with registered users
      const matchedUsers = await matchContactsWithUsers(formattedContacts);
      
      setNewChatUsers(matchedUsers);
      setFilteredNewChatUsers(matchedUsers);
    } catch (error) {
      console.error('Match contacts error:', error);
      Alert.alert('Error', 'Failed to match contacts. Please try again.');
    } finally {
      setNewChatLoading(false);
      setSyncingContacts(false);
    }
  };

  const handleNewChatUserSelect = async (selectedUser) => {
    try {
      const conversationId = await createConversation(selectedUser.id);
      setShowNewChatModal(false);
      setNewChatSearchQuery('');
      navigation.navigate('Chat', {
        conversationId,
        conversationName: selectedUser.name,
      });
      // Reload conversations to show the new one
      loadConversations();
    } catch (error) {
      console.error('Create conversation error:', error);
      Alert.alert('Error', 'Failed to create conversation. Please try again.');
    }
  };

  const renderNewChatUser = ({ item }) => {
    const displayPhone = item.mobile || item.phone || '';
    const formattedPhone = displayPhone.replace(/^\+91/, '');
    
    return (
      <TouchableOpacity
        style={styles.modalUserItem}
        onPress={() => handleNewChatUserSelect(item)}
      >
        <View style={styles.modalAvatar}>
          {item.profilePhotoUrl ? (
            <Image source={{ uri: item.profilePhotoUrl }} style={styles.modalAvatarImage} />
          ) : (
            <Text style={styles.modalAvatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.modalUserInfo}>
          <Text style={styles.modalUserName}>{item.name}</Text>
          <Text style={styles.modalUserPhone}>{formattedPhone}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderConversation = ({ item }) => {
    const name = getConversationName(item);
    const lastMessage = getLastMessagePreview(item);
    // Ensure unread_count is always a number
    const unreadCount = Number(item.unread_count) || 0;
    const isPinned = item.is_pinned || false;
    
    return (
      <TouchableOpacity
        style={[styles.conversationItem, isPinned && styles.pinnedItem]}
        onPress={() =>
          navigation.navigate('Chat', {
            conversationId: item.id,
            conversationName: name,
            isGroup: item.is_group || item.is_task_group,
          })
        }
        activeOpacity={0.7}
      >
        {isPinned && <View style={styles.pinIndicator} />}
        <View style={styles.avatar}>
          {item.is_task_group ? (
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
          ) : item.is_group && item.group_photo ? (
            <Image source={{ uri: item.group_photo }} style={styles.avatarImage} />
          ) : item.other_members && item.other_members.length > 0 && item.other_members[0].profile_photo_url ? (
            <Image source={{ uri: item.other_members[0].profile_photo_url }} style={styles.avatarImage} />
          ) : item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{getAvatarInitials(name)}</Text>
          )}
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.timeText}>
              {item.last_message_time ? formatTime(item.last_message_time) : ''}
            </Text>
          </View>
          <View style={styles.messageRow}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {lastMessage}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <StatusBar style="light" />

        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <TouchableOpacity
              style={styles.headerAvatar}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.headerAvatarText}>
                {user?.name ? getAvatarInitials(user.name) : 'U'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.appTitle}>ORGIT</Text>
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={() => {/* Search */}}
              activeOpacity={0.7}
            >
              <Ionicons name="search-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={() => {
                setShowNewChatModal(true);
                requestContactsPermissionAndSync();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={() => {/* More options */}}
              activeOpacity={0.7}
            >
              <Ionicons name="ellipsis-vertical-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search or start new chat"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        {filteredConversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => {
                setShowNewChatModal(true);
                requestContactsPermissionAndSync();
              }}
            >
              <Text style={styles.emptyButtonText}>Start a conversation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredConversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}

        {/* New Chat Modal - Overlay Style */}
        <Modal
          visible={showNewChatModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => {
            setShowNewChatModal(false);
            setNewChatSearchQuery('');
          }}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => {
                setShowNewChatModal(false);
                setNewChatSearchQuery('');
              }}
            />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>New Chat</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => {
                    setShowNewChatModal(false);
                    setNewChatSearchQuery('');
                  }}
                >
                  <Ionicons name="close" size={24} color={TEXT_PRIMARY} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search users..."
                placeholderTextColor={TEXT_SECONDARY}
                value={newChatSearchQuery}
                onChangeText={setNewChatSearchQuery}
                autoCapitalize="none"
              />

              {newChatLoading ? (
                <View style={styles.modalCenterContainer}>
                  <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                  {syncingContacts && (
                    <Text style={styles.modalSyncingText}>Syncing contacts...</Text>
                  )}
                </View>
              ) : filteredNewChatUsers.length === 0 ? (
                <View style={styles.modalEmptyContainer}>
                  <Text style={styles.modalEmptyText}>
                    {newChatUsers.length === 0
                      ? 'No contacts found who are using this app'
                      : 'No users found matching your search'}
                  </Text>
                  <TouchableOpacity
                    style={styles.modalSyncButton}
                    onPress={syncAndLoadContacts}
                    disabled={syncingContacts}
                  >
                    <Text style={styles.modalSyncButtonText}>
                      {syncingContacts ? 'Syncing...' : 'Refresh Contacts'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={filteredNewChatUsers}
                  renderItem={renderNewChatUser}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.modalListContent}
                  style={styles.modalList}
                />
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR,
  },
  container: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    backgroundColor: PRIMARY_COLOR,
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  appTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerButton: {
    padding: 8,
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  searchContainer: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: CARD_BG,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    position: 'relative',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  pinnedItem: {
    backgroundColor: '#F3F4F6',
    borderColor: PRIMARY_LIGHT,
  },
  pinIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: PRIMARY_COLOR,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  conversationName: {
    fontSize: 17,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    maxWidth: '75%',
    letterSpacing: 0.2,
  },
  timeText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    flex: 1,
    marginRight: 8,
    fontWeight: '500',
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
  },
  // Modal Styles - Overlay Style
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: CARD_BG,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: PRIMARY_COLOR,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalCloseButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 36,
    height: 36,
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    flex: 1,
  },
  modalSearchInput: {
    backgroundColor: LIGHT_BG,
    padding: 14,
    margin: 16,
    borderRadius: 12,
    fontSize: 16,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
    color: TEXT_PRIMARY,
  },
  modalCenterContainer: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  modalList: {
    maxHeight: 400,
  },
  modalSyncingText: {
    marginTop: 10,
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  modalEmptyContainer: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalEmptyText: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  modalSyncButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalSyncButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  modalListContent: {
    paddingBottom: 24,
  },
  modalUserItem: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  modalAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  modalAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  modalAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  modalUserInfo: {
    justifyContent: 'center',
    flex: 1,
  },
  modalUserName: {
    fontSize: 17,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  modalUserPhone: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
});

export default ConversationsScreen;
