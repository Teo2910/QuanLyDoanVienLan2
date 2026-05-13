import React, { useEffect, useState, useMemo } from "react";
import { dataService } from "../../services/dataService";
import { Member, Unit } from "../../types";
import { Trash2, Edit3, Search, Plus, Users, Filter, UserCircle, X, ChevronDown, ChevronUp, Save, Bookmark, History, RotateCcw, Star, Eye, Mail, Phone, MapPin, Calendar as CalendarIcon, Hash, ArrowUpDown, ArrowUp, ArrowDown, Download, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { CustomSelect } from "../../components/CustomSelect";
import { cn } from "../../lib/utils";
import Fuse from "fuse.js";
import { useAuth } from "../../contexts/AuthContext";
import { useSearch } from "../../contexts/SearchContext";
import { useLiveSync } from "../../hooks/useLiveSync";
import { motion, AnimatePresence } from "motion/react";
import { SearchPreset } from "../../types";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { ToastContainer, ToastType } from "../../components/Toast";
import { ConfirmModal } from "../../components/ConfirmModal";

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusReason, setStatusReason] = useState("");

  // Notifications and Modal state
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

  const professionalLevelOptions = [
    { value: "Tiến sỹ", label: "Tiến sỹ" },
    { value: "Thạc sỹ", label: "Thạc sỹ" },
    { value: "Đại học", label: "Đại học" },
    { value: "Cao đẳng", label: "Cao đẳng" },
    { value: "Trung cấp", label: "Trung cấp" },
    { value: "Khác", label: "Khác" }
  ];

  const positionOptions = [
    { value: "Bí thư", label: "Bí thư" },
    { value: "Phó Bí thư", label: "Phó Bí thư" },
    { value: "Ủy viên BCH", label: "Ủy viên BCH" },
    { value: "Đoàn viên", label: "Đoàn viên" }
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
      if (sortField === "fullName") {
        const getLastName = (name: string) => {
          const parts = name.trim().split(/\s+/);
          return parts.length > 0 ? parts[parts.length - 1] : "";
        };
        
        const nameA = getLastName(a.fullName);
        const nameB = getLastName(b.fullName);
        
        // Use localeCompare for correct Vietnamese alphabetical order (handling accents)
        const comp = nameA.localeCompare(nameB, 'vi', { sensitivity: 'accent' });
        if (comp !== 0) return sortDirection === "asc" ? comp : -comp;
        
        // If last names are same, compare full names
        return sortDirection === "asc" 
          ? a.fullName.localeCompare(b.fullName, 'vi', { sensitivity: 'accent' })
          : -a.fullName.localeCompare(b.fullName, 'vi', { sensitivity: 'accent' });
      }

      let valA = a[sortField];
      let valB = b[sortField];

      // Handle strings (case-insensitive)
      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB, 'vi', { sensitivity: 'accent' })
          : -valA.localeCompare(valB, 'vi', { sensitivity: 'accent' });
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
    showConfirm(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa đoàn viên này? Hành động này không thể hoàn tác.",
      () => {
        dataService.deleteMember(id).then(() => {
          setMembers(members.filter(m => m.id !== id));
          setSelectedIds(prev => prev.filter(i => i !== id));
          addToast("Đã xóa đoàn viên thành công", "success");
        }).catch(err => {
          addToast("Lỗi khi xóa đoàn viên: " + err.message, "error");
        });
      },
      "danger"
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredMembers.map(m => m.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectMember = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    showConfirm(
      "Xóa hàng loạt",
      `Bạn có chắc chắn muốn xóa ${selectedIds.length} đoàn viên đã chọn?`,
      () => {
        setLoading(true);
        dataService.deleteMembers(selectedIds)
          .then((result: any) => {
            setSelectedIds([]);
            loadData();
            const count = result?.rowsAffected || selectedIds.length;
            addToast(`Đã xóa thành công ${count} mục!`, "success");
          })
          .catch(err => {
            console.error(err);
            addToast("Có lỗi xảy ra khi xóa dữ liệu. Vui lòng kiểm tra lại kết nối server.", "error");
          })
          .finally(() => setLoading(false));
      },
      "danger"
    );
  };

  const handleDeleteAllFiltered = () => {
    if (filteredMembers.length === 0) return;
    showConfirm(
      "Xóa tất cả kết quả",
      `Bạn có chắc chắn muốn xóa TOÀN BỘ ${filteredMembers.length} đoàn viên trong danh sách hiện tại?`,
      () => {
        const ids = filteredMembers.map(m => m.id);
        setLoading(true);
        dataService.deleteMembers(ids)
          .then(() => {
            setSelectedIds([]);
            loadData();
            addToast("Đã xóa toàn bộ đoàn viên thành công", "success");
          })
          .catch(err => {
            console.error(err);
            const errorMsg = err instanceof Error ? err.message : "Có lỗi xảy ra";
            addToast(`Lỗi xóa toàn bộ! Chi tiết: ${errorMsg}`, "error");
          })
          .finally(() => setLoading(false));
      },
      "danger"
    );
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

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Thống kê dữ liệu");

    // Add administrative headers
    worksheet.addRow(["TỈNH ĐOÀN LÂM ĐỒNG", "", "", "", "", "", "", "ĐOÀN TNCS HỒ CHÍ MINH"]);
    worksheet.addRow(["BCH ĐOÀN THANH NIÊN UBND TỈNH"]);
    worksheet.addRow([]);
    
    const titleRow = worksheet.addRow(["Thống kê dữ liệu đoàn viên Trung tâm xúc tiến Đầu tư, Thương mại và Du lịch tỉnh Lâm Đồng"]);
    titleRow.font = { bold: true, size: 14 };
    titleRow.alignment = { horizontal: 'center' };
    worksheet.mergeCells(`A${titleRow.number}:AJ${titleRow.number}`);
    
    worksheet.addRow([]);

    // Complex Header Rows
    const h1 = ["Stt", "Họ và tên", "Ngày, tháng, năm sinh", "", "Dân tộc", "", "Tôn giáo", "Đoàn viên là đảng viên", "", "Độ tuổi", "", "", "Nghề nghiệp", "", "", "", "Học vấn", "", "Chuyên môn", "", "", "", "", "Lý luận chính trị", "", "", "Tham gia cấp ủy cấp trên cơ sở", "Tham gia cấp ủy cơ sở", "Số đoàn viên đảm nhiệm các chức vụ chủ chốt"];
    const h2 = ["", "", "Nam", "Nữ", "Kinh", "Khác", "", "Ngày kết nạp dự bị", "Ngày kết nạp chính thức", "Đủ 18 đến 25", "Đủ 26 đến 30", "Đủ 31 trở lên", "Công chức", "Viên chức", "Sinh viên", "Khác", "THCS", "THPT", "Tiến sỹ", "Cao đẳng", "Đại học", "Thạc sỹ", "Trung cấp", "Sơ cấp", "Trung cấp", "Cao cấp, cử nhân", "", "", "Ban chấp hành", "Ban thường vụ", "Bí thư", "Phó Bí thư", "Chuyên môn"];
    const h3 = ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "Cấp trưởng", "Cấp phó"];

    const r1 = worksheet.addRow(h1);
    const r2 = worksheet.addRow(h2);
    const r3 = worksheet.addRow(h3);

    [r1, r2, r3].forEach(row => {
      row.font = { bold: true, size: 9 };
      row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    // Merge header cells (simplified for common columns)
    worksheet.mergeCells('A7:A9'); // STT
    worksheet.mergeCells('B7:B9'); // Họ tên
    worksheet.mergeCells('C7:D7'); // Ngày sinh
    worksheet.mergeCells('E7:F7'); // Dân tộc
    worksheet.mergeCells('G7:G9'); // Tôn giáo
    worksheet.mergeCells('H7:I7'); // Đảng viên
    worksheet.mergeCells('J7:L7'); // Độ tuổi

    // Add data
    filteredMembers.forEach((member, index) => {
            const birthDate = member.dob ? new Date(member.dob) : null;
            const age = birthDate && !isNaN(birthDate.getTime()) ? new Date().getFullYear() - birthDate.getFullYear() : 0;
            
            const rowData = new Array(35).fill("");
            rowData[0] = index + 1;
            rowData[1] = member.fullName;
            
            if (member.gender === "Nam") rowData[2] = birthDate && !isNaN(birthDate.getTime()) ? birthDate.toLocaleDateString("vi-VN") : "";
            else rowData[3] = birthDate && !isNaN(birthDate.getTime()) ? birthDate.toLocaleDateString("vi-VN") : "";
      
      if (member.ethnic?.toLowerCase() === "kinh") rowData[4] = "x";
      else rowData[5] = member.ethnic || "";
      
      rowData[6] = member.religion || "Không";
      
      // Age group logic
      if (age >= 18 && age <= 25) rowData[9] = "x";
      else if (age >= 26 && age <= 30) rowData[10] = "x";
      else if (age >= 31) rowData[11] = "x";

      // Default work/education flags for this demo context
      rowData[13] = "x"; // Viên chức
      rowData[17] = "x"; // THPT
      
      // Mapping Professional Level
      if (member.professionalLevel === "Tiến sỹ") rowData[18] = "x";
      else if (member.professionalLevel === "Cao đẳng") rowData[19] = "x";
      else if (member.professionalLevel === "Đại học") rowData[20] = "x";
      else if (member.professionalLevel === "Thạc sỹ") rowData[21] = "x";
      else if (member.professionalLevel === "Trung cấp") rowData[22] = "x";
      else if (member.professionalLevel) rowData[20] = "x"; // Default fallback to University if set but not matched

      // Mapping Position
      if (member.position === "Bí thư") rowData[30] = "x";
      else if (member.position === "Phó Bí thư") rowData[31] = "x";
      else if (member.position === "Ủy viên BCH") rowData[28] = "x";
      
      const newRow = worksheet.addRow(rowData);
      newRow.alignment = { horizontal: 'center' };
    });

    // Set Column Widths
    worksheet.columns.forEach((col, i) => {
      col.width = i === 1 ? 25 : 10;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Thong_ke_doan_vien_${new Date().getTime()}.xlsx`);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const workbook = new ExcelJS.Workbook();
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];
        
        setLoading(true);
        let count = 0;
        let isSpecialFormat = false;

        // Detect format
        const cellA1 = worksheet.getCell(1, 1).value?.toString() || "";
        if (cellA1.includes("TỈNH ĐOÀN LÂM ĐỒNG") || cellA1.includes("BCH ĐOÀN THANH NIÊN")) {
          isSpecialFormat = true;
        }

        worksheet.eachRow((row, rowNumber) => {
          // Identify where data starts
          const firstCell = row.getCell(1).value?.toString();
          const stt = parseInt(firstCell || "0");
          
          // Skip headers: standard format skips row 1, special format usually starts around row 10
          if (rowNumber === 1 && !isSpecialFormat) return;
          if (isSpecialFormat && isNaN(stt)) return; 
          if (isNaN(stt)) return; // Skip if first cell is not a number (STT)

          const parseDate = (val: any): string => {
            if (!val) return "";
            
            let date: Date | null = null;

            // Handle Excel Date objects
            if (val instanceof Date) {
              date = val;
            } else if (typeof val === 'number') {
              // Excel serial date to JS date
              date = new Date(Math.round((val - 25569) * 86400 * 1000));
            } else {
              const str = val.toString().trim();
              if (!str) return "";
              
              // Try parsing DD/MM/YYYY
              const ddmmyyyy = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/;
              const match = str.match(ddmmyyyy);
              if (match) {
                const [_, d, m, y] = match;
                return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
              }
              
              date = new Date(str);
            }

            if (!date || isNaN(date.getTime())) return "";
            
            // Return YYYY-MM-DD using local parts to avoid timezone shifting
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };

          let memberToImport: any = {};

          if (isSpecialFormat) {
            // Mapping for the specific report format provided
            const namDobValue = row.getCell(3).value;
            const nuDobValue = row.getCell(4).value;
            
            // Gender detection: 
            // In the spreadsheet: 
            // Col 3 (C) has DOB if Male
            // Col 4 (D) has DOB if Female
            
            let gender: "Nam" | "Nữ" = "Nam";
            let dobValue = null;

            if (nuDobValue !== null && nuDobValue !== undefined && nuDobValue !== "") {
              gender = "Nữ";
              dobValue = nuDobValue;
            } else if (namDobValue !== null && namDobValue !== undefined && namDobValue !== "") {
              gender = "Nam";
              dobValue = namDobValue;
            }
            
            const kinhMark = row.getCell(5).value?.toString();
            const ethnic = kinhMark?.toLowerCase() === 'x' ? "Kinh" : (row.getCell(6).value?.toString() || "Kinh");
            
            const officialJoinDate = row.getCell(9).value;
            const probationJoinDate = row.getCell(8).value;
            const joinDateValue = officialJoinDate || probationJoinDate;

            memberToImport = {
              fullName: row.getCell(2).value?.toString() || "",
              memberId: `22${new Date().getFullYear().toString().slice(-2)}${rowNumber.toString().padStart(4, '0')}`,
              gender: gender,
              dob: parseDate(dobValue),
              ethnic: ethnic,
              religion: row.getCell(7).value?.toString() || "Không",
              hometown: "Chưa cập nhật",
              joinDate: parseDate(joinDateValue),
              unitId: profile?.unitId || units[0]?.id || "",
              email: "",
              phone: "--",
              academicYear: "K22",
              achievementLevel: "Chưa xếp loại",
              status: "Đang sinh hoạt",
              isOutstanding: false
            };
          } else {
            // Standard simple column mapping (Header: STT, Name, MSSV, Gender, DOB...)
            memberToImport = {
              fullName: row.getCell(2).value?.toString() || "",
              memberId: row.getCell(3).value?.toString() || "",
              gender: (row.getCell(4).value?.toString() || "Nam") as any,
              dob: parseDate(row.getCell(5).value),
              ethnic: row.getCell(6).value?.toString() || "",
              religion: row.getCell(7).value?.toString() || "",
              hometown: row.getCell(8).value?.toString() || "",
              unitId: units.find(u => u.name === row.getCell(9).value?.toString())?.id || profile?.unitId || units[0]?.id || "",
              email: row.getCell(10).value?.toString() || "",
              phone: row.getCell(11).value?.toString() || "",
              academicYear: row.getCell(12).value?.toString() || "",
              achievementLevel: (row.getCell(13).value?.toString() || "Chưa xếp loại") as any,
              status: (row.getCell(14).value?.toString() || "Đang sinh hoạt") as any,
              isOutstanding: row.getCell(15).value?.toString()?.toLowerCase() === "có"
            };
          }

          if (memberToImport.fullName) {
            dataService.addMember(memberToImport).catch(console.error);
            count++;
          }
        });

        addToast(`Đã nhập thành công ${count} đoàn viên.`, "success");
        loadData();
      } catch (error) {
        console.error("Import error:", error);
        addToast("Có lỗi xảy ra khi nhập tệp Excel. Vui lòng kiểm tra lại định dạng tệp.", "error");
      } finally {
        setLoading(false);
        e.target.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div id="member-list-container">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        variant={confirmConfig.variant}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-lg shadow-accent/5">
              <Users size={32} />
            </div>
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                Quản lý đoàn viên
              </h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-black mt-1">Cơ sở dữ liệu nhân sự số hóa 4.0</p>
            </div>
          </div>
          <div className="relative max-w-md group">
            <input 
              type="text" 
              placeholder="Tìm kiếm nhanh đoàn viên..." 
              className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 px-12 text-sm text-slate-900 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all placeholder:text-slate-400 shadow-sm group-hover:border-slate-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-accent transition-colors" />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <motion.button 
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={exportToExcel}
              className="group flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 rounded-2xl transition-all duration-300 shadow-md hover:shadow-xl hover:border-emerald-500/30 hover:text-emerald-600"
              title="Xuất danh sách ra tệp Excel"
            >
              <Download size={20} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
              <span className="text-xs font-black uppercase tracking-widest">Xuất Excel</span>
            </motion.button>
            <div className="relative">
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleImportExcel}
                className="hidden" 
                id="excel-import"
              />
              <motion.label 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                htmlFor="excel-import"
                className="cursor-pointer group flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:border-blue-500/30 hover:text-blue-600 transition-all duration-300 shadow-md hover:shadow-xl"
                title="Nhập danh sách từ tệp Excel"
              >
                <Upload size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                <span className="text-xs font-black uppercase tracking-widest">Nhập dữ liệu</span>
              </motion.label>
            </div>
          </div>
          <div className="w-px h-10 bg-slate-200 hidden lg:block mx-2" />
          <motion.button 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={openAddModal}
            className="group flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-2xl transition-all duration-300 shadow-xl shadow-slate-900/10 hover:bg-accent hover:shadow-accent/30"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Thêm đoàn viên</span>
          </motion.button>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-[3rem] p-10 mb-12 shadow-2xl shadow-slate-200/40">
        {/* Main Search Row */}
        <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between mb-8">
          <form 
            onSubmit={(e) => e.preventDefault()}
            className="relative flex-1 group w-full md:max-w-2xl"
          >
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search className="text-slate-300 group-focus-within:text-accent transition-colors" size={24} />
            </div>
            <input 
              type="text"
              placeholder="Tra cứu chuyên sâu: Tên, MSSV, Quê quán, Khóa học..."
              className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-accent/5 focus:bg-white focus:border-accent transition-all outline-none font-medium shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
          
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
              className={cn(
                "flex items-center gap-3 px-8 py-4 rounded-2xl text-[11px] uppercase tracking-[0.1em] font-black transition-all border shadow-sm",
                isAdvancedSearchOpen 
                  ? "bg-slate-900 text-white border-slate-900 shadow-slate-900/20" 
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <Filter size={16} />
              Lọc nâng cao
              {isAdvancedSearchOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetFilters}
              className="p-4 rounded-2xl bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all border border-slate-200 hover:border-rose-200 shadow-sm"
              title="Xóa tất cả bộ lọc"
            >
              <RotateCcw size={20} />
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowSavePreset(!showSavePreset)}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl text-[11px] uppercase tracking-[0.1em] font-black bg-accent/5 text-accent border border-accent/20 hover:bg-accent hover:text-white transition-all shadow-sm"
            >
              <Bookmark size={16} />
              Lưu cấu hình
            </motion.button>
          </div>
        </div>

        {/* Saved Presets */}
        {profile?.presets && profile.presets.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 animate-in fade-in slide-in-from-top-2 border-t border-slate-100 pt-6">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold self-center mr-2">Mẫu đã lưu:</span>
            {profile.presets.map((preset) => (
              <div key={preset.id} className="group flex items-center bg-slate-50 border border-slate-200 rounded-full pl-4 pr-1 py-1 transition-all hover:border-accent/30">
                <button 
                  onClick={() => applyPreset(preset)}
                  className="text-[10px] font-bold text-slate-600 hover:text-accent tracking-tight mr-2"
                >
                  {preset.name}
                </button>
                <button 
                  onClick={() => deletePreset(preset.id)}
                  className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
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
                <label className="text-[10px] uppercase tracking-widest text-accent/60 font-black mb-2 block">Tên mẫu tìm kiếm mới</label>
                <input 
                  type="text"
                  placeholder="VD: Đoàn viên K2020 Xuất sắc"
                  className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-accent lg:text-sm"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowSavePreset(false)}
                  className="px-6 py-3 rounded-xl text-[10px] uppercase font-bold text-slate-400 hover:bg-slate-100 transition-all outline-none"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleSavePreset}
                  className="px-8 py-3 bg-accent text-white rounded-xl text-[10px] uppercase font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-accent/20 outline-none"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 border-t border-slate-100 animate-in slide-in-from-top-4 duration-300">
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
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 block">Quê quán (Lọc theo tỉnh/thành)</label>
              <input 
                type="text"
                placeholder="VD: Hà Nội, Nghệ An..."
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:bg-white transition-all outline-none text-sm"
                value={selectedHometown}
                onChange={(e) => setSelectedHometown(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-100 rounded-[3rem] flex flex-col min-h-[600px] shadow-2xl mb-32 overflow-hidden border-t-8 border-t-accent flex-1">
        <div className="px-10 pt-10 pb-6 border-b border-slate-50 flex justify-between items-center bg-white shrink-0">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Danh sách hồ sơ</h3>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mt-1">Quản lý cơ sở dữ liệu tập trung</p>
          </div>
          <div className="flex gap-2">
            <div className="px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black text-slate-500 uppercase tracking-widest">{filteredMembers.length} Kết quả</div>
          </div>
        </div>

        <div className="px-10 pt-8 shrink-0">
          <AnimatePresence>
            {(isAdmin || isSecretary) && selectedIds.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -20 }}
                className="mb-8 flex flex-col sm:flex-row items-center justify-between bg-white border-2 border-rose-500 p-8 rounded-[2.5rem] gap-8 shadow-2xl shadow-rose-200/40 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                  <Trash2 size={120} className="text-rose-600 rotate-12" />
                </div>
                <div className="flex items-center gap-8 relative z-10">
                  <div className="w-16 h-16 rounded-3xl bg-rose-500 flex items-center justify-center text-white shadow-xl shadow-rose-500/30">
                    <Trash2 size={32} />
                  </div>
                  <div>
                    <h4 className="text-rose-600 text-2xl font-black tracking-tight">
                      Lựa chọn đoàn viên ({selectedIds.length})
                    </h4>
                    <motion.button 
                      whileHover={{ x: 5 }}
                      onClick={() => setSelectedIds([])}
                      className="text-slate-400 hover:text-slate-600 text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 mt-1"
                    >
                      Bỏ chọn tất cả <X size={12} />
                    </motion.button>
                  </div>
                </div>
                <div className="flex gap-4 w-full sm:w-auto relative z-10">
                  <motion.button 
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleBulkDelete}
                    className="flex-1 sm:flex-none bg-rose-600 text-white rounded-2xl px-12 py-5 transition-all shadow-xl shadow-rose-600/30 hover:bg-slate-900 border border-transparent"
                  >
                    <span className="text-xs font-black uppercase tracking-widest transition-colors">Xóa vĩnh viễn</span>
                  </motion.button>
                  {selectedIds.length === filteredMembers.length && filteredMembers.length > 1 && (
                    <motion.button 
                      whileHover={{ scale: 1.05, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleDeleteAllFiltered}
                      className="flex-1 sm:flex-none bg-white border-2 border-rose-600 text-rose-600 rounded-2xl px-12 py-5 transition-all shadow-xl hover:bg-rose-50"
                    >
                      <span className="text-xs font-black uppercase tracking-widest transition-colors">Xóa khớp lọc ({filteredMembers.length})</span>
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-32 gap-6">
             <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
             <p className="text-slate-400 text-[10px] uppercase tracking-[0.3em] font-black animate-pulse">Đang đồng bộ dữ liệu...</p>
          </div>
        ) : filteredMembers.length > 0 ? (
          <div className="flex-1 overflow-x-auto no-scrollbar relative min-h-[500px]">
            <table className="w-full text-left border-collapse border-spacing-0">
              <thead>
                <tr className="text-[10px] text-slate-400 uppercase tracking-[0.25em] font-black border-b border-slate-50 bg-white">
                  <th className="py-8 px-8 font-black text-center w-12 shrink-0">
                    <div 
                      onClick={() => {
                        if (selectedIds.length > 0 && selectedIds.length === filteredMembers.length) {
                          setSelectedIds([]);
                        } else {
                          setSelectedIds(filteredMembers.map(m => m.id));
                        }
                      }}
                      className={cn(
                        "w-5 h-5 rounded-lg border-2 mx-auto cursor-pointer flex items-center justify-center transition-all duration-300",
                        selectedIds.length > 0 && selectedIds.length === filteredMembers.length
                          ? "bg-accent border-accent shadow-lg shadow-accent/20" 
                          : "border-slate-200 hover:border-accent bg-slate-50"
                      )}
                    >
                      <motion.div
                        initial={false}
                        animate={{ scale: selectedIds.length > 0 && selectedIds.length === filteredMembers.length ? 1 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <CheckCircle2 size={12} className="text-white" />
                      </motion.div>
                    </div>
                  </th>
                  <th className="py-8 px-4 font-black text-center w-16">#</th>
                  <th 
                    className="py-8 px-6 font-black cursor-pointer hover:text-accent transition-colors group/header min-w-[280px]"
                    onClick={() => handleSort("fullName")}
                  >
                    <div className="flex items-center gap-3">
                      Thông tin cơ bản
                      <span className={cn("transition-all", sortField === "fullName" ? "opacity-100 scale-100" : "opacity-0 scale-75 group-hover/header:opacity-40 group-hover/header:scale-100")}>
                        {sortField === "fullName" ? (sortDirection === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} />}
                      </span>
                    </div>
                  </th>
                  <th 
                    className="py-8 px-6 font-black cursor-pointer hover:text-accent transition-colors group/header"
                    onClick={() => handleSort("memberId")}
                  >
                    <div className="flex items-center gap-3">
                      Định danh
                      <span className={cn("transition-all", sortField === "memberId" ? "opacity-100 scale-100" : "opacity-0 scale-75 group-hover/header:opacity-40 group-hover/header:scale-100")}>
                        {sortField === "memberId" ? (sortDirection === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} />}
                      </span>
                    </div>
                  </th>
                  <th className="py-8 px-6 font-black text-center">Xếp loại</th>
                  <th className="py-8 px-6 font-black">Chi đoàn công tác</th>
                  <th 
                    className="py-8 px-6 font-black cursor-pointer hover:text-accent transition-colors group/header"
                    onClick={() => handleSort("joinDate")}
                  >
                    <div className="flex items-center gap-3">
                      Kỷ niệm vào đoàn
                      <span className={cn("transition-all", sortField === "joinDate" ? "opacity-100 scale-100" : "opacity-0 scale-75 group-hover/header:opacity-40 group-hover/header:scale-100")}>
                        {sortField === "joinDate" ? (sortDirection === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} />}
                      </span>
                    </div>
                  </th>
                  <th className="py-8 px-6 font-black text-center">Trạng thái</th>
                  <th className="py-8 px-8 font-black text-right min-w-[200px]">Quan lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedMembers.map((member, index) => (
                  <motion.tr 
                    key={member.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleViewDetails(member)}
                    className={cn(
                      "group cursor-pointer transition-all duration-300 relative",
                      selectedIds.includes(member.id) ? "bg-accent/[0.03]" : "hover:bg-slate-50/50"
                    )}
                  >
                    <td className="py-7 px-8 text-center relative z-10" onClick={(e) => e.stopPropagation()}>
                      <div 
                        onClick={() => handleSelectMember(member.id)}
                        className={cn(
                          "w-5 h-5 rounded-lg border-2 mx-auto cursor-pointer flex items-center justify-center transition-all duration-300",
                          selectedIds.includes(member.id) 
                            ? "bg-accent border-accent shadow-lg shadow-accent/20" 
                            : "border-slate-200 group-hover:border-accent bg-white"
                        )}
                      >
                        <motion.div
                          initial={false}
                          animate={{ scale: selectedIds.includes(member.id) ? 1 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          <CheckCircle2 size={12} className="text-white" />
                        </motion.div>
                      </div>
                    </td>
                    <td className="py-7 px-4 text-center">
                      <span className="text-[11px] font-black text-slate-300 tabular-nums">
                        {String((currentPage - 1) * pageSize + index + 1).padStart(2, '0')}
                      </span>
                    </td>
                    <td className="py-7 px-6">
                      <div className="flex items-center gap-5">
                        <div className="relative shrink-0">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all duration-500 border-2",
                            member.gender === "Nam" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-rose-50 text-rose-600 border-rose-100",
                            "group-hover:scale-110 group-hover:rotate-3 shadow-sm group-hover:shadow-md"
                          )}>
                            {member.fullName.charAt(0)}
                          </div>
                          {member.isOutstanding && (
                            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-400 rounded-lg border-2 border-white flex items-center justify-center text-white shadow-xl shadow-amber-400/30 animate-bounce">
                              <Star size={10} fill="currentColor" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <h4 className="text-[15px] font-black text-slate-900 tracking-tight group-hover:text-accent transition-colors duration-300">
                            {member.fullName}
                          </h4>
                          <div className="flex items-center gap-2">
                             <span className={cn(
                               "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                               member.gender === "Nam" ? "text-blue-400 bg-blue-50/50" : "text-rose-400 bg-rose-50/50"
                             )}>
                               {member.gender}
                             </span>
                             <span className="w-1 h-1 bg-slate-200 rounded-full" />
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.05em]">{member.academicYear}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-7 px-6">
                       <div className="flex flex-col gap-1">
                          <span className="text-[13px] font-black text-slate-700 tracking-tight font-mono">{member.memberId}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{member.professionalLevel || "Thanh niên"}</span>
                       </div>
                    </td>
                    <td className="py-7 px-6 text-center">
                       <span className={cn(
                        "inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all duration-300",
                        member.achievementLevel === "Xuất sắc" ? "bg-accent/5 text-accent border-accent/10 hover:bg-accent hover:text-white" :
                        member.achievementLevel === "Khá" ? "bg-slate-50 text-slate-600 border-slate-100" :
                        "bg-white text-slate-300 border-slate-100"
                       )}>
                         {member.achievementLevel || "Chưa xếp loại"}
                       </span>
                    </td>
                    <td className="py-7 px-6">
                       <span className="text-sm font-bold text-slate-600 tracking-tight line-clamp-1">{getUnitName(member.unitId)}</span>
                    </td>
                    <td className="py-7 px-6">
                       <div className="flex items-center gap-3">
                          <CalendarIcon size={14} className="text-slate-300" />
                          <span className="text-xs font-black text-slate-500 tabular-nums">{member.joinDate || "---"}</span>
                       </div>
                    </td>
                    <td className="py-7 px-6 text-center">
                       <div className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all duration-300",
                        member.status === "Đang sinh hoạt" ? "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm shadow-emerald-100/50" :
                        member.status === "Đã chuyển sinh hoạt" ? "bg-blue-50 border-blue-100 text-accent shadow-sm shadow-blue-100/50" :
                        "bg-slate-50 border-slate-100 text-slate-400"
                       )}>
                         <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", 
                            member.status === "Đang sinh hoạt" ? "bg-emerald-500" : 
                            member.status === "Đã chuyển sinh hoạt" ? "bg-accent" : "bg-slate-300"
                         )} />
                         <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{member.status}</span>
                       </div>
                    </td>
                    <td className="py-7 px-8 text-right relative z-10" onClick={(e) => e.stopPropagation()}>
                       <div className="flex justify-end gap-2 transform transition-all duration-500 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0">
                          <button 
                            onClick={() => handleViewDetails(member)}
                            className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-accent hover:border-accent hover:shadow-lg hover:shadow-accent/5 transition-all outline-none"
                            title="Xem chi tiết"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => handleViewHistory(member)}
                            className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-accent hover:border-accent hover:shadow-lg hover:shadow-accent/5 transition-all outline-none"
                            title="Lịch sử thay đổi"
                          >
                            <History size={16} />
                          </button>
                          <button 
                            onClick={() => handleEdit(member)}
                            className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all outline-none"
                            title="Chỉnh sửa hồ sơ"
                          >
                            <Edit3 size={16} />
                          </button>
                          {(isAdmin || isSecretary) && (
                            <button 
                              onClick={() => handleDelete(member.id)}
                              className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:shadow-lg hover:shadow-rose-50 transition-all outline-none"
                              title="Xóa hồ sơ"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                       </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-40 gap-6">
            <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-200 shadow-inner">
              <Search size={48} />
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-slate-900 tracking-tight">Hệ thống không tìm thấy dữ liệu</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-2">Vui lòng điều chỉnh bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
            <button 
               onClick={resetFilters}
               className="mt-4 px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all shadow-xl shadow-slate-900/10 active:scale-95"
            >
              Đặt lại tất cả
            </button>
          </div>
        )}

        <div className="px-10 py-8 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50/30">
          <div className="flex items-center gap-4">
             <div className="flex -space-x-4">
                {[1,2,3].map(i => (
                  <div key={i} className="w-10 h-10 rounded-xl border-4 border-white bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400">
                    <UserCircle size={16} />
                  </div>
                ))}
             </div>
             <span className="text-[11px] text-slate-400 font-black uppercase tracking-widest italic">
               Trang {currentPage} trên {totalPages} • Hết {filteredMembers.length} hồ sơ liên quan
             </span>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-accent disabled:opacity-20 transition-all outline-none shadow-sm hover:shadow-md"
              >
                <ChevronDown className="rotate-90" size={18} />
              </motion.button>
              
              <div className="flex items-center gap-1.5 px-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  if (
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <motion.button
                        key={page}
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "min-w-[40px] h-10 rounded-2xl text-xs font-black transition-all outline-none border",
                          currentPage === page 
                            ? "bg-accent text-white border-accent shadow-xl shadow-accent/20" 
                            : "bg-white text-slate-400 hover:border-accent/40 border-slate-200"
                        )}
                      >
                        {page}
                      </motion.button>
                    );
                  } else if (
                    (page === currentPage - 2 && page > 1) || 
                    (page === currentPage + 2 && page < totalPages)
                  ) {
                    return <span key={page} className="px-1 text-slate-300 font-black">...</span>;
                  }
                  return null;
                })}
              </div>

              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-accent disabled:opacity-20 transition-all outline-none shadow-sm hover:shadow-md"
              >
                <ChevronDown className="-rotate-90" size={18} />
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-[2.5rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {editingId ? "Cập nhật hồ sơ đoàn viên" : "Đăng ký đoàn viên mới"}
                </h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Thông tin chi tiết về đoàn viên thanh niên</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-widest text-slate-400 font-black mb-3 block">Họ và tên đầy đủ</label>
                    <input
                      required
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-bold"
                      value={newMember.fullName}
                      onChange={(e) => setNewMember({...newMember, fullName: e.target.value})}
                      placeholder="VD: Nguyễn Hoàng Nam"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-slate-400 font-black mb-3 block">Email</label>
                    <input
                      type="email"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                      value={newMember.email}
                      onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                      placeholder="VD: name@domain.com"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-slate-400 font-black mb-3 block">Số điện thoại</label>
                    <input
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:bg-white outline-none transition-all placeholder:text-slate-300 tabular-nums"
                      value={newMember.phone}
                      onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                      placeholder="VD: 090xxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-slate-400 font-black mb-3 block">Nơi sinh</label>
                    <input
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                      value={newMember.placeOfBirth}
                      onChange={(e) => setNewMember({...newMember, placeOfBirth: e.target.value})}
                      placeholder="VD: Hải Phòng..."
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-slate-400 font-black mb-3 block">Quê quán</label>
                    <input
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                      value={newMember.hometown}
                      onChange={(e) => setNewMember({...newMember, hometown: e.target.value})}
                      placeholder="Nhập quê quán (Tỉnh/Thành phố)..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] uppercase tracking-widest text-slate-400 font-black mb-3 block">Địa chỉ thường trú</label>
                    <input
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                      value={newMember.permanentAddress}
                      onChange={(e) => setNewMember({...newMember, permanentAddress: e.target.value})}
                      placeholder="Nhập đầy đủ địa chỉ thường trú..."
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-slate-400 font-black mb-3 block">Dân tộc</label>
                    <input
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                      value={newMember.ethnic}
                      onChange={(e) => setNewMember({...newMember, ethnic: e.target.value})}
                      placeholder="VD: Kinh..."
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-slate-400 font-black mb-3 block">Tôn giáo</label>
                    <input
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                      value={newMember.religion}
                      onChange={(e) => setNewMember({...newMember, religion: e.target.value})}
                      placeholder="VD: Không, Phật giáo..."
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-slate-400 font-black mb-3 block">MSSV</label>
                    <input
                      required
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:bg-white outline-none transition-all tabular-nums font-bold"
                      value={newMember.memberId}
                      onChange={(e) => setNewMember({...newMember, memberId: e.target.value})}
                      placeholder="VD: 2024001"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-slate-400 font-black mb-3 block">Ngày sinh</label>
                    <input
                      type="date"
                      required
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:bg-white outline-none transition-all"
                      value={newMember.dob}
                      onChange={(e) => setNewMember({...newMember, dob: e.target.value})}
                    />
                  </div>
                  <CustomSelect
                    label="Chức vụ trong Đoàn"
                    options={positionOptions}
                    value={newMember.position}
                    onChange={(val) => setNewMember({...newMember, position: val})}
                  />
                  <CustomSelect
                    label="Trình độ chuyên môn"
                    options={professionalLevelOptions}
                    value={newMember.professionalLevel}
                    onChange={(val) => setNewMember({...newMember, professionalLevel: val})}
                  />
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-slate-400 font-black mb-3 block">Niên khóa</label>
                    <input
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                      value={newMember.academicYear}
                      onChange={(e) => setNewMember({...newMember, academicYear: e.target.value})}
                      placeholder="VD: K2020-2024"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-slate-400 font-black mb-3 block">Ngày vào Đoàn</label>
                    <input
                      type="date"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:bg-white outline-none transition-all"
                      value={newMember.joinDate}
                      onChange={(e) => setNewMember({...newMember, joinDate: e.target.value})}
                    />
                  </div>
                  <CustomSelect
                    label="Thành tích"
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
                      <label className="text-[11px] uppercase tracking-widest text-slate-400 font-black block">Chi đoàn trực thuộc</label>
                      {isAdmin && (
                        <button 
                          type="button"
                          onClick={() => setShowUnitModal(true)}
                          className="text-[10px] text-accent font-black uppercase tracking-widest hover:underline flex items-center gap-1"
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
                    {isSecretary && <p className="text-[9px] text-slate-400 mt-2 italic font-bold">Bạn chỉ có quyền quản lý đoàn viên trong chi đoàn được phân công.</p>}
                  </div>
                  <div className="md:col-span-2">
                    <CustomSelect
                      label="Trạng thái sinh hoạt"
                      disabled={!editingId}
                      options={statusOptionsModal}
                      value={newMember.status}
                      onChange={(val) => setNewMember({...newMember, status: val as any})}
                    />
                    {!editingId && <p className="text-[11px] text-accent mt-2 italic font-black uppercase tracking-widest">Mặc định cho hồ sơ mới</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer group p-5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-accent/30 transition-all">
                      <div className={cn(
                        "w-6 h-6 rounded-md border flex items-center justify-center transition-all",
                        newMember.isOutstanding 
                          ? "bg-yellow-400 border-yellow-500 text-white" 
                          : "bg-white border-slate-200 text-transparent"
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
                        <p className="text-sm font-black text-slate-900 group-hover:text-accent transition-colors uppercase tracking-tight">Đoàn viên tiêu biểu</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Đánh dấu gương mặt xuất sắc của đơn vị</p>
                      </div>
                    </label>
                  </div>
                  {editingId && members.find(m => m.id === editingId)?.status !== newMember.status && (
                    <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[11px] uppercase tracking-widest text-accent font-black mb-3 block italic">Lý do thay đổi trạng thái*</label>
                      <input
                        required
                        className="w-full px-6 py-4 bg-accent/5 border border-accent/20 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-accent/50 outline-none transition-all italic font-bold"
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        placeholder="Nhập lý do thay đổi (VD: Chuyển trường, Hết tuổi Đoàn...)"
                      />
                    </div>
                  )}
                </div>
                <div className="pt-8 flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02, x: -5 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-8 py-4 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all font-black"
                  >
                    Hủy bỏ
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="flex-1 px-8 py-4 bg-accent border border-accent/10 rounded-2xl transition-all shadow-xl shadow-accent/20 hover:shadow-accent/40"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Lưu hồ sơ đoàn viên</span>
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Detailed Member View Modal */}
      {showDetailsModal && detailsMember && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-[3rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header with Avatar and Name */}
            <div className="relative p-10 bg-slate-50/50 shrink-0 border-b border-slate-100">
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-slate-400 hover:text-slate-900 transition-all z-10"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="relative">
                  <div className="w-28 h-28 rounded-[2rem] bg-accent/10 border border-accent/20 flex items-center justify-center text-4xl font-black text-accent shadow-lg overflow-hidden">
                    {detailsMember.fullName.charAt(0)}
                  </div>
                  {detailsMember.isOutstanding && (
                    <div className="absolute -top-3 -right-3 bg-yellow-400 text-white p-2.5 rounded-2xl border-4 border-white shadow-xl">
                      <Star size={16} fill="currentColor" />
                    </div>
                  )}
                </div>
                
                <div className="text-center md:text-left pt-2">
                  <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">{detailsMember.fullName}</h2>
                    <span className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-black border whitespace-nowrap",
                      detailsMember.status === "Đang sinh hoạt" ? "text-emerald-600 bg-emerald-50 border-emerald-100" :
                      detailsMember.status === "Đã chuyển sinh hoạt" ? "text-blue-600 bg-blue-50 border-blue-100" :
                      detailsMember.status === "Đã trưởng thành" ? "text-slate-500 bg-slate-50 border-slate-200" :
                      "text-rose-600 bg-rose-50 border-rose-100"
                    )}>
                      {detailsMember.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm font-bold">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Hash size={14} className="text-accent" />
                      <span className="font-mono text-xs text-slate-600">{detailsMember.memberId}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <UserCircle size={14} className="text-accent" />
                      <span className="text-slate-600">{detailsMember.gender}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin size={14} className="text-accent" />
                      <span className="text-slate-600 truncate max-w-[200px]">{detailsMember.hometown || "Chưa cập nhật"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Member Details - Main Information */}
            <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar shadow-inner">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Academic & Background Group */}
                <div className="space-y-8">
                  <h4 className="text-[11px] uppercase tracking-[0.3em] font-black text-accent mt-6 mb-4 border-b border-slate-100 pb-2">Học tập & Hoạt Đoàn</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl group hover:border-accent transition-all">
                      <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1 font-bold">Chi đoàn & Đơn vị</p>
                      <p className="text-slate-900 text-sm font-black italic">{getUnitName(detailsMember.unitId)}</p>
                    </div>
                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl group hover:border-accent transition-all">
                      <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1 font-bold">Quê quán</p>
                      <p className="text-slate-900 text-sm font-black">{detailsMember.hometown || "N/A"}</p>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl group hover:border-accent transition-all">
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1 font-bold">Nơi sinh & Thường trú</p>
                    <p className="text-slate-900 text-sm font-black">{detailsMember.placeOfBirth || "Chưa cập nhật"}</p>
                    <p className="text-slate-500 text-xs mt-1 italic">{detailsMember.permanentAddress || ""}</p>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl group hover:border-accent transition-all">
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1 font-bold">Địa chỉ thường trú</p>
                    <p className="text-slate-900 text-sm font-black">{detailsMember.permanentAddress || "Chưa cập nhật"}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl group hover:border-accent transition-all">
                      <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1 font-bold">Dân tộc & Tôn giáo</p>
                      <p className="text-slate-900 text-sm font-black">{detailsMember.ethnic || "Kinh"} / {detailsMember.religion || "Không"}</p>
                    </div>
                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl group hover:border-accent transition-all">
                      <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1 font-bold">Giới tính</p>
                      <p className="text-slate-900 text-sm font-black">{detailsMember.gender}</p>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-900 text-white rounded-3xl group transition-all shadow-xl shadow-slate-900/10">
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1 font-bold">Chức vụ & Trình độ</p>
                    <p className="text-white text-sm font-black italic uppercase tracking-tight">{detailsMember.position || "Đoàn viên"}</p>
                    <p className="text-accent text-[10px] font-black mt-1 uppercase tracking-widest">Trình độ: {detailsMember.professionalLevel || "Chưa cập nhật"}</p>
                  </div>
                </div>

                {/* Contact & Status Group */}
                <div className="space-y-8">
                  <h4 className="text-[11px] uppercase tracking-[0.3em] font-black text-accent mt-6 mb-4 border-b border-slate-100 pb-2">Liên hệ & Xếp loại</h4>
                  
                  <div className="p-6 bg-accent/5 border border-accent/10 rounded-3xl space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                        <Mail size={18} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-0.5 font-bold">Email chính thức</p>
                        <p className="text-slate-900 text-sm font-black truncate">{detailsMember.email || "Chưa cập nhật"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                        <Phone size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-0.5 font-bold">Số điện thoại</p>
                        <p className="text-slate-900 text-sm font-black tabular-nums">{detailsMember.phone || "---"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl group hover:border-accent transition-all">
                      <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1 font-bold">Ngày vào Đoàn</p>
                      <p className="text-slate-900 text-sm font-black italic">{detailsMember.joinDate || "---"}</p>
                    </div>
                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl group hover:border-accent transition-all">
                      <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1 font-bold">Niên khóa</p>
                      <p className="text-slate-900 text-sm font-black italic">{detailsMember.academicYear || "N/A"}</p>
                    </div>
                  </div>

                  <div className="p-8 bg-amber-50 border border-amber-100 rounded-[2rem] relative overflow-hidden group">
                    <Star className="absolute -bottom-6 -right-6 text-amber-200 opacity-20 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700" size={100} />
                    <div className="relative z-10">
                      <p className="text-[9px] uppercase tracking-widest text-amber-600 mb-2 font-bold">Xếp loại & Danh hiệu</p>
                      <div className="flex items-center gap-3">
                         <p className="text-amber-900 font-black text-xl leading-tight">
                            {detailsMember.achievementLevel || "Chưa xếp loại"}
                         </p>
                         {detailsMember.isOutstanding && (
                           <div className="bg-amber-500 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter">
                             Tiêu biểu
                           </div>
                         )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Timeline Snippet */}
              <div className="mt-10">
                 <h4 className="text-[11px] uppercase tracking-[0.3em] font-black text-slate-400 mb-6 border-b border-slate-100 pb-2">Hoạt động gần nhất</h4>
                 {detailsMember.statusHistory && detailsMember.statusHistory.length > 0 ? (
                   <div className="space-y-4">
                      {detailsMember.statusHistory.slice(-2).reverse().map((h, i) => (
                        <div key={i} className="p-5 bg-slate-50 border border-slate-100 rounded-3xl flex items-start gap-4">
                           <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0 mt-1 shadow-sm">
                              <History size={14} />
                           </div>
                           <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] text-slate-400 font-bold italic">
                                  {h.date && !isNaN(new Date(h.date).getTime()) 
                                    ? new Date(h.date).toLocaleDateString("vi-VN") 
                                    : "---"}
                                </span>
                                <span className="text-accent font-black">→</span>
                                <span className={cn(
                                   "text-[10px] uppercase font-black px-2 py-0.5 rounded-lg border",
                                   statusColors[h.newStatus as keyof typeof statusColors] || "bg-slate-50 text-slate-600 border-slate-200"
                                )}>{h.newStatus}</span>
                              </div>
                              <p className="text-sm text-slate-600 italic font-medium">"{h.reason}"</p>
                           </div>
                        </div>
                      ))}
                   </div>
                 ) : (
                   <div className="bg-slate-50 p-10 rounded-[2rem] border-2 border-dashed border-slate-100 text-center">
                     <p className="text-sm text-slate-300 italic font-medium">Chưa có ghi nhận thay đổi trạng thái nào.</p>
                   </div>
                 )}
              </div>
            </div>
            
            <div className="p-8 border-t border-slate-100 flex gap-4 shrink-0 bg-slate-50/50">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowDetailsModal(false);
                  handleEdit(detailsMember);
                }}
                className="flex-1 py-4 bg-accent text-white rounded-2xl transition-all shadow-xl shadow-accent/20 hover:bg-blue-700"
              >
                <span className="text-xs font-black uppercase tracking-widest">Chỉnh sửa hồ sơ</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowDetailsModal(false)}
                className="px-10 py-4 bg-white text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-all border border-slate-200"
              >
                Đóng
              </motion.button>
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
                <h3 className="text-2xl font-bold text-white">
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
                                {change.date && !isNaN(new Date(change.date).getTime()) 
                                  ? new Date(change.date).toLocaleDateString("vi-VN") 
                                  : "---"}
                             </span>
                          </div>
                          <p className="text-sm text-white/60 leading-relaxed">"{change.reason || "Không có nội dung"}"</p>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-8 border-t border-white/5 flex justify-end">
               <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowHistoryModal(false)}
                  className="px-10 py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                >
                  Đóng
                </motion.button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Quick Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="text-slate-900 font-black text-lg tracking-tight">Tạo đơn vị nhanh</h4>
              <button 
                onClick={() => setShowUnitModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUnitSubmit} className="p-8 space-y-6">
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-black block mb-2 tracking-widest">Tên đơn vị</label>
                <input 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-accent/10 focus:bg-white"
                  value={newUnit.name}
                  onChange={e => setNewUnit({...newUnit, name: e.target.value})}
                  placeholder="VD: Chi đoàn K44"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-black block mb-2 tracking-widest">Mã đơn vị</label>
                <input 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-accent/10 focus:bg-white"
                  value={newUnit.code}
                  onChange={e => setNewUnit({...newUnit, code: e.target.value})}
                  placeholder="VD: CD44"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <motion.button 
                  whileHover={{ scale: 1.02, x: -5 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setShowUnitModal(false)}
                  className="flex-1 py-4 text-[10px] uppercase font-black text-slate-400 hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all"
                >
                  Hủy
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="flex-1 py-4 bg-accent border border-accent/20 rounded-2xl shadow-xl shadow-accent/20 hover:shadow-accent/40 transition-all font-black"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Lưu đơn vị</span>
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
