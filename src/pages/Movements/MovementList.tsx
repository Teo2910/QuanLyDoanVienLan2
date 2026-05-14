import React, { useEffect, useState, useRef } from "react";
import { Plus, Award, Calendar, FileText, CheckCircle2, Clock, ChevronRight, BarChart3, Upload, Image as ImageIcon, Send, ExternalLink, Trash2, Sparkles, Wand2, Loader2 } from "lucide-react";
import { dataService } from "../../services/dataService";
import { Movement, Unit, MovementReport, Attachment } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useLiveSync } from "../../hooks/useLiveSync";
import { GoogleGenAI, Type } from "@google/genai";

export const MovementList: React.FC = () => {
  const { profile } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [reports, setReports] = useState<MovementReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isViewingReportModalOpen, setIsViewingReportModalOpen] = useState(false);
  
  // Selected items
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [viewingReport, setViewingReport] = useState<MovementReport | null>(null);
  const [editingMovement, setEditingMovement] = useState<Partial<Movement> | null>(null);
  const [editingReport, setEditingReport] = useState<MovementReport | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  
  // Form States
  const [newMovement, setNewMovement] = useState<Partial<Movement>>({
    title: "",
    startDate: "",
    endDate: "",
    description: "",
    attachments: [],
    participatingUnitIds: []
  });
  
  const [newReport, setNewReport] = useState<Partial<MovementReport>>({
    description: "",
    attachments: []
  });

  const fileReportInputRef = useRef<HTMLInputElement>(null);

  const handleReportFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File quá lớn. Vui lòng chọn file dưới 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setNewReport(prev => ({
        ...prev,
        attachments: [
          ...(prev.attachments || []),
          { name: file.name, url: base64, type: file.type.startsWith("image/") ? "Image" : "File" }
        ]
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = ""; 
  };

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [mems, units, reps] = await Promise.all([
        dataService.getMovements(),
        dataService.getUnits(),
        dataService.getMovementReports()
      ]);
      setMovements(mems);
      setUnits(units);
      setReports(reps);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useLiveSync("movements:changed", loadData);
  useLiveSync("movement-reports:changed", loadData);

  const isAdmin = profile?.role === "admin";

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Hãy gợi ý một PHONG TRÀO đoàn thanh niên hoặc sinh viên với chủ đề: ${aiPrompt}. 
        CHÚ Ý: Đây là PHONG TRÀO (Movement) chính thức, cần có kế hoạch nộp báo cáo từ các đơn vị cấp dưới, không phải chỉ là một hoạt động (Activity) thông thường.
        Yêu cầu trả về kết quả bằng tiếng Việt, ngôn ngữ trang trọng, lôi cuốn.
        Hãy bao gồm các đơn vị tham gia phù hợp (ví dụ: Liên chi đoàn Khoa CNTT, v.v.)`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Tiêu đề phong trào" },
              description: { type: Type.STRING, description: "Mô tả chi tiết và mục đích phong trào" },
              participatingUnits: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Danh sách tên các đơn vị tham gia (nếu có)"
              }
            },
            required: ["title", "description"]
          }
        }
      });

      const result = JSON.parse(response.text);
      
      setNewMovement({
        ...newMovement,
        title: result.title,
        description: result.description,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      
      setIsAIModalOpen(false);
      setIsCreateModalOpen(true);
      setAiPrompt("");
    } catch (err: any) {
      console.error(err);
      alert(`Lỗi AI: ${err.message}`);
    } finally {
      setIsAiGenerating(false);
    }
  };
  
  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMovement.title || !profile?.uid) return;
    
    try {
      await dataService.addMovement({
        ...newMovement as any,
        creatorId: profile.uid,
        participatingUnitIds: newMovement.participatingUnitIds?.length ? newMovement.participatingUnitIds : units.map(u => u.id)
      });
      setIsCreateModalOpen(false);
      setNewMovement({ title: "", startDate: "", endDate: "", description: "", attachments: [], participatingUnitIds: [] });
    } catch (err: any) {
      alert(`Lỗi khi tạo phong trào: ${err.message || "Lỗi không xác định"}`);
    }
  };

  const handleUpdateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovement?.id || !profile?.uid) return;
    
    try {
      await dataService.updateMovement(editingMovement.id, {
        ...editingMovement as any,
        participatingUnitIds: editingMovement.participatingUnitIds?.length ? editingMovement.participatingUnitIds : units.map(u => u.id)
      });
      setIsEditModalOpen(false);
      setEditingMovement(null);
      if (selectedMovement?.id === editingMovement.id) {
        // Update selected movement in detail modal if open
        const updated = await dataService.getMovements();
        const fresh = updated.find(m => m.id === editingMovement.id);
        if (fresh) setSelectedMovement(fresh);
      }
    } catch (err: any) {
      alert(`Lỗi khi cập nhật phong trào: ${err.message || "Lỗi không xác định"}`);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovement || !profile?.unitId) return;
    
    try {
      if (editingReport) {
        await dataService.updateMovementReport(editingReport.id, {
          description: newReport.description || "",
          attachments: newReport.attachments || []
        });
      } else {
        await dataService.addMovementReport({
          movementId: selectedMovement.id,
          unitId: profile.unitId,
          description: newReport.description || "",
          attachments: newReport.attachments || []
        });
      }
      setIsReportModalOpen(false);
      setEditingReport(null);
      setNewReport({ description: "", attachments: [] });
    } catch (err: any) {
      alert(`Lỗi khi gửi báo cáo: ${err.message || "Lỗi không xác định"}`);
    }
  };

  // Filter movements for the current user
  const visibleMovements = isAdmin 
    ? movements 
    : movements.filter(m => m.participatingUnitIds.includes(profile?.unitId || ""));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-12 pb-20 px-4 sm:px-0">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 sm:gap-8">
        <div>
          <h2 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter leading-[1.1] mb-3 sm:mb-4">
            {profile?.role === "admin" ? "Chiến dịch & Báo cáo" : "Báo cáo phong trào"}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
             <div className="px-3 py-1 bg-accent/10 text-accent rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest border border-accent/20">
               Hệ thống tập trung
             </div>
             <p className="text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.1em] sm:tracking-[0.2em]">
               {isAdmin ? "Quản lý và điều phối các đơn vị cơ sở" : "Kênh báo cáo chính thức cấp chi đoàn"}
             </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAIModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-8 py-4 sm:py-5 bg-white border border-slate-200 text-slate-600 rounded-2xl sm:rounded-3xl font-black uppercase tracking-widest text-[10px] sm:text-[11px] shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all"
            >
              <Sparkles size={18} className="text-accent animate-pulse" />
              Sáng tạo AI
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-8 py-4 sm:py-5 bg-slate-900 text-white rounded-2xl sm:rounded-3xl font-black uppercase tracking-widest text-[10px] sm:text-[11px] shadow-2xl shadow-slate-900/20 hover:bg-accent transition-all"
            >
              <Plus size={18} strokeWidth={2.5} />
              Lễ ra quân
            </motion.button>
          </div>
        )}
      </div>

      {isAdmin && (
        <section className="bg-white border border-slate-200 rounded-2xl sm:rounded-[3.5rem] overflow-hidden shadow-2xl shadow-slate-200/40 flex flex-col">
          <div className="p-6 sm:p-10 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-4 sm:gap-5 w-full sm:w-auto">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-accent/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-accent shadow-[inset_0_0_20px_rgba(37,99,235,0.05)]">
                   <BarChart3 size={20} className="sm:w-6 sm:h-6" strokeWidth={2.5} />
                </div>
                <div>
                   <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Tổng cục phong trào</h3>
                   <p className="text-[8px] sm:text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] mt-0.5 sm:mt-1">Dữ liệu thời gian thực</p>
                </div>
             </div>
             <div className="lg:hidden flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-slate-400">
               <span className="text-[8px] font-black uppercase tracking-tighter">Trượt ngang để xem chi tiết</span>
             </div>
          </div>
          <div className="overflow-x-auto no-scrollbar relative min-h-[300px]">
             {/* Mobile Scroll Hint Overlay */}
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/30">
                  <th className="px-6 sm:px-10 py-5 sm:py-8 text-[9px] sm:text-[11px] uppercase font-black tracking-[0.15em] sm:tracking-[0.2em] text-slate-400 border-b border-slate-100">Phong trào & Chiến dịch</th>
                  <th className="px-6 sm:px-10 py-5 sm:py-8 text-[9px] sm:text-[11px] uppercase font-black tracking-[0.15em] sm:tracking-[0.2em] text-slate-400 border-b border-slate-100 text-center">Đơn vị</th>
                  <th className="px-6 sm:px-10 py-5 sm:py-8 text-[9px] sm:text-[11px] uppercase font-black tracking-[0.15em] sm:tracking-[0.2em] text-slate-400 border-b border-slate-100 text-center">Đã báo</th>
                  <th className="px-6 sm:px-10 py-5 sm:py-8 text-[9px] sm:text-[11px] uppercase font-black tracking-[0.15em] sm:tracking-[0.2em] text-slate-400 border-b border-slate-100 text-center">Tổng nộp</th>
                  <th className="px-6 sm:px-10 py-5 sm:py-8 text-[9px] sm:text-[11px] uppercase font-black tracking-[0.15em] sm:tracking-[0.2em] text-slate-400 border-b border-slate-100 text-right">Mức độ hoàn thành</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {movements.map((movement) => {
                  const movementReports = reports.filter(r => r.movementId === movement.id);
                  const reportedCount = movementReports.length;
                  const totalSubmissions = movementReports.reduce((sum, r) => sum + (r.submissionCount || 1), 0);
                  const totalUnits = movement.participatingUnitIds.length;
                  const rate = totalUnits > 0 ? (reportedCount / totalUnits * 100).toFixed(1) : "0.0";

                  return (
                    <motion.tr 
                      key={movement.id}
                      onClick={() => {
                        setSelectedMovement(movement);
                        setIsDetailModalOpen(true);
                      }}
                      whileHover={{ backgroundColor: "rgba(37,99,235,0.02)" }}
                      className="cursor-pointer transition-all duration-300 group"
                    >
                      <td className="px-6 sm:px-10 py-6 sm:py-8">
                        <div className="flex items-center gap-3 sm:gap-4">
                           <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-accent rounded-full lg:opacity-0 lg:group-hover:opacity-100 transition-all lg:scale-0 lg:group-hover:scale-100" />
                           <span className="text-sm sm:text-base font-black text-slate-700 group-hover:text-accent group-hover:translate-x-1 sm:group-hover:translate-x-2 transition-all">{movement.title}</span>
                        </div>
                      </td>
                      <td className="px-6 sm:px-10 py-6 sm:py-8 text-center">
                        <span className="text-xs sm:text-sm font-black text-slate-400 tabular-nums">{totalUnits}</span>
                      </td>
                      <td className="px-6 sm:px-10 py-6 sm:py-8 text-center">
                        <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-50 text-emerald-600 font-black text-xs sm:text-sm tabular-nums">
                           {reportedCount}
                        </div>
                      </td>
                      <td className="px-6 sm:px-10 py-6 sm:py-8 text-center">
                        <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-accent/5 text-accent font-black text-xs sm:text-sm tabular-nums border border-accent/10">
                           {totalSubmissions}
                        </div>
                      </td>
                      <td className="px-6 sm:px-10 py-6 sm:py-8 text-right">
                         <div className="flex items-center justify-end gap-4 sm:gap-6">
                            <div className="w-24 sm:w-32 h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner shrink-0">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${rate}%` }}
                                 className={cn(
                                   "h-full transition-all duration-1000",
                                   Number(rate) >= 80 ? "bg-emerald-500" : Number(rate) >= 50 ? "bg-accent" : "bg-orange-500"
                                 )}
                               />
                            </div>
                            <span className={cn(
                              "text-xs sm:text-sm font-black w-12 sm:w-14 tabular-nums transition-colors",
                              Number(rate) >= 80 ? "text-emerald-600" : Number(rate) >= 50 ? "text-accent" : "text-orange-600"
                            )}>{rate}%</span>
                         </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
        {visibleMovements.map((movement, idx) => {
          const unitReports = reports.filter(r => r.movementId === movement.id);
          const hasReported = !isAdmin && unitReports.some(r => r.unitId === profile?.unitId);
          const reportRate = movement.participatingUnitIds.length > 0 
            ? (unitReports.length / movement.participatingUnitIds.length) * 100 
            : 0;

          return (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={movement.id}
              onClick={() => {
                setSelectedMovement(movement);
                setIsDetailModalOpen(true);
              }}
              className="bg-white border border-slate-200 rounded-2xl sm:rounded-[3rem] p-6 sm:p-10 hover:shadow-2xl hover:shadow-slate-200/60 hover:-translate-y-2 transition-all group cursor-pointer relative overflow-hidden flex flex-col h-full"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/[0.03] rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-accent/[0.08] transition-all" />

              <div className="flex justify-between items-start mb-6 sm:mb-8 relative z-10 shrink-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center text-slate-400 group-hover:bg-accent group-hover:text-white group-hover:rotate-6 transition-all duration-500 shadow-sm">
                  <Award size={24} className="sm:w-8 sm:h-8" strokeWidth={2.5} />
                </div>
                <div className={cn(
                  "px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest border transition-all",
                  hasReported ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-orange-50 border-orange-100 text-orange-600"
                )}>
                  {isAdmin ? `${unitReports.length}/${movement.participatingUnitIds.length} Báo cáo` : hasReported ? "Hoàn thành" : "Chờ nộp"}
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-3 sm:mb-4 group-hover:text-accent transition-colors leading-tight line-clamp-2">
                {movement.title}
              </h3>

              {movement.description && (
                <p className="text-[12px] sm:text-sm text-slate-500 line-clamp-3 mb-6 sm:mb-10 leading-relaxed font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                  {movement.description}
                </p>
              )}
              
              <div className="space-y-4 mb-8 sm:mb-10 relative z-10 mt-auto">
                <div className="flex items-center gap-3 sm:gap-4 text-slate-500">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-accent shrink-0">
                    <Calendar size={18} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] sm:text-[10px] uppercase font-black text-slate-400 tracking-widest leading-none mb-1">Giai đoạn</p>
                    <p className="text-xs sm:text-sm font-black text-slate-700 tabular-nums truncate">{movement.startDate} — {movement.endDate}</p>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="pt-6 sm:pt-8 border-t border-slate-100 relative z-10 shrink-0">
                  <div className="flex justify-between items-center mb-2.5 sm:mb-3">
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold">Thống kê chiến dịch</span>
                    <span className="text-xs font-black text-slate-900 tabular-nums">{Math.round(reportRate)}%</span>
                  </div>
                  <div className="h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${reportRate}%` }}
                      className={cn(
                        "h-full transition-all duration-1000",
                        reportRate >= 80 ? "bg-emerald-500" : reportRate >= 50 ? "bg-accent" : "bg-orange-500"
                      )}
                    />
                  </div>
                </div>
              )}

              {!isAdmin && (
                <div className="mt-8 flex justify-end gap-3 relative z-10 shrink-0">
                   {!hasReported ? (
                     <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMovement(movement);
                        setEditingReport(null);
                        setNewReport({ description: "", attachments: [] });
                        setIsReportModalOpen(true);
                      }}
                      className="w-full py-4 bg-slate-900 text-white rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3 active:scale-95"
                     >
                      Tiến hành báo cáo
                      <ChevronRight size={14} strokeWidth={3} />
                     </button>
                   ) : (
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const myReport = reports.find(r => r.movementId === movement.id && r.unitId === profile?.unitId);
                          if (myReport) {
                            setSelectedMovement(movement);
                            setEditingReport(myReport);
                            setNewReport({
                              description: myReport.description,
                              attachments: myReport.attachments
                            });
                            setIsReportModalOpen(true);
                          }
                        }}
                        className="py-4 bg-slate-50 text-slate-600 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200 active:scale-95"
                      >
                        Sửa đổi
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const myReport = reports.find(r => r.movementId === movement.id && r.unitId === profile?.unitId);
                          if (myReport) {
                            setViewingReport(myReport);
                            setIsViewingReportModalOpen(true);
                          }
                        }}
                        className="py-4 bg-emerald-50 text-emerald-700 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 flex items-center justify-center gap-2 active:scale-95"
                      >
                        Đã nộp
                        <CheckCircle2 size={12} strokeWidth={3} />
                      </button>
                    </div>
                   )}
                </div>
              )}
              
              {isAdmin && (
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingMovement(movement);
                    setIsEditModalOpen(true);
                  }}
                  className="absolute top-6 sm:top-10 right-6 sm:right-10 p-2 sm:p-3 bg-white border border-slate-200 rounded-xl sm:rounded-2xl text-slate-300 hover:text-accent hover:border-accent/30 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                >
                  <Clock size={16} strokeWidth={2.5} />
                </motion.button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedMovement && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
            onClick={() => setIsDetailModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-[2rem] sm:rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 sm:p-10 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                <div className="pr-8">
                  <h3 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tighter mb-2 sm:mb-3">{selectedMovement.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-slate-400">
                    <span className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold">
                      <Calendar size={14} className="text-accent" />
                      {selectedMovement.startDate} — {selectedMovement.endDate}
                    </span>
                    {isAdmin && (
                      <span className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold">
                        <BarChart3 size={14} className="text-accent" />
                        {reports.filter(r => r.movementId === selectedMovement.id).length} báo cáo / {selectedMovement.participatingUnitIds.length} đơn vị
                      </span>
                    )}
                    {isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMovement(selectedMovement);
                          setIsEditModalOpen(true);
                        }}
                        className="flex items-center gap-2 text-[9px] sm:text-[10px] uppercase tracking-widest font-black text-accent hover:text-blue-700 transition-colors"
                      >
                        <Clock size={12} className="sm:w-[14px] sm:h-[14px]" /> Chỉnh sửa
                      </button>
                    )}
                  </div>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 sm:p-3 bg-slate-100 hover:bg-slate-200 rounded-xl sm:rounded-2xl text-slate-400 hover:text-slate-900 transition-all absolute top-6 right-6 sm:static">
                  <Plus size={20} className="sm:w-6 sm:h-6 rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                <div className={cn("grid grid-cols-1 gap-8 sm:gap-12", isAdmin ? "lg:grid-cols-10" : "max-w-2xl mx-auto")}>
                  <div className={cn("space-y-8 sm:space-y-10", isAdmin ? "lg:col-span-6" : "w-full")}>
                    <section className="bg-slate-50 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[50px] -mr-16 -mt-16 group-hover:bg-accent/10 transition-all duration-700" />
                      <h4 className="text-[10px] uppercase tracking-[0.25em] text-accent font-black mb-4 sm:mb-6 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                        Nội dung chi tiết
                      </h4>
                      <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm lg:text-base font-medium">{selectedMovement.description || "Không có mô tả chi tiết."}</p>
                    </section>

                    {selectedMovement.attachments.length > 0 && (
                      <section>
                        <h4 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-4 ml-2">Tài liệu đính kèm</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedMovement.attachments.map((file, idx) => (
                            <a 
                              key={idx} 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-accent hover:shadow-md transition-all group"
                            >
                              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all">
                                <FileText size={20} />
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-bold text-slate-700 truncate">{file.name}</p>
                                <p className="text-[9px] text-slate-400 uppercase font-bold">{file.type}</p>
                              </div>
                              <ExternalLink size={14} className="text-slate-300 group-hover:text-accent" />
                            </a>
                          ))}
                        </div>
                      </section>
                    )}

                    {!isAdmin && (
                      <section className="pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                           <h4 className="text-[10px] uppercase tracking-[0.2em] text-accent font-black">Báo cáo của bạn</h4>
                           {reports.filter(r => r.movementId === selectedMovement.id && r.unitId === profile?.unitId).length > 0 && (
                             <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                               HOÀN THÀNH
                             </div>
                           )}
                        </div>
                        {reports.filter(r => r.movementId === selectedMovement.id && r.unitId === profile?.unitId).length > 0 ? (
                           reports.filter(r => r.movementId === selectedMovement.id && r.unitId === profile?.unitId).map((rep) => (
                            <div key={rep.id} className="relative p-6 sm:p-8 bg-emerald-50/30 border border-emerald-100 rounded-2xl sm:rounded-[2.5rem] overflow-hidden group shadow-sm">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-[40px] -mr-12 -mt-12" />
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4 text-emerald-600 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 size={16} />
                                    <span>Đã nộp báo cáo vào</span>
                                  </div>
                                  <span className="sm:ml-1 text-slate-500">
                                    {(() => {
                                      const val = rep.submittedAt;
                                      const d = new Date(typeof val === "number" || (!isNaN(Number(val)) && typeof val === "string") ? Number(val) : val);
                                      return isNaN(d.getTime()) ? "N/A" : d.toLocaleString("vi-VN");
                                    })()}
                                  </span>
                                  {rep.submissionCount && (
                                    <span className="sm:ml-2 px-2 py-0.5 bg-accent/10 text-accent rounded-lg border border-accent/20 font-black inline-block w-fit">
                                      {rep.submissionCount} lần nộp
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs sm:text-sm text-slate-600 mb-6 sm:mb-8 leading-relaxed font-medium">{rep.description}</p>
                                <div className="flex flex-wrap gap-2 mb-6 sm:mb-8">
                                   {rep.attachments.map((att, i) => (
                                     <div key={i} className="px-3 py-2 bg-white rounded-xl text-[8px] sm:text-[9px] text-slate-500 border border-slate-100 flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                                       <FileText size={12} /> {att.name}
                                     </div>
                                   ))}
                                </div>
                                <button 
                                  onClick={() => {
                                    setViewingReport(rep);
                                    setIsViewingReportModalOpen(true);
                                  }}
                                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-accent text-white rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-accent/20"
                                >
                                  Đọc lại báo cáo
                                  <ChevronRight size={14} />
                                </button>
                             </div>
                           ))
                        ) : (
                          <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 sm:p-12 rounded-2xl sm:rounded-[2.5rem] text-center flex flex-col items-center gap-6 group hover:border-accent hover:bg-white transition-all">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-all">
                               <Calendar size={28} className="sm:w-8 sm:h-8" />
                            </div>
                            <div>
                               <p className="text-slate-700 font-bold mb-1">Bạn chưa nộp báo cáo</p>
                               <p className="text-slate-400 text-[10px] sm:text-xs max-w-xs mx-auto">Hãy hoàn thành báo cáo sớm nhất để hoàn tất quy trình phối hợp.</p>
                            </div>
                            <button 
                              onClick={() => {
                                setIsDetailModalOpen(false);
                                setIsReportModalOpen(true);
                              }}
                              className="w-full sm:w-auto px-8 py-4 bg-accent text-white rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all text-center flex items-center justify-center"
                            >
                              Nộp báo cáo ngay
                            </button>
                          </div>
                        )}
                      </section>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="space-y-8 sm:space-y-10 lg:col-span-4 border-l-0 lg:border-l border-slate-100 lg:pl-10 pt-8 lg:pt-0">
                      <section className="bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-sm">
                        <h4 className="text-[10px] uppercase tracking-[0.25em] text-accent font-black mb-6 sm:mb-8 flex items-center justify-between">
                          <span>Thống kê báo cáo</span>
                          <BarChart3 size={14} className="opacity-30" />
                        </h4>
                        <div className="space-y-6 sm:space-y-8">
                          <div className="flex justify-between items-center text-emerald-600">
                             <div className="flex items-center gap-3">
                               <CheckCircle2 size={16} />
                               <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest">Đã báo cáo</span>
                             </div>
                             <span className="text-lg sm:text-xl font-black">{reports.filter(r => r.movementId === selectedMovement.id).length}</span>
                          </div>
                          <div className="flex justify-between items-center text-orange-600">
                             <div className="flex items-center gap-3">
                               <Clock size={16} />
                               <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest">Chưa báo cáo</span>
                             </div>
                             <span className="text-lg sm:text-xl font-black">
                                {selectedMovement.participatingUnitIds.length - reports.filter(r => r.movementId === selectedMovement.id).length}
                             </span>
                          </div>
                          <div className="flex justify-between items-center pt-5 sm:pt-6 border-t border-slate-200 text-slate-400">
                             <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest">Tổng đơn vị</span>
                             <span className="text-base sm:text-lg font-black">{selectedMovement.participatingUnitIds.length}</span>
                          </div>
                        </div>
                      </section>

                      <section>
                        <h4 className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-black mb-6 ml-2">Chi tiết các đơn vị</h4>
                        <div className="space-y-10">
                          {/* Đã báo cáo */}
                          <div>
                            <div className="flex items-center gap-2 mb-4 px-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                              <span className="text-[9px] uppercase tracking-widest text-slate-400 font-black">HOÀN THÀNH ({reports.filter(r => r.movementId === selectedMovement.id).length})</span>
                            </div>
                            <div className="space-y-2">
                              {reports.filter(r => r.movementId === selectedMovement.id).map(r => {
                                const unit = units.find(u => u.id === r.unitId);
                                return (
                                  <motion.div 
                                    key={r.id} 
                                    whileHover={{ x: 4 }}
                                    onClick={() => {
                                      setViewingReport(r);
                                      setIsViewingReportModalOpen(true);
                                    }}
                                    className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-accent hover:shadow-sm transition-all flex items-center justify-between cursor-pointer group"
                                  >
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-700 group-hover:text-accent transition-colors">{unit?.name}</span>
                                        <span className="px-2 py-0.5 bg-accent/10 text-accent text-[9px] font-black rounded-lg border border-accent/10 whitespace-nowrap">
                                          {(r.submissionCount || 1)} lần nộp
                                        </span>
                                      </div>
                                      <span className="text-[8px] text-slate-300 uppercase font-black tracking-tighter">
                                        Nộp ngày {new Date(isNaN(Number(r.submittedAt)) ? r.submittedAt : Number(r.submittedAt)).toLocaleDateString("vi-VN")}
                                      </span>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-300 group-hover:text-accent transition-all" />
                                  </motion.div>
                                );
                              })}
                              {reports.filter(r => r.movementId === selectedMovement.id).length === 0 && (
                                <p className="text-[10px] text-slate-300 px-4 py-6 italic text-center border-2 border-dashed border-slate-50 rounded-2xl">Chưa có dữ liệu</p>
                              )}
                            </div>
                          </div>

                          {/* Chưa báo cáo */}
                          <div>
                            <div className="flex items-center gap-2 mb-4 px-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                              <span className="text-[9px] uppercase tracking-widest text-slate-400 font-black">CHỜ BÁO CÁO ({selectedMovement.participatingUnitIds.length - reports.filter(r => r.movementId === selectedMovement.id).length})</span>
                            </div>
                            <div className="space-y-2">
                              {selectedMovement.participatingUnitIds
                                .filter(uid => !reports.some(r => r.movementId === selectedMovement.id && r.unitId === uid))
                                .map(uid => {
                                  const unit = units.find(u => u.id === uid);
                                  return (
                                    <div key={uid} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center justify-between group transition-all">
                                      <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors">{unit?.name}</span>
                                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500/20 animate-pulse" />
                                    </div>
                                  );
                                })}
                              {selectedMovement.participatingUnitIds.filter(uid => !reports.some(r => r.movementId === selectedMovement.id && r.unitId === uid)).length === 0 && (
                                <p className="text-[10px] text-emerald-500/50 px-4 py-8 italic text-center border-2 border-dashed border-emerald-50 rounded-2xl font-black">100% HOÀN THÀNH</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Detail Modal for Admin */}
      <AnimatePresence>
        {isViewingReportModalOpen && viewingReport && (
          <div 
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
            onClick={() => setIsViewingReportModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl sm:rounded-[3rem] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 sm:p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div className="pr-12 sm:pr-0">
                  <h4 className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-accent font-black mb-2">Báo cáo chi tiết</h4>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {units.find(u => u.id === viewingReport.unitId)?.name || "Đơn vị ẩn"}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                    <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold">
                      Nộp ngày: {(() => {
                        if (!viewingReport.submittedAt) return "N/A";
                        const val = viewingReport.submittedAt;
                        const d = new Date(typeof val === "number" || (!isNaN(Number(val)) && typeof val === "string") ? Number(val) : val);
                        return isNaN(d.getTime()) ? "N/A" : d.toLocaleString("vi-VN");
                      })()}
                    </p>
                    {viewingReport.submissionCount && (
                      <span className="px-2 py-1 bg-accent/10 text-accent text-[7px] sm:text-[8px] font-black rounded-lg uppercase tracking-tighter">
                         Số lần báo cáo: {viewingReport.submissionCount}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setIsViewingReportModalOpen(false)} className="p-2 sm:p-3 bg-slate-100 hover:bg-slate-200 rounded-xl sm:rounded-2xl text-slate-400 hover:text-slate-900 transition-all absolute top-6 right-6 sm:static">
                  <Plus size={20} className="sm:w-6 sm:h-6 rotate-45" />
                </button>
              </div>
              <div className="p-6 sm:p-10 overflow-y-auto custom-scrollbar flex-1">
                <div className="mb-8 sm:mb-10">
                  <label className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 sm:mb-4 block">Nội dung báo cáo</label>
                  <div className="p-5 sm:p-6 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100">
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-xs sm:text-sm font-medium">{viewingReport.description}</p>
                  </div>
                </div>

                {viewingReport.attachments.length > 0 && (
                  <div>
                    <label className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 sm:mb-4 block">Minh chứng đính kèm</label>
                    <div className="space-y-4 sm:space-y-6">
                      {/* Image Preview Gallery */}
                      {viewingReport.attachments.some(a => a.type === "Image") && (
                        <div className="grid grid-cols-1 gap-4">
                          {viewingReport.attachments.filter(a => a.type === "Image").map((file, idx) => (
                            <div key={`img-${idx}`} className="group relative bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
                              <img 
                                src={file.url} 
                                alt={file.name} 
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 sm:gap-4">
                                <button 
                                  onClick={() => window.open(file.url, '_blank')}
                                  className="p-2 sm:p-3 bg-white/10 text-white rounded-lg sm:rounded-xl backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all flex items-center gap-2"
                                >
                                  <ExternalLink size={14} className="sm:w-4 sm:h-4" />
                                  <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest">Xem ảnh gốc</span>
                                </button>
                                <a 
                                  href={file.url} 
                                  download={file.name}
                                  className="p-2 sm:p-3 bg-accent text-white rounded-lg sm:rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                                >
                                  <Upload size={14} className="sm:w-4 sm:h-4 rotate-180" />
                                  <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest">Tải về</span>
                                </a>
                              </div>
                              <div className="absolute top-3 sm:top-4 left-3 sm:left-4 px-2 sm:px-3 py-1 bg-slate-900/60 backdrop-blur-md rounded-lg border border-white/10">
                                <p className="text-[8px] sm:text-[10px] font-bold text-white uppercase tracking-wider truncate max-w-[150px] sm:max-w-[200px]">{file.name}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* File Links */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {viewingReport.attachments.map((file, idx) => (
                          <a 
                            key={idx} 
                            href={file.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-accent hover:shadow-md transition-all group"
                          >
                            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all">
                              {file.type === "Image" ? <ImageIcon size={20} /> : <FileText size={20} />}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="text-[11px] font-bold text-slate-700 truncate">{file.name}</p>
                              <p className="text-[9px] text-slate-400 uppercase font-bold">{file.type}</p>
                            </div>
                            <ExternalLink size={14} className="text-slate-300 group-hover:text-accent" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 sm:p-10 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setIsViewingReportModalOpen(false)}
                  className="w-full sm:w-auto px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl sm:rounded-2xl font-bold uppercase tracking-widest text-[9px] sm:text-[10px] transition-all"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
          onClick={() => setIsCreateModalOpen(false)}
        >
           <motion.div 
             initial={{ scale: 0.9, opacity: 0, y: 20 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             className="bg-white border border-slate-200 rounded-[2rem] sm:rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl cursor-default"
             onClick={(e) => e.stopPropagation()}
           >
              <div className="p-6 sm:p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Thiết lập phong trào mới</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                  <Plus size={20} className="sm:w-6 sm:h-6 rotate-45" />
                </button>
              </div>
              
              <form onSubmit={handleCreateMovement} className="p-6 sm:p-10 space-y-6 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 sm:mb-3 block">Tiêu đề phong trào</label>
                  <input 
                    required
                    className="w-full px-5 sm:px-6 py-3 sm:py-4 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all font-semibold"
                    value={newMovement.title}
                    onChange={(e) => setNewMovement({...newMovement, title: e.target.value})}
                    placeholder="VD: Mùa hè xanh 2024..."
                  />
                </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 sm:mb-3 block">Ngày bắt đầu</label>
                    <input 
                      type="date"
                      required
                      className="w-full px-5 sm:px-6 py-3 sm:py-4 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all font-semibold"
                      value={newMovement.startDate}
                      onChange={(e) => setNewMovement({...newMovement, startDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 sm:mb-3 block">Ngày kết thúc</label>
                    <input 
                      type="date"
                      required
                      className="w-full px-5 sm:px-6 py-3 sm:py-4 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all font-semibold"
                      value={newMovement.endDate}
                      onChange={(e) => setNewMovement({...newMovement, endDate: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 sm:mb-3 block">Mô tả nội dung</label>
                  <textarea 
                    rows={4}
                    className="w-full px-5 sm:px-6 py-3 sm:py-4 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-none font-medium"
                    value={newMovement.description}
                    onChange={(e) => setNewMovement({...newMovement, description: e.target.value})}
                    placeholder="Nêu rõ yêu cầu, nội dung..."
                  />
                </div>

                <div>
                  <label className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 sm:mb-3 block">Đơn vị tham gia (Mặc định chọn tất cả)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 custom-scrollbar">
                     {units.map(u => (
                        <label key={u.id} className="flex items-center gap-3 cursor-pointer group">
                           <input 
                             type="checkbox"
                             checked={newMovement.participatingUnitIds?.includes(u.id)}
                             onChange={(e) => {
                               const ids = newMovement.participatingUnitIds || [];
                               if (e.target.checked) {
                                 setNewMovement({...newMovement, participatingUnitIds: [...ids, u.id]});
                               } else {
                                 setNewMovement({...newMovement, participatingUnitIds: ids.filter(id => id !== u.id)});
                               }
                             }}
                             className="w-4 h-4 rounded border-slate-200 bg-white text-accent focus:ring-accent/20"
                           />
                           <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors font-medium">{u.name}</span>
                        </label>
                     ))}
                  </div>
                </div>

                <div className="pt-4 sm:pt-6 border-t border-slate-100">
                  <button 
                    type="submit"
                    className="w-full py-4 sm:py-5 bg-accent text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs hover:bg-blue-700 transition-all shadow-xl shadow-accent/20"
                  >
                    Công bố phong trào
                  </button>
                </div>
              </form>
           </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingMovement && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
          onClick={() => setIsEditModalOpen(false)}
        >
           <motion.div 
             initial={{ scale: 0.9, opacity: 0, y: 20 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             className="bg-white border border-slate-200 rounded-[2rem] sm:rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl cursor-default"
             onClick={(e) => e.stopPropagation()}
           >
              <div className="p-6 sm:p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Chỉnh sửa phong trào</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                  <Plus size={20} className="sm:w-6 sm:h-6 rotate-45" />
                </button>
              </div>
              
              <form onSubmit={handleUpdateMovement} className="p-6 sm:p-10 space-y-6 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 sm:mb-3 block">Tiêu đề phong trào</label>
                  <input 
                    required
                    className="w-full px-5 sm:px-6 py-3 sm:py-4 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all font-semibold"
                    value={editingMovement.title}
                    onChange={(e) => setEditingMovement({...editingMovement, title: e.target.value})}
                    placeholder="VD: Mùa hè xanh 2024..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 sm:mb-3 block">Ngày bắt đầu</label>
                    <input 
                      type="date"
                      required
                      className="w-full px-5 sm:px-6 py-3 sm:py-4 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all font-semibold"
                      value={editingMovement.startDate}
                      onChange={(e) => setEditingMovement({...editingMovement, startDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 sm:mb-3 block">Ngày kết thúc</label>
                    <input 
                      type="date"
                      required
                      className="w-full px-5 sm:px-6 py-3 sm:py-4 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all font-semibold"
                      value={editingMovement.endDate}
                      onChange={(e) => setEditingMovement({...editingMovement, endDate: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 sm:mb-3 block">Mô tả nội dung</label>
                  <textarea 
                    rows={4}
                    className="w-full px-5 sm:px-6 py-3 sm:py-4 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-none font-medium"
                    value={editingMovement.description}
                    onChange={(e) => setEditingMovement({...editingMovement, description: e.target.value})}
                    placeholder="Nêu rõ yêu cầu, nội dung..."
                  />
                </div>

                <div>
                  <label className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 sm:mb-3 block">Đơn vị tham gia</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 custom-scrollbar">
                     {units.map(u => (
                        <label key={u.id} className="flex items-center gap-3 cursor-pointer group">
                           <input 
                             type="checkbox"
                             checked={editingMovement.participatingUnitIds?.includes(u.id)}
                             onChange={(e) => {
                               const ids = editingMovement.participatingUnitIds || [];
                               if (e.target.checked) {
                                 setEditingMovement({...editingMovement, participatingUnitIds: [...ids, u.id]});
                               } else {
                                 setEditingMovement({...editingMovement, participatingUnitIds: ids.filter(id => id !== u.id)});
                               }
                             }}
                             className="w-4 h-4 rounded border-slate-200 bg-white text-accent focus:ring-accent/20"
                           />
                           <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors font-medium">{u.name}</span>
                        </label>
                     ))}
                  </div>
                </div>

                <div className="pt-4 sm:pt-6 border-t border-slate-100">
                  <button 
                    type="submit"
                    className="w-full py-4 sm:py-5 bg-accent text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs hover:bg-blue-700 transition-all shadow-xl shadow-accent/20"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </form>
           </div>
        </div>
      )}

      {/* Report Modal */}
      {isReportModalOpen && selectedMovement && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
          onClick={() => setIsReportModalOpen(false)}
        >
           <motion.div 
             initial={{ scale: 0.9, opacity: 0, y: 20 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             className="bg-white border border-slate-200 rounded-2xl sm:rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col cursor-default"
             onClick={(e) => e.stopPropagation()}
           >
              <div className="p-6 sm:p-10 border-b border-slate-100 bg-slate-50/50">
                 <h4 className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-accent font-black mb-2">
                   {editingReport ? "Cập nhật báo cáo phong trào" : "Báo cáo phong trào"}
                 </h4>
                 <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{selectedMovement.title}</h3>
              </div>
              
              <form onSubmit={handleCreateReport} className="p-6 sm:p-10 space-y-6 sm:space-y-8">
                 <div>
                    <label className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 sm:mb-3 block">Mô tả kết quả thực hiện</label>
                    <textarea 
                      required
                      rows={6}
                      className="w-full px-5 sm:px-6 py-3 sm:py-4 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-none font-medium"
                      value={newReport.description}
                      onChange={(e) => setNewReport({...newReport, description: e.target.value})}
                      placeholder="Nêu tóm tắt các kết quả đạt được..."
                    />
                 </div>

                 <div>
                    <label className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 sm:mb-3 block">Hình ảnh & File minh chứng</label>
                    <div className="space-y-4">
                       <div className="flex flex-col gap-3">
                          <input 
                            type="file"
                            hidden
                            ref={fileReportInputRef}
                            onChange={handleReportFileUpload}
                            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                          />
                          <button 
                            type="button"
                            onClick={() => fileReportInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-slate-600 hover:bg-slate-100 transition-all group"
                          >
                             <Upload size={18} className="text-accent group-hover:scale-110 transition-transform" />
                             <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-center">Tải tệp lên</span>
                          </button>
                          
                          <div className="flex flex-col sm:flex-row gap-2">
                             <input 
                               className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 text-[10px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-accent/20 font-semibold"
                               placeholder="Tên tệp (Link)"
                               id="att-name"
                             />
                             <div className="flex gap-2">
                               <input 
                                 className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 text-[10px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-accent/20 font-semibold"
                                 placeholder="URL đính kèm"
                                 id="att-url"
                               />
                               <button 
                                 type="button"
                                 onClick={() => {
                                   const nameEl = document.getElementById("att-name") as HTMLInputElement;
                                   const urlEl = document.getElementById("att-url") as HTMLInputElement;
                                   if (nameEl.value && urlEl.value) {
                                     setNewReport({
                                       ...newReport,
                                       attachments: [...(newReport.attachments || []), { name: nameEl.value, url: urlEl.value, type: "File" }]
                                     });
                                     nameEl.value = "";
                                     urlEl.value = "";
                                   }
                                 }}
                                 className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                               >
                                 <Plus size={16} />
                               </button>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex flex-wrap gap-2">
                          {newReport.attachments?.map((att, i) => (
                            <div key={i} className="px-3 py-2 bg-white border border-slate-100 rounded-xl text-[9px] sm:text-[10px] text-slate-500 flex items-center gap-2 group shadow-sm">
                               {att.type === "Image" ? <ImageIcon size={12} className="text-accent" /> : <FileText size={12} className="text-accent" />}
                               <span className="truncate max-w-[100px] font-medium">{att.name}</span>
                               <button 
                                 type="button" 
                                 onClick={() => setNewReport({...newReport, attachments: newReport.attachments?.filter((_, idx) => idx !== i)})}
                                 className="text-slate-300 hover:text-red-500 ml-auto"
                               >
                                 <Plus size={12} className="rotate-45" />
                               </button>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className="pt-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button 
                      type="button"
                      onClick={() => setIsReportModalOpen(false)}
                      className="w-full py-4 sm:py-5 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl sm:rounded-2xl font-bold uppercase tracking-widest text-[9px] sm:text-[10px] hover:text-slate-600 transition-all font-black"
                    >
                       Hủy bỏ
                    </button>
                    <button 
                      type="submit"
                      className="w-full py-4 sm:py-5 bg-accent text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] hover:bg-blue-700 transition-all shadow-xl shadow-accent/20 flex items-center justify-center gap-3"
                    >
                       <Send size={16} />
                       {editingReport ? "Cập nhật" : "Gửi báo cáo"}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
      {/* AI Prompt Modal */}
      <AnimatePresence>
        {isAIModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
            onClick={() => setIsAIModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white border border-slate-200 rounded-2xl sm:rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 sm:p-10 border-b border-slate-100 bg-slate-50/50">
                 <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-accent">
                       <Sparkles size={20} className="sm:w-6 sm:h-6" />
                    </div>
                    <div>
                       <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Trợ lý AI</h3>
                       <p className="text-slate-400 text-[8px] sm:text-[10px] uppercase tracking-widest font-bold">Gợi ý phong trào thông minh</p>
                    </div>
                 </div>
              </div>
              
              <div className="p-6 sm:p-10 space-y-6 sm:space-y-8">
                 <div>
                    <label className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 sm:mb-4 block">Chủ đề hoặc ý tưởng phong trào</label>
                    <textarea 
                      rows={4}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Ví dụ: Bảo vệ môi trường..."
                      className="w-full px-5 sm:px-8 py-4 sm:py-6 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-[2rem] text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-none text-base sm:text-lg font-medium"
                    />
                 </div>

                 <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button 
                      onClick={() => setIsAIModalOpen(false)}
                      className="w-full py-4 sm:py-6 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl sm:rounded-2xl font-bold uppercase tracking-widest text-[9px] sm:text-[10px] hover:text-slate-600 transition-all"
                    >
                       Hủy bỏ
                    </button>
                    <button 
                      disabled={!aiPrompt.trim() || isAiGenerating}
                      onClick={handleGenerateWithAI}
                      className="w-full py-4 sm:py-6 bg-accent text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-[11px] hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-accent/20 flex items-center justify-center gap-3"
                    >
                       {isAiGenerating ? (
                         <>
                           <Loader2 size={16} className="animate-spin" />
                           Đang sáng tạo...
                         </>
                       ) : (
                         <>
                           <Wand2 size={16} />
                           Bắt đầu sáng tạo
                         </>
                       )}
                    </button>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
