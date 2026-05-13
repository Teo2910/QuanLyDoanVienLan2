import { useState, useEffect, useMemo, FormEvent } from "react";
import { dataService } from "../../services/dataService";
import { useAuth } from "../../contexts/AuthContext";
import { useSearch } from "../../contexts/SearchContext";
import { useLiveSync } from "../../hooks/useLiveSync";
import { Activity } from "../../types";
import { Calendar, MapPin, Plus, Trash2, Edit2, X, Check, Search, Award } from "lucide-react";
import { CustomSelect } from "../../components/CustomSelect";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";

export const ActivityList = () => {
  const { isAdmin, isSecretary, profile } = useAuth();
  const { searchTerm, setSearchTerm } = useSearch();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [formData, setFormData] = useState<Omit<Activity, "id" | "createdAt">>({
    title: "",
    date: "",
    location: "",
    description: "",
    type: "Hội họp"
  });

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    const data = await dataService.getActivities();
    setActivities(data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setLoading(false);
  };

  useLiveSync("activities:changed", loadActivities);

  const activityTypeOptions = [
    { value: "Hội họp", label: "Hội họp" },
    { value: "Phong trào", label: "Phong trào" },
    { value: "Giáo dục", label: "Giáo dục" },
    { value: "Thiện nguyện", label: "Thiện nguyện" }
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + 10;
      });
    }, 100);

    try {
      if (editingActivity) {
        await dataService.updateActivity(editingActivity.id, formData);
      } else {
        await dataService.addActivity(formData);
      }
      
      setProgress(100);
      setTimeout(() => {
        setIsModalOpen(false);
        setEditingActivity(null);
        setFormData({ title: "", date: "", location: "", description: "", type: "Hội họp" });
        setSubmitting(false);
        setProgress(0);
        loadActivities();
      }, 300);
    } catch (error) {
      console.error("Error submitting activity:", error);
      setSubmitting(false);
      setProgress(0);
    } finally {
      clearInterval(interval);
    }
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      title: activity.title,
      date: activity.date,
      location: activity.location,
      description: activity.description || "",
      type: activity.type
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa hoạt động này?")) {
      await dataService.deleteActivity(id);
      loadActivities();
    }
  };

  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      const searchLower = searchTerm.toLowerCase();
      return (
        activity.title.toLowerCase().includes(searchLower) ||
        (activity.description || "").toLowerCase().includes(searchLower) ||
        activity.location.toLowerCase().includes(searchLower) ||
        activity.type.toLowerCase().includes(searchLower)
      );
    });
  }, [activities, searchTerm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-32 space-y-6">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-[10px] uppercase font-black tracking-[0.2em] animate-pulse">Đang tải hoạt động...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 px-2 md:px-0">
        <div>
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight">Hoạt động sắp tới</h2>
          <p className="text-slate-400 mt-2 text-[10px] uppercase tracking-widest font-black">Lịch trình và sự kiện Đoàn thanh niên cơ sở</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto items-stretch sm:items-center">
          <div className="relative flex-1 sm:w-80 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-accent transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Tìm kiếm hoạt động..."
              className="w-full bg-white border border-slate-200 rounded-full py-4 pl-14 pr-6 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-medium py-4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {(isAdmin || isSecretary) && (
            <motion.button 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setEditingActivity(null); setIsModalOpen(true); }}
              className="group flex items-center justify-center gap-3 px-8 py-4 bg-accent border border-blue-400/20 rounded-2xl transition-all shadow-xl shadow-accent/20 hover:bg-blue-700 shrink-0"
            >
              <Plus size={18} className="text-white group-hover:rotate-90 transition-transform" />
              <span className="font-black uppercase tracking-widest text-[10px] text-white">Thêm hoạt động</span>
            </motion.button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filteredActivities.map((activity, index) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            key={activity.id} 
            className="bg-white border border-slate-200 rounded-[3rem] p-10 hover:border-accent transition-all group flex flex-col justify-between shadow-sm hover:shadow-2xl hover:shadow-slate-200/60 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-accent/10 transition-all duration-500" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <span className={cn(
                  "px-4 py-1.5 rounded-xl text-[10px] uppercase tracking-widest font-black border transition-all",
                  activity.type === "Hội họp" ? "bg-blue-50 text-blue-600 border-blue-100" :
                  activity.type === "Phong trào" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                  activity.type === "Giáo dục" ? "bg-purple-50 text-purple-600 border-purple-100" :
                  "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  {activity.type}
                </span>
                {(isAdmin || isSecretary) && (
                  <div className="flex gap-2">
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEdit(activity)} 
                      className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-accent hover:border-accent/30 transition-all shadow-sm"
                    >
                      <Edit2 size={14} strokeWidth={2.5} />
                    </motion.button>
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4 group-hover:text-accent transition-colors leading-tight tracking-tight">
                {activity.title}
              </h3>
              <p className="text-slate-500 text-sm mb-8 line-clamp-3 leading-relaxed font-medium">
                {activity.description || "Không có nội dung mô tả chi tiết cho hoạt động này."}
              </p>
            </div>

            <div className="relative z-10 space-y-4 pt-8 border-t border-slate-100/60">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-accent shadow-inner">
                    <Calendar size={18} strokeWidth={2.5} />
                 </div>
                 <div>
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest leading-none mb-1">Thời gian</p>
                    <p className="text-sm font-black text-slate-900 tabular-nums">
                      {(() => {
                        const d = new Date(activity.date);
                        return isNaN(d.getTime()) ? activity.date : d.toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' });
                      })()}
                    </p>
                 </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-rose-500 shadow-inner">
                    <MapPin size={18} strokeWidth={2.5} />
                 </div>
                 <div className="min-w-0">
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest leading-none mb-1">Địa điểm</p>
                    <p className="text-sm font-black text-slate-900 truncate">{activity.location}</p>
                 </div>
              </div>
              
              {isAdmin && activity.type === "Phong trào" && (
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm(`Bạn có muốn chuyển hoạt động "${activity.title}" này thành một Phong trào chính thức không?`)) {
                      try {
                        const startDate = isNaN(new Date(activity.date).getTime()) 
                          ? new Date().toISOString().split('T')[0] 
                          : new Date(activity.date).toISOString().split('T')[0];
                        
                        await dataService.addMovement({
                          title: activity.title,
                          description: activity.description || "",
                          startDate: startDate,
                          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                          participatingUnitIds: [], 
                          creatorId: profile?.uid || "admin",
                          attachments: []
                        });
                        await dataService.deleteActivity(activity.id);
                        alert("Đã chuyển thành phong trào thành công!");
                        loadActivities();
                      } catch (err: any) {
                        alert("Lỗi: " + err.message);
                      }
                    }
                  }}
                  className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-900/10"
                >
                  <Award size={16} strokeWidth={2.5} />
                  Nâng cấp thành Phong trào
                </motion.button>
              )}
            </div>
          </motion.div>
        ))}

        {filteredActivities.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50">
            <p className="text-slate-300 uppercase tracking-[0.2em] font-black text-xs">
              {searchTerm ? "Không tìm thấy hoạt động nào phù hợp" : "Chưa có hoạt động nào được lên lịch"}
            </p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-[3.5rem] w-full max-w-xl relative shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="p-10 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  {editingActivity ? "Cập nhật hoạt động" : "Thêm hoạt động mới"}
                </h3>
                <p className="text-slate-400 uppercase tracking-widest text-[10px] font-bold mt-2 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                  Thông tin chi tiết sự kiện
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-12 h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 transition-all transform hover:rotate-90"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <form onSubmit={handleSubmit} className="p-12 space-y-10">
                {submitting && (
                  <div className="mb-0 space-y-3">
                    <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.2em] font-black text-accent">
                      <span>Đang xử lý dữ liệu...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-accent"
                      />
                    </div>
                  </div>
                )}

                <div className={cn("space-y-10 transition-all", submitting && "opacity-40 pointer-events-none")}>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-4 block">Tên gọi hoạt động</label>
                    <input
                      required
                      disabled={submitting}
                      placeholder="VD: Ngày hội thanh niên khỏe..."
                      className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-slate-900 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent font-bold transition-all placeholder:text-slate-300"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-4 block">Ngày tổ chức</label>
                      <input
                        required
                        disabled={submitting}
                        type="date"
                        className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-slate-900 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent font-bold transition-all"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                      />
                    </div>
                    <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-4 block">Phân loại</label>
                    <CustomSelect
                      options={activityTypeOptions}
                      value={formData.type}
                      onChange={(val) => setFormData({...formData, type: val})}
                      className="w-full"
                    />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-4 block">Địa điểm tổ chức</label>
                    <input
                      required
                      disabled={submitting}
                      placeholder="VD: Sân vận động trường..."
                      className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-slate-900 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent font-bold transition-all placeholder:text-slate-300"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-4 block">Mô tả chi tiết nội dung</label>
                    <textarea
                      rows={4}
                      disabled={submitting}
                      placeholder="Nêu ngắn gọn mục đích, ý nghĩa và nội dung sẽ diễn ra..."
                      className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-slate-900 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent font-bold transition-all resize-none placeholder:text-slate-300"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={submitting}
                    className={cn(
                      "w-full flex items-center justify-center gap-4 py-6 bg-accent text-white border border-blue-400/20 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-accent/20 hover:bg-blue-700",
                      submitting && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {submitting ? "Hệ thống đang lưu..." : (editingActivity ? "Cập nhật hoạt động" : "Lưu hoạt động")}
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
