import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { BottomNav } from '../../components/shared';
import { taskService } from '../../services/taskService';

export const TaskDetailsScreen: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const { data: taskData } = useQuery(
    ['task', taskId],
    () => taskService.getTask(taskId!),
    { enabled: !!taskId }
  );

  const task = taskData?.data || {
    // Mock data if real data is missing/loading (or to match design fidelity)
    id: '#TK-8829',
    title: 'Quarterly Compliance Audit & Review',
    description: 'Review the updated safety protocols and sign off on the new document repository standards. Ensure all team members have completed the mandatory training module before final submission.',
    status: 'pending_approval',
    priority: 'high',
    startDate: 'Oct 14, 2023',
    targetDate: 'Oct 20, 2023',
    dueDate: 'Oct 22, 2023',
    daysLeft: 5,
    createdAt: 'Oct 12, 2023',
    assignees: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAqk8oS_Zirq220ffKc_GNSpG7qNQxtdphjEtfSo68POzuunTBgsEO_BWM0KbDRKZRip_e5TVr8ulKh0uVI8avxVP_gD2W77_FkAl3KtA9fLakxap7f-LrIK7-ZUJIvVP_popYSkow0kRX9GFzNr3OcYyEWlOrVh62rp06rx87HUIMhyZzM3GtD2x1VBjg8uicnqHrsSMIkUqgg3-JErLri-EGtz38lQIYICC7M6HiLusjfEkCPdBpW5wkgmkHqPeHWcZ_gKMEdhzIH',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAKt39loHeA8V1tljUbEDHC_LxcLlrxYC7pR2FXj11GZ1ktwuI6baQKXYTSLBMvKG64z6x09qHmdQu2FhgBL33I06U2nA4_lREHOnvP7MbpLqS7r88uh_NymxGkDXduTKCKMVwiEGnEHAE8zCSBnuXHz1LZeuHeEk2UpQS-wt9Pqmapn1X-YceN9VesNlPnJHhMisOVuIerJZPj_pOKJFOmNhGWupDt1huOtwnUr4S2l6Q_-OtsffZFa86BpK0UPkt3YETGCT0_BY_J',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC-Ew0ogWTuFooUlfBpFbSFbcYHMGeMK0-tXMlhfyXb56EoAQO4NHA6yxHZowi-I2oFZF56w5XsI9T2Njf0gfNfh4xAzswSiCbzojCufCEcJ9txE2jCsHqsClYQE-ln59JgLSfwhFtsIKQcjJIURuRE8ay7eAXknntv9L9EgU-p6jLxozr5MFGQsPZdDRE96_Dze_RBltG7Rf_2zpyrJ6RqpS9CfJWsQxDoTpL8txLjAv5Ao6UGSsI5b1WOKVHcOcy1bJXlM-Z1oJMc'
    ]
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden max-w-md mx-auto bg-background-light dark:bg-background-dark shadow-2xl font-display text-text-main dark:text-gray-100">

      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-background-light/90 dark:bg-background-dark/90 px-4 py-3 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800">
        <button onClick={() => navigate(-1)} className="group flex size-10 items-center justify-center rounded-full active:bg-gray-200 dark:active:bg-gray-700 transition-colors">
          <span className="material-symbols-outlined text-text-main dark:text-white transition-transform group-active:-translate-x-0.5">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight text-text-main dark:text-white">Task Details</h1>
        <button className="group flex size-10 items-center justify-center rounded-full active:bg-gray-200 dark:active:bg-gray-700 transition-colors">
          <span className="material-symbols-outlined text-text-main dark:text-white">more_vert</span>
        </button>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto px-5 pt-4 pb-48 scroll-smooth no-scrollbar">
        {/* Meta Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-2">
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-900/40 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:text-orange-300">
                <span className="material-symbols-outlined text-[14px]">pending</span>
                Pending Approval
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 dark:bg-primary/20 px-2.5 py-1 text-xs font-semibold text-primary dark:text-primary-light">
                High Priority
              </span>
            </div>
          </div>
          <h2 className="text-2xl font-bold leading-tight text-text-main dark:text-white mb-2">{task.title}</h2>
          <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-gray-400">
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            <p>Created: {task.createdAt}</p>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <p>ID: {task.id}</p>
          </div>
        </div>

        {/* Description Card */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 shadow-soft mb-5 border border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary dark:text-gray-400 mb-3">Description</h3>
          <p className="text-text-main dark:text-gray-200 leading-relaxed text-[15px]">
            {task.description}
          </p>
        </div>

        {/* Task Dates */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-gray-800 flex flex-col gap-1">
            <span className="flex items-center gap-1 text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase">
              <span className="material-symbols-outlined text-[16px]">play_circle</span> Start Date
            </span>
            <span className="text-base font-semibold text-text-main dark:text-white">{task.startDate}</span>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-gray-800 flex flex-col gap-1">
            <span className="flex items-center gap-1 text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase">
              <span className="material-symbols-outlined text-[16px]">flag</span> Target Date
            </span>
            <span className="text-base font-semibold text-text-main dark:text-white">{task.targetDate}</span>
          </div>
          <div className="col-span-2 bg-primary/5 dark:bg-primary/10 rounded-2xl p-4 border border-primary/10 dark:border-primary/20 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs font-bold text-primary dark:text-primary-light uppercase">
                <span className="material-symbols-outlined text-[16px]">event_busy</span> Due Date
              </span>
              <span className="text-lg font-bold text-primary dark:text-primary-light">{task.dueDate}</span>
            </div>
            <div className="bg-surface-light dark:bg-surface-dark rounded-lg px-3 py-1 text-xs font-medium text-primary dark:text-primary-light shadow-sm">
              {task.daysLeft} Days Left
            </div>
          </div>
        </div>

        {/* Assignees */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 shadow-soft mb-5 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary dark:text-gray-400">Assigned To</h3>
            <button className="text-primary text-xs font-semibold hover:underline">View All</button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3 rtl:space-x-reverse">
              {task.assignees?.map((src: string, i: number) => (
                <img key={i} alt={`Assignee ${i}`} className="h-10 w-10 rounded-full border-2 border-white dark:border-surface-dark object-cover" src={src} />
              ))}
              <a className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white dark:border-surface-dark bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600" href="#">+2</a>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium ml-2">You and 4 others</span>
          </div>
        </div>

        {/* Auto Escalation Rules */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden shadow-soft mb-5 border border-gray-100 dark:border-gray-800">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-500">warning</span>
            <h3 className="text-sm font-bold text-text-main dark:text-white">Auto Escalation Rules</h3>
          </div>
          <div className="p-4">
            <ul className="space-y-4 relative pl-2">
              {/* Connecting Line */}
              <div className="absolute left-[15px] top-2 bottom-6 w-0.5 bg-gray-100 dark:bg-gray-700"></div>
              <li className="relative flex gap-4 items-start">
                <div className="relative z-10 mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600 ring-4 ring-white dark:ring-surface-dark"></div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase">Level 1</span>
                  <span className="text-sm text-text-main dark:text-gray-200">Notify Manager if not accepted within 24h</span>
                </div>
              </li>
              <li className="relative flex gap-4 items-start">
                <div className="relative z-10 mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-orange-300 dark:bg-orange-500 ring-4 ring-white dark:ring-surface-dark"></div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase">Level 2</span>
                  <span className="text-sm text-text-main dark:text-gray-200">Escalate to Dept Head if overdue &gt; 2 days</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Recurrence Info (Subtle) */}
        <div className="flex items-center gap-3 px-2 mb-2 opacity-60">
          <span className="material-symbols-outlined text-text-secondary dark:text-gray-400">repeat</span>
          <p className="text-xs font-medium text-text-secondary dark:text-gray-400">This is a one-time task.</p>
        </div>
      </main>

      {/* Sticky Action Footer */}
      <div className="fixed bottom-[72px] left-0 right-0 z-20 max-w-md mx-auto">
        <div className="h-8 bg-gradient-to-t from-background-light dark:from-background-dark to-transparent w-full pointer-events-none"></div>
        <div className="bg-background-light dark:bg-background-dark px-5 pb-4 pt-2">
          <div className="mb-3">
            <label className="sr-only" htmlFor="rejectReason">Reason for Rejection</label>
            <textarea className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark px-4 py-3 text-sm text-text-main dark:text-white placeholder:text-gray-400 focus:border-primary focus:ring-primary shadow-sm resize-none" id="rejectReason" placeholder="Enter reason for rejection (Required if rejecting)..." rows={2}></textarea>
          </div>
          <div className="flex gap-3">
            <button className="flex-1 rounded-xl border border-red-500/30 bg-surface-light dark:bg-surface-dark px-4 py-3.5 text-sm font-bold text-red-500 hover:bg-red-500/5 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px]">close</span>
              Reject
            </button>
            <button className="flex-[2] rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-white hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px]">check</span>
              Accept Task
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};
