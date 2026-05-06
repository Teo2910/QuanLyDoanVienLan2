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
      "Ngày sinh": m.birthday,
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
    <div className="space-y-12 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
        <div>
          <h2 className="text-4xl font-serif text-white flex items-center gap-4 italic tracking-tight">
            <BarChart3 className="text-accent" size={36} />
            Thống kê số liệu
          </h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mt-2 font-bold ml-12">
            Tổng hợp dữ liệu {selectedUnitName}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto">
          <button
            onClick={handleExportExcel}
            className="group flex items-center gap-3 px-6 py-3 bg-accent/10 border border-accent/20 rounded-2xl text-accent hover:bg-accent hover:text-white transition-all duration-300 shadow-lg shadow-accent/5"
          >
            <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
            <span className="text-xs uppercase tracking-widest font-bold">Xuất file Excel</span>
          </button>

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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Outstanding Members Highlight - New */}
        <div className="lg:col-span-2 bg-gradient-to-br from-accent/20 to-surface/40 border border-accent/20 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[100px] -mr-32 -mt-32 rounded-full group-hover:bg-accent/20 transition-colors duration-700" />
          <div className="relative flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-sm uppercase tracking-[0.3em] text-accent font-black mb-4">Danh hiệu danh dự</h3>
              <h2 className="text-5xl font-serif text-white italic leading-tight">
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
                <span className="text-6xl font-serif italic text-white leading-none">
                  {stats?.outstandingCount}
                </span>
                <span className="text-xs text-white/40 block mt-2 font-medium">Đoàn viên</span>
              </div>
              <div className="h-24 w-px bg-white/10 hidden md:block" />
              <div className="text-center">
                <span className="text-[10px] uppercase tracking-widest text-accent font-bold block mb-2">Tỷ lệ hệ thống</span>
                <span className="text-4xl font-serif italic text-accent">
                  {((stats?.outstandingCount || 0) / members.length * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Gender Breakdown */}
        <div className="bg-surface/40 border border-white/5 p-10 rounded-[2.5rem] shadow-xl backdrop-blur-sm">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3">
              <PieChartIcon className="text-accent" size={16} />
              Cơ cấu giới tính
            </h3>
            <div className="text-right">
              <span className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Tổng cộng</span>
              <p className="text-xl font-serif text-white italic">{members.length}</p>
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
        </div>

        {/* Status Breakdown */}
        <div className="bg-surface/40 border border-white/5 p-10 rounded-[2.5rem] shadow-xl backdrop-blur-sm">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3">
              <Activity className="text-accent" size={16} />
              Tình trạng sinh hoạt
            </h3>
            <div className="text-right">
              <span className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Đã ghi nhận</span>
              <p className="text-xl font-serif text-white italic">{members.length}</p>
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
        </div>

        {/* Achievement Breakdown */}
        <div className="bg-surface/40 border border-white/5 p-10 rounded-[2.5rem] shadow-xl backdrop-blur-sm">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3">
              <Star className="text-accent" size={16} />
              Xếp loại đoàn viên
            </h3>
            <div className="text-right">
              <span className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Đã xếp loại</span>
              <p className="text-xl font-serif text-white italic">{members.length}</p>
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
        </div>

        {/* Top Ethnic Groups */}
        <div className="bg-surface/40 border border-white/5 p-10 rounded-[2.5rem] shadow-xl backdrop-blur-sm">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3">
              <Users className="text-accent" size={16} />
              Thống kê dân tộc
            </h3>
            <div className="text-right">
              <span className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Số dân tộc</span>
              <p className="text-xl font-serif text-white italic">{stats?.ethnicData.length}</p>
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
        </div>

        {/* Member distribution by Unit (Only for Admin when showing All) */}
        {!isSecretary && selectedUnitId === "all" && (
          <div className="lg:col-span-2 bg-surface/40 border border-white/5 p-10 rounded-[2.5rem] shadow-xl backdrop-blur-sm">
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3">
                <Building2 className="text-accent" size={16} />
                Phân bổ theo Chi đoàn
              </h3>
              <div className="text-right">
                <span className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Tổng số chi đoàn</span>
                <p className="text-xl font-serif text-white italic">{units.length}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
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

      {/* General Summary Table - Simplified Horizontal Rows */}
      <div className="bg-surface/40 border border-white/5 p-10 rounded-[2.5rem] shadow-xl backdrop-blur-sm mt-10">
        <div className="flex justify-between items-start mb-10">
          <h3 className="text-sm uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3">
            <Activity className="text-accent" size={18} />
            Bảng tổng hợp số liệu chi tiết
          </h3>
        </div>

        <div className="space-y-10">
          {/* Gender Row */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-12 py-6 border-b border-white/5 last:border-0 hover:bg-white/[0.02] px-4 -mx-4 rounded-2xl transition-colors">
            <div className="lg:w-40 border-l-2 border-accent pl-4">
              <h4 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Giới tính</h4>
            </div>
            <div className="flex-1 flex flex-wrap gap-x-12 gap-y-4">
              {stats?.genderData.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-xs text-white/60">{item.name}:</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-serif italic text-white font-medium">{item.value}</span>
                    <span className="text-[10px] text-white/20 font-bold">({((item.value / members.length) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Row */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-12 py-6 border-b border-white/5 last:border-0 hover:bg-white/[0.02] px-4 -mx-4 rounded-2xl transition-colors">
            <div className="lg:w-40 border-l-2 border-accent pl-4">
              <h4 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Sinh hoạt</h4>
            </div>
            <div className="flex-1 flex flex-wrap gap-x-12 gap-y-4">
              {stats?.statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-xs text-white/60">{item.name}:</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-serif italic text-white font-medium">{item.value}</span>
                    <span className="text-[10px] text-white/20 font-bold">({((item.value / members.length) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Achievement Row */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-12 py-6 border-b border-white/5 last:border-0 hover:bg-white/[0.02] px-4 -mx-4 rounded-2xl transition-colors">
            <div className="lg:w-40 border-l-2 border-accent pl-4">
              <h4 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Xếp loại</h4>
            </div>
            <div className="flex-1 flex flex-wrap gap-x-12 gap-y-4">
              {stats?.achievementData.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-xs text-white/60">{item.name}:</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-serif italic text-white font-medium">{item.value}</span>
                    <span className="text-[10px] text-white/20 font-bold">({((item.value / members.length) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Other Indicators Row */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-12 py-6 border-b border-white/5 last:border-0 hover:bg-white/[0.02] px-4 -mx-4 rounded-2xl transition-colors">
            <div className="lg:w-40 border-l-2 border-accent pl-4">
              <h4 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Chỉ số khác</h4>
            </div>
            <div className="flex-1 flex flex-wrap gap-x-12 gap-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/60">Tiêu biểu:</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-serif italic text-white font-medium">{members.filter(m => m.isOutstanding).length}</span>
                  <span className="text-[10px] text-white/20 font-bold">({((members.filter(m => m.isOutstanding).length / members.length) * 100).toFixed(1)}%)</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/60">Dân tộc Kinh:</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-serif italic text-white font-medium">{members.filter(m => m.ethnic?.toLowerCase() === 'kinh').length}</span>
                  <span className="text-[10px] text-white/20 font-bold">({((members.filter(m => m.ethnic?.toLowerCase() === 'kinh').length / members.length) * 100).toFixed(1)}%)</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/60">Các dân tộc khác:</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-serif italic text-white font-medium">{members.filter(m => m.ethnic?.toLowerCase() !== 'kinh').length}</span>
                  <span className="text-[10px] text-white/20 font-bold">({((members.filter(m => m.ethnic?.toLowerCase() !== 'kinh').length / members.length) * 100).toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
