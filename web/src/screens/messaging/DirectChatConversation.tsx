import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { format } from 'date-fns';
import { messageService } from '../../services/messageService';
import { getSocket, initSocket } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import { BottomNav } from '../../components/shared';

export const DirectChatConversation: React.FC = () => {
  const { receiverId } = useParams<{ receiverId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);

  const { data: messagesData, refetch } = useQuery(
    ['messages', receiverId],
    () => messageService.getMessages(receiverId!, undefined, 50),
    { enabled: !!receiverId, refetchInterval: 5000 }
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && receiverId) {
      socketRef.current = initSocket(token);
      const socket = socketRef.current;

      socket.on('message:received', (newMsg: any) => {
        if (newMsg.conversation_id === receiverId || newMsg.sender_id === receiverId || newMsg.receiver_id === receiverId) {
          refetch();
        }
      });
      socket.on('message:sent', () => refetch());

      return () => {
        socket.off('message:received');
        socket.off('message:sent');
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
      // Optimistic update or wait for refetch
      setTimeout(refetch, 200);
    }
  };

  // Mock messages for UI demonstration (Voice, Location, File) if no real data
  const demoMessages = !messagesData?.data || messagesData.data.length === 0 ? [
    {
      id: 'demo1',
      senderId: receiverId,
      content: 'Hi John, could you please review the updated compliance guidelines for the new site?',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      type: 'text'
    },
    {
      id: 'demo2',
      senderId: user?.id,
      content: 'On it. Checking the data now.',
      createdAt: new Date(Date.now() - 3500000).toISOString(),
      type: 'text',
      status: 'read'
    },
    {
      id: 'demo3',
      senderId: receiverId,
      type: 'file',
      fileName: 'Compliance_v2_Final.pdf',
      fileSize: '2.4 MB',
      createdAt: new Date(Date.now() - 3400000).toISOString()
    },
    {
      id: 'demo4',
      senderId: user?.id,
      type: 'voice',
      duration: '0:14',
      createdAt: new Date(Date.now() - 3300000).toISOString(),
      status: 'read'
    },
    {
      id: 'demo5',
      senderId: user?.id,
      type: 'location',
      locationName: 'Sector 4 HQ',
      createdAt: new Date(Date.now() - 3200000).toISOString(),
      status: 'delivered'
    }
  ] : [];

  const displayMessages = messagesData?.data && messagesData.data.length > 0 ? messagesData.data.reverse() : demoMessages;


  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main dark:text-white font-display antialiased overflow-hidden flex flex-col h-screen w-full max-w-md mx-auto shadow-2xl border-x border-gray-200 dark:border-gray-800">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-surface-light/95 dark:bg-background-dark/95 backdrop-blur-sm z-20 border-b border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-primary transition-colors p-1 -ml-2 dark:text-gray-400">
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <div className="relative">
            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border border-gray-200 dark:border-gray-700 shadow-sm" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuACAKL7jY9aD3WJxqrfAWV-9LzMuC8LB4nReN1HFevF0g2U3suYf-npQuydilU_nMpYM1TG_yQTQXS7_6W035IVwjrLfCUf9wCmAKMf0cFyLYUNyKBvGLHG1B9AkCLTIkhkZGE_6A_1YZELXRLdBKNI4L5X2T58ghwq2VP4QB3XKfFHHrZgwVgxn8vWC1Zzd89jCIdmk-5J5MarVl79IAvTYVGvWCgQmJnFPVeq0WB4P5heouwW05xY3tK70gcqSp_IK5jgjEoNbtEb")' }}></div>
            <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
          </div>
          <div className="flex flex-col">
            <h2 className="text-gray-900 dark:text-white text-base font-bold leading-tight">Sarah Jenkins</h2>
            <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">Compliance Officer</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-full">
            <span className="material-symbols-outlined text-[24px]">videocam</span>
          </button>
          <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-full">
            <span className="material-symbols-outlined text-[24px]">call</span>
          </button>
          <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-full">
            <span className="material-symbols-outlined text-[24px]">info</span>
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-4 bg-[#f8f9fa] dark:bg-[#1c1022]" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(164, 19, 236, 0.04) 0%, transparent 60%)' }}>
        <div className="flex justify-center py-2">
          <span className="bg-gray-200/70 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-medium px-3 py-1 rounded-full shadow-sm">Today</span>
        </div>

        {displayMessages.map((msg: any) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div key={msg.id} className={`flex items-end gap-3 group ${isMe ? 'justify-end' : ''}`}>
              {!isMe && (
                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 shrink-0 mb-1 shadow-sm" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB338VIklIraDez8F2ERxr2IEVro1ZAriCMvGjISUgHbD6Bhqu1V4scDg6YftSla5043CUL3rTNYGmlYlLC2PLefZ3Aid6grOMKpAOi57DbMxXkTvdkrD7l_FoZ0OU_wPqYm_EHGzF2Kx6wtuh9_Yt2mmmtcVRsN8gHJBfV2W5e7KoaLdul7UjB7kL7sdZUfMPkmUL2DXhtu-pk-Yhhhrk2CiTSXGl1nDm0f8LodPqFr8MjHwY9qPsTWvDg6PlnAh_L788YCE873MOY")' }}></div>
              )}
              <div className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                {/* Text Message */}
                {(!msg.type || msg.type === 'text') && (
                  <div className={`relative px-4 py-3 rounded-2xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] border ${isMe ? 'bg-primary text-white rounded-br-none shadow-primary/20 border-transparent' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none border-gray-200 dark:border-gray-700'}`}>
                    <p className="text-[15px] font-normal leading-relaxed">{msg.content}</p>
                    <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? '' : 'absolute bottom-1 right-3'}`}>
                      <span className={`text-[10px] ${isMe ? 'text-white/80' : 'text-gray-400'}`}>{format(new Date(msg.createdAt), 'h:mm a')}</span>
                      {isMe && <span className="material-symbols-outlined text-white/90 text-[14px]">done_all</span>}
                    </div>
                  </div>
                )}

                {/* File Message */}
                {msg.type === 'file' && (
                  <div className={`bg-white dark:bg-gray-800 p-1 rounded-2xl ${isMe ? 'rounded-br-none' : 'rounded-bl-none'} shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-gray-200 dark:border-gray-700`}>
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                      <div className="size-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
                        <span className="material-symbols-outlined">picture_as_pdf</span>
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-gray-900 dark:text-white text-sm font-semibold truncate">{msg.fileName}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">{msg.fileSize} • PDF</p>
                      </div>
                      <button className="size-8 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center text-gray-700 dark:text-gray-200 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">download</span>
                      </button>
                    </div>
                    <div className="flex justify-between items-center px-2 pb-1 pt-1">
                      <span className="text-[10px] text-gray-400">{format(new Date(msg.createdAt), 'h:mm a')}</span>
                    </div>
                  </div>
                )}

                {/* Voice Message */}
                {msg.type === 'voice' && (
                  <div className={`bg-primary text-white p-3 rounded-2xl ${isMe ? 'rounded-br-none' : 'rounded-bl-none'} shadow-md shadow-primary/20 w-64`}>
                    <div className="flex items-center gap-3">
                      <button className="flex items-center justify-center size-8 bg-white text-primary rounded-full shrink-0 shadow-sm hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined fill-1">play_arrow</span>
                      </button>
                      <div className="flex-1 flex items-center gap-[2px] h-6 overflow-hidden opacity-90">
                        {[...Array(15)].map((_, i) => (
                          <div key={i} className={`w-1 bg-white/${i < 8 ? '100' : '50'} h-${Math.floor(Math.random() * 4) + 2} rounded-full`}></div>
                        ))}
                      </div>
                      <span className="text-xs font-medium tabular-nums text-white/90">{msg.duration}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-2">
                      <span className="material-symbols-outlined text-white/80 text-[14px]">done_all</span>
                    </div>
                  </div>
                )}

                {/* Location Message */}
                {msg.type === 'location' && (
                  <div className={`bg-primary p-1 rounded-2xl ${isMe ? 'rounded-br-none' : 'rounded-bl-none'} shadow-md shadow-primary/20 overflow-hidden`}>
                    <div className="relative w-full h-32 bg-gray-200 rounded-xl overflow-hidden mb-1 border border-white/10">
                      <div className="absolute inset-0 bg-cover bg-center opacity-80 mix-blend-overlay" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBZbJY2DH2jwiMoZTvo8mFFufNVOHL3-CpbN2qwMuAk30VLnDD4uC1n2vt_0hsxYY2d9ZFenU-7ULwnj0yTz22Xtq3WGPV2_Y34cXat-2v7gqDBIUDe-ncxeex1FJ2rr2QjQFzKlPdSUaNoHbRQa1hYNQq9cOSYAa94i8jre7vzRG2a3Ou_6g0MGy79oeur3j54ye8tjOvpmZAJlTCUW7HpHgoDq0mjEiCn6kbhHLO_gZEY_HMONjARzi8Cgs7M2c1IBHpCzS7kfe5q")' }}></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-primary/90 p-2 rounded-full shadow-lg border-2 border-white">
                          <span className="material-symbols-outlined text-white text-xl">location_on</span>
                        </div>
                      </div>
                    </div>
                    <div className="px-3 py-2 text-white">
                      <p className="text-sm font-semibold">{msg.locationName || 'Location'}</p>
                      <p className="text-xs opacity-90">Current location</p>
                    </div>
                    <div className="flex items-center justify-end gap-1 px-3 pb-2">
                      <span className="text-[10px] text-white/80">{format(new Date(msg.createdAt), 'h:mm a')}</span>
                      <span className="material-symbols-outlined text-white/80 text-[14px]">done</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* Footer */}
      <footer className="bg-surface-light/90 dark:bg-background-dark/90 backdrop-blur-md px-4 py-3 pb-6 border-t border-gray-200 dark:border-gray-800 z-20">
        <div className="flex items-end gap-3">
          <button className="text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors p-2 rounded-full mb-1">
            <span className="material-symbols-outlined text-[26px]">add_circle</span>
          </button>
          <div className="flex-1 bg-gray-100 dark:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 rounded-[24px] px-4 py-2 flex items-center gap-2 focus-within:bg-white dark:focus-within:bg-[#2d1b36] focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <input
              className="bg-transparent border-none text-gray-900 dark:text-white placeholder-gray-400 text-base w-full focus:ring-0 p-0 max-h-24 py-1"
              placeholder="Message..."
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="text-gray-400 hover:text-primary transition-colors p-1">
              <span className="material-symbols-outlined text-[20px]">sticky_note_2</span>
            </button>
          </div>
          <div className="flex gap-1 mb-1">
            <button className="text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors p-2 rounded-full">
              <span className="material-symbols-outlined text-[24px]">photo_camera</span>
            </button>
            <button onClick={handleSend} className="bg-primary hover:bg-primary-dark transition-colors text-white rounded-full size-10 flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95">
              <span className="material-symbols-outlined text-[20px] ml-0.5">{message.trim() ? 'send' : 'mic'}</span>
            </button>
          </div>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
};
