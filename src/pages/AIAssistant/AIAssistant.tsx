import React, { useState, useEffect, useRef } from "react";
import { Bot, Send, User, ChevronRight, Loader2, Database, Sparkles, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { dataService } from "../../services/dataService";
import { useAuth } from "../../contexts/AuthContext";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export const AIAssistant = () => {
  const { profile } = useAuth();
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
        description: "Tạo một hoạt động thông thường (ví dụ: giao lưu, thể thao, văn nghệ). Không dùng cho các phong trào lớn yêu cầu báo cáo.",
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

      const createMovementTool: FunctionDeclaration = {
        name: "create_movement",
        description: "Tạo một PHONG TRÀO lớn (phải dùng nếu người dùng nói 'phong trào', 'tạo phong trào ...', 'đánh Lol', 'cuộc vận động'). Các phong trào này yêu cầu nộp báo cáo từ các đơn vị.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Tiêu đề phong trào" },
            startDate: { type: Type.STRING, description: "Ngày bắt đầu (YYYY-MM-DD)" },
            endDate: { type: Type.STRING, description: "Ngày kết thúc (YYYY-MM-DD)" },
            description: { type: Type.STRING, description: "Mô tả chi tiết" },
            participatingUnitIds: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Danh sách ID các đơn vị tham gia. Nếu không nói rõ, hãy mặc định lấy tất cả ID đơn vị từ danh sách hệ thống."
            }
          },
          required: ["title", "startDate", "endDate", "description"]
        }
      };

      const systemInstruction = `Bạn là trợ lý AI thông minh điều hành hệ thống Quản lý Đoàn viên tại trường Đại học Đà Lạt.
Hôm nay là: ${format(new Date(), "EEEE, 'ngày' d 'tháng' M 'năm' yyyy", { locale: vi })}.

PHÂN BIỆT RÕ RÀNG:
- PHONG TRÀO (Movement): Là các sự kiện lớn, có yêu cầu nộp báo cáo từ các đơn vị. Cả Quản trị viên (Admin) và Bí thư (Secretary) đều có quyền tạo.
- HOẠT ĐỘNG (Activity): Là các sự kiện thông thường. Cả Quản trị viên và Bí thư đều có thể tạo.

HÀNH ĐỘNG CÓ THỂ THỰC HIỆN:
1. Tạo phong trào mới (Sử dụng 'create_movement'): Bạn PHẢI tạo PHONG TRÀO nếu người dùng dùng từ 'phong trào', 'phát động', 'cuộc vận động', 'chiến dịch'. Tránh nhầm sang Activity nếu người dùng đã nói rõ là Phong trào.
2. Tạo hoạt động mới: Sử dụng 'create_activity'.
3. Thêm đoàn viên mới: Sử dụng công cụ 'create_member'.
   - Để lấy đúng 'unitId', hãy tra cứu trong danh sách 'Thông tin hệ thống -> units' bên dưới. Nếu người dùng nói tên chi đoàn (vd: "Chi đoàn CNTT"), hãy tìm ID tương ứng.

TRA CỨU THÔNG TIN:
Dữ liệu của bạn bao gồm:
1. Thông tin hệ thống: ${JSON.stringify({ 
        units: dbContext.units?.map((u: any) => ({ id: u.id, name: u.name, code: u.code })), 
        membersCount: dbContext.members?.length, 
        activitiesCount: dbContext.activities?.length,
        movementsCount: dbContext.movements?.length,
        userRole: profile?.role
      })}
2. Kiến thức nghiệp vụ & Tài liệu chuyên môn: ${JSON.stringify(dbContext.knowledge?.length)}

Quy tắc ứng xử:
- Luôn ưu tiên trả lời dựa trên "Kiến thức nghiệp vụ" nếu câu hỏi mang tính chuyên môn.
- Trả lời bằng tiếng Việt chuyên nghiệp, thân thiện.
- Sử dụng markdown để trình bày.
- Sau khi thực hiện hành động thành công, hãy thông báo kèm theo các thông tin đã tạo.`;

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
          tools: [{ functionDeclarations: [createActivityTool, createMemberTool, createMovementTool] }]
        }
      });
      
      const functionCalls = response.functionCalls;
      
      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        // Handle create_movement
        if (call.name === "create_movement" && call.args) {
          if (profile?.role !== "admin") {
            setChatHistory(prev => [...prev, { 
              role: "model", 
              text: "Rất tiếc, tôi không thể thực hiện yêu cầu này. Chỉ có tài khoản Quản trị viên (Tỉnh đoàn) mới có quyền phát động **Phong trào** mới. Với tài khoản Bí thư, bạn có thể sử dụng tính năng tạo **Hoạt động** thay thế." 
            }]);
            setIsLoading(false);
            return;
          }
          const args = call.args as any;

          try {
            const unitIds = args.participatingUnitIds && args.participatingUnitIds.length > 0
              ? args.participatingUnitIds
              : dbContext.units?.map((u: any) => u.id) || [];

            const newMovement = await dataService.addMovement({
              title: args.title,
              description: args.description,
              startDate: args.startDate,
              endDate: args.endDate,
              participatingUnitIds: unitIds,
              creatorId: profile?.uid || "ai-assistant",
              attachments: []
            });

            const modelContent = response.candidates?.[0]?.content;
            if (!modelContent) throw new Error("Không nhận được phản hồi từ AI");

            const toolResultContent = {
              role: "user",
              parts: [
                {
                  functionResponse: {
                    name: "create_movement",
                    response: { success: true, message: `Đã phát động phong trào "${args.title}" thành công.`, id: newMovement.id },
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
              text: finalResponse.text || `Đã phát động phong trào "${args.title}" thành công.`, 
              isAction: true 
            }]);
          } catch (actionErr: any) {
            setChatHistory(prev => [...prev, { role: "model", text: `Lỗi khi tạo phong trào: ${actionErr.message}` }]);
          }
        }
        // Handle create_activity
        else if (call.name === "create_activity" && call.args) {
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
      
      const errorStr = err.message || String(err);
      
      if (errorStr.includes("SAFETY")) {
        errorMsg = "Yêu cầu đã bị từ chối do chính sách an toàn của AI.";
      } else if (errorStr.includes("quota") || errorStr.includes("RESOURCE_EXHAUSTED")) {
        errorMsg = "Hệ thống AI đang quá tải (hết quota). Vui lòng thử lại sau hoặc nâng cấp gói API.";
      } else if (errorStr.includes("high demand") || errorStr.includes("UNAVAILABLE") || errorStr.includes("503")) {
        errorMsg = "Máy chủ AI đang quá tải do lượng truy cập cao. Vui lòng đợi một lát và thử lại.";
      } else {
        errorMsg += ` (Chi tiết: ${errorStr})`;
      }
      
      setChatHistory(prev => [...prev, { role: "model", text: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 h-[calc(100vh-theme(spacing.16))] flex flex-col max-w-6xl mx-auto">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-accent text-white flex items-center justify-center shadow-xl shadow-accent/20 relative group">
              <Bot size={32} />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                Trợ lý AI Nghiệp vụ
              </h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] mt-1 flex items-center gap-2 font-black">
                <Sparkles size={12} className="text-accent" />
                DLU Intelligent Core v2.4
              </p>
            </div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 px-6 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hệ thống sẵn sàng</span>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-100 rounded-[3rem] overflow-hidden flex flex-col shadow-2xl shadow-slate-200/50 relative border-b-8 border-b-accent/10">
        {isInitializing && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Đang đồng bộ hóa tri thức hệ thống...</p>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-slate-50/50 scroll-smooth custom-scrollbar">
          {chatHistory.map((msg, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i === chatHistory.length - 1 ? 0.1 : 0 }}
              key={i} 
              className={`flex gap-6 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className="shrink-0 pt-1">
                {msg.role === "model" ? (
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl shadow-slate-900/10 border border-slate-800">
                    <Bot size={22} className="text-white" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center shadow-lg shadow-slate-200/20">
                    <User size={22} className="text-slate-400" />
                  </div>
                )}
              </div>
              
              <div className={`max-w-[80%] relative ${msg.role === "user" ? "text-right" : "text-left"}`}>
                <div className={`
                  group relative rounded-[2rem] p-7 shadow-xl leading-relaxed text-[15px] transition-all
                  ${msg.role === "user" 
                    ? "bg-slate-900 text-white rounded-tr-sm shadow-slate-900/10 font-medium" 
                    : "bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-slate-200/30 font-medium"}
                `}>
                  {msg.isAction && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-4 -right-4 bg-emerald-500 text-white p-2 rounded-2xl border-4 border-white shadow-2xl z-20"
                    >
                      <CheckCircle2 size={24} />
                    </motion.div>
                  )}
                  <div className="prose prose-slate max-w-none prose-sm group-hover:prose-p:text-slate-900 transition-colors">
                    {msg.text}
                  </div>
                </div>
                <p className={`text-[9px] font-black uppercase tracking-widest text-slate-300 mt-3 ${msg.role === "user" ? "mr-4" : "ml-4"}`}>
                  {msg.role === "user" ? "Người điều hành" : "Trợ lý ảo DLU"} • {format(new Date(), "HH:mm")}
                </p>
              </div>
            </motion.div>
          ))}
          
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0 border border-accent/20 animate-pulse">
                <Bot size={22} className="text-accent" />
              </div>
              <div className="bg-white border border-slate-100 rounded-[1.5rem] rounded-tl-sm p-6 flex items-center gap-4 shadow-xl shadow-slate-200/20">
                <div className="flex gap-1.5">
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 rounded-full bg-accent" />
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 rounded-full bg-accent/60" />
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 rounded-full bg-accent/30" />
                </div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Đang xử lý nghiệp vụ...</span>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="p-8 bg-white border-t border-slate-100 relative shadow-[0_-20px_50px_rgba(0,0,0,0.02)]">
          <form onSubmit={handleSend} className="relative flex items-center group">
            <div className="absolute left-6 text-slate-300 group-focus-within:text-accent transition-colors">
              <Sparkles size={24} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isInitializing ? "Đang giải mã hệ quản trị..." : "Bạn cần hỗ trợ nghiệp vụ gì? (Tạo đoàn viên, phong trào, tra cứu...)"}
              disabled={isInitializing || isLoading}
              className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] pl-16 pr-20 py-6 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-accent/5 focus:bg-white focus:border-accent disabled:opacity-50 transition-all font-bold text-base shadow-inner group-hover:border-slate-200"
            />
            <button
              type="submit"
              disabled={!query.trim() || isInitializing || isLoading}
              className="absolute right-3 w-14 h-14 bg-slate-900 text-white rounded-2xl disabled:opacity-20 hover:bg-accent transition-all flex items-center justify-center shadow-xl shadow-slate-900/20 hover:shadow-accent/40 group/btn"
            >
              <Send size={24} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
            </button>
          </form>
          <div className="mt-8 flex gap-3 overflow-x-auto pb-4 no-scrollbar">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 self-center mr-2">Gợi ý tác vụ:</span>
            {["Tra cứu hồ sơ đoàn viên", "Phát động phong trào", "Kiểm tra xếp loại", "Tạo hoạt động thanh niên"].map((hint) => (
              <motion.button 
                key={hint}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setQuery(hint)}
                className="whitespace-nowrap px-6 py-3 rounded-2xl bg-white border border-slate-100 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 hover:text-accent hover:border-accent/30 transition-all shadow-sm hover:shadow-lg"
              >
                {hint}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
