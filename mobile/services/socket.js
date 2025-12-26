import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from '../config';

let socket = null;
let connectionPromise = null;

export const initSocket = async () => {
  // If socket is already connected, return it
  if (socket?.connected) {
    return socket;
  }

  // If socket exists but not connected, wait for connection
  if (socket && !socket.connected) {
    return waitForSocketConnection();
  }

  const token = await AsyncStorage.getItem('token');
  
  if (!token) {
    throw new Error('No token available');
  }

  // Create new socket connection
  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['polling', 'websocket'], // Try polling first (more reliable for mobile/Expo)
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000, // Increase max delay
    reconnectionAttempts: Infinity, // Keep trying to reconnect
    timeout: 30000, // Increase timeout to 30 seconds
    forceNew: false, // Reuse existing connection if available
    upgrade: true, // Allow transport upgrade from polling to websocket
    rememberUpgrade: true, // Remember transport upgrade preference
  });
      
  // Set up connection event listeners
      socket.on('connect', () => {
        console.log('✅ Socket connected successfully');
    // The waitForSocketConnection promise will resolve via the 'connect' event listener
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
        console.error('❌ Socket error details:', {
          type: error.type,
          description: error.description,
          context: error.context,
        });
        // Don't reject immediately - let reconnection handle it
        // The waitForSocketConnection promise will reject via timeout if connection fails
      });

      socket.on('disconnect', (reason) => {
        console.log('⚠️ Socket disconnected:', reason);
        // If disconnected due to transport error, socket will automatically reconnect
        if (reason === 'transport error' || reason === 'transport close') {
          console.log('🔄 Transport error detected, socket will attempt to reconnect...');
        }
      });
      
      socket.on('reconnect', (attemptNumber) => {
        console.log(`✅ Socket reconnected after ${attemptNumber} attempts`);
      });
      
      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Socket reconnection attempt ${attemptNumber}...`);
      });
      
      socket.on('reconnect_error', (error) => {
        console.error('❌ Socket reconnection error:', error.message);
      });
      
      socket.on('reconnect_failed', () => {
        console.error('❌ Socket reconnection failed - all attempts exhausted');
      });

  // Wait for connection
  return waitForSocketConnection();
};

/**
 * Wait for socket to be connected
 * @param {number} timeout - Maximum time to wait in milliseconds (default: 10000)
 * @returns {Promise<Socket>} Connected socket
 */
export const waitForSocketConnection = (timeout = 30000) => {
  return new Promise((resolve, reject) => {
    // If socket is already connected, resolve immediately
    if (socket?.connected) {
      resolve(socket);
      return;
    }

    // If socket doesn't exist, try to initialize it
    if (!socket) {
      initSocket()
        .then(resolve)
        .catch(reject);
      return;
    }

    // If there's already a connection promise, wait for it
    if (connectionPromise) {
      connectionPromise
        .then(resolve)
        .catch(reject);
      return;
    }

    // Create new connection promise
    let timeoutId;
    let resolved = false;
    
    const promise = new Promise((innerResolve, innerReject) => {
      // Set up timeout (increased to 30 seconds)
      timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          connectionPromise = null;
          // Don't reject - socket might still be connecting
          // Instead, check if socket exists and is connecting
          if (socket && socket.connecting) {
            console.log('⏳ Socket still connecting, waiting a bit more...');
            // Wait a bit more
            setTimeout(() => {
              if (socket?.connected) {
                innerResolve(socket);
              } else {
                innerReject(new Error('Socket connection timeout after extended wait'));
              }
            }, 5000);
          } else {
            innerReject(new Error('Socket connection timeout'));
          }
        }
      }, timeout);

      // Listen for connect event
      const onConnect = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          socket.off('connect', onConnect);
          socket.off('connect_error', onError);
          connectionPromise = null;
          innerResolve(socket);
        }
      };

      // Listen for connection error (but don't reject immediately - let reconnection handle it)
      const onError = (error) => {
        // Only reject if it's a permanent error (not transport-related)
        if (error.message && !error.message.includes('transport') && !error.message.includes('websocket')) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            socket.off('connect', onConnect);
            socket.off('connect_error', onError);
            connectionPromise = null;
            innerReject(error);
          }
        } else {
          // Transport errors are usually temporary - let reconnection handle it
          console.log('⚠️ Transport error, waiting for reconnection...');
        }
      };

      socket.once('connect', onConnect);
      socket.once('connect_error', onError);
    });

    connectionPromise = promise;

    promise
      .then(resolve)
      .catch(reject);
  });
};

export const getSocket = () => {
  if (!socket) {
    console.warn('⚠️ Socket not initialized. Attempting to initialize...');
    // Try to initialize socket (but don't wait for connection)
    initSocket().catch((error) => {
      console.error('Failed to auto-initialize socket:', error);
    });
    throw new Error('Socket not initialized. Call initSocket first.');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    connectionPromise = null;
  }
};

