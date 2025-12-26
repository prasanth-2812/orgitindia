import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav, Avatar } from '../../components/shared';
import { useAuth } from '../../context/AuthContext';

export const DocumentManagementHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [documents] = useState<any[]>([]); // Placeholder for now
  const isLoading = false; // Placeholder

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white transition-colors duration-200 min-h-screen flex flex-col font-display">
      <div className="sticky top-0 z-20 flex items-center justify-between bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar src={user?.profilePhotoUrl} size="md" online />
          </div>
          <div>
            <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight">Documents</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
              Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name?.split(' ')[0] || 'User'}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/notifications')}
          className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-slate-800 shadow-sm text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <span className="material-symbols-outlined text-[24px]">notifications</span>
        </button>
      </div>

      <main className="flex-1 pb-24">
        {/* Search */}
        <div className="px-4 py-2">
          <div className="flex w-full items-center rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800 h-12 overflow-hidden">
            <div className="flex items-center justify-center pl-4 text-slate-400 dark:text-slate-500">
              <span className="material-symbols-outlined">search</span>
            </div>
            <input
              className="flex w-full min-w-0 flex-1 bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 text-base font-normal h-full"
              placeholder="Search files, templates..."
            />
            <button className="pr-4 text-primary hover:text-primary/80">
              <span className="material-symbols-outlined">tune</span>
            </button>
          </div>
        </div>

        {/* Templates */}
        <div className="flex flex-col pt-6">
          <div className="flex items-center justify-between px-4 pb-3">
            <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight">Default Templates</h3>
            <button className="text-primary text-sm font-semibold hover:underline">View all</button>
          </div>
          <div className="flex w-full overflow-x-auto no-scrollbar px-4 pb-2 gap-4">
            <TemplateItem icon="receipt_long" label="Accounting" color="primary" />
            <TemplateItem icon="request_quote" label="Expenses" color="orange-500" />
            <TemplateItem icon="gavel" label="Contracts" color="purple-500" />
            <TemplateItem icon="campaign" label="Marketing" color="teal-500" />
            <TemplateItem icon="more_horiz" label="More" color="slate-500" />
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-col pt-4">
          <div className="flex items-center justify-between px-4 pb-3">
            <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight">Categories</h3>
            <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-0.5">
              <button className="p-1 rounded bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white">
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
              </button>
              <button className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <span className="material-symbols-outlined text-[18px]">list</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4">
            <CategoryCard icon="folder_shared" label="Shared" count={12} sublabel="Team Projects" color="text-primary" />
            <CategoryCard icon="folder_special" label="Personal" count={5} sublabel="My Drafts" color="text-yellow-500" />
            <CategoryCard icon="shield" label="Compliance" count={3} sublabel="Policies" color="text-red-400" />
            <CategoryCard icon="admin_panel_settings" label="Admin" count={8} sublabel="Staff Only" color="text-slate-400" />
          </div>
        </div>

        {/* Recent Files */}
        <div className="flex flex-col pt-6">
          <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight px-4 pb-3">Recent Files</h3>
          <div className="flex flex-col px-4 gap-3">
            {isLoading ? (
              <p className="text-center text-slate-500 py-4">Loading documents...</p>
            ) : documents.length === 0 ? (
              // Mock data for visual verification if empty
              <>
                <FileItem
                  doc={{
                    id: '1',
                    name: 'Q3_Financial_Report.pdf',
                    size: '2.4 MB',
                    updatedAt: 'Edited 2h ago',
                    type: 'pdf'
                  }}
                  onClick={() => { }}
                />
                <FileItem
                  doc={{
                    id: '2',
                    name: 'Employee_Handbook_2024.docx',
                    size: '5.1 MB',
                    updatedAt: 'Yesterday',
                    type: 'docx'
                  }}
                  onClick={() => { }}
                />
              </>
            ) : (
              documents.map((doc: any) => (
                <FileItem key={doc.id} doc={doc} onClick={() => navigate(`/documents/${doc.id}`)} />
              ))
            )}
          </div>
        </div>
      </main>

      <button
        onClick={() => navigate('/documents/add')}
        className="fixed bottom-24 right-4 z-30 flex items-center justify-center size-14 rounded-full bg-primary text-white shadow-lg shadow-primary/30 active:scale-95 transition-transform hover:brightness-105"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      <BottomNav />
    </div>
  );
};

// Helper Components

const TemplateItem: React.FC<{ icon: string; label: string; color: string }> = ({ icon, label, color }) => {
  // Map text color classes roughly for background opacity logic or use inline styles if needed for arbitrary colors
  // For simplicity, strict semantic color mapping
  let bgClass = "bg-primary/10";
  let textClass = "text-primary";

  if (color === 'orange-500') { bgClass = "bg-orange-500/10"; textClass = "text-orange-500"; }
  else if (color === 'purple-500') { bgClass = "bg-purple-500/10"; textClass = "text-purple-500"; }
  else if (color === 'teal-500') { bgClass = "bg-teal-500/10"; textClass = "text-teal-500"; }
  else if (color === 'slate-500') { bgClass = "bg-slate-500/10"; textClass = "text-slate-500"; }

  return (
    <button className="flex flex-col gap-2 min-w-[80px] group">
      <div className={`w-full aspect-square rounded-2xl ${bgClass} flex items-center justify-center group-active:scale-95 transition-transform`}>
        <span className={`material-symbols-outlined ${textClass} text-[32px]`}>{icon}</span>
      </div>
      <p className="text-slate-700 dark:text-slate-300 text-xs font-medium text-center">{label}</p>
    </button>
  );
}

const CategoryCard: React.FC<{ icon: string; label: string; count: number; sublabel: string; color: string }> = ({ icon, label, count, sublabel, color }) => (
  <div className="flex flex-col p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-700 transition-colors cursor-pointer">
    <div className="flex justify-between items-start mb-2">
      <span className={`material-symbols-outlined ${color} text-[28px]`}>{icon}</span>
      <span className="text-xs font-semibold text-slate-400">{count}</span>
    </div>
    <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{label}</h4>
    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sublabel}</p>
  </div>
);

const FileItem: React.FC<{ doc: any; onClick: () => void }> = ({ doc, onClick }) => {
  let iconColorClass = "text-slate-500";
  let iconBgClass = "bg-slate-100 dark:bg-slate-700";
  let iconName = "description";

  if (doc.type === 'pdf' || doc.name.endsWith('.pdf')) {
    iconColorClass = "text-red-500";
    iconBgClass = "bg-red-50 dark:bg-red-500/10";
    iconName = "picture_as_pdf";
  } else if (doc.type === 'docx' || doc.name.endsWith('.docx')) {
    iconColorClass = "text-blue-500";
    iconBgClass = "bg-blue-50 dark:bg-blue-500/10";
    iconName = "description";
  } else if (doc.type === 'image' || doc.name.match(/\.(jpg|jpeg|png)$/)) {
    iconColorClass = "text-purple-500"; // simplistic
    iconBgClass = "bg-purple-50 dark:bg-purple-500/10";
    iconName = "image";
  }

  return (
    <div onClick={onClick} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-primary/50 transition-colors">
      <div className={`shrink-0 flex items-center justify-center size-12 ${iconBgClass} rounded-lg`}>
        <span className={`material-symbols-outlined ${iconColorClass}`}>{iconName}</span>
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{doc.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">{doc.size}</span>
          <span className="size-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{doc.updatedAt}</span>
        </div>
      </div>
      <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
        <span className="material-symbols-outlined">more_vert</span>
      </button>
    </div>
  );
};
