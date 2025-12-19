import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface SuperAdminHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  showSearch?: boolean;
  searchPlaceholder?: string;
}

export const SuperAdminHeader: React.FC<SuperAdminHeaderProps> = ({
  breadcrumbs = [],
  showSearch = false,
  searchPlaceholder = 'Search...',
}) => {
  const location = useLocation();

  // Generate breadcrumbs from path if not provided
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    if (breadcrumbs.length > 0) return breadcrumbs;

    const paths = location.pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [{ label: 'Dashboard', path: '/super-admin' }];

    if (paths.length > 1) {
      paths.slice(1).forEach((path, index) => {
        const fullPath = '/' + paths.slice(0, index + 2).join('/');
        const label = path
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        items.push({ label, path: index < paths.length - 2 ? fullPath : undefined });
      });
    }

    return items;
  };

  const finalBreadcrumbs = getBreadcrumbs();

  return (
    <header className="h-20 bg-super-admin-surface-light dark:bg-super-admin-surface-dark flex items-center justify-between px-8 flex-shrink-0 border-b border-super-admin-border-light dark:border-super-admin-border-dark shadow-sm z-10">
      <div className="flex items-center gap-8">
        <nav className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <span className="material-symbols-outlined text-xl mr-2 text-gray-400">home</span>
          {finalBreadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {crumb.path ? (
                <Link
                  to={crumb.path}
                  className="hover:text-gray-800 dark:hover:text-white transition-colors cursor-pointer"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-semibold text-gray-900 dark:text-white">{crumb.label}</span>
              )}
              {index < finalBreadcrumbs.length - 1 && <span className="mx-2">/</span>}
            </React.Fragment>
          ))}
        </nav>
        {showSearch && (
          <div className="hidden lg:flex relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-gray-400">search</span>
            </span>
            <input
              className="w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 text-sm focus:border-super-admin-primary focus:ring-1 focus:ring-super-admin-primary outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500"
              placeholder={searchPlaceholder}
              type="text"
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-super-admin-surface-light dark:border-super-admin-surface-dark"></span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-super-admin-primary dark:hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg border border-transparent hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined text-lg">help</span>
          <span>Help</span>
        </button>
      </div>
    </header>
  );
};

