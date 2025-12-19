import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm, Controller } from 'react-hook-form';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { documentTemplateService } from '../../../services/documentTemplateService';
import { documentInstanceService } from '../../../services/documentInstanceService';
import { organizationService } from '../../../services/organizationService';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/shared';

interface TemplateField {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  min?: number;
  max?: number;
  fields?: TemplateField[]; // For array type
}

export const CreateDocument: React.FC = () => {
  const navigate = useNavigate();
  const { templateId: paramTemplateId } = useParams<{ templateId?: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(paramTemplateId || null);

  // Fetch active templates
  const { data: templatesData } = useQuery(
    'activeTemplates',
    async () => {
      const res = await documentTemplateService.getActiveTemplates();
      return res.data.data;
    }
  );

  // Fetch selected template
  const { data: template, isLoading: templateLoading } = useQuery(
    ['template', selectedTemplateId],
    async () => {
      if (!selectedTemplateId) return null;
      const res = await documentTemplateService.getById(selectedTemplateId);
      return res.data.data;
    },
    { enabled: !!selectedTemplateId }
  );

  // Fetch organization data for header preview
  const { data: orgData } = useQuery(
    ['organization', user?.organizationId],
    async () => {
      if (!user?.organizationId) return null;
      const res = await organizationService.getById(user.organizationId);
      return res.data.data;
    },
    { enabled: !!user?.organizationId }
  );

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm({
    defaultValues: {},
  });

  const createMutation = useMutation(
    (data: any) => documentInstanceService.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('documentInstances');
        navigate('/admin/documents');
      },
    }
  );

  const onSubmit = async (formData: any) => {
    if (!selectedTemplateId) {
      alert('Please select a template');
      return;
    }

    // Filter out empty values and format data
    const filledData: Record<string, any> = {};
    const schema = template?.templateSchema;
    if (schema?.editableFields) {
      schema.editableFields.forEach((field: TemplateField) => {
        if (formData[field.name] !== undefined && formData[field.name] !== '') {
          filledData[field.name] = formData[field.name];
        }
      });
    }

    const title = formData.title || `${template?.name || 'Document'} - ${new Date().toLocaleDateString()}`;

    createMutation.mutate({
      templateId: selectedTemplateId,
      filledData,
      title,
      status: formData.status || 'draft',
    });
  };

  const renderField = (field: TemplateField, prefix = '') => {
    const fieldName = prefix ? `${prefix}.${field.name}` : field.name;

    switch (field.type) {
      case 'text':
      case 'string':
        return (
          <div key={fieldName} className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              {...register(fieldName, { required: field.required })}
              type="text"
              className="w-full rounded-lg border-slate-200 bg-white text-slate-900 text-sm focus:border-primary focus:ring-primary py-2.5 px-3"
            />
            {errors[fieldName] && (
              <p className="text-red-500 text-xs mt-1">{errors[fieldName]?.message as string}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={fieldName} className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              {...register(fieldName, {
                required: field.required,
                valueAsNumber: true,
                min: field.min,
                max: field.max,
              })}
              type="number"
              className="w-full rounded-lg border-slate-200 bg-white text-slate-900 text-sm focus:border-primary focus:ring-primary py-2.5 px-3"
            />
            {errors[fieldName] && (
              <p className="text-red-500 text-xs mt-1">{errors[fieldName]?.message as string}</p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={fieldName} className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              {...register(fieldName, { required: field.required })}
              type="date"
              className="w-full rounded-lg border-slate-200 bg-white text-slate-900 text-sm focus:border-primary focus:ring-primary py-2.5 px-3"
            />
            {errors[fieldName] && (
              <p className="text-red-500 text-xs mt-1">{errors[fieldName]?.message as string}</p>
            )}
          </div>
        );

      case 'email':
        return (
          <div key={fieldName} className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              {...register(fieldName, {
                required: field.required,
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Invalid email address',
                },
              })}
              type="email"
              className="w-full rounded-lg border-slate-200 bg-white text-slate-900 text-sm focus:border-primary focus:ring-primary py-2.5 px-3"
            />
            {errors[fieldName] && (
              <p className="text-red-500 text-xs mt-1">{errors[fieldName]?.message as string}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={fieldName} className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              {...register(fieldName, { required: field.required })}
              rows={4}
              className="w-full rounded-lg border-slate-200 bg-white text-slate-900 text-sm focus:border-primary focus:ring-primary py-2.5 px-3"
            />
            {errors[fieldName] && (
              <p className="text-red-500 text-xs mt-1">{errors[fieldName]?.message as string}</p>
            )}
          </div>
        );

      case 'array':
        return (
          <div key={fieldName} className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <p className="text-xs text-slate-500 mb-2">Array fields - simplified implementation</p>
            <textarea
              {...register(fieldName, { required: field.required })}
              placeholder="Enter JSON array format"
              rows={3}
              className="w-full rounded-lg border-slate-200 bg-white text-slate-900 text-sm focus:border-primary focus:ring-primary py-2.5 px-3 font-mono text-xs"
            />
            {errors[fieldName] && (
              <p className="text-red-500 text-xs mt-1">{errors[fieldName]?.message as string}</p>
            )}
          </div>
        );

      default:
        return (
          <div key={fieldName} className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              {...register(fieldName, { required: field.required })}
              type="text"
              className="w-full rounded-lg border-slate-200 bg-white text-slate-900 text-sm focus:border-primary focus:ring-primary py-2.5 px-3"
            />
          </div>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Create Document</h1>
          <p className="text-slate-600 mt-1">Select a template and fill in the required information</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Template Selection */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Template <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedTemplateId || ''}
              onChange={(e) => setSelectedTemplateId(e.target.value || null)}
              className="w-full rounded-lg border-slate-200 bg-white text-slate-900 text-sm focus:border-primary focus:ring-primary py-2.5 px-3"
              required
            >
              <option value="">-- Select a template --</option>
              {templatesData?.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.type})
                </option>
              ))}
            </select>
          </div>

          {/* Header Preview (Read-only from Entity Master Data) */}
          {template && template.headerTemplate && orgData && (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Header Preview (Auto-filled from Entity Master Data)</h2>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-center py-4 border-b-2 border-gray-300">
                  {orgData.logoUrl && (
                    <img src={orgData.logoUrl} alt={orgData.name} className="max-h-20 mx-auto mb-2" />
                  )}
                  {!orgData.logoUrl && (
                    <div className="w-24 h-20 border border-dashed border-gray-400 mx-auto mb-2 flex items-center justify-center text-gray-500 text-xs">
                      Add Logo
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-gray-900">{orgData.name || 'Company Name'}</h3>
                  <p className="text-sm text-gray-600 mt-1">{orgData.address || 'Address'}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Mobile: {orgData.mobile || '+91 9999999999'} | Email: {orgData.email || 'company@gmail.com'}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-2">GSTIN - {orgData.gst || '09AAAAA1234A122'}</p>
                </div>
                <p className="text-xs text-gray-500 mt-3 italic">This header is automatically filled from your Entity Master Data and cannot be edited here.</p>
              </div>
            </div>
          )}

          {/* Document Title */}
          {selectedTemplateId && (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Document Title
              </label>
              <input
                {...register('title')}
                type="text"
                placeholder="Enter document title"
                className="w-full rounded-lg border-slate-200 bg-white text-slate-900 text-sm focus:border-primary focus:ring-primary py-2.5 px-3"
              />
            </div>
          )}

          {/* Dynamic Form Fields - Grouped by sections */}
          {template && template.templateSchema?.editableFields && (
            <div className="space-y-6">
              {/* Invoice Details Section */}
              {template.templateSchema.editableFields.some((f: TemplateField) => 
                ['invoiceNumber', 'invoiceDate', 'dueDate', 'placeOfSupply', 'rateGold', 'rateSilver'].includes(f.name)
              ) && (
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Invoice Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {template.templateSchema.editableFields
                      .filter((f: TemplateField) => 
                        ['invoiceNumber', 'invoiceDate', 'dueDate', 'placeOfSupply', 'rateGold', 'rateSilver'].includes(f.name)
                      )
                      .map((field: TemplateField) => renderField(field))}
                  </div>
                </div>
              )}

              {/* Billing Details Section */}
              {template.templateSchema.editableFields.some((f: TemplateField) => f.name.startsWith('billing')) && (
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Billing Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {template.templateSchema.editableFields
                      .filter((f: TemplateField) => f.name.startsWith('billing'))
                      .map((field: TemplateField) => renderField(field))}
                  </div>
                </div>
              )}

              {/* Shipping Details Section */}
              {template.templateSchema.editableFields.some((f: TemplateField) => f.name.startsWith('shipping')) && (
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Shipping Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {template.templateSchema.editableFields
                      .filter((f: TemplateField) => f.name.startsWith('shipping'))
                      .map((field: TemplateField) => renderField(field))}
                  </div>
                </div>
              )}

              {/* Item Details Section */}
              {template.templateSchema.editableFields.some((f: TemplateField) => f.name.startsWith('item')) && (
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Item Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {template.templateSchema.editableFields
                      .filter((f: TemplateField) => f.name.startsWith('item'))
                      .map((field: TemplateField) => renderField(field))}
                  </div>
                </div>
              )}

              {/* Summary Section */}
              {template.templateSchema.editableFields.some((f: TemplateField) => 
                ['discountAmount', 'totalAmount', 'totalInWords'].includes(f.name)
              ) && (
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Summary</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {template.templateSchema.editableFields
                      .filter((f: TemplateField) => 
                        ['discountAmount', 'totalAmount', 'totalInWords'].includes(f.name)
                      )
                      .map((field: TemplateField) => renderField(field))}
                  </div>
                </div>
              )}

              {/* Payment Details Section */}
              {template.templateSchema.editableFields.some((f: TemplateField) => 
                ['settledAmount', 'invoiceBalance'].includes(f.name)
              ) && (
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {template.templateSchema.editableFields
                      .filter((f: TemplateField) => 
                        ['settledAmount', 'invoiceBalance'].includes(f.name)
                      )
                      .map((field: TemplateField) => renderField(field))}
                  </div>
                </div>
              )}

              {/* Tax Breakdown Section */}
              {template.templateSchema.editableFields.some((f: TemplateField) => 
                ['taxPercent', 'saleAmount', 'cgstAmount', 'sgstAmount', 'totalSaleAmount', 'totalTaxAmount', 'cessAmount', 'additionalCessAmount'].includes(f.name)
              ) && (
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Tax Breakdown</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {template.templateSchema.editableFields
                      .filter((f: TemplateField) => 
                        ['taxPercent', 'saleAmount', 'cgstAmount', 'sgstAmount', 'totalSaleAmount', 'totalTaxAmount', 'cessAmount', 'additionalCessAmount'].includes(f.name)
                      )
                      .map((field: TemplateField) => renderField(field))}
                  </div>
                </div>
              )}

              {/* Bank Details Section */}
              {template.templateSchema.editableFields.some((f: TemplateField) => f.name.startsWith('bank')) && (
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Bank Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {template.templateSchema.editableFields
                      .filter((f: TemplateField) => f.name.startsWith('bank'))
                      .map((field: TemplateField) => renderField(field))}
                  </div>
                </div>
              )}

              {/* Other Fields */}
              {template.templateSchema.editableFields
                .filter((f: TemplateField) => 
                  !['invoiceNumber', 'invoiceDate', 'dueDate', 'placeOfSupply', 'rateGold', 'rateSilver',
                    'discountAmount', 'totalAmount', 'totalInWords', 'settledAmount', 'invoiceBalance',
                    'taxPercent', 'saleAmount', 'cgstAmount', 'sgstAmount', 'totalSaleAmount', 'totalTaxAmount', 'cessAmount', 'additionalCessAmount']
                    .includes(f.name) && 
                  !f.name.startsWith('billing') && 
                  !f.name.startsWith('shipping') && 
                  !f.name.startsWith('item') && 
                  !f.name.startsWith('bank')
                )
                .length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Additional Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {template.templateSchema.editableFields
                      .filter((f: TemplateField) => 
                        !['invoiceNumber', 'invoiceDate', 'dueDate', 'placeOfSupply', 'rateGold', 'rateSilver',
                          'discountAmount', 'totalAmount', 'totalInWords', 'settledAmount', 'invoiceBalance',
                          'taxPercent', 'saleAmount', 'cgstAmount', 'sgstAmount', 'totalSaleAmount', 'totalTaxAmount', 'cessAmount', 'additionalCessAmount']
                          .includes(f.name) && 
                        !f.name.startsWith('billing') && 
                        !f.name.startsWith('shipping') && 
                        !f.name.startsWith('item') && 
                        !f.name.startsWith('bank')
                      )
                      .map((field: TemplateField) => renderField(field))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Selection */}
          {selectedTemplateId && (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <select
                {...register('status')}
                className="w-full rounded-lg border-slate-200 bg-white text-slate-900 text-sm focus:border-primary focus:ring-primary py-2.5 px-3"
                defaultValue="draft"
              >
                <option value="draft">Draft</option>
                <option value="final">Final</option>
              </select>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/documents')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedTemplateId || createMutation.isLoading}
            >
              {createMutation.isLoading ? 'Creating...' : 'Create Document'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

