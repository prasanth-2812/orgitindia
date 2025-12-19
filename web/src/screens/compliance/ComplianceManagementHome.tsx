import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { BottomNav } from '../../components/shared';
import { complianceService, getScopeBadge } from '../../services/complianceService';
import { useAuth } from '../../context/AuthContext';
import { ComplianceMaster } from '../../../shared/src/types';

export const ComplianceManagementHome: React.FC = () => {
  const [filters, setFilters] = useState({ category: '', status: '', scope: '', search: '', page: 1, limit: 20 });
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data, isLoading } = useQuery(
    ['compliance', filters],
    () => complianceService.getAll(filters).then((res) => res.data.data)
  );

  const items: ComplianceMaster[] = data?.items || [];

  return (
    <div className="pb-24 min-h-screen bg-background-light dark:bg-background-dark">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-main dark:text-white">Compliance Management</h1>
            <p className="text-text-muted dark:text-white/60 mt-2">
              View Global and Organisation compliances
            </p>
          </div>
          {isAdmin && (
            <Link
              to="/compliance/create"
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg shadow-sm transition-all font-medium"
            >
              <span className="material-symbols-outlined">add</span>
              Add Compliance
            </Link>
          )}
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            🌐 Global compliances are visible to all organisations. {isAdmin && 'You can create Organisation-specific compliances.'}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search compliances..."
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-sm"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            />
            <select
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-sm"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <select
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-sm"
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
          <div className="text-center py-12 text-text-muted dark:text-white/60">Loading compliances...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-text-muted dark:text-white/60">
            No compliances found
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const scopeBadge = getScopeBadge(item.scope);
              const canEditItem = isAdmin && item.scope === 'ORG';
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-text-main dark:text-white">{item.title}</h3>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          item.scope === 'GLOBAL'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        }`}>
                          {scopeBadge.label}
                        </span>
                        {item.scope === 'GLOBAL' && !isAdmin && (
                          <span className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400" title="Read-only">
                            🔒
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-muted dark:text-white/60 mb-2">{item.category}</p>
                      {item.description && (
                        <p className="text-sm text-text-muted dark:text-white/60 mb-2">{item.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-text-muted dark:text-white/60">
                        <span>Type: {item.complianceType}</span>
                        {item.frequency && <span>Frequency: {item.frequency}</span>}
                        <span className={`px-2 py-0.5 rounded-full ${
                          item.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Link
                        to={`/compliance/${item.id}`}
                        className="text-primary hover:text-primary-dark font-medium text-sm"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};
