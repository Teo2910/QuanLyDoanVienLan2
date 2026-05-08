import React, { useEffect, useState, useMemo } from "react";
import { dataService } from "../../services/dataService";
import { Member, Unit } from "../../types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, BarChart3, PieChart as PieChartIcon, Activity, Star, Calendar, Building2, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { useAuth } from "../../contexts/AuthContext";
import { useLiveSync } from "../../hooks/useLiveSync";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { CustomSelect } from "../../components/CustomSelect";

const COLORS = ['#7aa2f7', '#bb9af7', '#7dcfff', '#9ece6a', '#e0af68', '#f7768e'];

export const Statistics: React.FC = () => {
  const { profile, isSecretary } = useAuth();
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("all");

  useEffect(() => {
    if (isSecretary && profile?.unitId) {
      setSelectedUnitId(profile.unitId);
    }
  }, [isSecretary, profile?.unitId]);

  const loadData = () => {
    Promise.all([
      dataService.getMembers(),
      dataService.getUnits()
    ]).then(([mData, uData]) => {
      setAllMembers(mData);
      setUnits(uData);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const members = useMemo(() => {
    if (selectedUnitId === "all") return allMembers;
    return allMembers.filter(m => m.unitId === selectedUnitId);
  }, [allMembers, selectedUnitId]);

  const unitOptions = useMemo(() => {
    const options = [
      { value: "all", label: `Toàn hệ thống (${allMembers.length})` }
    ];
    units.forEach(unit => {
      const count = allMembers.filter(m => m.unitId === unit.id).length;
      options.push({ value: unit.id, label: `${unit.name} (${count})` });
    });
    return options;
  }, [units, allMembers]);

  const stats = useMemo(() => {
    if (!members.length) return null;

    // Gender stats
    const genderMap = members.reduce((acc, m) => {
      acc[m.gender] = (acc[m.gender] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const genderData = Object.entries(genderMap).map(([name, value]) => ({ name, value }));

    // Ethnicity stats
    const ethnicMap = members.reduce((acc, m) => {
      const e = m.ethnic || "Chưa cập nhật";
      acc[e] = (acc[e] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const ethnicData = Object.entries(ethnicMap)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => (b.value as number) - (a.value as number));

    // Status stats
    const statusMap = members.reduce((acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    // Achievement stats
    const achievementMap = members.reduce((acc, m) => {
      const a = m.achievementLevel || "Chưa xếp loại";
      acc[a] = (acc[a] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const achievementData = Object.entries(achievementMap).map(([name, value]) => ({ name, value }));

    // Outstanding members count
    const outstandingCount = members.filter(m => m.isOutstanding).length;
    const outstandingData = [
      { name: "Tiêu biểu", value: outstandingCount },
      { name: "Khác", value: members.length - outstandingCount }
    ];

    // Unit stats (only relevant for admin)
    const unitMap = members.reduce((acc, m) => {
      const unit = units.find(u => u.id === m.unitId)?.name || "N/A";
      acc[unit] = (acc[unit] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const unitData = Object.entries(unitMap)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => (b.value as number) - (a.value as number));

    return { genderData, ethnicData, statusData, achievementData, unitData, outstandingCount, outstandingData };
  }, [members, units]);

  const unitTableStats = useMemo(() => {
    if (!units.length) return [];
    
    return units.map(unit => {
      const unitMembers = allMembers.filter(m => m.unitId === unit.id);
      const males = unitMembers.filter(m => m.gender === "Nam").length;
      const females = unitMembers.filter(m => m.gender === "Nữ").length;
      const kinh = unitMembers.filter(m => m.ethnic?.toLowerCase() === 'kinh').length;
      const others = unitMembers.filter(m => m.ethnic?.toLowerCase() !== 'kinh' && m.ethnic).length;
      const outstanding = unitMembers.filter(m => m.isOutstanding).length;
      
      // Status breakdown
      const active = unitMembers.filter(m => m.status === "Đang sinh hoạt").length;
      const moved = unitMembers.filter(m => m.status === "Đã chuyển sinh hoạt").length;
      const left = unitMembers.filter(m => m.status === "Đã trưởng thành").length;
      
      // Achievement breakdown
      const excellent = unitMembers.filter(m => m.achievementLevel === "Xuất sắc").length;
      const good = unitMembers.filter(m => m.achievementLevel === "Khá").length;
      const average = unitMembers.filter(m => m.achievementLevel === "Trung bình").length;

      return {
        id: unit.id,
        name: unit.name,
        total: unitMembers.length,
        males,
        females,
        ethnic: { kinh, others },
        outstanding,
        status: { active, moved, left },
        achievements: { excellent, good, average }
      };
    }).sort((a, b) => b.total - a.total);
  }, [allMembers, units]);

  useLiveSync("members:changed", loadData);
  useLiveSync("units:changed", loadData);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedUnitName = selectedUnitId === "all" ? "Toàn hệ thống" : units.find(u => u.id === selectedUnitId)?.name || "Chi đoàn";

  const handleExportExcel = () => {
    if (!members.length) return;

    // 1. Prepare Members List Sheet
    const membersData = members.map((m, index) => ({
      "STT": index + 1,
      "Họ và Tên": m.fullName,
      "Mã số": m.memberId,
      "Giới tính": m.gender,
      "Ngày sinh": m.dob,
      "Dân tộc": m.ethnic,
      "Tình trạng": m.status,
      "Xếp loại": m.achievementLevel || "Chưa xếp loại",
      "Đơn vị": units.find(u => u.id === m.unitId)?.name || "N/A",
      "Ghi chú": m.isOutstanding ? "Đoàn viên tiêu biểu" : ""
    }));

    // 2. Prepare Statistics Summary Sheet
    const summaryData = [
      ["BÁO CÁO THỐNG KÊ ĐOÀN VIÊN"],
      [`Đơn vị: ${selectedUnitName}`],
      [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
      [],
      ["I. THỐNG KÊ GIỚI TÍNH"],
      ["Tiêu chí", "Số lượng", "Tỷ lệ (%)"],
      ...stats?.genderData.map(d => [d.name, d.value, ((d.value / members.length) * 100).toFixed(1)]) || [],
      [],
      ["II. THỐNG KÊ TÌNH TRẠNG SINH HOẠT"],
      ["Tiêu chí", "Số lượng", "Tỷ lệ (%)"],
      ...stats?.statusData.map(d => [d.name, d.value, ((d.value / members.length) * 100).toFixed(1)]) || [],
      [],
      ["III. THỐNG KÊ XẾP LOẠI"],
      ["Tiêu chí", "Số lượng", "Tỷ lệ (%)"],
      ...stats?.achievementData.map(d => [d.name, d.value, ((d.value / members.length) * 100).toFixed(1)]) || [],
      [],
      ["IV. THỐNG KÊ DÂN TỘC"],
      ["Tiêu chí", "Số lượng", "Tỷ lệ (%)"],
      ...stats?.ethnicData.map(d => [d.name, d.value, ((d.value / members.length) * 100).toFixed(1)]) || [],
      [],
      ["V. THỐNG KÊ DANH HIỆU"],
      ["Tiêu chí", "Số lượng", "Tỷ lệ (%)"],
      ["Đoàn viên tiêu biểu", stats?.outstandingCount || 0, (((stats?.outstandingCount || 0) / members.length) * 100).toFixed(1)],
      ["Khác", members.length - (stats?.outstandingCount || 0), (((members.length - (stats?.outstandingCount || 0)) / members.length) * 100).toFixed(1)],
    ];

    // Create workbook and add sheets
    const wb = XLSX.utils.book_new();
    
    // Add Summary sheet first
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Báo cáo tổng hợp");

    // Add Detailed List sheet
    const wsMembers = XLSX.utils.json_to_sheet(membersData);
    XLSX.utils.book_append_sheet(wb, wsMembers, "Danh sách chi tiết");

    // Save file
    const fileName = `Thong_ke_Doan_vien_${selectedUnitName.replace(/\s+/g, '_')}_${new Date().getTime()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden p-6">
      <div className="shrink-0 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pt-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-white flex items-center gap-4 tracking-tight group cursor-default">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.2 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <BarChart3 className="text-accent" size={32} />
            </motion.div>
            <span>Thống kê số liệu</span>
          </h2>
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 mt-1 font-bold ml-12">
            Tổng hợp dữ liệu {selectedUnitName}
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto">
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportExcel}
            className="group flex items-center gap-3 px-8 py-4 bg-accent border border-white/20 rounded-2xl transition-all duration-300 shadow-xl shadow-accent/30 hover:shadow-accent/50 hover:bg-white"
          >
            <Download size={20} className="text-slate-950 group-hover:translate-y-0.5 transition-transform" />
            <span className="text-xs uppercase tracking-widest font-black text-slate-950">Xuất file Excel</span>
          </motion.button>

          {!isSecretary && (
            <div className="flex items-center gap-4 w-full sm:w-auto">
               <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold whitespace-nowrap">Chọn đơn vị:</span>
               <CustomSelect 
                 value={selectedUnitId}
                 onChange={setSelectedUnitId}
                 options={unitOptions}
                 className="w-full sm:w-80"
               />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
        <div className="space-y-8 pb-12">
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Outstanding Members Highlight - New */}
        <motion.div 
          whileHover={{ scale: 1.01, translateY: -5 }}
          className="lg:col-span-2 bg-gradient-to-br from-accent/20 to-surface/40 border border-accent/20 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group cursor-default transition-all duration-300 hover:shadow-accent/5"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[100px] -mr-32 -mt-32 rounded-full group-hover:bg-accent/30 transition-colors duration-700" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
          
          <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-sm uppercase tracking-[0.3em] text-accent font-black mb-4 group-hover:tracking-[0.4em] transition-all duration-300">Danh hiệu danh dự</h3>
              <h2 className="text-5xl font-bold text-white leading-tight">
                Đoàn viên <br />
                <span className="text-accent not-italic font-sans font-bold uppercase tracking-tight">Tiêu biểu</span>
              </h2>
              <p className="text-white/40 text-sm mt-6 max-w-md leading-relaxed">
                Những cá nhân có thành tích xuất sắc, đóng góp tích cực trong các hoạt động Đoàn và phong trào thanh thiếu nhi tại đơn vị.
              </p>
            </div>
            
            <div className="flex items-center gap-12">
              <div className="text-center p-8 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 min-w-[160px] shadow-xl">
                <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold block mb-2">Số lượng</span>
                <span className="text-6xl font-bold text-white leading-none">
                  {stats?.outstandingCount}
                </span>
                <span className="text-xs text-white/40 block mt-2 font-medium">Đoàn viên</span>
              </div>
              <div className="h-24 w-px bg-white/10 hidden md:block" />
              <div className="text-center">
                <span className="text-[10px] uppercase tracking-widest text-accent font-bold block mb-2">Tỷ lệ hệ thống</span>
                <span className="text-4xl font-bold text-accent">
                  {((stats?.outstandingCount || 0) / members.length * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Gender Breakdown */}
        <motion.div 
          whileHover={{ scale: 1.01, translateY: -5 }}
          className="bg-surface/40 border border-white/5 p-8 rounded-[2.5rem] shadow-xl backdrop-blur-sm group transition-all duration-300 hover:shadow-accent/5 hover:border-white/10"
        >
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3">
              <PieChartIcon className="text-accent" size={16} />
              Cơ cấu giới tính
            </h3>
            <div className="text-right">
              <span className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Tổng cộng</span>
              <p className="text-xl font-bold text-white">{members.length}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats?.genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1b26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {stats?.genderData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm text-white/80">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white">{item.value}</span>
                    <span className="text-[10px] text-white/40 ml-2">({((item.value / members.length) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Status Breakdown */}
        <motion.div 
          whileHover={{ scale: 1.01, translateY: -5 }}
          className="bg-surface/40 border border-white/5 p-8 rounded-[2.5rem] shadow-xl backdrop-blur-sm group transition-all duration-300 hover:shadow-accent/5 hover:border-white/10"
        >
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3">
              <Activity className="text-accent" size={16} />
              Tình trạng sinh hoạt
            </h3>
            <div className="text-right">
              <span className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Đã ghi nhận</span>
              <p className="text-xl font-bold text-white">{members.length}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: '#1a1b26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {stats?.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {stats?.statusData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm text-white/80">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white">{item.value}</span>
                    <span className="text-[10px] text-white/40 ml-2">({((item.value / members.length) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Achievement Breakdown */}
        <motion.div 
          whileHover={{ scale: 1.01, translateY: -5 }}
          className="bg-surface/40 border border-white/5 p-8 rounded-[2.5rem] shadow-xl backdrop-blur-sm group transition-all duration-300 hover:shadow-accent/5 hover:border-white/10"
        >
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3">
              <Star className="text-accent" size={16} />
              Xếp loại đoàn viên
            </h3>
            <div className="text-right">
              <span className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Đã xếp loại</span>
              <p className="text-xl font-bold text-white">{members.length}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.achievementData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats?.achievementData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1b26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {stats?.achievementData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm text-white/80">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white">{item.value}</span>
                    <span className="text-[10px] text-white/40 ml-2">({((item.value / members.length) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Top Ethnic Groups */}
        <motion.div 
          whileHover={{ scale: 1.01, translateY: -5 }}
          className="bg-surface/40 border border-white/5 p-8 rounded-[2.5rem] shadow-xl backdrop-blur-sm group transition-all duration-300 hover:shadow-accent/5 hover:border-white/10"
        >
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3">
              <Users className="text-accent" size={16} />
              Thống kê dân tộc
            </h3>
            <div className="text-right">
              <span className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Số dân tộc</span>
              <p className="text-xl font-bold text-white">{stats?.ethnicData.length}</p>
            </div>
          </div>
          <div className="space-y-6 overflow-y-auto max-h-64 custom-scrollbar pr-4">
            {stats?.ethnicData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/40">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-white font-medium">{item.name}</span>
                    <div className="text-right">
                      <span className="text-white font-bold">{item.value} người</span>
                      <span className="text-[10px] text-white/40 ml-2">({((item.value / members.length) * 100).toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.value / members.length) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-accent bg-gradient-to-r from-accent to-accent-foreground/50" 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Member distribution by Unit (Only for Admin when showing All) */}
        {!isSecretary && selectedUnitId === "all" && (
          <div className="lg:col-span-2 bg-surface/40 border border-white/5 p-8 rounded-[2.5rem] shadow-xl backdrop-blur-sm">
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3">
                <Building2 className="text-accent" size={16} />
                Phân bổ theo Chi đoàn
              </h3>
              <div className="text-right">
                <span className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Tổng số chi đoàn</span>
                <p className="text-xl font-bold text-white">{units.length}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.unitData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} width={150} />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{ backgroundColor: '#1a1b26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#7aa2f7" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-80 custom-scrollbar pr-4">
                {stats?.unitData.map((item, index) => (
                  <div key={item.name} className="flex flex-col p-3 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-white/80 font-medium truncate max-w-[150px]">{item.name}</span>
                      <span className="text-xs font-bold text-white">{item.value} đ viên</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-white/30 uppercase tracking-tighter">
                      <span>Tỷ trọng</span>
                      <span>{((item.value / allMembers.length) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Unit-by-Unit Summary Table - Excel Style */}
      <div className="bg-surface/40 border border-white/5 p-4 md:p-8 rounded-[2rem] shadow-xl backdrop-blur-sm mt-10 overflow-hidden w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 px-2">
          <div>
            <h3 className="text-sm uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3">
              <Building2 className="text-accent" size={18} />
              Bảng tổng hợp số liệu chi tiết theo đơn vị
            </h3>
            <p className="text-[10px] text-white/20 uppercase tracking-widest mt-2">Dữ liệu thời gian thực được tổng hợp từ danh sách đoàn viên</p>
          </div>
          <div className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-[10px] text-white/40 uppercase font-black tracking-widest mr-4">Tổng cộng</span>
            <span className="text-lg font-bold text-white">{units.length}</span>
          </div>
        </div>

        <div className="relative rounded-2xl border border-white/5 overflow-hidden bg-[#1a1b26]/30">
          <div className="w-full overflow-x-auto custom-scrollbar max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-separate border-spacing-0 min-w-[1150px]">
              <thead>
                <tr className="sticky top-0 z-50">
                  <th className="py-4 px-3 text-xs uppercase tracking-widest text-white/80 font-black bg-[#2a2b3d] border-b border-r border-white/5 text-center">STT</th>
                  <th className="py-4 px-5 text-xs uppercase tracking-widest text-white/80 font-black bg-[#2a2b3d] border-b border-white/5 sticky left-0 z-50 backdrop-blur-xl min-w-[200px]">Tên đơn vị</th>
                  
                  {/* Group Headers */}
                  <th colSpan={3} className="py-2.5 px-3 text-[10px] uppercase tracking-[0.2em] text-accent font-black text-center bg-[#2a2b3d] border-b border-l border-white/5">CƠ BẢN</th>
                  <th colSpan={2} className="py-2.5 px-3 text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-black text-center bg-[#2a2b3d] border-b border-l border-white/5">DÂN TỘC</th>
                  <th colSpan={3} className="py-2.5 px-3 text-[10px] uppercase tracking-[0.2em] text-purple-400 font-black text-center bg-[#2a2b3d] border-b border-l border-white/5">TRẠNG THÁI</th>
                  <th colSpan={3} className="py-2.5 px-3 text-[10px] uppercase tracking-[0.2em] text-blue-400 font-black text-center bg-[#2a2b3d] border-b border-l border-white/5">XẾP LOẠI</th>
                  
                  <th className="py-4 px-5 text-xs uppercase tracking-[0.2em] text-amber-400 font-black text-center bg-[#2a2b3d] border-b border-l border-white/5">Tiêu biểu</th>
                </tr>
                <tr className="sticky top-[41px] z-40">
                  <th className="bg-[#24273a] border-b border-r border-white/5"></th>
                  <th className="bg-[#24273a] border-b border-white/5 sticky left-0 z-40 shadow-[2px_0_10px_rgba(0,0,0,0.3)]"></th>
                  
                  <th className="py-4 px-3 text-[10px] uppercase tracking-widest text-white/90 font-black text-center border-b border-l border-white/5 bg-[#24273a]/80 backdrop-blur-md">Tổng</th>
                  <th className="py-4 px-3 text-[10px] uppercase tracking-widest text-white/90 font-bold text-center border-b bg-[#24273a]/80 backdrop-blur-md">Nam</th>
                  <th className="py-4 px-3 text-[10px] uppercase tracking-widest text-white/90 font-bold text-center border-b bg-[#24273a]/80 backdrop-blur-md">Nữ</th>
                  
                  <th className="py-4 px-3 text-[10px] uppercase tracking-widest text-white/90 font-bold text-center border-b border-l border-white/5 bg-[#24273a]/80 backdrop-blur-md">Kinh</th>
                  <th className="py-4 px-3 text-[10px] uppercase tracking-widest text-white/90 font-bold text-center border-b bg-[#24273a]/80 backdrop-blur-md">Khác</th>
                  
                  <th className="py-4 px-3 text-[10px] uppercase tracking-widest text-white/90 font-bold text-center border-b border-l border-white/5 bg-[#24273a]/80 backdrop-blur-md">Đang SH</th>
                  <th className="py-4 px-3 text-[10px] uppercase tracking-widest text-white/90 font-bold text-center border-b bg-[#24273a]/80 backdrop-blur-md">Chuyển</th>
                  <th className="py-4 px-3 text-[10px] uppercase tracking-widest text-white/90 font-bold text-center border-b bg-[#24273a]/80 backdrop-blur-md">T. Thành</th>
                  
                  <th className="py-4 px-3 text-[10px] uppercase tracking-widest text-white/90 font-bold text-center border-b border-l border-white/5 bg-[#24273a]/80 backdrop-blur-md">X. Sắc</th>
                  <th className="py-4 px-3 text-[10px] uppercase tracking-widest text-white/90 font-bold text-center border-b bg-[#24273a]/80 backdrop-blur-md">Khá</th>
                  <th className="py-4 px-3 text-[10px] uppercase tracking-widest text-white/90 font-bold text-center border-b bg-[#24273a]/80 backdrop-blur-md">T. Bình</th>
                  
                  <th className="border-b border-l border-white/5 bg-[#24273a]/80 backdrop-blur-md"></th>
                </tr>
              </thead>
              <tbody>
                {unitTableStats.map((item, index) => (
                  <tr key={item.id} className="group hover:bg-white/[0.04] transition-all duration-300">
                    <td className="py-4 px-3 text-sm text-white/50 font-mono border-b border-r border-white/5 text-center">{String(index + 1).padStart(2, '0')}</td>
                    <td className="py-4 px-5 sticky left-0 z-20 bg-[#24273a] transition-colors border-b border-white/5 group-hover:bg-[#2d3045] shadow-[2px_0_10px_rgba(0,0,0,0.2)]">
                      <div className="flex flex-col">
                        <span 
                          className="text-sm text-white font-bold tracking-tight group-hover:text-accent transition-colors truncate max-w-[180px]"
                          title={item.name}
                        >
                          {item.name}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-0.5 flex-1 bg-white/5 rounded-full overflow-hidden flex">
                            <div className="h-full bg-blue-500/40" style={{ width: `${(item.males / (item.total || 1)) * 100}%` }} />
                            <div className="h-full bg-pink-500/40" style={{ width: `${(item.females / (item.total || 1)) * 100}%` }} />
                          </div>
                          <span className="text-[8px] text-white/40 uppercase font-black">Ratio</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center bg-white/[0.01] border-b border-l border-white/5 text-base font-bold font-mono text-white">
                      {item.total}
                    </td>
                    <td className="py-4 px-3 text-center text-base font-bold font-mono text-white border-b">{item.males}</td>
                    <td className="py-4 px-3 text-center text-base font-bold font-mono text-white border-b">{item.females}</td>
                    
                    <td className="py-4 px-3 text-center border-b border-l border-white/5 bg-emerald-400/[0.02] text-base text-white/80 font-bold font-mono">
                      {item.ethnic.kinh}
                    </td>
                    <td className="py-4 px-3 text-center border-b bg-emerald-400/[0.02] text-base font-bold font-mono text-white/30">
                      <span className={cn(item.ethnic.others > 0 && "text-emerald-400")}>
                        {item.ethnic.others}
                      </span>
                    </td>
                    
                    <td className="py-4 px-3 text-center text-base font-bold font-mono text-white/90 border-b border-l border-white/5">{item.status.active}</td>
                    <td className="py-4 px-3 text-center text-base font-bold font-mono text-white/80 border-b">{item.status.moved}</td>
                    <td className="py-4 px-3 text-center text-base font-bold font-mono text-white/80 border-b">{item.status.left}</td>
                    
                    <td className="py-4 px-3 text-center border-b border-l border-white/5 text-base font-bold font-mono text-white/50">
                      <span className={cn(item.achievements.excellent > 0 && "text-green-400")}>{item.achievements.excellent}</span>
                    </td>
                    <td className="py-4 px-3 text-center border-b text-base font-bold font-mono text-white/50">
                      <span className={cn(item.achievements.good > 0 && "text-blue-400")}>{item.achievements.good}</span>
                    </td>
                    <td className="py-4 px-3 text-center border-b text-base font-bold font-mono text-white/50">
                      {item.achievements.average}
                    </td>
                    
                    <td className="py-4 px-5 text-center bg-amber-400/[0.02] border-b border-l border-white/5">
                      <span className={cn("text-base font-bold font-mono", item.outstanding > 0 ? "text-amber-400" : "text-white/30")}>
                        {item.outstanding}
                      </span>
                    </td>
                  </tr>
                ))}
                
                {/* Grand Total Row - Enhanced Designer Look */}
                <tr className="relative">
                  <td colSpan={2} className="py-6 px-6 bg-gradient-to-r from-accent/20 to-transparent border-t border-accent/30">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-accent rounded-xl shadow-lg shadow-accent/20">
                        <Activity className="text-black" size={16} />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-[0.3em] text-accent font-black block leading-none">Tổng kết hệ thống</span>
                        <span className="text-[7px] uppercase tracking-widest text-white/50 mt-1 block">Cập nhật thời gian thực</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-3 text-center bg-accent/10 border-t border-accent/20">
                    <div className="relative inline-block text-base text-white font-bold font-mono">
                      {allMembers.length}
                    </div>
                  </td>
                  <td className="py-6 px-3 text-center border-t border-white/10 bg-white/[0.02] text-base text-white font-bold font-mono">
                    {unitTableStats.reduce((acc, curr) => acc + curr.males, 0)}
                  </td>
                  <td className="py-6 px-3 text-center border-t border-white/10 bg-white/[0.02] text-base text-white font-bold font-mono">
                    {unitTableStats.reduce((acc, curr) => acc + curr.females, 0)}
                  </td>
                  
                  <td className="py-6 px-3 text-center border-t border-l border-white/10 bg-emerald-400/[0.05] text-base text-white font-bold font-mono">
                    {unitTableStats.reduce((acc, curr) => acc + curr.ethnic.kinh, 0)}
                  </td>
                  <td className="py-6 px-3 text-center border-t border-white/10 bg-emerald-400/[0.05] text-base text-emerald-400 font-bold font-mono">
                    {unitTableStats.reduce((acc, curr) => acc + curr.ethnic.others, 0)}
                  </td>
                  
                  <td className="py-6 px-3 text-center border-t border-l border-white/10 bg-white/[0.01] text-base text-white/90 font-bold font-mono">
                    {unitTableStats.reduce((acc, curr) => acc + curr.status.active, 0)}
                  </td>
                  <td className="py-6 px-3 text-center border-t border-white/10 bg-white/[0.01] text-base text-white/90 font-bold font-mono">
                    {unitTableStats.reduce((acc, curr) => acc + curr.status.moved, 0)}
                  </td>
                  <td className="py-6 px-3 text-center border-t border-white/10 bg-white/[0.01] text-base text-white/90 font-bold font-mono">
                    {unitTableStats.reduce((acc, curr) => acc + curr.status.left, 0)}
                  </td>
                  
                  <td className="py-6 px-3 text-center border-t border-l border-white/10 bg-white/[0.01] text-base text-green-400 font-bold font-mono">
                    {unitTableStats.reduce((acc, curr) => acc + curr.achievements.excellent, 0)}
                  </td>
                  <td className="py-6 px-3 text-center border-t border-white/10 bg-white/[0.01] text-base text-blue-400 font-bold font-mono">
                    {unitTableStats.reduce((acc, curr) => acc + curr.achievements.good, 0)}
                  </td>
                  <td className="py-6 px-3 text-center border-t border-white/10 bg-white/[0.01] text-base text-white/70 font-bold font-mono">
                    {unitTableStats.reduce((acc, curr) => acc + curr.achievements.average, 0)}
                  </td>
                  
                  <td className="py-6 px-6 text-center bg-amber-400/10 border-t border-amber-400/20 text-base text-amber-400 font-bold font-mono">
                    {unitTableStats.reduce((acc, curr) => acc + curr.outstanding, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>
      </div>
      </div>
    </div>
  );
};
