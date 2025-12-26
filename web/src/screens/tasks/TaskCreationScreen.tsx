import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// import { taskService } from '../../services/taskService';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High']),
  assignee: z.string().optional(),
  frequency: z.enum(['one-time', 'daily', 'weekly', 'monthly']).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

export const TaskCreationScreen: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showLinkedDoc, setShowLinkedDoc] = useState(true); // For visual demo

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: 'Medium',
      frequency: 'one-time',
    },
  });

  const priority = watch('priority');

  const onSubmit = async (_data: TaskFormData) => {
    setIsLoading(true);
    try {
      // Adapt data to service expected format if needed
      /* const serviceData = {
        ...data,
        taskType: data.frequency === 'one-time' ? 'one_time' : 'recurring',
        assignedUserIds: data.assignee ? [data.assignee] : []
      }; */
      // const response = await taskService.createTask(serviceData); // Keep commented or adapt type
      // For now just navigate back
      navigate('/tasks');
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#170d1b] dark:text-gray-100 flex flex-col min-h-screen overflow-x-hidden selection:bg-primary/30 selection:text-primary">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-surface-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-[#dfcfe7] dark:border-gray-800 px-4 h-14 flex items-center justify-between transition-colors duration-300">
        <button
          onClick={() => navigate(-1)}
          type="button"
          className="text-base font-medium text-gray-500 hover:text-[#170d1b] dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          Cancel
        </button>
        <h2 className="text-lg font-bold text-[#170d1b] dark:text-white tracking-tight">Create Task</h2>
        <button
          onClick={handleSubmit(onSubmit)}
          type="button"
          className="text-base font-bold text-primary hover:text-primary/80 transition-colors"
        >
          Save
        </button>
      </div>

      {/* Main Form Content */}
      <main className="flex-1 w-full max-w-lg mx-auto p-4 pb-32 flex flex-col gap-6">
        {/* Section: Basic Details */}
        <section className="flex flex-col gap-5">
          {/* Task Title */}
          <label className="flex flex-col w-full gap-2">
            <p className="text-[#170d1b] dark:text-gray-200 text-base font-medium leading-normal">Task Title</p>
            <input
              {...register('title')}
              className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#170d1b] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#dfcfe7] dark:border-gray-700 bg-surface-light dark:bg-gray-800 focus:border-primary h-14 placeholder:text-[#804c9a]/60 dark:placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal transition-all shadow-sm"
              placeholder="Enter task name"
            />
            {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}
          </label>
          {/* Description */}
          <label className="flex flex-col w-full gap-2">
            <p className="text-[#170d1b] dark:text-gray-200 text-base font-medium leading-normal">Description</p>
            <textarea
              {...register('description')}
              className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#170d1b] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#dfcfe7] dark:border-gray-700 bg-surface-light dark:bg-gray-800 focus:border-primary min-h-32 placeholder:text-[#804c9a]/60 dark:placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal transition-all shadow-sm"
              placeholder="Add details, instructions, or context..."
            ></textarea>
          </label>
        </section>

        {/* Section: Priority */}
        <section className="flex flex-col gap-2">
          <p className="text-[#170d1b] dark:text-gray-200 text-base font-medium leading-normal">Priority Level</p>
          <div className="flex h-12 w-full items-center justify-center rounded-lg bg-[#efe7f3] dark:bg-gray-800 p-1">
            {['Low', 'Medium', 'High'].map((level) => (
              <label key={level} className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 ${priority === level ? 'bg-white dark:bg-gray-700 shadow-sm text-[#170d1b] dark:text-white' : 'text-[#804c9a] dark:text-gray-400'} text-sm font-medium leading-normal transition-all`}>
                <span className="truncate">{level}</span>
                <input {...register('priority')} className="hidden" type="radio" value={level} />
              </label>
            ))}
          </div>
        </section>

        {/* Section: Logistics */}
        <section className="grid grid-cols-1 gap-5">
          {/* Assigned To */}
          <label className="flex flex-col w-full gap-2 relative group">
            <p className="text-[#170d1b] dark:text-gray-200 text-base font-medium leading-normal">Assigned To</p>
            <div className="relative">
              <select {...register('assignee')} className="w-full rounded-lg border border-[#dfcfe7] dark:border-gray-700 bg-surface-light dark:bg-gray-800 h-14 px-4 pr-10 text-[#170d1b] dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none shadow-sm cursor-pointer outline-none">
                <option value="" className="text-gray-400">Select Employee or Role</option>
                <option value="1">Sarah Jenkins (Compliance)</option>
                <option value="2">Mike Ross (Logistics)</option>
                <option value="3">Operations Team</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-primary">
                <span className="material-symbols-outlined">expand_more</span>
              </div>
            </div>
          </label>
          {/* Frequency */}
          <label className="flex flex-col w-full gap-2 relative">
            <p className="text-[#170d1b] dark:text-gray-200 text-base font-medium leading-normal">Frequency</p>
            <div className="relative">
              <select {...register('frequency')} className="w-full rounded-lg border border-[#dfcfe7] dark:border-gray-700 bg-surface-light dark:bg-gray-800 h-14 px-4 pr-10 text-[#170d1b] dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none shadow-sm cursor-pointer outline-none">
                <option value="one-time">One-time Task</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-primary">
                <span className="material-symbols-outlined">expand_more</span>
              </div>
            </div>
          </label>
        </section>

        {/* Section: Timeline */}
        <section className="flex flex-col gap-2">
          <p className="text-[#170d1b] dark:text-gray-200 text-base font-medium leading-normal">Timeline</p>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-[#804c9a] dark:text-primary/80 uppercase tracking-wide ml-1">Start Date</span>
              <input {...register('startDate')} className="w-full h-12 rounded-lg border border-[#dfcfe7] dark:border-gray-700 bg-surface-light dark:bg-gray-800 text-[#170d1b] dark:text-white px-3 focus:border-primary focus:ring-0 shadow-sm outline-none" type="date" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-[#804c9a] dark:text-primary/80 uppercase tracking-wide ml-1">Due Date</span>
              <input {...register('dueDate')} className="w-full h-12 rounded-lg border border-[#dfcfe7] dark:border-gray-700 bg-surface-light dark:bg-gray-800 text-[#170d1b] dark:text-white px-3 focus:border-primary focus:ring-0 shadow-sm outline-none" type="date" />
            </label>
          </div>
        </section>

        {/* Section: Document Link */}
        <section className="flex flex-col gap-3 mt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[#170d1b] dark:text-gray-100 text-base font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">folder_open</span>
              Linked Documents
            </h3>
          </div>

          <button type="button" className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl border-2 border-dashed border-[#dfcfe7] dark:border-gray-600 bg-surface-light dark:bg-gray-800/50 p-6 transition-all hover:bg-white dark:hover:bg-gray-800 hover:border-primary hover:shadow-md">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#efe7f3] dark:bg-gray-700 text-primary group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl">add_link</span>
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="text-base font-bold text-primary group-hover:underline decoration-2 underline-offset-2">Link from Library</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Attach procedures, policies, or guides</span>
            </div>
          </button>

          {showLinkedDoc && (
            <div className="relative flex items-center gap-4 rounded-xl border border-[#dfcfe7] dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-sm transition-all hover:shadow-md">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-red-50 dark:bg-red-900/20">
                <span className="material-symbols-outlined text-red-500 dark:text-red-400 text-3xl">description</span>
                <div className="absolute top-0 right-0 h-4 w-4 bg-red-100 dark:bg-red-900/40 rounded-bl-lg"></div>
              </div>
              <div className="flex flex-1 flex-col overflow-hidden">
                <p className="truncate text-sm font-bold text-[#170d1b] dark:text-white">Safety_Protocol_v4.pdf</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>PDF</span>
                  <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                  <span>2.4 MB</span>
                  <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                  <span className="text-primary font-medium">Read Only</span>
                </div>
              </div>
              <button type="button" onClick={() => setShowLinkedDoc(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Sticky Bottom Action Button */}
      <div className="fixed bottom-0 left-0 w-full bg-surface-light dark:bg-background-dark border-t border-[#dfcfe7] dark:border-gray-800 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-lg mx-auto">
          <button onClick={handleSubmit(onSubmit)} disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-center text-base font-bold text-white shadow-lg shadow-primary/25 transition-transform active:scale-[0.98] hover:bg-primary/90 disabled:opacity-70">
            <span>{isLoading ? 'Creating...' : 'Create Task'}</span>
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
