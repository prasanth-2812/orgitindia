import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { getOrganizationData, createOrganizationData, updateOrganizationData } from '../../../services/settingsService';

export default function EntityMasterData({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    address: '',
    email: '',
    mobile: '',
    gst: '',
    pan: '',
    cin: '',
    accounting_year_start: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await getOrganizationData();
      if (response.success && response.data) {
        setFormData({
          name: response.data.name || '',
          logo_url: response.data.logo_url || '',
          address: response.data.address || '',
          email: response.data.email || '',
          mobile: response.data.mobile || '',
          gst: response.data.gst || '',
          pan: response.data.pan || '',
          cin: response.data.cin || '',
          accounting_year_start: response.data.accounting_year_start || '',
        });
      }
    } catch (error) {
      console.error('Load error:', error);
      // If organization doesn't exist, that's okay - user can create it
      if (error.response?.status !== 403 && error.response?.status !== 404) {
        Alert.alert('Error', 'Failed to load organization data');
      }
    } finally {
      setLoading(false);
    }
  };

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // In a real app, you'd upload this to a server
      // For now, we'll just set the local URI
      setFormData({ ...formData, logo_url: result.assets[0].uri });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Organization name is required');
      return;
    }

    setSaving(true);
    try {
      // Try to get organization first to see if it exists
      let response;
      try {
        await getOrganizationData();
        // Organization exists, update it
        response = await updateOrganizationData({
          name: formData.name,
          logoUrl: formData.logo_url,
          address: formData.address,
          email: formData.email,
          mobile: formData.mobile,
          gst: formData.gst,
          pan: formData.pan,
          cin: formData.cin,
          accountingYearStart: formData.accounting_year_start,
        });
      } catch (error) {
        // Organization doesn't exist, create it
        if (error.response?.status === 403 || error.response?.status === 404) {
          response = await createOrganizationData({
            name: formData.name,
            logoUrl: formData.logo_url,
            address: formData.address,
            email: formData.email,
            mobile: formData.mobile,
            gst: formData.gst,
            pan: formData.pan,
            cin: formData.cin,
            accountingYearStart: formData.accounting_year_start,
          });
        } else {
          throw error;
        }
      }

      if (response.success) {
        Alert.alert('Success', 'Organization saved successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save organization data');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#a413ec" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f6f8" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Entity Master Data</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#a413ec" />
          ) : (
            <Text style={styles.saveBtn}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Text style={styles.sectionLabel}>Organization Logo</Text>
          <TouchableOpacity style={styles.logoContainer} onPress={pickLogo}>
            {formData.logo_url ? (
              <Image source={{ uri: formData.logo_url }} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <MaterialIcons name="add-photo-alternate" size={48} color="#9ca3af" />
                <Text style={styles.logoPlaceholderText}>Tap to add logo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Organization Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter organization name"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="Enter organization address"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="Enter email address"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              value={formData.mobile}
              onChangeText={(text) => setFormData({ ...formData, mobile: text })}
              placeholder="Enter mobile number"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>GST Number</Text>
            <TextInput
              style={styles.input}
              value={formData.gst}
              onChangeText={(text) => setFormData({ ...formData, gst: text })}
              placeholder="Enter GST number"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PAN Number</Text>
            <TextInput
              style={styles.input}
              value={formData.pan}
              onChangeText={(text) => setFormData({ ...formData, pan: text })}
              placeholder="Enter PAN number"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              maxLength={10}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CIN Number</Text>
            <TextInput
              style={styles.input}
              value={formData.cin}
              onChangeText={(text) => setFormData({ ...formData, cin: text })}
              placeholder="Enter CIN number"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Accounting Year Start</Text>
            <TextInput
              style={styles.input}
              value={formData.accounting_year_start}
              onChangeText={(text) => setFormData({ ...formData, accounting_year_start: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.hint}>Format: YYYY-MM-DD (e.g., 2024-04-01)</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f6f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f7f6f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a413ec',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  formSection: {
    paddingHorizontal: 16,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
});

