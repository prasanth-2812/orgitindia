import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { organizationService } from '../../services/organizationService';
import { useAuth } from '../../context/AuthContext';

export const EntityMasterData: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    address: '',
    gst: '',
    pan: '',
    cin: '',
    accountingYearStart: '',
    logoUrl: '',
  });

  // Get user's organization
  const { data: orgData, isLoading } = useQuery(
    ['admin-organization'],
    async () => {
      if (!user?.organizationId) return null;
      const response = await organizationService.getById(user.organizationId);
      return response.data.data;
    },
    { enabled: !!user?.organizationId }
  );

  useEffect(() => {
    if (orgData) {
      setFormData({
        name: orgData.name || '',
        email: orgData.email || '',
        mobile: orgData.mobile || '',
        address: orgData.address || '',
        gst: orgData.gst || '',
        pan: orgData.pan || '',
        cin: orgData.cin || '',
        accountingYearStart: orgData.accountingYearStart || '',
        logoUrl: orgData.logoUrl || '',
      });
    }
  }, [orgData]);

  const updateMutation = useMutation(
    (data: any) => organizationService.update(user?.organizationId!, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-organization');
        alert('Organization details updated successfully!');
      },
      onError: (error: any) => {
        alert(`Error: ${error.response?.data?.error || error.message}`);
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // TODO: Implement file upload to backend
      // For now, just update the state
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-text-muted">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <main className="flex-1 overflow-y-auto p-6 md:p-8 pb-20 scroll-smooth">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-text-main tracking-tight mb-2">
                Entity Master Data
              </h1>
              <p className="text-text-muted text-sm">
                Manage organization details, statutory information, and system defaults.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-sm transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={updateMutation.isLoading}
                className="bg-primary hover:bg-primary-700 text-white font-semibold py-2.5 px-6 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">save</span>
                <span>{updateMutation.isLoading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            {/* Organization Details */}
            <div className="p-6 md:p-8 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">business</span>
                Organization Details
              </h2>
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/3 flex flex-col gap-2">
                  <label className="block text-sm font-medium text-slate-700">Company Logo</label>
                  <div className="flex-1 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-primary/50 transition-all cursor-pointer flex flex-col items-center justify-center p-6 text-center min-h-[220px] group relative overflow-hidden">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Company Logo"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <>
                        <div className="size-14 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 group-hover:border-primary/30 transition-all relative z-10">
                          <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-3xl">
                            cloud_upload
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 relative z-10">Click to upload logo</p>
                        <p className="text-xs text-slate-500 mt-1 relative z-10">SVG, PNG, JPG (Max 2MB)</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="w-full md:w-2/3 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="orgName">
                      Organization Name
                    </label>
                    <input
                      id="orgName"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border-slate-200 bg-slate-50/30 text-slate-900 text-sm focus:border-primary focus:ring-primary py-2.5 px-3 transition-shadow"
                      placeholder="e.g. Acme Corporation Pvt Ltd"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="orgEmail">
                        Email Address
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                          mail
                        </span>
                        <input
                          id="orgEmail"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full rounded-lg border-slate-200 bg-slate-50/30 text-slate-900 text-sm focus:border-primary focus:ring-primary py-2.5 pl-10 pr-3 transition-shadow"
                          placeholder="admin@company.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="orgMobile">
                        Mobile Number
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                          phone
                        </span>
                        <input
                          id="orgMobile"
                          type="tel"
                          value={formData.mobile}
                          onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                          className="w-full rounded-lg border-slate-200 bg-slate-50/30 text-slate-900 text-sm focus:border-primary focus:ring-primary py-2.5 pl-10 pr-3 transition-shadow"
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="orgAddress">
                      Registered Address
                    </label>
                    <textarea
                      id="orgAddress"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full rounded-lg border-slate-200 bg-slate-50/30 text-slate-900 text-sm focus:border-primary focus:ring-primary py-2.5 px-3 transition-shadow resize-none"
                      placeholder="Enter full office address including zip code..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Statutory Details */}
            <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/30">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">gavel</span>
                Statutory Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="gstNo">
                    GST Number
                  </label>
                  <input
                    id="gstNo"
                    type="text"
                    value={formData.gst}
                    onChange={(e) => setFormData({ ...formData, gst: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border-slate-200 bg-white text-slate-900 text-sm focus:border-primary focus:ring-primary py-2.5 px-3 uppercase font-mono tracking-wide placeholder:normal-case placeholder:font-sans placeholder:tracking-normal"
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="panNo">
                    PAN Number
                  </label>
                  <input
                    id="panNo"
                    type="text"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border-slate-200 bg-white text-slate-900 text-sm focus:border-primary focus:ring-primary py-2.5 px-3 uppercase font-mono tracking-wide placeholder:normal-case placeholder:font-sans placeholder:tracking-normal"
                    placeholder="ABCDE1234F"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="cinNo">
                    CIN Number
                  </label>
                  <input
                    id="cinNo"
                    type="text"
                    value={formData.cin}
                    onChange={(e) => setFormData({ ...formData, cin: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border-slate-200 bg-white text-slate-900 text-sm focus:border-primary focus:ring-primary py-2.5 px-3 uppercase font-mono tracking-wide placeholder:normal-case placeholder:font-sans placeholder:tracking-normal"
                    placeholder="L12345MH2023PLC123456"
                  />
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div className="p-6 md:p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">settings_applications</span>
                Configuration
              </h2>
              <div className="max-w-md">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Accounting Year</label>
                <div className="relative">
                  <select
                    value={formData.accountingYearStart}
                    onChange={(e) => setFormData({ ...formData, accountingYearStart: e.target.value })}
                    className="w-full rounded-lg border-slate-200 bg-slate-50/30 text-slate-900 text-sm focus:border-primary focus:ring-primary py-2.5 pl-3 pr-10 appearance-none cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <option value="">Select accounting year</option>
                    <option value="2024-04-01">April 2024 - March 2025</option>
                    <option value="2023-04-01">April 2023 - March 2024</option>
                    <option value="2022-04-01">April 2022 - March 2023</option>
                    <option value="2021-04-01">April 2021 - March 2022</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-xl">
                    expand_more
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">info</span>
                  This setting defines the default fiscal year for all financial reports.
                </p>
              </div>
            </div>
          </form>
        </div>
      </main>
    </AdminLayout>
  );
};

