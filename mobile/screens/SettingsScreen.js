import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen({ navigation }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const commonSettings = [
    { icon: 'person', title: 'Profile', subtitle: 'Update your profile details', screen: 'ProfileSettings' },
    { icon: 'lock', title: 'Change Password', subtitle: 'Update your password', screen: 'ChangePassword' },
    { icon: 'palette', title: 'Theme', subtitle: 'Light or dark mode', screen: 'ThemeSettings' },
  ];

  const adminSettings = [
    {
      section: 'Entity Master Data',
      icon: 'dns',
      items: [
        { icon: 'business', title: 'Organization Details', subtitle: 'Name, logo, address, contact', screen: 'EntityMasterData' },
      ],
    },
    {
      section: 'Organization Structure',
      icon: 'account-tree',
      items: [
        { icon: 'domain', title: 'Departments', subtitle: 'Manage business units', screen: 'Departments' },
        { icon: 'badge', title: 'Designations', subtitle: 'Job titles & levels', screen: 'Designations' },
        { icon: 'account-tree', title: 'Reporting Hierarchy', subtitle: 'Visual reporting structure', screen: 'ReportingHierarchy' },
      ],
    },
    {
      section: 'Employee Management',
      icon: 'groups',
      items: [
        { icon: 'person-add', title: 'Add Employee', subtitle: 'Onboard new staff', screen: 'AddEmployee' },
        { icon: 'groups', title: 'Employee Directory', subtitle: 'Manage all employees', screen: 'EmployeeDirectory' },
        { icon: 'admin-panel-settings', title: 'Roles & Permissions', subtitle: 'Access control setup', screen: 'RolesPermissions' },
      ],
    },
    {
      section: 'Automation & Configuration',
      icon: 'settings',
      items: [
        { icon: 'notifications-active', title: 'Reminder Configuration', subtitle: 'Due soon days & intervals', screen: 'ReminderConfig' },
        { icon: 'timer', title: 'Auto Escalation', subtitle: 'Task escalation rules', screen: 'AutoEscalation' },
        { icon: 'event-repeat', title: 'Recurring Tasks', subtitle: 'Default frequency & settings', screen: 'RecurringTasks' },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f6f8" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Common Settings - Available for all users */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIndicator} />
          <Text style={styles.sectionTitle}>General Settings</Text>
        </View>
        <View style={styles.cardList}>
          {commonSettings.map((item, index) => (
            <SettingCard
              key={index}
              icon={item.icon}
              title={item.title}
              subtitle={item.subtitle}
              onPress={() => navigation.navigate(item.screen)}
            />
          ))}
        </View>

        {/* Admin Only Settings */}
        {isAdmin && adminSettings.map((section, sectionIndex) => (
          <View key={sectionIndex}>
            <View style={[styles.sectionHeader, { marginTop: sectionIndex > 0 ? 24 : 24 }]}>
              <View style={styles.sectionIndicator} />
              <Text style={styles.sectionTitle}>{section.section}</Text>
            </View>
            <View style={styles.cardList}>
              {section.items.map((item, itemIndex) => (
                <SettingCard
                  key={itemIndex}
                  icon={item.icon}
                  title={item.title}
                  subtitle={item.subtitle}
                  onPress={() => navigation.navigate(item.screen)}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Employee Message */}
        {!isAdmin && (
          <View style={styles.infoCard}>
            <MaterialIcons name="info" size={24} color="#6b7280" />
            <Text style={styles.infoText}>
              Contact your administrator for organization settings and configurations.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const SettingCard = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity
    style={[styles.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
      <View style={styles.iconContainer}>
        <MaterialIcons name={icon} size={24} color="#a413ec" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
    </View>
    <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
  </TouchableOpacity>
);

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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  sectionIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#a413ec',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  cardList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(164, 19, 236, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  cardSubtitle: {
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
