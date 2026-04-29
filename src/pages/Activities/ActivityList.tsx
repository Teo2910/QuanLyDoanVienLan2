import { useState, useEffect, useMemo, FormEvent } from "react";
import { dataService } from "../../services/dataService";
import { useAuth } from "../../contexts/AuthContext";
import { useSearch } from "../../contexts/SearchContext";
import { useLiveSync } from "../../hooks/useLiveSync";
import { Activity } from "../../types";
import { Calendar, MapPin, Plus, Trash2, Edit2, X, Check, Search } from "lucide-react";
import { CustomSelect } from "../../components/CustomSelect";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";

export const ActivityList = () => {
  const { isAdmin, isSecretary } = useAuth();
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

    // Simulate progress
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

  if (loading) return <div className="p-10 text-center text-white/40 uppercase tracking-widest text-xs">Đang tải...</div>;

  return (
    <div>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-12">
        <div>
          <h2 className="text-4xl font-serif text-white tracking-tight italic">Hoạt động sắp tới</h2>
          <p className="text-white/40 mt-1 text-xs uppercase tracking-widest">Lịch trình và sự kiện Đoàn thanh niên cơ sở</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto items-stretch sm:items-center">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input 
              type="text"
              placeholder="Tìm kiếm hoạt động..."
              className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-14 pr-6 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {(isAdmin || isSecretary) && (
            <button 
              onClick={() => { setEditingActivity(null); setIsModalOpen(true); }}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-accent text-accent-foreground rounded-full font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-all shadow-xl shadow-accent/20 shrink-0"
            >
              <Plus size={16} />
              Thêm hoạt động
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredActivities.map((activity) => (
          <div key={activity.id} className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 hover:bg-white/[0.05] transition-all group flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-6">
                <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] uppercase tracking-widest font-bold text-accent">
                  {activity.type}
                </span>
                {(isAdmin || isSecretary) && (
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(activity)} className="p-2 text-white/20 hover:text-white transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(activity.id)} className="p-2 text-white/20 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-serif italic text-white mb-4 group-hover:text-accent transition-colors leading-tight">
                {activity.title}
              </h3>
              <p className="text-white/40 text-sm mb-6 line-clamp-2 leading-relaxed italic">
                {activity.description || "Không có mô tả chi tiết."}
              </p>
            </div>
            <div className="space-y-3 pt-6 border-t border-white/5">
              <div className="flex items-center gap-3 text-white/60">
                <Calendar size={14} className="text-accent/60" />
                <span className="text-[11px] font-bold tracking-widest uppercase">{new Date(activity.date).toLocaleDateString("vi-VN")}</span>
              </div>
              <div className="flex items-center gap-3 text-white/40">
                <MapPin size={14} className="text-accent/40" />
                <span className="text-[10px] uppercase tracking-widest font-medium truncate">{activity.location}</span>
              </div>
            </div>
          </div>
        ))}

        {filteredActivities.length === 0 && (
          <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-[3rem]">
            <p className="text-white/20 uppercase tracking-[0.2em] font-bold text-xs">
              {searchTerm ? "Không tìm thấy hoạt động nào phù hợp" : "Chưa có hoạt động nào được lên lịch"}
            </p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-surface border border-white/10 rounded-[3rem] w-full max-w-xl relative shadow-2xl shadow-black/50 flex flex-col max-h-[90vh]"
          >
            <div className="p-8 md:p-10 border-b border-white/5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-3xl font-serif text-white italic mb-2">
                  {editingActivity ? "Chỉnh sửa hoạt động" : "Thêm hoạt động mới"}
                </h3>
                <p className="text-white/30 uppercase tracking-widest text-[10px] font-bold">Thông tin chi tiết sự kiện</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full text-white/40 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-6">
                {submitting && (
                  <div className="mb-8 space-y-3">
                    <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.2em] font-black text-accent/60">
                      <span>Đang xử lý dữ liệu...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-accent shadow-[0_0_15px_rgba(var(--accent),0.5)]"
                      />
                    </div>
                  </div>
                )}

                <div className={cn("space-y-6 transition-all", submitting && "opacity-40 pointer-events-none blur-[2px]")}>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Tên hoạt động</label>
                    <input
                      required
                      disabled={submitting}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all font-medium"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Ngày tổ chức</label>
                      <input
                        required
                        disabled={submitting}
                        type="date"
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all font-medium"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                      />
                    </div>
                    <CustomSelect
                      label="Loại hoạt động"
                      options={activityTypeOptions}
                      value={formData.type}
                      onChange={(val) => setFormData({...formData, type: val})}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Địa điểm</label>
                    <input
                      required
                      disabled={submitting}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all font-medium"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Mô tả chi tiết</label>
                    <textarea
                      rows={3}
                      disabled={submitting}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all font-medium resize-none"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={submitting}
                    className={cn(
                      "w-full flex items-center justify-center gap-3 py-5 bg-accent text-accent-foreground rounded-full font-bold uppercase tracking-widest text-xs transition-all shadow-xl shadow-accent/20",
                      submitting ? "opacity-50 cursor-not-allowed grayscale" : "hover:opacity-90"
                    )}
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                    ) : (
                      <Check size={18} />
                    )}
                    {submitting ? "Đang lưu..." : (editingActivity ? "Cập nhật hoạt động" : "Lưu hoạt động")}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
