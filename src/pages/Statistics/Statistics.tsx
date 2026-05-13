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
    <div className="w-full pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6 sm:mb-8 lg:mb-12 text-center sm:text-left">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-full sm:w-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 flex items-center justify-center sm:justify-start gap-3 sm:gap-4 tracking-tighter leading-none mb-2">
            <div className="p-2 sm:p-3 lg:p-4 bg-accent/10 rounded-lg sm:rounded-xl lg:rounded-2xl text-accent shrink-0">
              <BarChart3 size={20} className="sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
            </div>
            Thống kê số liệu
          </h2>
          <p className="text-[7px] sm:text-[8px] lg:text-[10px] uppercase tracking-[0.2em] lg:tracking-widest text-slate-400 font-black ml-1 sm:ml-12 lg:ml-20">
            Tổng hợp dữ liệu {selectedUnitName}
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row items-center gap-4 lg:gap-6 w-full lg:w-auto">
          {!isSecretary && (
            <div className="flex items-center gap-4 w-full sm:w-auto">
               <CustomSelect 
                 value={selectedUnitId}
                 onChange={setSelectedUnitId}
                 options={unitOptions}
                 className="w-full sm:w-80"
               />
            </div>
          )}
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-3 px-6 lg:px-8 py-3 lg:py-4 bg-white border border-slate-200 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:border-accent text-slate-700 font-bold text-[10px] lg:text-xs uppercase tracking-widest w-full sm:w-auto"
          >
            <Download size={16} className="text-accent lg:w-4 lg:h-4" />
            Xuất Excel
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-10">
        <motion.div 
          whileHover={{ y: -5 }}
          className="sm:col-span-2 bg-gradient-to-br from-accent to-blue-600 p-6 sm:p-8 lg:p-12 rounded-[2rem] sm:rounded-[2.5rem] lg:rounded-[3.5rem] shadow-2xl relative overflow-hidden text-white"
        >
          <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 lg:w-96 lg:h-96 bg-white/10 blur-[60px] sm:blur-[80px] lg:blur-[100px] -mr-24 sm:-mr-32 lg:-mr-48 -mt-24 sm:-mt-32 lg:-mt-48 rounded-full" />
          <div className="relative flex flex-col md:flex-row justify-between items-center gap-6 lg:gap-12 text-center md:text-left">
            <div className="flex-1">
              <div className="flex items-center justify-center md:justify-start gap-2 sm:gap-3 mb-2 sm:mb-4 lg:mb-6">
                <Star size={16} className="text-yellow-300 fill-yellow-300 sm:w-5 sm:h-5" />
                <span className="text-[8px] sm:text-[10px] lg:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black text-white/80">Danh hiệu vinh dự</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-5xl font-black tracking-tight mb-2 sm:mb-4">Đoàn viên Tiêu biểu</h2>
              <p className="text-white/70 max-w-lg leading-relaxed font-medium text-xs sm:text-sm lg:text-base">Những cá nhân xuất sắc có thành tích vượt trội và đóng góp tích cực cho phong trào Thanh niên cơ sở.</p>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 lg:gap-10 bg-white/10 backdrop-blur-xl p-4 sm:p-6 lg:p-10 rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[2.5rem] border border-white/20 shadow-2xl shrink-0">
              <div className="text-center">
                <span className="text-[7px] sm:text-[8px] lg:text-[10px] uppercase tracking-widest text-white/50 font-black block mb-1 lg:mb-2">Số lượng</span>
                <span className="text-3xl sm:text-4xl lg:text-6xl font-black leading-none tabular-nums">{stats?.outstandingCount}</span>
              </div>
              <div className="w-px h-10 sm:h-12 lg:h-16 bg-white/20" />
              <div className="text-center">
                <span className="text-[7px] sm:text-[8px] lg:text-[10px] uppercase tracking-widest text-white/50 font-black block mb-1 lg:mb-2">Tỷ lệ</span>
                <span className="text-xl sm:text-2xl lg:text-4xl font-bold tabular-nums">{((stats?.outstandingCount || 0) / (members.length || 1) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div className="bg-white border border-slate-100 p-5 sm:p-8 lg:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] lg:rounded-[3rem] shadow-xl shadow-slate-200/50">
          <h3 className="text-[9px] sm:text-[10px] lg:text-xs uppercase tracking-widest text-slate-400 font-black mb-4 sm:mb-6 lg:mb-8 flex items-center gap-3">
            <PieChartIcon size={14} className="text-accent sm:w-4 sm:h-4" /> Cơ cấu giới tính
          </h3>
          <div className="h-48 sm:h-56 lg:h-64 mb-4 sm:mb-6 lg:mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats?.genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={window.innerWidth < 640 ? 50 : 60} outerRadius={window.innerWidth < 640 ? 70 : 80} paddingAngle={5}>
                  {stats?.genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '1rem', border:'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
            {stats?.genderData.map((item, i) => (
              <div key={item.name} className="flex flex-col sm:flex-row items-center sm:justify-between p-2.5 sm:p-3 lg:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 text-center sm:text-left gap-1 sm:gap-0">
                <span className="text-[10px] sm:text-xs lg:text-sm font-bold text-slate-600 flex items-center gap-1.5 sm:gap-2 lg:gap-3">
                   <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-3 lg:h-3 rounded-full shrink-0" style={{backgroundColor: COLORS[i % COLORS.length]}} /> {item.name}
                </span>
                <span className="text-sm sm:text-base lg:text-lg font-black text-slate-900 tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="bg-white border border-slate-100 p-5 sm:p-8 lg:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] lg:rounded-[3rem] shadow-xl shadow-slate-200/50">
          <h3 className="text-[9px] sm:text-[10px] lg:text-xs uppercase tracking-widest text-slate-400 font-black mb-4 sm:mb-6 lg:mb-8 flex items-center gap-3">
            <Activity size={14} className="text-accent sm:w-4 sm:h-4" /> Tình trạng sinh hoạt
          </h3>
          <div className="h-48 sm:h-56 lg:h-64 mb-4 sm:mb-6 lg:mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.statusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={window.innerWidth < 640 ? 8 : 10} tick={{fill: '#94a3b8', fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} fontSize={window.innerWidth < 640 ? 8 : 10} tick={{fill: '#94a3b8', fontWeight: 600}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1rem', border:'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {stats?.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
            {stats?.statusData.slice(0, 2).map((item, i) => (
              <div key={item.name} className="flex flex-col sm:flex-row items-center sm:justify-between p-2.5 sm:p-3 lg:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 text-center sm:text-left gap-1 sm:gap-0">
                <span className="text-[10px] sm:text-xs lg:text-sm font-bold text-slate-600 truncate w-full">{item.name}</span>
                <span className="text-sm sm:text-base lg:text-lg font-black text-slate-900 tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="bg-white border border-slate-100 p-5 sm:p-8 lg:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] lg:rounded-[3rem] shadow-xl shadow-slate-200/50">
          <h3 className="text-[9px] sm:text-[10px] lg:text-xs uppercase tracking-widest text-slate-400 font-black mb-4 sm:mb-6 lg:mb-8 flex items-center gap-3">
            <Users size={14} className="text-accent sm:w-4 sm:h-4" /> Cơ cấu dân tộc
          </h3>
          <div className="h-48 sm:h-56 lg:h-64 mb-4 sm:mb-6 lg:mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.ethnicData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={window.innerWidth < 640 ? 8 : 10} tick={{fill: '#94a3b8', fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} fontSize={window.innerWidth < 640 ? 8 : 10} tick={{fill: '#94a3b8', fontWeight: 600}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1rem', border:'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {stats?.ethnicData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {stats?.ethnicData.slice(0, 4).map((item, i) => (
              <div key={item.name} className="px-2.5 sm:px-4 py-1.5 lg:py-2 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-100 flex items-center gap-1.5 sm:gap-2">
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 lg:w-2 lg:h-2 rounded-full" style={{backgroundColor: COLORS[(i + 2) % COLORS.length]}} />
                <span className="text-[7px] sm:text-[8px] lg:text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="bg-white border border-slate-100 p-5 sm:p-8 lg:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] lg:rounded-[3rem] shadow-xl shadow-slate-200/50">
          <h3 className="text-[9px] sm:text-[10px] lg:text-xs uppercase tracking-widest text-slate-400 font-black mb-4 sm:mb-6 lg:mb-8 flex items-center gap-3">
            <Star size={14} className="text-accent sm:w-4 sm:h-4" /> Xếp loại đoàn viên
          </h3>
          <div className="h-48 sm:h-56 lg:h-64 mb-4 sm:mb-6 lg:mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.achievementData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={window.innerWidth < 640 ? 8 : 10} tick={{fill: '#94a3b8', fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} fontSize={window.innerWidth < 640 ? 8 : 10} tick={{fill: '#94a3b8', fontWeight: 600}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1rem', border:'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {stats?.achievementData.map((_, i) => <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {stats?.achievementData.map((item, i) => (
              <div key={item.name} className="px-2.5 sm:px-4 py-1.5 lg:py-2 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-100 flex items-center gap-1.5 sm:gap-2">
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 lg:w-2 lg:h-2 rounded-full" style={{backgroundColor: COLORS[(i + 4) % COLORS.length]}} />
                <span className="text-[7px] sm:text-[8px] lg:text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {selectedUnitId === "all" && (
          <motion.div className="sm:col-span-2 bg-white border border-slate-100 p-5 sm:p-8 lg:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] lg:rounded-[3rem] shadow-xl shadow-slate-200/50">
            <h3 className="text-[9px] sm:text-[10px] lg:text-xs uppercase tracking-widest text-slate-400 font-black mb-4 sm:mb-6 lg:mb-8 flex items-center gap-3">
              <Building2 size={14} className="text-accent sm:w-4 sm:h-4" /> Quy mô cơ sở (Thành viên/Đơn vị)
            </h3>
            <div className="h-64 sm:h-80 lg:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.unitData} layout="vertical" margin={{ left: window.innerWidth < 640 ? 30 : (window.innerWidth < 1024 ? 50 : 100) }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} fontSize={window.innerWidth < 640 ? 8 : 10} tick={{fill: '#94a3b8', fontWeight: 600}} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={window.innerWidth < 640 ? 8 : 10} tick={{fill: '#94a3b8', fontWeight: 600}} width={window.innerWidth < 640 ? 60 : (window.innerWidth < 1024 ? 100 : 150)} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1rem', border:'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={window.innerWidth < 640 ? 12 : (window.innerWidth < 1024 ? 20 : 30)}>
                    {stats?.unitData.map((_, i) => <Cell key={i} fill={COLORS[0]} fillOpacity={1 - (i * 0.1)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        <div className="sm:col-span-2 bg-white border border-slate-200 rounded-[2rem] sm:rounded-[2.5rem] lg:rounded-[3.5rem] shadow-2xl overflow-hidden mt-6 lg:mt-10">
          <div className="p-5 sm:p-8 lg:p-10 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 text-center sm:text-left">
            <div className="w-full sm:w-auto">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tighter">Chi tiết cơ sở</h3>
              <p className="text-[7px] sm:text-[8px] lg:text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mt-1">Dữ liệu hợp nhất toàn hệ thống</p>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
               <div className="px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl lg:rounded-2xl font-black text-slate-900 text-[10px] sm:text-xs lg:text-sm shadow-sm flex items-center justify-center gap-2 sm:gap-3 flex-1 sm:flex-initial">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-accent rounded-full animate-pulse" />
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
            
            <div className="overflow-x-auto no-scrollbar relative p-1 lg:p-0">
              <table className="w-full text-left border-collapse border-spacing-0 min-w-[900px] lg:min-w-[1000px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-black bg-white border-b border-slate-100">
                  <th className="py-5 px-6" rowSpan={2}>#</th>
                  <th className="py-5 px-6 min-w-[240px]" rowSpan={2}>Đơn vị chi đoàn</th>
                  <th className="py-3 px-3 text-center border-x border-slate-50 text-blue-600 bg-blue-50/20" colSpan={3}>Nhân khẩu học</th>
                  <th className="py-3 px-3 text-center border-x border-slate-50 text-emerald-600 bg-emerald-50/20" colSpan={2}>Dân tộc</th>
                  <th className="py-3 px-3 text-center border-x border-slate-50 text-teal-600 bg-teal-50/20" colSpan={2}>Tôn giáo</th>
                  <th className="py-3 px-3 text-center border-x border-slate-50 text-indigo-600 bg-indigo-50/20" colSpan={3}>Trạng thái hoạt động</th>
                  <th className="py-3 px-3 text-center border-x border-slate-50 text-amber-600 bg-amber-50/20" colSpan={3}>Xếp loại chất lượng</th>
                  <th className="py-5 px-4 text-center text-slate-900 border-l border-slate-50" rowSpan={2}>Tiêu biểu</th>
                  <th className="py-5 px-4 text-center text-slate-900" rowSpan={2}>ĐH+</th>
                </tr>
                <tr className="text-[9px] uppercase tracking-widest text-slate-400 font-black bg-white border-b border-slate-100">
                  <th className="py-3 px-3 text-center border-x border-slate-50">Tổng</th>
                  <th className="py-3 px-3 text-center border-x border-slate-50">Nam</th>
                  <th className="py-3 px-3 text-center border-x border-slate-50">Nữ</th>
                  <th className="py-3 px-3 text-center border-x border-slate-50">Kinh</th>
                  <th className="py-3 px-3 text-center border-x border-slate-50">Khác</th>
                  <th className="py-3 px-3 text-center border-x border-slate-50">Có</th>
                  <th className="py-3 px-3 text-center border-x border-slate-50">Không</th>
                  <th className="py-3 px-3 text-center border-x border-slate-50">Đang SH</th>
                  <th className="py-3 px-3 text-center border-x border-slate-50">Chuyển</th>
                  <th className="py-3 px-3 text-center border-x border-slate-50">T. Thành</th>
                  <th className="py-3 px-3 text-center border-x border-slate-50">X. Sắc</th>
                  <th className="py-3 px-3 text-center border-x border-slate-50">Khá</th>
                  <th className="py-3 px-3 text-center border-x border-slate-50">T. Bình</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {unitTableStats.map((unit, index) => (
                  <tr key={unit.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="py-4 px-6 text-slate-300 font-bold text-xs tabular-nums">{String(index + 1).padStart(2, '0')}</td>
                    <td className="py-4 px-6">
                       <span className="text-slate-900 font-bold text-[13px] group-hover:text-accent transition-colors block tracking-tight">{unit.name}</span>
                       <div className="w-20 h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(unit.total / (totalStats.total || 1)) * 100}%` }}
                            className="h-full bg-accent" 
                          />
                       </div>
                    </td>
                    <td className="py-4 px-3 text-center font-bold text-slate-900 text-[13px] tabular-nums">{unit.total}</td>
                    <td className="py-4 px-3 text-center font-bold text-blue-600 text-[13px] tabular-nums">{unit.males}</td>
                    <td className="py-4 px-3 text-center font-bold text-rose-500 text-[13px] tabular-nums">{unit.females}</td>
                    <td className="py-4 px-3 text-center font-bold text-slate-500 text-[13px] tabular-nums">{unit.ethnic.kinh}</td>
                    <td className="py-4 px-3 text-center font-bold text-emerald-500 text-[13px] tabular-nums">{unit.ethnic.others}</td>
                    <td className="py-4 px-3 text-center font-bold text-teal-600 text-[13px] tabular-nums">{unit.religion.religious}</td>
                    <td className="py-4 px-3 text-center font-bold text-slate-300 text-[13px] tabular-nums">{unit.religion.noReligion}</td>
                    <td className="py-4 px-3 text-center font-bold text-indigo-500 text-[13px] tabular-nums">{unit.status.active}</td>
                    <td className="py-4 px-3 text-center font-bold text-slate-300 text-[13px] tabular-nums">{unit.status.moved}</td>
                    <td className="py-4 px-3 text-center font-bold text-slate-300 text-[13px] tabular-nums">{unit.status.left}</td>
                    <td className="py-4 px-3 text-center font-bold text-emerald-600 text-[13px] tabular-nums">{unit.achievements.excellent}</td>
                    <td className="py-4 px-3 text-center font-bold text-blue-500 text-[13px] tabular-nums">{unit.achievements.good}</td>
                    <td className="py-4 px-3 text-center font-bold text-slate-400 text-[13px] tabular-nums">{unit.achievements.average}</td>
                    <td className="py-4 px-4 text-center">
                       <span className={cn(
                        "inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-lg font-bold text-xs transition-all", 
                        unit.outstanding > 0 ? "bg-amber-100 text-amber-600 border border-amber-200" : "text-slate-200"
                        )}>
                          {unit.outstanding}
                       </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                       <span className={cn(
                        "inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-lg font-bold text-xs transition-all", 
                        unit.graduate > 0 ? "bg-blue-100 text-blue-600 border border-blue-200" : "text-slate-200"
                        )}>
                          {unit.graduate}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors">
                  <td className="py-6 px-6 border-r border-white/5 text-center">
                    <Activity size={24} className="text-accent mx-auto animate-pulse" />
                  </td>
                  <td className="py-6 px-6 border-r border-white/5 relative overflow-hidden">
                    <div className="relative z-10">
                      <span className="uppercase tracking-[0.3em] text-[8px] block text-accent/80 mb-1 font-black">Cấp độ hệ thống</span>
                      <span className="text-sm font-black tracking-tight">TỔNG TOÀN ĐOÀN</span>
                    </div>
                  </td>
                   <td className="py-6 px-3 text-center border-r border-white/5 text-[13px] font-black text-white tabular-nums">{totalStats.total}</td>
                  <td className="py-6 px-3 text-center border-r border-white/5 text-[13px] font-bold text-blue-400 tabular-nums">{totalStats.males}</td>
                  <td className="py-6 px-3 text-center border-r border-white/5 text-[13px] font-bold text-rose-400 tabular-nums">{totalStats.females}</td>
                  <td className="py-6 px-3 text-center border-r border-white/5 text-[13px] font-bold text-slate-400 tabular-nums">{totalStats.kinh}</td>
                  <td className="py-6 px-3 text-center border-r border-white/5 text-[13px] font-bold text-emerald-400 tabular-nums">{totalStats.others}</td>
                  <td className="py-6 px-3 text-center border-r border-white/5 text-[13px] font-bold text-teal-400 tabular-nums">{totalStats.religious}</td>
                  <td className="py-6 px-3 text-center border-r border-white/5 text-[13px] font-bold text-slate-500 tabular-nums">{totalStats.noReligion}</td>
                  <td className="py-6 px-3 text-center border-r border-white/5 text-[13px] font-bold text-indigo-400 tabular-nums">{totalStats.active}</td>
                  <td className="py-6 px-3 text-center border-r border-white/5 text-[13px] font-bold text-slate-500 tabular-nums">{totalStats.moved}</td>
                  <td className="py-6 px-3 text-center border-r border-white/5 text-[13px] font-bold text-slate-500 tabular-nums">{totalStats.left}</td>
                  <td className="py-6 px-3 text-center border-r border-white/5 text-[13px] font-bold text-emerald-400 tabular-nums">{totalStats.excellent}</td>
                  <td className="py-6 px-3 text-center border-r border-white/5 text-[13px] font-bold text-blue-400 tabular-nums">{totalStats.good}</td>
                  <td className="py-6 px-3 text-center border-r border-white/5 text-[13px] font-bold text-slate-400 tabular-nums">{totalStats.average}</td>
                  <td className="py-6 px-4 text-center text-sm font-black text-accent border-r border-white/5 bg-accent/5 tabular-nums">{totalStats.outstanding}</td>
                  <td className="py-6 px-4 text-center text-sm font-black text-blue-400 bg-blue-400/5 tabular-nums">{totalStats.graduate}</td>
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
