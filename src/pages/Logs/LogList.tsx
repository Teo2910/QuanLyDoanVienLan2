import { useState, useEffect } from "react";
import { dataService } from "../../services/dataService";
import { SystemLog } from "../../types";
import { Activity, Clock, User, Tag, FileText, Smartphone, Shield, AlertTriangle, Plus, Trash2, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

export const LogList = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const data = await dataService.getLogs();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.toLowerCase().includes("thêm")) return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (action.toLowerCase().includes("xóa")) return "text-rose-600 bg-rose-50 border-rose-100";
    if (action.toLowerCase().includes("cập nhật")) return "text-blue-600 bg-blue-50 border-blue-100";
    return "text-accent bg-accent/5 border-accent/10";
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-32 space-y-6">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 text-[10px] uppercase font-black tracking-[0.2em] animate-pulse">Đang tải nhật ký...</p>
    </div>
  );

  return (
    <div className="relative min-h-[calc(100vh-8rem)] pb-20 bg-[#f8fafc]/50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16 pt-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
               <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-slate-900/20">
                  <Shield size={24} />
               </div>
               <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Nhật ký Hệ thống</h2>
            </div>
            <p className="text-slate-400 text-[10px] uppercase tracking-[0.4em] font-black flex items-center gap-4">
               <div className="w-8 h-px bg-slate-200" /> 
               Giám sát thực thi & Truy vết dữ liệu tập trung
            </p>
          </div>
          <div className="flex gap-4">
             <div className="px-8 py-4 bg-white border border-slate-200 rounded-[2rem] shadow-xl shadow-slate-200/40 flex items-center gap-6">
                <div className="text-right">
                   <p className="text-2xl font-black text-slate-900 tabular-nums leading-none">{logs.length}</p>
                   <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Tổng sự kiện</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent animate-pulse">
                   <Activity size={20} />
                </div>
             </div>
          </div>
        </div>

        <div className="relative">
          {/* Timeline Vertical Line */}
          <div className="absolute left-10 top-0 bottom-0 w-px bg-slate-200 hidden md:block" />

          <div className="space-y-12 relative z-10">
            {logs.length === 0 ? (
              <div className="py-24 text-center border-4 border-dashed border-slate-100 rounded-[4rem] bg-white shadow-inner">
                 <FileText size={48} className="mx-auto text-slate-200 mb-6" />
                 <p className="text-slate-400 uppercase tracking-[0.3em] font-black text-sm">
                   Chưa ghi nhận sự kiện vận hành
                 </p>
              </div>
            ) : (
              logs.map((log, index) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  key={log.id} 
                  className="group relative md:pl-24"
                >
                  {/* Timeline Dot */}
                  <div className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-4 border-white bg-slate-200 group-hover:bg-accent group-hover:scale-125 transition-all duration-500 hidden md:block shadow-sm" />

                  <div className="bg-white border border-slate-100 p-8 rounded-[3rem] shadow-sm hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.06)] hover:border-accent/30 transition-all duration-500 flex flex-col md:flex-row items-start md:items-center gap-10">
                    
                    {/* Action Icon */}
                    <div className={cn(
                      "w-20 h-20 rounded-[2.2rem] flex items-center justify-center shrink-0 border-2 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6",
                      log.action.toLowerCase().includes("thêm") ? "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-xl shadow-emerald-500/10" :
                      log.action.toLowerCase().includes("xóa") ? "bg-rose-50 border-rose-100 text-rose-600 shadow-xl shadow-rose-500/10" :
                      log.action.toLowerCase().includes("cập nhật") ? "bg-blue-50 border-blue-100 text-blue-600 shadow-xl shadow-blue-500/10" :
                      "bg-slate-50 border-slate-100 text-slate-400 shadow-xl shadow-slate-500/10"
                    )}>
                      {log.action.toLowerCase().includes("thêm") ? <Plus size={32} strokeWidth={3} /> :
                       log.action.toLowerCase().includes("xóa") ? <Trash2 size={28} strokeWidth={2.5} /> :
                       log.action.toLowerCase().includes("cập nhật") ? <RotateCcw size={28} strokeWidth={2.5} /> :
                       <Activity size={28} strokeWidth={2.5} />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-4 mb-4">
                        <span className={cn(
                          "px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border transition-colors",
                          log.action.toLowerCase().includes("thêm") ? "text-emerald-600 bg-emerald-50 border-emerald-100" :
                          log.action.toLowerCase().includes("xóa") ? "text-rose-600 bg-rose-50 border-rose-100" :
                          log.action.toLowerCase().includes("cập nhật") ? "text-blue-600 bg-blue-50 border-blue-100" :
                          "text-slate-400 bg-slate-50 border-slate-100"
                        )}>
                          {log.action}
                        </span>
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg">
                           <Smartphone size={10} className="text-slate-400" />
                           <span className="text-[10px] font-black text-slate-400 tracking-wider font-mono">
                             ID: {log.id.slice(-8).toUpperCase()}
                           </span>
                        </div>
                      </div>
                      
                      <h4 className="text-2xl font-black text-slate-900 truncate tracking-tight group-hover:text-accent transition-colors duration-300">
                        {log.details || log.entityId}
                      </h4>

                      <div className="flex flex-wrap items-center gap-8 mt-6">
                        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
                           <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center">
                              <User size={14} className="text-slate-400" />
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Người vận hành</span>
                              <span className="text-sm font-black text-slate-900">{log.userName}</span>
                           </div>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Thực thể</span>
                           <div className="flex items-center gap-2">
                             <Tag size={12} className="text-accent" />
                             <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{log.entityType}</span>
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* Timestamp Card */}
                    <div className="shrink-0 flex flex-col items-center md:items-end md:border-l md:border-slate-100 md:pl-10 h-full justify-center">
                       <div className="flex items-center gap-3 text-slate-900 font-black mb-2">
                          <Clock size={16} className="text-accent" />
                          <span className="text-3xl tabular-nums leading-none tracking-tighter">
                            {(() => {
                              const d = new Date(log.timestamp);
                              return d.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            })()}
                          </span>
                       </div>
                       <div className="px-4 py-2 bg-slate-900 text-white rounded-xl shadow-xl shadow-slate-900/20 transform group-hover:-translate-x-2 transition-transform duration-500">
                          <p className="text-[10px] font-black uppercase tracking-widest">
                            {(() => {
                              const d = new Date(log.timestamp);
                              return d.toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' });
                            })()}
                          </p>
                       </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
