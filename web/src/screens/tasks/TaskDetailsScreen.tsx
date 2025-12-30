import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { BottomNav } from '../../components/shared';
import { taskService } from '../../services/taskService';
import { useAuth } from '../../context/AuthContext';

export const TaskDetailsScreen: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showRejectModal, setShowRejectModal] = useState(location.state?.showReject || false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Fetch task
  const { data: taskData, isLoading } = useQuery(
    ['task', taskId],
    () => taskService.getTask(taskId!),
    { enabled: !!taskId }
  );

  const task = taskData || taskData?.data || taskData?.task;

  // Accept task mutation
  const acceptTaskMutation = useMutation(
    () => taskService.acceptTask(taskId!),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['task', taskId]);
        queryClient.invalidateQueries(['tasks']);
        // Navigate to task chat if conversation_id exists
        if (task?.conversation_id) {
          navigate(`/messages/task-group/${task.conversation_id}`);
        } else {
          navigate('/tasks');
        }
      }
    }
  );

  // Reject task mutation
  const rejectTaskMutation = useMutation(
    (reason: string) => taskService.rejectTask(taskId!, reason),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['task', taskId]);
        queryClient.invalidateQueries(['tasks']);
        setShowRejectModal(false);
        setRejectionReason('');
      }
    }
  );

  // Format date helper (matching mobile)
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Not set';
    }
  };

  // Get priority color
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  // Get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'in_progress': return '#7C3AED';
      case 'completed': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  // Get status label
  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'pending': return 'Pending Approval';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'rejected': return 'Rejected';
      default: return status || 'Unknown';
    }
  };

  // Check if user can accept/reject
  const isAssigned = task?.assignees?.some((a: any) => a.id === user?.id);
  const currentUserStatus = task?.current_user_status;
  const hasAccepted = currentUserStatus?.has_accepted || false;
  const hasRejected = currentUserStatus?.has_rejected || false;
  
  const canAccept = isAssigned && !hasAccepted && !hasRejected;
  const canReject = isAssigned && !hasRejected && !hasAccepted;

  // Handle accept
  const handleAccept = async () => {
    try {
      setProcessing(true);
      await acceptTaskMutation.mutateAsync();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to accept task');
    } finally {
      setProcessing(false);
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please enter a reason for rejection');
      return;
    }

    try {
      setProcessing(true);
      await rejectTaskMutation.mutateAsync(rejectionReason.trim());
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to reject task');
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <p className="text-gray-400 text-sm">Loading task details...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <p className="text-red-500">Task not found</p>
      </div>
    );
  }

  const statusColor = getStatusColor(task.status);
  const priorityColor = getPriorityColor(task.priority);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden max-w-md mx-auto bg-background-light dark:bg-background-dark shadow-2xl font-display text-text-main dark:text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-primary dark:bg-primary/90 px-4 py-3 backdrop-blur-md shadow-md">
        <button 
          onClick={() => navigate(-1)} 
          className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight text-white">Task Details</h1>
        <button className="text-white hover:bg-white/20 rounded-full p-1 transition-colors">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto px-5 pt-4 pb-48 scroll-smooth no-scrollbar">
        {/* Task Info Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm mb-5 border border-gray-100 dark:border-gray-800">
          <div className="flex items-start justify-between mb-2">
            <div className="flex gap-2 flex-wrap">
              {task.status === 'pending' && (
                <span 
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: statusColor }}
                >
                  {getStatusLabel(task.status)}
                </span>
              )}
              {task.priority === 'high' && (
                <span 
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: priorityColor }}
                >
                  High Priority
                </span>
              )}
            </div>
          </div>
          <h2 className="text-2xl font-bold leading-tight text-gray-900 dark:text-white mb-2">{task.title}</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="material-symbols-outlined text-base">calendar_today</span>
            <p>Created: {formatDate(task.created_at)}</p>
            {task.id && (
              <>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <p>ID: #{task.id.slice(0, 8).toUpperCase()}</p>
              </>
            )}
          </div>
        </div>

        {/* Description Card */}
        {task.description && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm mb-5 border border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary dark:text-purple-400 mb-3">
              DESCRIPTION
            </h3>
            <p className="text-gray-700 dark:text-gray-200 leading-relaxed text-[15px]">
              {task.description}
            </p>
          </div>
        )}

        {/* Date Cards */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col gap-1">
            <span className="flex items-center gap-1 text-xs font-semibold text-primary dark:text-purple-400 uppercase">
              <span className="material-symbols-outlined text-base">play_circle</span>
              START DATE
            </span>
            <span className="text-base font-semibold text-gray-900 dark:text-white">
              {formatDate(task.start_date)}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col gap-1">
            <span className="flex items-center gap-1 text-xs font-semibold text-primary dark:text-purple-400 uppercase">
              <span className="material-symbols-outlined text-base">flag</span>
              TARGET DATE
            </span>
            <span className="text-base font-semibold text-gray-900 dark:text-white">
              {formatDate(task.target_date)}
            </span>
          </div>
        </div>

        {/* Due Date Card */}
        <div className="bg-primary/10 dark:bg-primary/20 rounded-2xl p-4 mb-5 border border-primary/20 dark:border-primary/30 relative">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs font-bold text-primary dark:text-purple-400 uppercase">
                <span className="material-symbols-outlined text-base">event</span>
                DUE DATE
              </span>
              <span className="text-lg font-bold text-primary dark:text-purple-300">
                {formatDate(task.due_date)}
              </span>
            </div>
            {isOverdue && (
              <div className="bg-red-100 dark:bg-red-900/30 rounded-lg px-3 py-1">
                <span className="text-xs font-bold text-red-600 dark:text-red-400">Overdue</span>
              </div>
            )}
          </div>
        </div>

        {/* Assigned To Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm mb-5 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary dark:text-purple-400">
              ASSIGNED TO
            </h3>
            {task.assignees && task.assignees.length > 3 && (
              <button className="text-primary text-xs font-semibold hover:underline">
                View All
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex -space-x-3">
              {task.assignees?.slice(0, 3).map((assignee: any, index: number) => (
                <div
                  key={assignee.id}
                  className="relative size-10 rounded-full bg-primary flex items-center justify-center border-2 border-white dark:border-slate-800 text-white text-sm font-semibold"
                  style={{ marginLeft: index > 0 ? '-12px' : '0' }}
                >
                  {assignee.profile_photo_url ? (
                    <img
                      src={assignee.profile_photo_url}
                      alt={assignee.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span>{assignee.name?.charAt(0).toUpperCase() || '?'}</span>
                  )}
                  {assignee.has_accepted && (
                    <div className="absolute -bottom-1 -right-1 size-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-xs">check</span>
                    </div>
                  )}
                </div>
              ))}
              {task.assignees && task.assignees.length > 3 && (
                <div
                  className="size-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-white dark:border-slate-800 text-gray-600 dark:text-gray-300 text-xs font-semibold"
                  style={{ marginLeft: '-12px' }}
                >
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {task.assignees?.length === 1 ? 'You' : `You and ${(task.assignees?.length || 1) - 1} others`}
            </span>
          </div>
          
          {/* Acceptance Status */}
          {task.assignees && task.assignees.length > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {task.assignees.filter((a: any) => a.has_accepted).length} of {task.assignees.length} accepted
              </span>
              {hasAccepted && (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span className="text-xs font-medium">You accepted</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Auto Escalation Rules */}
        {task.auto_escalate && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm mb-5 border border-gray-100 dark:border-gray-800">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-500">warning</span>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Auto Escalation Rules</h3>
            </div>
            <div className="p-4">
              <ul className="space-y-4 relative pl-2">
                <div className="absolute left-[15px] top-2 bottom-6 w-0.5 bg-gray-100 dark:bg-gray-700"></div>
                <li className="relative flex gap-4 items-start">
                  <div className="relative z-10 mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600 ring-4 ring-white dark:ring-slate-800"></div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">LEVEL 1</span>
                    <span className="text-sm text-gray-700 dark:text-gray-200">Notify Manager if not accepted within 24h</span>
                  </div>
                </li>
                <li className="relative flex gap-4 items-start">
                  <div className="relative z-10 mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-orange-300 dark:bg-orange-500 ring-4 ring-white dark:ring-slate-800"></div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">LEVEL 2</span>
                    <span className="text-sm text-gray-700 dark:text-gray-200">Escalate to Dept Head if overdue &gt; 2 days</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Activity Log */}
        {task.activities && task.activities.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm mb-5 border border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary dark:text-purple-400 mb-3">
              ACTIVITY LOG
            </h3>
            {task.activities.slice(0, 5).map((activity: any) => (
              <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  {activity.message || `${activity.activity_type} - ${activity.new_value || ''}`}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(activity.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Action Bar */}
      {(canAccept || canReject) && (
        <div className="fixed bottom-[72px] left-0 right-0 z-20 max-w-md mx-auto">
          <div className="h-8 bg-gradient-to-t from-background-light dark:from-background-dark to-transparent w-full pointer-events-none"></div>
          <div className="bg-background-light dark:bg-background-dark px-5 pb-4 pt-2">
            <div className="flex gap-3">
              {canReject && (
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={processing}
                  className="flex-1 rounded-xl border border-red-500/30 bg-white dark:bg-slate-800 px-4 py-3.5 text-sm font-bold text-red-500 hover:bg-red-500/5 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                  Reject
                </button>
              )}
              {canAccept && (
                <button
                  onClick={handleAccept}
                  disabled={processing}
                  className="flex-[2] rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-white hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">check</span>
                      <span>Accept Task</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowRejectModal(false)}>
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Reject Task</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please provide a reason for rejection
            </p>
            
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection (Required if rejecting)..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="flex-1 py-3 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processing}
                className="flex-1 py-3 px-4 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};
