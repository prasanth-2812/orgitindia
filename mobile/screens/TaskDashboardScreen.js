import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getTasks } from '../services/taskService';
import { useAuth } from '../context/AuthContext';

// Corporate Purple Theme
const PRIMARY_COLOR = '#7C3AED';
const PRIMARY_LIGHT = '#A78BFA';
const LIGHT_BG = '#F9FAFB';
const CARD_BG = '#FFFFFF';
const TEXT_PRIMARY = '#1F2937';
const TEXT_SECONDARY = '#6B7280';
const BORDER_COLOR = '#E5E7EB';
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.05)';

const TaskDashboardScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('one_time');
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    loadTasks();
  }, [activeTab]);

  useEffect(() => {
    filterTasks();
  }, [searchQuery, tasks]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await getTasks({ type: activeTab });
      setTasks(data);
      setFilteredTasks(data);
    } catch (error) {
      console.error('Load tasks error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterTasks = () => {
    if (!searchQuery.trim()) {
      setFilteredTasks(tasks);
      return;
    }

    const lower = searchQuery.toLowerCase();
    const filtered = tasks.filter((task) =>
      task.title.toLowerCase().includes(lower) ||
      (task.description && task.description.toLowerCase().includes(lower))
    );
    setFilteredTasks(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return TEXT_SECONDARY;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'in_progress': return '#7C3AED';
      case 'completed': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return TEXT_SECONDARY;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const renderTask = ({ item }) => {
    const isPending = item.status === 'pending';
    const overdue = isOverdue(item.due_date);
    const priorityColor = getPriorityColor(item.priority);
    const statusColor = getStatusColor(item.status);
    
    // Check current user's acceptance status
    const currentUserStatus = item.current_user_status;
    const hasAccepted = currentUserStatus?.has_accepted || false;
    const hasRejected = currentUserStatus?.has_rejected || false;
    const isAssigned = item.assignees?.some(a => a.id === user.id);
    
    // User can accept/reject if assigned, task is pending, and they haven't accepted/rejected
    const canAccept = isPending && isAssigned && !hasAccepted && !hasRejected;
    const canReject = isPending && isAssigned && !hasRejected && !hasAccepted;
    
    // Calculate acceptance count
    const acceptedCount = item.accepted_count || 0;
    const totalAssignees = item.total_assignees || 0;

    return (
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
        activeOpacity={0.7}
      >
        {isPending && (
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>Pending</Text>
          </View>
        )}
        {item.priority === 'high' && (
          <View style={styles.priorityBadge}>
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text style={[styles.priorityText, { color: '#EF4444' }]}>High Priority</Text>
          </View>
        )}
        {item.priority === 'medium' && (
          <View style={styles.priorityBadge}>
            <Ionicons name="bar-chart" size={16} color="#F59E0B" />
            <Text style={[styles.priorityText, { color: '#F59E0B' }]}>Medium Priority</Text>
          </View>
        )}

        <Text style={styles.taskTitle}>{item.title}</Text>
        
        <View style={styles.taskMeta}>
          <Ionicons name="calendar-outline" size={14} color={TEXT_SECONDARY} />
          <Text style={styles.taskDate}>
            Due {formatDate(item.due_date)}
          </Text>
        </View>

        {item.description && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Acceptance Status */}
        {isPending && totalAssignees > 1 && (
          <View style={styles.acceptanceStatusRow}>
            <Ionicons name="people-outline" size={14} color={TEXT_SECONDARY} />
            <Text style={styles.acceptanceStatusText}>
              {acceptedCount} of {totalAssignees} accepted
            </Text>
            {hasAccepted && (
              <View style={styles.userAcceptedIndicator}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.userAcceptedText}>You accepted</Text>
              </View>
            )}
          </View>
        )}

        {(canAccept || canReject) && (
          <View style={styles.actionButtons}>
            {canReject && (
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  navigation.navigate('TaskDetail', { taskId: item.id, showReject: true });
                }}
              >
                <Ionicons name="close" size={16} color="#EF4444" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
            )}
            {canAccept && (
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  navigation.navigate('TaskDetail', { taskId: item.id, showAccept: true });
                }}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {overdue && item.status !== 'completed' && (
          <View style={styles.overdueBadge}>
            <Text style={styles.overdueText}>Overdue</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const pendingTasks = filteredTasks.filter(t => t.status === 'pending');
  const allTasks = filteredTasks.filter(t => t.status !== 'pending');

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Ionicons name="person-circle-outline" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Tasks</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {/* Filter */}}
            >
              <Ionicons name="filter-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('TaskCreate')}
            >
              <Ionicons name="add-circle" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'one_time' && styles.activeTab]}
            onPress={() => setActiveTab('one_time')}
          >
            <Text style={[styles.tabText, activeTab === 'one_time' && styles.activeTabText]}>
              One-Time
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'recurring' && styles.activeTab]}
            onPress={() => setActiveTab('recurring')}
          >
            <Text style={[styles.tabText, activeTab === 'recurring' && styles.activeTabText]}>
              Recurring
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            placeholderTextColor={TEXT_SECONDARY}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Ionicons name="search-outline" size={20} color={TEXT_SECONDARY} style={styles.searchIcon} />
        </View>

        {filteredTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tasks found</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('TaskCreate')}
            >
              <Text style={styles.createButtonText}>Create Task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={[
              ...(pendingTasks.length > 0 ? [{ type: 'header', title: 'PENDING REVIEW' }] : []),
              ...pendingTasks.map(t => ({ ...t, type: 'task' })),
              ...(allTasks.length > 0 ? [{ type: 'header', title: 'ALL TASKS' }] : []),
              ...allTasks.map(t => ({ ...t, type: 'task' })),
            ]}
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return (
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{item.title}</Text>
                  </View>
                );
              }
              return renderTask({ item });
            }}
            keyExtractor={(item, index) => item.id || `header-${index}`}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

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
    backgroundColor: PRIMARY_COLOR,
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    fontWeight: '600',
  },
  activeTabText: {
    color: PRIMARY_COLOR,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  searchIcon: {
    marginLeft: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    letterSpacing: 0.5,
  },
  taskCard: {
    backgroundColor: CARD_BG,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  priorityBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginTop: 8,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  taskDate: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  taskDescription: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginBottom: 12,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  rejectButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  rejectButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: PRIMARY_COLOR,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptanceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  acceptanceStatusText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  userAcceptedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 4,
  },
  userAcceptedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  overdueBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  overdueText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default TaskDashboardScreen;

