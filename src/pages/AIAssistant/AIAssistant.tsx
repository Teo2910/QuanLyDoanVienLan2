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
        model: "gemini-3.1-flash-lite",
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
              model: "gemini-3.1-flash-lite",
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
              model: "gemini-3.1-flash-lite",
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
                model: "gemini-3.1-flash-lite",
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
              model: "gemini-3.1-flash-lite",
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
                model: "gemini-3.1-flash-lite",
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
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden relative">
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/5 blur-[120px] -mr-64 -mt-64 rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 blur-[120px] -ml-64 -mb-64 rounded-full pointer-events-none" />

      {/* Header */}
      <header className="px-10 py-8 bg-white/70 backdrop-blur-xl border-b border-slate-200 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-gradient-to-br from-accent to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-accent/20 rotate-3 group transition-transform hover:rotate-0">
            <Bot size={32} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Trợ lý Thông minh</h2>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">AI Core v2.4</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-400 mt-1">Phân tích & Hỗ trợ điều hành tự động</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4">
           <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 font-bold text-[10px] uppercase tracking-widest">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Hệ thống sẵn sàng
           </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar relative z-10">
        {isInitializing && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center gap-6">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Đang đồng bộ hóa tri thức...</p>
              <p className="text-[9px] text-slate-300 font-bold mt-2 italic">Dữ liệu Đoàn viên & Nghiệp vụ DLU</p>
            </div>
          </div>
        )}

        {chatHistory.length <= 1 && !isLoading ? (
          <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-12">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
            >
               <div className="absolute inset-0 bg-accent/20 blur-[60px] rounded-full animate-pulse" />
               <div className="w-36 h-36 bg-white rounded-[3rem] border border-slate-100 shadow-2xl flex items-center justify-center relative z-10">
                  <Sparkles size={56} className="text-accent" />
               </div>
            </motion.div>
            
            <div className="space-y-4">
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight">
                Tôi có thể giúp gì cho <span className="text-accent underline decoration-accent/20 underline-offset-8">chiến dịch</span> của bạn?
              </h3>
              <p className="text-slate-500 font-medium leading-relaxed max-w-lg mx-auto">
                Hệ thống AI tích hợp sâu giúp bạn truy xuất báo cáo, lập kế hoạch phong trào và phân tích nhân sự bằng ngôn ngữ tự nhiên.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {[
                { title: "Phân tích Đoàn viên", desc: "Thống kê tỉ lệ xếp loại năm 2023", icon: Database },
                { title: "Lập kế hoạch", desc: "Đề xuất 5 hoạt động mùa hè cho Chi đoàn", icon: Sparkles },
                { title: "Báo cáo nhanh", desc: "Tóm tắt tiến độ các phong trào hiện nay", icon: CheckCircle2 },
                { title: "Tra cứu hồ sơ", desc: "Tìm kiếm các đoàn viên tiêu biểu nhất", icon: User },
              ].map((item, idx) => (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setQuery(item.title)}
                  className="p-6 bg-white border border-slate-100 rounded-[2.5rem] text-left hover:border-accent hover:shadow-2xl hover:shadow-slate-200 transition-all group relative overflow-hidden active:scale-95"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-accent/[0.02] rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform" />
                  <item.icon size={20} className="text-accent mb-4 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-black text-slate-900 group-hover:text-accent transition-colors">{item.title}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{item.desc}</p>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full space-y-10 pb-10">
            <AnimatePresence>
              {chatHistory.map((m, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn(
                    "flex gap-6",
                    m.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xl relative",
                    m.role === "user" ? "bg-slate-900 text-white" : "bg-white border border-slate-100 text-accent"
                  )}>
                    {m.role === "user" ? <User size={22} /> : <Bot size={22} />}
                    {m.isAction && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white">
                        <CheckCircle2 size={10} />
                      </div>
                    )}
                  </div>
                  <div className={cn(
                    "relative max-w-[85%] p-8 rounded-[2.5rem] shadow-sm transition-all hover:shadow-md",
                    m.role === "user" 
                      ? "bg-white border-2 border-slate-100 text-slate-900 rounded-tr-none" 
                      : "bg-white border border-slate-100 text-slate-800 rounded-tl-none border-l-4 border-l-accent"
                  )}>
                    <div className="prose prose-slate max-w-none text-[15px] font-medium leading-relaxed">
                       {m.text}
                    </div>
                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 mt-4 ${m.role === "user" ? "text-right" : "text-left"}`}>
                       {m.role === "user" ? "Chủ sở hữu" : "Trợ lý DLU"} • {format(new Date(), "HH:mm")}
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
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-lg animate-pulse text-accent">
                    <Bot size={22} />
                  </div>
                  <div className="bg-white border border-slate-100 rounded-[2.5rem] rounded-tl-none p-8 flex items-center gap-6 shadow-xl shadow-slate-200/20">
                    <div className="flex gap-1.5">
                      <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2.5 h-2.5 rounded-full bg-accent" />
                      <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2.5 h-2.5 rounded-full bg-accent" />
                      <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2.5 h-2.5 rounded-full bg-accent" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] animate-pulse">AI đang giải mã nghiệp vụ...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-10 shrink-0 relative z-20">
        <div className="max-w-4xl mx-auto relative">
          <div className="absolute inset-x-0 bottom-full mb-6 px-10 flex items-center justify-between">
             <div className="flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-100 rounded-full shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em]">Kênh bảo mật 256-bit</span>
             </div>
             <p className="text-[9px] text-slate-300 font-bold uppercase tracking-tight">Shift + Enter để xuống hàng</p>
          </div>
          
          <form 
            onSubmit={handleSend}
            className="bg-white border border-slate-200 rounded-[3.5rem] p-4 flex items-center gap-4 shadow-[0_30px_100px_rgba(0,0,0,0.08)] focus-within:border-accent transition-all duration-500 focus-within:-translate-y-2"
          >
            <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-[2.2rem] flex items-center justify-center text-slate-400 shrink-0">
              <Database size={24} />
            </div>
            <textarea
              rows={1}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder={isInitializing ? "Hệ thống đang khởi động..." : "Bạn cần hỗ trợ nghiệp vụ gì? (Tạo hồ sơ, phong trào, tra cứu...)"}
              disabled={isInitializing || isLoading}
              className="flex-1 bg-transparent resize-none focus:outline-none text-slate-900 placeholder:text-slate-300 font-bold py-4 text-lg no-scrollbar"
            />
            <motion.button
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              disabled={isLoading || !query.trim()}
              type="submit"
              className={cn(
                "w-16 h-16 rounded-[2.2rem] flex items-center justify-center transition-all duration-500 shadow-2xl",
                query.trim() && !isLoading ? "bg-slate-900 text-white shadow-slate-900/40 hover:bg-accent hover:shadow-accent/40" : "bg-slate-100 text-slate-300 shadow-none pointer-events-none"
              )}
            >
              <Send size={24} strokeWidth={2.5} className={cn("transition-transform", query.trim() ? "translate-x-0.5 -translate-y-0.5" : "")} />
            </motion.button>
          </form>
          
          <div className="flex gap-4 mt-8 overflow-x-auto pb-4 no-scrollbar px-6">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 self-center whitespace-nowrap">Phổ biến:</span>
            {[
              { text: "Thống kê đoàn viên tiêu biểu", icon: Sparkles },
              { text: "Phát động phong trào hè", icon: Database },
              { text: "Xếp loại chi đoàn xuất sắc", icon: CheckCircle2 }
            ].map((hint, idx) => (
              <motion.button 
                key={idx}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setQuery(hint.text)}
                className="whitespace-nowrap px-6 py-3.5 rounded-[1.5rem] bg-white border border-slate-100 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 hover:text-accent hover:border-accent/40 transition-all shadow-md flex items-center gap-3 active:scale-95 shrink-0"
              >
                <hint.icon size={14} className="text-accent" />
                {hint.text}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
