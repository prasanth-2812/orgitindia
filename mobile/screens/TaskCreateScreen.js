import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { createTask } from '../services/taskService';
import { getAllUsers } from '../services/conversationService';

// Corporate Purple Theme
const PRIMARY_COLOR = '#7C3AED';
const LIGHT_BG = '#F9FAFB';
const CARD_BG = '#FFFFFF';
const TEXT_PRIMARY = '#1F2937';
const TEXT_SECONDARY = '#6B7280';
const BORDER_COLOR = '#E5E7EB';

const TaskCreateScreen = ({ navigation }) => {
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
  const [activeDateField, setActiveDateField] = useState(null); // 'start', 'target', 'due'
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('weekly');
  const [autoEscalate, setAutoEscalate] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Load users error:', error);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' });
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
      <View style={styles.datePickerContent}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datePickerScroll}>
          <View style={styles.datePickerColumn}>
            <Text style={styles.datePickerLabel}>Year</Text>
            <ScrollView style={styles.datePickerList}>
              {years.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[styles.datePickerItem, currentYear === year && styles.datePickerItemSelected]}
                  onPress={() => updateTempDate('year', year)}
                >
                  <Text style={[styles.datePickerItemText, currentYear === year && styles.datePickerItemTextSelected]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.datePickerColumn}>
            <Text style={styles.datePickerLabel}>Month</Text>
            <ScrollView style={styles.datePickerList}>
              {months.map((month) => (
                <TouchableOpacity
                  key={month}
                  style={[styles.datePickerItem, currentMonth === month && styles.datePickerItemSelected]}
                  onPress={() => updateTempDate('month', month)}
                >
                  <Text style={[styles.datePickerItemText, currentMonth === month && styles.datePickerItemTextSelected]}>
                    {month.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.datePickerColumn}>
            <Text style={styles.datePickerLabel}>Day</Text>
            <ScrollView style={styles.datePickerList}>
              {days.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[styles.datePickerItem, currentDay === day && styles.datePickerItemSelected]}
                  onPress={() => updateTempDate('day', day)}
                >
                  <Text style={[styles.datePickerItemText, currentDay === day && styles.datePickerItemTextSelected]}>
                    {day.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.datePickerColumn}>
            <Text style={styles.datePickerLabel}>Hour</Text>
            <ScrollView style={styles.datePickerList}>
              {hours.map((hour) => (
                <TouchableOpacity
                  key={hour}
                  style={[styles.datePickerItem, currentHour === hour && styles.datePickerItemSelected]}
                  onPress={() => updateTempDate('hour', hour)}
                >
                  <Text style={[styles.datePickerItemText, currentHour === hour && styles.datePickerItemTextSelected]}>
                    {hour.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.datePickerColumn}>
            <Text style={styles.datePickerLabel}>Minute</Text>
            <ScrollView style={styles.datePickerList}>
              {minutes.map((minute) => (
                <TouchableOpacity
                  key={minute}
                  style={[styles.datePickerItem, currentMinute === minute && styles.datePickerItemSelected]}
                  onPress={() => updateTempDate('minute', minute)}
                >
                  <Text style={[styles.datePickerItemText, currentMinute === minute && styles.datePickerItemTextSelected]}>
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

  const handleCreate = async () => {
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

    setLoading(true);
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

      const task = await createTask(taskData);
      Alert.alert('Success', 'Task created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create task');
    } finally {
      setLoading(false);
    }
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

  const renderAssignee = ({ item }) => {
    const isSelected = selectedAssignees.find(u => u.id === item.id);
    return (
      <TouchableOpacity
        style={[styles.assigneeItem, isSelected && styles.assigneeItemSelected]}
        onPress={() => toggleAssignee(item)}
      >
        <View style={styles.assigneeAvatar}>
          <Text style={styles.assigneeAvatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.assigneeName}>{item.name}</Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={PRIMARY_COLOR} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Task</Text>
          <TouchableOpacity onPress={handleCreate} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, taskType === 'one_time' && styles.activeTab]}
              onPress={() => setTaskType('one_time')}
            >
              <Text style={[styles.tabText, taskType === 'one_time' && styles.activeTabText]}>
                One-Time Task
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, taskType === 'recurring' && styles.activeTab]}
              onPress={() => setTaskType('recurring')}
            >
              <Text style={[styles.tabText, taskType === 'recurring' && styles.activeTabText]}>
                Recurring Task
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Task Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Q3 Financial Review"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={TEXT_SECONDARY}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add detailed instructions, checklist items, or context for this task..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholderTextColor={TEXT_SECONDARY}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Assigned To</Text>
            <TouchableOpacity
              style={styles.assigneeButton}
              onPress={() => setShowAssigneeModal(true)}
            >
              <Ionicons name="people-outline" size={20} color={PRIMARY_COLOR} />
              <Text style={styles.assigneeButtonText}>
                {selectedAssignees.length > 0
                  ? `${selectedAssignees.length} selected`
                  : 'Select employee or team'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>SCHEDULE</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Start Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => handleDatePress('start')}
            >
              <Text style={styles.dateButtonText}>
                {formatDateTime(startDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Target Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => handleDatePress('target')}
            >
              <Text style={styles.dateButtonText}>
                {formatDateTime(targetDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              <Ionicons name="calendar" size={16} color={PRIMARY_COLOR} /> Due Date
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => handleDatePress('due')}
            >
              <Text style={styles.dateButtonText}>
                {formatDateTime(dueDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>

          {taskType === 'recurring' && (
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Recurrence</Text>
              <View style={styles.recurrenceContainer}>
                {['weekly', 'monthly', 'quarterly', 'yearly'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.recurrenceOption,
                      recurrenceType === type && styles.recurrenceOptionSelected,
                    ]}
                    onPress={() => setRecurrenceType(type)}
                  >
                    <Text
                      style={[
                        styles.recurrenceText,
                        recurrenceType === type && styles.recurrenceTextSelected,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityContainer}>
              {['low', 'medium', 'high'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityOption,
                    priority === p && styles.priorityOptionSelected,
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      priority === p && styles.priorityTextSelected,
                    ]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreate}
            disabled={loading}
          >
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create Task</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Assignee Selection Modal */}
        <Modal
          visible={showAssigneeModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowAssigneeModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Assignees</Text>
              <TouchableOpacity onPress={() => setShowAssigneeModal(false)}>
                <Ionicons name="close" size={24} color={TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={users}
              renderItem={renderAssignee}
              keyExtractor={(item) => item.id}
              style={styles.assigneeList}
            />
          </SafeAreaView>
        </Modal>

        {/* Date Picker Modal */}
        <Modal
          visible={showStartPicker || showTargetPicker || showDuePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={cancelDateSelection}
        >
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={cancelDateSelection}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>
                  {activeDateField === 'start' && 'Start Date'}
                  {activeDateField === 'target' && 'Target Date'}
                  {activeDateField === 'due' && 'Due Date'}
                </Text>
                <TouchableOpacity onPress={confirmDateSelection}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              {renderDatePicker()}
            </View>
          </View>
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
  header: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelText: {
    color: TEXT_SECONDARY,
    fontSize: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  saveText: {
    color: PRIMARY_COLOR,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  activeTab: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  input: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 16,
  },
  assigneeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    gap: 8,
  },
  assigneeButtonText: {
    flex: 1,
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  dateButtonText: {
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  recurrenceContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  recurrenceOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  recurrenceOptionSelected: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  recurrenceText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  recurrenceTextSelected: {
    color: '#FFFFFF',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  priorityOptionSelected: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  priorityTextSelected: {
    color: '#FFFFFF',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  assigneeList: {
    flex: 1,
  },
  assigneeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    gap: 12,
  },
  assigneeItemSelected: {
    backgroundColor: '#F3F4F6',
  },
  assigneeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assigneeAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  assigneeName: {
    flex: 1,
    fontSize: 16,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  datePickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContainer: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  datePickerCancel: {
    fontSize: 16,
    color: TEXT_SECONDARY,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  datePickerDone: {
    fontSize: 16,
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  datePickerContent: {
    paddingVertical: 20,
  },
  datePickerScroll: {
    flexDirection: 'row',
  },
  datePickerColumn: {
    width: 80,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  datePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  datePickerList: {
    maxHeight: 200,
  },
  datePickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
    minWidth: 60,
    alignItems: 'center',
  },
  datePickerItemSelected: {
    backgroundColor: PRIMARY_COLOR,
  },
  datePickerItemText: {
    fontSize: 16,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  datePickerItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default TaskCreateScreen;

