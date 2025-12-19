import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { SuperAdminLayout } from '../../../components/super-admin/SuperAdminLayout';
import { documentTemplateService } from '../../../services/documentTemplateService';

export const DocumentTemplateForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: template } = useQuery(
    ['documentTemplate', id],
    () => documentTemplateService.getById(id!).then((res) => res.data.data),
    { enabled: isEdit }
  );

  const [formData, setFormData] = useState({
    name: template?.name || '',
    type: template?.type || 'Tax Invoice',
    status: template?.status || 'draft',
    headerTemplate: template?.headerTemplate || '',
    bodyTemplate: template?.bodyTemplate || '',
    templateSchema: template?.templateSchema || { editableFields: [] },
    autoFillFields: template?.autoFillFields || {},
  });

  const createMutation = useMutation(
    (data: any) => documentTemplateService.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('documentTemplates');
        navigate('/super-admin/document-templates');
      },
    }
  );

  const updateMutation = useMutation(
    (data: any) => documentTemplateService.update(id!, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('documentTemplates');
        navigate('/super-admin/document-templates');
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <SuperAdminLayout
      breadcrumbs={[
        { label: 'Document Management', path: '/super-admin/document-templates' },
        { label: isEdit ? 'Edit Template' : 'Create Template' },
      ]}
    >
      <div className="max-w-6xl mx-auto p-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          {isEdit ? 'Edit Document Template' : 'Create Document Template'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-super-admin-surface-light dark:bg-super-admin-surface-dark rounded-xl shadow-soft border border-super-admin-border-light dark:border-super-admin-border-dark p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Template Basic Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Template Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option>Tax Invoice</option>
                  <option>Quotation</option>
                  <option>Purchase Order</option>
                  <option>Receipt</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-super-admin-surface-light dark:bg-super-admin-surface-dark rounded-xl shadow-soft border border-super-admin-border-light dark:border-super-admin-border-dark p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Header Template (Auto-filled from Entity Master)</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Use placeholders like {'{{org.name}}'}, {'{{org.gst}}'}, {'{{org.address}}'}, etc. This section is auto-filled and not editable by users.
            </p>
            <textarea
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 font-mono text-sm"
              rows={10}
              value={formData.headerTemplate}
              onChange={(e) => setFormData({ ...formData, headerTemplate: e.target.value })}
              placeholder="<div><h2>{{org.name}}</h2><p>{{org.address}}</p><p>GST: {{org.gst}}</p></div>"
            />
          </div>

          <div className="bg-super-admin-surface-light dark:bg-super-admin-surface-dark rounded-xl shadow-soft border border-super-admin-border-light dark:border-super-admin-border-dark p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Body Template (User Editable)</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Use placeholders like {'{{amount}}'}, {'{{date}}'}, {'{{items}}'}, etc. These will be filled by admins/employees.
            </p>
            <textarea
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 font-mono text-sm"
              rows={15}
              value={formData.bodyTemplate}
              onChange={(e) => setFormData({ ...formData, bodyTemplate: e.target.value })}
              placeholder="Enter template body with variables like {{amount}}, {{date}}, {{customer_name}}, etc."
            />
          </div>

          <div className="bg-super-admin-surface-light dark:bg-super-admin-surface-dark rounded-xl shadow-soft border border-super-admin-border-light dark:border-super-admin-border-dark p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Template Schema (Editable Fields)</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Define the editable fields that admins/employees can fill. Enter as JSON array.
            </p>
            <textarea
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 font-mono text-sm"
              rows={12}
              value={JSON.stringify(formData.templateSchema, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setFormData({ ...formData, templateSchema: parsed });
                } catch (err) {
                  // Invalid JSON, keep as is
                }
              }}
              placeholder={`{
  "editableFields": [
    {
      "name": "amount",
      "type": "number",
      "label": "Amount",
      "required": true
    },
    {
      "name": "date",
      "type": "date",
      "label": "Invoice Date",
      "required": true
    }
  ]
}`}
            />
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Field types: text, number, date, email, textarea, array
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => navigate('/super-admin/document-templates')}
              className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-super-admin-surface-dark hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 bg-super-admin-primary hover:bg-super-admin-primary-hover text-white px-5 py-2.5 rounded-lg shadow-sm transition-all font-medium"
            >
              <span className="material-symbols-outlined text-xl">save</span>
              {isEdit ? 'Update' : 'Create'} Template
            </button>
          </div>
        </form>
      </div>
    </SuperAdminLayout>
  );
};

