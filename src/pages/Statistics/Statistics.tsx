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
    <div className="w-full max-w-7xl mx-auto pb-32">
      <div className="space-y-16">
        {/* Header Section */}
        <section className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 relative">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1"
          >
            <div className="flex items-center gap-3 mb-10">
              <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-[10px] uppercase tracking-[0.4em] font-black border border-accent/20">Analytics Engine</span>
              <div className="h-px w-20 bg-white/10" />
              <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Insight v4.0</span>
            </div>
            <h2 className="text-6xl md:text-8xl font-display font-bold text-white tracking-tighter leading-[0.85] mb-10">
              Chỉ số <br />
              <span className="font-serif italic text-accent text-gradient lowercase">Đoàn viên</span>
            </h2>
            <p className="text-white/40 max-w-lg text-sm leading-relaxed font-medium capitalize">
              phân tích chuyên sâu về mật độ, trình độ chuyên môn và chất lượng hoạt động tại các đơn vị cơ sở trực thuộc.
            </p>
          </motion.div>

          <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
             {!isSecretary && (
               <div className="bg-surface/50 border border-white/5 rounded-[2rem] p-3 pl-8 flex items-center gap-4 w-full sm:w-80 group hover:border-accent/40 transition-all duration-500 shadow-2xl backdrop-blur-3xl">
                 <Building2 className="text-white/20 group-hover:text-accent transition-colors" size={20} />
                 <CustomSelect 
                   value={selectedUnitId}
                   onChange={setSelectedUnitId}
                   options={unitOptions}
                   className="w-full bg-transparent border-none p-0 focus:ring-0 text-white font-bold"
                 />
               </div>
             )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportExcel}
              className="w-full sm:w-auto px-10 py-5 bg-accent text-black rounded-[2rem] flex items-center justify-center gap-6 text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-accent/20 hover:shadow-accent/50 transition-all hover:bg-white border border-white/10"
            >
              <Download size={20} strokeWidth={3} />
              Báo cáo Excel
            </motion.button>
          </div>
        </section>

        {/* Highlight Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bento-card bg-accent flex flex-col md:flex-row justify-between items-center gap-16 overflow-hidden group relative"
        >
          <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-125 transition-transform duration-[2s] pointer-events-none">
            <Star size={300} className="text-black" />
          </div>
          <div className="relative z-10 flex-1 text-center md:text-left">
             <h3 className="text-[11px] uppercase tracking-[0.5em] text-black/60 font-black mb-6">Trọng tâm hệ thống</h3>
             <h4 className="text-5xl md:text-7xl font-serif italic text-black tracking-tight leading-[0.9] mb-8">
               Đoàn viên <br />
               <span className="not-italic font-display font-bold uppercase">Tiêu biểu</span>
             </h4>
             <p className="text-black/50 text-xs font-bold leading-relaxed max-w-sm">
               Những cá nhân xuất sắc có đóng góp vượt trội trong phong trào, là hạt nhân tích cực tại các đơn vị cơ sở.
             </p>
          </div>
          <div className="relative z-10 flex flex-wrap justify-center gap-10">
            <div className="p-10 bg-black/10 rounded-[2.5rem] border border-white/5 text-center min-w-[180px] backdrop-blur-sm">
               <span className="text-[10px] uppercase tracking-[0.3em] text-black/40 font-black block mb-4">Tổng danh hiệu</span>
               <span className="text-6xl font-display font-bold text-black tabular-nums leading-none">
                 {stats?.outstandingCount}
               </span>
            </div>
            <div className="p-10 bg-black/10 rounded-[2.5rem] border border-white/5 text-center min-w-[180px] backdrop-blur-sm">
               <span className="text-[10px] uppercase tracking-[0.3em] text-black/40 font-black block mb-4">Tỷ trọng (%)</span>
               <span className="text-6xl font-display font-bold text-black tabular-nums leading-none">
                 {members.length > 0 ? ((stats?.outstandingCount || 0) / members.length * 100).toFixed(0) : 0}%
               </span>
            </div>
          </div>
        </motion.div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-8">
           {/* Section 1: Gender & Ethnicity */}
           <motion.div className="md:col-span-6 lg:col-span-4 bento-card p-12">
             <h3 className="text-[11px] uppercase tracking-[0.4em] text-white/30 font-black mb-12">Cơ cấu giới tính</h3>
             <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.genderData}
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={10}
                      stroke="none"
                      dataKey="value"
                    >
                      {stats?.genderData?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#161b22', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
             </div>
           </motion.div>

           <motion.div className="md:col-span-6 lg:col-span-8 bento-card p-12 overflow-hidden relative">
             <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                <BarChart3 size={150} />
             </div>
             <div className="flex justify-between items-center mb-12 relative z-10">
               <h3 className="text-[11px] uppercase tracking-[0.4em] text-white/30 font-black">Xếp loại chất lượng</h3>
               <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                  <Activity className="text-accent" size={16} />
               </div>
             </div>
             <div className="h-72 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.achievementData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 700 }} />
                    <Tooltip 
                       contentStyle={{ backgroundColor: '#161b22', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.5rem' }}
                       cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    />
                    <Bar dataKey="value" radius={[15, 15, 0, 0]} barSize={40}>
                      {stats?.achievementData?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             </div>
           </motion.div>

           {/* Unit Distribution Table - Admin ONLY */}
           {!isSecretary && (
             <motion.div className="md:col-span-12 bento-card p-16 overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 mb-20">
                  <div className="max-w-xl">
                    <h3 className="text-[12px] uppercase tracking-[0.5em] text-white/30 font-black mb-6">Chi tiết đơn vị cơ sở</h3>
                    <p className="text-3xl font-serif italic text-white leading-tight">So sánh mật độ đoàn viên và chất lượng hoạt động tại các chi đoàn.</p>
                  </div>
                  <div className="px-8 py-4 bg-white/5 border border-white/10 rounded-[2rem] flex items-center gap-6">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black border-r border-white/10 pr-6">Database</span>
                    <span className="text-2xl font-display font-bold text-accent tabular-nums">{units.length} Unit</span>
                  </div>
                </div>
                
                <div className="overflow-x-auto fancy-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="pb-10 text-[10px] uppercase tracking-[0.4em] text-white/40 font-black">Tên đơn vị</th>
                        <th className="pb-10 text-[10px] uppercase tracking-[0.4em] text-white/40 font-black text-center">Đoàn số</th>
                        <th className="pb-10 text-[10px] uppercase tracking-[0.4em] text-white/40 font-black">Cơ cấu</th>
                        <th className="pb-10 text-[10px] uppercase tracking-[0.4em] text-white/40 font-black text-center">Ưu tú</th>
                        <th className="pb-10 text-[10px] uppercase tracking-[0.4em] text-white/40 font-black">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {unitTableStats.map((unit) => (
                        <tr key={unit.id} className="group hover:bg-white/[0.01] transition-all duration-500">
                          <td className="py-10 pr-6">
                            <p className="text-base font-bold text-white group-hover:text-accent transition-all duration-300">{unit.name}</p>
                            <p className="text-[9px] uppercase tracking-widest text-white/20 font-black mt-2">Đã đồng bộ Live Sync</p>
                          </td>
                          <td className="py-10 text-center">
                             <span className="text-4xl font-display font-bold text-white tabular-nums leading-none">{unit.total}</span>
                          </td>
                          <td className="py-10">
                             <div className="flex flex-col gap-3">
                               <div className="flex items-center gap-4">
                                  <div className="w-2 h-2 rounded-full bg-accent accent-glow" />
                                  <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest leading-none">Nam: {unit.males}</span>
                               </div>
                               <div className="flex items-center gap-4">
                                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                                  <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest leading-none">Nữ: {unit.females}</span>
                               </div>
                             </div>
                          </td>
                          <td className="py-10">
                             <div className="w-16 h-16 rounded-[1.5rem] bg-accent/5 border border-accent/20 flex items-center justify-center text-accent text-2xl font-display font-bold tabular-nums mx-auto group-hover:bg-accent group-hover:text-black transition-all">
                               {unit.outstanding}
                             </div>
                          </td>
                          <td className="py-10">
                            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-green-500/5 border border-green-500/10">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                              <span className="text-[9px] font-black text-green-500 uppercase tracking-[0.2em]">{unit.status.active} Active</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </motion.div>
           )}
        </div>
      </div>
    </div>
  );
};
