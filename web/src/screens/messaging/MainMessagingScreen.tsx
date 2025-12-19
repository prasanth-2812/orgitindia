import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { BottomNav, ChatListItem } from '../../components/shared';
import { groupService } from '../../services/groupService';
import { messageService } from '../../services/messageService';

type FilterType = 'All' | 'Direct' | 'Task Groups';

export const MainMessagingScreen: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: groupsData } = useQuery('user-groups', () => groupService.getUserGroups());

  // Filter groups based on selected filter
  const filteredGroups = groupsData?.data?.filter((group: any) => {
    if (filter === 'Direct') return !group.isTaskGroup;
    if (filter === 'Task Groups') return group.isTaskGroup;
    return true;
  }) || [];

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden pb-24 bg-background-light dark:bg-background-dark font-display antialiased transition-colors duration-200">
      {/* Header */}
      <div className="sticky top-0 z-10 flex flex-col gap-2 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 pt-4 pb-2">
        <div className="flex items-center h-12 justify-between">
          <div className="flex items-center gap-3">
            {/* User avatar would go here */}
          </div>
          <button
            onClick={() => navigate('/messages/new')}
            className="flex items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>
              edit_square
            </span>
          </button>
        </div>
        <div className="flex justify-between items-end">
          <p className="text-text-main-light dark:text-text-main-dark tracking-tight text-[28px] font-bold leading-tight">
            Messages
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="flex w-full items-stretch rounded-xl h-12 shadow-sm bg-surface-light dark:bg-surface-dark transition-colors">
          <div className="flex items-center justify-center pl-4 text-text-sub-light dark:text-text-sub-dark">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              search
            </span>
          </div>
          <input
            className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl bg-transparent text-text-main-light dark:text-text-main-dark focus:outline-0 focus:ring-2 focus:ring-primary/50 border-none h-full placeholder:text-text-sub-light/70 dark:placeholder:text-text-sub-dark/70 px-3 text-base font-normal leading-normal"
            placeholder="Search chats or tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2">
        <div className="flex h-10 w-full items-center justify-center rounded-lg bg-surface-light dark:bg-surface-dark p-1 shadow-sm">
          {(['All', 'Direct', 'Task Groups'] as FilterType[]).map((filterType) => (
            <label key={filterType} className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 transition-all duration-200">
              <input
                checked={filter === filterType}
                onChange={() => setFilter(filterType)}
                className="invisible w-0 fixed"
                name="filter-group"
                type="radio"
                value={filterType}
              />
              <span
                className={`truncate text-sm font-medium ${
                  filter === filterType
                    ? 'bg-primary shadow-sm text-white'
                    : 'hover:bg-background-light dark:hover:bg-background-dark/50 text-text-sub-light dark:text-text-sub-dark'
                }`}
              >
                {filterType}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex flex-col mt-2 gap-1">
        {/* Priority & Tasks Section */}
        {filter === 'All' && (
          <>
            <div className="px-4 py-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">push_pin</span>
              <p className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
                Priority & Tasks
              </p>
            </div>
            {/* Pinned task groups would go here */}
          </>
        )}

        {/* Recent Messages Section */}
        <div className="px-4 py-2 mt-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-text-sub-light dark:text-text-sub-dark text-sm">
            {filter === 'Direct' ? 'person' : 'chat_bubble'}
          </span>
          <p className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">
            {filter === 'Direct' ? 'Direct Messages' : 'Recent Messages'}
          </p>
        </div>

        {/* Chat Items */}
        {filteredGroups.map((group: any) => (
          <ChatListItem
            key={group.id}
            id={group.id}
            name={group.name || 'Unnamed Group'}
            lastMessage=""
            avatarUrl={group.photoUrl}
            isGroup={!group.isTaskGroup}
            isTaskGroup={group.isTaskGroup}
            onClick={() => navigate(`/messages/${group.id}`)}
          />
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

