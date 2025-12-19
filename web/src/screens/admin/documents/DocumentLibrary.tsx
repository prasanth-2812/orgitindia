import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { documentInstanceService } from '../../../services/documentInstanceService';
import { documentTemplateService } from '../../../services/documentTemplateService';
import { Button } from '../../../components/shared';

export const DocumentLibrary: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: '' as '' | 'draft' | 'final' | 'archived',
    templateId: '',
    search: '',
    page: 1,
    limit: 20,
  });

  const { data, isLoading } = useQuery(
    ['documentInstances', filters],
    () => documentInstanceService.list(filters),
    { keepPreviousData: true }
  );

  const { data: templatesData } = useQuery(
    'activeTemplates',
    async () => {
      const res = await documentTemplateService.getActiveTemplates();
      return res.data.data;
    }
  );

  const deleteMutation = useMutation(
    (id: string) => documentInstanceService.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('documentInstances');
      },
    }
  );

  const updateStatusMutation = useMutation(
    ({ id, status }: { id: string; status: 'draft' | 'final' }) => {
      return documentInstanceService.update(id, {
        status: status,
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('documentInstances');
        alert('Document status updated successfully!');
      },
      onError: (error: any) => {
        alert(`Failed to update status: ${error.response?.data?.error || error.message}`);
      },
    }
  );

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const blob = await documentInstanceService.download(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Failed to download document');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Document Library</h1>
            <p className="text-slate-600 mt-1">Manage your documents</p>
          </div>
          <Button onClick={() => navigate('/admin/documents/create')}>
            <span className="material-symbols-outlined mr-2">add</span>
            Create Document
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search documents..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                className="w-full rounded-lg border-slate-200 bg-white text-slate-900 text-sm focus:border-primary focus:ring-primary py-2 px-3"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as any, page: 1 })}
                className="w-full rounded-lg border-slate-200 bg-white text-slate-900 text-sm focus:border-primary focus:ring-primary py-2 px-3"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="final">Final</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Template</label>
              <select
                value={filters.templateId}
                onChange={(e) => setFilters({ ...filters, templateId: e.target.value, page: 1 })}
                className="w-full rounded-lg border-slate-200 bg-white text-slate-900 text-sm focus:border-primary focus:ring-primary py-2 px-3"
              >
                <option value="">All Templates</option>
                {templatesData?.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setFilters({ status: '', templateId: '', search: '', page: 1, limit: 20 })}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Documents Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Loading documents...</p>
          </div>
        ) : data?.instances.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">description</span>
            <p className="text-slate-600 mb-4">No documents found</p>
            <Button onClick={() => navigate('/admin/documents/create')}>
              Create Your First Document
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data?.instances.map((instance: any) => (
                  <tr key={instance.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{instance.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600">
                        {templatesData?.find((t: any) => t.id === instance.templateId)?.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            instance.status === 'final'
                              ? 'bg-green-100 text-green-800'
                              : instance.status === 'draft'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {instance.status}
                        </span>
                        {instance.status === 'draft' && (
                          <button
                            onClick={() => {
                              if (window.confirm('Mark this document as Final? This action cannot be undone.')) {
                                updateStatusMutation.mutate({ id: instance.id, status: 'final' });
                              }
                            }}
                            disabled={updateStatusMutation.isLoading}
                            className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                            title="Mark as Final"
                          >
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(instance.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/documents/${instance.id}`)}
                          className="text-primary hover:text-primary/80"
                          title="View"
                        >
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                        {instance.status === 'draft' && (
                          <button
                            onClick={() => navigate(`/admin/documents/${instance.id}?edit=true`)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(instance.id)}
                          className="text-green-600 hover:text-green-800"
                          title="Download"
                        >
                          <span className="material-symbols-outlined">download</span>
                        </button>
                        <button
                          onClick={() => handleDelete(instance.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Showing {((filters.page - 1) * filters.limit) + 1} to{' '}
                  {Math.min(filters.page * filters.limit, data.total)} of {data.total} documents
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                    disabled={filters.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                    disabled={filters.page >= data.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

