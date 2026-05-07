import React, { useState, useEffect, useRef } from "react";
import { GoogleGenAI } from "@google/genai";
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
    
    setChatHistory(prev => [...prev, { role: "user", text: userText }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const systemInstruction = `Bạn là Trợ lý AI hỗ trợ quản lý đoàn viên của trường Đại Học Đà Lạt.
Chỉ trả lời dựa trên dữ liệu thật sau (từ SQL Server):
${JSON.stringify(dbContext)}

Quy tắc:
- Trả lời bằng tiếng Việt, thân thiện, rõ ràng, tự nhiên.
- Có thể dùng markdown để in đậm, tạo danh sách.
- Nếu được hỏi thông tin không có trong dữ liệu, hãy nói rõ là dữ liệu hệ thống không có, không tự bịa ra thông tin.`;

      // Build contents array strictly alternating user and model
      const contents = [];
      
      // Start with user input (GenAI API requires contents to start with user, 
      // but if we have previous history, we must include it properly)
      for (let i = 1; i < chatHistory.length; i++) { // Skip the first model greeting
         contents.push({
           role: chatHistory[i].role,
           parts: [{ text: chatHistory[i].text }]
         });
      }
      
      contents.push({ role: "user", parts: [{ text: userText }] });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
        config: {
          systemInstruction: systemInstruction
        }
      });

      setChatHistory(prev => [...prev, { role: "model", text: response.text || "Tôi không có câu trả lời cho vấn đề này." }]);
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      setChatHistory(prev => [...prev, { role: "model", text: "Xin lỗi, đã có lỗi xảy ra khi kết nối. Vui lòng thử lại sau." }]);
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
