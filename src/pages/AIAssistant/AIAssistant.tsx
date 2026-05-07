import React, { useState, useEffect, useRef } from "react";
import { Bot, Send, User, ChevronRight, Loader2, Database } from "lucide-react";

export const AIAssistant = () => {
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "model", text: string }[]>([
    { role: "model", text: "Xin chào! Tôi là Trợ lý AI. Tôi đã được kết nối với cơ sở dữ liệu của hệ thống. Bạn có thể hỏi tôi bất kỳ thông tin nào về đoàn viên, chi đoàn hoặc các hoạt động." }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [dbContext, setDbContext] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch database context when component mounts
    const fetchContext = async () => {
      try {
        setIsInitializing(true);
        const [membersRes, unitsRes, activitiesRes] = await Promise.all([
          fetch("/api/members"),
          fetch("/api/units"),
          fetch("/api/activities")
        ]);
        const members = await membersRes.json();
        const units = await unitsRes.json();
        const activities = await activitiesRes.json();
        
        setDbContext({
          units: units,
          members: members,
          activities: activities
        });
      } catch (err) {
        console.error("Failed to fetch context:", err);
      } finally {
        setIsInitializing(false);
      }
    };
    fetchContext();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || isLoading || isInitializing) return;

    const userText = query.trim();
    setQuery("");
    
    const requestHistory = [...chatHistory];
    
    setChatHistory(prev => [...prev, { role: "user", text: userText }]);
    setIsLoading(true);

    try {
      const dbRes = await fetch("/api/assistant/chat", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ chatHistory: requestHistory, userText, dbContext })
      });
      let data;
      try {
         data = await dbRes.json();
      } catch (parseErr) {
         throw new Error("Lỗi từ server: " + dbRes.statusText);
      }
      
      if (!dbRes.ok) {
        throw new Error(data?.error || data?.text || "Lỗi Server");
      }
      
      setChatHistory(prev => [...prev, { role: "model", text: data.text || "Tôi không có câu trả lời cho vấn đề này." }]);
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      const errorMessage = err.message || "";
      if (
        errorMessage.includes("API key not valid") || 
        errorMessage.includes("API_KEY_INVALID") || 
        errorMessage.includes("API key should be set") ||
        errorMessage.includes("GEMINI_API_KEY is not configured") ||
        errorMessage.includes("Could not load the default credentials") ||
        errorMessage.includes("Không thể tải API Key")
      ) {
        setChatHistory(prev => [...prev, { 
          role: "model", 
          text: "API Key chưa được cấu hình hoặc không hợp lệ. Vui lòng thực hiện các bước sau:\n1. Nhấn vào biểu tượng bánh răng (Settings) ở góc trên bên phải.\n2. Chọn mục 'Secrets'.\n3. Thêm khóa 'GEMINI_API_KEY' và chọn 'AI Studio Free Tier'.\n4. QUAN TRỌNG: Nhấn nút 'Apply changes' màu xanh ở dưới cùng để lưu lại." 
        }]);
      } else {
        setChatHistory(prev => [...prev, { role: "model", text: "Xin lỗi, đã có lỗi xảy ra khi kết nối. Vui lòng thử lại sau. Chi tiết lỗi: " + errorMessage }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 pb-32 h-[calc(100vh-theme(spacing.16))] flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif italic text-white flex items-center gap-3">
            <Bot className="text-accent" size={32} />
            Trợ lý AI Bằng Giọng Điệu Tự Nhiên
          </h1>
          <p className="text-xs text-white/50 uppercase tracking-widest mt-2 flex items-center gap-2">
            <Database size={12} />
            {isInitializing ? "Đang kết nối CSDL..." : "Đã đồng bộ dữ liệu hệ thống"}
          </p>
        </div>
      </div>

      <div className="flex-1 bg-surface/50 border border-white/5 rounded-3xl overflow-hidden flex flex-col backdrop-blur-sm shadow-xl">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "model" && (
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0 border border-accent/20">
                  <Bot size={20} className="text-accent" />
                </div>
              )}
              
              <div className={`max-w-[70%] rounded-2xl p-4 leading-relaxed ${msg.role === "user" ? "bg-accent text-accent-foreground rounded-tr-sm" : "bg-white/5 border border-white/10 text-white rounded-tl-sm"}`}>
                <div className="text-sm prose prose-invert max-w-none whitespace-pre-wrap">
                  {msg.text}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                  <User size={20} className="text-white/70" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0 border border-accent/20">
                <Bot size={20} className="text-accent" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                <Loader2 size={16} className="text-accent animate-spin" />
                <span className="text-white/50 text-sm">AI đang suy nghĩ xử lý dữ liệu...</span>
              </div>
            </div>
          )}
          
          {chatHistory.some(m => m.text.includes("thiết lập API Key")) && (
             <div className="flex gap-4 justify-start">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0 border border-accent/20 opacity-0"></div>
              <button 
                 onClick={() => { (window as any).aistudio?.openSelectKey?.(); }}
                 className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 font-medium"
              >
                 Cấu hình API Key
              </button>
             </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-surface border-t border-white/5">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isInitializing ? "Đang đồng bộ dữ liệu hệ thống..." : "Hỏi AI về đoàn viên, hoạt động... (VD: Ai là chi đoàn trưởng khoa Công Nghệ Thông Tin?)"}
              disabled={isInitializing || isLoading}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 pr-16 text-white focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!query.trim() || isInitializing || isLoading}
              className="absolute right-2 p-3 bg-accent text-accent-foreground rounded-lg disabled:opacity-50 hover:opacity-90 transition-all flex items-center justify-center"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
