import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TopAppBar, Button } from '../../components/shared';
import { taskService } from '../../services/taskService';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  taskType: z.enum(['one_time', 'recurring']),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  dueDate: z.string().optional(),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'yearly', 'specific_weekday']).optional(),
  category: z.enum(['general', 'document_management', 'compliance_management']).optional(),
  assignedUserIds: z.array(z.string()).min(1, 'At least one assignee is required'),
});

type TaskFormData = z.infer<typeof taskSchema>;

export const TaskCreationScreen: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      taskType: 'one_time',
      category: 'general',
      assignedUserIds: [],
    },
  });

  const taskType = watch('taskType');

  const onSubmit = async (data: TaskFormData) => {
    setIsLoading(true);
    try {
      const response = await taskService.createTask(data);
      if (response.success) {
        navigate('/tasks');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full flex-col bg-background-light dark:bg-background-dark max-w-md mx-auto shadow-2xl overflow-hidden">
      <TopAppBar
        title="Create Task"
        onBack={() => navigate(-1)}
        rightAction={
          <button
            onClick={handleSubmit(onSubmit)}
            className="text-primary text-base font-bold hover:opacity-80"
          >
            Save
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {/* Task Type Toggle */}
        <div className="px-4 py-4 sticky top-0 bg-background-light dark:bg-background-dark z-10 backdrop-blur-sm bg-opacity-90">
          <div className="flex h-10 w-full items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-800 p-1">
            <label className="flex cursor-pointer h-full flex-1 items-center justify-center rounded-md px-2 transition-all">
              <input
                {...register('taskType')}
                type="radio"
                value="one_time"
                className="hidden"
              />
              <span
                className={`text-sm font-semibold ${
                  taskType === 'one_time'
                    ? 'bg-white dark:bg-[#3e2c4a] shadow-sm text-primary'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                One-Time Task
              </span>
            </label>
            <label className="flex cursor-pointer h-full flex-1 items-center justify-center rounded-md px-2 transition-all">
              <input
                {...register('taskType')}
                type="radio"
                value="recurring"
                className="hidden"
              />
              <span
                className={`text-sm font-semibold ${
                  taskType === 'recurring'
                    ? 'bg-white dark:bg-[#3e2c4a] shadow-sm text-primary'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Recurring Task
              </span>
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-4 space-y-6">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-900 dark:text-gray-100 text-sm font-semibold">
              Task Title
            </label>
            <input
              {...register('title')}
              className="w-full rounded-xl border-none bg-white dark:bg-[#2d1b36] py-3.5 px-4 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary shadow-sm"
              placeholder="e.g., Q3 Financial Review"
              type="text"
            />
            {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-900 dark:text-gray-100 text-sm font-semibold">
              Description
            </label>
            <textarea
              {...register('description')}
              className="w-full rounded-xl border-none bg-white dark:bg-[#2d1b36] py-3 px-4 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary shadow-sm min-h-[120px] resize-none"
              placeholder="Add detailed instructions..."
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-gray-900 dark:text-gray-100 text-sm font-semibold">
                Start Date
              </label>
              <input
                {...register('startDate')}
                type="date"
                className="w-full rounded-xl border-none bg-white dark:bg-[#2d1b36] py-3.5 px-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary shadow-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-gray-900 dark:text-gray-100 text-sm font-semibold">
                Due Date
              </label>
              <input
                {...register('dueDate')}
                type="date"
                className="w-full rounded-xl border-none bg-white dark:bg-[#2d1b36] py-3.5 px-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary shadow-sm"
              />
            </div>
          </div>

          {/* Recurring Options */}
          {taskType === 'recurring' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-gray-900 dark:text-gray-100 text-sm font-semibold">
                Frequency
              </label>
              <select
                {...register('frequency')}
                className="w-full rounded-xl border-none bg-white dark:bg-[#2d1b36] py-3.5 px-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary shadow-sm"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-900 dark:text-gray-100 text-sm font-semibold">
              Category
            </label>
            <select
              {...register('category')}
              className="w-full rounded-xl border-none bg-white dark:bg-[#2d1b36] py-3.5 px-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary shadow-sm"
            >
              <option value="general">General</option>
              <option value="document_management">Document Management</option>
              <option value="compliance_management">Compliance Management</option>
            </select>
          </div>

          {/* Assignees */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-900 dark:text-gray-100 text-sm font-semibold">
              Assigned To
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary">
                <span className="material-symbols-outlined text-[20px]">person_add</span>
              </span>
              <input
                type="text"
                placeholder="Select team members..."
                className="w-full rounded-xl border-none bg-white dark:bg-[#2d1b36] py-3.5 px-4 pl-12 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary shadow-sm"
                readOnly
                onClick={() => navigate('/tasks/create/assignees')}
              />
            </div>
            {errors.assignedUserIds && (
              <p className="text-red-500 text-xs">{errors.assignedUserIds.message}</p>
            )}
          </div>
        </form>
      </main>
    </div>
  );
};

