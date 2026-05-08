import React, { useState, useEffect, useRef } from "react";
import { Bot, Send, User, ChevronRight, Loader2, Database, Sparkles, CheckCircle2 } from "lucide-react";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { dataService } from "../../services/dataService";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export const AIAssistant = () => {
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "model", text: string, isAction?: boolean }[]>([
    { role: "model", text: "Xin chào! Tôi là Trợ lý AI. Tôi có thể giúp bạn tra cứu thông tin hoặc thực hiện hành động như tạo hoạt động mới bằng ngôn ngữ tự nhiên. Bạn muốn tôi giúp gì?" }
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
        const [members, units, activities, knowledge] = await Promise.all([
          dataService.getMembers(),
          dataService.getUnits(),
          dataService.getActivities(),
          dataService.getKnowledgeBase()
        ]);
        
        setDbContext({
          units,
          members,
          activities,
          knowledge
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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      
      const createActivityTool: FunctionDeclaration = {
        name: "create_activity",
        description: "Tạo một hoạt động hoặc phong trào mới trong hệ thống.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Tên hoạt động/phong trào" },
            date: { type: Type.STRING, description: "Ngày diễn ra (định dạng DD/MM/YYYY)" },
            location: { type: Type.STRING, description: "Địa điểm tổ chức" },
            description: { type: Type.STRING, description: "Mô tả ngắn gọn về hoạt động" },
            type: { type: Type.STRING, description: "Loại hoạt động (ví dụ: Tình nguyện, Thể thao, Văn hóa, Hội thảo)" }
          },
          required: ["title", "date", "type"]
        }
      };

      const createMemberTool: FunctionDeclaration = {
        name: "create_member",
        description: "Thêm một đoàn viên mới vào hệ thống quản lý.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            fullName: { type: Type.STRING, description: "Họ và tên đầy đủ của đoàn viên" },
            memberId: { type: Type.STRING, description: "Mã số sinh viên/đoàn viên" },
            dob: { type: Type.STRING, description: "Ngày sinh (DD/MM/YYYY)" },
            gender: { type: Type.STRING, enum: ["Nam", "Nữ", "Khác"], description: "Giới tính" },
            unitId: { type: Type.STRING, description: "ID của chi đoàn (Đơn vị). Hãy tra cứu từ danh sách đơn vị được cung cấp." },
            email: { type: Type.STRING, description: "Địa chỉ email" },
            phone: { type: Type.STRING, description: "Số điện thoại liên lạc" },
            hometown: { type: Type.STRING, description: "Quê quán" },
            status: { type: Type.STRING, enum: ["Đang sinh hoạt", "Đã chuyển sinh hoạt", "Đã trưởng thành", "Bị kỷ luật"], description: "Trạng thái hiện tại" }
          },
          required: ["fullName", "memberId", "dob", "gender", "unitId", "status"]
        }
      };

      const systemInstruction = `Bạn là trợ lý AI thông minh điều hành hệ thống Quản lý Đoàn viên tại trường Đại học Đà Lạt.
Hôm nay là: ${format(new Date(), "EEEE, 'ngày' d 'tháng' M 'năm' yyyy", { locale: vi })}.

HÀNH ĐỘNG CÓ THỂ THỰC HIỆN:
1. Tạo hoạt động mới: Khi người dùng yêu cầu tạo, thêm hoặc lên lịch cho một phong trào, hoạt động, sự kiện. Bạn PHẢI sử dụng công cụ 'create_activity'.
2. Thêm đoàn viên mới: Khi người dùng yêu cầu tạo, thêm đoàn viên/sinh viên mới vào hệ thống. Bạn PHẢI sử dụng công cụ 'create_member'.
   - Để lấy đúng 'unitId', hãy tra cứu trong danh sách 'Thông tin hệ thống -> units' bên dưới. Nếu người dùng nói tên chi đoàn (vd: "Chi đoàn CNTT"), hãy tìm ID tương ứng.

TRA CỨU THÔNG TIN:
Dữ liệu của bạn bao gồm:
1. Thông tin hệ thống: ${JSON.stringify({ 
        units: dbContext.units?.map((u: any) => ({ id: u.id, name: u.name, code: u.code })), 
        membersCount: dbContext.members?.length, 
        activitiesCount: dbContext.activities?.length 
      })}
2. Kiến thức nghiệp vụ & Tài liệu chuyên môn: ${JSON.stringify(dbContext.knowledge?.length)}

Quy tắc ứng xử:
- Luôn ưu tiên trả lời dựa trên "Kiến thức nghiệp vụ" nếu câu hỏi mang tính chuyên môn.
- Trả lời bằng tiếng Việt chuyên nghiệp, thân thiện.
- Sử dụng markdown để trình bày.
- Sau khi thực hiện hành động thành công (qua công cụ), hãy thông báo rõ ràng cho người dùng.`;

      const contents = chatHistory.map(m => ({
        role: m.role as "user" | "model",
        parts: [{ text: m.text }]
      }));
      contents.push({ role: "user", parts: [{ text: userText }] });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [createActivityTool, createMemberTool] }]
        }
      });
      
      const functionCalls = response.functionCalls;
      
      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        // Handle create_activity
        if (call.name === "create_activity" && call.args) {
          const args = call.args as any;
          try {
            console.log("Creating activity with args:", args);
            const newActivity = await dataService.addActivity({
              title: args.title,
              date: args.date,
              location: args.location || "Chưa xác định",
              description: args.description || `Được tạo tự động bởi AI trợ lý vào lúc ${format(new Date(), "HH:mm dd/MM/yyyy")}`,
              type: args.type
            });

            const modelContent = response.candidates?.[0]?.content;
            if (!modelContent) throw new Error("Không nhận được phản hồi từ AI");

            const toolResultContent = {
              role: "user",
              parts: [
                {
                  functionResponse: {
                    name: "create_activity",
                    response: { success: true, message: `Đã tạo thành công phong trào "${args.title}" vào ngày ${args.date}`, activityId: newActivity.id },
                    id: (call as any).id
                  }
                }
              ]
            };

            const finalResponse = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: [...contents, modelContent, toolResultContent],
              config: { systemInstruction }
            });
            
            setChatHistory(prev => [...prev, { 
              role: "model", 
              text: finalResponse.text || `Đã tạo thành công phong trào "${args.title}" vào ngày ${args.date}.`, 
              isAction: true 
            }]);
          } catch (actionErr: any) {
            console.error("Activity Action error:", actionErr);
            const errorMsg = actionErr.message || "Lỗi không xác định";
            
            const modelContent = response.candidates?.[0]?.content;
            if (modelContent) {
              const toolErrorContent = {
                role: "user",
                parts: [
                  {
                    functionResponse: {
                      name: "create_activity",
                      response: { error: errorMsg },
                      id: (call as any).id
                    }
                  }
                ]
              };

              const finalResponse = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: [...contents, modelContent, toolErrorContent],
                config: { systemInstruction }
              });
              setChatHistory(prev => [...prev, { role: "model", text: finalResponse.text || `Có lỗi khi thực hiện: ${errorMsg}` }]);
            } else {
              setChatHistory(prev => [...prev, { role: "model", text: `Có lỗi hệ thống: ${errorMsg}` }]);
            }
          }
        }
        // Handle create_member
        else if (call.name === "create_member" && call.args) {
          const args = call.args as any;
          try {
            console.log("Creating member with args:", args);
            const newMember = await dataService.addMember({
              fullName: args.fullName || "Đoàn viên mới",
              memberId: args.memberId || `SV${Math.floor(Math.random() * 1000000)}`,
              dob: args.dob || "01/01/2000",
              gender: args.gender || "Nam",
              unitId: args.unitId || (dbContext.units?.[0]?.id || "default"),
              status: args.status || "Đang sinh hoạt",
              email: args.email || "",
              phone: args.phone || "",
              hometown: args.hometown || "",
              achievementLevel: "Khá",
              isOutstanding: false
            } as any);

            const modelContent = response.candidates?.[0]?.content;
            if (!modelContent) throw new Error("Không nhận được nội dung phản hồi từ AI");

            const toolResultContent = {
              role: "user",
              parts: [
                {
                  functionResponse: {
                    name: "create_member",
                    response: { success: true, message: `Đã thêm thành công đoàn viên "${args.fullName}" (MSSV: ${args.memberId})`, memberId: newMember.id },
                    id: (call as any).id
                  }
                }
              ]
            };

            const finalResponse = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: [...contents, modelContent, toolResultContent],
              config: { systemInstruction }
            });
            
            setChatHistory(prev => [...prev, { 
              role: "model", 
              text: finalResponse.text || `Đã thêm thành công đoàn viên "${args.fullName}".`, 
              isAction: true 
            }]);
          } catch (actionErr: any) {
            console.error("Member Action error:", actionErr);
            const errorMsg = actionErr.message || "Lỗi không xác định";
            
            const modelContent = response.candidates?.[0]?.content;
            if (modelContent) {
              const toolErrorContent = {
                role: "user",
                parts: [
                  {
                    functionResponse: {
                      name: "create_member",
                      response: { error: errorMsg },
                      id: (call as any).id
                    }
                  }
                ]
              };

              const finalResponse = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: [...contents, modelContent, toolErrorContent],
                config: { systemInstruction }
              });
              setChatHistory(prev => [...prev, { role: "model", text: finalResponse.text || `Có lỗi khi thực hiện thêm đoàn viên: ${errorMsg}` }]);
            } else {
              setChatHistory(prev => [...prev, { role: "model", text: `Có lỗi hệ thống: ${errorMsg}` }]);
            }
          }
        }
      } else {
        setChatHistory(prev => [...prev, { role: "model", text: response.text || "Tôi không thể xử lý yêu cầu này." }]);
      }
    } catch (err: any) {
      console.error("Gemini API Error Detail:", err);
      let errorMsg = "Xin lỗi, đã có lỗi xảy ra khi xử lý yêu cầu của bạn.";
      if (err.message) {
        if (err.message.includes("SAFETY")) errorMsg = "Yêu cầu đã bị từ chối do chính sách an toàn của AI.";
        else if (err.message.includes("quota")) errorMsg = "Hệ thống AI đang quá tải (hết quota). Vui lòng thử lại sau.";
        else errorMsg += ` (Chi tiết: ${err.message})`;
      }
      setChatHistory(prev => [...prev, { role: "model", text: errorMsg }]);
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
              
              <div className={`max-w-[85%] rounded-2xl p-4 shadow-lg leading-relaxed ${msg.role === "user" ? "bg-accent rounded-tr-sm border border-accent/30 shadow-accent/10" : "bg-surface-light border border-white/10 text-white rounded-tl-sm relative"}`}>
                {msg.isAction && (
                  <div className="absolute -top-3 -right-3 bg-green-500 text-white p-1 rounded-full border-2 border-surface shadow-lg animate-bounce">
                    <CheckCircle2 size={16} />
                  </div>
                )}
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
