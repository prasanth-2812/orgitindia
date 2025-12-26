import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to format phone number to international format
const formatPhoneNumber = (phone) => {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If it starts with country code, keep it
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  
  // If it's 10 digits, assume India (+91)
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  
  // If it already has +, return as is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Default: add +91 for 10-digit numbers
  return cleaned.length === 10 ? `+91${cleaned}` : phone;
};

export const register = async (name, phone, password) => {
  const mobile = formatPhoneNumber(phone);
  
  const response = await api.post('/api/auth/register', {
    name,
    phone: mobile, // Backend register endpoint accepts 'phone' field
    password,
  });
  
  // Backend register returns: { success: true, token, user }
  if (response.data.success && response.data.token) {
    await AsyncStorage.setItem('token', response.data.token);
    await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    return { user: response.data.user, token: response.data.token };
  }
  
  throw new Error('Registration failed - invalid response format');
};

export const login = async (phone, password) => {
  const mobile = formatPhoneNumber(phone);
  
  const response = await api.post('/api/auth/login', {
    mobile, // Backend expects 'mobile' not 'phone'
    password,
  });
  
  // Backend login returns: { success: true, data: { user, token, refreshToken, expiresIn } }
  if (response.data.success && response.data.data) {
    const { token, user } = response.data.data;
    if (token) {
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
    }
    return { user, token };
  }
  
  throw new Error(response.data.error || 'Login failed - invalid response format');
};

export const logout = async () => {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
};

export const getCurrentUser = async () => {
  const userStr = await AsyncStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const getToken = async () => {
  return await AsyncStorage.getItem('token');
};

// Update profile (about, contact number, profile photo)
export const updateProfile = async ({ name, about, contact_number, profile_photo }) => {
  const response = await api.put('/api/auth/profile', {
    name,
    about,
    contact_number,
    profile_photo,
  });

  // Merge updated profile into stored user
  const currentStr = await AsyncStorage.getItem('user');
  const currentUser = currentStr ? JSON.parse(currentStr) : {};

  const profile = response.data.profile || {};

  const updatedUser = {
    ...currentUser,
    name: name || currentUser.name,
    about: profile.about ?? currentUser.about,
    contact_number: profile.contact_number ?? currentUser.contact_number ?? currentUser.phone,
    profile_photo: profile.profile_photo ?? currentUser.profile_photo ?? null,
  };

  await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

  return updatedUser;
};

// Get another user's profile by ID (used for viewing recipient details)
export const getUserById = async (userId) => {
  const response = await api.get(`/api/auth/user/${userId}`);
  return response.data.user;
};

