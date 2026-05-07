import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, ChevronDown, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { io, Socket } from "socket.io-client";

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
  // We can fetch names if needed, but for simplicity we rely on thread messages or we can join user table
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
    
    // Connect to websocket to listen for live chat
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("chat:new", (msg: ChatMessage) => {
      // If Admin and new thread, refresh threads
      if (profile.role === 'admin') {
        loadThreads();
      }

      setMessages((prev) => {
        // Prevent duplicate if we already optimistically added it
        if (prev.some(m => m.id === msg.id)) return prev;

        if (profile.role === 'admin') {
           if (msg.threadId === activeThreadIdRef.current) return [...prev, msg];
           return prev; // don't add to list if not active thread, unread will update from loadThreads
        } else {
           // Standard user
           if (msg.threadId === profile.uid) return [...prev, msg];
           return prev;
        }
      });

      // Show unread badge logic
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
  }, [profile]); // Removed activeThreadId and isOpen from deps to avoid reconnect loops

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
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => { setIsOpen(!isOpen); if (!isOpen && activeThreadId) markAsRead(activeThreadId); }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-50 hover:bg-indigo-700 transition-all"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
        {unreadTotal > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
            {unreadTotal}
          </span>
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-[350px] h-[500px] bg-surface/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-accent/10 flex items-center justify-between">
               <div>
                 <h3 className="text-sm font-bold text-white tracking-widest uppercase">
                   {profile.role === 'admin' ? (activeThreadId ? "Hỗ trợ Bí thư" : "Danh sách cần hỗ trợ") : "Hỗ trợ & Hỏi đáp"}
                 </h3>
                 <p className="text-[10px] text-white/50 uppercase tracking-widest mt-1">
                   {profile.role === 'admin' ? 'Đoàn trường Đại học Đà Lạt' : 'Trực tiếp với Admin Đại học Đà Lạt'}
                 </p>
               </div>
               {profile.role === 'admin' && activeThreadId && (
                 <button onClick={() => { setActiveThreadId(null); loadThreads(); }} className="p-1 hover:bg-white/10 rounded-md">
                   <ChevronDown size={18} className="text-white/60 rotate-90" />
                 </button>
               )}
            </div>

            {/* Admin Thread List View */}
            {profile.role === 'admin' && !activeThreadId && (
               <div className="flex-1 overflow-y-auto px-2 py-4 space-y-2 custom-scrollbar">
                 {threads.length === 0 ? (
                    <div className="text-center text-white/40 text-xs mt-10 uppercase tracking-widest">
                       Chưa có đoạn chat nào
                    </div>
                 ) : (
                    threads.map((t) => (
                      <div 
                         key={t.threadId}
                         onClick={() => { setActiveThreadId(t.threadId); loadMessages(t.threadId); }}
                         className="p-3 rounded-xl hover:bg-white/5 cursor-pointer flex justify-between items-center transition-colors group"
                      >
                         <div>
                            <p className="text-xs text-white font-bold mb-1">
                              UserID: {t.threadId.substring(0, 8)}...
                            </p>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">
                              Mới cập nhật
                            </p>
                         </div>
                         {t.unreadCount > 0 && (
                            <span className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                              {t.unreadCount}
                            </span>
                         )}
                      </div>
                    ))
                 )}
               </div>
            )}

            {/* Message Thread View */}
            {(!profile.role || profile.role !== 'admin' || activeThreadId) && (
               <>
                 <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                   {messages.map((m) => {
                     const isMe = m.senderId === profile.uid;
                     return (
                       <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1 px-1">
                             {isMe ? "Bạn" : m.senderName}
                          </div>
                          <div className={`
                             max-w-[85%] px-4 py-2.5 rounded-2xl text-sm
                             ${isMe ? 'bg-accent text-white rounded-br-sm' : 'bg-white/10 text-white rounded-bl-sm'}
                          `}>
                             {m.content}
                          </div>
                       </div>
                     )
                   })}
                   {messages.length === 0 && (
                     <div className="text-center text-white/40 text-[10px] uppercase font-bold tracking-widest mt-10">
                        Bắt đầu cuộc trò chuyện...
                     </div>
                   )}
                   <div ref={messagesEndRef} />
                 </div>

                 {/* Input form */}
                 <div className="p-3 border-t border-white/5 bg-black/20">
                   <div className="flex items-center gap-2">
                     <textarea
                       autoFocus
                       rows={1}
                       placeholder="Nhập tin nhắn..."
                       value={inputText}
                       onChange={(e) => setInputText(e.target.value)}
                       onKeyDown={(e) => {
                         if (e.key === "Enter" && !e.shiftKey) {
                           e.preventDefault();
                           handleSend();
                         }
                       }}
                       className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:ring-1 focus:ring-accent/50"
                     />
                     <button
                       onClick={handleSend}
                       disabled={!inputText.trim()}
                       className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center text-accent disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/40 transition-colors"
                     >
                       <Send size={18} className="translate-x-[-2px] translate-y-[2px]" />
                     </button>
                   </div>
                 </div>
               </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
