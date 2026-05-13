import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, ChevronDown, MessageCircle, Sparkles, User, ShieldCheck, Ghost } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { io, Socket } from "socket.io-client";
import { cn } from "../lib/utils";

interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  isRead: boolean;
  createdAt: number;
}

interface ChatThread {
  threadId: string;
  lastMessageAt: number;
  unreadCount: number;
}

export const ChatWidget = () => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const activeThreadIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    if (!profile) return;
    
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("chat:new", (msg: ChatMessage) => {
      if (profile.role === 'admin') {
        loadThreads();
      }

      setMessages((prev) => {
        if (prev.some(m => m.id === msg.id)) return prev;

        if (profile.role === 'admin') {
           if (msg.threadId === activeThreadIdRef.current) return [...prev, msg];
           return prev;
        } else {
           if (msg.threadId === profile.uid) return [...prev, msg];
           return prev;
        }
      });

      if (profile.role !== 'admin' && msg.senderRole === 'Admin') {
         setUnreadTotal(prev => prev + 1);
      }
    });

    newSocket.on("chat:read", ({ threadId, role }: { threadId: string, role: string }) => {
        if (profile.role === 'admin') loadThreads();
    });

    return () => {
      newSocket.close();
    };
  }, [profile]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadThreads();
    } else if (profile?.uid) {
      setActiveThreadId(profile.uid);
      loadMessages(profile.uid);
    }
  }, [profile]);

  useEffect(() => {
    if (activeThreadId && isOpen) {
       scrollToBottom();
       markAsRead(activeThreadId);
    }
  }, [messages, isOpen]);

  const loadThreads = async () => {
    try {
      const res = await fetch("/api/chat/threads");
      const data = await res.json();
      if (Array.isArray(data)) {
        setThreads(data);
        setUnreadTotal(data.reduce((acc, t) => acc + (t.unreadCount || 0), 0));
      } else {
        setThreads([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      const res = await fetch(`/api/chat/messages/${threadId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (threadId: string) => {
     if (!profile) return;
     try {
       await fetch(`/api/chat/read/${threadId}`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ role: profile.role })
       });
       if (profile.role === 'admin') loadThreads();
       else setUnreadTotal(0);
     } catch (e) {
       console.error(e);
     }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !profile) return;
    const tId = profile.role === 'admin' ? activeThreadId : profile.uid;
    if (!tId) return;

    const tempId = "temp-" + Date.now();
    const newMsg: ChatMessage = {
      id: tempId,
      threadId: tId,
      senderId: profile.uid,
      senderName: profile.fullName || (profile.role === 'admin' ? 'Đại học Đà Lạt' : 'Bí thư'),
      senderRole: profile.role === 'admin' ? 'Admin' : 'User',
      content: inputText.trim(),
      isRead: true,
      createdAt: Date.now()
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText("");

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMsg)
      });
      const data = await res.json();
      
      if (data.error) {
        console.error("Failed to save chat message to DB:", data.error);
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, content: m.content + " [Lỗi mạng]" } : m));
      } else {
        setMessages(prev => prev.map(m => m.id === tempId ? data : m));
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, content: m.content + " [Lỗi mạng]" } : m));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (!profile) return null;
  
  return (
    <>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => { setIsOpen(!isOpen); if (!isOpen && activeThreadId) markAsRead(activeThreadId); }}
        className={cn(
          "fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-[2rem] shadow-2xl flex items-center justify-center z-[100] transition-all duration-500",
          isOpen ? "bg-slate-900 text-white" : "bg-accent text-white"
        )}
      >
        <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full scale-150 opacity-50 group-hover:opacity-100 transition-opacity" />
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={24} className="sm:w-7 sm:h-7" strokeWidth={2.5} />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
              <MessageSquare size={24} className="sm:w-7 sm:h-7" strokeWidth={2.5} />
            </motion.div>
          )}
        </AnimatePresence>
        
        {unreadTotal > 0 && !isOpen && (
          <motion.span 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] sm:text-[10px] w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-lg sm:rounded-xl font-black shadow-lg shadow-red-500/40 border-2 border-white"
          >
            {unreadTotal}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 40, scale: 0.9, filter: "blur(10px)" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 top-0 sm:top-auto sm:inset-auto sm:bottom-28 sm:right-8 w-full sm:w-[400px] h-full sm:h-[600px] bg-white/95 backdrop-blur-3xl border-none sm:border sm:border-white/50 rounded-none sm:rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] z-[90] flex flex-col overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-accent/5 pointer-events-none" />
            
            <div className="p-4 sm:p-8 border-b border-slate-100 bg-white/50 flex items-center justify-between relative z-10">
               <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
                       <img 
                         src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/VNPT_Logo.svg/1200px-VNPT_Logo.svg.png" 
                         alt="VNPT Logo" 
                         className="w-full h-full object-contain"
                       />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-base font-black text-slate-900 tracking-tight truncate">
                        {profile.role === 'admin' ? (activeThreadId ? "Xử lý khách" : "Danh sách") : "Văn phòng Đoàn DLU"}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                         <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                         <span className="text-[8px] sm:text-[10px] text-slate-400 font-black uppercase tracking-widest truncate">
                           {profile.role === 'admin' ? 'Xử lý yêu cầu' : 'Trực tiếp 24/7'}
                         </span>
                      </div>
                    </div>
                 </div>
               </div>
               <div className="flex items-center gap-1 sm:gap-2 ml-2">
                 {profile.role === 'admin' && activeThreadId && (
                   <motion.button 
                     whileHover={{ scale: 1.1, x: -5 }}
                     onClick={() => { setActiveThreadId(null); loadThreads(); }} 
                     className="p-1.5 sm:p-3 bg-slate-50 hover:bg-slate-100 rounded-lg sm:rounded-2xl border border-slate-200 transition-colors"
                   >
                     <ChevronDown size={14} className="text-slate-600 rotate-90 sm:w-[18px] sm:h-[18px]" />
                   </motion.button>
                 )}
                 <button 
                   onClick={() => setIsOpen(false)}
                   className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                 >
                   <X size={20} className="sm:w-6 sm:h-6" />
                 </button>
               </div>
            </div>

            {profile.role === 'admin' && !activeThreadId && (
               <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 no-scrollbar relative z-10">
                 {threads.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-20">
                       <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[2.5rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-200">
                          <Ghost size={32} className="sm:w-10 sm:h-10" />
                       </div>
                       <div>
                         <p className="text-slate-900 font-black text-xs sm:text-sm uppercase tracking-widest">Sảnh chờ trống</p>
                         <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Chưa có yêu cầu hỗ trợ nào</p>
                       </div>
                    </div>
                 ) : (
                    threads.map((t, idx) => (
                      <motion.div 
                         initial={{ opacity: 0, x: -20 }}
                         animate={{ opacity: 1, x: 0 }}
                         transition={{ delay: idx * 0.05 }}
                         key={t.threadId}
                         onClick={() => { setActiveThreadId(t.threadId); loadMessages(t.threadId); }}
                         className="p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] bg-white hover:bg-slate-50 border border-slate-100 cursor-pointer flex justify-between items-center transition-all group hover:shadow-xl hover:shadow-slate-200/50"
                      >
                         <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs sm:text-sm">
                               {t.threadId.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                               <p className="text-xs sm:text-sm text-slate-900 font-black tracking-tight mb-0.5">
                                 Hồ sơ #{t.threadId.substring(0, 6)}...
                               </p>
                               <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-widest font-black">
                                 Hoạt động cách đây {Math.floor((Date.now() - t.lastMessageAt) / 60000)}p
                               </p>
                            </div>
                         </div>
                         {t.unreadCount > 0 && (
                            <span className="w-6 h-6 sm:w-7 sm:h-7 bg-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center text-[9px] sm:text-[10px] font-black text-white shadow-lg shadow-indigo-600/30">
                              {t.unreadCount}
                            </span>
                         )}
                      </motion.div>
                    ))
                 )}
               </div>
            )}

            {(!profile.role || profile.role !== 'admin' || activeThreadId) && (
               <>
                 <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6 no-scrollbar relative z-10 bg-slate-50/30">
                   {messages.map((m, idx) => {
                     const isMe = m.senderId === profile.uid;
                     return (
                       <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          key={m.id} 
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                       >
                          {!isMe && (
                            <div className="flex items-center gap-2 mb-2 px-1">
                               <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md sm:rounded-lg bg-slate-900 flex items-center justify-center text-white">
                                  {m.senderRole === 'Admin' ? <ShieldCheck size={8} className="sm:w-[10px] sm:h-[10px]" /> : <User size={8} className="sm:w-[10px] sm:h-[10px]" />}
                               </div>
                               <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase font-black tracking-widest">
                                 {m.senderName}
                               </span>
                            </div>
                          )}
                          <div className={cn(
                             "max-w-[90%] sm:max-w-[85%] px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl sm:rounded-[1.8rem] text-xs sm:text-[13px] leading-relaxed font-medium shadow-sm transition-all hover:shadow-md",
                             isMe 
                               ? 'bg-slate-900 text-white rounded-br-sm border border-slate-800' 
                               : 'bg-white text-slate-600 rounded-bl-sm border border-slate-100'
                          )}>
                             {m.content}
                          </div>
                       </motion.div>
                     )
                   })}
                   {messages.length === 0 && (
                     <div className="h-full flex flex-col items-center justify-center text-center gap-6 py-20">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[2rem] sm:rounded-[2.5rem] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                           <MessageCircle size={32} className="sm:w-10 sm:h-10" />
                        </div>
                        <div>
                          <p className="text-slate-900 font-black text-xs sm:text-sm uppercase tracking-widest">Sẵn sàng hỗ trợ</p>
                          <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 leading-relaxed">
                             Đừng ngần ngại đặt câu hỏi<br/>Về quy trình, hồ sơ hoặc kỹ thuật
                          </p>
                        </div>
                     </div>
                   )}
                   <div ref={messagesEndRef} />
                 </div>

                 <div className="p-4 sm:p-6 bg-white border-t border-slate-100 relative z-10 pb-[env(safe-area-inset-bottom,1.5rem)] sm:pb-6">
                   <div className="relative group">
                     <textarea
                       autoFocus
                       rows={1}
                       placeholder="Gửi yêu cầu hỗ trợ..."
                       value={inputText}
                       onChange={(e) => setInputText(e.target.value)}
                       onKeyDown={(e) => {
                         if (e.key === "Enter" && !e.shiftKey) {
                           e.preventDefault();
                           handleSend();
                         }
                       }}
                       className="w-full bg-slate-50 border border-slate-200 rounded-2xl sm:rounded-[2rem] pl-5 sm:pl-6 pr-14 sm:pr-16 py-3.5 sm:py-5 text-sm text-slate-900 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-accent/10 focus:bg-white focus:border-accent transition-all custom-scrollbar min-h-[48px] sm:min-h-[64px] max-h-[120px]"
                     />
                     <motion.button
                       whileHover={{ scale: 1.1, x: -2 }}
                       whileTap={{ scale: 0.9 }}
                       onClick={handleSend}
                       disabled={!inputText.trim()}
                       className="absolute right-1.5 top-1.5 sm:right-3 sm:top-3 w-9 h-9 sm:w-12 sm:h-12 bg-slate-900 text-accent rounded-xl sm:rounded-2xl flex items-center justify-center disabled:opacity-20 disabled:grayscale transition-all shadow-xl shadow-slate-900/10"
                     >
                       <Send size={15} strokeWidth={2.5} className="translate-x-[-1px] translate-y-[1px]" />
                     </motion.button>
                   </div>
                   <p className="text-[7px] sm:text-[9px] text-slate-300 text-center mt-3 sm:mt-4 font-bold uppercase tracking-[0.2em]">Core v2.5 • AI Shield Protected</p>
                 </div>
               </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
