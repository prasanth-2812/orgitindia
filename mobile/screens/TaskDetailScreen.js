import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { getTask, acceptTask, rejectTask, updateTaskStatus } from '../services/taskService';
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

const TaskDetailScreen = ({ route, navigation }) => {
  const { taskId, showAccept, showReject } = route.params || {};
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(showReject || false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      setLoading(true);
      const data = await getTask(taskId);
      setTask(data);
    } catch (error) {
      console.error('Load task error:', error);
      Alert.alert('Error', 'Failed to load task details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      setProcessing(true);
      await acceptTask(taskId);
      Alert.alert('Success', 'Task accepted successfully!', [
        { text: 'OK', onPress: () => {
          loadTask();
          if (task?.conversation_id) {
            navigation.navigate('TaskChat', {
              conversationId: task.conversation_id,
              conversationName: task.title,
              isGroup: true,
            });
          }
        }}
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to accept task');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please enter a reason for rejection');
      return;
    }

    try {
      setProcessing(true);
      await rejectTask(taskId, rejectionReason);
      Alert.alert('Success', 'Task rejected', [
        { text: 'OK', onPress: () => {
          setShowRejectModal(false);
          loadTask();
        }}
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to reject task');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pending Approval';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const isAssigned = task?.assignees?.some(a => a.id === user.id);
  const currentUserStatus = task?.current_user_status;
  const hasAccepted = currentUserStatus?.has_accepted || false;
  const hasRejected = currentUserStatus?.has_rejected || false;
  
  // User can accept if they are assigned, haven't accepted yet, and haven't rejected
  const canAccept = isAssigned && !hasAccepted && !hasRejected;
  // User can reject if they are assigned, haven't rejected yet, and haven't accepted
  const canReject = isAssigned && !hasRejected && !hasAccepted;

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

  if (!task) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Details</Text>
          <TouchableOpacity onPress={() => {/* More options */}}>
            <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Task Info Card */}
          <View style={styles.card}>
            <View style={styles.badgeRow}>
              {task.status === 'pending' && (
                <View style={[styles.badge, { backgroundColor: getStatusColor(task.status) }]}>
                  <Text style={styles.badgeText}>{getStatusLabel(task.status)}</Text>
                </View>
              )}
              {task.priority === 'high' && (
                <View style={[styles.badge, { backgroundColor: getPriorityColor(task.priority) }]}>
                  <Text style={styles.badgeText}>High Priority</Text>
                </View>
              )}
            </View>

            <Text style={styles.taskTitle}>{task.title}</Text>
            
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={TEXT_SECONDARY} />
              <Text style={styles.metaText}>Created: {formatDate(task.created_at)}</Text>
            </View>
            {task.id && (
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>ID: #{task.id.slice(0, 8).toUpperCase()}</Text>
              </View>
            )}
          </View>

          {/* Description Card */}
          {task.description && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>DESCRIPTION</Text>
              <Text style={styles.descriptionText}>{task.description}</Text>
            </View>
          )}

          {/* Date Cards */}
          <View style={styles.dateRow}>
            <View style={[styles.dateCard, task.start_date && styles.dateCardFilled]}>
              <Ionicons name="play-circle-outline" size={20} color={PRIMARY_COLOR} />
              <Text style={styles.dateLabel}>START DATE</Text>
              <Text style={styles.dateValue}>{formatDate(task.start_date)}</Text>
            </View>

            <View style={[styles.dateCard, task.target_date && styles.dateCardFilled]}>
              <Ionicons name="flag-outline" size={20} color={PRIMARY_COLOR} />
              <Text style={styles.dateLabel}>TARGET DATE</Text>
              <Text style={styles.dateValue}>{formatDate(task.target_date)}</Text>
            </View>
          </View>

          <View style={[styles.dateCard, styles.dueDateCard, { backgroundColor: PRIMARY_LIGHT + '20' }]}>
            <Ionicons name="calendar" size={20} color={PRIMARY_COLOR} />
            <Text style={styles.dateLabel}>DUE DATE</Text>
            <Text style={[styles.dateValue, styles.dueDateValue]}>{formatDate(task.due_date)}</Text>
            {new Date(task.due_date) < new Date() && task.status !== 'completed' && (
              <View style={styles.daysLeftBadge}>
                <Text style={styles.daysLeftText}>Overdue</Text>
              </View>
            )}
          </View>

          {/* Assigned To Card */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ASSIGNED TO</Text>
              {task.assignees && task.assignees.length > 3 && (
                <TouchableOpacity>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.assigneesRow}>
              {task.assignees?.slice(0, 3).map((assignee, index) => (
                <View key={assignee.id} style={[styles.avatar, { marginLeft: index > 0 ? -10 : 0 }]}>
                  <Text style={styles.avatarText}>
                    {assignee.name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                  {assignee.has_accepted && (
                    <View style={styles.acceptanceBadge}>
                      <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              ))}
              {task.assignees && task.assignees.length > 3 && (
                <View style={[styles.avatar, styles.moreAvatar, { marginLeft: -10 }]}>
                  <Text style={styles.avatarText}>+{task.assignees.length - 3}</Text>
                </View>
              )}
              <Text style={styles.assigneesText}>
                {task.assignees?.length === 1 ? 'You' : `You and ${(task.assignees?.length || 1) - 1} others`}
              </Text>
            </View>
            {/* Acceptance Status */}
            {task.assignees && task.assignees.length > 1 && (
              <View style={styles.acceptanceStatus}>
                <Text style={styles.acceptanceStatusText}>
                  {task.assignees.filter(a => a.has_accepted).length} of {task.assignees.length} accepted
                </Text>
                {hasAccepted && (
                  <View style={styles.userAcceptedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.userAcceptedText}>You accepted</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Escalation Rules */}
          {task.auto_escalate && (
            <View style={styles.card}>
              <View style={styles.escalationHeader}>
                <Ionicons name="warning-outline" size={20} color="#F59E0B" />
                <Text style={styles.sectionTitle}>Auto Escalation Rules</Text>
              </View>
              {task.escalation_rules && (
                <View style={styles.escalationRules}>
                  <View style={styles.escalationRule}>
                    <View style={[styles.ruleDot, { backgroundColor: TEXT_SECONDARY }]} />
                    <Text style={styles.ruleText}>LEVEL 1: Notify Manager if not accepted within 24h</Text>
                  </View>
                  <View style={styles.escalationRule}>
                    <View style={[styles.ruleDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={styles.ruleText}>LEVEL 2: Escalate to Dept Head if overdue &gt; 2 days</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Activities */}
          {task.activities && task.activities.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>ACTIVITY LOG</Text>
              {task.activities.slice(0, 5).map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <Text style={styles.activityText}>
                    {activity.message || `${activity.activity_type} - ${activity.new_value || ''}`}
                  </Text>
                  <Text style={styles.activityTime}>{formatDate(activity.created_at)}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        {(canAccept || canReject) && (
          <View style={styles.actionBar}>
            {canReject && (
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => setShowRejectModal(true)}
                disabled={processing}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
            )}
            {canAccept && (
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={handleAccept}
                disabled={processing}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.acceptButtonText}>Accept Task</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Reject Modal */}
        <Modal
          visible={showRejectModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowRejectModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Reject Task</Text>
              <Text style={styles.modalSubtitle}>Please provide a reason for rejection</Text>
              
              <TextInput
                style={styles.reasonInput}
                placeholder="Enter reason for rejection (Required if rejecting)..."
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor={TEXT_SECONDARY}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowRejectModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmButton, !rejectionReason.trim() && styles.modalButtonDisabled]}
                  onPress={handleReject}
                  disabled={!rejectionReason.trim() || processing}
                >
                  {processing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Reject</Text>
                  )}
                </TouchableOpacity>
              </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  taskTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    marginBottom: 12,
    letterSpacing: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 15,
    color: TEXT_PRIMARY,
    lineHeight: 22,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dateCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  dateCardFilled: {
    borderColor: PRIMARY_COLOR,
  },
  dueDateCard: {
    width: '100%',
    marginBottom: 12,
    position: 'relative',
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    marginTop: 8,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  dueDateValue: {
    fontSize: 16,
    color: PRIMARY_COLOR,
    fontWeight: '700',
  },
  daysLeftBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  daysLeftText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  assigneesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: CARD_BG,
  },
  moreAvatar: {
    backgroundColor: LIGHT_BG,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  assigneesText: {
    marginLeft: 12,
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  acceptanceBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: CARD_BG,
  },
  acceptanceStatus: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  acceptanceStatusText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  userAcceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userAcceptedText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  escalationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  escalationRules: {
    gap: 12,
  },
  escalationRule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ruleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  activityItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  activityText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: CARD_BG,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginBottom: 16,
  },
  reasonInput: {
    backgroundColor: LIGHT_BG,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: TEXT_PRIMARY,
    minHeight: 120,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: LIGHT_BG,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default TaskDetailScreen;

