import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen({ navigation }) {
    const [taskView, setTaskView] = useState('self');

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuAHx9e9D_5sUa2ulTO6bWzQ7uiI7wq3dDBgH6lQeq-DWrCg2Vm-QL_fgL3IZAyFgBkpqk9-qsyhgVMLFetdlJtQunQl9PI8rqU-BpQWl88MayrAL6d28wIRjg9KHnGk6W0ziRGED2HnX5cvTGWUqDXlBICJMJhzYUNtUfao3MZlWJ3T2aTYW00I7pARA0BKohW1mfc3Hynm0wUdi3QjtwPE-yyuHmxYhxfo3xj9TGF2ngWc7SKYjvEECbc6Jmkbgh-Vx44q5Xky2uuV" }}
                            style={styles.avatar}
                        />
                        <View style={styles.onlineBadge} />
                    </View>
                    <View>
                        <Text style={styles.greeting}>Good Morning,</Text>
                        <Text style={styles.userName}>Sarah Jenkins</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.notificationBtn}>
                    <MaterialIcons name="notifications" size={28} color="#170d1b" />
                    <View style={styles.notificationBadge} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Toggle */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, taskView === 'self' && styles.toggleBtnActive]}
                        onPress={() => setTaskView('self')}
                    >
                        <Text style={[styles.toggleText, taskView === 'self' && styles.toggleTextActive]}>Self Tasks</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, taskView === 'assigned' && styles.toggleBtnActive]}
                        onPress={() => setTaskView('assigned')}
                    >
                        <Text style={[styles.toggleText, taskView === 'assigned' && styles.toggleTextActive]}>Assigned Tasks</Text>
                    </TouchableOpacity>
                </View>

                {/* Overview */}
                <Text style={styles.sectionTitle}>Overview</Text>
                <View style={styles.overviewGrid}>
                    <View style={styles.statCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#FFEBEE' }]}>
                            <MaterialIcons name="priority-high" size={20} color="#D32F2F" />
                        </View>
                        <Text style={[styles.statValue, { color: '#D32F2F' }]}>2</Text>
                        <Text style={styles.statLabel}>OVERDUE</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#FFEBEE' }]}>
                            <MaterialIcons name="hourglass-top" size={20} color="#EF5350" />
                        </View>
                        <Text style={[styles.statValue, { color: '#170d1b' }]}>3</Text>
                        <Text style={styles.statLabel}>DUE SOON</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
                            <MaterialIcons name="pending-actions" size={20} color="#F57C00" />
                        </View>
                        <Text style={[styles.statValue, { color: '#170d1b' }]}>5</Text>
                        <Text style={styles.statLabel}>IN PROGRESS</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                            <MaterialIcons name="check-circle" size={20} color="#2E7D32" />
                        </View>
                        <Text style={[styles.statValue, { color: '#170d1b' }]}>12</Text>
                        <Text style={styles.statLabel}>COMPLETED</Text>
                    </View>
                </View>

                {/* Task List */}
                <View style={styles.taskList}>
                    {/* Overdue Task */}
                    <View style={[styles.taskCard, { borderLeftColor: '#D32F2F' }]}>
                        <View style={styles.taskHeader}>
                            <View style={[styles.statusChip, { backgroundColor: '#FFEBEE' }]}>
                                <Text style={[styles.statusText, { color: '#D32F2F' }]}>OVER DUE</Text>
                            </View>
                            <TouchableOpacity>
                                <MaterialIcons name="more-horiz" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.taskTitle}>Quarterly Safety Review</Text>
                        <Text style={styles.taskMeta}>Compliance • High Priority</Text>
                        <View style={styles.taskFooter}>
                            <View style={styles.footerLeft}>
                                <MaterialIcons name="event-busy" size={16} color="#D32F2F" />
                                <Text style={[styles.dateText, { color: '#D32F2F' }]}>Yesterday</Text>
                            </View>
                            <Image
                                source={{ uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuCbmGmqZDF1K6nKoDeSxT4Z7JUfe8TBd3ly0iRlsXM65lVwQHS2c-sgS0-pGAbzC0hVFPx5eyzEUgDCkl7MwVeW9Fd-_oNKbrRgUpaCZr9VuRRxgvq-qmLnNOh_sMcFmD6Y0mZIwhEU6FJiRHlTJd5mjxumDVtGwLpX3qLrFA61uXLW6fh7Th0x_OTPQ9S82-4CtIw24ykJ1UNX6UYpeDuBlqKvQjurFm8voAjbrgaEwJAjVnVYAp412VqdEtRvD2m84COORkWzlJ9P" }}
                                style={styles.smallAvatar}
                            />
                        </View>
                    </View>

                    {/* Due Soon Task */}
                    <View style={[styles.taskCard, { borderLeftColor: '#EF5350' }]}>
                        <View style={styles.taskHeader}>
                            <View style={[styles.statusChip, { backgroundColor: '#FFEBEE' }]}>
                                <Text style={[styles.statusText, { color: '#EF5350' }]}>DUE SOON</Text>
                            </View>
                            <TouchableOpacity>
                                <MaterialIcons name="more-horiz" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.taskTitle}>Update Vendor Contracts</Text>
                        <Text style={styles.taskMeta}>Legal • Medium Priority</Text>
                        <View style={styles.taskFooter}>
                            <View style={styles.footerLeft}>
                                <MaterialIcons name="schedule" size={16} color="#EF5350" />
                                <Text style={[styles.dateText, { color: '#EF5350' }]}>Tomorrow, 5:00 PM</Text>
                            </View>
                            <TouchableOpacity style={styles.startBtn}>
                                <Text style={styles.startBtnText}>Start</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                </View>

                {/* Quick Links */}
                <View style={styles.linksContainer}>
                    <TouchableOpacity style={styles.linkCard}>
                        <View style={styles.linkLeft}>
                            <View style={styles.linkIcon}>
                                <MaterialIcons name="folder-shared" size={24} color="#a413ec" />
                            </View>
                            <Text style={styles.linkText}>Document Management</Text>
                        </View>
                        <MaterialIcons name="expand-more" size={24} color="#9CA3AF" style={{ transform: [{ rotate: '-90deg' }] }} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.linkCard}>
                        <View style={styles.linkLeft}>
                            <View style={styles.linkIcon}>
                                <MaterialIcons name="policy" size={24} color="#a413ec" />
                            </View>
                            <Text style={styles.linkText}>Compliance Management</Text>
                        </View>
                        <MaterialIcons name="expand-more" size={24} color="#9CA3AF" style={{ transform: [{ rotate: '-90deg' }] }} />
                    </TouchableOpacity>
                </View>

            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('TaskCreate')}>
                <MaterialIcons name="add" size={30} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#faf8fc',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
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
        borderColor: '#fce7f3', // primary/20ish
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
        borderColor: '#fff',
    },
    greeting: {
        fontSize: 12,
        color: '#804c9a',
        fontWeight: '500',
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#170d1b',
    },
    notificationBtn: {
        padding: 8,
        position: 'relative',
        backgroundColor: '#f3f4f6',
        borderRadius: 20,
    },
    notificationBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#D32F2F',
        borderWidth: 1,
        borderColor: '#fff',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 80,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        marginBottom: 24,
    },
    toggleBtn: {
        flex: 1,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    toggleBtnActive: {
        backgroundColor: '#a413ec',
        shadowColor: "#a413ec",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 2,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#804c9a',
    },
    toggleTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#170d1b',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    overviewGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        width: '48%',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f3f4f6',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    iconContainer: {
        padding: 8,
        borderRadius: 20,
        marginBottom: 8,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#804c9a',
        letterSpacing: 0.5,
    },
    taskList: {
        gap: 16,
        marginBottom: 24,
    },
    taskCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        borderLeftWidth: 6, // Status indicator
        padding: 16,
        paddingLeft: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    statusChip: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#170d1b',
        marginBottom: 4,
    },
    taskMeta: {
        fontSize: 14,
        color: '#804c9a',
        marginBottom: 12,
    },
    taskFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f9fafb',
    },
    footerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '600',
    },
    smallAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#fff',
    },
    startBtn: {
        backgroundColor: 'rgba(164, 19, 236, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 6,
    },
    startBtnText: {
        color: '#a413ec',
        fontSize: 12,
        fontWeight: '700',
    },
    linksContainer: {
        gap: 12,
    },
    linkCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    linkLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    linkIcon: {
        padding: 8,
        backgroundColor: 'rgba(164, 19, 236, 0.1)',
        borderRadius: 8,
    },
    linkText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#170d1b',
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
        shadowRadius: 8,
        elevation: 6,
    }
});
