import React, { useEffect, useState } from "react";
import { dataService } from "../../services/dataService";
import { Unit } from "../../types";
import { Trash2, Edit3, Search, Plus, Building2, X, ShieldAlert } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSearch } from "../../contexts/SearchContext";
import { useLiveSync } from "../../hooks/useLiveSync";
import { motion, AnimatePresence } from "motion/react";
import { ConfirmModal } from "../../components/ConfirmModal";
import { ToastContainer, ToastType } from "../../components/Toast";

export const UnitList: React.FC = () => {
  const { isAdmin, isSecretary } = useAuth();
  const { searchTerm, setSearchTerm } = useSearch();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newUnit, setNewUnit] = useState({ name: "", code: "", email: "", address: "" });

  const [toasts, setToasts] = useState<any[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'info';
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'danger' | 'info' = 'info') => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm, variant });
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = () => {
    setLoading(true);
    dataService.getUnits().then((data) => {
      setUnits(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      addToast("Lỗi khi tải danh sách đơn vị", "error");
      setLoading(false);
    });
  };

  useLiveSync("units:changed", loadUnits);

  const filteredUnits = units.filter(unit => 
    unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (unit.code && unit.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = (id: string) => {
    showConfirm(
      "Xác nhận xóa",
      "Bạn có chắc muốn xóa chi đoàn này? Toàn bộ dữ liệu liên quan sẽ bị ảnh hưởng.",
      () => {
        dataService.deleteUnit(id)
          .then(() => {
            setUnits(units.filter(u => u.id !== id));
            addToast("Đã xóa chi đoàn thành công", "success");
          })
          .catch(err => {
            console.error(err);
            addToast("Lỗi: " + (err.message || "Không thể xóa đơn vị"), "error");
          });
      },
      "danger"
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      dataService.updateUnit(editingId, newUnit).then(() => {
        loadUnits();
        setShowModal(false);
        setEditingId(null);
        setNewUnit({ name: "", code: "", email: "", address: "" });
      });
    } else {
      dataService.addUnit(newUnit).then(() => {
        loadUnits();
        setShowModal(false);
        setNewUnit({ name: "", code: "", email: "", address: "" });
      });
    }
  };

  const handleEdit = (unit: Unit) => {
    setEditingId(unit.id);
    setNewUnit({ name: unit.name, code: unit.code, email: unit.email || "", address: unit.address || "" });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingId(null);
    setNewUnit({ name: "", code: "", email: "", address: "" });
    setShowModal(true);
  };

  return (
    <div id="unit-list-container" className="h-full flex flex-col gap-6 overflow-hidden p-6 text-white">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        variant={confirmConfig.variant}
      />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-4 tracking-tight">
            <Building2 className="text-accent" size={32} />
            Quản lý đơn vị
          </h2>
          <p className="text-white/40 text-[10px] uppercase tracking-widest mt-1">Danh mục các chi đoàn và đơn vị cơ sở trực thuộc</p>
        </div>
        {(isAdmin || isSecretary) && (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openAddModal}
            className="group bg-accent border border-white/20 px-6 py-3 rounded-xl transition-all shadow-xl shadow-accent/10 flex items-center gap-2 hover:bg-white"
          >
            <Plus size={16} className="text-slate-950 group-hover:rotate-90 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-950">Thêm mới</span>
          </motion.button>
        )}
      </div>

      <div className="flex-1 min-h-0 bg-surface/60 border border-white/5 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl backdrop-blur-md">
        {/* Search */}
        <div className="px-8 py-4 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc mã..."
              className="w-full pl-10 pr-6 py-2 bg-white/5 border border-white/10 rounded-full text-xs focus:outline-none focus:border-accent/40 transition-all placeholder:text-white/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="hidden md:flex gap-2">
            <span className="px-4 py-1.5 bg-white/5 rounded-full text-[9px] text-white/40 uppercase tracking-widest font-bold">Tổng số {units.length} đơn vị</span>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
             <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
             <p className="text-white/40 text-[10px] uppercase tracking-widest">Đang tải dữ liệu</p>
          </div>
        ) : filteredUnits.length > 0 ? (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#12131a] z-10 shadow-sm">
                <tr className="text-[10px] text-white/30 uppercase tracking-tighter border-b border-white/5">
                  <th className="py-6 px-4 font-normal">Mã đơn vị</th>
                  <th className="py-6 px-4 font-normal">Tên đơn vị</th>
                  <th className="py-6 px-4 font-normal">Thông tin liên hệ</th>
                  <th className="py-6 px-4 font-normal text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-6 px-4 font-mono text-sm text-white/40">{unit.code}</td>
                    <td className="py-6 px-4 font-bold text-white text-lg">{unit.name}</td>
                    <td className="py-6 px-4 text-white/60 text-sm">
                      <div className="flex flex-col">
                        <span>{unit.email || "Chưa có email"}</span>
                        <span className="text-[10px] opacity-50">{unit.address || "Chưa có địa chỉ"}</span>
                      </div>
                    </td>
                    <td className="py-6 px-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 duration-300">
                        {(isAdmin || isSecretary) ? (
                          <>
                            <motion.button 
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleEdit(unit)}
                              className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-400/5 hover:bg-blue-400 hover:text-white rounded-xl border border-blue-400/10 hover:border-blue-400/40 transition-all flex items-center gap-2"
                            >
                              <Edit3 size={12} />
                              Chỉnh sửa
                            </motion.button>
                            <motion.button 
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDelete(unit.id)}
                              className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-400/5 hover:bg-red-500 hover:text-white rounded-xl border border-red-400/10 hover:border-red-500/40 transition-all flex items-center gap-2"
                            >
                              <Trash2 size={12} />
                              Xóa
                            </motion.button>
                          </>
                        ) : (
                          <span className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/20 italic">Chỉ đọc</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-24 text-center items-center flex flex-col gap-2">
            <Building2 size={48} className="text-white/10 mb-2" />
            <p className="text-white/30 italic text-sm">Không tìm thấy đơn vị nào khớp với từ khóa</p>
          </div>
        )}
        
        {/* Footer info */}
        <div className="px-8 py-4 border-t border-white/5 flex justify-between items-center text-[10px] text-white/30 uppercase tracking-widest font-semibold mt-auto">
          <span>Tổng số: {filteredUnits.length} kết quả</span>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-surface border border-white/10 rounded-[3rem] w-full max-w-lg shadow-2xl p-1 relative overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02] shrink-0">
              <div>
                <h3 className="text-2xl font-bold text-white">
                  {editingId ? "Cập nhật đơn vị" : "Đăng ký đơn vị mới"}
                </h3>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Cung cấp thông tin chi tiết của cơ sở</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full text-white/40 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="col-span-1">
                  <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Mã đơn vị</label>
                  <input
                    required
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all"
                    value={newUnit.code}
                    onChange={(e) => setNewUnit({...newUnit, code: e.target.value})}
                    placeholder="VD: CD-K44"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Tên gọi đơn vị</label>
                  <input
                    required
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all"
                    value={newUnit.name}
                    onChange={(e) => setNewUnit({...newUnit, name: e.target.value})}
                    placeholder="Nhập tên chi đoàn hoặc đoàn cơ sở..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Email liên hệ</label>
                  <input
                    type="email"
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all"
                    value={newUnit.email}
                    onChange={(e) => setNewUnit({...newUnit, email: e.target.value})}
                    placeholder="VD: chidoan@example.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Địa chỉ văn phòng</label>
                  <textarea
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none h-32 transition-all resize-none"
                    value={newUnit.address}
                    onChange={(e) => setNewUnit({...newUnit, address: e.target.value})}
                    placeholder="Nhập địa chỉ chi tiết..."
                  />
                </div>
              </div>
              <div className="pt-6 flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.02, x: -5 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-8 py-4 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest text-white/40 hover:bg-white/5 transition-all"
                >
                  Hủy thao tác
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="flex-1 px-8 py-4 bg-accent border border-white/20 rounded-2xl transition-all shadow-xl shadow-accent/20 hover:bg-white"
                >
                  <span className="text-xs font-black uppercase tracking-widest text-slate-950">Hoàn tất lưu</span>
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
