import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Avatar, BottomNav } from '../../components/shared';
import { messageService } from '../../services/messageService';
import { getSocket, initSocket } from '../../services/socketService';
import { format } from 'date-fns';

export const DirectChatConversation: React.FC = () => {
  const { receiverId } = useParams<{ receiverId: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);

  const { data: messagesData, refetch } = useQuery(
    ['messages', receiverId],
    () => messageService.getMessages(receiverId, undefined, 50),
    { enabled: !!receiverId }
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      socketRef.current = initSocket(token);
      const socket = socketRef.current;

      socket.on('message:received', () => {
        refetch();
      });

      return () => {
        socket.off('message:received');
      };
    }
  }, [receiverId, refetch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData]);

  const handleSend = async () => {
    if (!message.trim() || !receiverId) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('message:send', {
        receiverId,
        messageType: 'text',
        content: message,
      });
      setMessage('');
      refetch();
    }
  };

  return (
    <div className="relative flex h-screen w-full flex-col mx-auto max-w-md bg-background-main shadow-2xl overflow-hidden border-x border-border-light/50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-surface/90 backdrop-blur-sm z-20 border-b border-border-light shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-text-muted hover:text-primary transition-colors p-1 -ml-2"
          >
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <Avatar size="md" online />
          <div className="flex flex-col">
            <h2 className="text-text-main text-base font-bold leading-tight">Chat</h2>
            <span className="text-text-muted text-xs font-medium">Online</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 text-text-muted hover:text-primary hover:bg-gray-100 transition-colors rounded-full">
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>videocam</span>
          </button>
          <button className="p-2 text-text-muted hover:text-primary hover:bg-gray-100 transition-colors rounded-full">
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>call</span>
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-4 bg-background-main">
        {messagesData?.data?.map((msg: any) => (
          <div
            key={msg.id}
            className={`flex items-end gap-3 ${
              msg.senderId === receiverId ? '' : 'justify-end'
            }`}
          >
            {msg.senderId === receiverId && <Avatar size="sm" />}
            <div className="flex flex-col gap-1 items-start max-w-[80%]">
              <div className="relative bg-bubble-incoming text-text-body px-4 py-3 rounded-2xl rounded-bl-none shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-border-light">
                <p className="text-[15px] font-normal leading-relaxed">{msg.content}</p>
                <span className="text-[10px] text-text-muted-light absolute bottom-1 right-3">
                  {format(new Date(msg.createdAt), 'h:mm a')}
                </span>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <div className="fixed bottom-24 left-0 w-full z-50 bg-surface dark:bg-surface-dark border-t border-gray-200 dark:border-gray-800 pb-safe">
        <div className="flex items-center gap-2 p-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-gray-300 dark:border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSend}
            className="bg-primary text-white rounded-full p-2 hover:bg-primary/90"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

