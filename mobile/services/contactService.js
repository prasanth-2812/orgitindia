import api from './api';

// Match device contacts with registered users (no database storage)
export const matchContactsWithUsers = async (contacts) => {
  try {
    const response = await api.post('/api/contacts/match', { contacts });
    // Backend returns: { users: [...] } (no success field)
    if (response.data && response.data.users) {
      // Transform backend response to match mobile app expectations
      return response.data.users.map(user => ({
        id: user.id,
        name: user.name || 'Unknown',
        phone: user.phone || user.mobile || '',
        mobile: user.phone || user.mobile || '',
        profilePhotoUrl: user.profile_photo || user.profilePhotoUrl || null,
        profile_photo: user.profile_photo || user.profilePhotoUrl || null,
        is_active: user.is_active !== undefined ? user.is_active : true,
      }));
    }
    return [];
  } catch (error) {
    console.error('Match contacts error:', error);
    console.error('Error response:', error.response?.data);
    throw error;
  }
};

