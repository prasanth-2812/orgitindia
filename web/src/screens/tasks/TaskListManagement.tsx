import React from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { BottomNav, TaskCard } from '../../components/shared';
import { taskService } from '../../services/taskService';

export const TaskListManagement: React.FC = () => {
  const navigate = useNavigate();
  
  const { data: tasksData } = useQuery('tasks', () => taskService.getTasks());

  return (
    <div className="pb-24 min-h-screen bg-background-light dark:bg-background-dark">
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold text-text-main dark:text-white">My Tasks</h1>
        {tasksData?.data?.map((task: any) => (
          <TaskCard
            key={task.id}
            {...task}
            onClick={() => navigate(`/tasks/${task.id}`)}
          />
        ))}
      </div>
      <BottomNav />
    </div>
  );
};

