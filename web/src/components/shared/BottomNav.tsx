import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  filled?: boolean;
  badge?: number;
}

const navItems: NavItem[] = [
  { path: '/dashboard', icon: 'dashboard', label: 'Dashboard', filled: true },
  { path: '/messages', icon: 'chat_bubble', label: 'Chat' },
  { path: '/tasks', icon: 'task_alt', label: 'Task' },
  { path: '/documents', icon: 'description', label: 'Document' },
  { path: '/compliance', icon: 'policy', label: 'Compliance' },
  { path: '/settings', icon: 'settings', label: 'Settings' },
];

export const BottomNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-background-dark-subtle border-t border-gray-100 dark:border-white/5 pb-6 pt-2 px-2 z-50">
      <ul className="flex justify-between items-end w-full max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <li key={item.path} className="flex-1">
              <Link
                to={item.path}
                className={`flex flex-col items-center gap-1 p-1 transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-gray-400 hover:text-primary'
                }`}
              >
                <div className="relative">
                  <span
                    className={`material-symbols-outlined text-[22px] ${
                      isActive && item.filled ? 'filled' : ''
                    }`}
                    style={isActive && item.filled ? { fontVariationSettings: '"FILL" 1' } : {}}
                  >
                    {item.icon}
                  </span>
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[9px] text-center leading-tight ${
                    isActive ? 'font-bold' : 'font-medium'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

