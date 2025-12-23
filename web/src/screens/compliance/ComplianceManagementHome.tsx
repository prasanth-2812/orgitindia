import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { BottomNav } from '../../components/shared';
import { complianceService, getScopeBadge } from '../../services/complianceService';
import { useAuth } from '../../context/AuthContext';
import { AdminLayout } from '../../components/admin/AdminLayout';

export const ComplianceManagementHome: React.FC = () => {
  const [filters, setFilters] = useState({ category: '', status: '', scope: '', search: '', page: 1, limit: 20 });
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data, isLoading } = useQuery(
    ['compliance', filters],
    () => complianceService.getAll(filters as any).then((res) => res.data.data)
  );

  const items = data?.items || [];

  const content = (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">Compliance Management</h1>
          <p className="text-slate-600 mt-1">View Global and Organisation compliances</p>
        </div>
        {isAdmin && (
          <Link
            to="/compliance/create"
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg shadow-lg shadow-primary/20 transition-all font-semibold"
          >
            <span className="material-symbols-outlined">add</span>
            Add Compliance
          </Link>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-700">
        <span className="material-symbols-outlined text-blue-500">info</span>
        <p className="text-sm">
          🌐 Global compliances are visible across all organisations. {isAdmin && 'As an Admin, you can create organisation-specific compliance rules.'}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              placeholder="Search compliances..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            />
          </div>
          <select
            className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-primary transition-all"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <select
            className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-primary transition-all"
            value={filters.scope}
            onChange={(e) => setFilters({ ...filters, scope: e.target.value, page: 1 })}
          >
            <option value="">All Scopes</option>
            <option value="GLOBAL">Global</option>
            <option value="ORG">Organisation</option>
          </select>
        </div>
      </div>

      {/* Compliance List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          Loading compliances...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <span className="material-symbols-outlined text-5xl text-slate-200 mb-4">verified_user</span>
          <p>No compliances found matching your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {items.map((item: any) => {
            const scopeBadge = getScopeBadge(item.scope);
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:border-primary transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{item.title}</h3>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${item.scope === 'GLOBAL'
                          ? 'bg-blue-50 text-blue-600 border border-blue-100'
                          : 'bg-green-50 text-green-600 border border-green-100'
                        }`}>
                        {scopeBadge.label}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${item.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-slate-50 text-slate-500 border border-slate-100'
                        }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mb-3">{item.category} • {item.complianceType}</p>
                    {item.description && (
                      <p className="text-sm text-slate-600 mb-4 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                  <Link
                    to={`/compliance/${item.id}`}
                    className="shrink-0 flex items-center justify-center size-10 rounded-full text-slate-400 hover:bg-slate-50 hover:text-primary transition-all"
                    title="View Details"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
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
