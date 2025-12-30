import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket: Socket | null = null;
let connectionState: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Socket event types
export interface SocketMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  status?: string;
  created_at: string;
  [key: string]: any;
}

export interface SocketStatusUpdate {
  messageId: string;
  conversationId: string;
  status: 'sent' | 'delivered' | 'read';
}

export type SocketEventHandler = (data: any) => void;

/**
 * Initialize socket connection with token
 */
export const initSocket = (token: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect();
  }

  connectionState = 'connecting';
  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected');
    connectionState = 'connected';
    reconnectAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
    connectionState = 'disconnected';
    
    // Auto-reconnect on unexpected disconnects
    if (reason === 'io server disconnect') {
      // Server disconnected, reconnect manually
      socket?.connect();
    }
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error);
    connectionState = 'error';
    reconnectAttempts++;
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
    }
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`✅ Socket reconnected after ${attemptNumber} attempts`);
    connectionState = 'connected';
    reconnectAttempts = 0;
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`🔄 Reconnection attempt ${attemptNumber}`);
  });

  socket.on('reconnect_error', (error) => {
    console.error('❌ Reconnection error:', error);
  });

  socket.on('reconnect_failed', () => {
    console.error('❌ Reconnection failed after max attempts');
    connectionState = 'error';
  });

  return socket;
};

/**
 * Get current socket instance
 */
export const getSocket = (): Socket | null => {
  return socket;
};

/**
 * Get connection state
 */
export const getConnectionState = (): typeof connectionState => {
  return connectionState;
};

/**
 * Wait for socket connection (similar to mobile app)
 */
export const waitForSocketConnection = (): Promise<Socket> => {
  return new Promise((resolve, reject) => {
    if (socket?.connected) {
      resolve(socket);
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error('Socket connection timeout'));
    }, 10000); // 10 second timeout

    const checkConnection = () => {
      if (socket?.connected) {
        clearTimeout(timeout);
        socket.off('connect', checkConnection);
        socket.off('connect_error', handleError);
        resolve(socket);
      }
    };

    const handleError = (error: any) => {
      clearTimeout(timeout);
      socket?.off('connect', checkConnection);
      socket?.off('connect_error', handleError);
      reject(error);
    };

    if (socket) {
      socket.on('connect', checkConnection);
      socket.on('connect_error', handleError);
    } else {
      clearTimeout(timeout);
      reject(new Error('Socket not initialized'));
    }
  });
};

/**
 * Join a conversation room
 */
export const joinConversationRoom = async (conversationId: string): Promise<void> => {
  const sock = await waitForSocketConnection();
  sock.emit('join_conversation', { conversationId });
  console.log(`✅ Joined conversation room: ${conversationId}`);
};

/**
 * Leave a conversation room
 */
export const leaveConversationRoom = (conversationId: string): void => {
  if (socket?.connected) {
    socket.emit('leave_conversation', { conversationId });
    console.log(`👋 Left conversation room: ${conversationId}`);
  }
};

/**
 * Send a message via socket
 */
export const sendMessageViaSocket = async (data: {
  conversationId?: string;
  receiverId?: string;
  groupId?: string;
  messageType: string;
  content: string;
  [key: string]: any;
}): Promise<void> => {
  const sock = await waitForSocketConnection();
  sock.emit('message:send', data);
};

/**
 * Disconnect socket
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
    connectionState = 'disconnected';
    reconnectAttempts = 0;
  }
};

/**
 * Add typed event listener
 */
export const onSocketEvent = (
  event: string,
  handler: SocketEventHandler
): void => {
  if (socket) {
    socket.on(event, handler);
  }
};

/**
 * Remove event listener
 */
export const offSocketEvent = (
  event: string,
  handler?: SocketEventHandler
): void => {
  if (socket) {
    if (handler) {
      socket.off(event, handler);
    } else {
      socket.off(event);
    }
  }
};

