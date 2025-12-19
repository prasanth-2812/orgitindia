import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { path: '/admin', icon: 'grid_view', label: 'Dashboard' },
  { path: '/admin/tasks', icon: 'check_circle', label: 'Tasks' },
  { path: '/admin/documents', icon: 'description', label: 'Documents' },
  { path: '/admin/compliance', icon: 'verified_user', label: 'Compliance' },
  { path: '/admin/users', icon: 'group', label: 'Users' },
  { path: '/admin/entity-master', icon: 'domain', label: 'Entity Master Data' },
];

export const AdminSidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [configExpanded, setConfigExpanded] = useState(
    location.pathname.startsWith('/admin/configuration')
  );

  return (
    <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 h-full font-body shrink-0 z-20">
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-primary p-2 rounded-lg text-white shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-slate-900 text-lg font-extrabold tracking-tight leading-none">ORGIT</h1>
            <span className="text-[10px] text-slate-500 font-medium">Enterprise Admin</span>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[22px] ${
                    isActive
                      ? ''
                      : 'text-slate-400 group-hover:text-slate-600 transition-colors'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
          <div className="px-3 pt-6 pb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">System</p>
          </div>
          <button
            onClick={() => setConfigExpanded(!configExpanded)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
              location.pathname.startsWith('/admin/configuration')
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[22px] ${
                location.pathname.startsWith('/admin/configuration')
                  ? ''
                  : 'text-slate-400 group-hover:text-slate-600 transition-colors'
              }`}
            >
              settings
            </span>
            <span className="font-medium text-sm">Configuration</span>
          </button>
          {configExpanded && (
            <div className="pl-[11px] space-y-1 pt-1">
              <Link
                to="/admin/configuration/notifications"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors pl-11 ${
                  location.pathname === '/admin/configuration/notifications'
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className="font-medium text-sm">Notifications</span>
              </Link>
              <Link
                to="/admin/configuration/auto-escalation"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors pl-11 ${
                  location.pathname === '/admin/configuration/auto-escalation'
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className="font-medium text-sm">Auto Escalation</span>
              </Link>
            </div>
          )}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
          {user?.profilePhotoUrl ? (
            <div
              className="size-9 rounded-full bg-cover bg-center border border-slate-200"
              style={{ backgroundImage: `url(${user.profilePhotoUrl})` }}
            />
          ) : (
            <div className="size-9 rounded-full bg-primary flex items-center justify-center text-white font-bold border border-slate-200">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{user?.name || 'Admin'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email || 'admin@orgit.com'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

