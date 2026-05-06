import React, { useEffect, useState, useMemo } from "react";
import { dataService } from "../../services/dataService";
import { Member, Unit } from "../../types";
import { Trash2, Edit3, Search, Plus, Users, Filter, UserCircle, X, ChevronDown, ChevronUp, Save, Bookmark, History, RotateCcw, Star, Eye, Mail, Phone, MapPin, Calendar as CalendarIcon, Hash, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { CustomSelect } from "../../components/CustomSelect";
import { cn } from "../../lib/utils";
import Fuse from "fuse.js";
import { useAuth } from "../../contexts/AuthContext";
import { useSearch } from "../../contexts/SearchContext";
import { useLiveSync } from "../../hooks/useLiveSync";
import { motion, AnimatePresence } from "motion/react";
import { SearchPreset } from "../../types";

export const MemberList: React.FC = () => {
  const { isAdmin, isSecretary, profile, savePreset, deletePreset } = useAuth();
  const { searchTerm, setSearchTerm } = useSearch();
  const [members, setMembers] = useState<Member[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("all");
  const [selectedAchievement, setSelectedAchievement] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [selectedHometown, setSelectedHometown] = useState<string>("");
  
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [showSavePreset, setShowSavePreset] = useState(false);

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsMember, setDetailsMember] = useState<Member | null>(null);
  const [historyMember, setHistoryMember] = useState<Member | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [sortField, setSortField] = useState<keyof Member>("fullName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [statusReason, setStatusReason] = useState("");
  const [newUnit, setNewUnit] = useState({ name: "", code: "", email: "", address: "" });
  const [newMember, setNewMember] = useState<Omit<Member, "id" | "createdAt" | "statusHistory">>({
    fullName: "",
    memberId: "",
    dob: "",
    gender: "Nam",
    ethnic: "",
    religion: "",
    placeOfBirth: "",
    hometown: "",
    permanentAddress: "",
    joinDate: "",
    unitId: "",
    email: "",
    phone: "",
    academicYear: "",
    professionalLevel: "",
    position: "",
    achievementLevel: "Chưa xếp loại",
    status: "Đang sinh hoạt",
    isOutstanding: false
  });

  const academicYears = useMemo(() => {
    if (!Array.isArray(members)) return [];
    const years = members.map(m => m.academicYear).filter(Boolean) as string[];
    return Array.from(new Set(years)).sort();
  }, [members]);

  const achievementLevels = ["Xuất sắc", "Khá", "Trung bình", "Chưa xếp loại"];

  const unitOptions = [{ value: "all", label: "Tất cả chi đoàn" }, ...units.map(u => ({ value: u.id, label: u.name }))];
  const academicYearOptions = [{ value: "all", label: "Tất cả các khóa" }, ...academicYears.map(y => ({ value: y, label: y }))];
  const achievementOptions = [{ value: "all", label: "Tất cả xếp loại" }, ...achievementLevels.map(l => ({ value: l, label: l }))];
  const genderOptions = [
    { value: "all", label: "Tất cả giới tính" },
    { value: "Nam", label: "Nam" },
    { value: "Nữ", label: "Nữ" },
    { value: "Khác", label: "Khác" }
  ];

  const achievementOptionsModal = achievementLevels.map(l => ({ value: l, label: l }));
  const genderOptionsModal = [
    { value: "Nam", label: "Nam" },
    { value: "Nữ", label: "Nữ" },
    { value: "Khác", label: "Khác" }
  ];
  
  const statusColors = {
    "Đang sinh hoạt": "bg-green-100 text-green-700",
    "Đã chuyển sinh hoạt": "bg-blue-100 text-blue-700",
    "Đã trưởng thành": "bg-gray-100 text-gray-700",
    "Bị kỷ luật": "bg-red-100 text-red-700",
  };

  const statusOptions = [{ value: "all", label: "Tất cả trạng thái" }, ...Object.keys(statusColors).map(s => ({ value: s, label: s }))];
  const unitOptionsModal = units.map(u => ({ value: u.id, label: u.name }));
  const statusOptionsModal = Object.keys(statusColors).map(s => ({ value: s, label: s }));

  useEffect(() => {
    loadData();
  }, [profile?.unitId]); // Reload when profile unit changes

  const loadData = () => {
    Promise.all([
      dataService.getMembers(),
      dataService.getUnits()
    ]).then(([mData, uData]) => {
      // Nếu là Bí thư, chỉ lấy đoàn viên thuộc chi đoàn của mình
      const filteredMData = isSecretary && profile?.unitId 
        ? mData.filter(m => m.unitId === profile.unitId)
        : mData;

      setMembers(filteredMData);
      setUnits(uData);
      setLoading(false);
      
      if (uData.length > 0 && !newMember.unitId) {
        // Bí thư thì mặc định chọn đúng đơn vị của mình
        const defaultUnitId = isSecretary && profile?.unitId ? profile.unitId : uData[0].id;
        setNewMember(prev => ({ ...prev, unitId: defaultUnitId }));
      }
    });
  };

  useLiveSync("members:changed", loadData);
  useLiveSync("units:changed", loadData);

  const getUnitName = (id: string) => {
    return units.find(u => u.id === id)?.name || "N/A";
  };

  const filteredMembers = useMemo(() => {
    if (!Array.isArray(members)) return [];
    
    // First apply sidebar/header dropdown filters
    let result = members.filter(member => {
      const matchesUnit = selectedUnit === "all" || member.unitId === selectedUnit;
      const matchesStatus = selectedStatus === "all" || member.status === selectedStatus;
      const matchesYear = selectedAcademicYear === "all" || member.academicYear === selectedAcademicYear;
      const matchesAchievement = selectedAchievement === "all" || member.achievementLevel === selectedAchievement;
      const matchesGender = selectedGender === "all" || member.gender === selectedGender;
      const matchesHometown = !selectedHometown || (member.hometown || "").toLowerCase().includes(selectedHometown.toLowerCase());
      return matchesUnit && matchesStatus && matchesYear && matchesAchievement && matchesGender && matchesHometown;
    });

    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      
      // Try exact/include match first for identifiers (MSSV, Email, Name)
      const exactMatches = result.filter(m => 
        m.memberId.toLowerCase().includes(lowerSearch) || 
        m.fullName.toLowerCase().includes(lowerSearch) ||
        (m.email || "").toLowerCase().includes(lowerSearch)
      );

      if (exactMatches.length > 0) {
        // If we have exact/substring matches, use them (prioritize those matching from start)
        exactMatches.sort((a, b) => {
          const aStarts = a.memberId.toLowerCase().startsWith(lowerSearch) || a.fullName.toLowerCase().startsWith(lowerSearch);
          const bStarts = b.memberId.toLowerCase().startsWith(lowerSearch) || b.fullName.toLowerCase().startsWith(lowerSearch);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return 0;
        });
        result = exactMatches;
      } else {
        // Fallback to fuzzy search if no exact substring matches
        const fuse = new Fuse(result, {
          keys: ["fullName", "memberId", "hometown", "academicYear", "email", "phone"],
          threshold: 0.3, // More strict threshold for precision
          distance: 100,
          minMatchCharLength: 1,
        });
        result = fuse.search(searchTerm).map(r => r.item);
      }
    }

    // Sorting Logic
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle strings (case-insensitive)
      if (typeof valA === "string" && typeof valB === "string") {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      // Handle null/undefined
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [members, searchTerm, selectedUnit, selectedStatus, selectedAcademicYear, selectedAchievement, selectedGender, selectedHometown, sortField, sortDirection]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedUnit, selectedStatus, selectedAcademicYear, selectedAchievement, selectedGender, selectedHometown]);

  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredMembers.slice(startIndex, startIndex + pageSize);
  }, [filteredMembers, currentPage]);

  const totalPages = Math.ceil(filteredMembers.length / pageSize);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedUnit("all");
    setSelectedStatus("all");
    setSelectedAcademicYear("all");
    setSelectedAchievement("all");
    setSelectedGender("all");
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
        gender: selectedGender,
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
    setSelectedGender(preset.filters.gender || "all");
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
          ethnic: "",
          hometown: "",
          joinDate: "",
          unitId: units[0]?.id || "",
          email: "",
          phone: "",
          academicYear: "",
          achievementLevel: "Chưa xếp loại",
          status: "Đang sinh hoạt",
          isOutstanding: false
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
          ethnic: "",
          hometown: "",
          joinDate: "",
          unitId: units[0]?.id || "",
          email: "",
          phone: "",
          academicYear: "",
          achievementLevel: "Chưa xếp loại",
          status: "Đang sinh hoạt",
          isOutstanding: false
        });
      });
    }
  };

  const handleToggleOutstanding = async (member: Member) => {
    const newValue = !member.isOutstanding;
    await dataService.toggleMemberOutstanding(member.id, newValue);
    // useLiveSync will handle the state update via loadData, 
    // but we can optimistic update for better UX if needed.
    // For now, reload via loadData is safer and handles real-time sync.
  };

  const handleSort = (field: keyof Member) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
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
      ethnic: member.ethnic || "",
      hometown: member.hometown || "",
      joinDate: member.joinDate || "",
      unitId: member.unitId,
      email: member.email || "",
      phone: member.phone || "",
      academicYear: member.academicYear || "",
      achievementLevel: member.achievementLevel || "Chưa xếp loại",
      status: member.status,
      isOutstanding: !!member.isOutstanding
    });
    setShowModal(true);
  };

  const handleViewHistory = (member: Member) => {
    setHistoryMember(member);
    setShowHistoryModal(true);
  };

  const handleViewDetails = (member: Member) => {
    setDetailsMember(member);
    setShowDetailsModal(true);
  };

  const openAddModal = () => {
    setEditingId(null);
    setStatusReason("");
    setNewMember({
      fullName: "",
      memberId: "",
      dob: "",
      gender: "Nam",
      ethnic: "",
      hometown: "",
      joinDate: "",
      unitId: units[0]?.id || "",
      email: "",
      phone: "",
      academicYear: "",
      achievementLevel: "Chưa xếp loại",
      status: "Đang sinh hoạt",
      isOutstanding: false
    });
    setShowModal(true);
  };

  const handleUnitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dataService.addUnit(newUnit).then((createdUnit) => {
      loadData();
      setShowUnitModal(false);
      setNewUnit({ name: "", code: "", email: "", address: "" });
      setNewMember(prev => ({ ...prev, unitId: createdUnit.id }));
    });
  };

  return (
    <div id="member-list-container">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-serif text-white flex items-center gap-4 italic tracking-tight">
            <Users className="text-accent" size={36} />
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

      <div className="bg-surface/40 border border-white/5 rounded-[2rem] p-8 mb-8 pb-32 shadow-xl backdrop-blur-sm">
        {/* Main Search Row */}
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between mb-6">
          <form 
            onSubmit={(e) => e.preventDefault()}
            className="relative flex-1 group w-full md:max-w-2xl"
          >
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-accent transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Tìm kiếm theo tên, MSSV, quê quán..."
              className="w-full pl-16 pr-6 py-4 bg-white/5 border border-white/10 rounded-full text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:bg-white/[0.08] transition-all outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
          
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
            <CustomSelect
              label="Chi đoàn"
              options={unitOptions}
              value={selectedUnit}
              onChange={setSelectedUnit}
            />

            <CustomSelect
              label="Niên khóa / Năm học"
              options={academicYearOptions}
              value={selectedAcademicYear}
              onChange={setSelectedAcademicYear}
            />

            <CustomSelect
              label="Xếp loại đoàn viên"
              options={achievementOptions}
              value={selectedAchievement}
              onChange={setSelectedAchievement}
            />

            <CustomSelect
              label="Trạng thái"
              options={statusOptions}
              value={selectedStatus}
              onChange={setSelectedStatus}
            />

            <CustomSelect
              label="Giới tính"
              options={genderOptions}
              value={selectedGender}
              onChange={setSelectedGender}
            />

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

      <div className="bg-surface/60 border border-white/5 rounded-[2rem] overflow-hidden flex flex-col min-h-[600px] shadow-2xl backdrop-blur-md">

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
                  <th className="py-6 px-4 font-normal text-center w-12">STT</th>
                  <th 
                    className="py-6 px-4 font-normal cursor-pointer hover:text-white transition-colors group/header"
                    onClick={() => handleSort("fullName")}
                  >
                    <div className="flex items-center gap-2">
                      Họ và tên
                      <span className={cn("transition-opacity", sortField === "fullName" ? "opacity-100" : "opacity-0 group-hover/header:opacity-40")}>
                        {sortField === "fullName" ? (sortDirection === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                      </span>
                    </div>
                  </th>
                  <th 
                    className="py-6 px-4 font-normal cursor-pointer hover:text-white transition-colors group/header"
                    onClick={() => handleSort("memberId")}
                  >
                    <div className="flex items-center gap-2">
                      Mã số sinh viên
                      <span className={cn("transition-opacity", sortField === "memberId" ? "opacity-100" : "opacity-0 group-hover/header:opacity-40")}>
                        {sortField === "memberId" ? (sortDirection === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                      </span>
                    </div>
                  </th>
                  <th className="py-6 px-4 font-normal text-center">Niên khóa / Xếp loại</th>
                  <th className="py-6 px-4 font-normal">Chi đoàn trực thuộc</th>
                  <th 
                    className="py-6 px-4 font-normal cursor-pointer hover:text-white transition-colors group/header"
                    onClick={() => handleSort("joinDate")}
                  >
                    <div className="flex items-center gap-2">
                      Ngày vào đoàn
                      <span className={cn("transition-opacity", sortField === "joinDate" ? "opacity-100" : "opacity-0 group-hover/header:opacity-40")}>
                        {sortField === "joinDate" ? (sortDirection === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                      </span>
                    </div>
                  </th>
                  <th className="py-6 px-4 font-normal">Trạng thái</th>
                  <th className="py-6 px-4 font-normal text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedMembers.map((member, index) => (
                  <tr key={member.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-6 px-4 text-center font-mono text-xs text-white/60 tabular-nums">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/5 border border-white/5">
                        {(currentPage - 1) * pageSize + index + 1}
                      </span>
                    </td>
                    <td className="py-6 px-4">
      <div className="flex items-center gap-4">
        <div className="relative group/avatar">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center font-serif italic text-xl text-white group-hover:border-accent transition-all overflow-hidden">
            {member.fullName.charAt(0)}
          </div>
          <button 
            onClick={() => handleToggleOutstanding(member)}
            className={cn(
              "absolute -top-1 -right-1 p-1.5 rounded-full border transition-all transform hover:scale-110",
              member.isOutstanding 
                ? "bg-yellow-400 border-yellow-500 text-black shadow-[0_0_15px_rgba(250,204,21,0.4)]" 
                : "bg-surface/60 border-white/10 text-white/20 hover:text-white/60"
            )}
            title={member.isOutstanding ? "Bỏ đánh dấu tiêu biểu" : "Đánh dấu đoàn viên tiêu biểu"}
          >
            <Star size={10} fill={member.isOutstanding ? "currentColor" : "none"} />
          </button>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-serif italic text-white text-lg group-hover:text-accent transition-colors">{member.fullName}</p>
            {member.isOutstanding && (
              <span className="bg-yellow-400/10 text-yellow-500 text-[8px] px-1.5 py-0.5 rounded-sm uppercase font-bold tracking-widest border border-yellow-500/20">Tiêu biểu</span>
            )}
          </div>
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
                    <td className="py-6 px-4 font-mono text-[10px] text-white/40 tabular-nums">{member.joinDate || "---"}</td>
                    <td className="py-6 px-4">
                      <span className={cn(
                        "px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-normal font-bold whitespace-nowrap",
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
                          onClick={() => handleViewDetails(member)}
                          className="px-4 py-2 text-[10px] font-bold uppercase tracking-tighter text-white/60 hover:bg-white/10 rounded-full transition-all flex items-center gap-1"
                        >
                          <Eye size={12} />
                          Chi tiết
                        </button>
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

        <div className="px-8 py-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 mt-auto">
          <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold italic">
            Hiển thị {Math.min(filteredMembers.length, (currentPage - 1) * pageSize + 1)}-{Math.min(filteredMembers.length, currentPage * pageSize)} trong tổng số {filteredMembers.length} hồ sơ
          </span>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-white/5 transition-all outline-none"
              >
                <ChevronDown className="rotate-90" size={16} />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  // Only show current page, first, last, and neighbors
                  if (
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-[10px] font-bold transition-all outline-none",
                          currentPage === page 
                            ? "bg-accent text-accent-foreground" 
                            : "bg-white/5 text-white/40 hover:bg-white/10"
                        )}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    (page === currentPage - 2 && page > 1) || 
                    (page === currentPage + 2 && page < totalPages)
                  ) {
                    return <span key={page} className="px-1 text-white/20">...</span>;
                  }
                  return null;
                })}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-white/5 transition-all outline-none"
              >
                <ChevronDown className="-rotate-90" size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="p-8 border-b border-white/5 flex justify-between items-center shrink-0 bg-white/[0.01]">
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
            
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
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
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Email</label>
                    <input
                      type="email"
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all placeholder:text-white/10"
                      value={newMember.email}
                      onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                      placeholder="VD: name@domain.com"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Số điện thoại</label>
                    <input
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all placeholder:text-white/10 tabular-nums"
                      value={newMember.phone}
                      onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                      placeholder="VD: 090xxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Nơi sinh</label>
                    <input
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all placeholder:text-white/10"
                      value={newMember.placeOfBirth}
                      onChange={(e) => setNewMember({...newMember, placeOfBirth: e.target.value})}
                      placeholder="VD: Hải Phòng..."
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Quê quán</label>
                    <input
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all placeholder:text-white/10"
                      value={newMember.hometown}
                      onChange={(e) => setNewMember({...newMember, hometown: e.target.value})}
                      placeholder="Nhập quê quán (Tỉnh/Thành phố)..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Địa chỉ thường trú</label>
                    <input
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all placeholder:text-white/10"
                      value={newMember.permanentAddress}
                      onChange={(e) => setNewMember({...newMember, permanentAddress: e.target.value})}
                      placeholder="Nhập đầy đủ địa chỉ thường trú..."
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Dân tộc</label>
                    <input
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all placeholder:text-white/10"
                      value={newMember.ethnic}
                      onChange={(e) => setNewMember({...newMember, ethnic: e.target.value})}
                      placeholder="VD: Kinh..."
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Tôn giáo</label>
                    <input
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all placeholder:text-white/10"
                      value={newMember.religion}
                      onChange={(e) => setNewMember({...newMember, religion: e.target.value})}
                      placeholder="VD: Không, Phật giáo..."
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Mã số sinh viên (MSSV)</label>
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
                    <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Chức vụ trong Đoàn</label>
                    <input
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all placeholder:text-white/10"
                      value={newMember.position}
                      onChange={(e) => setNewMember({...newMember, position: e.target.value})}
                      placeholder="VD: Bí thư, Phó Bí thư, Ủy viên..."
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Trình độ chuyên môn</label>
                    <input
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all placeholder:text-white/10"
                      value={newMember.professionalLevel}
                      onChange={(e) => setNewMember({...newMember, professionalLevel: e.target.value})}
                      placeholder="VD: Đại học, Cao đẳng..."
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
                    <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Ngày vào Đoàn</label>
                    <input
                      type="date"
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all"
                      value={newMember.joinDate}
                      onChange={(e) => setNewMember({...newMember, joinDate: e.target.value})}
                    />
                  </div>
                  <CustomSelect
                    label="Phân loại thành tích"
                    options={achievementOptionsModal}
                    value={newMember.achievementLevel}
                    onChange={(val) => setNewMember({...newMember, achievementLevel: val as any})}
                  />
                  <CustomSelect
                    label="Giới tính"
                    options={genderOptionsModal}
                    value={newMember.gender}
                    onChange={(val) => setNewMember({...newMember, gender: val as any})}
                  />
                  <div className="md:col-span-2">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold block">Chi đoàn trực thuộc</label>
                      {isAdmin && (
                        <button 
                          type="button"
                          onClick={() => setShowUnitModal(true)}
                          className="text-[10px] text-accent font-bold uppercase tracking-widest hover:underline flex items-center gap-1"
                        >
                          <Plus size={12} />
                          Tạo đơn vị mới
                        </button>
                      )}
                    </div>
                    <CustomSelect
                      disabled={isSecretary}
                      options={unitOptionsModal}
                      value={newMember.unitId}
                      onChange={(val) => setNewMember({...newMember, unitId: val})}
                      placeholder="Chọn chi đoàn..."
                    />
                    {isSecretary && <p className="text-[9px] text-white/20 mt-2 italic">Bạn chỉ có quyền quản lý đoàn viên trong chi đoàn được phân công.</p>}
                  </div>
                  <div className="md:col-span-2">
                    <CustomSelect
                      label="Trạng thái sinh hoạt"
                      disabled={!editingId}
                      options={statusOptionsModal}
                      value={newMember.status}
                      onChange={(val) => setNewMember({...newMember, status: val as any})}
                    />
                    {!editingId && <p className="text-[10px] text-accent mt-2 italic font-bold">Mặc định cho đoàn viên mới đăng ký</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer group p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-accent/30 transition-all">
                      <div className={cn(
                        "w-6 h-6 rounded-md border flex items-center justify-center transition-all",
                        newMember.isOutstanding 
                          ? "bg-yellow-400 border-yellow-500 text-black" 
                          : "bg-white/5 border-white/10 text-transparent"
                      )}>
                        <Star size={14} fill={newMember.isOutstanding ? "currentColor" : "none"} />
                      </div>
                      <input 
                        type="checkbox"
                        className="hidden"
                        checked={newMember.isOutstanding}
                        onChange={(e) => setNewMember({...newMember, isOutstanding: e.target.checked})}
                      />
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-accent transition-colors">Đoàn viên tiêu biểu</p>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest">Đánh dấu gương mặt xuất sắc của đơn vị</p>
                      </div>
                    </label>
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
          </motion.div>
        </div>
      )}

      {/* Detailed Member View Modal */}
      {showDetailsModal && detailsMember && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background/90 backdrop-blur-xl transition-all">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-surface border border-white/10 rounded-[3rem] w-full max-w-3xl shadow-[0_0_100px_-20px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header with Avatar and Name */}
            <div className="relative p-10 bg-gradient-to-br from-white/[0.03] to-transparent shrink-0">
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/50 hover:text-white transition-all z-10"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="relative">
                  <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-5xl font-serif italic text-white shadow-2xl overflow-hidden">
                    {detailsMember.fullName.charAt(0)}
                  </div>
                  {detailsMember.isOutstanding && (
                    <div className="absolute -top-3 -right-3 bg-yellow-400 text-black p-2.5 rounded-2xl border-4 border-[#0a0a0a] shadow-xl">
                      <Star size={16} fill="currentColor" />
                    </div>
                  )}
                </div>
                
                <div className="text-center md:text-left pt-2">
                  <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                    <h2 className="text-4xl font-serif italic text-white leading-tight">{detailsMember.fullName}</h2>
                    <span className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] uppercase tracking-normal font-bold border whitespace-nowrap",
                      detailsMember.status === "Đang sinh hoạt" ? "text-green-400 bg-green-500/10 border-green-500/20 shadow-[0_0_20px_rgba(74,222,128,0.1)]" :
                      detailsMember.status === "Đã chuyển sinh hoạt" ? "text-blue-400 bg-blue-500/10 border-blue-500/20" :
                      detailsMember.status === "Đã trưởng thành" ? "text-gray-400 bg-white/5 border-white/10" :
                      "text-red-400 bg-red-500/10 border-red-500/20"
                    )}>
                      {detailsMember.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm">
                    <div className="flex items-center gap-2 text-white/40">
                      <Hash size={14} className="text-accent" />
                      <span className="font-mono text-xs">{detailsMember.memberId}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/40">
                      <UserCircle size={14} className="text-accent" />
                      <span>{detailsMember.gender}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/40">
                      <MapPin size={14} className="text-accent" />
                      <span>{detailsMember.hometown || "Chưa cập nhật"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Information Grid */}
            <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Academic Group */}
                <div className="space-y-6">
                  <h4 className="text-[10px] uppercase tracking-[0.3em] font-black text-accent/60 mb-4 border-b border-white/5 pb-2">Học tập & Hoạt động</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1 font-bold">Chi đoàn</p>
                      <p className="text-white text-sm font-medium italic">{getUnitName(detailsMember.unitId)}</p>
                    </div>
                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1 font-bold">Quê quán</p>
                      <p className="text-white text-sm font-medium">{detailsMember.hometown || "N/A"}</p>
                    </div>
                  </div>

                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1 font-bold">Nơi sinh</p>
                    <p className="text-white text-sm font-medium">{detailsMember.placeOfBirth || "Chưa cập nhật"}</p>
                  </div>

                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1 font-bold">Địa chỉ thường trú</p>
                    <p className="text-white text-sm font-medium">{detailsMember.permanentAddress || "Chưa cập nhật"}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1 font-bold">Dân tộc</p>
                      <p className="text-white text-sm font-medium">{detailsMember.ethnic || "Kinh"}</p>
                    </div>
                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1 font-bold">Tôn giáo</p>
                      <p className="text-white text-sm font-medium">{detailsMember.religion || "Không"}</p>
                    </div>
                  </div>

                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1 font-bold">Chức vụ</p>
                    <p className="text-white text-sm font-medium italic">{detailsMember.position || "Đoàn viên"}</p>
                  </div>

                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1 font-bold">Trình độ chuyên môn</p>
                    <p className="text-white text-sm font-medium">{detailsMember.professionalLevel || "Chưa cập nhật"}</p>
                  </div>

                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1 font-bold">Xếp loại đoàn viên</p>
                    <div className="flex items-center gap-3">
                      <p className="text-white font-bold">{detailsMember.achievementLevel || "Chưa xếp loại"}</p>
                      {detailsMember.achievementLevel === "Xuất sắc" && (
                        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                      )}
                    </div>
                  </div>

                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1 font-bold">Ngày vào Đoàn</p>
                    <div className="flex items-center gap-3 text-white">
                      <CalendarIcon size={16} className="text-accent" />
                      <p className="font-mono">{detailsMember.joinDate || "---"}</p>
                    </div>
                  </div>
                </div>

                {/* Personal Group */}
                <div className="space-y-6">
                  <h4 className="text-[10px] uppercase tracking-[0.3em] font-black text-white/20 mb-4 border-b border-white/5 pb-2">Liên hệ & Cá nhân</h4>
                  
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                      <Mail size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] uppercase tracking-widest text-white/20 mb-0.5 font-bold">Email</p>
                      <p className="text-white text-sm truncate">{detailsMember.email || "Chưa cập nhật"}</p>
                    </div>
                  </div>

                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                      <Phone size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] uppercase tracking-widest text-white/20 mb-0.5 font-bold">Số điện thoại</p>
                      <p className="text-white text-sm font-mono tracking-tight">{detailsMember.phone || "---"}</p>
                    </div>
                  </div>

                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1 font-bold">Ngày sinh</p>
                    <p className="text-white font-mono">{new Date(detailsMember.dob).toLocaleDateString("vi-VN")}</p>
                  </div>
                  
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1 font-bold">Dân tộc</p>
                    <p className="text-white">{detailsMember.ethnic || "---"}</p>
                  </div>
                </div>
              </div>

              {/* Status Timeline Snippet */}
              <div className="mt-10">
                 <h4 className="text-[10px] uppercase tracking-[0.3em] font-black text-white/20 mb-6 border-b border-white/5 pb-2">Hoạt động gần nhất</h4>
                 {detailsMember.statusHistory && detailsMember.statusHistory.length > 0 ? (
                   <div className="space-y-4">
                      {detailsMember.statusHistory.slice(-2).reverse().map((h, i) => (
                        <div key={i} className="p-5 bg-white/[0.01] border border-white/5 rounded-3xl flex items-start gap-4">
                           <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent shrink-0 mt-1">
                              <History size={14} />
                           </div>
                           <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] text-white/60 font-mono italic">{new Date(h.date).toLocaleDateString("vi-VN")}</span>
                                <span className="text-accent">→</span>
                                <span className="text-[10px] uppercase font-serif italic text-white">{h.newStatus}</span>
                              </div>
                              <p className="text-sm text-white/40 italic">"{h.reason}"</p>
                           </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          setShowDetailsModal(false);
                          handleViewHistory(detailsMember);
                        }}
                        className="text-[10px] uppercase tracking-widest font-bold text-accent py-2 px-6 rounded-full border border-accent/20 hover:bg-accent/10 transition-all"
                      >
                        Xem toàn bộ lịch sử
                      </button>
                   </div>
                 ) : (
                   <p className="text-sm text-white/20 italic">Chưa có thay đổi trạng thái nào được ghi nhận.</p>
                 )}
              </div>
            </div>
            
            <div className="p-8 border-t border-white/5 flex gap-4 shrink-0 bg-white/[0.01]">
              <button 
                onClick={() => {
                  setShowDetailsModal(false);
                  handleEdit(detailsMember);
                }}
                className="flex-1 py-4 bg-white text-black rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all shadow-xl"
              >
                Chỉnh sửa hồ sơ
              </button>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="px-10 py-4 bg-white/5 text-white/60 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Status History Modal */}
      {showHistoryModal && historyMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-xl shadow-2xl p-1 my-8"
          >
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
                       <div className="absolute left-0 top-2 w-6 h-6 bg-surface border border-accent rounded-full flex items-center justify-center -translate-x-1/2">
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
          </motion.div>
        </div>
      )}
      {/* Quick Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface border border-white/10 rounded-[2rem] w-full max-w-md shadow-2xl p-1"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h4 className="text-white font-serif italic text-lg">Tạo đơn vị nhanh</h4>
              <button 
                onClick={() => setShowUnitModal(false)}
                className="text-white/20 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUnitSubmit} className="p-8 space-y-6">
              <div>
                <label className="text-[10px] uppercase text-white/40 font-bold block mb-2">Tên đơn vị</label>
                <input 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
                  value={newUnit.name}
                  onChange={e => setNewUnit({...newUnit, name: e.target.value})}
                  placeholder="VD: Chi đoàn K44"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-white/40 font-bold block mb-2">Mã đơn vị</label>
                <input 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
                  value={newUnit.code}
                  onChange={e => setNewUnit({...newUnit, code: e.target.value})}
                  placeholder="VD: CD44"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowUnitModal(false)}
                  className="flex-1 py-3 text-xs uppercase font-bold text-white/40 hover:bg-white/5 rounded-full transition-all"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-accent text-accent-foreground rounded-full text-xs font-bold uppercase tracking-widest shadow-lg shadow-accent/20"
                >
                  Lưu đơn vị
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
