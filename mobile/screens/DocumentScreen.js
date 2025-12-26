import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DocumentScreen({ navigation }) {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#f7f5f8" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuD6kUqionXvfxqOWDD4_XKS3fxhDDnmdLNb0R9sQXtLaRImRkEah1OtdguSQJbn3xYFiCcrm_ACIHRd3KlIKj0NcYext9iiRGdajzqt8QLyVHhvZq9ZNVgd-dTaPrOMK8zVXl-QFMooLcK2jMljMmuN31B1OUNnJfeM7r2V-Vwg_bGko0UeMbt_wofHGyQP4wBwXwJkgCRjzFfZWt6Nkskt1rakbr6nW_VFruDjdlDQF4PU48hyBjQFJ2x-DWLDffhA603u7ZRb_w5A" }}
                            style={styles.avatar}
                        />
                        <View style={styles.onlineBadge} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Documents</Text>
                        <Text style={styles.headerSubtitle}>Good morning, Sarah</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.notificationBtn}>
                    <MaterialIcons name="notifications" size={24} color="#334155" />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <MaterialIcons name="search" size={24} color="#94a3b8" style={{ marginLeft: 16 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search files, templates..."
                        placeholderTextColor="#94a3b8"
                    />
                    <TouchableOpacity style={styles.tuneBtn}>
                        <MaterialIcons name="tune" size={24} color="#7c03b9" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Default Templates */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Default Templates</Text>
                    <TouchableOpacity>
                        <Text style={styles.viewAllText}>View all</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templatesList}>
                    <TemplateItem icon="receipt-long" color="#7c03b9" label="Accounting" bgColor="rgba(124, 3, 185, 0.1)" />
                    <TemplateItem icon="request-quote" color="#f97316" label="Expenses" bgColor="rgba(249, 115, 22, 0.1)" />
                    <TemplateItem icon="gavel" color="#a855f7" label="Contracts" bgColor="rgba(168, 85, 247, 0.1)" />
                    <TemplateItem icon="campaign" color="#14b8a6" label="Marketing" bgColor="rgba(20, 184, 166, 0.1)" />
                    <TemplateItem icon="more-horiz" color="#64748b" label="More" bgColor="rgba(100, 116, 139, 0.1)" />
                </ScrollView>

                {/* Categories */}
                <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                    <Text style={styles.sectionTitle}>Categories</Text>
                    <View style={styles.viewToggle}>
                        <View style={[styles.toggleOption, styles.toggleActive]}>
                            <MaterialIcons name="grid-view" size={18} color="#0f172a" />
                        </View>
                        <View style={styles.toggleOption}>
                            <MaterialIcons name="list" size={18} color="#64748b" />
                        </View>
                    </View>
                </View>
                <View style={styles.categoriesGrid}>
                    <CategoryCard icon="folder-shared" color="#7c03b9" count="12" title="Shared" subtitle="Team Projects" />
                    <CategoryCard icon="folder-special" color="#eab308" count="5" title="Personal" subtitle="My Drafts" />
                    <CategoryCard icon="shield" color="#f87171" count="3" title="Compliance" subtitle="Policies" />
                    <CategoryCard icon="admin-panel-settings" color="#94a3b8" count="8" title="Admin" subtitle="Staff Only" />
                </View>

                {/* Recent Files */}
                <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Recent Files</Text>
                <View style={styles.filesList}>
                    <FileItem
                        icon="picture-as-pdf"
                        iconColor="#ef4444"
                        bg="#fef2f2"
                        title="Q3_Financial_Report.pdf"
                        size="2.4 MB"
                        time="Edited 2h ago"
                    />
                    <FileItem
                        icon="description"
                        iconColor="#3b82f6"
                        bg="#eff6ff"
                        title="Employee_Handbook_2024.docx"
                        size="5.1 MB"
                        time="Yesterday"
                    />
                    <FileItem
                        image="https://lh3.googleusercontent.com/aida-public/AB6AXuBpuUbon9-yts8JvvIaYd7etdZHJ4HFxWz_vyoSVUB-RiQd58oTbwPCWsEeIG12uZ2QFxLwpOAdbNA3EY5JsaQOxrH0qXizdVitaiUcjVjgKW0MIHzj531jA6b6ouxFUapYNv-cQnSMF5jTZvoUaZw9cU5ZZ4UQOOwImEW97BH6Ig44YjE2vVPuwqSwbs0p0tYFg5F7F2kj0X6imRo8jYMSYO90iNj03g9lDwLinUY6attPPDaUMxNmunnC2O_GM9TL-CW219CN_Fmw"
                        title="Office_Layout_Plan_v2.png"
                        size="4.8 MB"
                        time="2 days ago"
                    />
                </View>

            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => { }}>
                <MaterialIcons name="add" size={28} color="#0d1b12" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const TemplateItem = ({ icon, color, label, bgColor }) => (
    <TouchableOpacity style={styles.templateItem}>
        <View style={[styles.templateIcon, { backgroundColor: bgColor }]}>
            <MaterialIcons name={icon} size={32} color={color} />
        </View>
        <Text style={styles.templateLabel}>{label}</Text>
    </TouchableOpacity>
);

