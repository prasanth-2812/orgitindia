import React, { createContext, useState, useEffect, useContext } from 'react';
import { getCurrentUser, getToken, logout as authServiceLogout } from '../services/authService';
import { initSocket, disconnectSocket } from '../services/socket';
import * as Contacts from 'expo-contacts';
import { matchContactsWithUsers } from '../services/contactService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getToken();
      if (token) {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          // Initialize socket connection
          try {
            await initSocket();
          } catch (error) {
            console.error('Socket initialization error:', error);
          }
          // Sync contacts in background (don't block UI)
          syncContactsInBackground();
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncContactsInBackground = async () => {
    try {
      // Request contacts permission
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Contacts permission not granted');
        return;
      }

      // Get device contacts
      const { data: deviceContacts } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });

      // Format contacts for backend (just for matching, no storage)
      const formattedContacts = deviceContacts
        .filter((contact) => contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .map((contact) => {
          // Get first phone number and clean it (remove spaces, dashes, etc.)
          let phoneNumber = contact.phoneNumbers[0].number.replace(/[\s\-\(\)]/g, '');
          
          // Remove country code if present (assuming +91 for India, adjust as needed)
          // Keep last 10 digits
          if (phoneNumber.length > 10) {
            phoneNumber = phoneNumber.slice(-10);
          }
          
          return {
            name: contact.name || 'Unknown',
            phone: phoneNumber,
          };
        })
        .filter((contact) => contact.phone.length === 10); // Filter valid 10-digit phone numbers

      // Match contacts with registered users (no database storage)
      await matchContactsWithUsers(formattedContacts);
      console.log('Contacts matched successfully');
    } catch (error) {
      console.error('Background contact matching error:', error);
      // Don't show error to user, just log it
    }
  };

  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    initSocket().catch((error) => {
      console.error('Socket initialization error:', error);
    });
    // Sync contacts in background after login
    syncContactsInBackground();
  };

  // Update user in context (e.g., after profile update)
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const logout = async () => {
    try {
      await authServiceLogout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      disconnectSocket();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, logout, checkAuth, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

