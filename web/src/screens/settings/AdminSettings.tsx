import React from 'react';
import { BottomNav, TopAppBar } from '../../components/shared';
import { useAuth } from '../../context/AuthContext';

export const AdminSettings: React.FC = () => {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <div className="pb-24 min-h-screen bg-background-light dark:bg-background-dark">
        <div className="p-4">
          <p className="text-red-500">Access denied. Admin only.</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="pb-24 min-h-screen bg-background-light dark:bg-background-dark">
      <TopAppBar title="Admin Settings" />
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold text-text-main dark:text-white">Organization Settings</h1>
        <p className="text-text-muted dark:text-white/60">Configure organization settings here</p>
      </div>
      <BottomNav />
    </div>
  );
};

