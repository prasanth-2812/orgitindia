import React from 'react';
import { BottomNav } from '../../components/shared';

export const DocumentManagementHome: React.FC = () => {
  return (
    <div className="pb-24 min-h-screen bg-background-light dark:bg-background-dark">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-text-main dark:text-white">Document Management</h1>
        <p className="text-text-muted dark:text-white/60 mt-2">Manage your documents here</p>
      </div>
      <BottomNav />
    </div>
  );
};

