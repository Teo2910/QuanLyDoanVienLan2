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
  const { isAdmin, isSecretary, profile } = useAuth();
  const { searchTerm, setSearchTerm } = useSearch();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newUnit, setNewUnit] = useState({ name: "", code: "", email: "", address: "", parentId: "" });

  const canEditUnit = (unitId: string) => {
    if (isAdmin) return true;
    if (isSecretary && profile?.unitId === unitId) return true;
    return false;
  };

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
        setNewUnit({ name: "", code: "", email: "", address: "", parentId: "" });
      });
    } else {
      dataService.addUnit(newUnit).then(() => {
        loadUnits();
        setShowModal(false);
        setNewUnit({ name: "", code: "", email: "", address: "", parentId: "" });
      });
    }
  };

  const handleEdit = (unit: Unit) => {
    setEditingId(unit.id);
    setNewUnit({ 
      name: unit.name, 
      code: unit.code, 
      email: unit.email || "", 
      address: unit.address || "",
      parentId: unit.parentId || ""
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingId(null);
    setNewUnit({ name: "", code: "", email: "", address: "", parentId: "" });
    setShowModal(true);
  };

  return (
    <div id="unit-list-container">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        variant={confirmConfig.variant}
      />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 lg:mb-12 px-2 lg:px-0">
        <div>
          <h2 className="text-2xl lg:text-4xl font-bold text-slate-900 flex items-center gap-3 lg:gap-4 tracking-tight">
            <div className="w-12 h-12 lg:w-16 lg:h-16 bg-accent/10 rounded-2xl lg:rounded-[2rem] flex items-center justify-center text-accent shrink-0">
              <Building2 size={24} className="lg:hidden" />
              <Building2 size={36} className="hidden lg:block" />
            </div>
            Quản lý đơn vị
          </h2>
          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-2 lg:ml-20">Danh mục các chi đoàn và đơn vị cơ sở trực thuộc</p>
        </div>
        {isAdmin && (
          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={openAddModal}
            className="w-full sm:w-auto group bg-accent border border-blue-400/20 px-6 lg:px-8 py-4 lg:py-5 rounded-[1.5rem] lg:rounded-[2rem] transition-all shadow-2xl shadow-accent/20 flex items-center justify-center gap-3 hover:bg-blue-700"
          >
            <Plus size={18} className="text-white group-hover:rotate-90 transition-transform" />
            <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-white">Thêm đơn vị mới</span>
          </motion.button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl lg:rounded-[3rem] overflow-hidden flex flex-col min-h-[400px] lg:min-h-[500px] shadow-2xl">
        {/* Search */}
        <div className="px-6 lg:px-10 py-6 lg:py-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 w-full max-w-md group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-accent transition-colors" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc mã..."
              className="w-full pl-16 pr-6 lg:pr-8 py-3.5 lg:py-4 bg-white border border-slate-200 rounded-xl lg:rounded-[2rem] text-slate-700 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all placeholder:text-slate-400 font-medium text-sm lg:text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="hidden md:flex gap-2">
            <span className="px-6 py-3 bg-white border border-slate-200 rounded-full text-[10px] text-slate-400 uppercase tracking-widest font-black shadow-sm">Tất cả {units.length} đơn vị</span>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-20 lg:p-32 text-center items-center flex flex-col gap-4 lg:gap-6">
             <div className="w-10 h-10 lg:w-12 lg:h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
             <p className="text-slate-400 text-[8px] lg:text-[10px] uppercase font-black tracking-widest">Hệ thống đang trích xuất dữ liệu</p>
          </div>
        ) : filteredUnits.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block flex-1 overflow-x-auto px-6">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 font-black">
                    <th className="py-8 px-6">Mã đơn vị</th>
                    <th className="py-8 px-6">Tên đơn vị</th>
                    <th className="py-8 px-6">Thông tin liên hệ</th>
                    <th className="py-8 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUnits.map((unit) => (
                    <tr key={unit.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="py-8 px-6">
                        <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono text-xs font-bold">
                          {unit.code}
                        </span>
                      </td>
                      <td className="py-8 px-6">
                        <div className="flex flex-col gap-1">
                          <span className="font-black text-slate-900 text-xl tracking-tight leading-none">{unit.name}</span>
                          {unit.parentId && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] text-slate-300 uppercase font-bold tracking-widest">Trực thuộc:</span>
                              <span className="px-2 py-0.5 bg-accent/5 text-[9px] text-accent uppercase font-black tracking-widest rounded-md">
                                {units.find(u => u.id === unit.parentId)?.name || "N/A"}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-8 px-6">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                            <span className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-sm shadow-accent/50" />
                            {unit.email || "Chưa có email"}
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium ml-4">{unit.address || "Chưa có địa chỉ văn phòng"}</span>
                        </div>
                      </td>
                      <td className="py-8 px-6 text-right">
                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 duration-500">
                          {canEditUnit(unit.id) ? (
                            <>
                              <motion.button 
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleEdit(unit)}
                                className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-accent bg-accent/5 hover:bg-accent hover:text-white rounded-[1.25rem] border border-accent/10 hover:border-accent transition-all flex items-center gap-2 shadow-sm"
                              >
                                <Edit3 size={14} />
                                Chỉnh sửa
                              </motion.button>
                              <motion.button 
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleDelete(unit.id)}
                                className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-500/5 hover:bg-red-500 hover:text-white rounded-[1.25rem] border border-red-500/10 hover:border-red-500 transition-all flex items-center gap-2 shadow-sm"
                              >
                                <Trash2 size={14} />
                                Xóa
                              </motion.button>
                            </>
                          ) : (
                            <span className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 italic bg-slate-50 rounded-[1.25rem] border border-slate-100">Chi đoàn ẩn</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden p-4 space-y-4">
              {filteredUnits.map((unit) => (
                <motion.div 
                  key={unit.id}
                  className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono text-[10px] font-bold uppercase tracking-tight">
                      {unit.code}
                    </span>
                    <div className="flex gap-2">
                       {canEditUnit(unit.id) && (
                         <>
                           <button onClick={() => handleEdit(unit)} className="p-2 text-accent bg-accent/5 rounded-lg">
                             <Edit3 size={16} />
                           </button>
                           <button onClick={() => handleDelete(unit.id)} className="p-2 text-red-500 bg-red-500/5 rounded-lg">
                             <Trash2 size={16} />
                           </button>
                         </>
                       )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none">{unit.name}</h4>
                    {unit.parentId && (
                      <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-widest">
                        Trực thuộc: <span className="text-accent">{units.find(u => u.id === unit.parentId)?.name}</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-50 space-y-2">
                    <div className="flex items-center gap-2 text-slate-600 text-xs font-medium">
                      <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                      {unit.email || "Không có email"}
                    </div>
                    {unit.address && (
                      <p className="text-[10px] text-slate-400 leading-relaxed italic line-clamp-1">
                        {unit.address}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-20 lg:p-32 text-center items-center flex flex-col gap-4">
            <div className="w-16 h-16 lg:w-24 lg:h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 border border-slate-100">
              <Building2 size={32} className="lg:hidden" />
              <Building2 size={48} className="hidden lg:block" />
            </div>
            <p className="text-slate-400 font-bold text-base lg:text-lg">Không tìm thấy đơn vị nào</p>
            <p className="text-slate-300 text-[10px] lg:text-xs uppercase tracking-widest font-bold">Hãy thay đổi từ khóa tìm kiếm của bạn</p>
          </div>
        )}
        
        {/* Footer info */}
        <div className="px-6 lg:px-10 py-4 lg:py-6 border-t border-slate-100 flex justify-between items-center bg-slate-50/30">
          <span className="text-[8px] lg:text-[10px] text-slate-400 uppercase tracking-widest font-black">Tổng số: {filteredUnits.length} đơn vị</span>
          <div className="flex gap-2">
            <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-accent rounded-full" />
            <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-accent/30 rounded-full" />
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 lg:p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white border-0 lg:border border-slate-200 lg:rounded-[3.5rem] w-full max-w-xl h-full lg:h-auto lg:max-h-[90vh] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] p-1 relative overflow-hidden flex flex-col"
          >
            <div className="p-6 lg:p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div>
                <h3 className="text-xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  {editingId ? "Cập nhật đơn vị" : "Đăng ký đơn vị mới"}
                </h3>
                <div className="hidden lg:flex items-center gap-2 mt-2">
                  <div className="w-1.5 h-1.5 bg-accent rounded-full" />
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Cung cấp chi tiết thông tin cơ sở đoàn</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl lg:rounded-2xl text-slate-400 hover:text-slate-900 transition-all transform hover:rotate-90"
              >
                <X size={20} className="lg:hidden" />
                <X size={24} className="hidden lg:block" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 lg:p-12 space-y-6 lg:space-y-10 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                <div className="col-span-1">
                  <label className="text-[9px] lg:text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-3 lg:mb-4 block">Mã đơn vị (Code)</label>
                  <input
                    required
                    className="w-full px-6 lg:px-8 py-3.5 lg:py-5 bg-slate-50 border border-slate-100 rounded-xl lg:rounded-[1.5rem] text-slate-900 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent font-bold transition-all placeholder:text-slate-300 text-sm lg:text-base"
                    value={newUnit.code}
                    onChange={(e) => setNewUnit({...newUnit, code: e.target.value})}
                    placeholder="VD: CD-K44"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[9px] lg:text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-3 lg:mb-4 block">Tên gọi đơn vị chính thức</label>
                  <input
                    required
                    className="w-full px-6 lg:px-8 py-3.5 lg:py-5 bg-slate-50 border border-slate-100 rounded-xl lg:rounded-[1.5rem] text-slate-900 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent font-bold transition-all placeholder:text-slate-300 text-sm lg:text-base"
                    value={newUnit.name}
                    onChange={(e) => setNewUnit({...newUnit, name: e.target.value})}
                    placeholder="Nhập tên chi đoàn hoặc đoàn cơ sở..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[9px] lg:text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-3 lg:mb-4 block">Email liên hệ công tác</label>
                  <input
                    type="email"
                    className="w-full px-6 lg:px-8 py-3.5 lg:py-5 bg-slate-50 border border-slate-100 rounded-xl lg:rounded-[1.5rem] text-slate-900 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent font-bold transition-all placeholder:text-slate-300 text-sm lg:text-base"
                    value={newUnit.email}
                    onChange={(e) => setNewUnit({...newUnit, email: e.target.value})}
                    placeholder="VD: chidoan@hueuni.edu.vn"
                  />
                </div>
                <div className="md:col-span-2 relative">
                  <label className="text-[9px] lg:text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-3 lg:mb-4 block">Đơn vị quản lý cấp trên</label>
                  <select
                    className="w-full px-6 lg:px-8 py-3.5 lg:py-5 bg-slate-50 border border-slate-100 rounded-xl lg:rounded-[1.5rem] text-slate-900 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent font-bold transition-all appearance-none outline-none text-sm lg:text-base"
                    value={newUnit.parentId}
                    onChange={(e) => setNewUnit({...newUnit, parentId: e.target.value})}
                  >
                    <option value="" className="text-slate-400">Không có (Đơn vị cấp cao nhất)</option>
                    {units.filter(u => u.id !== editingId).map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-6 lg:right-8 bottom-4 lg:bottom-6 pointer-events-none text-slate-300">
                    <Building2 size={16} className="lg:hidden" />
                    <Building2 size={18} className="hidden lg:block" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[9px] lg:text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-3 lg:mb-4 block">Địa chỉ trụ sở / Văn phòng</label>
                  <textarea
                    className="w-full px-6 lg:px-8 py-3.5 lg:py-5 bg-slate-50 border border-slate-100 rounded-xl lg:rounded-[1.5rem] text-slate-900 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent font-bold transition-all resize-none h-24 lg:h-32 placeholder:text-slate-300 text-sm lg:text-base"
                    value={newUnit.address}
                    onChange={(e) => setNewUnit({...newUnit, address: e.target.value})}
                    placeholder="Nhập địa chỉ chi tiết nơi làm việc..."
                  />
                </div>
              </div>
              <div className="pt-6 lg:pt-10 flex flex-col sm:flex-row gap-4 lg:gap-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-8 py-4 lg:py-5 bg-slate-50 border border-slate-200 rounded-xl lg:rounded-[1.5rem] font-black text-[10px] lg:text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-all shadow-sm"
                >
                  Hủy thao tác
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="flex-[1.5] px-8 py-4 lg:py-5 bg-accent text-white border border-blue-400/20 rounded-xl lg:rounded-[1.5rem] transition-all shadow-2xl shadow-accent/20 hover:bg-blue-700 font-black text-[10px] lg:text-xs uppercase tracking-widest"
                >
                  Hoàn tất cập nhật
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
