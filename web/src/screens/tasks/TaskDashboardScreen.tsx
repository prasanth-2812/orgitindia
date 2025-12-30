import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../../components/shared';
import { taskService } from '../../services/taskService';
import { conversationService } from '../../services/conversationService';
import { useAuth } from '../../context/AuthContext';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { TaskCreateModal } from '../../components/tasks/TaskCreateModal';

export const TaskDashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'one_time' | 'recurring'>('one_time');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTaskCreateModal, setShowTaskCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch tasks
  const { data: tasksData, isLoading, refetch } = useQuery(
    ['tasks', activeTab],
    () => taskService.getTasks({ type: activeTab }),
    {
      onSuccess: () => {
        setRefreshing(false);
      }
    }
  );

  const tasks = tasksData || [];

  // Filter tasks by search query
  const filteredTasks = React.useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const lower = searchQuery.toLowerCase();
    return tasks.filter((task: any) =>
      task.title?.toLowerCase().includes(lower) ||
      task.description?.toLowerCase().includes(lower)
    );
  }, [tasks, searchQuery]);

  // Separate pending and all tasks
  const pendingTasks = filteredTasks.filter((task: any) => task.status === 'pending');
  const allTasks = filteredTasks.filter((task: any) => task.status !== 'pending');

  // Format date helper (matching mobile)
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
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
    } catch {
      return '';
    }
  };

  // Check if task is overdue
  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
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

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    refetch();
  };

  // Handle accept task
  const acceptTaskMutation = useMutation(
    (taskId: string) => taskService.acceptTask(taskId),
    {
      onSuccess: () => {
        refetch();
        queryClient.invalidateQueries(['tasks']);
      }
    }
  );

  // Handle reject task
  const rejectTaskMutation = useMutation(
    ({ taskId, reason }: { taskId: string; reason: string }) => taskService.rejectTask(taskId, reason),
    {
      onSuccess: () => {
        refetch();
        queryClient.invalidateQueries(['tasks']);
      }
    }
  );

  const handleAccept = (taskId: string) => {
    acceptTaskMutation.mutate(taskId);
  };

  const handleReject = (taskId: string) => {
    navigate(`/tasks/${taskId}`, { state: { showReject: true } });
  };

  // Render task card
  const renderTask = (task: any) => {
    const isPending = task.status === 'pending';
    const overdue = isOverdue(task.due_date);
    const priorityColor = getPriorityColor(task.priority);
    const statusColor = getStatusColor(task.status);
    
    // Check current user's acceptance status
    const currentUserStatus = task.current_user_status;
    const hasAccepted = currentUserStatus?.has_accepted || false;
    const hasRejected = currentUserStatus?.has_rejected || false;
    const isAssigned = task.assignees?.some((a: any) => a.id === user?.id);
    
    // User can accept/reject if assigned, task is pending, and they haven't accepted/rejected
    const canAccept = isPending && isAssigned && !hasAccepted && !hasRejected;
    const canReject = isPending && isAssigned && !hasRejected && !hasAccepted;
    
    // Calculate acceptance count
    const acceptedCount = task.accepted_count || 0;
    const totalAssignees = task.total_assignees || 0;

    return (
      <div
        key={task.id}
        className="flex flex-col gap-4 rounded-xl bg-white dark:bg-slate-800 p-4 shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigate(`/tasks/${task.id}`)}
      >
        {isPending && (
          <div className="flex items-center gap-2">
            <span 
              className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: statusColor }}
            >
              Pending
            </span>
            {task.priority === 'high' && (
              <div className="flex items-center gap-1" style={{ color: priorityColor }}>
                <span className="material-symbols-outlined text-base">priority_high</span>
                <span className="text-xs font-medium">High Priority</span>
              </div>
            )}
            {task.priority === 'medium' && (
              <div className="flex items-center gap-1" style={{ color: priorityColor }}>
                <span className="material-symbols-outlined text-base">equalizer</span>
                <span className="text-xs font-medium">Medium Priority</span>
              </div>
            )}
          </div>
        )}

        <p className="text-gray-900 dark:text-white text-base font-bold leading-tight">{task.title}</p>
        
        <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
          <span className="material-symbols-outlined text-base mr-1.5">event</span>
          Due {formatDate(task.due_date)}
        </div>

        {task.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Acceptance Status */}
        {isPending && totalAssignees > 1 && (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
            <span className="material-symbols-outlined text-base">people</span>
            <span>{acceptedCount} of {totalAssignees} accepted</span>
            {hasAccepted && (
              <div className="flex items-center gap-1 ml-auto text-green-600 dark:text-green-400">
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span className="text-xs font-medium">You accepted</span>
              </div>
            )}
          </div>
        )}

        {/* Accept/Reject Buttons */}
        {(canAccept || canReject) && (
          <div className="flex gap-3 mt-1">
            {canReject && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReject(task.id);
                }}
                className="flex-1 flex items-center justify-center h-10 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="material-symbols-outlined text-lg mr-2">close</span>
                Reject
              </button>
            )}
            {canAccept && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAccept(task.id);
                }}
                className="flex-1 flex items-center justify-center h-10 rounded-lg bg-primary text-white font-bold text-sm shadow-md hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined text-lg mr-2">check</span>
                Accept
              </button>
            )}
          </div>
        )}

        {overdue && task.status !== 'completed' && (
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-medium">
            <span className="material-symbols-outlined text-sm">warning</span>
            Overdue
          </div>
        )}
      </div>
    );
  };

  const content = (
    <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark shadow-2xl overflow-hidden pb-24 font-display">
      {/* Header */}
      <header className="flex items-center px-4 py-3 justify-between bg-primary dark:bg-primary/90 sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="flex size-10 shrink-0 items-center justify-center rounded-full active:bg-white/20 text-white"
          >
            <span className="material-symbols-outlined text-2xl">person</span>
          </button>
          <h2 className="text-white text-lg font-bold leading-tight tracking-tight">My Tasks</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex size-10 items-center justify-center rounded-full active:bg-white/20 text-white">
            <span className="material-symbols-outlined text-xl">filter_list</span>
          </button>
          <button
            onClick={() => setShowTaskCreateModal(true)}
            className="flex size-10 items-center justify-center rounded-full active:bg-white/20 text-white"
          >
            <span className="material-symbols-outlined text-2xl">add_circle</span>
          </button>
        </div>
      </header>

      {/* Tab Container */}
      <div className="px-4 py-4 bg-background-light dark:bg-background-dark z-10">
        <div className="flex h-12 w-full items-center justify-center rounded-xl bg-gray-200 dark:bg-[#362b3e] p-1">
          <label className={`flex cursor-pointer h-full flex-1 items-center justify-center overflow-hidden rounded-lg ${activeTab === 'one_time' ? 'bg-primary text-white shadow-md' : 'text-gray-600 dark:text-gray-400'} text-sm font-bold transition-all duration-200`}>
            <span className="truncate">One-Time</span>
            <input 
              checked={activeTab === 'one_time'} 
              onChange={() => setActiveTab('one_time')} 
              className="hidden" 
              name="task-type" 
              type="radio" 
              value="one_time" 
            />
          </label>
          <label className={`flex cursor-pointer h-full flex-1 items-center justify-center overflow-hidden rounded-lg ${activeTab === 'recurring' ? 'bg-primary text-white shadow-md' : 'text-gray-600 dark:text-gray-400'} text-sm font-bold transition-all duration-200`}>
            <span className="truncate">Recurring</span>
            <input 
              checked={activeTab === 'recurring'} 
              onChange={() => setActiveTab('recurring')} 
              className="hidden" 
              name="task-type" 
              type="radio" 
              value="recurring" 
            />
          </label>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-2">
        <div className="flex w-full items-stretch rounded-xl h-12 shadow-sm bg-surface-light dark:bg-surface-dark">
          <div className="flex items-center justify-center pl-4 text-text-sub-light dark:text-text-sub-dark">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              search
            </span>
          </div>
          <input
            className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl bg-transparent text-text-main-light dark:text-text-main-dark focus:outline-0 focus:ring-2 focus:ring-primary/50 border-none h-full placeholder:text-text-sub-light/70 dark:placeholder:text-text-sub-dark/70 px-3 text-base font-normal leading-normal"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 space-y-4 no-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-400 text-sm">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-400 text-sm mb-4">No tasks found</p>
            <button
              onClick={() => setShowTaskCreateModal(true)}
              className="bg-primary text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              Create Task
            </button>
          </div>
        ) : (
          <>
            {/* Pending Review Section */}
            {pendingTasks.length > 0 && (
              <div className="space-y-2">
                <div className="pt-2 pb-1">
                  <h4 className="text-primary dark:text-purple-400 text-sm font-bold uppercase tracking-wider px-1">
                    PENDING REVIEW
                  </h4>
                </div>
                {pendingTasks.map((task: any) => renderTask(task))}
              </div>
            )}

            {/* All Tasks Section */}
            {allTasks.length > 0 && (
              <div className="space-y-4">
                <div className="pt-4 pb-1">
                  <h4 className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider px-1">
                    ALL TASKS
                  </h4>
                </div>
                {allTasks.map((task: any) => renderTask(task))}
              </div>
            )}
          </>
        )}
        <div className="h-20"></div>
      </main>

      {/* Task Create Modal */}
      <TaskCreateModal
        visible={showTaskCreateModal}
        onClose={() => setShowTaskCreateModal(false)}
        onSuccess={() => {
          setShowTaskCreateModal(false);
          refetch();
        }}
      />
    </div>
  );

  if (isAdmin) {
    return (
      <AdminLayout>
        {content}
      </AdminLayout>
    );
  }

  return (
    <div className="pb-24 min-h-screen bg-background-light dark:bg-background-dark">
      {content}
      <BottomNav />
    </div>
  );
};

