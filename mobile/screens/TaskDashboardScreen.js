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
  Modal,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getTasks, createTask } from '../services/taskService';
import { getAllUsers } from '../services/conversationService';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

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
  const [showTaskCreateModal, setShowTaskCreateModal] = useState(false);
  
  // Task creation form state
  const [taskType, setTaskType] = useState('one_time');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [targetDate, setTargetDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [showDuePicker, setShowDuePicker] = useState(false);
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [activeDateField, setActiveDateField] = useState(null);
  const [users, setUsers] = useState([]);
  const [createTaskLoading, setCreateTaskLoading] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('weekly');
  const [autoEscalate, setAutoEscalate] = useState(false);
  
  const { user } = useAuth();
  const { updateCounts, updateTaskCount } = useNotifications();

  useEffect(() => {
    loadTasks();
  }, [activeTab]);

  useEffect(() => {
    filterTasks();
  }, [searchQuery, tasks]);

  useEffect(() => {
    if (showTaskCreateModal) {
      loadUsers();
    }
  }, [showTaskCreateModal]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await getTasks({ type: activeTab });
      setTasks(data);
      setFilteredTasks(data);
      // Update task notification count after loading tasks
      updateTaskCount();
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

  const loadUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Load users error:', error);
    }
  };

  const formatDateTime = (date) => {
    if (!date) return '';
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDatePress = (field) => {
    setActiveDateField(field);
    if (field === 'start') {
      setTempDate(startDate);
      setShowStartPicker(true);
    } else if (field === 'target') {
      setTempDate(targetDate);
      setShowTargetPicker(true);
    } else if (field === 'due') {
      setTempDate(dueDate);
      setShowDuePicker(true);
    }
  };

  const confirmDateSelection = () => {
    if (activeDateField === 'start') {
      setStartDate(tempDate);
      setShowStartPicker(false);
    } else if (activeDateField === 'target') {
      setTargetDate(tempDate);
      setShowTargetPicker(false);
    } else if (activeDateField === 'due') {
      setDueDate(tempDate);
      setShowDuePicker(false);
    }
    setActiveDateField(null);
  };

  const cancelDateSelection = () => {
    setShowStartPicker(false);
    setShowTargetPicker(false);
    setShowDuePicker(false);
    setActiveDateField(null);
  };

  const updateTempDate = (field, value) => {
    const newDate = new Date(tempDate);
    if (field === 'year') {
      newDate.setFullYear(value);
    } else if (field === 'month') {
      newDate.setMonth(value - 1);
    } else if (field === 'day') {
      newDate.setDate(value);
    } else if (field === 'hour') {
      newDate.setHours(value);
    } else if (field === 'minute') {
      newDate.setMinutes(value);
    }
    setTempDate(newDate);
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const handleCreateTask = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    if (!dueDate) {
      Alert.alert('Error', 'Please select a due date');
      return;
    }

    if (selectedAssignees.length === 0) {
      Alert.alert('Error', 'Please assign the task to at least one person');
      return;
    }

    setCreateTaskLoading(true);
    try {
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        task_type: taskType,
        priority,
        assignee_ids: selectedAssignees.map(a => a.id),
        start_date: startDate.toISOString(),
        target_date: targetDate.toISOString(),
        due_date: dueDate.toISOString(),
        recurrence_type: taskType === 'recurring' ? recurrenceType : null,
        recurrence_interval: 1,
        auto_escalate: autoEscalate,
      };

      await createTask(taskData);
      Alert.alert('Success', 'Task created successfully!', [
        { 
          text: 'OK', 
          onPress: () => {
            resetTaskForm();
            setShowTaskCreateModal(false);
            loadTasks();
            // Update notification counts after creating task
            updateCounts();
          }
        }
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create task');
    } finally {
      setCreateTaskLoading(false);
    }
  };

  const resetTaskForm = () => {
    setTaskType('one_time');
    setTitle('');
    setDescription('');
    setPriority('medium');
    setSelectedAssignees([]);
    setStartDate(new Date());
    setTargetDate(new Date());
    setDueDate(new Date());
    setRecurrenceType('weekly');
    setAutoEscalate(false);
  };

  const toggleAssignee = (user) => {
    setSelectedAssignees(prev => {
      const exists = prev.find(u => u.id === user.id);
      if (exists) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
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

  const renderDatePicker = () => {
    const currentYear = tempDate.getFullYear();
    const currentMonth = tempDate.getMonth() + 1;
    const currentDay = tempDate.getDate();
    const currentHour = tempDate.getHours();
    const currentMinute = tempDate.getMinutes();

    const years = [];
    for (let i = new Date().getFullYear(); i <= new Date().getFullYear() + 5; i++) {
      years.push(i);
    }

    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const days = Array.from({ length: getDaysInMonth(currentYear, currentMonth) }, (_, i) => i + 1);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
      <View style={styles.taskModalDatePickerContent}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.taskModalDatePickerScroll}>
          <View style={styles.taskModalDatePickerColumn}>
            <Text style={styles.taskModalDatePickerLabel}>Year</Text>
            <ScrollView style={styles.taskModalDatePickerList}>
              {years.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[styles.taskModalDatePickerItem, currentYear === year && styles.taskModalDatePickerItemSelected]}
                  onPress={() => updateTempDate('year', year)}
                >
                  <Text style={[styles.taskModalDatePickerItemText, currentYear === year && styles.taskModalDatePickerItemTextSelected]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.taskModalDatePickerColumn}>
            <Text style={styles.taskModalDatePickerLabel}>Month</Text>
            <ScrollView style={styles.taskModalDatePickerList}>
              {months.map((month) => (
                <TouchableOpacity
                  key={month}
                  style={[styles.taskModalDatePickerItem, currentMonth === month && styles.taskModalDatePickerItemSelected]}
                  onPress={() => updateTempDate('month', month)}
                >
                  <Text style={[styles.taskModalDatePickerItemText, currentMonth === month && styles.taskModalDatePickerItemTextSelected]}>
                    {month.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.taskModalDatePickerColumn}>
            <Text style={styles.taskModalDatePickerLabel}>Day</Text>
            <ScrollView style={styles.taskModalDatePickerList}>
              {days.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[styles.taskModalDatePickerItem, currentDay === day && styles.taskModalDatePickerItemSelected]}
                  onPress={() => updateTempDate('day', day)}
                >
                  <Text style={[styles.taskModalDatePickerItemText, currentDay === day && styles.taskModalDatePickerItemTextSelected]}>
                    {day.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.taskModalDatePickerColumn}>
            <Text style={styles.taskModalDatePickerLabel}>Hour</Text>
            <ScrollView style={styles.taskModalDatePickerList}>
              {hours.map((hour) => (
                <TouchableOpacity
                  key={hour}
                  style={[styles.taskModalDatePickerItem, currentHour === hour && styles.taskModalDatePickerItemSelected]}
                  onPress={() => updateTempDate('hour', hour)}
                >
                  <Text style={[styles.taskModalDatePickerItemText, currentHour === hour && styles.taskModalDatePickerItemTextSelected]}>
                    {hour.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.taskModalDatePickerColumn}>
            <Text style={styles.taskModalDatePickerLabel}>Minute</Text>
            <ScrollView style={styles.taskModalDatePickerList}>
              {minutes.map((minute) => (
                <TouchableOpacity
                  key={minute}
                  style={[styles.taskModalDatePickerItem, currentMinute === minute && styles.taskModalDatePickerItemSelected]}
                  onPress={() => updateTempDate('minute', minute)}
                >
                  <Text style={[styles.taskModalDatePickerItemText, currentMinute === minute && styles.taskModalDatePickerItemTextSelected]}>
                    {minute.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderAssignee = ({ item }) => {
    const isSelected = selectedAssignees.find(u => u.id === item.id);
    return (
      <TouchableOpacity
        style={[styles.taskModalAssigneeItem, isSelected && styles.taskModalAssigneeItemSelected]}
        onPress={() => toggleAssignee(item)}
      >
        <View style={styles.taskModalAssigneeAvatar}>
          <Text style={styles.taskModalAssigneeAvatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.taskModalAssigneeName}>{item.name}</Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={PRIMARY_COLOR} />
        )}
      </TouchableOpacity>
    );
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
              onPress={() => {
                resetTaskForm();
                setShowTaskCreateModal(true);
              }}
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
              onPress={() => {
                resetTaskForm();
                setShowTaskCreateModal(true);
              }}
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

        {/* Task Create Modal - Overlay Style */}
        <Modal
          visible={showTaskCreateModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => {
            setShowTaskCreateModal(false);
            resetTaskForm();
          }}
        >
          <View style={styles.taskModalOverlay}>
            <TouchableOpacity
              style={styles.taskModalBackdrop}
              activeOpacity={1}
              onPress={() => {
                setShowTaskCreateModal(false);
                resetTaskForm();
              }}
            />
            <View style={styles.taskModalContent}>
              <View style={styles.taskModalHeader}>
                <Text style={styles.taskModalHeaderTitle}>Create Task</Text>
                <TouchableOpacity
                  style={styles.taskModalCloseButton}
                  onPress={() => {
                    setShowTaskCreateModal(false);
                    resetTaskForm();
                  }}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.taskModalScrollView}
                contentContainerStyle={styles.taskModalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.taskModalTabContainer}>
                  <TouchableOpacity
                    style={[styles.taskModalTab, taskType === 'one_time' && styles.taskModalActiveTab]}
                    onPress={() => setTaskType('one_time')}
                  >
                    <Text style={[styles.taskModalTabText, taskType === 'one_time' && styles.taskModalActiveTabText]}>
                      One-Time Task
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.taskModalTab, taskType === 'recurring' && styles.taskModalActiveTab]}
                    onPress={() => setTaskType('recurring')}
                  >
                    <Text style={[styles.taskModalTabText, taskType === 'recurring' && styles.taskModalActiveTabText]}>
                      Recurring Task
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.taskModalFieldContainer}>
                  <Text style={styles.taskModalLabel}>Task Title</Text>
                  <TextInput
                    style={styles.taskModalInput}
                    placeholder="e.g., Q3 Financial Review"
                    value={title}
                    onChangeText={setTitle}
                    placeholderTextColor={TEXT_SECONDARY}
                  />
                </View>

                <View style={styles.taskModalFieldContainer}>
                  <Text style={styles.taskModalLabel}>Description</Text>
                  <TextInput
                    style={[styles.taskModalInput, styles.taskModalTextArea]}
                    placeholder="Add detailed instructions..."
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    placeholderTextColor={TEXT_SECONDARY}
                  />
                </View>

                <View style={styles.taskModalFieldContainer}>
                  <Text style={styles.taskModalLabel}>Assigned To</Text>
                  <TouchableOpacity
                    style={styles.taskModalAssigneeButton}
                    onPress={() => setShowAssigneeModal(true)}
                  >
                    <Ionicons name="people-outline" size={20} color={PRIMARY_COLOR} />
                    <Text style={styles.taskModalAssigneeButtonText}>
                      {selectedAssignees.length > 0
                        ? `${selectedAssignees.length} selected`
                        : 'Select employee or team'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={TEXT_SECONDARY} />
                  </TouchableOpacity>
                </View>

                <View style={styles.taskModalSectionHeader}>
                  <Text style={styles.taskModalSectionTitle}>SCHEDULE</Text>
                </View>

                <View style={styles.taskModalFieldContainer}>
                  <Text style={styles.taskModalLabel}>Start Date</Text>
                  <TouchableOpacity
                    style={styles.taskModalDateButton}
                    onPress={() => handleDatePress('start')}
                  >
                    <Text style={styles.taskModalDateButtonText}>
                      {formatDateTime(startDate)}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color={TEXT_SECONDARY} />
                  </TouchableOpacity>
                </View>

                <View style={styles.taskModalFieldContainer}>
                  <Text style={styles.taskModalLabel}>Target Date</Text>
                  <TouchableOpacity
                    style={styles.taskModalDateButton}
                    onPress={() => handleDatePress('target')}
                  >
                    <Text style={styles.taskModalDateButtonText}>
                      {formatDateTime(targetDate)}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color={TEXT_SECONDARY} />
                  </TouchableOpacity>
                </View>

                <View style={styles.taskModalFieldContainer}>
                  <Text style={styles.taskModalLabel}>
                    <Ionicons name="calendar" size={16} color={PRIMARY_COLOR} /> Due Date
                  </Text>
                  <TouchableOpacity
                    style={styles.taskModalDateButton}
                    onPress={() => handleDatePress('due')}
                  >
                    <Text style={styles.taskModalDateButtonText}>
                      {formatDateTime(dueDate)}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color={TEXT_SECONDARY} />
                  </TouchableOpacity>
                </View>

                {taskType === 'recurring' && (
                  <View style={styles.taskModalFieldContainer}>
                    <Text style={styles.taskModalLabel}>Recurrence</Text>
                    <View style={styles.taskModalRecurrenceContainer}>
                      {['weekly', 'monthly', 'quarterly', 'yearly'].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.taskModalRecurrenceOption,
                            recurrenceType === type && styles.taskModalRecurrenceOptionSelected,
                          ]}
                          onPress={() => setRecurrenceType(type)}
                        >
                          <Text
                            style={[
                              styles.taskModalRecurrenceText,
                              recurrenceType === type && styles.taskModalRecurrenceTextSelected,
                            ]}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.taskModalFieldContainer}>
                  <Text style={styles.taskModalLabel}>Priority</Text>
                  <View style={styles.taskModalPriorityContainer}>
                    {['low', 'medium', 'high'].map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.taskModalPriorityOption,
                          priority === p && styles.taskModalPriorityOptionSelected,
                        ]}
                        onPress={() => setPriority(p)}
                      >
                        <Text
                          style={[
                            styles.taskModalPriorityText,
                            priority === p && styles.taskModalPriorityTextSelected,
                          ]}
                        >
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.taskModalCreateButton}
                  onPress={handleCreateTask}
                  disabled={createTaskLoading}
                >
                  {createTaskLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      <Text style={styles.taskModalCreateButtonText}>Create Task</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>

          {/* Assignee Selection Modal */}
          <Modal
            visible={showAssigneeModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowAssigneeModal(false)}
          >
            <View style={styles.taskModalAssigneeOverlay}>
              <TouchableOpacity
                style={styles.taskModalAssigneeBackdrop}
                activeOpacity={1}
                onPress={() => setShowAssigneeModal(false)}
              />
              <View style={styles.taskModalAssigneeContent}>
                <View style={styles.taskModalAssigneeHeader}>
                  <Text style={styles.taskModalAssigneeHeaderTitle}>Select Assignees</Text>
                  <TouchableOpacity onPress={() => setShowAssigneeModal(false)}>
                    <Ionicons name="close" size={24} color={TEXT_PRIMARY} />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={users}
                  renderItem={renderAssignee}
                  keyExtractor={(item) => item.id}
                  style={styles.taskModalAssigneeList}
                />
              </View>
            </View>
          </Modal>

          {/* Date Picker Modal */}
          <Modal
            visible={showStartPicker || showTargetPicker || showDuePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={cancelDateSelection}
          >
            <View style={styles.taskModalDatePickerOverlay}>
              <TouchableOpacity
                style={styles.taskModalDatePickerBackdrop}
                activeOpacity={1}
                onPress={cancelDateSelection}
              />
              <View style={styles.taskModalDatePickerContainer}>
                <View style={styles.taskModalDatePickerHeader}>
                  <TouchableOpacity onPress={cancelDateSelection}>
                    <Text style={styles.taskModalDatePickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.taskModalDatePickerTitle}>
                    {activeDateField === 'start' && 'Start Date'}
                    {activeDateField === 'target' && 'Target Date'}
                    {activeDateField === 'due' && 'Due Date'}
                  </Text>
                  <TouchableOpacity onPress={confirmDateSelection}>
                    <Text style={styles.taskModalDatePickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                {renderDatePicker()}
              </View>
            </View>
          </Modal>
        </Modal>
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
  // Task Create Modal Styles - Overlay Style
  taskModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  taskModalContent: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: CARD_BG,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  taskModalHeader: {
    backgroundColor: PRIMARY_COLOR,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  taskModalHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    flex: 1,
  },
  taskModalCloseButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 36,
    height: 36,
  },
  taskModalScrollView: {
    maxHeight: 500,
  },
  taskModalScrollContent: {
    padding: 16,
  },
  taskModalTabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  taskModalTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: LIGHT_BG,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  taskModalActiveTab: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  taskModalTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  taskModalActiveTabText: {
    color: '#FFFFFF',
  },
  taskModalFieldContainer: {
    marginBottom: 20,
  },
  taskModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  taskModalInput: {
    backgroundColor: LIGHT_BG,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  taskModalTextArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  taskModalAssigneeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIGHT_BG,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    gap: 8,
  },
  taskModalAssigneeButtonText: {
    flex: 1,
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  taskModalSectionHeader: {
    marginTop: 8,
    marginBottom: 16,
  },
  taskModalSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 1,
  },
  taskModalDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: LIGHT_BG,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  taskModalDateButtonText: {
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  taskModalRecurrenceContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  taskModalRecurrenceOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: LIGHT_BG,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  taskModalRecurrenceOptionSelected: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  taskModalRecurrenceText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  taskModalRecurrenceTextSelected: {
    color: '#FFFFFF',
  },
  taskModalPriorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  taskModalPriorityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: LIGHT_BG,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  taskModalPriorityOptionSelected: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  taskModalPriorityText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  taskModalPriorityTextSelected: {
    color: '#FFFFFF',
  },
  taskModalCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
    gap: 8,
  },
  taskModalCreateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Assignee Modal Styles
  taskModalAssigneeOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  taskModalAssigneeBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  taskModalAssigneeContent: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  taskModalAssigneeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  taskModalAssigneeHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  taskModalAssigneeList: {
    maxHeight: 400,
  },
  taskModalAssigneeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    gap: 12,
  },
  taskModalAssigneeItemSelected: {
    backgroundColor: '#F3F4F6',
  },
  taskModalAssigneeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskModalAssigneeAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  taskModalAssigneeName: {
    flex: 1,
    fontSize: 16,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  // Date Picker Modal Styles
  taskModalDatePickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  taskModalDatePickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  taskModalDatePickerContainer: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  taskModalDatePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  taskModalDatePickerCancel: {
    fontSize: 16,
    color: TEXT_SECONDARY,
  },
  taskModalDatePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  taskModalDatePickerDone: {
    fontSize: 16,
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  taskModalDatePickerContent: {
    paddingVertical: 20,
  },
  taskModalDatePickerScroll: {
    flexDirection: 'row',
  },
  taskModalDatePickerColumn: {
    width: 80,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  taskModalDatePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  taskModalDatePickerList: {
    maxHeight: 200,
  },
  taskModalDatePickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
    minWidth: 60,
    alignItems: 'center',
  },
  taskModalDatePickerItemSelected: {
    backgroundColor: PRIMARY_COLOR,
  },
  taskModalDatePickerItemText: {
    fontSize: 16,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  taskModalDatePickerItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default TaskDashboardScreen;

