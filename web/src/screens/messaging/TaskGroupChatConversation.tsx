import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { format } from 'date-fns';
import { messageService } from '../../services/messageService';
import { getSocket, initSocket } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import { BottomNav } from '../../components/shared';

export const TaskGroupChatConversation: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);

  // Fetch messages using groupId
  const { data: messagesData, refetch } = useQuery(
    ['messages', 'group', groupId],
    () => messageService.getMessages(undefined, groupId!, 50),
    { enabled: !!groupId, refetchInterval: 5000 }
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && groupId) {
      socketRef.current = initSocket(token);
      const socket = socketRef.current;

      socket.on('message:received', (newMsg: any) => {
        if (newMsg.group_id === groupId || newMsg.conversation_id === groupId) {
          refetch();
        }
      });
      socket.on('message:sent', () => refetch());

      return () => {
        socket.off('message:received');
        socket.off('message:sent');
      };
    }
  }, [groupId, refetch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData]);

  const handleSend = async () => {
    if (!message.trim() || !groupId) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('message:send', {
        groupId, // Send to group
        messageType: 'text',
        content: message,
      });
      setMessage('');
      setTimeout(refetch, 200);
    }
  };

  // Mock messages for UI demonstration to match design
  const demoMessages = !messagesData?.data || messagesData.data.length === 0 ? [
    {
      id: 'sys1',
      type: 'system',
      content: 'Task group auto-created by Admin',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'demo1',
      senderId: 'jane',
      senderName: 'Jane Doe',
      content: "I've uploaded the compliance docs for review. Please take a look when you can.",
      type: 'file', // Mixed content/file in design, simplifying to file or text+file
      fileName: 'compliance_v1.pdf',
      fileSize: '2.4 MB',
      createdAt: new Date(Date.now() - 3500000).toISOString(),
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDPgWEu67DEen4yJlEIms8-g8VW7J8RjXeNktrjj6JvdF4p_SeQbIOUakJsTfkZ7dZlswJVnChd9PwwjW7i7tzE63nVRP5XtiHyjJ39NPfP3v6GNXCyzvWvvtMdl0z4cI2kYow7J1h3zVJTH3SJl_o_9527ptd1D3HFWbtLUidFMajKwow6rtZkNvoZKS-Mz4wzYflYJUYL6HR9O7wWoUlocRdwWP0Fh5kQ3k_l2_8q22z-jmIF_Tb-3KLfWbgAAHleUBJHfmR9Fck-'
    },
    {
      id: 'demo2',
      senderId: user?.id,
      content: "Thanks Jane! I see them. I'll review and get back to you with comments shortly.",
      createdAt: new Date(Date.now() - 3400000).toISOString(),
      type: 'text',
      status: 'read'
    },
    {
      id: 'demo3',
      senderId: 'alex',
      senderName: 'Alex Smith',
      content: 'I just updated the task status on the dashboard as well.',
      createdAt: new Date(Date.now() - 3300000).toISOString(),
      type: 'text',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAP8-IL2-d-FyWSYEDQOIwinAH9LYef5-R7WFfm93koCXg19pvygWRWuVAVqMSvv-QCzmQ_q9JX9lOryZkvoCSaSv2dYBJHAjWIR67njKWuN5AgOpkjHmdep-6rgUIRkrPj2KViqufWcWEwvXR3eFBz0pYIMHiIHNMSHxMDnE1Fvrr_9GKx9MRa2A4cR7k9KCeEltJ2Lv0xeLHpp8ti-fFi09FYwKvwpETN2OifePyQrzQif15WuaNraGO3rlcg6BKDRjC_AKvKg-Sm',
      reactions: [
        { emoji: '👍', count: 2 },
        { emoji: '❤️', count: 1 }
      ]
    }
  ] : [];

  const displayMessages = messagesData?.data && messagesData.data.length > 0 ? messagesData.data.reverse() : demoMessages;

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#170d1b] dark:text-[#f5f0f7] font-display antialiased overflow-hidden h-screen flex flex-col w-full max-w-md mx-auto shadow-2xl border-x border-gray-200 dark:border-gray-800">
      {/* Header Section */}
      <header className="shrink-0 bg-surface-light dark:bg-surface-dark border-b border-gray-200 dark:border-gray-800 z-10 transition-colors duration-300">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <div className="flex flex-col items-center flex-1 mx-2">
            <h1 className="text-base font-bold leading-tight text-center truncate max-w-[200px] sm:max-w-xs text-gray-900 dark:text-white">
              Task #402: Q3 Compliance
            </h1>
            <span className="text-xs text-primary font-medium mt-0.5">Project Alpha Launch</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300">
              <span className="material-symbols-outlined text-[24px]">search</span>
            </button>
            <button className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300">
              <span className="material-symbols-outlined text-[24px]">info</span>
            </button>
          </div>
        </div>

        {/* Task Metadata Chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar items-center">
          <div className="flex h-7 shrink-0 items-center justify-center gap-x-1.5 rounded-md bg-primary/10 dark:bg-primary/20 px-3 border border-primary/20">
            <div className="size-2 rounded-full bg-primary animate-pulse"></div>
            <p className="text-primary dark:text-primary-light text-xs font-bold leading-normal">In Progress</p>
          </div>
          <div className="flex h-7 shrink-0 items-center justify-center gap-x-1.5 rounded-md bg-orange-100 dark:bg-orange-900/30 px-3 border border-orange-200 dark:border-orange-800">
            <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-[16px]">priority_high</span>
            <p className="text-orange-700 dark:text-orange-300 text-xs font-bold leading-normal">High Priority</p>
          </div>
          <div className="flex h-7 shrink-0 items-center justify-center gap-x-1.5 rounded-md bg-gray-100 dark:bg-gray-800 px-3">
            <span className="material-symbols-outlined text-gray-500 text-[16px]">calendar_today</span>
            <p className="text-gray-600 dark:text-gray-300 text-xs font-medium leading-normal">Due Oct 24</p>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto w-full p-4 space-y-6 bg-background-light dark:bg-background-dark">
        {displayMessages.map((msg: any) => {
          const isMe = msg.senderId === user?.id;

          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="flex justify-center w-full">
                <div className="bg-gray-200 dark:bg-gray-800 rounded-full px-4 py-1.5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-500 text-[16px]">smart_toy</span>
                  <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">{msg.content}</p>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex items-end gap-3 group ${isMe ? 'justify-end' : ''}`}>
              {!isMe && (
                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 shrink-0 shadow-sm" style={{ backgroundImage: `url('${msg.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuDPgWEu67DEen4yJlEIms8-g8VW7J8RjXeNktrjj6JvdF4p_SeQbIOUakJsTfkZ7dZlswJVnChd9PwwjW7i7tzE63nVRP5XtiHyjJ39NPfP3v6GNXCyzvWvvtMdl0z4cI2kYow7J1h3zVJTH3SJl_o_9527ptd1D3HFWbtLUidFMajKwow6rtZkNvoZKS-Mz4wzYflYJUYL6HR9O7wWoUlocRdwWP0Fh5kQ3k_l2_8q22z-jmIF_Tb-3KLfWbgAAHleUBJHfmR9Fck-"}')` }}></div>
              )}
              <div className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[70%]`}>
                {!isMe && <p className="text-gray-500 dark:text-gray-400 text-[11px] font-medium ml-1">{msg.senderName || 'User'}</p>}

                <div className={`relative ${isMe ? 'bg-primary text-white rounded-tr-none shadow-md' : 'bg-surface-light dark:bg-surface-dark rounded-tl-none shadow-sm border border-gray-100 dark:border-gray-700'} rounded-2xl p-3`}>
                  <p className={`text-sm font-normal leading-relaxed ${isMe ? '' : 'text-[#170d1b] dark:text-gray-100'}`}>
                    {msg.content}
                  </p>

                  {/* Mock Attachment for demo */}
                  {msg.fileName && (
                    <div className={`mt-3 flex items-center gap-3 rounded-lg ${isMe ? 'bg-white/10 border-white/20' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'} p-2.5 border`}>
                      <div className="flex items-center justify-center size-10 rounded bg-red-100 dark:bg-red-900/30 shrink-0">
                        <span className="material-symbols-outlined text-red-600 dark:text-red-400">picture_as_pdf</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isMe ? 'text-white' : 'text-[#170d1b] dark:text-white'}`}>{msg.fileName}</p>
                        <p className={`${isMe ? 'text-white/80' : 'text-gray-500'} text-xs`}>{msg.fileSize}</p>
                      </div>
                      <button className={`${isMe ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-primary'} transition-colors`}>
                        <span className="material-symbols-outlined text-[20px]">download</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Reactions */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="flex gap-1 -mt-1 ml-2">
                    {msg.reactions.map((r: any, i: number) => (
                      <div key={i} className="flex items-center gap-1 bg-surface-light dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full px-1.5 py-0.5 shadow-sm">
                        <span className="text-xs">{r.emoji}</span>
                        <span className="text-[10px] font-bold text-primary">{r.count}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className={`flex items-center gap-1 ${isMe ? 'mr-1' : 'ml-1 mt-0.5'}`}>
                  <p className="text-gray-400 text-[10px]">{format(new Date(msg.createdAt), 'h:mm a')}</p>
                  {isMe && <span className="material-symbols-outlined text-[14px] text-primary">done_all</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* Footer */}
      <footer className="shrink-0 bg-surface-light dark:bg-surface-dark border-t border-gray-200 dark:border-gray-800 p-3 pb-8 sm:pb-3">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <button className="shrink-0 size-10 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span className="material-symbols-outlined text-[24px]">add_circle</span>
          </button>
          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center min-h-[44px] px-4 py-2 gap-2 border border-transparent focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
            <input
              className="flex-1 bg-transparent border-none outline-none text-sm text-[#170d1b] dark:text-white placeholder-gray-500 dark:placeholder-gray-400 p-0 focus:ring-0"
              placeholder="Message task group..."
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="shrink-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              <span className="material-symbols-outlined text-[20px]">sentiment_satisfied</span>
            </button>
          </div>
          <button onClick={handleSend} className="shrink-0 size-10 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[20px] ml-0.5">send</span>
          </button>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
};
