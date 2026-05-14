import { useState, useEffect, useRef } from "react";
import { dataService } from "../../services/dataService";
import { SystemLog } from "../../types";
import { Activity, Clock, User, Tag, FileText, Shield, Plus, Trash2, RotateCcw, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

const CustomSelect = ({ 
  value, 
  onChange, 
  options, 
  placeholder,
  className 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: { value: string; label: string }[];
  placeholder: string;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-3 text-[10px] font-black text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all cursor-pointer group"
      >
        <span className="truncate uppercase tracking-wider">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown 
          size={14} 
          className={cn("text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-50 mt-2 w-full min-w-[200px] bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden py-2"
          >
            <div className="max-h-[300px] overflow-y-auto no-scrollbar">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-[10px] font-bold text-left transition-colors",
                    value === option.value 
                      ? "bg-accent/5 text-accent" 
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span className="uppercase tracking-wider">{option.label}</span>
                  {value === option.value && <Check size={12} className="text-accent" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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

  const entityTypeOptions = [
    { value: "all", label: "TẤT CẢ PHÂN LOẠI" },
    ...uniqueEntityTypes.map(type => ({ value: type, label: type.toUpperCase() }))
  ];

  const actionOptions = [
    { value: "all", label: "TẤT CẢ HÀNH ĐỘNG" },
    ...uniqueActions.map(action => ({ value: action, label: action.toUpperCase() }))
  ];

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
    <div className="relative min-h-[calc(100vh-8rem)] pb-20 px-4 sm:px-10 lg:px-16 max-w-[1800px] mx-auto">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-12 mb-20 mt-10">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
             <div className="h-0.5 w-12 bg-accent rounded-full" />
             <p className="text-accent text-[10px] sm:text-[12px] uppercase tracking-[0.4em] font-black flex items-center gap-2">
                <Activity size={16} className="animate-pulse" /> Live Monitoring
             </p>
          </div>
          <h2 className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tighter leading-tight">
            Nhật ký <span className="text-slate-300">hệ thống</span>
          </h2>
          <p className="text-slate-400 text-sm font-medium max-w-lg leading-relaxed">
            Giám sát toàn bộ hoạt động nghiệp vụ và thay đổi dữ liệu trên toàn nền tảng theo thời gian thực.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6 w-full xl:w-auto">
          <div className="bg-white border border-slate-100 shadow-xl p-2.5 rounded-[2.5rem] flex flex-wrap items-center gap-2.5">
            <div className="relative group">
              <input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="pl-5 pr-12 py-4 text-[11px] font-black text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-[1.5rem] border border-slate-100 focus:outline-none focus:ring-8 focus:ring-accent/5 transition-all appearance-none cursor-pointer h-[52px]"
              />
              <Clock size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-hover:text-accent transition-colors" />
            </div>
            
            <CustomSelect 
              value={filterEntityType}
              onChange={setFilterEntityType}
              options={entityTypeOptions}
              placeholder="PHÂN LOẠI"
              className="min-w-[200px]"
            />

            <CustomSelect 
              value={filterAction}
              onChange={setFilterAction}
              options={actionOptions}
              placeholder="HÀNH ĐỘNG"
              className="min-w-[200px]"
            />

            {(filterDate || filterEntityType !== "all" || filterAction !== "all") && (
              <button 
                onClick={() => {
                  setFilterDate("");
                  setFilterEntityType("all");
                  setFilterAction("all");
                }}
                className="w-12 h-12 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl transition-all duration-500 group bg-rose-50/50"
                title="Xóa bộ lọc"
              >
                <RotateCcw size={20} className="group-hover:rotate-180 transition-transform duration-700" />
              </button>
            )}
          </div>

          <div className="bg-slate-950 px-8 py-6 rounded-[2.5rem] shadow-2xl shadow-slate-900/40 flex items-center gap-8 min-w-[240px] border border-white/5 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-[64px] rounded-full -mr-16 -mt-16 group-hover:bg-accent/20 transition-all duration-1000" />
             <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-accent shrink-0 border border-white/10 relative">
                <Shield size={28} className="relative z-10" />
             </div>
             <div>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] leading-none mb-2">Monitor Status</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-4xl font-black text-white tabular-nums leading-none tracking-tighter">
                    {filteredLogs.length}
                  </p>
                  <span className="text-[10px] text-accent font-black uppercase tracking-widest bg-accent/10 px-2 py-0.5 rounded-md">LOGS</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto space-y-6">
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
