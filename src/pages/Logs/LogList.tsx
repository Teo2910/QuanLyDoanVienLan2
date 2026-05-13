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
    <div className="relative min-h-[calc(100vh-8rem)] pb-20 px-4 sm:px-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 sm:gap-8 mb-8 sm:mb-12">
        <div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">Nhật ký hệ thống</h2>
          <p className="text-slate-400 mt-2 text-[8px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black flex items-center gap-2">
             <Activity size={14} className="text-accent sm:w-4 sm:h-4" /> Lịch sử vận hành toàn bộ nền tảng thời gian thực
          </p>
        </div>
        <div className="w-full sm:w-auto bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl border border-slate-100 flex items-center justify-between sm:justify-start gap-4 sm:gap-6">
           <div className="flex flex-col items-end">
              <p className="text-xs sm:text-sm font-black text-slate-900 tabular-nums">{logs.length} bản ghi</p>
              <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest">Đang giám sát</p>
           </div>
           <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-accent/10 flex items-center justify-center text-accent animate-pulse shrink-0">
              <Shield size={20} className="sm:w-6 sm:h-6" />
           </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {logs.length === 0 ? (
          <div className="py-16 sm:py-24 text-center border-4 border-dashed border-slate-100 rounded-2xl sm:rounded-[4rem] bg-slate-50/50">
             <FileText size={40} className="sm:w-12 sm:h-12 mx-auto text-slate-200 mb-4 sm:mb-6" />
             <p className="text-slate-300 uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black text-xs sm:text-sm">
                Dữ liệu đang trống
             </p>
          </div>
        ) : (
          logs.map((log, index) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              key={log.id} 
              className="group relative"
            >
              <div className="bg-white border border-slate-200 p-5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 hover:border-accent transition-all duration-500 flex flex-col md:flex-row items-start md:items-center gap-6 sm:gap-8 min-w-0">
                
                {/* Icon Section */}
                <div className={cn(
                  "w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-[1.6rem] flex items-center justify-center shrink-0 border-2 transition-all duration-500 group-hover:scale-110",
                  log.action.toLowerCase().includes("thêm") ? "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-lg shadow-emerald-500/10" :
                  log.action.toLowerCase().includes("xóa") ? "bg-rose-50 border-rose-100 text-rose-600 shadow-lg shadow-rose-500/10" :
                  log.action.toLowerCase().includes("cập nhật") ? "bg-blue-50 border-blue-100 text-blue-600 shadow-lg shadow-blue-500/10" :
                  "bg-amber-50 border-amber-100 text-amber-600 shadow-lg shadow-amber-500/10"
                )}>
                  {log.action.toLowerCase().includes("thêm") ? <Plus size={20} className="sm:w-7 sm:h-7" strokeWidth={2.5} /> :
                   log.action.toLowerCase().includes("xóa") ? <Trash2 size={18} className="sm:w-6 sm:h-6" strokeWidth={2.5} /> :
                   log.action.toLowerCase().includes("cập nhật") ? <RotateCcw size={18} className="sm:w-6 sm:h-6" strokeWidth={2.5} /> :
                   <Activity size={18} className="sm:w-6 sm:h-6" strokeWidth={2.5} />}
                </div>

                {/* Info Section */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <span className={cn(
                      "px-2 sm:px-3 py-1 rounded-lg text-[8px] sm:text-[10px] font-black tracking-widest uppercase border whitespace-nowrap",
                      getActionColor(log.action)
                    )}>
                      {log.action}
                    </span>
                    <span className="text-[8px] sm:text-[10px] font-black text-slate-300 tracking-widest uppercase tabular-nums">
                       ID: {log.id.slice(-8)}
                    </span>
                  </div>
                  <h4 className="text-lg sm:text-xl font-bold text-slate-900 truncate tracking-tight group-hover:text-accent transition-colors leading-tight">
                    {log.details || log.entityId}
                  </h4>
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-3 sm:mt-4">
                    <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg">
                       <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-white border border-slate-100 flex items-center justify-center">
                          <User size={10} className="text-slate-400 sm:w-3 sm:h-3" />
                       </div>
                       <span className="text-[10px] sm:text-xs font-bold text-slate-600 truncate max-w-[120px]">{log.userName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <Tag size={10} className="text-slate-400 sm:w-3 sm:h-3" />
                       <span className="text-[8px] sm:text-[10px] font-black tracking-widest uppercase text-slate-400">{log.entityType}</span>
                    </div>
                  </div>
                </div>

                {/* Time Section */}
                <div className="w-full md:w-auto shrink-0 text-left md:text-right md:border-l md:border-slate-100 md:pl-8 mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-50">
                  <div className="flex items-center md:justify-end gap-2 text-slate-900 font-black">
                     <Clock size={12} className="text-accent sm:w-3.5 sm:h-3.5" />
                     <span className="text-lg sm:text-xl tabular-nums leading-none">
                       {(() => {
                         const d = new Date(log.timestamp);
                         return d.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                       })()}
                     </span>
                  </div>
                  <p className="text-[8px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1.5 sm:mt-2 bg-slate-50 px-3 py-1 rounded-lg inline-block md:block">
                    {(() => {
                      const d = new Date(log.timestamp);
                      return d.toLocaleDateString("vi-VN");
                    })()}
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
