import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { BottomNav, TaskCard, Avatar } from '../../components/shared';
import { dashboardService } from '../../services/dashboardService';
import { useAuth } from '../../context/AuthContext';

type TaskView = 'self' | 'assigned';

export const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [taskView, setTaskView] = useState<TaskView>('self');
  const [expandedDM, setExpandedDM] = useState(false);
  const [expandedCM, setExpandedCM] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    // Clear tokens and state
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    // Force hard reload to clear any in-memory state and reset auth context
    window.location.href = '/login';
  };

  const { data: dashboardData, isLoading } = useQuery(
    ['dashboard', taskView],
    () => dashboardService.getDashboard(3),
    { refetchInterval: 30000 } // Refetch every 30 seconds
  );

  const { data: statistics } = useQuery('dashboard-statistics', () =>
    dashboardService.getStatistics()
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getStatusCount = (status: 'overdue' | 'duesoon' | 'inprogress' | 'completed') => {
    if (!statistics?.data) return 0;
    const prefix = taskView === 'self' ? 'selfTasks' : 'assignedTasks';
    return statistics.data[`${prefix}${status.charAt(0).toUpperCase() + status.slice(1)}`] || 0;
  };

  const renderTaskSection = (
    tasks: any[]
  ) => {
    if (tasks.length === 0) return null;

    return (
      <div className="space-y-3">
        {tasks.map((task) => {
          const status = task.status === 'overdue' ? 'overdue' :
            task.status === 'completed' ? 'completed' :
              task.daysUntilDue !== null && task.daysUntilDue <= 3 ? 'duesoon' : 'inprogress';

          return (
            <TaskCard
              key={task.id}
              id={task.id}
              title={task.title}
              description={task.description}
              status={status}
              dueDate={task.dueDate}
              category={task.category}
              onClick={() => navigate(`/tasks/${task.id}`)}
            />
          );
        })}
      </div>
    );
  };

  const currentTasks = taskView === 'self'
    ? dashboardData?.data?.selfTasks
    : dashboardData?.data?.assignedTasks;

  return (
    <div className="bg-background-subtle dark:bg-background-dark text-text-main dark:text-white antialiased min-h-screen flex flex-col font-display pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark-subtle/95 backdrop-blur-sm border-b border-gray-100 dark:border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="relative">
          <button
            className="flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-lg transition-colors text-left"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="relative">
              <Avatar src={user?.profilePhotoUrl} alt={user?.name || 'User'} size="md" online />
            </div>
            <div>
              <p className="text-xs text-text-muted dark:text-purple-300 font-medium">
                {getGreeting()},
              </p>
              <h2 className="text-text-main dark:text-white text-lg font-bold leading-tight">
                {user?.name || 'User'}
              </h2>
            </div>
            <span className="material-symbols-outlined text-text-muted dark:text-gray-400">
              {showProfileMenu ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {/* Profile Menu Popover */}
          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-background-dark-subtle rounded-xl shadow-xl border border-gray-100 dark:border-white/10 z-50 overflow-hidden animation-fade-in origin-top-left">
                <div className="p-4 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                  <p className="text-xs font-semibold text-text-muted dark:text-gray-400 uppercase tracking-wider mb-1">
                    Signed in as
                  </p>
                  <p className="text-sm font-bold text-text-main dark:text-white truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-text-muted dark:text-gray-400 mt-0.5">
                    {user?.mobile}
                  </p>
                  <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary capitalize">
                    {user?.role?.replace('_', ' ')}
                  </div>
                </div>

                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/profile-setup');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-text-main dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-gray-400">person</span>
                    Profile Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mt-1"
                  >
                    <span className="material-symbols-outlined">logout</span>
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <button
          className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          onClick={() => navigate('/notifications')}
        >
          <span className="material-symbols-outlined text-text-main dark:text-white" style={{ fontSize: '28px' }}>
            notifications
          </span>
          <span className="absolute top-2 right-2 size-2.5 bg-status-overdue rounded-full border border-white dark:border-background-dark" />
        </button>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-6 space-y-6">
        {/* Task View Toggle */}
        <div className="bg-background-light dark:bg-background-dark-subtle p-1 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 flex relative">
          <label className="flex-1 relative cursor-pointer group">
            <input
              checked={taskView === 'self'}
              onChange={() => setTaskView('self')}
              className="peer sr-only"
              name="task_view"
              type="radio"
              value="self"
            />
            <div className="h-9 w-full rounded-lg flex items-center justify-center text-sm font-medium transition-all duration-200 text-text-muted dark:text-white/60 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-md">
              Self Tasks
            </div>
          </label>
          <label className="flex-1 relative cursor-pointer group">
            <input
              checked={taskView === 'assigned'}
              onChange={() => setTaskView('assigned')}
              className="peer sr-only"
              name="task_view"
              type="radio"
              value="assigned"
            />
            <div className="h-9 w-full rounded-lg flex items-center justify-center text-sm font-medium transition-all duration-200 text-text-muted dark:text-white/60 peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-md">
              Assigned Tasks
            </div>
          </label>
        </div>

        {/* Overview Statistics */}
        <div>
          <h3 className="text-text-main dark:text-white text-lg font-bold mb-3 px-1">Overview</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-background-dark-subtle p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-white/5 flex flex-col items-center text-center group hover:border-status-overdue/30 transition-colors">
              <div className="mb-2 p-2 rounded-full bg-status-overdue/10 text-status-overdue">
                <span className="material-symbols-outlined text-[20px]">priority_high</span>
              </div>
              <span className="text-3xl font-bold text-status-overdue mb-1">
                {getStatusCount('overdue')}
              </span>
              <span className="text-xs font-semibold text-text-muted dark:text-white/60 uppercase tracking-wide">
                Overdue
              </span>
            </div>
            <div className="bg-white dark:bg-background-dark-subtle p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-white/5 flex flex-col items-center text-center group hover:border-status-duesoon/30 transition-colors">
              <div className="mb-2 p-2 rounded-full bg-status-duesoon/10 text-status-duesoon">
                <span className="material-symbols-outlined text-[20px]">hourglass_top</span>
              </div>
              <span className="text-3xl font-bold text-text-main dark:text-white mb-1">
                {getStatusCount('duesoon')}
              </span>
              <span className="text-xs font-semibold text-text-muted dark:text-white/60 uppercase tracking-wide">
                Due Soon
              </span>
            </div>
            <div className="bg-white dark:bg-background-dark-subtle p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-white/5 flex flex-col items-center text-center group hover:border-status-inprogress/30 transition-colors">
              <div className="mb-2 p-2 rounded-full bg-status-inprogress/10 text-status-inprogress">
                <span className="material-symbols-outlined text-[20px]">pending_actions</span>
              </div>
              <span className="text-3xl font-bold text-text-main dark:text-white mb-1">
                {getStatusCount('inprogress')}
              </span>
              <span className="text-xs font-semibold text-text-muted dark:text-white/60 uppercase tracking-wide">
                In Progress
              </span>
            </div>
            <div className="bg-white dark:bg-background-dark-subtle p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-white/5 flex flex-col items-center text-center group hover:border-status-completed/30 transition-colors">
              <div className="mb-2 p-2 rounded-full bg-status-completed/10 text-status-completed">
                <span className="material-symbols-outlined text-[20px]">task_alt</span>
              </div>
              <span className="text-3xl font-bold text-text-main dark:text-white mb-1">
                {getStatusCount('completed')}
              </span>
              <span className="text-xs font-semibold text-text-muted dark:text-white/60 uppercase tracking-wide">
                Completed
              </span>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-text-muted">Loading tasks...</div>
          ) : (
            <>
              {/* General Tasks */}
              {currentTasks?.general && (
                <div className="space-y-4">
                  {renderTaskSection([
                    ...(currentTasks.general.overdue || []),
                    ...(currentTasks.general.dueSoon || []),
                    ...(currentTasks.general.inProgress || []),
                    ...(currentTasks.general.completed || []),
                  ])}
                </div>
              )}

              {/* Document Management Section */}
              <div className="pt-2">
                <button
                  onClick={() => setExpandedDM(!expandedDM)}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-background-dark-subtle rounded-xl shadow-sm border border-gray-100 dark:border-white/5 group active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <span className="material-symbols-outlined">folder_shared</span>
                    </div>
                    <span className="font-bold text-text-main dark:text-white">Document Management</span>
                  </div>
                  <span
                    className={`material-symbols-outlined text-gray-400 group-hover:text-primary transition-all ${expandedDM ? 'rotate-180' : ''
                      }`}
                  >
                    expand_more
                  </span>
                </button>
                {expandedDM && currentTasks?.documentManagement && (
                  <div className="mt-3 space-y-3">
                    {renderTaskSection([
                      ...(currentTasks.documentManagement.overdue || []),
                      ...(currentTasks.documentManagement.dueSoon || []),
                      ...(currentTasks.documentManagement.inProgress || []),
                      ...(currentTasks.documentManagement.completed || []),
                    ])}
                  </div>
                )}
              </div>

              {/* Compliance Management Section */}
              <div className="pt-2">
                <button
                  onClick={() => setExpandedCM(!expandedCM)}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-background-dark-subtle rounded-xl shadow-sm border border-gray-100 dark:border-white/5 group active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <span className="material-symbols-outlined">policy</span>
                    </div>
                    <span className="font-bold text-text-main dark:text-white">Compliance Management</span>
                  </div>
                  <span
                    className={`material-symbols-outlined text-gray-400 group-hover:text-primary transition-all ${expandedCM ? 'rotate-180' : ''
                      }`}
                  >
                    expand_more
                  </span>
                </button>
                {expandedCM && currentTasks?.complianceManagement && (
                  <div className="mt-3 space-y-3">
                    {renderTaskSection([
                      ...(currentTasks.complianceManagement.overdue || []),
                      ...(currentTasks.complianceManagement.dueSoon || []),
                      ...(currentTasks.complianceManagement.inProgress || []),
                      ...(currentTasks.complianceManagement.completed || []),
                    ])}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-4 z-40">
        <button
          onClick={() => navigate('/tasks/create')}
          className="flex items-center justify-center size-14 rounded-full bg-primary text-white shadow-lg shadow-primary/40 hover:bg-primary/90 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

