import { useState, useEffect } from "react";
import { dataService } from "../../services/dataService";
import { SystemLog } from "../../types";
import { Activity, Clock, User, Tag, FileText } from "lucide-react";
import { motion } from "motion/react";

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
    <div className="relative min-h-[calc(100vh-8rem)] pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-12">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Nhật ký hoạt động</h2>
          <p className="text-slate-400 mt-2 text-[10px] uppercase tracking-[0.2em] font-black">Lịch sử tương tác hệ thống thời gian thực</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[3.5rem] p-8 sm:p-12 md:p-16 shadow-2xl overflow-hidden min-h-[500px]">
        {logs.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50">
            <p className="text-slate-300 uppercase tracking-[0.2em] font-black text-xs">
              Chưa có hoạt động nào được ghi nhận
            </p>
          </div>
        ) : (
          <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
            {logs.map((log, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={log.id} 
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
              >
                {/* Timeline dot */}
                <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-slate-50 absolute left-0 md:left-1/2 -translate-x-1/2 z-10 shadow-xl ml-6 md:ml-0 group-hover:scale-110 group-hover:bg-accent group-hover:text-white transition-all duration-300">
                  <Activity size={16} className="text-accent group-hover:text-white transition-colors" />
                </div>

                {/* Card */}
                <div className="w-full md:w-5/12 pl-20 md:pl-0">
                  <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2rem] md:group-odd:text-right group-hover:bg-white group-hover:border-accent/20 group-hover:shadow-2xl group-hover:shadow-accent/5 transition-all duration-300">
                    <div className="flex flex-col md:group-odd:items-end mb-4 gap-3">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[9px] uppercase font-black tracking-widest border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <h4 className="text-slate-900 font-bold text-lg leading-tight group-hover:text-accent transition-colors">
                        {log.details || log.entityId}
                      </h4>
                    </div>

                    <div className="space-y-3 mt-6 pt-6 border-t border-slate-200/50 inline-block text-left w-full">
                      <div className="flex items-center gap-3 text-slate-500 text-[11px] font-bold">
                        <User size={14} className="text-accent" />
                        <span className="truncate">{log.userName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-400 text-[11px] font-medium">
                        <Tag size={14} className="text-accent/60" />
                        <span className="uppercase tracking-widest">{log.entityType}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                        <Clock size={14} className="text-accent/60" />
                        <span className="font-mono">
                          {(() => {
                            const d = new Date(log.timestamp);
                            return isNaN(d.getTime()) ? "N/A" : d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "medium" });
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
