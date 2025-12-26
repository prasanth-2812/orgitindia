import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { BottomNav, Avatar } from '../../components/shared';
import { complianceService } from '../../services/complianceService';
import { useAuth } from '../../context/AuthContext';
import { AdminLayout } from '../../components/admin/AdminLayout';

export const ComplianceManagementHome: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ category: '', status: '', scope: '', search: '', page: 1, limit: 20 });
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data, isLoading } = useQuery(
    ['compliance', filters],
    () => complianceService.getAll(filters as any).then((res) => res.data.data)
  );

  const items = data?.items || [];

  const content = (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen flex flex-col overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors duration-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar src={user?.profilePhotoUrl} size="md" online />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Compliance Hub</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isAdmin ? 'Admin View' : 'Employee View'}
              </p>
            </div>
          </div>
          <button className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span className="material-symbols-outlined text-gray-700 dark:text-gray-200">notifications</span>
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse"></span>
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24">
        {/* Search Bar */}
        <div className="px-4 py-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors">
                search
              </span>
            </div>
            <input
              className="block w-full pl-10 pr-12 py-3 rounded-xl border-none bg-white dark:bg-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-primary placeholder-gray-400 dark:placeholder-gray-500 text-sm transition-all"
              placeholder="Search acts, filings, or circulars..."
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
              <button className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[20px]">tune</span>
              </button>
            </div>
          </div>
        </div>

        {/* Critical Deadline Banner */}
        <div className="px-4 mb-6">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-5 shadow-lg relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -ml-6 -mb-6"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-gray-300 text-xs font-medium uppercase tracking-wider mb-1">
                    Critical Deadline
                  </p>
                  <h3 className="text-xl font-bold">GSTR-1 Filing</h3>
                </div>
                <div className="bg-red-500/20 text-red-200 text-xs font-bold px-2.5 py-1 rounded-full border border-red-500/30 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  3 Days Left
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm mb-4 border border-white/5">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-300">Completion Status</span>
                  <span className="font-bold text-primary-300">85%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="flex-1 bg-white text-gray-900 text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  Complete Now
                </button>
                <button className="flex-1 bg-transparent border border-white/30 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-white/10 transition-colors">
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance Repository */}
        <div className="px-4 mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Compliance Repository</h2>
          <button className="text-primary text-sm font-medium hover:underline">View All</button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
            Loading compliances...
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4 mb-6">
            {items.map((item: any) => (
              <div
                key={item.id}
                onClick={() => navigate(`/compliance/${item.id}`)}
                className="group bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white text-primary transition-colors">
                  <span className="material-symbols-outlined">
                    {item.category === 'GST' ? 'receipt_long' :
                      item.category === 'Income Tax' ? 'account_balance_wallet' :
                        item.category === 'ROC' ? 'domain' : 'gavel'}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">{item.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{item.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Recent Updates */}
        <div className="px-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Recent Updates</h3>
          <div className="flex flex-col gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 flex gap-3 items-start">
              <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300">
                <span className="material-symbols-outlined text-[20px]">notifications_active</span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">GST Late Fees Revised</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">New circular issued by CBIC regarding the reduction in late fees for GSTR-3B filings.</p>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">2 hours ago</p>
              </div>
            </div>
            {/* More updates... */}
          </div>
        </div>
      </main>

      {isAdmin && (
        <button
          onClick={() => navigate('/compliance/create')}
          className="fixed bottom-24 right-4 h-14 w-14 bg-primary text-white rounded-full shadow-[0_4px_12px_rgba(164,19,236,0.4)] flex items-center justify-center hover:bg-primary/90 hover:scale-105 transition-all z-40"
        >
          <span className="material-symbols-outlined text-[28px]">add</span>
        </button>
      )}
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
