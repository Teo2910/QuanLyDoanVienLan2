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

      const searchMembersTool: FunctionDeclaration = {
        name: "search_members",
        description: "Tìm kiếm hoặc liệt kê danh sách đoàn viên theo tên, mã số sinh viên hoặc từ khóa liên quan.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            searchTerm: { type: Type.STRING, description: "Tên hoặc mã số sinh viên cần tìm. Để trống nếu muốn liệt kê tất cả." }
          },
          required: ["searchTerm"]
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
4. Tìm kiếm / Liệt kê đoàn viên: Sử dụng 'search_members'. Nếu người dùng hỏi "có bao nhiêu người tên Huy", "tìm bạn Nguyễn Văn A", "liệt kê danh sách", hãy dùng công cụ này.
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
          tools: [{ functionDeclarations: [createActivityTool, createMemberTool, createMovementTool, searchMembersTool] }]
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
        // Handle search_members
        else if (call.name === "search_members" && call.args) {
          const args = call.args as any;
          try {
            console.log("Searching members with args:", args);
            const query = args.searchTerm || "";
            const members = await dataService.getMembers();
            
            const filtered = members.filter(m => 
              m.fullName.toLowerCase().includes(query.toLowerCase()) || 
              m.memberId.toLowerCase().includes(query.toLowerCase())
            );

            // Limit result size to avoid hitting context limits
            const resultSummary = filtered.slice(0, 15).map(m => ({
              fullName: m.fullName,
              memberId: m.memberId,
              unit: dbContext.units?.find((u: any) => u.id === m.unitId)?.name || "N/A",
              status: m.status,
              isOutstanding: m.isOutstanding
            }));

            const modelContent = response.candidates?.[0]?.content;
            if (!modelContent) throw new Error("Không nhận được nội dung phản hồi từ AI");

            const toolResultContent = {
              role: "user",
              parts: [
                {
                  functionResponse: {
                    name: "search_members",
                    response: { 
                      totalFound: filtered.length,
                      results: resultSummary,
                      message: filtered.length > 0 ? `Tìm thấy ${filtered.length} kết quả.` : "Không tìm thấy đoàn viên nào phù hợp."
                    },
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
              text: finalResponse.text || `Tìm thấy ${filtered.length} kết quả.`,
              isAction: false
            }]);
          } catch (actionErr: any) {
            setChatHistory(prev => [...prev, { role: "model", text: `Lỗi khi tìm kiếm: ${actionErr.message}` }]);
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
    <div className="p-4 lg:p-8 h-[calc(100vh-theme(spacing.24))] flex flex-col max-w-[1400px] mx-auto relative">
      {/* Decorative Background Elements */}
      <div className="absolute top-[10%] left-[5%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-[10%] right-[5%] w-[30%] h-[30%] bg-blue-400/5 rounded-full blur-[100px] -z-10" />

      <div className="mb-4 lg:mb-8 flex flex-col md:flex-row items-center md:items-center justify-between gap-4 lg:gap-6 px-2 lg:px-4 shrink-0">
        <div className="flex items-center gap-4 lg:gap-5 w-full md:w-auto">
          <motion.div 
            initial={{ rotate: -10, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl lg:rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center shadow-xl shadow-slate-900/20 relative group overflow-hidden shrink-0"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Bot size={24} className="lg:hidden relative z-10" />
            <Bot size={36} className="hidden lg:block relative z-10" />
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="absolute -top-1 -right-1 w-3 h-3 lg:w-5 lg:h-5 bg-emerald-500 rounded-full border-2 lg:border-4 border-white shadow-lg" 
            />
          </motion.div>
          <div className="overflow-hidden">
            <h1 className="text-xl sm:text-2xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight lg:leading-none truncate">
              Hệ thống Tri thức <span className="text-accent underline decoration-accent/20 underline-offset-4 lg:underline-offset-8">AI</span>
            </h1>
            <div className="flex items-center gap-2 lg:gap-3 mt-1 lg:mt-3">
              <div className="px-2 lg:px-3 py-0.5 lg:py-1 bg-accent/10 border border-accent/20 rounded-md lg:rounded-lg">
                <p className="text-[8px] lg:text-[10px] text-accent font-black uppercase tracking-widest flex items-center gap-1.5 lg:gap-2">
                  <Sparkles size={10} className="lg:hidden animate-pulse" />
                  <Sparkles size={12} className="hidden lg:block animate-pulse" />
                  DLU Intelligent Core v3.0
                </p>
              </div>
              <p className="text-[7px] lg:text-[9px] text-slate-400 font-bold uppercase tracking-widest hidden sm:block">Đã đồng bộ hóa 100% dữ liệu chi đoàn</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 self-end md:self-auto">
          <div className="flex flex-col items-end">
            <span className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</span>
            <div className="flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-1.5 lg:py-2 bg-emerald-50/50 border border-emerald-100 rounded-lg lg:rounded-xl">
              <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-emerald-600">Core Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white/40 lg:backdrop-blur-3xl border border-white border-t-slate-200/50 rounded-3xl lg:rounded-[4rem] overflow-hidden flex flex-col shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] relative">
        {/* Subtle decorative grid */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02] pointer-events-none" />
        
        {isInitializing && (
          <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-2xl flex flex-col items-center justify-center gap-4 lg:gap-6">
            <div className="relative">
              <div className="w-16 h-16 lg:w-20 lg:h-20 border-4 border-slate-100 rounded-2xl lg:rounded-[2rem] animate-pulse" />
              <div className="absolute inset-0 w-16 h-16 lg:w-20 lg:h-20 border-t-4 border-accent rounded-2xl lg:rounded-[2rem] animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-[10px] lg:text-xs font-black uppercase tracking-[0.3em] text-slate-900 mb-2">Đang nạp tri thức</p>
              <p className="text-[8px] lg:text-[10px] font-bold text-slate-400 italic">Vui lòng đợi...</p>
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-4 lg:p-10 space-y-6 lg:space-y-12 scroll-smooth custom-scrollbar relative z-10">
          <AnimatePresence initial={false}>
            {chatHistory.map((msg, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex gap-3 lg:gap-6 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className="shrink-0 pt-1">
                  {msg.role === "model" ? (
                    <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center shadow-2xl shadow-slate-900/20 border border-slate-800 transition-all hover:rotate-6">
                      <Bot size={20} className="text-white lg:hidden" />
                      <Bot size={26} className="text-white hidden lg:block" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xl shadow-slate-200/40 group overflow-hidden relative">
                      <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <User size={20} className="text-slate-400 relative z-10 lg:hidden" />
                      <User size={26} className="text-slate-400 relative z-10 hidden lg:block" />
                    </div>
                  )}
                </div>
                
                <div className={`max-w-[85%] lg:max-w-[75%] space-y-2 lg:space-y-3 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                  <div className={`
                    relative p-5 lg:p-8 lg:text-[16px] text-sm leading-[1.65] font-medium transition-all shadow-xl lg:shadow-2xl
                    ${msg.role === "user" 
                      ? "bg-slate-900 text-slate-100 rounded-3xl rounded-tr-none shadow-slate-900/10" 
                      : "bg-white/80 backdrop-blur-xl border border-white text-slate-800 rounded-3xl rounded-tl-none shadow-slate-200/40"}
                  `}>
                    {msg.isAction && (
                      <motion.div 
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute -top-3 -right-3 lg:-top-4 lg:-right-4 bg-emerald-500 text-white p-2 lg:p-3 rounded-xl lg:rounded-2xl border-2 lg:border-4 border-white shadow-2xl z-20"
                      >
                        <CheckCircle2 size={16} strokeWidth={3} className="lg:hidden" />
                        <CheckCircle2 size={24} strokeWidth={3} className="hidden lg:block" />
                      </motion.div>
                    )}
                    <div className="prose prose-slate max-w-none text-xs lg:text-sm font-medium">
                      {msg.text}
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 lg:gap-3 px-2 ${msg.role === "user" ? "flex-row-reverse text-right" : "flex-row text-left"}`}>
                    <p className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-slate-300">
                      {msg.role === "user" ? profile?.fullName || "Chủ thể điều hành" : "Hệ thống DLU Core"}
                    </p>
                    <div className="w-1 h-1 bg-slate-200 rounded-full" />
                    <p className="text-[8px] lg:text-[9px] font-bold text-slate-300 tabular-nums">
                      {format(new Date(), "HH:mm")}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3 lg:gap-6"
            >
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-accent/10 flex items-center justify-center shrink-0 border border-accent/20 animate-pulse transition-all">
                <Bot size={20} className="text-accent lg:hidden" />
                <Bot size={26} className="text-accent hidden lg:block" />
              </div>
              <div className="bg-white/60 backdrop-blur-xl border border-white rounded-2xl lg:rounded-[2rem] rounded-tl-none p-5 lg:p-8 flex items-center gap-4 lg:gap-6 shadow-xl lg:shadow-2xl shadow-slate-200/20">
                <div className="flex gap-1.5 lg:gap-2">
                  <motion.div animate={{ height: [6, 12, 6] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 lg:w-1.5 rounded-full bg-accent" />
                  <motion.div animate={{ height: [6, 12, 6] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1 lg:w-1.5 rounded-full bg-accent/60" />
                  <motion.div animate={{ height: [6, 12, 6] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1 lg:w-1.5 rounded-full bg-accent/30" />
                </div>
                <span className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-slate-400">Đang truy xuất...</span>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 lg:p-10 bg-white/50 lg:backdrop-blur-3xl border-t border-white relative z-20 shadow-[0_-15px_40px_rgba(0,0,0,0.03)] shrink-0">
          <form onSubmit={handleSend} className="relative flex items-center group max-w-5xl mx-auto">
            <div className="absolute left-4 lg:left-8 text-slate-300 group-focus-within:text-accent group-focus-within:scale-110 transition-all duration-500">
              <Sparkles size={20} strokeWidth={2.5} className="lg:hidden" />
              <Sparkles size={28} strokeWidth={2.5} className="hidden lg:block" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isInitializing ? "Vui lòng đợi..." : "Bạn muốn gì?"}
              disabled={isInitializing || isLoading}
              className="w-full bg-white border border-slate-200 rounded-2xl lg:rounded-[3rem] pl-12 lg:pl-20 pr-16 lg:pr-24 py-4 lg:py-8 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 lg:focus:ring-8 focus:ring-accent/5 focus:border-accent disabled:opacity-50 transition-all font-bold text-sm lg:text-lg shadow-xl shadow-slate-200/10 group-hover:border-slate-300 leading-relaxed"
            />
            <button
              type="submit"
              disabled={!query.trim() || isInitializing || isLoading}
              className="absolute right-2 lg:right-4 w-12 h-12 lg:w-16 lg:h-16 bg-slate-900 text-white rounded-full disabled:opacity-20 hover:bg-accent transition-all flex items-center justify-center shadow-2xl shadow-slate-900/30 hover:shadow-accent/50 group/btn"
            >
              <Send size={20} strokeWidth={2.5} className="lg:hidden" />
              <Send size={28} strokeWidth={2.5} className="hidden lg:block group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
            </button>
          </form>

          <div className="mt-4 lg:mt-8 flex flex-wrap justify-center gap-2 lg:gap-3 max-w-4xl mx-auto overflow-hidden">
            <span className="w-full text-center text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] lg:tracking-[0.3em] text-slate-300 mb-2 lg:mb-4 opacity-50">Lệnh gợi ý</span>
            {["Tìm đoàn viên", "Tạo phong trào", "Báo cáo"].map((hint) => (
              <motion.button 
                key={hint}
                whileHover={{ scale: 1.05, y: -4, backgroundColor: "rgb(37, 99, 235)", color: "white", borderColor: "transparent" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setQuery(hint)}
                className="whitespace-nowrap px-4 lg:px-8 py-2.5 lg:py-3.5 rounded-xl lg:rounded-[1.5rem] bg-white border border-slate-200 text-[9px] lg:text-[11px] font-black uppercase tracking-widest text-slate-500 transition-all shadow-md"
              >
                {hint}
              </motion.button>
            ))}
          </div>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
             <div className="w-1 h-1 bg-slate-200 rounded-full" />
             <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.4em]">Powered by Intelligent Core Technology</p>
             <div className="w-1 h-1 bg-slate-200 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