const CategoryCard = ({ icon, color, count, title, subtitle }) => (
    <TouchableOpacity style={styles.categoryCard}>
        <View style={styles.categoryHeader}>
            <MaterialIcons name={icon} size={28} color={color} />
            <Text style={styles.categoryCount}>{count}</Text>
        </View>
        <Text style={styles.categoryTitle}>{title}</Text>
        <Text style={styles.categorySubtitle}>{subtitle}</Text>
    </TouchableOpacity>
);

const FileItem = ({ icon, iconColor, bg, image, title, size, time }) => (
    <TouchableOpacity style={styles.fileItem}>
        {image ? (
            <Image source={{ uri: image }} style={styles.fileThumbnail} />
        ) : (
            <View style={[styles.fileIcon, { backgroundColor: bg }]}>
                <MaterialIcons name={icon} size={24} color={iconColor} />
            </View>
        )}
        <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={1}>{title}</Text>
            <View style={styles.fileMeta}>
                <Text style={styles.metaText}>{size}</Text>
                <View style={styles.dot} />
                <Text style={styles.metaText}>{time}</Text>
            </View>
        </View>
        <TouchableOpacity style={{ padding: 8 }}>
            <MaterialIcons name="more-vert" size={24} color="#94a3b8" />
        </TouchableOpacity>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f5f8',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f7f5f8', // Using background-light
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
        borderColor: '#7c03b9',
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#7c03b9', // Primary
        borderWidth: 2,
        borderColor: '#f7f5f8',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
        lineHeight: 22,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#64748b',
    },
    notificationBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        height: 48,
        borderWidth: 1,
        borderColor: '#f1f5f9',
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
        color: '#0f172a',
    },
    tuneBtn: {
        paddingRight: 16,
        paddingLeft: 8,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
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
        color: '#0f172a',
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#7c03b9',
    },
    templatesList: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 16,
    },
    templateItem: {
        alignItems: 'center',
        gap: 8,
        minWidth: 80,
    },
    templateIcon: {
        width: 80, // Approximate aspect-square based on design
        height: 80,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    templateLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#334155',
        textAlign: 'center',
    },
    viewToggle: {
        flexDirection: 'row',
        backgroundColor: '#e2e8f0',
        borderRadius: 8,
        padding: 2,
    },
    toggleOption: {
        padding: 4,
        borderRadius: 6,
    },
    toggleActive: {
        backgroundColor: '#ffffff',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        elevation: 1,
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        gap: 12,
    },
    categoryCard: {
        width: '48%', // roughly half
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    categoryCount: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94a3b8',
    },
    categoryTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
    },
    categorySubtitle: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    filesList: {
        paddingHorizontal: 16,
        gap: 12,
    },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    fileIcon: {
        width: 48,
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fileThumbnail: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 2,
    },
    fileMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metaText: {
        fontSize: 12,
        color: '#64748b',
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#cbd5e1',
    },
    fab: {
        position: 'absolute',
        bottom: 24, // above bottom nav height
        right: 16,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#7c03b9',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#7c03b9",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    }
});
