import React, { useState, useEffect } from "react";
import { dataService } from "../../services/dataService";
import { KnowledgeItem } from "../../types";
import { Book, Plus, Trash2, Edit3, Save, X, Search, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../contexts/AuthContext";

export const KnowledgeBase: React.FC = () => {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [newItem, setNewItem] = useState({ title: "", content: "", category: "Nghiệp vụ Đoàn" });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    const data = await dataService.getKnowledgeBase();
    setItems(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await dataService.updateKnowledgeItem(editingItem.id, newItem);
      } else {
        await dataService.addKnowledgeItem(newItem);
      }
      setShowModal(false);
      setEditingItem(null);
      setNewItem({ title: "", content: "", category: "Nghiệp vụ Đoàn" });
      loadItems();
    } catch (err: any) {
      console.error(err);
      alert(`Lỗi khi lưu tài liệu: ${err.message || "Lỗi không xác định"}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tài liệu này? AI sẽ không còn kiến thức này nữa.")) {
      try {
        await dataService.deleteKnowledgeItem(id);
        loadItems();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-bold text-slate-900 flex items-center gap-4 tracking-tight">
            <Book className="text-accent" size={40} />
            Tài liệu Nghiệp vụ
          </h2>
          <p className="text-xs text-slate-400 uppercase tracking-[0.2em] mt-2 font-black">Dạy AI về kiến thức Đoàn - Đội chuyên sâu</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm kiến thức..."
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-slate-900 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isAdmin && (
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setEditingItem(null);
                setNewItem({ title: "", content: "", category: "Nghiệp vụ Đoàn" });
                setShowModal(true);
              }}
              className="bg-accent text-accent-foreground px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-accent/20"
            >
              <Plus size={20} />
              Thêm tài liệu
            </motion.button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-white hover:bg-slate-50 border border-slate-200 hover:border-accent/30 rounded-[2rem] p-8 transition-all duration-500 shadow-lg hover:shadow-2xl hover:shadow-accent/5 relative overflow-hidden flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="p-4 bg-accent/10 rounded-2xl text-accent">
                    <FileText size={24} />
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setEditingItem(item);
                          setNewItem({ title: item.title, content: item.content, category: item.category || "" });
                          setShowModal(true);
                        }}
                        className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 hover:text-accent hover:border-accent/30 transition-all"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <span className="text-[10px] uppercase tracking-widest text-accent mb-3 block font-black">{item.category}</span>
                  <h3 className="text-2xl text-slate-900 font-bold mb-4 leading-tight group-hover:text-accent transition-colors">{item.title}</h3>
                  <p className="text-slate-600 text-sm line-clamp-6 leading-relaxed font-medium mb-6">
                    {item.content}
                  </p>
                </div>

                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                    Cập nhật: {new Date(item.updatedAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal Thêm/Sửa */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                    {editingItem ? "Cập nhật tài liệu" : "Thêm tài liệu nghiệp vụ"}
                  </h3>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-2">Cơ sở dữ liệu kiến thức AI</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 transition-all hover:rotate-90">
                  <X size={24} />
                </button>
              </div>

              <div className="overflow-y-auto p-12">
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 px-1">Tiêu đề tài liệu</label>
                    <input
                      type="text"
                      required
                      value={newItem.title}
                      onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] py-5 px-8 text-slate-900 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent font-bold transition-all placeholder:text-slate-300"
                      placeholder="VD: Điều lệ Đoàn TNCS Hồ Chí Minh"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 px-1">Danh mục</label>
                      <select
                        value={newItem.category}
                        onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] py-5 px-8 text-slate-900 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent font-bold transition-all appearance-none cursor-pointer"
                      >
                        <option value="Nghiệp vụ Đoàn">Nghiệp vụ Đoàn</option>
                        <option value="Nghiệp vụ Đội">Nghiệp vụ Đội</option>
                        <option value="Văn bản pháp quy">Văn bản pháp quy</option>
                        <option value="Kỹ năng sinh hoạt">Kỹ năng sinh hoạt</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 px-1">Nội dung chi tiết</label>
                    <textarea
                      required
                      rows={8}
                      value={newItem.content}
                      onChange={(e) => setNewItem({...newItem, content: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] py-5 px-8 text-slate-900 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent font-bold transition-all resize-none placeholder:text-slate-300"
                      placeholder="Nhập nội dung tài liệu để AI học hỏi và tư vấn..."
                    />
                    <p className="text-[10px] text-slate-400 mt-4 italic font-medium">* Nên chia nhỏ tài liệu theo từng chủ đề để AI xử lý chính xác nhất.</p>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <button
                      type="submit"
                      className="flex-1 bg-accent text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-accent/20"
                    >
                      <Save size={20} />
                      {editingItem ? "Cập nhật" : "Lưu tài liệu"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-10 bg-slate-100 text-slate-600 py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
