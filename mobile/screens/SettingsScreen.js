import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, StatusBar, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen({ navigation }) {
    const [autoEscalation, setAutoEscalation] = useState(false);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#f7f6f8" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Admin Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <MaterialIcons name="search" size={24} color="#a413ec" style={{ marginLeft: 16 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search configuration..."
                        placeholderTextColor="#9ca3af"
                    />
                </View>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Organization & Structure */}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionIndicator} />
                    <Text style={styles.sectionTitle}>Organization & Structure</Text>
                </View>
                <View style={styles.cardList}>
                    <SettingCard icon="domain" title="Departments" subtitle="Manage business units" />
                    <SettingCard icon="badge" title="Designations" subtitle="Job titles & levels" />
                    <SettingCard icon="account-tree" title="Reporting Hierarchy" subtitle="Visual reporting structure" />
                </View>

                {/* Employee Management */}
                <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                    <View style={styles.sectionIndicator} />
                    <Text style={styles.sectionTitle}>Employee Management</Text>
                </View>
                <View style={styles.cardList}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity style={[styles.card, { flex: 1, alignItems: 'flex-start' }]}>
                            <View style={styles.addNewIcon}>
                                <MaterialIcons name="person-add" size={24} color="#ffffff" />
                            </View>
                            <View>
                                <Text style={styles.cardTitle}>Add New</Text>
                                <Text style={styles.cardSubtitle}>Onboard staff</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.card, { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                <View style={styles.iconContainer}>
                                    <MaterialIcons name="groups" size={24} color="#a413ec" />
                                </View>
                                <View>
                                    <Text style={styles.cardTitle}>Directory</Text>
                                    <Text style={styles.cardSubtitle}>Manage all employees</Text>
                                </View>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>
                    <SettingCard icon="admin-panel-settings" title="Roles & Permissions" subtitle="Access control setup" />
                </View>

                {/* Automation & Config */}
                <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                    <View style={styles.sectionIndicator} />
                    <Text style={styles.sectionTitle}>Automation & Config</Text>
                </View>
                <View style={styles.cardList}>
                    <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                            <View style={styles.iconContainer}>
                                <MaterialIcons name="timer" size={24} color="#a413ec" />
                            </View>
                            <View>
                                <Text style={styles.cardTitle}>Auto Escalation</Text>
                                <Text style={styles.cardSubtitle}>Trigger after 24 hours</Text>
                            </View>
                        </View>
                        <Switch
                            value={autoEscalation}
                            onValueChange={setAutoEscalation}
                            trackColor={{ false: '#d1d5db', true: '#a413ec' }}
                            thumbColor="#ffffff"
                        />
                    </View>
                    <SettingCard icon="notifications-active" title="Reminder Configuration" subtitle="Push & Email alerts" />
                    <SettingCard icon="event-repeat" title="Recurring Tasks" subtitle="Scheduled templates" />
                </View>

                {/* Data Management */}
                <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                    <View style={styles.sectionIndicator} />
                    <Text style={styles.sectionTitle}>Data Management</Text>
                </View>
                <View style={styles.cardList}>
                    <SettingCard icon="dns" title="Entity Master Data" subtitle="Core system records" />
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const SettingCard = ({ icon, title, subtitle }) => (
    <TouchableOpacity style={[styles.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
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
        backgroundColor: '#f7f6f8', // background-light
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
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#f7f6f8',
        zIndex: 1, // ensure sticky behavior feel
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        height: 48,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        paddingHorizontal: 12,
        fontSize: 16,
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
    addNewIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#a413ec',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: "#a413ec",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
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
});
