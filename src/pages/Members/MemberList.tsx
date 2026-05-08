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
    <div id="member-list-container" className="w-full max-w-7xl mx-auto pb-32">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        variant={confirmConfig.variant}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="flex-1">
          <h2 className="text-4xl font-serif text-white flex items-center gap-4 italic tracking-tight mb-4">
            <Users className="text-accent" size={36} />
            Quản lý đoàn viên
          </h2>
          <div className="relative max-w-md">
            <input 
              type="text" 
              placeholder="Tìm kiếm nhanh đoàn viên..." 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-12 text-sm text-white focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all placeholder:text-white/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <p className="text-white/40 text-[10px] uppercase tracking-widest mt-3 font-bold">Cơ sở dữ liệu hồ sơ nhân sự tập trung</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-2">
            <motion.button 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={exportToExcel}
              className="group flex items-center gap-3 px-8 py-4 bg-accent border border-white/20 rounded-2xl transition-all duration-300 shadow-xl shadow-accent/30 hover:shadow-accent/50 hover:bg-white"
              title="Xuất danh sách ra tệp Excel"
            >
              <Download size={20} className="text-slate-950 group-hover:translate-y-0.5 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-950">Xuất Excel</span>
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
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                htmlFor="excel-import"
                className="cursor-pointer group flex items-center gap-3 px-8 py-4 bg-white/10 border border-white/20 rounded-2xl text-white hover:border-accent hover:bg-accent transition-all duration-300 shadow-lg hover:shadow-accent/20"
                title="Nhập danh sách từ tệp Excel"
              >
                <Upload size={20} className="text-white group-hover:text-slate-950 group-hover:translate-y-0.5 transition-all" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white group-hover:text-slate-950 transition-colors">Nhập Excel</span>
              </motion.label>
            </div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={openAddModal}
            className="group flex items-center gap-3 px-8 py-4 bg-white border-2 border-white rounded-2xl transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-accent/40 hover:bg-accent hover:border-accent"
          >
            <Plus size={20} className="text-black group-hover:rotate-90 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest text-black">Thêm đoàn viên</span>
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/30 font-black ml-2">Đơn vị cơ sở</label>
                <div className="bg-surface/50 border border-white/5 rounded-2xl px-4 py-1">
                  <CustomSelect value={selectedUnit} onChange={setSelectedUnit} options={unitOptions} className="bg-transparent border-none text-sm font-bold shadow-none" />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/30 font-black ml-2">Xếp loại chất lượng</label>
                <div className="bg-surface/50 border border-white/5 rounded-2xl px-4 py-1">
                  <CustomSelect value={selectedAchievement} onChange={setSelectedAchievement} options={achievementOptions} className="bg-transparent border-none text-sm font-bold shadow-none" />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/30 font-black ml-2">Niên khóa / Khóa</label>
                <div className="bg-surface/50 border border-white/5 rounded-2xl px-4 py-1">
                  <CustomSelect value={selectedAcademicYear} onChange={setSelectedAcademicYear} options={academicYearOptions} className="bg-transparent border-none text-sm font-bold shadow-none" />
                </div>
             </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <button 
              onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                isAdvancedSearchOpen ? "bg-accent text-black" : "bg-white/5 text-white/40 hover:bg-white/10"
              )}
            >
              <Filter size={14} />
              Thêm bộ lọc
            </button>
            <button 
              onClick={resetFilters}
              className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white/20 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Đặt lại
            </button>
          </div>

          <AnimatePresence>
            {isAdvancedSearchOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-black ml-2">Giới tính</label>
                      <div className="bg-surface/50 border border-white/5 rounded-2xl px-4 py-1">
                        <CustomSelect value={selectedGender} onChange={setSelectedGender} options={genderOptions} className="bg-transparent border-none text-sm font-bold shadow-none" />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-black ml-2">Quê quán</label>
                      <div className="relative">
                        <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                        <input 
                          type="text" 
                          placeholder="Nhập tỉnh thành (ví dụ: Lâm Đồng)" 
                          className="w-full bg-surface/50 border border-white/5 rounded-2xl py-3 px-12 text-sm text-white focus:outline-none focus:border-accent/40"
                          value={selectedHometown}
                          onChange={(e) => setSelectedHometown(e.target.value)}
                        />
                      </div>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-accent/5 border border-accent/10 rounded-[2.5rem] p-8 flex flex-col justify-center gap-4">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center text-black shadow-lg shadow-accent/20">
                 <Users size={20} />
              </div>
              <div>
                 <p className="text-[10px] uppercase tracking-widest text-white/30 font-black">Kết quả lọc</p>
                 <p className="text-3xl font-display font-bold text-white tabular-nums">{filteredMembers.length} <span className="text-sm font-sans opacity-40">mục</span></p>
              </div>
           </div>
        </div>
      </div>

      <div className="bg-surface/40 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] uppercase tracking-[0.2em] text-white/30 font-black">
                <th className="py-6 px-10">Đoàn viên</th>
                <th className="py-6 px-6 text-center">MSĐV / Khóa</th>
                <th className="py-6 px-6">Đơn vị cơ sở</th>
                <th className="py-6 px-10 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {paginatedMembers.map((member) => (
                <tr key={member.id} className="group hover:bg-white/[0.01] transition-colors">
                  <td className="py-6 px-10">
                    <div className="flex items-center gap-4">
                      {member.avatarUrl ? (
                         <img src={member.avatarUrl} alt="" className="w-12 h-12 rounded-2xl object-cover border border-white/10" />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center font-bold text-white/20 border border-white/5">
                          {member.fullName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-base font-bold text-white group-hover:text-accent transition-colors">{member.fullName}</p>
                        <p className="text-[11px] text-white/40">{member.email || "Chưa cập nhật email"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-6 text-center tabular-nums">
                    <p className="text-sm font-bold text-white opacity-80">{member.memberId}</p>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{member.academicYear || "— —"}</p>
                  </td>
                  <td className="py-6 px-6">
                    <span className="text-sm font-medium text-white/60">{getUnitName(member.unitId)}</span>
                    <div className="flex items-center gap-2 mt-1">
                       <div className={cn(
                         "w-1.5 h-1.5 rounded-full",
                         member.status === "Đang sinh hoạt" ? "bg-green-500" : "bg-red-400"
                       )} />
                       <span className="text-[10px] uppercase tracking-widest text-white/20 font-bold">{member.status}</span>
                    </div>
                  </td>
                  <td className="py-6 px-10 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleViewDetails(member)} className="p-2.5 bg-white/5 text-white/40 hover:text-accent hover:bg-white/10 rounded-xl transition-all">
                        <Eye size={18} />
                      </button>
                      <button onClick={() => handleEdit(member)} className="p-2.5 bg-white/5 text-white/40 hover:text-blue-400 hover:bg-white/10 rounded-xl transition-all">
                        <Edit3 size={18} />
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(member.id)} className="p-2.5 bg-white/5 text-white/40 hover:text-red-500 hover:bg-white/10 rounded-xl transition-all">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedMembers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-24 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">
                    Không tìm thấy đoàn viên nào theo tiêu chí này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
           <div className="text-[11px] text-white/20 font-black uppercase tracking-widest leading-none">
              Trang {currentPage} trên {totalPages || 1} • Tổng {filteredMembers.length} mục
           </div>
           
           <div className="flex items-center gap-2">
             <button 
               disabled={currentPage === 1}
               onClick={() => setCurrentPage(prev => prev - 1)}
               className="p-3 rounded-xl bg-white/5 border border-white/5 text-white/40 disabled:opacity-20 hover:bg-white/10 transition-all hover:text-white"
             >
               <ChevronDown className="rotate-90" size={18} />
             </button>
             
             <div className="flex items-center gap-1.5 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                <span className="text-sm font-bold text-white tabular-nums">{currentPage}</span>
                <span className="text-[10px] text-white/20 font-black">/</span>
                <span className="text-[10px] font-black text-white/30 tabular-nums">{totalPages || 1}</span>
             </div>

             <button 
               disabled={currentPage === totalPages || totalPages === 0}
               onClick={() => setCurrentPage(prev => prev + 1)}
               className="p-3 rounded-xl bg-white/5 border border-white/5 text-white/40 disabled:opacity-20 hover:bg-white/10 transition-all hover:text-white"
             >
               <ChevronDown className="-rotate-90" size={18} />
             </button>
           </div>
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
                  <motion.button
                    whileHover={{ scale: 1.02, x: -5 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-8 py-4 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest text-white/40 hover:bg-white/5 transition-all"
                  >
                    Hủy bỏ
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="flex-1 px-8 py-4 bg-accent border border-white/20 rounded-2xl transition-all shadow-xl shadow-accent/20 hover:bg-white"
                  >
                    <span className="text-xs font-black uppercase tracking-widest text-slate-950">Lưu hồ sơ đoàn viên</span>
                  </motion.button>
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
                    <p className="text-white font-mono">
                      {detailsMember.dob && !isNaN(new Date(detailsMember.dob).getTime()) 
                        ? new Date(detailsMember.dob).toLocaleDateString("vi-VN") 
                        : "---"}
                    </p>
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
                                <span className="text-[10px] text-white/60 font-mono italic">
                                  {h.date && !isNaN(new Date(h.date).getTime()) 
                                    ? new Date(h.date).toLocaleDateString("vi-VN") 
                                    : "---"}
                                </span>
                                <span className="text-accent">→</span>
                                <span className="text-[10px] uppercase font-serif italic text-white">{h.newStatus}</span>
                              </div>
                              <p className="text-sm text-white/40 italic">"{h.reason}"</p>
                           </div>
                        </div>
                      ))}
                      <motion.button 
                        whileHover={{ scale: 1.05, x: 5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setShowDetailsModal(false);
                          handleViewHistory(detailsMember);
                        }}
                        className="text-[10px] uppercase tracking-widest font-black text-accent py-2.5 px-8 rounded-xl border border-accent/20 bg-accent/5 hover:bg-accent hover:text-white transition-all shadow-lg shadow-accent/5"
                      >
                        Xem toàn bộ lịch sử
                      </motion.button>
                   </div>
                 ) : (
                   <p className="text-sm text-white/20 italic">Chưa có thay đổi trạng thái nào được ghi nhận.</p>
                 )}
              </div>
            </div>
            
            <div className="p-8 border-t border-white/5 flex gap-4 shrink-0 bg-white/[0.01]">
              <motion.button 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowDetailsModal(false);
                  handleEdit(detailsMember);
                }}
                className="flex-1 py-4 bg-accent border border-white/20 rounded-2xl transition-all shadow-xl shadow-accent/20 hover:bg-white"
              >
                <span className="text-xs font-black uppercase tracking-widest text-slate-950">Chỉnh sửa hồ sơ</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowDetailsModal(false)}
                className="px-10 py-4 bg-white/5 text-white/60 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10"
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
                                {change.date && !isNaN(new Date(change.date).getTime()) 
                                  ? new Date(change.date).toLocaleDateString("vi-VN") 
                                  : "---"}
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
                <motion.button 
                  whileHover={{ scale: 1.02, x: -5 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setShowUnitModal(false)}
                  className="flex-1 py-4 text-xs uppercase font-black text-white/40 hover:bg-white/5 border border-white/5 rounded-2xl transition-all"
                >
                  Hủy
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="flex-1 py-4 bg-accent border border-white/20 rounded-2xl shadow-xl shadow-accent/20 hover:bg-white transition-all"
                >
                  <span className="text-xs font-black uppercase tracking-widest text-slate-950">Lưu đơn vị</span>
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
