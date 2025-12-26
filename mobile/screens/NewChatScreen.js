import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Contacts from 'expo-contacts';
import { matchContactsWithUsers } from '../services/contactService';
import { createConversation } from '../services/conversationService';

const NewChatScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    requestContactsPermissionAndSync();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.phone.includes(searchQuery)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const requestContactsPermissionAndSync = async () => {
    try {
      setLoading(true);
      
      // Request contacts permission
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant contacts permission to sync your contacts.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      // Sync contacts and load app users
      await syncAndLoadContacts();
    } catch (error) {
      console.error('Permission error:', error);
      Alert.alert('Error', 'Failed to request contacts permission');
      setLoading(false);
    }
  };

  const syncAndLoadContacts = async () => {
    try {
      setSyncing(true);
      
      // Get device contacts
      const { data: deviceContacts } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });

      // Format contacts for backend (send original phone numbers, backend will normalize)
      const formattedContacts = deviceContacts
        .filter((contact) => contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .map((contact) => {
          // Send original phone number as-is, backend will normalize it
          // Try all phone numbers for the contact, not just the first one
          const phoneNumbers = contact.phoneNumbers.map(p => p.number);
          
          return {
            name: contact.name || 'Unknown',
            phone: phoneNumbers[0], // Send first phone number (backend will normalize)
            // Include all phone numbers for better matching
            allPhones: phoneNumbers,
          };
        })
        .filter((contact) => contact.phone && contact.phone.replace(/\D/g, '').length >= 10); // Basic validation

      console.log('Formatted contacts count:', formattedContacts.length);
      console.log('Sample contacts:', formattedContacts.slice(0, 3));

      // Match device contacts with registered users (no database storage)
      const matchedUsers = await matchContactsWithUsers(formattedContacts);
      
      console.log('Matched users count:', matchedUsers.length);
      console.log('Matched users:', matchedUsers);
      
      setUsers(matchedUsers);
      setFilteredUsers(matchedUsers);
    } catch (error) {
      console.error('Match contacts error:', error);
      Alert.alert('Error', 'Failed to match contacts. Please try again.');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleUserSelect = async (selectedUser) => {
    try {
      const conversationId = await createConversation(selectedUser.id);
      navigation.replace('Chat', {
        conversationId,
        conversationName: selectedUser.name,
      });
    } catch (error) {
      console.error('Create conversation error:', error);
    }
  };

  const renderUser = ({ item }) => {
    // Backend returns 'mobile', but display nicely formatted
    const displayPhone = item.mobile || item.phone || '';
    const formattedPhone = displayPhone.replace(/^\+91/, ''); // Remove +91 for display
    
    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleUserSelect(item)}
      >
        <View style={styles.avatar}>
          {item.profilePhotoUrl ? (
            <Image source={{ uri: item.profilePhotoUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userPhone}>{formattedPhone}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          {syncing && (
            <Text style={styles.syncingText}>Syncing contacts...</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={PRIMARY_COLOR} barStyle="light-content" />
      <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Chat</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search users..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCapitalize="none"
      />

      {filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {users.length === 0
              ? 'No contacts found who are using this app'
              : 'No users found matching your search'}
          </Text>
          <TouchableOpacity
            style={styles.syncButton}
            onPress={syncAndLoadContacts}
            disabled={syncing}
          >
            <Text style={styles.syncButtonText}>
              {syncing ? 'Syncing...' : 'Refresh Contacts'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
        />
      )}
      </View>
    </SafeAreaView>
  );
};

// Corporate Purple Theme
const PRIMARY_COLOR = '#7C3AED';
const PRIMARY_LIGHT = '#A78BFA';
const LIGHT_BG = '#F9FAFB';
const CARD_BG = '#F9FAFB';
const TEXT_PRIMARY = '#1F2937';
const TEXT_SECONDARY = '#6B7280';
const BORDER_COLOR = '#E5E7EB';
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.05)';

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
  header: {
    padding: 20,
    backgroundColor: PRIMARY_COLOR,
    borderBottomWidth: 0,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  searchInput: {
    backgroundColor: CARD_BG,
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
  },
  userItem: {
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
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  userInfo: {
    justifyContent: 'center',
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  userPhone: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  syncingText: {
    marginTop: 10,
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  syncButton: {
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
  syncButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default NewChatScreen;

