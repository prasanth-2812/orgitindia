import React from 'react';
import { AdminSidebar } from './AdminSidebar';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';

interface AdminLayoutProps {
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  hideHeader?: boolean;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, headerActions, hideHeader = false }) => {
  const { user } = useAuth();

  // Redirect if not admin
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-background">
        {!hideHeader && (
          <header className="h-16 border-b border-border bg-surface/80 backdrop-blur-md flex items-center justify-between px-8 shrink-0 z-10 sticky top-0">
            <div className="flex items-center gap-4">
              <button className="md:hidden text-text-main">
                <span className="material-symbols-outlined">menu</span>
              </button>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <span>Dashboard</span>
                <span className="material-symbols-outlined text-base">chevron_right</span>
                <span className="font-semibold text-text-main">Admin Panel</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {headerActions}
              <div className="relative hidden sm:block">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">
                  search
                </span>
                <input
                  className="bg-slate-100 border border-transparent hover:border-border focus:border-primary-600 rounded-full py-2 pl-10 pr-4 text-sm text-text-main focus:ring-0 focus:outline-none w-64 placeholder:text-text-muted transition-all"
                  placeholder="Search..."
                  type="text"
                />
              </div>
              <button className="relative text-text-muted hover:text-primary-700 transition-colors">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-0.5 right-0.5 size-2 bg-red-500 rounded-full ring-2 ring-white"></span>
              </button>
              <button className="text-text-muted hover:text-primary-700 transition-colors">
                <span className="material-symbols-outlined">help</span>
              </button>
            </div>
          </header>
        )}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

