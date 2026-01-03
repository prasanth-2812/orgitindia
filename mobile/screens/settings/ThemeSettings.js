import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@orgit_theme';

export default function ThemeSettings({ navigation }) {
  const [theme, setTheme] = useState('light'); // 'light' or 'dark'
  const [systemTheme, setSystemTheme] = useState(false);

  React.useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        const themeData = JSON.parse(savedTheme);
        setTheme(themeData.theme || 'light');
        setSystemTheme(themeData.systemTheme || false);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const saveTheme = async (newTheme, useSystem) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({
        theme: newTheme,
        systemTheme: useSystem,
      }));
      setTheme(newTheme);
      setSystemTheme(useSystem);
      Alert.alert('Success', 'Theme preference saved. Please restart the app to apply changes.');
    } catch (error) {
      console.error('Error saving theme:', error);
      Alert.alert('Error', 'Failed to save theme preference');
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: 'light-mode', description: 'Light background with dark text' },
    { value: 'dark', label: 'Dark', icon: 'dark-mode', description: 'Dark background with light text' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f6f8" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Theme Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* System Theme Toggle */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <MaterialIcons name="phone-android" size={24} color="#a413ec" />
            </View>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Use System Theme</Text>
              <Text style={styles.sectionDescription}>
                Automatically match your device's theme setting
              </Text>
            </View>
          </View>
          <Switch
            value={systemTheme}
            onValueChange={(value) => saveTheme(theme, value)}
            trackColor={{ false: '#d1d5db', true: '#a413ec' }}
            thumbColor="#ffffff"
          />
        </View>

        {/* Theme Options */}
        {!systemTheme && (
          <View style={styles.themeSection}>
            <Text style={styles.sectionLabel}>Choose Theme</Text>
            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.themeOption,
                  theme === option.value && styles.themeOptionSelected,
                ]}
                onPress={() => saveTheme(option.value, false)}
              >
                <View style={styles.themeOptionContent}>
                  <View style={styles.themeIconContainer}>
                    <MaterialIcons
                      name={option.icon}
                      size={28}
                      color={theme === option.value ? '#a413ec' : '#6b7280'}
                    />
                  </View>
                  <View style={styles.themeOptionText}>
                    <Text style={styles.themeOptionTitle}>{option.label}</Text>
                    <Text style={styles.themeOptionDescription}>{option.description}</Text>
                  </View>
                </View>
                {theme === option.value && (
                  <MaterialIcons name="check-circle" size={24} color="#a413ec" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.infoCard}>
          <MaterialIcons name="info" size={20} color="#6b7280" />
          <Text style={styles.infoText}>
            Theme changes will take effect after restarting the app.
          </Text>
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  sectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(164, 19, 236, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  themeSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  themeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#f3f4f6',
  },
  themeOptionSelected: {
    borderColor: '#a413ec',
    backgroundColor: 'rgba(164, 19, 236, 0.05)',
  },
  themeOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  themeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(164, 19, 236, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeOptionText: {
    flex: 1,
  },
  themeOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  themeOptionDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});

