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
      const outstanding = unitMembers.filter(m => m.isOutstanding).length;
      const active = unitMembers.filter(m => m.status === "Đang sinh hoạt").length;
      const moved = unitMembers.filter(m => m.status === "Đã chuyển sinh hoạt").length;
      const left = unitMembers.filter(m => m.status === "Đã trưởng thành").length;
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

  const totalStats = useMemo(() => {
    return unitTableStats.reduce((acc, unit) => {
      acc.total += unit.total;
      acc.males += unit.males;
      acc.females += unit.females;
      acc.kinh += unit.ethnic.kinh;
      acc.others += unit.ethnic.others;
      acc.active += unit.status.active;
      acc.moved += unit.status.moved;
      acc.left += unit.status.left;
      acc.excellent += unit.achievements.excellent;
      acc.good += unit.achievements.good;
      acc.average += unit.achievements.average;
      acc.outstanding += unit.outstanding;
      return acc;
    }, {
      total: 0, males: 0, females: 0, kinh: 0, others: 0,
      active: 0, moved: 0, left: 0,
      excellent: 0, good: 0, average: 0,
      outstanding: 0
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-4xl font-bold text-slate-900 flex items-center gap-4 tracking-tight">
            <div className="p-4 bg-accent/10 rounded-2xl text-accent">
              <BarChart3 size={32} />
            </div>
            Thống kê số liệu
          </h2>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-2 font-black ml-20">
            Tổng hợp dữ liệu {selectedUnitName}
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
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
            className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:border-accent text-slate-700 font-bold text-xs uppercase tracking-widest"
          >
            <Download size={18} className="text-accent" />
            Xuất Excel
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <motion.div 
          whileHover={{ y: -5 }}
          className="lg:col-span-2 bg-gradient-to-br from-accent to-blue-600 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden text-white"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[100px] -mr-48 -mt-48 rounded-full" />
          <div className="relative flex flex-col md:flex-row justify-between items-center gap-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Star size={24} className="text-yellow-300 fill-yellow-300" />
                <span className="text-xs uppercase tracking-[0.3em] font-black text-white/80">Danh hiệu vinh dự</span>
              </div>
              <h2 className="text-5xl font-black tracking-tight mb-4">Đoàn viên Tiêu biểu</h2>
              <p className="text-white/70 max-w-lg leading-relaxed font-medium">Những cá nhân xuất sắc có thành tích vượt trội và đóng góp tích cực cho phong trào Thanh niên cơ sở.</p>
            </div>
            <div className="flex items-center gap-10 bg-white/10 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/20 shadow-2xl">
              <div className="text-center">
                <span className="text-[10px] uppercase tracking-widest text-white/50 font-black block mb-2">Số lượng</span>
                <span className="text-6xl font-black leading-none">{stats?.outstandingCount}</span>
              </div>
              <div className="w-px h-16 bg-white/20" />
              <div className="text-center">
                <span className="text-[10px] uppercase tracking-widest text-white/50 font-black block mb-2">Tỷ lệ</span>
                <span className="text-4xl font-bold">{((stats?.outstandingCount || 0) / (members.length || 1) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div className="bg-white border border-slate-100 p-10 rounded-[3rem] shadow-xl shadow-slate-200/50">
          <h3 className="text-xs uppercase tracking-widest text-slate-400 font-black mb-8 flex items-center gap-3">
            <PieChartIcon className="text-accent" size={16} /> Cơ cấu giới tính
          </h3>
          <div className="h-64 mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats?.genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {stats?.genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '1.5rem', border:'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {stats?.genderData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-sm font-bold text-slate-600 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}} /> {item.name}
                </span>
                <span className="text-lg font-black text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="bg-white border border-slate-100 p-10 rounded-[3rem] shadow-xl shadow-slate-200/50">
          <h3 className="text-xs uppercase tracking-widest text-slate-400 font-black mb-8 flex items-center gap-3">
            <Activity className="text-accent" size={16} /> Tình trạng sinh hoạt
          </h3>
          <div className="h-64 mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.statusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8', fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8', fontWeight: 600}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1.5rem', border:'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {stats?.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {stats?.statusData.slice(0, 2).map((item, i) => (
              <div key={item.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-sm font-bold text-slate-600">{item.name}</span>
                <span className="text-lg font-black text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="bg-white border border-slate-100 p-10 rounded-[3rem] shadow-xl shadow-slate-200/50">
          <h3 className="text-xs uppercase tracking-widest text-slate-400 font-black mb-8 flex items-center gap-3">
            <Users className="text-accent" size={16} /> Cơ cấu dân tộc
          </h3>
          <div className="h-64 mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.ethnicData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8', fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8', fontWeight: 600}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1.5rem', border:'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {stats?.ethnicData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats?.ethnicData.slice(0, 4).map((item, i) => (
              <div key={item.name} className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[(i + 2) % COLORS.length]}} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="bg-white border border-slate-100 p-10 rounded-[3rem] shadow-xl shadow-slate-200/50">
          <h3 className="text-xs uppercase tracking-widest text-slate-400 font-black mb-8 flex items-center gap-3">
            <Star className="text-accent" size={16} /> Xếp loại đoàn viên
          </h3>
          <div className="h-64 mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.achievementData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8', fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8', fontWeight: 600}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1.5rem', border:'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {stats?.achievementData.map((_, i) => <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats?.achievementData.map((item, i) => (
              <div key={item.name} className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[(i + 4) % COLORS.length]}} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {selectedUnitId === "all" && (
          <motion.div className="lg:col-span-2 bg-white border border-slate-100 p-10 rounded-[3rem] shadow-xl shadow-slate-200/50">
            <h3 className="text-xs uppercase tracking-widest text-slate-400 font-black mb-8 flex items-center gap-3">
              <Building2 className="text-accent" size={16} /> Quy mô cơ sở (Thành viên/Đơn vị)
            </h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.unitData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8', fontWeight: 600}} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8', fontWeight: 600}} width={150} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1.5rem', border:'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={30}>
                    {stats?.unitData.map((_, i) => <Cell key={i} fill={COLORS[0]} fillOpacity={1 - (i * 0.1)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[3.5rem] shadow-2xl overflow-hidden mt-10">
          <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Thống kê chi tiết đơn vị</h3>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">Dữ liệu thời gian thực từ cơ sở dữ liệu đoàn viên</p>
            </div>
            <div className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-accent text-sm shadow-sm">{units.length} Đơn vị</div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse border-spacing-0 min-w-[1200px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-500 font-black bg-slate-100/80 border-b border-slate-200">
                  <th className="py-6 px-8 border-r border-slate-200" rowSpan={2}>STT</th>
                  <th className="py-6 px-8 border-r border-slate-200 min-w-[300px]" rowSpan={2}>Tên đơn vị</th>
                  <th className="py-4 px-4 text-center border-r border-slate-200 bg-blue-100/50 text-blue-700" colSpan={3}>Cơ bản</th>
                  <th className="py-4 px-4 text-center border-r border-slate-200 bg-emerald-100/50 text-emerald-700" colSpan={2}>Dân tộc</th>
                  <th className="py-4 px-4 text-center border-r border-slate-200 bg-purple-100/50 text-purple-700" colSpan={3}>Trạng thái</th>
                  <th className="py-4 px-4 text-center border-r border-slate-200 bg-amber-100/50 text-amber-700" colSpan={3}>Xếp loại</th>
                  <th className="py-6 px-8 text-center text-slate-700" rowSpan={2}>Tiêu biểu</th>
                </tr>
                <tr className="text-[9px] uppercase tracking-widest text-slate-400 font-black bg-slate-50/80 border-b border-slate-200">
                  <th className="py-3 px-4 text-center border-r border-slate-200 bg-blue-50/50">Tổng</th>
                  <th className="py-3 px-4 text-center border-r border-slate-200 bg-blue-50/50">Nam</th>
                  <th className="py-3 px-4 text-center border-r border-slate-200 bg-blue-50/50">Nữ</th>
                  <th className="py-3 px-4 text-center border-r border-slate-200 bg-emerald-50/50">Kinh</th>
                  <th className="py-3 px-4 text-center border-r border-slate-200 bg-emerald-50/50">Khác</th>
                  <th className="py-3 px-4 text-center border-r border-slate-200 bg-purple-50/50">Đang SH</th>
                  <th className="py-3 px-4 text-center border-r border-slate-200 bg-purple-50/50">Chuyển</th>
                  <th className="py-3 px-4 text-center border-r border-slate-200 bg-purple-50/50">T. Thành</th>
                  <th className="py-3 px-4 text-center border-r border-slate-200 bg-amber-50/50">X. Sắc</th>
                  <th className="py-3 px-4 text-center border-r border-slate-200 bg-amber-50/50">Khá</th>
                  <th className="py-3 px-4 text-center border-r border-slate-200 bg-amber-50/50">T. Bình</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unitTableStats.map((unit, index) => (
                  <tr key={unit.id} className="hover:bg-accent/[0.02] transition-colors group">
                    <td className="py-6 px-8 text-slate-300 font-bold text-sm tracking-widest border-r border-slate-100">{String(index + 1).padStart(2, '0')}</td>
                    <td className="py-6 px-8 border-r border-slate-100">
                       <span className="text-slate-900 font-black text-sm group-hover:text-accent transition-colors block leading-tight">{unit.name}</span>
                       <div className="w-24 h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-accent" style={{width: `${(unit.total / (totalStats.total || 1)) * 100}%`}} />
                       </div>
                    </td>
                    <td className="py-6 px-4 text-center font-black text-slate-700 border-r border-slate-100 bg-blue-50/10">{unit.total}</td>
                    <td className="py-6 px-4 text-center font-bold text-blue-500 border-r border-slate-100 bg-blue-50/10">{unit.males}</td>
                    <td className="py-6 px-4 text-center font-bold text-rose-500 border-r border-slate-100 bg-blue-50/10">{unit.females}</td>
                    <td className="py-6 px-4 text-center font-bold text-slate-600 border-r border-slate-100 bg-emerald-50/10">{unit.ethnic.kinh}</td>
                    <td className="py-6 px-4 text-center font-bold text-teal-500 border-r border-slate-100 bg-emerald-50/10">{unit.ethnic.others}</td>
                    <td className="py-6 px-4 text-center font-bold text-indigo-500 border-r border-slate-100 bg-purple-50/10">{unit.status.active}</td>
                    <td className="py-6 px-4 text-center font-bold text-slate-400 border-r border-slate-100 bg-purple-50/10">{unit.status.moved}</td>
                    <td className="py-6 px-4 text-center font-bold text-slate-400 border-r border-slate-100 bg-purple-50/10">{unit.status.left}</td>
                    <td className="py-6 px-4 text-center font-black text-emerald-600 border-r border-slate-100 bg-amber-50/10">{unit.achievements.excellent}</td>
                    <td className="py-6 px-4 text-center font-bold text-blue-500 border-r border-slate-100 bg-amber-50/10">{unit.achievements.good}</td>
                    <td className="py-6 px-4 text-center font-bold text-slate-500 border-r border-slate-100 bg-amber-50/10">{unit.achievements.average}</td>
                    <td className="py-6 px-8 text-center bg-slate-50/30">
                       <span className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm", unit.outstanding > 0 ? "bg-amber-100 text-amber-600 border border-amber-200 shadow-sm" : "text-slate-200")}>
                         {unit.outstanding}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-black hover:bg-slate-800 transition-colors">
                  <td className="py-10 px-8 border-r border-white/10 text-center">
                    <div className="relative inline-block">
                      <Activity size={32} className="text-accent animate-pulse" />
                      <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full" />
                    </div>
                  </td>
                  <td className="py-10 px-8 border-r border-white/10">
                    <span className="uppercase tracking-[0.3em] text-[10px] block text-accent mb-2 font-black">Tổng kết toàn hệ thống</span>
                    <span className="text-xl tracking-tight font-black">DỮ LIỆU THỰC TẾ</span>
                  </td>
                  <td className="py-10 px-4 text-center border-r border-white/5 text-2xl font-black text-white">{totalStats.total}</td>
                  <td className="py-10 px-4 text-center border-r border-white/5 text-2xl font-black text-white">{totalStats.males}</td>
                  <td className="py-10 px-4 text-center border-r border-white/5 text-2xl font-black text-white">{totalStats.females}</td>
                  <td className="py-10 px-4 text-center border-r border-white/5 text-2xl font-black text-white">{totalStats.kinh}</td>
                  <td className="py-10 px-4 text-center border-r border-white/5 text-2xl font-black text-white">{totalStats.others}</td>
                  <td className="py-10 px-4 text-center border-r border-white/5 text-2xl font-black text-white">{totalStats.active}</td>
                  <td className="py-10 px-4 text-center border-r border-white/5 text-2xl font-black text-white">{totalStats.moved}</td>
                  <td className="py-10 px-4 text-center border-r border-white/5 text-2xl font-black text-white">{totalStats.left}</td>
                  <td className="py-10 px-4 text-center border-r border-white/5 text-2xl font-black text-white">{totalStats.excellent}</td>
                  <td className="py-10 px-4 text-center border-r border-white/5 text-2xl font-black text-white">{totalStats.good}</td>
                  <td className="py-10 px-4 text-center border-r border-white/5 text-2xl font-black text-white">{totalStats.average}</td>
                  <td className="py-10 px-8 text-center text-4xl font-black text-white bg-accent/20 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{totalStats.outstanding}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
