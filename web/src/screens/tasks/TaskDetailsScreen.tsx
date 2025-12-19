import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { TopAppBar, StatusBadge, Button } from '../../components/shared';
import { taskService } from '../../services/taskService';

export const TaskDetailsScreen: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const { data: taskData } = useQuery(
    ['task', taskId],
    () => taskService.getTask(taskId!),
    { enabled: !!taskId }
  );

  const task = taskData?.data;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <TopAppBar title="Task Details" onBack={() => navigate(-1)} />
      <div className="p-4 space-y-4">
        {task && (
          <>
            <h1 className="text-2xl font-bold">{task.title}</h1>
            <StatusBadge status={task.status} />
            <p>{task.description}</p>
            <Button onClick={() => navigate(`/tasks/${taskId}/accept`)}>Accept Task</Button>
          </>
        )}
      </div>
    </div>
  );
};

