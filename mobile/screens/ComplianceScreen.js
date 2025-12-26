import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function ComplianceScreen({ navigation }) {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#f7f6f8" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuBkhJDlDQfzg3WsZ-4ipwClqpHCKW87eyeKEZyurcIKL8lHe-AF368SZGYGXc5OaF1I4KgdE4QBxytZIdNdBA-kN_BA7bIJrML1TSYK6LAxinSFkq48anPhY1bSrpB7stiKX9iuiMIU5gHc_ys5VGyz3tpsPuf2EZob4wIFOnVotplS60nPLNz0EubgT9N4BLzzvQZRCWaJhmnq4WgyMOiOzKwTnZ5RQz-pcpFAgZI-eb1V5W2atuMuU0I1XdxIseJKzcQV_7r29Lyx" }}
                            style={styles.avatar}
                        />
                        <View style={styles.onlineBadge} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Compliance Hub</Text>
                        <Text style={styles.headerSubtitle}>Admin View</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.notificationBtn}>
                    <MaterialIcons name="notifications" size={24} color="#374151" />
                    <View style={styles.notificationBadge} />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <MaterialIcons name="search" size={24} color="#9ca3af" style={{ marginLeft: 16 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search acts, filings, or circulars..."
                        placeholderTextColor="#9ca3af"
                    />
                    <TouchableOpacity style={styles.tuneBtn}>
                        <MaterialIcons name="tune" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Critical Deadline Card */}
                <LinearGradient
                    colors={['#111827', '#1f2937']}
                    style={styles.deadlineCard}
                >
                    {/* Decorative Blurs (Simulated with absolute views) */}
                    <View style={[styles.blurCircle, { top: -40, right: -40, backgroundColor: 'rgba(164, 19, 236, 0.2)' }]} />
                    <View style={[styles.blurCircle, { bottom: -24, left: -24, width: 96, height: 96, backgroundColor: 'rgba(164, 19, 236, 0.1)' }]} />

                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardLabel}>CRITICAL DEADLINE</Text>
                            <Text style={styles.cardTitle}>GSTR-1 Filing</Text>
                        </View>
                        <View style={styles.warningBadge}>
                            <MaterialIcons name="warning" size={14} color="#FECACA" />
                            <Text style={styles.warningText}>3 Days Left</Text>
                        </View>
                    </View>

                    <View style={styles.progressContainer}>
                        <View style={styles.progressRow}>
                            <Text style={styles.progressLabel}>Completion Status</Text>
                            <Text style={styles.progressValue}>85%</Text>
                        </View>
                        <View style={styles.track}>
                            <View style={[styles.bar, { width: '85%' }]} />
                        </View>
                    </View>

                    <View style={styles.cardActions}>
                        <TouchableOpacity style={styles.actionBtnWhite}>
                            <Text style={styles.btnTextDark}>Complete Now</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtnTransparent}>
                            <Text style={styles.btnTextLight}>View Details</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                {/* Repository Grid */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Compliance Repository</Text>
                    <TouchableOpacity>
                        <Text style={styles.viewAllText}>View All</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.repoGrid}>
                    <RepoCard icon="receipt-long" title="GST Regulations" subtitle="Returns, E-Invoicing & Input Tax Credit" />
                    <RepoCard icon="account-balance-wallet" title="Income Tax Act" subtitle="TDS rates, Deductions & Annual Filing" />
                    <RepoCard icon="domain" title="ROC Guidelines" subtitle="Annual Returns & MCA Compliance" />
                    <RepoCard icon="gavel" title="Business Laws" subtitle="Indian Contract Act & Companies Act" />
                </View>

                {/* Recent Updates */}
                <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                    <Text style={styles.sectionTitle}>Recent Updates</Text>
                </View>
                <View style={styles.updatesList}>
                    <UpdateCard
                        icon="notifications-active"
                        title="GST Late Fees Revised"
                        desc="New circular issued by CBIC regarding the reduction in late fees for GSTR-3B filings."
                        time="2 hours ago"
                    />
                    <UpdateCard
                        icon="description"
                        title="Form 16 Issued"
                        desc="Form 16 for the financial year 2023-24 is now available for download in the Documents tab."
                        time="Yesterday"
                    />
                </View>

            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => { }}>
                <MaterialIcons name="add" size={28} color="#ffffff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const RepoCard = ({ icon, title, subtitle }) => (
    <TouchableOpacity style={styles.repoCard}>
        <View style={styles.repoIconContainer}>
            <MaterialIcons name={icon} size={24} color="#a413ec" />
        </View>
        <Text style={styles.repoTitle}>{title}</Text>
        <Text style={styles.repoSubtitle} numberOfLines={2}>{subtitle}</Text>
    </TouchableOpacity>
);

const UpdateCard = ({ icon, title, desc, time }) => (
    <TouchableOpacity style={styles.updateCard}>
        <View style={styles.updateIconContainer}>
            <MaterialIcons name={icon} size={20} color="#6b7280" />
        </View>
        <View style={styles.updateInfo}>
            <Text style={styles.updateTitle}>{title}</Text>
            <Text style={styles.updateDesc} numberOfLines={2}>{desc}</Text>
            <Text style={styles.updateTime}>{time}</Text>
        </View>
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
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(164, 19, 236, 0.2)',
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#22c55e',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        lineHeight: 22,
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#6b7280',
    },
    notificationBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        backgroundColor: 'transparent',
    },
    notificationBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#a413ec',
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
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
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        paddingHorizontal: 12,
        fontSize: 14,
        color: '#111827',
    },
    tuneBtn: {
        paddingRight: 12,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    deadlineCard: {
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
    },
    blurCircle: {
        position: 'absolute',
        width: 128,
        height: 128,
        borderRadius: 64,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    cardLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#d1d5db',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#ffffff',
    },
    warningBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    warningText: {
        color: '#FECACA',
        fontSize: 12,
        fontWeight: '700',
    },
    progressContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    progressLabel: {
        color: '#d1d5db',
        fontSize: 14,
    },
    progressValue: {
        color: '#e9d5ff',
        fontSize: 14,
        fontWeight: '700',
    },
    track: {
        height: 8,
        backgroundColor: '#374151',
        borderRadius: 4,
        overflow: 'hidden',
    },
    bar: {
        height: 8,
        backgroundColor: '#a413ec',
        borderRadius: 4,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtnWhite: {
        flex: 1,
        backgroundColor: '#ffffff',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    actionBtnTransparent: {
        flex: 1,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    btnTextDark: {
        color: '#111827',
        fontSize: 14,
        fontWeight: '600',
    },
    btnTextLight: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#a413ec',
    },
    repoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        gap: 12,
    },
    repoCard: {
        width: '48%',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    repoIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3e8ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    repoTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    repoSubtitle: {
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 16,
    },
    updatesList: {
        paddingHorizontal: 16,
        gap: 12,
    },
    updateCard: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        gap: 12,
    },
    updateIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    updateInfo: {
        flex: 1,
    },
    updateTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    updateDesc: {
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 16,
        marginBottom: 8,
    },
    updateTime: {
        fontSize: 10,
        fontWeight: '500',
        color: '#9ca3b8',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 16,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#a413ec',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#a413ec",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
    }
});
