import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { path: '/super-admin', icon: 'dashboard', label: 'Dashboard' },
  { path: '/super-admin/organizations', icon: 'domain', label: 'Organisations' },
  { path: '/super-admin/users', icon: 'people', label: 'Users' },
  { path: '/super-admin/document-templates', icon: 'description', label: 'Document Templates' },
  { path: '/super-admin/document-instances', icon: 'folder', label: 'Document Instances' },
  { path: '/super-admin/compliance', icon: 'verified_user', label: 'Compliance Management' },
];

export const SuperAdminSidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <aside className="w-64 bg-super-admin-surface-light dark:bg-super-admin-surface-dark border-r border-super-admin-border-light dark:border-super-admin-border-dark flex-shrink-0 flex flex-col transition-colors duration-200 z-20">
      <div className="h-20 flex items-center px-6 border-b border-super-admin-border-light dark:border-super-admin-border-dark">
        <div className="flex items-center gap-3">
          <div className="bg-super-admin-primary text-white p-2 rounded-lg shadow-sm">
            <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">ORGIT</h1>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Enterprise Admin</span>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${
                isActive
                  ? 'bg-super-admin-primary text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <span
                className={`material-symbols-outlined ${
                  isActive
                    ? ''
                    : 'text-gray-400 group-hover:text-super-admin-primary dark:group-hover:text-white transition-colors'
                }`}
              >
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
        <div className="pt-6 pb-2 px-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">System</p>
        </div>
        <Link
          to="/super-admin/settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${
            location.pathname === '/super-admin/settings'
              ? 'bg-super-admin-primary text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
          }`}
        >
          <span
            className={`material-symbols-outlined ${
              location.pathname === '/super-admin/settings'
                ? ''
                : 'text-gray-400 group-hover:text-super-admin-primary dark:group-hover:text-white transition-colors'
            }`}
          >
            settings
          </span>
          <span className="font-medium">Settings</span>
        </Link>
      </nav>
      <div className="p-4 border-t border-super-admin-border-light dark:border-super-admin-border-dark">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer transition-colors">
          {user?.profilePhotoUrl ? (
            <img
              alt={user.name}
              className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600"
              src={user.profilePhotoUrl}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-super-admin-primary flex items-center justify-center text-white font-semibold">
              {user?.name.charAt(0).toUpperCase() || 'A'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name || 'Super Admin'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Super Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

