import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { BottomNav, TopAppBar, Avatar } from '../../components/shared';
import { chatUserService } from '../../services/chatUserService';
import { User } from '../../../shared/src/types';

export const NewChatScreen: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const { data, isFetching } = useQuery(
    ['chat-users', query],
    () => chatUserService.searchUsers(query),
    {
      enabled: query.trim().length > 0,
    }
  );

  const users: User[] = data?.data || [];

  const handleSelectUser = (userId: string) => {
    navigate(`/messages/${userId}`);
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden pb-24 bg-background-light dark:bg-background-dark font-display">
      <TopAppBar title="New Chat" onBack={() => navigate(-1)} />

      <div className="p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-main-light dark:text-text-main-dark mb-2">
            Search by name or mobile number
          </label>
          <div className="flex w-full items-stretch rounded-xl h-12 shadow-sm bg-surface-light dark:bg-surface-dark">
            <div className="flex items-center justify-center px-3 text-text-sub-light dark:text-text-sub-dark">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                search
              </span>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter name or mobile number (e.g. 9876543210)"
              className="flex-1 bg-transparent border-0 focus:outline-none text-text-main-light dark:text-text-main-dark placeholder:text-text-sub-light/70 px-2"
            />
          </div>
          {isFetching && (
            <p className="text-xs text-text-sub-light mt={2}">Searching...</p>
          )}
        </div>

        <div className="mt-2 space-y-2">
          {users.length === 0 && query && !isFetching && (
            <p className="text-sm text-text-sub-light">
              No users found for &quot;{query}&quot;. Make sure the number is registered in ORGIT.
            </p>
          )}

          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user.id)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-surface-light dark:hover:bg-surface-dark text-left transition-colors border border-transparent hover:border-border-light"
            >
              <Avatar size="md" src={user.profilePhotoUrl} />
              <div className="flex flex-col">
                <span className="font-medium text-text-main-light dark:text-text-main-dark">
                  {user.name || user.mobile}
                </span>
                <span className="text-xs text-text-sub-light dark:text-text-sub-dark">
                  {user.mobile} {user.role ? `• ${user.role}` : ''}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

