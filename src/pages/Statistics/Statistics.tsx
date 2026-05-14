import React, { useEffect, useState, useMemo } from "react";
import { dataService } from "../../services/dataService";
import { Member, Unit } from "../../types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, BarChart3, PieChart as PieChartIcon, Activity, Star, Building2, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { useAuth } from "../../contexts/AuthContext";
import { useLiveSync } from "../../hooks/useLiveSync";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { CustomSelect } from "../../components/CustomSelect";

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

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

    const genderMap = members.reduce((acc, m) => {
      acc[m.gender] = (acc[m.gender] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const genderData = Object.entries(genderMap).map(([name, value]) => ({ name, value }));

    const ethnicMap = members.reduce((acc, m) => {
      const e = m.ethnic || "Chưa cập nhật";
      acc[e] = (acc[e] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const ethnicData = Object.entries(ethnicMap)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value);

    const statusMap = members.reduce((acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    const achievementMap = members.reduce((acc, m) => {
      const a = m.achievementLevel || "Chưa xếp loại";
      acc[a] = (acc[a] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const achievementData = Object.entries(achievementMap).map(([name, value]) => ({ name, value }));

    const outstandingCount = members.filter(m => m.isOutstanding).length;

    const unitMap = members.reduce((acc, m) => {
      const unit = units.find(u => u.id === m.unitId)?.name || "N/A";
      acc[unit] = (acc[unit] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const unitData = Object.entries(unitMap)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value);

    return { genderData, ethnicData, statusData, achievementData, unitData, outstandingCount };
  }, [members, units]);

  const unitTableStats = useMemo(() => {
    if (!units.length) return [];
    
    return units.map(unit => {
      const unitMembers = allMembers.filter(m => m.unitId === unit.id);
      const males = unitMembers.filter(m => m.gender === "Nam").length;
      const females = unitMembers.filter(m => m.gender === "Nữ").length;
      const kinh = unitMembers.filter(m => m.ethnic?.toLowerCase() === 'kinh').length;
      const others = unitMembers.filter(m => m.ethnic && m.ethnic.toLowerCase() !== 'kinh').length;
      const religious = unitMembers.filter(m => m.religion && m.religion.toLowerCase() !== 'không').length;
      const noReligion = unitMembers.filter(m => !m.religion || m.religion.toLowerCase() === 'không').length;
      const outstanding = unitMembers.filter(m => m.isOutstanding).length;
      const active = unitMembers.filter(m => m.status === "Đang sinh hoạt").length;
      const moved = unitMembers.filter(m => m.status === "Đã chuyển sinh hoạt").length;
      const left = unitMembers.filter(m => m.status === "Đã trưởng thành").length;
      const excellent = unitMembers.filter(m => m.achievementLevel === "Xuất sắc").length;
      const good = unitMembers.filter(m => m.achievementLevel === "Khá").length;
      const average = unitMembers.filter(m => m.achievementLevel === "Trung bình").length;
      const graduate = unitMembers.filter(m => m.professionalLevel?.toLowerCase().includes("đại học") || m.professionalLevel?.toLowerCase().includes("thạc sĩ")).length;

      return {
        id: unit.id,
        name: unit.name,
        total: unitMembers.length,
        males,
        females,
        ethnic: { kinh, others },
        religion: { religious, noReligion },
        outstanding,
        status: { active, moved, left },
        achievements: { excellent, good, average },
        graduate
      };
    }).sort((a, b) => b.total - a.total);
  }, [allMembers, units]);

  const totalStats = useMemo(() => {
    return unitTableStats.reduce((acc, unit) => {
      acc.total += unit.total;
      acc.males += unit.males;
      acc.females += unit.females;
      acc.kinh += unit.ethnic.kinh;
      acc.others += unit.ethnic.others;
      acc.religious += unit.religion.religious;
      acc.noReligion += unit.religion.noReligion;
      acc.active += unit.status.active;
      acc.moved += unit.status.moved;
      acc.left += unit.status.left;
      acc.excellent += unit.achievements.excellent;
      acc.good += unit.achievements.good;
      acc.average += unit.achievements.average;
      acc.outstanding += unit.outstanding;
      acc.graduate += unit.graduate;
      return acc;
    }, {
      total: 0, males: 0, females: 0, kinh: 0, others: 0,
      religious: 0, noReligion: 0,
      active: 0, moved: 0, left: 0,
      excellent: 0, good: 0, average: 0,
      outstanding: 0, graduate: 0
    });
  }, [unitTableStats]);

  useLiveSync("members:changed", loadData);
  useLiveSync("units:changed", loadData);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest animate-pulse">Đang xử lý số liệu...</p>
      </div>
    );
  }

  const selectedUnitName = selectedUnitId === "all" ? "Toàn hệ thống" : units.find(u => u.id === selectedUnitId)?.name || "Chi đoàn";

  const handleExportExcel = () => {
    if (!members.length) return;
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
    const wb = XLSX.utils.book_new();
    const wsMembers = XLSX.utils.json_to_sheet(membersData);
    XLSX.utils.book_append_sheet(wb, wsMembers, "Danh sách chi tiết");
    const fileName = `Thong_ke_Doan_vien_${selectedUnitName.replace(/\s+/g, '_')}_${new Date().getTime()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="w-full pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 mb-12 sm:mb-16 lg:mb-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full sm:w-auto"
        >
          <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-1 bg-accent rounded-full" />
             <p className="text-slate-400 text-[10px] uppercase font-black tracking-[0.4em]">Analytics Engine</p>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-7xl font-display font-black text-slate-900 tracking-[-0.04em] leading-[0.9] mb-4 italic">
            Statistical <span className="text-accent underline decoration-[0.08em] underline-offset-[0.1em] decoration-accent/10">Insights</span>
          </h2>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
            Hợp nhất dữ liệu: <span className="text-slate-900 font-black">{selectedUnitName}</span>
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row items-center gap-5 w-full lg:w-auto">
          {!isSecretary && (
            <div className="w-full sm:w-80">
               <CustomSelect 
                 value={selectedUnitId}
                 onChange={setSelectedUnitId}
                 options={unitOptions}
                 className="w-full"
               />
            </div>
          )}
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-4 px-10 py-5 bg-slate-900 text-white rounded-3xl transition-all shadow-xl hover:shadow-accent/20 font-black text-[10px] uppercase tracking-widest w-full sm:w-auto shadow-slate-900/10"
          >
            <Download size={18} strokeWidth={2.5} className="text-accent" />
            Trích xuất Dữ liệu
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Hero Card for Outstanding Members - Scaled down */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -5 }}
          className="sm:col-span-2 bg-[#001D3D] p-8 sm:p-10 lg:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden text-white border border-white/5"
        >
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-accent/20 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative flex flex-col lg:flex-row justify-between items-center gap-8 lg:gap-12">
            <div className="max-w-xl text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-6">
                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xl border border-white/10">
                  <Star size={16} className="text-amber-400 fill-amber-400" />
                </div>
                <span className="text-[8px] uppercase tracking-[0.4em] font-black text-white/40">Excellence Hub</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight mb-4 leading-[1.1]">
                Gương mặt <span className="text-accent">Tiêu biểu</span>
              </h2>
              <p className="text-white/40 leading-relaxed font-medium text-xs sm:text-sm">
                Những cá nhân xuất sắc đóng góp tích cực cho phong trào VNPT.
              </p>
            </div>

            <div className="flex items-center gap-6 lg:gap-10 bg-white/[0.03] backdrop-blur-2xl p-6 lg:p-8 rounded-[2rem] border border-white/10 shadow-xl shrink-0">
              <div className="text-center">
                <span className="text-[8px] uppercase tracking-[0.3em] text-white/30 font-black block mb-2">Số lượng</span>
                <span className="text-4xl lg:text-5xl font-display font-medium leading-none tabular-nums tracking-tighter">
                  {stats?.outstandingCount}
                </span>
              </div>
              <div className="w-px h-12 lg:h-16 bg-white/10" />
              <div className="text-center">
                <span className="text-[8px] uppercase tracking-[0.3em] text-white/30 font-black block mb-2">Tỷ lệ</span>
                <span className="text-xl lg:text-2xl font-display font-medium tabular-nums text-accent">
                  {((stats?.outstandingCount || 0) / (members.length || 1) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Charts: Scaled down */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="bg-white border border-slate-100 p-6 lg:p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500"
        >
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-[9px] uppercase tracking-[0.3em] text-slate-400 font-black mb-1">Demographics</h3>
              <p className="text-lg font-display font-bold text-slate-900">Cơ cấu Giới tính</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400">
               <PieChartIcon size={18} />
            </div>
          </div>

          <div className="h-56 sm:h-64 lg:h-72 mb-8 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={stats?.genderData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" cy="50%" 
                  innerRadius="70%" 
                  outerRadius="95%" 
                  paddingAngle={6}
                >
                  {stats?.genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} cornerRadius={8} />)}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '1.25rem', border:'none', boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.1)', padding: '0.75rem'}} 
                  itemStyle={{fontWeight: 900, textTransform: 'uppercase', fontSize: '9px'}}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-2xl font-display font-bold text-slate-900 leading-none">{(totalStats.total)}</p>
                  <p className="text-[8px] uppercase tracking-widest text-slate-400 font-black mt-1">Tổng</p>
                </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {stats?.genderData.map((item, i) => (
              <div key={item.name} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}} />
                    <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">{item.name}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-xl font-display font-bold text-slate-900 tabular-nums">{item.value}</span>
                  <span className="text-[9px] font-black text-slate-300">{(item.value / (totalStats.total || 1) * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="bg-white border border-slate-100 p-6 lg:p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500"
        >
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-[9px] uppercase tracking-[0.3em] text-slate-400 font-black mb-1">Operational Status</h3>
              <p className="text-lg font-display font-bold text-slate-900">Tình trạng Sinh hoạt</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400">
               <Activity size={18} />
            </div>
          </div>

          <div className="h-56 sm:h-64 lg:h-72 mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.statusData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={9} tick={{fill: '#94a3b8', fontWeight: 900}} />
                <YAxis axisLine={false} tickLine={false} fontSize={9} tick={{fill: '#94a3b8', fontWeight: 900}} />
                <Tooltip 
                   cursor={{fill: 'rgba(59,130,246,0.03)', radius: [8, 8, 0, 0]}} 
                   contentStyle={{borderRadius: '1.25rem', border:'none', boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.1)', padding: '0.75rem'}} 
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={24}>
                  {stats?.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
             {stats?.statusData.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-100/50 group hover:border-accent/20 transition-all">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center font-display font-bold text-[10px] text-slate-400 group-hover:text-accent transition-colors">
                        0{i + 1}
                      </div>
                      <span className="text-[12px] font-bold text-slate-700">{item.name}</span>
                   </div>
                   <span className="text-lg font-display font-bold text-slate-900 tabular-nums">{item.value}</span>
                </div>
             ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }}
          className="bg-white border border-slate-100 p-10 lg:p-14 rounded-[3.5rem] shadow-sm hover:shadow-2xl hover:shadow-slate-200/40 transition-all duration-500"
        >
          <div className="flex justify-between items-start mb-12">
            <div>
              <h3 className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-black mb-2">Ethnic Diversity</h3>
              <p className="text-xl font-display font-bold text-slate-900">Cơ cấu Dân tộc</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl text-slate-400">
               <Users size={20} />
            </div>
          </div>

          <div className="h-64 sm:h-72 lg:h-80 mb-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.ethnicData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8', fontWeight: 900}} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8', fontWeight: 900}} />
                <Tooltip 
                   cursor={{fill: 'rgba(37,99,235,0.05)', radius: [10, 10, 0, 0]}} 
                   contentStyle={{borderRadius: '1.5rem', border:'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '1rem'}} 
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={32}>
                  {stats?.ethnicData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3">
            {stats?.ethnicData.slice(0, 4).map((item, i) => (
              <div key={item.name} className="px-5 py-3 bg-slate-50/50 rounded-2xl border border-slate-100/50 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[(i + 2) % COLORS.length]}} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.name}: <span className="text-slate-900">{item.value}</span></span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4 }}
          className="bg-white border border-slate-100 p-6 lg:p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500"
        >
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-[9px] uppercase tracking-[0.3em] text-slate-400 font-black mb-1">Contribution Quality</h3>
              <p className="text-lg font-display font-bold text-slate-900">Xếp loại Đoàn viên</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400">
               <Star size={18} />
            </div>
          </div>

          <div className="h-56 sm:h-64 lg:h-72 mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.achievementData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={9} tick={{fill: '#94a3b8', fontWeight: 900}} />
                <YAxis axisLine={false} tickLine={false} fontSize={9} tick={{fill: '#94a3b8', fontWeight: 900}} />
                <Tooltip 
                   cursor={{fill: 'rgba(139,92,246,0.03)', radius: [8, 8, 0, 0]}} 
                   contentStyle={{borderRadius: '1.25rem', border:'none', boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.1)', padding: '0.75rem'}} 
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={24}>
                  {stats?.achievementData.map((_, i) => <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats?.achievementData.map((item, i) => (
              <div key={item.name} className="px-4 py-2 bg-slate-50/50 rounded-xl border border-slate-100/50 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: COLORS[(i + 4) % COLORS.length]}} />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.name}: <span className="text-slate-900">{item.value}</span></span>
              </div>
            ))}
          </div>
        </motion.div>

        {selectedUnitId === "all" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="sm:col-span-2 bg-white border border-slate-100 p-6 lg:p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500"
          >
            <div className="flex justify-between items-center mb-10">
               <div>
                  <h3 className="text-[9px] uppercase tracking-[0.3em] text-slate-400 font-black mb-1.5">Institutional Scale</h3>
                  <p className="text-xl font-display font-bold text-slate-900">Mạng lưới Chi đoàn</p>
               </div>
               <div className="p-2.5 bg-accent/5 text-accent rounded-xl">
                  <Building2 size={20} />
               </div>
            </div>
            
            <div className="h-48 sm:h-64 lg:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.unitData} layout="vertical" margin={{ left: window.innerWidth < 640 ? 30 : (window.innerWidth < 1024 ? 60 : 100) }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} fontSize={8} tick={{fill: '#94a3b8', fontWeight: 900}} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={9} tick={{fill: '#475569', fontWeight: 700}} width={window.innerWidth < 640 ? 60 : (window.innerWidth < 1024 ? 100 : 140)} />
                  <Tooltip cursor={{fill: 'rgba(0,0,0,0.01)', radius: [0, 8, 8, 0]}} contentStyle={{borderRadius: '1.25rem', border:'none', boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.1)', padding: '0.75rem'}} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={window.innerWidth < 640 ? 10 : 20}>
                    {stats?.unitData.map((_, i) => <Cell key={i} fill={COLORS[0]} fillOpacity={1 - (i * 0.08)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        <div className="sm:col-span-2 bg-white border border-slate-100 rounded-[1.5rem] shadow-lg overflow-hidden mt-6 lg:mt-8">
          <div className="p-6 lg:p-8 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
            <div>
              <h3 className="text-lg lg:text-xl font-display font-bold text-slate-900 tracking-tight">Chi tiết Hệ thống</h3>
              <p className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-black mt-1">Phân tích dữ liệu SMART VNPT</p>
            </div>
            <div className="flex items-center gap-3">
               <div className="px-4 py-2 bg-accent text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md flex items-center gap-2">
                  <Activity size={12} className="animate-pulse" />
                  {units.length} Chi đoàn
               </div>
            </div>
          </div>
          <div className="relative group">
            {/* Scroll Hint for Mobile */}
            <div className="lg:hidden absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/10 backdrop-blur-md px-4 py-2 rounded-full z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
               <div className="w-1.5 h-1.5 bg-accent rounded-full animate-ping" />
               <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Vuốt ngang để xem chi tiết</p>
            </div>
            
            <div className="overflow-x-auto no-scrollbar relative p-0.5 lg:p-0">
              <table className="w-full text-left border-collapse border-spacing-0 min-w-[700px] lg:min-w-[800px]">
              <thead>
                <tr className="text-[8px] uppercase tracking-[0.15em] text-slate-400 font-black bg-white border-b border-slate-100">
                  <th className="py-3 px-4 text-center" rowSpan={2}>#</th>
                  <th className="py-3 px-4 min-w-[160px]" rowSpan={2}>Đơn vị Chi đoàn</th>
                  <th className="py-2 px-1.5 text-center border-x border-slate-50 text-blue-600 bg-blue-50/5" colSpan={3}>Nhân khẩu</th>
                  <th className="py-2 px-1.5 text-center border-x border-slate-50 text-emerald-600 bg-emerald-50/10" colSpan={2}>Dân tộc</th>
                  <th className="py-2 px-1.5 text-center border-x border-slate-50 text-teal-600 bg-teal-50/10" colSpan={2}>Tôn giáo</th>
                  <th className="py-2 px-1.5 text-center border-x border-slate-50 text-indigo-600 bg-indigo-50/5" colSpan={3}>Trạng thái</th>
                  <th className="py-2 px-1.5 text-center border-x border-slate-50 text-amber-600 bg-amber-50/5" colSpan={3}>Xếp loại</th>
                  <th className="py-3 px-2 text-center text-slate-900 border-l border-slate-50" rowSpan={2}>T.B</th>
                  <th className="py-3 px-2 text-center text-slate-900" rowSpan={2}>ĐH</th>
                </tr>
                <tr className="text-[7px] uppercase tracking-widest text-slate-400 font-black bg-white border-b border-slate-100">
                  <th className="py-2 px-1.5 text-center border-x border-slate-50">Tổng</th>
                  <th className="py-2 px-1.5 text-center border-x border-slate-50">Nam</th>
                  <th className="py-2 px-1.5 text-center border-x border-slate-50">Nữ</th>
                  <th className="py-2 px-1.5 text-center border-x border-slate-50">Kinh</th>
                  <th className="py-2 px-1.5 text-center border-x border-slate-50">Khác</th>
                  <th className="py-2 px-1.5 text-center border-x border-slate-50">Có</th>
                  <th className="py-2 px-1.5 text-center border-x border-slate-50">K</th>
                  <th className="py-2 px-1.5 text-center border-x border-slate-50">SH</th>
                  <th className="py-2 px-1.5 text-center border-x border-slate-50">Ch</th>
                  <th className="py-2 px-1.5 text-center border-x border-slate-50">Th</th>
                  <th className="py-2 px-1.5 text-center border-x border-slate-50">XS</th>
                  <th className="py-2 px-1.5 text-center border-x border-slate-50">Khá</th>
                  <th className="py-2 px-1.5 text-center border-x border-slate-50">TB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {unitTableStats.map((unit, index) => (
                  <tr key={unit.id} className="hover:bg-slate-50/60 transition-all group">
                    <td className="py-2 px-4 text-center text-slate-300 font-bold text-[9px] tabular-nums">{String(index + 1).padStart(2, '0')}</td>
                    <td className="py-2 px-4">
                       <span className="text-slate-900 font-bold text-[11px] group-hover:text-accent transition-colors block tracking-tight truncate max-w-[150px]">{unit.name}</span>
                    </td>
                    <td className="py-2 px-1.5 text-center font-bold text-slate-900 text-[11px] tabular-nums">{unit.total}</td>
                    <td className="py-2 px-1.5 text-center font-bold text-blue-600 text-[11px] tabular-nums">{unit.males}</td>
                    <td className="py-2 px-1.5 text-center font-bold text-rose-500 text-[11px] tabular-nums">{unit.females}</td>
                    <td className="py-2 px-1.5 text-center font-bold text-slate-500 text-[11px] tabular-nums">{unit.ethnic.kinh}</td>
                    <td className="py-2 px-1.5 text-center font-bold text-emerald-500 text-[11px] tabular-nums">{unit.ethnic.others}</td>
                    <td className="py-2 px-1.5 text-center font-bold text-teal-600 text-[11px] tabular-nums">{unit.religion.religious}</td>
                    <td className="py-2 px-1.5 text-center font-bold text-slate-300 text-[11px] tabular-nums">{unit.religion.noReligion}</td>
                    <td className="py-2 px-1.5 text-center font-bold text-indigo-500 text-[11px] tabular-nums">{unit.status.active}</td>
                    <td className="py-2 px-1.5 text-center font-bold text-slate-300 text-[11px] tabular-nums">{unit.status.moved}</td>
                    <td className="py-2 px-1.5 text-center font-bold text-slate-200 text-[11px] tabular-nums">{unit.status.left}</td>
                    <td className="py-2 px-1.5 text-center font-bold text-emerald-600 text-[11px] tabular-nums">{unit.achievements.excellent}</td>
                    <td className="py-2 px-1.5 text-center font-bold text-blue-500 text-[11px] tabular-nums">{unit.achievements.good}</td>
                    <td className="py-2 px-1.5 text-center font-bold text-slate-400 text-[11px] tabular-nums">{unit.achievements.average}</td>
                    <td className="py-2 px-2 text-center">
                       <span className={cn(
                        "inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-lg font-bold text-[9px] transition-all", 
                        unit.outstanding > 0 ? "bg-amber-100 text-amber-600 border border-amber-200" : "text-slate-100"
                        )}>
                          {unit.outstanding}
                       </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                       <span className={cn(
                        "inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-lg font-bold text-[9px] transition-all", 
                        unit.graduate > 0 ? "bg-blue-50 text-accent border border-blue-100" : "text-slate-100"
                        )}>
                          {unit.graduate}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors">
                  <td className="py-3 px-4 border-r border-white/5 text-center">
                    <Activity size={14} className="text-accent mx-auto animate-pulse" />
                  </td>
                  <td className="py-3 px-4 border-r border-white/5 relative overflow-hidden">
                    <div className="relative z-10">
                      <span className="uppercase tracking-[0.2em] text-[6px] block text-accent/80 mb-0.5 font-black">Cấp độ hệ thống</span>
                      <span className="text-[11px] font-black tracking-tight">TỔNG TOÀN ĐOÀN</span>
                    </div>
                  </td>
                   <td className="py-3 px-1.5 text-center border-r border-white/5 text-[11px] font-black text-white tabular-nums">{totalStats.total}</td>
                  <td className="py-3 px-1.5 text-center border-r border-white/5 text-[11px] font-bold text-blue-400 tabular-nums">{totalStats.males}</td>
                  <td className="py-3 px-1.5 text-center border-r border-white/5 text-[11px] font-bold text-rose-400 tabular-nums">{totalStats.females}</td>
                  <td className="py-3 px-1.5 text-center border-r border-white/5 text-[11px] font-bold text-slate-400 tabular-nums">{totalStats.kinh}</td>
                  <td className="py-3 px-1.5 text-center border-r border-white/5 text-[11px] font-bold text-emerald-400 tabular-nums">{totalStats.others}</td>
                  <td className="py-3 px-1.5 text-center border-r border-white/5 text-[11px] font-bold text-teal-400 tabular-nums">{totalStats.religious}</td>
                  <td className="py-3 px-1.5 text-center border-r border-white/5 text-[11px] font-bold text-slate-500 tabular-nums">{totalStats.noReligion}</td>
                  <td className="py-3 px-1.5 text-center border-r border-white/5 text-[11px] font-bold text-indigo-400 tabular-nums">{totalStats.active}</td>
                  <td className="py-3 px-1.5 text-center border-r border-white/5 text-[11px] font-bold text-slate-500 tabular-nums">{totalStats.moved}</td>
                  <td className="py-3 px-1.5 text-center border-r border-white/5 text-[11px] font-bold text-slate-500 tabular-nums">{totalStats.left}</td>
                  <td className="py-3 px-1.5 text-center border-r border-white/5 text-[11px] font-bold text-emerald-400 tabular-nums">{totalStats.excellent}</td>
                  <td className="py-3 px-1.5 text-center border-r border-white/5 text-[11px] font-bold text-blue-400 tabular-nums">{totalStats.good}</td>
                  <td className="py-3 px-1.5 text-center border-r border-white/5 text-[11px] font-bold text-slate-400 tabular-nums">{totalStats.average}</td>
                  <td className="py-3 px-2 text-[11px] text-center font-black text-accent border-r border-white/5 bg-accent/5 tabular-nums">{totalStats.outstanding}</td>
                  <td className="py-3 px-2 text-[11px] text-center font-black text-blue-400 bg-blue-400/5 tabular-nums">{totalStats.graduate}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
