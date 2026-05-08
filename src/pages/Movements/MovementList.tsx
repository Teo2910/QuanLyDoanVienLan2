import React, { useEffect, useState, useRef } from "react";
import { Plus, Award, Calendar, FileText, CheckCircle2, Clock, ChevronRight, BarChart3, Upload, Image as ImageIcon, Send, ExternalLink, Trash2 } from "lucide-react";
import { dataService } from "../../services/dataService";
import { Movement, Unit, MovementReport, Attachment } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useLiveSync } from "../../hooks/useLiveSync";

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
      await dataService.addMovementReport({
        movementId: selectedMovement.id,
        unitId: profile.unitId,
        description: newReport.description || "",
        attachments: newReport.attachments || []
      });
      setIsReportModalOpen(false);
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
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-5xl font-bold text-white tracking-tighter">Phòng trào & Báo cáo</h2>
          <p className="text-white/40 mt-3 text-xs uppercase tracking-widest font-bold">
            {isAdmin ? "Quản lý và thống kê phong trào đơn vị" : "Hệ thống báo cáo phong trào cơ sở"}
          </p>
        </div>
        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-3 px-6 py-4 bg-accent text-accent-foreground rounded-2xl font-bold uppercase tracking-widest text-[11px] shadow-xl shadow-accent/20"
          >
            <Plus size={16} />
            Phổ biến phong trào
          </motion.button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {visibleMovements.map((movement) => {
          const unitReports = reports.filter(r => r.movementId === movement.id);
          const hasReported = !isAdmin && unitReports.some(r => r.unitId === profile?.unitId);
          const reportRate = movement.participatingUnitIds.length > 0 
            ? (unitReports.length / movement.participatingUnitIds.length) * 100 
            : 0;

          return (
            <motion.div
              key={movement.id}
              layoutId={movement.id}
              onClick={() => {
                setSelectedMovement(movement);
                setIsDetailModalOpen(true);
              }}
              className="bg-surface/50 border border-white/5 rounded-[2.5rem] p-8 hover:bg-surface/80 hover:border-white/10 transition-all group cursor-pointer relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all duration-500">
                  <Award size={28} />
                </div>
                <div className={cn(
                  "px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                  hasReported ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-orange-500/10 border-orange-500/20 text-orange-400"
                )}>
                  {isAdmin ? `${unitReports.length}/${movement.participatingUnitIds.length} Báo cáo` : hasReported ? "Đã báo cáo" : "Chưa báo cáo"}
                </div>
                {isAdmin && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingMovement(movement);
                      setIsEditModalOpen(true);
                    }}
                    className="p-2 bg-white/5 hover:bg-accent hover:text-white rounded-lg text-white/40 transition-all ml-2"
                    title="Chỉnh sửa phong trào"
                  >
                    <Clock size={14} />
                  </button>
                )}
              </div>

              <h3 className="text-2xl font-bold text-white tracking-tight mb-4 group-hover:text-accent transition-colors">
                {movement.title}
              </h3>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-white/40">
                  <Calendar size={14} className="text-accent/60" />
                  <span className="text-xs">{movement.startDate} — {movement.endDate}</span>
                </div>
                <div className="flex items-center gap-3 text-white/40">
                  <Clock size={14} className="text-accent/60" />
                  <span className="text-xs">Tạo lúc: {(() => {
                    const val = movement.createdAt;
                    const d = new Date(typeof val === "number" || (!isNaN(Number(val)) && typeof val === "string") ? Number(val) : val);
                    return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("vi-VN");
                  })()}</span>
                </div>
              </div>

              {isAdmin && (
                <div className="pt-6 border-t border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Tiến độ báo cáo</span>
                    <span className="text-xs font-bold text-white">{Math.round(reportRate)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${reportRate}%` }}
                      className="h-full bg-accent"
                    />
                  </div>
                </div>
              )}

              {!isAdmin && !hasReported && (
                <div className="mt-6 flex justify-end">
                   <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMovement(movement);
                      setIsReportModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-accent/20 text-accent rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-accent hover:text-white transition-all shadow-lg"
                   >
                    Báo cáo ngay
                    <ChevronRight size={12} />
                   </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedMovement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-white/10 rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-10 border-b border-white/5 flex justify-between items-start bg-white/[0.02]">
                <div>
                  <h3 className="text-4xl font-bold text-white tracking-tighter mb-2">{selectedMovement.title}</h3>
                  <div className="flex items-center gap-6 text-white/40">
                    <span className="flex items-center gap-2 text-xs">
                      <Calendar size={14} className="text-accent" />
                      {selectedMovement.startDate} — {selectedMovement.endDate}
                    </span>
                    <span className="flex items-center gap-2 text-xs">
                      <BarChart3 size={14} className="text-accent" />
                      {reports.filter(r => r.movementId === selectedMovement.id).length} báo cáo / {selectedMovement.participatingUnitIds.length} đơn vị
                    </span>
                    {isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMovement(selectedMovement);
                          setIsEditModalOpen(true);
                        }}
                        className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-accent hover:text-white transition-colors"
                      >
                        <Clock size={14} /> Chỉnh sửa
                      </button>
                    )}
                  </div>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/30 hover:text-white transition-all">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2 space-y-10">
                    <section>
                      <h4 className="text-[10px] uppercase tracking-[0.2em] text-accent font-bold mb-4">Nội dung chi tiết</h4>
                      <p className="text-white/70 leading-relaxed whitespace-pre-wrap">{selectedMovement.description || "Không có mô tả chi tiết."}</p>
                    </section>

                    {selectedMovement.attachments.length > 0 && (
                      <section>
                        <h4 className="text-[10px] uppercase tracking-[0.2em] text-accent font-bold mb-4">Tài liệu đính kèm</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedMovement.attachments.map((file, idx) => (
                            <a 
                              key={idx} 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-accent/40 transition-all group"
                            >
                              <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center text-accent">
                                <FileText size={20} />
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-bold text-white truncate">{file.name}</p>
                                <p className="text-[9px] text-white/20 uppercase font-medium">{file.type}</p>
                              </div>
                              <ExternalLink size={14} className="text-white/20 group-hover:text-accent" />
                            </a>
                          ))}
                        </div>
                      </section>
                    )}

                    {!isAdmin && (
                      <section>
                        <h4 className="text-[10px] uppercase tracking-[0.2em] text-accent font-bold mb-4">Báo cáo của bạn</h4>
                        {reports.filter(r => r.movementId === selectedMovement.id && r.unitId === profile?.unitId).length > 0 ? (
                           reports.filter(r => r.movementId === selectedMovement.id && r.unitId === profile?.unitId).map((rep) => (
                             <div key={rep.id} className="bg-green-500/5 border border-green-500/20 p-6 rounded-3xl">
                               <div className="flex items-center gap-3 mb-4 text-green-400">
                                 <CheckCircle2 size={20} />
                                 <span className="text-xs font-bold uppercase tracking-widest">
                                   Đã nộp báo cáo vào {(() => {
                                     const val = rep.submittedAt;
                                     const d = new Date(typeof val === "number" || (!isNaN(Number(val)) && typeof val === "string") ? Number(val) : val);
                                     return isNaN(d.getTime()) ? "N/A" : d.toLocaleString("vi-VN");
                                   })()}
                                 </span>
                               </div>
                               <p className="text-sm text-white/60 mb-6">{rep.description}</p>
                               <div className="flex flex-wrap gap-3">
                                  {rep.attachments.map((att, i) => (
                                    <div key={i} className="px-3 py-2 bg-white/5 rounded-lg text-[10px] text-white/40 border border-white/5 flex items-center gap-2">
                                      <FileText size={12} /> {att.name}
                                    </div>
                                  ))}
                               </div>
                             </div>
                           ))
                        ) : (
                          <div className="bg-white/[0.02] border border-dashed border-white/10 p-10 rounded-3xl text-center">
                            <p className="text-white/40 text-sm mb-6">Bạn chưa nộp báo cáo cho phong trào này</p>
                            <button 
                              onClick={() => {
                                setIsDetailModalOpen(false);
                                setIsReportModalOpen(true);
                              }}
                              className="px-6 py-3 bg-accent text-accent-foreground rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-accent/20"
                            >
                              Nộp báo cáo ngay
                            </button>
                          </div>
                        )}
                      </section>
                    )}
                  </div>

                  <div className="space-y-10">
                    <section>
                      <h4 className="text-[10px] uppercase tracking-[0.2em] text-accent font-bold mb-4">Thống kê báo cáo</h4>
                      <div className="p-6 bg-white/5 rounded-3xl space-y-6 border border-white/5">
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] text-white/40 uppercase font-bold">Đã báo cáo</span>
                           <span className="text-sm font-bold text-green-400">{reports.filter(r => r.movementId === selectedMovement.id).length} đơn vị</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] text-white/40 uppercase font-bold">Chưa báo cáo</span>
                           <span className="text-sm font-bold text-orange-400">
                             {selectedMovement.participatingUnitIds.length - reports.filter(r => r.movementId === selectedMovement.id).length} đơn vị
                           </span>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-white/5">
                           <span className="text-[10px] text-white/40 uppercase font-bold">Tổng đơn vị</span>
                           <span className="text-sm font-bold text-white">{selectedMovement.participatingUnitIds.length} đơn vị</span>
                        </div>
                      </div>
                    </section>

                    {isAdmin && (
                      <section>
                        <h4 className="text-[10px] uppercase tracking-[0.2em] text-accent font-bold mb-4">Danh sách báo cáo</h4>
                        <div className="space-y-3">
                           {reports.filter(r => r.movementId === selectedMovement.id).map(r => {
                             const unit = units.find(u => u.id === r.unitId);
                             return (
                               <div 
                                 key={r.id} 
                                 onClick={() => {
                                   setViewingReport(r);
                                   setIsViewingReportModalOpen(true);
                                 }}
                                 className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-accent/40 transition-all flex items-center gap-3 cursor-pointer group"
                               >
                                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent text-[10px] font-bold group-hover:bg-accent group-hover:text-white transition-all">
                                    {unit?.name.charAt(0)}
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                     <p className="text-xs font-bold text-white truncate">{unit?.name}</p>
                                     <p className="text-[9px] text-white/20 uppercase font-medium">
                                       {(() => {
                                         const d = new Date(isNaN(Number(r.submittedAt)) ? r.submittedAt : Number(r.submittedAt));
                                         return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("vi-VN");
                                       })()}
                                     </p>
                                  </div>
                                  <ChevronRight size={14} className="text-white/20 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                               </div>
                             );
                           })}
                           {reports.filter(r => r.movementId === selectedMovement.id).length === 0 && (
                             <p className="text-[10px] text-center text-white/20 py-4 font-bold uppercase tracking-widest">Chưa có báo cáo nào</p>
                           )}
                        </div>
                      </section>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Detail Modal for Admin */}
      <AnimatePresence>
        {isViewingReportModalOpen && viewingReport && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-background/95 backdrop-blur-3xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-white/10 rounded-[3rem] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-10 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <div>
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-accent font-bold mb-2">Báo cáo chi tiết</h4>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    {units.find(u => u.id === viewingReport.unitId)?.name || "Đơn vị ẩn"}
                  </h3>
                  <p className="text-[10px] text-white/40 uppercase font-medium mt-1">
                    Nộp ngày: {(() => {
                      if (!viewingReport.submittedAt) return "N/A";
                      const val = viewingReport.submittedAt;
                      const d = new Date(typeof val === "number" || (!isNaN(Number(val)) && typeof val === "string") ? Number(val) : val);
                      return isNaN(d.getTime()) ? "N/A" : d.toLocaleString("vi-VN");
                    })()}
                  </p>
                </div>
                <button onClick={() => setIsViewingReportModalOpen(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/30 hover:text-white transition-all">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
                <div className="mb-10">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-4 block">Nội dung báo cáo</label>
                  <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-white/70 leading-relaxed whitespace-pre-wrap text-sm">{viewingReport.description}</p>
                  </div>
                </div>

                {viewingReport.attachments.length > 0 && (
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-4 block">Minh chứng đính kèm</label>
                    <div className="space-y-6">
                      {/* Image Preview Gallery */}
                      {viewingReport.attachments.some(a => a.type === "Image") && (
                        <div className="grid grid-cols-1 gap-4">
                          {viewingReport.attachments.filter(a => a.type === "Image").map((file, idx) => (
                            <div key={`img-${idx}`} className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
                              <img 
                                src={file.url} 
                                alt={file.name} 
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                <button 
                                  onClick={() => window.open(file.url, '_blank')}
                                  className="p-3 bg-white/10 text-white rounded-xl backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all flex items-center gap-2"
                                >
                                  <ExternalLink size={16} />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">Xem ảnh gốc</span>
                                </button>
                                <a 
                                  href={file.url} 
                                  download={file.name}
                                  className="p-3 bg-accent text-accent-foreground rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                                >
                                  <Upload size={16} className="rotate-180" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">Tải về</span>
                                </a>
                              </div>
                              <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                                <p className="text-[10px] font-bold text-white uppercase tracking-wider truncate max-w-[200px]">{file.name}</p>
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
                            className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-accent/40 transition-all group"
                          >
                            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                              {file.type === "Image" ? <ImageIcon size={20} /> : <FileText size={20} />}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="text-[11px] font-bold text-white truncate">{file.name}</p>
                              <p className="text-[9px] text-white/20 uppercase font-medium">{file.type}</p>
                            </div>
                            <ExternalLink size={14} className="text-white/20 group-hover:text-accent" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-10 border-t border-white/5 flex justify-end">
                <button 
                  onClick={() => setIsViewingReportModalOpen(false)}
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all"
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-background/95 backdrop-blur-xl">
           <div className="bg-surface border border-white/10 rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h3 className="text-2xl font-bold text-white tracking-tight">Thiết lập phong trào mới</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-white/20 hover:text-white transition-colors">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              
              <form onSubmit={handleCreateMovement} className="p-10 space-y-6 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Tiêu đề phong trào</label>
                  <input 
                    required
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all"
                    value={newMovement.title}
                    onChange={(e) => setNewMovement({...newMovement, title: e.target.value})}
                    placeholder="VD: Phong trào Thanh niên tình nguyện mùa hè xanh 2024"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Ngày bắt đầu</label>
                    <input 
                      type="date"
                      required
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all [color-scheme:dark]"
                      value={newMovement.startDate}
                      onChange={(e) => setNewMovement({...newMovement, startDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Ngày kết thúc</label>
                    <input 
                      type="date"
                      required
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all [color-scheme:dark]"
                      value={newMovement.endDate}
                      onChange={(e) => setNewMovement({...newMovement, endDate: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Mô tả nội dung</label>
                  <textarea 
                    rows={4}
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all resize-none"
                    value={newMovement.description}
                    onChange={(e) => setNewMovement({...newMovement, description: e.target.value})}
                    placeholder="Nêu rõ yêu cầu, nội dung và các mốc thời gian quan trọng..."
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Đơn vị tham gia (Mặc định chọn tất cả)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-white/5 rounded-2xl border border-white/10 custom-scrollbar">
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
                             className="w-4 h-4 rounded border-white/10 bg-transparent text-accent focus:ring-0"
                           />
                           <span className="text-xs text-white/60 group-hover:text-white transition-colors">{u.name}</span>
                        </label>
                     ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <button 
                    type="submit"
                    className="w-full py-5 bg-accent text-accent-foreground rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all shadow-xl shadow-accent/20"
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-background/95 backdrop-blur-xl">
           <div className="bg-surface border border-white/10 rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h3 className="text-2xl font-bold text-white tracking-tight">Chỉnh sửa phong trào</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-white/20 hover:text-white transition-colors">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              
              <form onSubmit={handleUpdateMovement} className="p-10 space-y-6 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Tiêu đề phong trào</label>
                  <input 
                    required
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all"
                    value={editingMovement.title}
                    onChange={(e) => setEditingMovement({...editingMovement, title: e.target.value})}
                    placeholder="VD: Phong trào Thanh niên tình nguyện mùa hè xanh 2024"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Ngày bắt đầu</label>
                    <input 
                      type="date"
                      required
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all [color-scheme:dark]"
                      value={editingMovement.startDate}
                      onChange={(e) => setEditingMovement({...editingMovement, startDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Ngày kết thúc</label>
                    <input 
                      type="date"
                      required
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all [color-scheme:dark]"
                      value={editingMovement.endDate}
                      onChange={(e) => setEditingMovement({...editingMovement, endDate: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Mô tả nội dung</label>
                  <textarea 
                    rows={4}
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all resize-none"
                    value={editingMovement.description}
                    onChange={(e) => setEditingMovement({...editingMovement, description: e.target.value})}
                    placeholder="Nêu rõ yêu cầu, nội dung và các mốc thời gian quan trọng..."
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Đơn vị tham gia</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-white/5 rounded-2xl border border-white/10 custom-scrollbar">
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
                             className="w-4 h-4 rounded border-white/10 bg-transparent text-accent focus:ring-0"
                           />
                           <span className="text-xs text-white/60 group-hover:text-white transition-colors">{u.name}</span>
                        </label>
                     ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <button 
                    type="submit"
                    className="w-full py-5 bg-accent text-accent-foreground rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all shadow-xl shadow-accent/20"
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-background/95 backdrop-blur-xl">
           <div className="bg-surface border border-white/10 rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
              <div className="p-10 border-b border-white/5 bg-white/[0.02]">
                 <h4 className="text-[10px] uppercase tracking-[0.2em] text-accent font-bold mb-2">Báo cáo phong trào</h4>
                 <h3 className="text-2xl font-bold text-white tracking-tight">{selectedMovement.title}</h3>
              </div>
              
              <form onSubmit={handleCreateReport} className="p-10 space-y-8">
                 <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Mô tả kết quả thực hiện</label>
                    <textarea 
                      required
                      rows={6}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all resize-none"
                      value={newReport.description}
                      onChange={(e) => setNewReport({...newReport, description: e.target.value})}
                      placeholder="Nêu tóm tắt các kết quả đạt được, số lượng đoàn viên tham gia..."
                    />
                 </div>

                 <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Hình ảnh & File minh chứng</label>
                    <div className="space-y-4">
                       <div className="flex flex-col sm:flex-row gap-4">
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
                            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all group"
                          >
                             <Upload size={18} className="text-accent group-hover:scale-110 transition-transform" />
                             <span className="text-[10px] font-bold uppercase tracking-widest text-center">Tải lên từ thiết bị</span>
                          </button>
                          
                          <div className="flex-[2] flex gap-2">
                             <input 
                               className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-xs focus:outline-none"
                               placeholder="Tên tệp (Link)"
                               id="att-name"
                             />
                             <input 
                               className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-xs focus:outline-none"
                               placeholder="URL đính kèm"
                               id="att-url"
                             />
                          </div>
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
                            className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all"
                          >
                            <Plus size={16} />
                          </button>
                       </div>
                       
                       <div className="flex flex-wrap gap-2">
                          {newReport.attachments?.map((att, i) => (
                            <div key={i} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] text-white/60 flex items-center gap-2 group">
                               {att.type === "Image" ? <ImageIcon size={12} className="text-accent" /> : <FileText size={12} className="text-accent" />}
                               <span className="truncate max-w-[100px]">{att.name}</span>
                               <button 
                                 type="button" 
                                 onClick={() => setNewReport({...newReport, attachments: newReport.attachments?.filter((_, idx) => idx !== i)})}
                                 className="text-white/20 hover:text-red-400 ml-auto"
                               >
                                 <Plus size={12} className="rotate-45" />
                               </button>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className="pt-4 flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setIsReportModalOpen(false)}
                      className="flex-1 py-5 bg-white/5 text-white/40 border border-white/10 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:text-white transition-all"
                    >
                       Hủy bỏ
                    </button>
                    <button 
                      type="submit"
                      className="flex-[2] py-5 bg-accent text-accent-foreground rounded-2xl font-black uppercase tracking-widest text-[10px] hover:opacity-90 transition-all shadow-xl shadow-accent/20 flex items-center justify-center gap-3"
                    >
                       <Send size={16} />
                       Gửi báo cáo hệ thống
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};
