import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { SuperAdminLayout } from '../../../components/super-admin/SuperAdminLayout';
import { userService } from '../../../services/userService';
import { useAuth } from '../../../context/AuthContext';

export const UserList: React.FC = () => {
  const [filters, setFilters] = useState({ role: '', status: '', search: '', page: 1, limit: 20 });
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data, isLoading } = useQuery(
    ['users', filters],
    () => userService.getAll(filters).then((res) => res.data.data)
  );

  const users = data?.users || [];
  const total = data?.total || 0;

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    // Prevent deleting yourself
    if (deleteConfirm.id === currentUser?.id) {
      alert('You cannot delete your own account');
      setDeleteConfirm(null);
      return;
    }
    
    setIsDeleting(true);
    try {
      await userService.delete(deleteConfirm.id);
      queryClient.invalidateQueries(['users']);
      setDeleteConfirm(null);
    } catch (error: any) {
      alert(`Error deleting user: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SuperAdminLayout
      breadcrumbs={[{ label: 'Users' }]}
      showSearch
      searchPlaceholder="Search users..."
    >
      <div className="max-w-[1600px] mx-auto p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Users</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-base">
              Manage all users on the platform
            </p>
          </div>
        </div>

        <div className="bg-super-admin-surface-light dark:bg-super-admin-surface-dark rounded-xl shadow-soft border border-super-admin-border-light dark:border-super-admin-border-dark p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search by name, mobile..."
              className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-sm"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            />
            <select
              className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-sm"
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <select
              className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-sm"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="bg-super-admin-surface-light dark:bg-super-admin-surface-dark rounded-xl shadow-soft border border-super-admin-border-light dark:border-super-admin-border-dark overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Mobile</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-super-admin-surface-dark divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {user.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.mobile}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => setDeleteConfirm({ id: user.id, name: user.name })}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete user"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      )}
                      {user.id === currentUser?.id && (
                        <span className="text-gray-400 text-xs">Current User</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-super-admin-surface-dark rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Delete User</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone and will delete all associated data including messages, tasks, and notifications.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
};

