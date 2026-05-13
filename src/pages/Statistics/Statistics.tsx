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
      const others = unitMembers.filter(m => m.ethnic?.toLowerCase() !== 'kinh' && m.ethnic).length;
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

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[3.5rem] shadow-2xl overflow-hidden mt-10">
          <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Thống kê chi tiết đơn vị</h3>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">Dữ liệu thời gian thực từ cơ sở dữ liệu đoàn viên</p>
            </div>
            <div className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-accent text-sm shadow-sm">{units.length} Đơn vị</div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-400 font-black bg-slate-50/80 border-b border-slate-100">
                  <th className="py-6 px-8">STT</th>
                  <th className="py-6 px-8">Tên đơn vị</th>
                  <th className="py-6 px-8 text-center">Tổng số</th>
                  <th className="py-6 px-8 text-center">Nam/Nữ Ratio</th>
                  <th className="py-6 px-8 text-center">Tiêu biểu</th>
                  <th className="py-6 px-8 text-center">Xếp loại X.Sắc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {unitTableStats.map((unit, index) => (
                  <tr key={unit.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-6 px-8 text-slate-300 font-bold text-sm tracking-widest">{String(index + 1).padStart(2, '0')}</td>
                    <td className="py-6 px-8">
                       <span className="text-slate-900 font-black text-lg group-hover:text-accent transition-colors">{unit.name}</span>
                    </td>
                    <td className="py-6 px-8 text-center">
                       <span className="px-5 py-2 bg-slate-100 rounded-xl font-black text-slate-700">{unit.total}</span>
                    </td>
                    <td className="py-6 px-8 text-center">
                       <div className="flex items-center justify-center gap-2">
                          <span className="text-blue-500 font-bold">{unit.males}</span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                             <div className="h-full bg-blue-500" style={{width: `${(unit.males/(unit.total||1))*100}%`}} />
                             <div className="h-full bg-rose-500" style={{width: `${(unit.females/(unit.total||1))*100}%`}} />
                          </div>
                          <span className="text-rose-500 font-bold">{unit.females}</span>
                       </div>
                    </td>
                    <td className="py-6 px-8 text-center">
                       <span className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs", unit.outstanding > 0 ? "bg-amber-50 text-amber-600 border border-amber-100" : "text-slate-300")}>
                         <Star size={12} fill={unit.outstanding > 0 ? "currentColor" : "none"} /> {unit.outstanding}
                       </span>
                    </td>
                    <td className="py-6 px-8 text-center">
                       <span className={cn("px-4 py-2 rounded-xl font-black text-xs", unit.achievements.excellent > 0 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "text-slate-300")}>
                         {unit.achievements.excellent}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
