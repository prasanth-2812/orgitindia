import React from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { BottomNav, TaskCard } from '../../components/shared';
import { taskService } from '../../services/taskService';
import { useAuth } from '../../context/AuthContext';
import { AdminLayout } from '../../components/admin/AdminLayout';

export const TaskListManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: tasksData } = useQuery('tasks', () => taskService.getTasks());

  const content = (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">My Tasks</h1>
          <p className="text-slate-600 mt-1">Manage and track your assigned tasks</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => navigate('/admin/tasks/create')}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg shadow-lg shadow-primary/20 transition-all font-semibold"
          >
            <span className="material-symbols-outlined">add</span>
            New Task
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tasksData?.data?.map((task: any) => (
          <TaskCard
            key={task.id}
            {...task}
            onClick={() => navigate(isAdmin ? `/admin/tasks/${task.id}` : `/tasks/${task.id}`)}
          />
        ))}
        {(!tasksData?.data || tasksData.data.length === 0) && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            <span className="material-symbols-outlined text-5xl text-slate-200 mb-4">task</span>
            <p>No tasks found</p>
          </div>
        )}
      </div>
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
