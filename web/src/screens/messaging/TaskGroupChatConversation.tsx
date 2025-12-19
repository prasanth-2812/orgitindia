import React from 'react';
import { useParams } from 'react-router-dom';
import { DirectChatConversation } from './DirectChatConversation';

// Task group chat uses the same component structure as direct chat
// but with group-specific features like visibility modes
export const TaskGroupChatConversation: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  
  // Reuse DirectChatConversation with group-specific modifications
  return <DirectChatConversation />;
};

