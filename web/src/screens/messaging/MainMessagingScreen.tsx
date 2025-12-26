import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { BottomNav, Avatar } from '../../components/shared';
import { groupService } from '../../services/groupService';
import { useAuth } from '../../context/AuthContext';

type FilterType = 'All' | 'Direct' | 'Task Groups';

export const MainMessagingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: groupsData } = useQuery('user-groups', () => groupService.getUserGroups());
  const conversationGroups = groupsData?.data || [];

  // Mock data for visual fidelity based on HTML design
  const priorityTasks = [
    {
      id: 'p1',
      title: 'Q3 Compliance Audit',
      time: '10:42 AM',
      status: 'URGENT',
      message: 'Please upload the safety doc ASAP...',
      count: 3,
      type: 'task',
      icon: 'assignment'
    },
    {
      id: 'p2',
      title: 'Inventory Check - Zone B',
      time: 'Yesterday',
      status: '',
      message: 'Bob: Count is finished for aisle 4.',
      type: 'inventory',
      icon: 'inventory_2'
    }
  ];

  const recentMessages = [
    {
      id: 'm1',
      name: 'Sarah Jenkins (HR)',
      time: '10:45 AM',
      message: 'Your leave request is approved.',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD80gnqu5ArY1Ilub2C7pQQBntoFlWa3Cn3O8qjKoCEwdz6N1nzE_GYgj74LXPDSUPXLU4SJMCNCC0Y-YcgH0IpHTqVC6o5ZoDP1h495lTjJ5cYKvSnoHWG_nZrB_oKgwmQg2cQtw2izFF55QtuiYjqOi2ZZpJ8_rpKS-rHKdUXo-GfWJrGSVtQONjdAZCAOtuwDXNJ4rmhTfp3LGgD6uxLGh7qxWN7VyNyLy5Pw80Y8PTnMlV3mrRQOIKlacNNpLAVZ9JwDgswu8eq',
      online: true,
      status: 'online'
    },
    {
      id: 'm2',
      name: 'Mike Ross',
      time: 'Tue',
      message: 'Can we meet at 3pm to discuss?',
      read: true,
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBw7a_0pieXBlrzjYYg8qYg9NIM6kFUM5t-hGmpYSDIgaa1wvduePkKQqn7AHXMt2MYI6XFeOW9DVNkm5Kx8GHHDCV4FTENYrAdiAzp3KPc3DaELhh2qh6crWgwlbfsTsZlJS3gxYX43DjOy3_Okw-qBqjr0kmrb4i8jgSY7DSiwFUDkTqSEoW0bIxDl05dZK_Axm4DULgn9vox6G9esoTttck-E_UpuYzccI9zJfKCfn5KhcaZEeSm9SDvX6mysMOnvH6_2sf7F21Z',
    },
    {
      id: 'm3',
      name: 'Alex Chen',
      time: 'Mon',
      message: 'Sent an attachment.',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJ34RN5JldXWRDnBQnhQ_0nTW--2ysbB3_ra-zyTNW6YSwcvGFgbpuFuYUdurhIsamEcXb2Fm8kd2QeggewtMqweKsWuhTuIc4Vb5co0XS-oBIWP8scrbO3lHaxPjFXZpUDNbMVTQDiIOiBzsBKJ_NhDr3qjg1nErsLN9H61N6qix-H0lunNKcSrOaFoP0rMydy4OJzt__MwT6XPjr7Qw0UjYG9n9M0P90fyCGpWqbV3SOybRkR04uGYjVW2li6aCVKYatqITAQ4G2',
    },
    {
      id: 'm4',
      name: 'Safety Committee',
      time: 'Sun',
      message: 'Weekly sync is cancelled.',
      type: 'group',
      avatar: '',
      icon: 'groups'
    }
  ];

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden pb-24 bg-background-light dark:bg-background-dark font-display antialiased transition-colors duration-200">
      {/* Header */}
      <div className="sticky top-0 z-10 flex flex-col gap-2 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 pt-4 pb-2">
        <div className="flex items-center h-12 justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar src={user?.profilePhotoUrl} size="md" />
            </div>
          </div>
          <div className="flex items-center justify-end">
            <button
              onClick={() => navigate('/messages/new')}
              className="flex items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>
                edit_square
              </span>
            </button>
          </div>
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
            <label key={filterType} className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 transition-all duration-200 ${filter === filterType ? 'bg-primary shadow-sm text-white' : 'hover:bg-background-light dark:hover:bg-background-dark/50 text-text-sub-light dark:text-text-sub-dark'
              }`}>
              <input
                checked={filter === filterType}
                onChange={() => setFilter(filterType)}
                className="hidden"
                name="filter-group"
                type="radio"
              />
              <span className="truncate text-sm font-medium">
                {filterType}
              </span>
            </label>
          ))}
        </div>
      </div>

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
            {priorityTasks.map(task => (
              <div key={task.id} className={`group relative flex items-center gap-4 ${task.status === 'URGENT' ? 'bg-surface-light dark:bg-surface-dark border-l-4 border-primary' : 'bg-background-light dark:bg-background-dark'} px-4 py-3 active:bg-primary/5 transition-colors cursor-pointer`} onClick={() => navigate(`/tasks/${task.id}`)}>
                <div className="relative shrink-0">
                  <div className={`bg-primary/10 flex items-center justify-center aspect-square rounded-xl size-14 shadow-sm`}>
                    <span className="material-symbols-outlined text-primary text-[28px]">{task.icon}</span>
                  </div>
                  {task.status === 'URGENT' && (
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-surface-dark rounded-full p-0.5">
                      <div className="bg-primary text-white rounded-full p-1 flex items-center justify-center size-5">
                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>assignment</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <p className="text-text-main-light dark:text-text-main-dark text-base font-bold leading-normal truncate">{task.title}</p>
                    <p className={`${task.status === 'URGENT' ? 'text-primary font-semibold' : 'text-text-sub-light dark:text-text-sub-dark font-normal'} text-xs shrink-0 ml-2`}>{task.time}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.status === 'URGENT' && <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-[10px] font-bold px-1.5 py-0.5 rounded">URGENT</span>}
                    <p className="text-text-sub-light dark:text-text-sub-dark text-sm font-normal leading-normal truncate">{task.message}</p>
                  </div>
                </div>
                {task.count && (
                  <div className="shrink-0 flex flex-col items-end justify-center gap-1">
                    <div className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-bold">{task.count}</div>
                  </div>
                )}
              </div>
            ))}
            <div className="h-px bg-gray-200 dark:bg-gray-800 mx-4 my-1"></div>
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

        {/* Combined Real + Mock Data Display */}
        {/* Ideally we would merge groupsData with mock data or just use groupsData, but for visual match we use mock array first then real */}
        {recentMessages.map((msg) => (
          <div key={msg.id} className="group flex items-center gap-4 bg-background-light dark:bg-background-dark px-4 py-3 active:bg-primary/5 transition-colors cursor-pointer" onClick={() => navigate(`/messages/${msg.id}`)}>
            <div className="relative shrink-0">
              {msg.icon ? (
                <div className="bg-primary/10 flex items-center justify-center aspect-square rounded-xl size-14 shadow-sm">
                  <span className="material-symbols-outlined text-primary text-[28px]">{msg.icon}</span>
                </div>
              ) : (
                <Avatar src={msg.avatar} alt={msg.name} size="md" online={msg.status === 'online'} />
              )}
            </div>
            <div className="flex flex-col justify-center flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <p className="text-text-main-light dark:text-text-main-dark text-base font-semibold leading-normal truncate">{msg.name}</p>
                <p className="text-text-sub-light dark:text-text-sub-dark text-xs font-normal shrink-0 ml-2">{msg.time}</p>
              </div>
              <div className="flex items-center gap-1 text-text-sub-light dark:text-text-sub-dark">
                {msg.read && <span className="material-symbols-outlined text-[16px]">done_all</span>}
                <p className={`text-sm ${msg.status === 'online' ? 'font-medium text-text-main-light dark:text-text-main-dark' : 'font-normal text-text-sub-light dark:text-text-sub-dark'} leading-normal truncate`}>{msg.message}</p>
              </div>
            </div>
            {msg.status === 'online' && (
              <div className="shrink-0 flex items-center justify-center">
                <div className="size-3 rounded-full bg-primary"></div>
              </div>
            )}
          </div>
        ))}

        {/* Render real data from backend if available and not redundant */}
        {conversationGroups.length > 0 && (
          <>
            <div className="px-4 py-2 mt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-text-sub-light dark:text-text-sub-dark">All Conversations</p>
            </div>
            {conversationGroups.map((group: any) => (
              <div key={group.id} className="group flex items-center gap-4 bg-background-light dark:bg-background-dark px-4 py-3 active:bg-primary/5 transition-colors cursor-pointer" onClick={() => navigate(`/messages/${group.id}`)}>
                <div className="relative shrink-0">
                  <Avatar src={group.photoUrl} alt={group.name} size="md" />
                </div>
                <div className="flex flex-col justify-center flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <p className="text-text-main-light dark:text-text-main-dark text-base font-semibold leading-normal truncate">{group.name || 'Group'}</p>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

      </div>

      <BottomNav />
    </div>
  );
};
