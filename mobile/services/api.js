import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Only clear token if it's a real authentication error (not network error)
    if (error.response?.status === 401 && error.response?.data?.error) {
      // Check if error message indicates invalid/expired token
      const errorMessage = error.response.data.error?.toLowerCase() || '';
      if (errorMessage.includes('token') || 
          errorMessage.includes('unauthorized') || 
          errorMessage.includes('authentication') ||
          errorMessage.includes('session')) {
        console.log('Authentication failed, clearing token');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;

