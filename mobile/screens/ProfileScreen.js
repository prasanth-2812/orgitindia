import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile } from '../services/authService';

// Corporate Purple Theme
const PRIMARY_COLOR = '#7C3AED';
const PRIMARY_LIGHT = '#A78BFA';
const LIGHT_BG = '#F9FAFB';
const CARD_BG = '#F9FAFB';
const TEXT_PRIMARY = '#1F2937';
const TEXT_SECONDARY = '#6B7280';
const BORDER_COLOR = '#E5E7EB';
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.05)';

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [about, setAbout] = useState(user?.about || user?.bio || '');
  const [contactNumber, setContactNumber] = useState(user?.contact_number || user?.phone || user?.mobile || '');
  const [localPhoto, setLocalPhoto] = useState(user?.profile_photo || user?.profilePhotoUrl || null);

  // Update local state when user changes (but only if not editing)
  useEffect(() => {
    if (!isEditing && user) {
      setName(user?.name || '');
      setAbout(user?.about || user?.bio || '');
      setContactNumber(user?.contact_number || user?.phone || user?.mobile || '');
      setLocalPhoto(user?.profile_photo || user?.profilePhotoUrl || null);
    }
  }, [user, isEditing]);

  const initials = useMemo(() => {
    if (!user?.name) return '?';
    const parts = user.name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }, [user]);

  const handleLogout = async () => {
    await logout();
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      // Enter edit mode with current values
      setName(user?.name || '');
      setAbout(user?.about || user?.bio || '');
      setContactNumber(user?.contact_number || user?.phone || user?.mobile || '');
      setLocalPhoto(user?.profile_photo || user?.profilePhotoUrl || null);
    }
    setIsEditing((prev) => !prev);
  };

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photos to update profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        // Store as data URL so it can be persisted in backend TEXT column
        const dataUrl = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setLocalPhoto(dataUrl);
      }
    } catch (error) {
      console.error('Profile photo update error:', error);
      Alert.alert('Error', 'Could not update profile photo.');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedUser = await updateProfile({
        name: name.trim() || user?.name,
        about: about.trim(),
        contact_number: contactNumber.trim(),
        profile_photo: localPhoto,
      });
      updateUser(updatedUser);
      setIsEditing(false);
      Alert.alert('Profile updated', 'Your profile has been updated successfully.');
    } catch (error) {
      console.error('Profile save error:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={handleEditToggle} disabled={saving}>
          <Text style={styles.editText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={isEditing ? handlePickPhoto : undefined} activeOpacity={isEditing ? 0.7 : 1}>
            {localPhoto ? (
              <Image source={{ uri: localPhoto }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </TouchableOpacity>
          {isEditing ? (
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="rgba(31, 41, 55, 0.4)"
            />
          ) : (
            <Text style={styles.nameText}>{user?.name || 'User'}</Text>
          )}
          {isEditing ? (
            <TextInput
              style={styles.phoneInput}
              value={contactNumber}
              onChangeText={setContactNumber}
              placeholder="Contact number"
              keyboardType="phone-pad"
              placeholderTextColor="rgba(107, 114, 128, 0.7)"
            />
          ) : (
            <Text style={styles.phoneText}>{user?.contact_number || user?.phone || user?.mobile || 'No contact number'}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Status</Text>
            {isEditing ? (
              <TextInput
                style={[styles.sectionValue, styles.aboutInput]}
                value={about}
                onChangeText={setAbout}
                placeholder="Hey there! I am using OrgIT."
                placeholderTextColor="rgba(107, 114, 128, 0.8)"
                multiline
              />
            ) : (
              <Text style={styles.sectionValue}>
                {user?.about || user?.bio || 'Hey there! I am using OrgIT.'}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Contact number</Text>
            <Text style={styles.sectionValue}>{user?.contact_number || user?.phone || user?.mobile || '-'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        {isEditing ? (
          <TouchableOpacity
            style={[styles.logoutButton, styles.saveButton]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.logoutButtonText}>Save changes</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Log out</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: PRIMARY_COLOR,
    elevation: 2,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 28,
    marginRight: 16,
    fontWeight: '300',
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  editText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '700',
  },
  nameText: {
    color: TEXT_PRIMARY,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  nameInput: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: '#FFFFFF',
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '600',
    minWidth: 200,
    textAlign: 'center',
  },
  phoneText: {
    color: TEXT_SECONDARY,
    fontSize: 16,
    marginTop: 6,
    fontWeight: '500',
  },
  phoneInput: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: '#FFFFFF',
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '500',
    minWidth: 200,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionLabel: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '500',
  },
  sectionValue: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  aboutInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    backgroundColor: LIGHT_BG,
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButton: {
    backgroundColor: PRIMARY_COLOR,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default ProfileScreen;


