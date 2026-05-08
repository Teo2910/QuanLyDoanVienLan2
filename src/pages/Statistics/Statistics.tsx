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
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h2 className="text-4xl font-serif text-white flex items-center gap-4 italic tracking-tight">
            <BarChart3 className="text-accent" size={32} />
            Thống kê & Phân tích
          </h2>
          <p className="text-white/40 text-xs uppercase tracking-[0.3em] font-black mt-2">Dữ liệu nhân sự chi tiết • {selectedUnitName}</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          {!isSecretary && (
            <div className="bg-surface/50 border border-white/5 rounded-2xl px-6 py-2.5 flex items-center gap-3 w-64 shadow-xl">
              <Building2 className="text-white/20" size={18} />
              <CustomSelect 
                value={selectedUnitId}
                onChange={setSelectedUnitId}
                options={unitOptions}
                className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-bold shadow-none"
              />
            </div>
          )}
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportExcel}
            className="flex items-center gap-3 px-8 py-3.5 bg-accent text-black rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-xl shadow-accent/20"
          >
            <Download size={18} />
            Xuất báo cáo
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface/40 border border-white/5 p-8 rounded-3xl backdrop-blur-md">
          <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-4">Tổng đoàn viên</p>
          <div className="flex items-end justify-between">
            <h4 className="text-5xl font-display font-bold text-white tabular-nums">{members.length}</h4>
            <Users size={24} className="text-accent/40 mb-2" />
          </div>
        </div>

        <div className="bg-surface/40 border border-white/5 p-8 rounded-3xl backdrop-blur-md">
          <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-4">Đoàn viên tiêu biểu</p>
          <div className="flex items-end justify-between">
            <h4 className="text-5xl font-display font-bold text-yellow-400 tabular-nums">{stats?.outstandingCount}</h4>
            <Star size={24} className="text-yellow-400/40 mb-2" />
          </div>
        </div>

        <div className="bg-surface/40 border border-white/5 p-8 rounded-3xl backdrop-blur-md">
          <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-4">Đang sinh hoạt</p>
          <div className="flex items-end justify-between">
            <h4 className="text-5xl font-display font-bold text-green-400 tabular-nums">{stats?.statusData.find(d => d.name === "Đang sinh hoạt")?.value || 0}</h4>
            <Activity size={24} className="text-green-400/40 mb-2" />
          </div>
        </div>

        <div className="bg-surface/40 border border-white/5 p-8 rounded-3xl backdrop-blur-md">
          <p className="text-white/30 text-[10px] uppercase font-black tracking-widest mb-4">Tỷ lệ đoàn viên nữ</p>
          <div className="flex items-end justify-between">
            <h4 className="text-5xl font-display font-bold text-purple-400 tabular-nums">
              {members.length > 0 ? ((stats?.genderData.find(d => d.name === "Nữ")?.value || 0) / members.length * 100).toFixed(0) : 0}%
            </h4>
            <div className="w-6 h-6 rounded-full border-2 border-purple-400/40 flex items-center justify-center mb-2">
              <div className="w-2 h-2 rounded-full bg-purple-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface/40 border border-white/5 p-10 rounded-[2.5rem] backdrop-blur-md">
          <h3 className="text-[11px] uppercase tracking-[0.4em] text-white/30 font-black mb-10 pl-2">Cơ cấu giới tính</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.genderData}
                  innerRadius={80}
                  outerRadius={105}
                  paddingAngle={8}
                  stroke="none"
                  dataKey="value"
                >
                  {stats?.genderData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '1rem', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface/40 border border-white/5 p-10 rounded-[2.5rem] backdrop-blur-md">
          <h3 className="text-[11px] uppercase tracking-[0.4em] text-white/30 font-black mb-10 pl-2">Xếp loại chất lượng</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.achievementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '1rem' }} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={40}>
                  {stats?.achievementData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {!isSecretary && (
        <div className="bg-surface/40 border border-white/5 rounded-[2.5rem] p-10 backdrop-blur-md">
          <h3 className="text-[11px] uppercase tracking-[0.4em] text-white/30 font-black mb-10 pl-2">Số liệu chi tiết theo chi đoàn</h3>
          <div className="overflow-x-auto fancy-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-white/20 font-black">
                  <th className="pb-6">Phân loại đơn vị</th>
                  <th className="pb-6 text-center">Đoàn viên</th>
                  <th className="pb-6 text-center">Tiêu biểu</th>
                  <th className="pb-6">Phối hợp giới tính</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {unitTableStats.map(unit => (
                  <tr key={unit.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="py-8 font-bold text-white group-hover:text-accent transition-colors">{unit.name}</td>
                    <td className="py-8 text-center text-3xl font-display font-bold text-white tabular-nums opacity-60">{unit.total}</td>
                    <td className="py-8 text-center">
                      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-400/10 text-yellow-500 text-[10px] font-bold border border-yellow-400/20">
                        {unit.outstanding}
                      </span>
                    </td>
                    <td className="py-8">
                       <div className="flex items-center gap-6">
                          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden max-w-[150px]">
                             <div 
                               className="h-full bg-accent" 
                               style={{ width: `${unit.total > 0 ? (unit.males / unit.total * 100) : 0}%` }} 
                             />
                          </div>
                          <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                            {unit.males}M / {unit.females}F
                          </span>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
