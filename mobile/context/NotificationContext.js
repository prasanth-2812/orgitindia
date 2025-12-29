import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getConversations } from '../services/conversationService';
import { getTasks } from '../services/taskService';
import { waitForSocketConnection } from '../services/socket';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [counts, setCounts] = useState({
    chat: 0,
    tasks: 0,
    documents: 0,
    compliance: 0,
    dashboard: 0,
  });
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);

  const fetchChatCount = useCallback(async () => {
    if (!user?.id) return 0;
    try {
      const conversations = await getConversations();
      // Sum up all unread counts from conversations
      const totalUnread = conversations.reduce((sum, conv) => {
        const unreadCount = Number(conv.unread_count) || 0;
        return sum + unreadCount;
      }, 0);
      return totalUnread;
    } catch (error) {
      console.error('Error fetching chat count:', error);
      return 0;
    }
  }, [user?.id]);

  const fetchTaskCount = useCallback(async () => {
    if (!user?.id) return 0;
    try {
      // Get pending tasks that need user action
      const pendingTasks = await getTasks({ status: 'pending' });
      // Count tasks assigned to current user that are pending
      const userPendingTasks = pendingTasks.filter(task => {
        const isAssigned = task.assignees?.some(a => a.id === user.id);
        const currentUserStatus = task.current_user_status;
        const hasAccepted = currentUserStatus?.has_accepted || false;
        const hasRejected = currentUserStatus?.has_rejected || false;
        // Count if assigned and not yet accepted/rejected
        return isAssigned && !hasAccepted && !hasRejected;
      });
      return userPendingTasks.length;
    } catch (error) {
      console.error('Error fetching task count:', error);
      return 0;
    }
  }, [user?.id]);

  const fetchDocumentCount = useCallback(async () => {
    // TODO: Implement document notification count
    // This would depend on your document management system
    // For now, return 0
    return 0;
  }, []);

  const fetchComplianceCount = useCallback(async () => {
    // TODO: Implement compliance notification count
    // This would depend on your compliance management system
    // For now, return 0
    return 0;
  }, []);

  const fetchDashboardCount = useCallback(async () => {
    // TODO: Implement dashboard notification count
    // Could be a combination of overdue tasks, urgent items, etc.
    // For now, return 0
    return 0;
  }, []);

  const updateCounts = useCallback(async () => {
    if (!user?.id) {
      setCounts({
        chat: 0,
        tasks: 0,
        documents: 0,
        compliance: 0,
        dashboard: 0,
      });
      return;
    }

    setLoading(true);
    try {
      const [chatCount, taskCount, documentCount, complianceCount, dashboardCount] = await Promise.all([
        fetchChatCount(),
        fetchTaskCount(),
        fetchDocumentCount(),
        fetchComplianceCount(),
        fetchDashboardCount(),
      ]);

      setCounts({
        chat: chatCount,
        tasks: taskCount,
        documents: documentCount,
        compliance: complianceCount,
        dashboard: dashboardCount,
      });
    } catch (error) {
      console.error('Error updating notification counts:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchChatCount, fetchTaskCount, fetchDocumentCount, fetchComplianceCount, fetchDashboardCount]);

  // Increment chat count when new message is received
  const incrementChatCount = useCallback(() => {
    setCounts(prev => ({
      ...prev,
      chat: prev.chat + 1,
    }));
  }, []);

  // Decrement chat count when messages are read
  const decrementChatCount = useCallback((decrementBy = 1) => {
    setCounts(prev => ({
      ...prev,
      chat: Math.max(0, prev.chat - decrementBy),
    }));
  }, []);

  // Update chat count immediately (for when conversation list updates)
  const updateChatCount = useCallback(async () => {
    const chatCount = await fetchChatCount();
    setCounts(prev => ({
      ...prev,
      chat: chatCount,
    }));
  }, [fetchChatCount]);

  // Update task count immediately
  const updateTaskCount = useCallback(async () => {
    const taskCount = await fetchTaskCount();
    setCounts(prev => ({
      ...prev,
      tasks: taskCount,
    }));
  }, [fetchTaskCount]);

  // Set up socket listeners for real-time updates
  useEffect(() => {
    if (!user?.id) return;

    let socket = null;
    let mounted = true;

    const setupSocketListeners = async () => {
      try {
        socket = await waitForSocketConnection();
        socketRef.current = socket;

        // Listen for new messages - increment chat count
        socket.on('new_message', (message) => {
          if (!mounted) return;
          const currentUserId = user?.id;
          // Only increment if message is not from current user
          if (message.sender_id !== currentUserId && message.senderId !== currentUserId) {
            incrementChatCount();
          }
        });

        // Listen for message read events - decrement chat count
        socket.on('message_status_update', (data) => {
          if (!mounted) return;
          if (data.status === 'read' && data.userId === user?.id) {
            // Decrement by 1 for each read message
            decrementChatCount(1);
          }
        });

        // Listen for conversation messages read - reset chat count for that conversation
        socket.on('conversation_messages_read', (data) => {
          if (!mounted) return;
          if (data.userId === user?.id) {
            // Update chat count immediately when conversation is read
            updateChatCount();
          }
        });

        console.log('✅ Socket listeners set up for notification counts');
      } catch (error) {
        console.error('Error setting up socket listeners for notifications:', error);
      }
    };

    setupSocketListeners();

    return () => {
      mounted = false;
      if (socket) {
        socket.off('new_message');
        socket.off('message_status_update');
        socket.off('conversation_messages_read');
      }
      socketRef.current = null;
    };
  }, [user?.id, incrementChatCount, decrementChatCount, updateChatCount]);

  // Update counts when user changes
  useEffect(() => {
    updateCounts();
  }, [updateCounts]);

  // Set up interval to refresh counts every 10 seconds (reduced from 30)
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      updateCounts();
    }, 10000); // 10 seconds (reduced from 30)

    return () => clearInterval(interval);
  }, [user?.id, updateCounts]);

  return (
    <NotificationContext.Provider value={{ 
      counts, 
      updateCounts, 
      updateChatCount,
      updateTaskCount,
      incrementChatCount,
      decrementChatCount,
      loading 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

