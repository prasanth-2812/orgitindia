import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
// import { BottomNav } from './components/shared'; // Not used in super admin routes
import { MobileNumberRegistration } from './screens/auth/MobileNumberRegistration';
import { Login } from './screens/auth/Login';
import { OTPVerification } from './screens/auth/OTPVerification';
import { UserProfileCreation } from './screens/auth/UserProfileCreation';
import { EmployeeDashboard } from './screens/dashboard/EmployeeDashboard';
import { MainMessagingScreen } from './screens/messaging/MainMessagingScreen';
import { NewChatScreen } from './screens/messaging/NewChatScreen';
import { DirectChatConversation } from './screens/messaging/DirectChatConversation';
import { TaskCreationScreen } from './screens/tasks/TaskCreationScreen';
import { TaskListManagement } from './screens/tasks/TaskListManagement';
import { TaskDetailsScreen } from './screens/tasks/TaskDetailsScreen';
import { DocumentManagementHome } from './screens/documents/DocumentManagementHome';
import { DocumentLibrary } from './screens/admin/documents/DocumentLibrary';
import { CreateDocument } from './screens/admin/documents/CreateDocument';
import { DocumentViewer } from './screens/admin/documents/DocumentViewer';
import { ComplianceManagementHome } from './screens/compliance/ComplianceManagementHome';
import { AdminSettings } from './screens/settings/AdminSettings';
import { Dashboard as SuperAdminDashboard } from './screens/super-admin/Dashboard';
import { OrganizationList } from './screens/super-admin/organizations/OrganizationList';
import { OrganizationDetail } from './screens/super-admin/organizations/OrganizationDetail';
import { OrganizationForm } from './screens/super-admin/organizations/OrganizationForm';
import { DocumentTemplateList } from './screens/super-admin/document-templates/DocumentTemplateList';
import { DocumentTemplateForm } from './screens/super-admin/document-templates/DocumentTemplateForm';
import { DocumentInstanceList } from './screens/super-admin/document-instances/DocumentInstanceList';
import { DocumentInstanceViewer } from './screens/super-admin/document-instances/DocumentInstanceViewer';
import { ComplianceList } from './screens/super-admin/compliance/ComplianceList';
import { ComplianceForm } from './screens/super-admin/compliance/ComplianceForm';
import { TaskMonitoring } from './screens/super-admin/tasks/TaskMonitoring';
import { TestSuperAdmin } from './screens/super-admin/TestSuperAdmin';
import { UserList } from './screens/super-admin/users/UserList';
import { PlatformSettings } from './screens/super-admin/settings/PlatformSettings';
import { AdminDashboard } from './screens/admin/Dashboard';
import { EntityMasterData } from './screens/admin/EntityMasterData';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect admin users to admin dashboard
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Redirect super_admin users to super admin dashboard
  if (user?.role === 'super_admin') {
    return <Navigate to="/super-admin" replace />;
  }

  return <>{children}</>;
};

const SuperAdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AdminOrSuperAdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'super_admin' && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<MobileNumberRegistration />} />
            <Route path="/otp-verification" element={<OTPVerification />} />
            <Route path="/profile-setup" element={<UserProfileCreation />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <EmployeeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <MainMessagingScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages/new"
              element={
                <ProtectedRoute>
                  <NewChatScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages/:receiverId"
              element={
                <ProtectedRoute>
                  <DirectChatConversation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <TaskListManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks/create"
              element={
                <ProtectedRoute>
                  <TaskCreationScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks/:taskId"
              element={
                <ProtectedRoute>
                  <TaskDetailsScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <DocumentManagementHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/compliance"
              element={
                <ProtectedRoute>
                  <ComplianceManagementHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
            {/* Super Admin Routes */}
            {/* Test route - remove after debugging */}
            <Route
              path="/super-admin-test"
              element={<TestSuperAdmin />}
            />
            <Route
              path="/super-admin"
              element={
                <SuperAdminProtectedRoute>
                  <SuperAdminDashboard />
                </SuperAdminProtectedRoute>
              }
            />
            <Route
              path="/super-admin/organizations"
              element={
                <SuperAdminProtectedRoute>
                  <OrganizationList />
                </SuperAdminProtectedRoute>
              }
            />
            <Route
              path="/super-admin/users"
              element={
                <SuperAdminProtectedRoute>
                  <UserList />
                </SuperAdminProtectedRoute>
              }
            />
            <Route
              path="/super-admin/organizations/create"
              element={
                <SuperAdminProtectedRoute>
                  <OrganizationForm />
                </SuperAdminProtectedRoute>
              }
            />
            <Route
              path="/super-admin/organizations/:id"
              element={
                <SuperAdminProtectedRoute>
                  <OrganizationDetail />
                </SuperAdminProtectedRoute>
              }
            />
            <Route
              path="/super-admin/organizations/:id/edit"
              element={
                <SuperAdminProtectedRoute>
                  <OrganizationForm />
                </SuperAdminProtectedRoute>
              }
            />
            <Route
              path="/super-admin/document-templates"
              element={
                <SuperAdminProtectedRoute>
                  <DocumentTemplateList />
                </SuperAdminProtectedRoute>
              }
            />
            <Route
              path="/super-admin/document-templates/create"
              element={
                <SuperAdminProtectedRoute>
                  <DocumentTemplateForm />
                </SuperAdminProtectedRoute>
              }
            />
            <Route
              path="/super-admin/document-templates/:id"
              element={
                <SuperAdminProtectedRoute>
                  <DocumentTemplateForm />
                </SuperAdminProtectedRoute>
              }
            />
            <Route
              path="/super-admin/document-instances"
              element={
                <SuperAdminProtectedRoute>
                  <DocumentInstanceList />
                </SuperAdminProtectedRoute>
              }
            />
            <Route
              path="/super-admin/document-instances/:id"
              element={
                <SuperAdminProtectedRoute>
                  <DocumentInstanceViewer />
                </SuperAdminProtectedRoute>
              }
            />
            <Route
              path="/super-admin/compliance"
              element={
                <AdminOrSuperAdminProtectedRoute>
                  <ComplianceList />
                </AdminOrSuperAdminProtectedRoute>
              }
            />
            <Route
              path="/super-admin/compliance/create"
              element={
                <AdminOrSuperAdminProtectedRoute>
                  <ComplianceForm />
                </AdminOrSuperAdminProtectedRoute>
              }
            />
            <Route
              path="/super-admin/compliance/:id"
              element={
                <AdminOrSuperAdminProtectedRoute>
                  <ComplianceForm />
                </AdminOrSuperAdminProtectedRoute>
              }
            />
            <Route
              path="/super-admin/compliance/:id/edit"
              element={
                <AdminOrSuperAdminProtectedRoute>
                  <ComplianceForm />
                </AdminOrSuperAdminProtectedRoute>
              }
            />
            <Route
              path="/super-admin/tasks"
              element={
                <SuperAdminProtectedRoute>
                  <TaskMonitoring />
                </SuperAdminProtectedRoute>
              }
            />
            <Route
              path="/super-admin/settings"
              element={
                <SuperAdminProtectedRoute>
                  <PlatformSettings />
                </SuperAdminProtectedRoute>
              }
            />
            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/tasks"
              element={
                <AdminProtectedRoute>
                  <TaskListManagement />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/tasks/create"
              element={
                <AdminProtectedRoute>
                  <TaskCreationScreen />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/tasks/:taskId"
              element={
                <AdminProtectedRoute>
                  <TaskDetailsScreen />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/documents"
              element={
                <AdminProtectedRoute>
                  <DocumentLibrary />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/documents/create"
              element={
                <AdminProtectedRoute>
                  <CreateDocument />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/documents/create/:templateId"
              element={
                <AdminProtectedRoute>
                  <CreateDocument />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/documents/:id"
              element={
                <AdminProtectedRoute>
                  <DocumentViewer />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/compliance"
              element={
                <AdminProtectedRoute>
                  <ComplianceManagementHome />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminProtectedRoute>
                  <UserList />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/entity-master"
              element={
                <AdminProtectedRoute>
                  <EntityMasterData />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/configuration/notifications"
              element={
                <AdminProtectedRoute>
                  <AdminSettings />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/configuration/auto-escalation"
              element={
                <AdminProtectedRoute>
                  <AdminSettings />
                </AdminProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
