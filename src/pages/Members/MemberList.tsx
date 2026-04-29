import React, { useEffect, useState, useMemo } from "react";
import { dataService } from "../../services/dataService";
import { Member, Unit } from "../../types";
import { Trash2, Edit3, Search, Plus, Users, Filter, UserCircle, X, ChevronDown, ChevronUp, Save, Bookmark, History, RotateCcw } from "lucide-react";
import { cn } from "../../lib/utils";
import Fuse from "fuse.js";
import { useAuth } from "../../contexts/AuthContext";
import { SearchPreset } from "../../types";

export const MemberList: React.FC = () => {
  const { isAdmin, isSecretary, profile, savePreset, deletePreset } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("all");
  const [selectedAchievement, setSelectedAchievement] = useState<string>("all");
  const [selectedHometown, setSelectedHometown] = useState<string>("");
  
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [showSavePreset, setShowSavePreset] = useState(false);

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyMember, setHistoryMember] = useState<Member | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [newMember, setNewMember] = useState<Omit<Member, "id" | "createdAt" | "statusHistory">>({
    fullName: "",
    memberId: "",
    dob: "",
    gender: "Nam",
    hometown: "",
    unitId: "",
    academicYear: "",
    achievementLevel: "Chưa xếp loại",
    status: "Đang sinh hoạt"
  });

  const academicYears = useMemo(() => {
    const years = members.map(m => m.academicYear).filter(Boolean) as string[];
    return Array.from(new Set(years)).sort();
  }, [members]);

  const achievementLevels = ["Xuất sắc", "Khá", "Trung bình", "Chưa xếp loại"];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    Promise.all([
      dataService.getMembers(),
      dataService.getUnits()
    ]).then(([mData, uData]) => {
      setMembers(mData);
      setUnits(uData);
      setLoading(false);
      if (uData.length > 0 && !newMember.unitId) {
        setNewMember(prev => ({ ...prev, unitId: uData[0].id }));
      }
    });
  };

  const getUnitName = (id: string) => {
    return units.find(u => u.id === id)?.name || "N/A";
  };

  const filteredMembers = useMemo(() => {
    let result = members.filter(member => {
      const matchesUnit = selectedUnit === "all" || member.unitId === selectedUnit;
      const matchesStatus = selectedStatus === "all" || member.status === selectedStatus;
      const matchesYear = selectedAcademicYear === "all" || member.academicYear === selectedAcademicYear;
      const matchesAchievement = selectedAchievement === "all" || member.achievementLevel === selectedAchievement;
      const matchesHometown = !selectedHometown || (member.hometown || "").toLowerCase().includes(selectedHometown.toLowerCase());
      return matchesUnit && matchesStatus && matchesYear && matchesAchievement && matchesHometown;
    });

    if (searchTerm.trim()) {
      const fuse = new Fuse(result, {
        keys: ["fullName", "memberId", "hometown", "academicYear"],
        threshold: 0.35, 
        distance: 100,
        minMatchCharLength: 2,
      });
      result = fuse.search(searchTerm).map(r => r.item);
    }

    return result;
  }, [members, searchTerm, selectedUnit, selectedStatus, selectedAcademicYear, selectedAchievement, selectedHometown]);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedUnit("all");
    setSelectedStatus("all");
    setSelectedAcademicYear("all");
    setSelectedAchievement("all");
    setSelectedHometown("");
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;
    const newPreset: SearchPreset = {
      id: Date.now().toString(),
      name: presetName,
      filters: {
        unit: selectedUnit,
        status: selectedStatus,
        academicYear: selectedAcademicYear,
        achievement: selectedAchievement,
        searchTerm: searchTerm,
        hometown: selectedHometown
      }
    };
    await savePreset(newPreset);
    setPresetName("");
    setShowSavePreset(false);
  };

  const applyPreset = (preset: SearchPreset) => {
    setSelectedUnit(preset.filters.unit);
    setSelectedStatus(preset.filters.status);
    setSelectedAcademicYear(preset.filters.academicYear);
    setSelectedAchievement(preset.filters.achievement);
    setSearchTerm(preset.filters.searchTerm);
    setSelectedHometown(preset.filters.hometown);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa đoàn viên này?")) {
      dataService.deleteMember(id).then(() => {
        setMembers(members.filter(m => m.id !== id));
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const updateData = { ...newMember, statusReason };
      dataService.updateMember(editingId, updateData as any).then(() => {
        loadData();
        setShowModal(false);
        setEditingId(null);
        setStatusReason("");
        setNewMember({
          fullName: "",
          memberId: "",
          dob: "",
          gender: "Nam",
          hometown: "",
          unitId: units[0]?.id || "",
          academicYear: "",
          achievementLevel: "Chưa xếp loại",
          status: "Đang sinh hoạt"
        });
      });
    } else {
      dataService.addMember(newMember).then(() => {
        loadData();
        setShowModal(false);
        setStatusReason("");
        setNewMember({
          fullName: "",
          memberId: "",
          dob: "",
          gender: "Nam",
          hometown: "",
          unitId: units[0]?.id || "",
          academicYear: "",
          achievementLevel: "Chưa xếp loại",
          status: "Đang sinh hoạt"
        });
      });
    }
  };

  const handleEdit = (member: Member) => {
    setEditingId(member.id);
    setStatusReason("");
    setNewMember({
      fullName: member.fullName,
      memberId: member.memberId,
      dob: member.dob,
      gender: member.gender,
      hometown: member.hometown || "",
      unitId: member.unitId,
      academicYear: member.academicYear || "",
      achievementLevel: member.achievementLevel || "Chưa xếp loại",
      status: member.status
    });
    setShowModal(true);
  };

  const handleViewHistory = (member: Member) => {
    setHistoryMember(member);
    setShowHistoryModal(true);
  };

  const openAddModal = () => {
    setEditingId(null);
    setStatusReason("");
    setNewMember({
      fullName: "",
      memberId: "",
      dob: "",
      gender: "Nam",
      hometown: "",
      unitId: units[0]?.id || "",
      academicYear: "",
      achievementLevel: "Chưa xếp loại",
      status: "Đang sinh hoạt"
    });
    setShowModal(true);
  };

  const statusColors = {
    "Đang sinh hoạt": "bg-green-100 text-green-700",
    "Đã chuyển sinh hoạt": "bg-blue-100 text-blue-700",
    "Đã trưởng thành": "bg-gray-100 text-gray-700",
    "Bị kỷ luật": "bg-red-100 text-red-700",
  };

  return (
    <div id="member-list-container" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h2 className="text-3xl font-serif text-white flex items-center gap-3">
            <Users className="text-accent" />
            Quản lý đoàn viên
          </h2>
          <p className="text-white/40 text-xs uppercase tracking-widest mt-1">Cơ sở dữ liệu hồ sơ nhân sự tập trung</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-white text-black px-8 py-3 rounded-full text-xs font-bold uppercase tracking-tighter hover:bg-gray-200 transition-all shadow-lg flex items-center gap-2"
        >
          <Plus size={16} />
          Thêm đoàn viên mới
        </button>
      </div>

      <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 mb-8 overflow-hidden">
        {/* Main Search Row */}
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between mb-6">
          <div className="relative flex-1 group w-full md:max-w-2xl">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-accent transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Tìm kiếm theo tên, mã số, quê quán..."
              className="w-full pl-16 pr-6 py-4 bg-white/5 border border-white/10 rounded-full text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:bg-white/[0.08] transition-all outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all border",
                isAdvancedSearchOpen 
                  ? "bg-accent text-accent-foreground border-accent" 
                  : "bg-white/5 text-white/60 border-white/10 hover:border-white/20"
              )}
            >
              <Filter size={14} />
              Tìm kiếm nâng cao
              {isAdvancedSearchOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <button 
              onClick={resetFilters}
              className="p-3 rounded-full bg-white/5 text-white/40 hover:text-white/80 hover:bg-white/10 transition-all border border-white/10"
              title="Đặt lại bộ lọc"
            >
              <RotateCcw size={16} />
            </button>

            <button 
              onClick={() => setShowSavePreset(!showSavePreset)}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-[10px] uppercase tracking-widest font-bold bg-white/5 text-white/60 border border-white/10 hover:border-accent/40 hover:text-accent transition-all"
            >
              <Bookmark size={14} />
              Lưu mẫu
            </button>
          </div>
        </div>

        {/* Saved Presets */}
        {profile?.presets && profile.presets.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 animate-in fade-in slide-in-from-top-2">
            <span className="text-[10px] uppercase tracking-widest text-white/20 font-bold self-center mr-2">Mẫu đã lưu:</span>
            {profile.presets.map((preset) => (
              <div key={preset.id} className="group flex items-center bg-white/5 border border-white/10 rounded-full pl-4 pr-1 py-1 transition-all hover:border-accent/30">
                <button 
                  onClick={() => applyPreset(preset)}
                  className="text-[10px] font-bold text-white/60 hover:text-accent tracking-tight mr-2"
                >
                  {preset.name}
                </button>
                <button 
                  onClick={() => deletePreset(preset.id)}
                  className="p-1.5 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Save Preset Input */}
        {showSavePreset && (
          <div className="mb-6 p-6 bg-accent/5 border border-accent/20 rounded-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-widest text-accent/60 font-bold mb-2 block">Tên mẫu tìm kiếm mới</label>
                <input 
                  type="text"
                  placeholder="VD: Đoàn viên K2020 Xuất sắc"
                  className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-accent/40 lg:text-sm"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowSavePreset(false)}
                  className="px-6 py-3 rounded-xl text-[10px] uppercase font-bold text-white/40 hover:bg-white/5 transition-all outline-none"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleSavePreset}
                  className="px-8 py-3 bg-accent text-accent-foreground rounded-xl text-[10px] uppercase font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-accent/20 outline-none"
                >
                  <Save size={14} />
                  Lưu mẫu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Filters Panel */}
        {isAdvancedSearchOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 border-t border-white/10 animate-in slide-in-from-top-4 duration-300">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3 block">Chi đoàn</label>
              <div className="relative">
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-medium text-white/80 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all appearance-none cursor-pointer"
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                >
                  <option value="all" className="bg-surface text-white">Tất cả chi đoàn</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id} className="bg-surface text-white">{unit.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={16} />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3 block">Niên khóa / Năm học</label>
              <div className="relative">
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-medium text-white/80 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all appearance-none cursor-pointer"
                  value={selectedAcademicYear}
                  onChange={(e) => setSelectedAcademicYear(e.target.value)}
                >
                  <option value="all" className="bg-surface text-white">Tất cả các khóa</option>
                  {academicYears.map(year => (
                    <option key={year} value={year} className="bg-surface text-white">{year}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={16} />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3 block">Xếp loại đoàn viên</label>
              <div className="relative">
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-medium text-white/80 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all appearance-none cursor-pointer"
                  value={selectedAchievement}
                  onChange={(e) => setSelectedAchievement(e.target.value)}
                >
                  <option value="all" className="bg-surface text-white">Tất cả xếp loại</option>
                  {achievementLevels.map(level => (
                    <option key={level} value={level} className="bg-surface text-white">{level}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={16} />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3 block">Trạng thái</label>
              <div className="relative">
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-medium text-white/80 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all appearance-none cursor-pointer"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all" className="bg-surface text-white">Tất cả trạng thái</option>
                  {Object.keys(statusColors).map(status => (
                    <option key={status} value={status} className="bg-surface text-white">{status}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={16} />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3 block">Quê quán (Lọc theo tỉnh/thành)</label>
              <input 
                type="text"
                placeholder="VD: Hà Nội, Nghệ An..."
                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all outline-none text-sm"
                value={selectedHometown}
                onChange={(e) => setSelectedHometown(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] overflow-hidden flex flex-col min-h-[600px]">

        {/* Table Content */}
        {loading ? (
          <div className="p-24 text-center items-center flex flex-col gap-4">
             <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
             <p className="text-white/40 text-xs uppercase tracking-widest">Đang kết nối cơ sở dữ liệu</p>
          </div>
        ) : filteredMembers.length > 0 ? (
          <div className="flex-1 overflow-x-auto px-4">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] text-white/30 uppercase tracking-tighter border-b border-white/5">
                  <th className="py-6 px-4 font-normal">Họ và tên</th>
                  <th className="py-6 px-4 font-normal">Mã định danh</th>
                  <th className="py-6 px-4 font-normal text-center">Niên khóa / Xếp loại</th>
                  <th className="py-6 px-4 font-normal">Chi đoàn trực thuộc</th>
                  <th className="py-6 px-4 font-normal">Trạng thái</th>
                  <th className="py-6 px-4 font-normal text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-6 px-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center font-serif italic text-xl text-white group-hover:border-accent transition-all">
                          {member.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-serif italic text-white text-lg group-hover:text-accent transition-colors">{member.fullName}</p>
                          <p className="text-[10px] uppercase tracking-widest text-white/30 mt-0.5">{member.gender === "Nam" ? "Nam" : "Nữ"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-4 font-mono text-xs text-white/40 tabular-nums">{member.memberId}</td>
                    <td className="py-6 px-4">
                      <div className="flex flex-col items-center">
                        <span className="text-white/60 text-xs font-medium uppercase tracking-wider">{member.academicYear || "---"}</span>
                        <span className={cn(
                          "text-[9px] uppercase font-bold mt-1 px-2 py-0.5 rounded border",
                          member.achievementLevel === "Xuất sắc" ? "text-accent border-accent/20 bg-accent/5" :
                          member.achievementLevel === "Khá" ? "text-white/80 border-white/10" :
                          "text-white/20 border-white/5"
                        )}>
                          {member.achievementLevel || "Chưa xếp loại"}
                        </span>
                      </div>
                    </td>
                    <td className="py-6 px-4 text-white/60 text-sm italic">{getUnitName(member.unitId)}</td>
                    <td className="py-6 px-4">
                      <span className={cn(
                        "px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-widest font-bold",
                        member.status === "Đang sinh hoạt" ? "text-green-400 border-green-500/20" :
                        member.status === "Đã chuyển sinh hoạt" ? "text-blue-400 border-blue-500/20" :
                        member.status === "Đã trưởng thành" ? "text-gray-400 border-white/10" :
                        "text-red-400 border-red-500/20"
                      )}>
                        {member.status}
                      </span>
                    </td>
                    <td className="py-6 px-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => handleViewHistory(member)}
                          className="px-4 py-2 text-[10px] font-bold uppercase tracking-tighter text-accent hover:bg-accent/10 rounded-full transition-all"
                        >
                          Lịch sử
                        </button>
                        <button 
                          onClick={() => handleEdit(member)}
                          className="px-4 py-2 text-[10px] font-bold uppercase tracking-tighter text-blue-400 hover:bg-blue-500/10 rounded-full transition-all"
                        >
                          Hồ sơ
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => handleDelete(member.id)}
                            className="px-4 py-2 text-[10px] font-bold uppercase tracking-tighter text-red-400 hover:bg-red-500/10 rounded-full transition-all"
                          >
                            Xóa
                          </button>
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
            <Users size={48} className="text-white/10 mb-2" />
            <p className="text-white/30 italic text-sm">Không tìm thấy đoàn viên nào theo tiêu chí lọc</p>
          </div>
        )}

        <div className="px-8 py-4 border-t border-white/5 flex justify-between items-center text-[10px] text-white/30 uppercase tracking-widest font-semibold mt-auto">
          <span>Kết quả tìm kiếm: {filteredMembers.length} hồ sơ</span>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] w-full max-w-2xl shadow-2xl p-1 my-8 animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-serif text-white italic">
                  {editingId ? "Cập nhật hồ sơ đoàn viên" : "Đăng ký đoàn viên mới"}
                </h3>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Thông tin chi tiết về đoàn viên thanh niên</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full text-white/40 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                  <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Họ và tên đầy đủ</label>
                  <input
                    required
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all placeholder:text-white/10 italic"
                    value={newMember.fullName}
                    onChange={(e) => setNewMember({...newMember, fullName: e.target.value})}
                    placeholder="VD: Nguyễn Hoàng Nam"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Quê quán</label>
                  <input
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all placeholder:text-white/10"
                    value={newMember.hometown}
                    onChange={(e) => setNewMember({...newMember, hometown: e.target.value})}
                    placeholder="Nhập quê quán (Tỉnh/Thành phố)..."
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Mã đoàn viên (MSSV)</label>
                  <input
                    required
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all tabular-nums"
                    value={newMember.memberId}
                    onChange={(e) => setNewMember({...newMember, memberId: e.target.value})}
                    placeholder="VD: 2024001"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Ngày tháng năm sinh</label>
                  <input
                    type="date"
                    required
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all"
                    value={newMember.dob}
                    onChange={(e) => setNewMember({...newMember, dob: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Niên khóa / Năm học</label>
                  <input
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all placeholder:text-white/10"
                    value={newMember.academicYear}
                    onChange={(e) => setNewMember({...newMember, academicYear: e.target.value})}
                    placeholder="VD: K2020-2024"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Phân loại thành tích</label>
                  <select
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all appearance-none cursor-pointer"
                    value={newMember.achievementLevel}
                    onChange={(e) => setNewMember({...newMember, achievementLevel: e.target.value as any})}
                  >
                    {achievementLevels.map(level => (
                      <option key={level} value={level} className="bg-surface">{level}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Giới tính</label>
                  <select
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all appearance-none cursor-pointer"
                    value={newMember.gender}
                    onChange={(e) => setNewMember({...newMember, gender: e.target.value as any})}
                  >
                    <option value="Nam" className="bg-surface">Nam</option>
                    <option value="Nữ" className="bg-surface">Nữ</option>
                    <option value="Khác" className="bg-surface">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Chi đoàn trực thuộc</label>
                  <select
                    required
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all appearance-none cursor-pointer"
                    value={newMember.unitId}
                    onChange={(e) => setNewMember({...newMember, unitId: e.target.value})}
                  >
                    {units.map(unit => (
                      <option key={unit.id} value={unit.id} className="bg-surface">{unit.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Trạng thái sinh hoạt</label>
                  <select
                    className={cn(
                      "w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all appearance-none",
                      editingId ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                    )}
                    value={newMember.status}
                    onChange={(e) => setNewMember({...newMember, status: e.target.value as any})}
                    disabled={!editingId}
                  >
                    <option value="Đang sinh hoạt" className="bg-surface">Đang sinh hoạt</option>
                    <option value="Đã chuyển sinh hoạt" className="bg-surface">Đã chuyển sinh hoạt</option>
                    <option value="Đã trưởng thành" className="bg-surface">Đã trưởng thành</option>
                    <option value="Bị kỷ luật" className="bg-surface">Bị kỷ luật</option>
                  </select>
                  {!editingId && <p className="text-[10px] text-accent mt-2 italic font-bold">Mặc định cho đoàn viên mới đăng ký</p>}
                </div>
                {editingId && members.find(m => m.id === editingId)?.status !== newMember.status && (
                  <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[11px] uppercase tracking-widest text-accent font-bold mb-3 block italic">Lý do thay đổi trạng thái*</label>
                    <input
                      required
                      className="w-full px-6 py-4 bg-accent/5 border border-accent/20 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all italic"
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      placeholder="Nhập lý do thay đổi (VD: Chuyển trường, Hết tuổi Đoàn...)"
                    />
                  </div>
                )}
              </div>
              <div className="pt-8 flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-8 py-4 border border-white/10 rounded-full font-bold text-sm uppercase tracking-widest text-white/60 hover:bg-white/5 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 px-8 py-4 bg-white text-black rounded-full font-bold text-sm uppercase tracking-widest hover:bg-gray-200 transition-all shadow-xl"
                >
                  Lưu hồ sơ đoàn viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status History Modal */}
      {showHistoryModal && historyMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] w-full max-w-xl shadow-2xl p-1 my-8 animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02] rounded-t-[2.4rem]">
              <div>
                <h3 className="text-2xl font-serif text-white italic">
                  Lịch sử trạng thái
                </h3>
                <p className="text-[10px] text-accent uppercase tracking-[0.2em] font-bold mt-1">{historyMember.fullName}</p>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full text-white/40 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {!historyMember.statusHistory || historyMember.statusHistory.length === 0 ? (
                <div className="text-center py-12">
                   <p className="text-white/20 italic text-sm">Chưa có ghi nhận thay đổi trạng thái nào cho đoàn viên này.</p>
                </div>
              ) : (
                <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
                  {historyMember.statusHistory.map((change, idx) => (
                    <div key={idx} className="pl-10 relative">
                       <div className="absolute left-0 top-2 w-6 h-6 bg-[#0f0f0f] border border-accent rounded-full flex items-center justify-center -translate-x-1/2">
                          <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                       </div>
                       <div className="bg-white/[0.03] border border-white/5 p-5 rounded-2xl">
                          <div className="flex justify-between items-start mb-2">
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase font-bold text-white/40">{change.oldStatus}</span>
                                <span className="text-accent">→</span>
                                <span className="text-[10px] uppercase font-bold text-white leading-none">{change.newStatus}</span>
                             </div>
                             <span className="text-[10px] text-white/20 font-mono tracking-tighter">
                                {new Date(change.date).toLocaleDateString("vi-VN")}
                             </span>
                          </div>
                          <p className="text-sm text-white/60 italic font-serif leading-relaxed">"{change.reason || "Không có nội dung"}"</p>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-8 border-t border-white/5 flex justify-end">
               <button
                  onClick={() => setShowHistoryModal(false)}
                  className="px-8 py-3 bg-white text-black rounded-full font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Đóng
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
