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
    if (action.toLowerCase().includes("thêm")) return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    if (action.toLowerCase().includes("xóa")) return "text-red-400 bg-red-400/10 border-red-400/20";
    if (action.toLowerCase().includes("cập nhật")) return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    return "text-accent bg-accent/10 border-accent/20";
  };

  if (loading) return <div className="p-10 text-center text-white/40 uppercase tracking-widest text-xs">Đang tải...</div>;

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-12">
        <div>
          <h2 className="text-4xl font-bold text-white tracking-tight">Nhật ký hoạt động</h2>
          <p className="text-white/40 mt-1 text-xs uppercase tracking-widest">Ai đã làm gì?</p>
        </div>
      </div>

      <div className="bg-surface/50 border border-white/5 rounded-[2.5rem] p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-sm overflow-hidden min-h-[500px]">
        {logs.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-white/10 rounded-[2rem]">
            <p className="text-white/20 uppercase tracking-[0.2em] font-bold text-xs">
              Chưa có hoạt động nào được ghi nhận
            </p>
          </div>
        ) : (
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/5 before:to-transparent">
            {logs.map((log, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={log.id} 
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
              >
                {/* Timeline dot */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface bg-surface-lighter absolute left-0 md:left-1/2 -translate-x-1/2 z-10 shadow-xl ml-5 md:ml-0 group-hover:scale-110 transition-transform">
                  <Activity size={14} className="text-accent" />
                </div>

                {/* Card */}
                <div className="w-full md:w-5/12 pl-14 md:pl-0">
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl md:group-odd:text-right group-hover:bg-white/10 transition-colors shadow-lg">
                    <div className="flex flex-col md:group-odd:items-end mb-3 gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <h4 className="text-white font-medium text-sm sm:text-base leading-snug">
                        {log.details || log.entityId}
                      </h4>
                    </div>

                    <div className="space-y-2 mt-4 pt-4 border-t border-white/5 inline-block text-left">
                      <div className="flex items-center gap-2 text-white/40 text-[11px]">
                        <User size={12} className="text-accent/60" />
                        <span className="truncate">{log.userName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/40 text-[11px]">
                        <Tag size={12} className="text-accent/60" />
                        <span>{log.entityType}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/40 text-[11px]">
                        <Clock size={12} className="text-accent/60" />
                        <span>{new Date(log.timestamp).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "medium" })}</span>
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
