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
    <div className="h-full flex flex-col gap-6 overflow-hidden p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shrink-0 pt-2 pb-2">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-4 tracking-tight">
            <Book className="text-accent" size={32} />
            Tài liệu Nghiệp vụ
          </h2>
          <p className="text-[10px] text-white/50 uppercase tracking-[0.2em] mt-1">Dạy AI về kiến thức Đoàn - Đội chuyên sâu</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm kiến thức..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isAdmin && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setEditingItem(null);
                setNewItem({ title: "", content: "", category: "Nghiệp vụ Đoàn" });
                setShowModal(true);
              }}
              className="bg-accent text-accent-foreground px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-accent/10 whitespace-nowrap text-xs"
            >
              <Plus size={16} />
              Thêm mới
            </motion.button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <div className="pb-20">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-white/40 text-xs uppercase tracking-widest">Đang tải kiến thức...</p>
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
                className="group bg-surface/40 hover:bg-surface/60 border border-white/5 rounded-[2rem] p-6 transition-all duration-500 backdrop-blur-md relative overflow-hidden flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-accent/10 rounded-2xl text-accent">
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
                        className="p-2 text-white/30 hover:text-white transition-colors"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-white/30 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <span className="text-[10px] uppercase tracking-widest text-accent mb-2 block font-bold">{item.category}</span>
                  <h3 className="text-xl text-white font-bold mb-3">{item.title}</h3>
                  <p className="text-white/60 text-sm line-clamp-4 leading-relaxed">
                    {item.content}
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-white/20 uppercase tracking-tighter">
                    Cập nhật: {new Date(item.updatedAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
          )}
        </div>
      </div>

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
              className="relative w-full max-w-2xl bg-surface border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-white">
                    {editingItem ? "Cập nhật tài liệu" : "Thêm tài liệu nghiệp vụ"}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="text-white/30 hover:text-white">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2 px-1">Tiêu đề tài liệu</label>
                    <input
                      type="text"
                      required
                      value={newItem.title}
                      onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                      placeholder="VD: Điều lệ Đoàn TNCS Hồ Chí Minh"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2 px-1">Danh mục</label>
                      <select
                        value={newItem.category}
                        onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                      >
                        <option value="Nghiệp vụ Đoàn">Nghiệp vụ Đoàn</option>
                        <option value="Nghiệp vụ Đội">Nghiệp vụ Đội</option>
                        <option value="Văn bản pháp quy">Văn bản pháp quy</option>
                        <option value="Kỹ năng sinh hoạt">Kỹ năng sinh hoạt</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2 px-1">Nội dung chi tiết</label>
                    <textarea
                      required
                      rows={10}
                      value={newItem.content}
                      onChange={(e) => setNewItem({...newItem, content: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                      placeholder="Nhập nội dung tài liệu để AI học hỏi và tư vấn..."
                    />
                    <p className="text-[10px] text-white/30 mt-2 italic">* Nên chia nhỏ tài liệu theo từng chủ đề để AI xử lý chính xác nhất.</p>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-accent text-accent-foreground py-4 rounded-2xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
                    >
                      <Save size={20} />
                      {editingItem ? "Cập nhật tài liệu" : "Lưu tài liệu"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-8 bg-white/5 text-white py-4 rounded-2xl font-bold hover:bg-white/10 transition-all"
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
