import React, { useState, useEffect, useRef } from "react";
import { Bot, Send, User, ChevronRight, Loader2, Database } from "lucide-react";
import { GoogleGenAI } from "@google/genai";

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
        const [membersRes, unitsRes, activitiesRes, knowledgeRes] = await Promise.all([
          fetch("/api/members"),
          fetch("/api/units"),
          fetch("/api/activities"),
          fetch("/api/knowledge-base")
        ]);
        const members = await membersRes.json();
        const units = await unitsRes.json();
        const activities = await activitiesRes.json();
        const knowledge = await knowledgeRes.json();
        
        setDbContext({
          units: units,
          members: members,
          activities: activities,
          knowledge: knowledge
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
      // Always initialize with process.env.GEMINI_API_KEY as per skill
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      
      const contents = requestHistory
        .filter(m => m.role && m.text)
        .map(m => ({
          role: m.role as "user" | "model",
          parts: [{ text: m.text }]
        }));
      contents.push({ role: "user", parts: [{ text: userText }] });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
        config: {
          systemInstruction: `Bạn là trợ lý AI thông minh, chuyên gia về nghiệp vụ Đoàn - Đội tại trường Đại Học Đà Lạt.
Dữ liệu của bạn bao gồm:
1. Thông tin hệ thống (Đoàn viên, Chi đoàn, Hoạt động): ${JSON.stringify({ units: dbContext.units, members: dbContext.members, activities: dbContext.activities })}
2. Kiến thức nghiệp vụ & Tài liệu chuyên môn: ${JSON.stringify(dbContext.knowledge)}

Quy tắc ứng xử:
- Luôn ưu tiên trả lời dựa trên "Kiến thức nghiệp vụ" nếu câu hỏi mang tính chuyên môn, quy định.
- Nếu hỏi về thông tin nhân sự/hoạt động, hãy lấy từ "Thông tin hệ thống".
- Trả lời bằng tiếng Việt, phong cách chuyên nghiệp nhưng thân thiện.
- Sử dụng markdown để trình bày rõ ràng (in đậm, danh sách).
- Nếu dữ liệu không đủ để trả lời, tuyệt đối không bịa ra thông tin. Hãy lịch sự phản hồi rằng hệ thống chưa có dữ liệu này.`
        }
      });
      
      const responseText = response.text || "Tôi không có câu trả lời cho vấn đề này.";
      setChatHistory(prev => [...prev, { role: "model", text: responseText }]);
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      const errorMessage = err.message || String(err);
      
      if (
        errorMessage.includes("API key not valid") || 
        errorMessage.includes("API_KEY_INVALID") || 
        errorMessage.includes("API key should be set") ||
        errorMessage.toLowerCase().includes("gemini_api_key")
      ) {
        setChatHistory(prev => [...prev, { 
          role: "model", 
          text: `Lỗi kết nối AI: API Key chưa được xác thực hoặc không hợp lệ.

Do "GEMINI_API_KEY" là khóa hệ thống, bạn vui lòng:
1. Nhấn vào tab **Secrets** bên cột phải (hoặc trong phần Cài đặt).
2. Tìm dòng **GEMINI_API_KEY**.
3. Ở cột **Value**, hãy chắc chắn đã chọn **"AI Studio Free Tier"**.
4. **QUAN TRỌNG:** Nhấn nút **"Apply changes"** màu xanh (ở dưới cùng bảng Secrets) để hệ thống ghi nhận.

Nếu vẫn lỗi, hãy thử làm mới trang web.` 
        }]);
      } else {
        setChatHistory(prev => [...prev, { role: "model", text: "Xin lỗi, đã có lỗi xảy ra khi kết nối. Chi tiết lỗi: " + errorMessage }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 pb-32 h-[calc(100vh-theme(spacing.16))] flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
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
              
              <div className={`max-w-[85%] rounded-2xl p-4 shadow-lg leading-relaxed ${msg.role === "user" ? "bg-accent rounded-tr-sm border border-accent/30 shadow-accent/10" : "bg-surface-light border border-white/10 text-white rounded-tl-sm"}`}>
                <div className={`text-[16px] max-w-none whitespace-pre-wrap ${msg.role === "user" ? "text-[#1e1e2e] font-semibold" : "text-slate-100 prose prose-invert"}`}>
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
              className="w-full bg-surface-light border border-white/10 rounded-2xl px-6 py-5 pr-16 text-white focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50 transition-all shadow-inner"
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
