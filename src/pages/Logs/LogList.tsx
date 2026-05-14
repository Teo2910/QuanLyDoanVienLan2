import { useState, useEffect } from "react";
import { dataService } from "../../services/dataService";
import { SystemLog } from "../../types";
import { Activity, Clock, User, Tag, FileText, Smartphone, Shield, AlertTriangle, Plus, Trash2, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

export const LogList = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");
  const [filterEntityType, setFilterEntityType] = useState("all");
  const [filterAction, setFilterAction] = useState("all");

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

  const filteredLogs = logs.filter(log => {
    if (filterEntityType !== "all" && log.entityType !== filterEntityType) return false;
    if (filterAction !== "all" && log.action !== filterAction) return false;
    
    if (filterDate) {
      const ts = Number(log.timestamp);
      const d = new Date(ts);
      const logDate = d.toISOString().split('T')[0];
      if (logDate !== filterDate) return false;
    }
    
    return true;
  });

  const uniqueEntityTypes = Array.from(new Set(logs.map(l => l.entityType)));
  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

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
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10 mb-16 px-2">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="h-0.5 w-12 bg-accent rounded-full" />
             <p className="text-accent text-[9px] sm:text-[11px] uppercase tracking-[0.4em] font-black flex items-center gap-2">
                <Activity size={14} className="animate-pulse" /> Live Monitor
             </p>
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter leading-[0.9]">
            Nhật ký <br /> <span className="text-slate-300">hệ thống</span>
          </h2>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full xl:w-auto">
          <div className="bg-white border border-slate-100 shadow-2xl shadow-slate-200/60 p-2 rounded-[2rem] flex flex-wrap items-center gap-2">
            <div className="relative group">
              <input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="pl-4 pr-10 py-3 text-[10px] font-black text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all appearance-none cursor-pointer"
              />
              <Clock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-hover:text-accent transition-colors" />
            </div>
            
            <select 
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value)}
              className="px-5 py-3 text-[10px] font-black text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all cursor-pointer appearance-none min-w-[160px]"
            >
              <option value="all">TẤT CẢ PHÂN LOẠI</option>
              {uniqueEntityTypes.map(type => (
                <option key={type} value={type}>{type.toUpperCase()}</option>
              ))}
            </select>

            <select 
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-5 py-3 text-[10px] font-black text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all cursor-pointer appearance-none min-w-[160px]"
            >
              <option value="all">TẤT CẢ HÀNH ĐỘNG</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action.toUpperCase()}</option>
              ))}
            </select>

            {(filterDate || filterEntityType !== "all" || filterAction !== "all") && (
              <button 
                onClick={() => {
                  setFilterDate("");
                  setFilterEntityType("all");
                  setFilterAction("all");
                }}
                className="w-11 h-11 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white rounded-[1.2rem] transition-all duration-500 group bg-rose-50/50"
                title="Xóa bộ lọc"
              >
                <RotateCcw size={18} className="group-hover:rotate-180 transition-transform duration-700" />
              </button>
            )}
          </div>

          <div className="bg-slate-900 px-6 py-5 rounded-[2rem] shadow-2xl shadow-slate-900/20 flex items-center gap-6 min-w-[200px] border border-slate-800">
             <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-accent shrink-0 border border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-accent/20 animate-pulse" />
                <Shield size={24} className="relative z-10" />
             </div>
             <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] leading-none mb-1.5">Tổng ghi nhận</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-white tabular-nums leading-none tracking-tighter">
                    {filteredLogs.length}
                  </p>
                  <span className="text-[9px] text-accent font-black uppercase tracking-widest">Bản ghi</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {filteredLogs.length === 0 ? (
          <div className="py-16 sm:py-24 text-center border-4 border-dashed border-slate-100 rounded-2xl sm:rounded-[4rem] bg-slate-50/50">
             <FileText size={40} className="sm:w-12 sm:h-12 mx-auto text-slate-200 mb-4 sm:mb-6" />
             <p className="text-slate-300 uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black text-xs sm:text-sm">
                Không tìm thấy kết quả phù hợp
             </p>
          </div>
        ) : (
          filteredLogs.map((log, index) => (
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
                         const ts = Number(log.timestamp);
                         const d = new Date(ts);
                         if (isNaN(d.getTime())) return "N/A";
                         return d.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                       })()}
                     </span>
                  </div>
                  <p className="text-[8px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1.5 sm:mt-2 bg-slate-50 px-3 py-1 rounded-lg inline-block md:block">
                    {(() => {
                      const ts = typeof log.timestamp === 'string' ? parseInt(log.timestamp) : log.timestamp;
                      const d = new Date(ts);
                      if (isNaN(d.getTime())) return "CHƯA XÁC ĐỊNH";
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
