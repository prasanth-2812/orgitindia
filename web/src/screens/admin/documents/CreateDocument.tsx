import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { documentTemplateService } from '../../../services/documentTemplateService';
import { documentInstanceService } from '../../../services/documentInstanceService';
import { Button } from '../../../components/shared';
import { DocumentBuilderProvider, useDocumentBuilder } from '../../../components/document-builder/DocumentBuilderProvider';
import { DocumentBuilderContent } from '../../../components/document-builder/DocumentBuilderLayout';

const DocumentFillerIntegration: React.FC<{ templateId: string | null; onBack: () => void }> = ({ templateId, onBack }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { state, dispatch } = useDocumentBuilder();
  const [title, setTitle] = useState('');

  const { isLoading } = useQuery(
    ['documentTemplate', templateId],
    () => documentTemplateService.getById(templateId!).then(res => res.data.data),
    {
      enabled: !!templateId,
      onSuccess: (data) => {
        console.log('DEBUG: Received template data from API:', JSON.stringify(data, null, 2));
        let config = data.builderConfig;

        // Robust parsing for builderConfig
        if (typeof config === 'string') {
          try {
            console.log('DEBUG: builderConfig is a string, parsing...');
            config = JSON.parse(config);
          } catch (e) {
            console.error('DEBUG: Failed to parse builderConfig string', e);
            config = null;
          }
        }

        // Fallback to templateSchema._builderConfig if needed
        if (!config && data.templateSchema) {
          try {
            console.log('DEBUG: builderConfig missing, checking templateSchema...');
            const schema = typeof data.templateSchema === 'string'
              ? JSON.parse(data.templateSchema)
              : data.templateSchema;

            console.log('DEBUG: Parsed templateSchema:', JSON.stringify(schema, null, 2));
            config = schema._builderConfig;

            // Re-parse if it's still a string (nested stringification)
            if (typeof config === 'string') {
              console.log('DEBUG: _builderConfig is a string, parsing...');
              config = JSON.parse(config);
            }
          } catch (e) {
            console.error('DEBUG: Failed to parse templateSchema', e);
          }
        }

        console.log('DEBUG: Final resolved config:', JSON.stringify(config, null, 2));

        if (config && typeof config === 'object') {
          // Load template and FORCE mode to 'fill'
          dispatch({
            type: 'LOAD_TEMPLATE',
            payload: { ...config, mode: 'fill' }
          });
        } else {
          console.error('DEBUG: No valid config found for template');
          alert('This template is not supported by the new document builder.');
          onBack();
        }
        setTitle(`${data.name} - ${new Date().toLocaleDateString()}`);
      },
      onError: (err: any) => {
        console.error('DEBUG: Failed to fetch template:', err);
        alert('Failed to load template structure: ' + (err.response?.data?.error || err.message));
        onBack();
      }
    }
  );

  // Ensure we are in fill mode
  useEffect(() => {
    if (state.mode !== 'fill') {
      dispatch({ type: 'SET_MODE', payload: 'fill' });
    }
  }, [state.mode, dispatch]);

  const mutation = useMutation(
    (data: any) => documentInstanceService.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('documentInstances');
        navigate('/admin/documents');
      },
      onError: (err: any) => {
        console.error('DEBUG: Save failed with error:', err);
        if (err.response) {
          console.error('DEBUG: Error response data:', JSON.stringify(err.response.data, null, 2));
        }
        alert('Failed to save document: ' + (err.response?.data?.error || err.response?.data?.message || err.message));
      }
    }
  );

  const handleSave = () => {
    // We send the current builder state as 'filledData' 
    // This includes all sections, rows, and documentData
    mutation.mutate({
      templateId,
      title,
      status: 'draft',
      filledData: state
    });
  };

  if (isLoading) return <div className="p-8"><p>Loading template...</p></div>;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <label className="text-xs text-gray-500 block">Document Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-bold text-gray-900 border-none p-0 focus:ring-0 w-64"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={mutation.isLoading}>
            {mutation.isLoading ? 'Creating...' : 'Create Document'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <DocumentBuilderContent />
      </div>
    </div>
  );
}

export const CreateDocument: React.FC = () => {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId?: string }>();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(templateId || null);

  const { data: templatesData, isLoading } = useQuery(
    'activeTemplates',
    async () => {
      const res = await documentTemplateService.getActiveTemplates();
      return res.data.data;
    }
  );

  if (selectedTemplateId) {
    return (
      <DocumentBuilderProvider>
        <DocumentFillerIntegration
          templateId={selectedTemplateId}
          onBack={() => {
            setSelectedTemplateId(null);
            navigate('/admin/documents/create');
          }}
        />
      </DocumentBuilderProvider>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Create New Document</h1>
          <p className="text-slate-600 mt-1">Select a template to start</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading templates...</p>
          </div>
        ) : templatesData?.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">description</span>
            <p className="text-slate-600 mb-4">No active templates available</p>
            <p className="text-sm text-slate-500">Please contact your Super Admin to create templates</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templatesData?.map((t: any) => (
              <div
                key={t.id}
                onClick={() => setSelectedTemplateId(t.id)}
                className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary cursor-pointer transition-all group"
              >
                <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">description</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{t.name}</h3>
                <p className="text-sm text-gray-500">{t.type}</p>
                <div className="mt-4 flex items-center text-sm text-primary font-medium">
                  Use Template <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
