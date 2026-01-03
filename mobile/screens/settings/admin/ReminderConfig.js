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
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getReminderConfig, updateReminderConfig } from '../../../services/settingsService';

export default function ReminderConfig({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    dueSoonDays: 3,
    pushEnabled: true,
    emailEnabled: true,
    reminderIntervals: [24, 12, 6], // hours
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await getReminderConfig();
      if (response.success && response.data) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await updateReminderConfig(config);
      if (response.success) {
        Alert.alert('Success', 'Reminder configuration updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update configuration');
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
        <Text style={styles.headerTitle}>Reminder Configuration</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#a413ec" />
          ) : (
            <Text style={styles.saveBtn}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Due Soon Days</Text>
            <TextInput
              style={styles.input}
              value={config.dueSoonDays?.toString()}
              onChangeText={(text) => setConfig({ ...config, dueSoonDays: parseInt(text) || 0 })}
              placeholder="Days before due date"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
            />
            <Text style={styles.hint}>Number of days before due date to send reminders</Text>
          </View>

          <View style={styles.switchGroup}>
            <View style={styles.switchContent}>
              <Text style={styles.switchLabel}>Push Notifications</Text>
              <Text style={styles.switchDescription}>Enable push notification reminders</Text>
            </View>
            <Switch
              value={config.pushEnabled}
              onValueChange={(value) => setConfig({ ...config, pushEnabled: value })}
              trackColor={{ false: '#d1d5db', true: '#a413ec' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.switchGroup}>
            <View style={styles.switchContent}>
              <Text style={styles.switchLabel}>Email Notifications</Text>
              <Text style={styles.switchDescription}>Enable email reminders</Text>
            </View>
            <Switch
              value={config.emailEnabled}
              onValueChange={(value) => setConfig({ ...config, emailEnabled: value })}
              trackColor={{ false: '#d1d5db', true: '#a413ec' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reminder Intervals (Hours)</Text>
            <Text style={styles.hint}>Comma-separated list (e.g., 24,12,6)</Text>
            <TextInput
              style={styles.input}
              value={config.reminderIntervals?.join(',')}
              onChangeText={(text) => {
                const intervals = text.split(',').map(i => parseInt(i.trim())).filter(i => !isNaN(i));
                setConfig({ ...config, reminderIntervals: intervals });
              }}
              placeholder="24, 12, 6"
              placeholderTextColor="#9ca3af"
            />
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
  formSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 24,
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
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  switchContent: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
});

