import React, { useEffect, useState } from "react";
import { dataService } from "../../services/dataService";
import { Unit } from "../../types";
import { Trash2, Edit3, Search, Plus, Building2, X, ShieldAlert } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSearch } from "../../contexts/SearchContext";
import { useLiveSync } from "../../hooks/useLiveSync";
import { motion, AnimatePresence } from "motion/react";

export const UnitList: React.FC = () => {
  const { isAdmin, isSecretary } = useAuth();
  const { searchTerm, setSearchTerm } = useSearch();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newUnit, setNewUnit] = useState({ name: "", code: "", email: "", address: "" });

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = () => {
    dataService.getUnits().then((data) => {
      setUnits(data);
      setLoading(false);
    });
  };

  useLiveSync("units:changed", loadUnits);

  const filteredUnits = units.filter(unit => 
    unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa đơn vị này?")) {
      dataService.deleteUnit(id).then(() => {
        setUnits(units.filter(u => u.id !== id));
      });
    }
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
    <div id="unit-list-container">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-serif text-white flex items-center gap-4 italic tracking-tight">
            <Building2 className="text-accent" size={36} />
            Quản lý đơn vị
          </h2>
          <p className="text-white/40 text-xs uppercase tracking-widest mt-1">Danh mục các chi đoàn và đơn vị cơ sở trực thuộc</p>
        </div>
        {(isAdmin || isSecretary) && (
          <button 
            onClick={openAddModal}
            className="bg-white text-black px-8 py-3 rounded-full text-xs font-bold uppercase tracking-tighter hover:bg-gray-200 transition-all shadow-lg flex items-center gap-2"
          >
            <Plus size={16} />
            Thêm đơn vị mới
          </button>
        )}
      </div>

      <div className="bg-surface/60 border border-white/5 rounded-[2rem] overflow-hidden flex flex-col min-h-[500px] shadow-2xl backdrop-blur-md">
        {/* Search */}
        <div className="px-8 py-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc mã đơn vị..."
              className="w-full pl-12 pr-6 py-3 bg-white/5 border border-white/10 rounded-full text-sm focus:outline-none focus:border-accent/40 transition-all placeholder:text-white/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="hidden md:flex gap-2">
            <span className="px-4 py-2 bg-white/5 rounded-full text-[10px] text-white/40 uppercase tracking-widest font-bold">Tất cả {units.length} đơn vị</span>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-24 text-center items-center flex flex-col gap-4">
             <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
             <p className="text-white/40 text-xs uppercase tracking-widest">Đang tải dữ liệu hệ thống</p>
          </div>
        ) : filteredUnits.length > 0 ? (
          <div className="flex-1 overflow-x-auto px-4">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] text-white/30 uppercase tracking-tighter border-b border-white/5">
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
                    <td className="py-6 px-4 font-serif italic text-white text-lg">{unit.name}</td>
                    <td className="py-6 px-4 text-white/60 text-sm">
                      <div className="flex flex-col">
                        <span>{unit.email || "Chưa có email"}</span>
                        <span className="text-[10px] opacity-50">{unit.address || "Chưa có địa chỉ"}</span>
                      </div>
                    </td>
                    <td className="py-6 px-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {(isAdmin || isSecretary) ? (
                          <>
                            <button 
                              onClick={() => handleEdit(unit)}
                              className="px-4 py-2 text-[10px] font-bold uppercase tracking-tighter text-blue-400 hover:bg-blue-500/10 rounded-full transition-all"
                            >
                              Chỉnh sửa
                            </button>
                            <button 
                              onClick={() => handleDelete(unit.id)}
                              className="px-4 py-2 text-[10px] font-bold uppercase tracking-tighter text-red-400 hover:bg-red-500/10 rounded-full transition-all"
                            >
                              Xóa
                            </button>
                          </>
                        ) : (
                          <span className="px-4 py-2 text-[10px] font-bold uppercase tracking-tighter text-white/20 italic">Chỉ đọc</span>
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
                <h3 className="text-2xl font-serif text-white italic">
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
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-8 py-4 border border-white/10 rounded-full font-bold text-xs uppercase tracking-widest text-white/60 hover:bg-white/5 transition-colors"
                >
                  Hủy thao tác
                </button>
                <button
                  type="submit"
                  className="flex-1 px-8 py-4 bg-white text-black rounded-full font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all shadow-xl"
                >
                  Hoàn tất lưu
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
