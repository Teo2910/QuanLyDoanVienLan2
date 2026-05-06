import React, { useEffect, useState, useMemo } from "react";
import { dataService } from "../../services/dataService";
import { Member, Unit } from "../../types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, BarChart3, PieChart as PieChartIcon, Activity, Star, Calendar, Building2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLiveSync } from "../../hooks/useLiveSync";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

const COLORS = ['#7aa2f7', '#bb9af7', '#7dcfff', '#9ece6a', '#e0af68', '#f7768e'];

export const Statistics: React.FC = () => {
  const { profile, isSecretary } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    Promise.all([
      dataService.getMembers(),
      dataService.getUnits()
    ]).then(([mData, uData]) => {
      const filteredMembers = isSecretary && profile?.unitId 
        ? mData.filter(m => m.unitId === profile.unitId)
        : mData;

      setMembers(filteredMembers);
      setUnits(uData);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [profile?.unitId]);

  useLiveSync("members:changed", loadData);
  useLiveSync("units:changed", loadData);

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

    // Unit stats (only relevant for admin)
    const unitMap = members.reduce((acc, m) => {
      const unit = units.find(u => u.id === m.unitId)?.name || "N/A";
      acc[unit] = (acc[unit] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const unitData = Object.entries(unitMap)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => (b.value as number) - (a.value as number));

    return { genderData, ethnicData, statusData, achievementData, unitData };
  }, [members, units]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-serif text-white flex items-center gap-4 italic tracking-tight">
            <BarChart3 className="text-accent" size={36} />
            Thống kê số liệu
          </h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mt-2 font-bold ml-12">
            Tổng hợp dữ liệu {isSecretary ? `tại ${units.find(u => u.id === profile?.unitId)?.name || 'đơn vị'}` : 'toàn hệ thống'}
          </p>
        </div>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface/50 border border-white/5 p-8 rounded-3xl backdrop-blur-sm shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6">
            <Users size={24} />
          </div>
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Tổng cộng</p>
          <h3 className="text-4xl font-light text-white tracking-tighter italic">{members.length}</h3>
          <p className="text-[9px] text-white/20 uppercase mt-2">Đoàn viên</p>
        </div>

        <div className="bg-surface/50 border border-white/5 p-8 rounded-3xl backdrop-blur-sm shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center mb-6">
            <Star size={24} />
          </div>
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Tiêu biểu</p>
          <h3 className="text-4xl font-light text-white tracking-tighter italic">{members.filter(m => m.isOutstanding).length}</h3>
          <p className="text-[9px] text-white/20 uppercase mt-2">Gương mặt tiêu biểu</p>
        </div>

        <div className="bg-surface/50 border border-white/5 p-8 rounded-3xl backdrop-blur-sm shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6">
            <Users size={24} />
          </div>
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Dân tộc Kinh</p>
          <h3 className="text-4xl font-light text-white tracking-tighter italic">
            {members.filter(m => m.ethnic?.toLowerCase() === 'kinh').length}
          </h3>
          <p className="text-[9px] text-white/20 uppercase mt-2">Trong tổng số đoàn viên</p>
        </div>

        <div className="bg-surface/50 border border-white/5 p-8 rounded-3xl backdrop-blur-sm shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mb-6">
            <Building2 size={24} />
          </div>
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Số chi đoàn</p>
          <h3 className="text-4xl font-light text-white tracking-tighter italic">{isSecretary ? 1 : units.length}</h3>
          <p className="text-[9px] text-white/20 uppercase mt-2">Đang hoạt động</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Gender Breakdown */}
        <div className="bg-surface/40 border border-white/5 p-10 rounded-[2.5rem] shadow-xl backdrop-blur-sm">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3 mb-8">
            <PieChartIcon className="text-accent" size={16} />
            Cơ cấu giới tính
          </h3>
          <div className="h-64 mt-4">
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
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-surface/40 border border-white/5 p-10 rounded-[2.5rem] shadow-xl backdrop-blur-sm">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3 mb-8">
            <Activity className="text-accent" size={16} />
            Tình trạng sinh hoạt
          </h3>
          <div className="h-64 mt-4">
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
        </div>

        {/* Achievement Breakdown */}
        <div className="bg-surface/40 border border-white/5 p-10 rounded-[2.5rem] shadow-xl backdrop-blur-sm">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3 mb-8">
            <Star className="text-accent" size={16} />
            Xếp loại đoàn viên
          </h3>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.achievementData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
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
        </div>

        {/* Top Ethnic Groups */}
        <div className="bg-surface/40 border border-white/5 p-10 rounded-[2.5rem] shadow-xl backdrop-blur-sm">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3 mb-8">
            <Users className="text-accent" size={16} />
            Thống kê dân tộc
          </h3>
          <div className="space-y-6 overflow-y-auto max-h-64 custom-scrollbar pr-4">
            {stats?.ethnicData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/40">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-white font-medium">{item.name}</span>
                    <span className="text-white/40">{item.value} người</span>
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

        {/* Member distribution by Unit (Only for Admin) */}
        {!isSecretary && (
          <div className="lg:col-span-2 bg-surface/40 border border-white/5 p-10 rounded-[2.5rem] shadow-xl backdrop-blur-sm">
            <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3 mb-8">
              <Building2 className="text-accent" size={16} />
              Phân bổ theo Chi đoàn
            </h3>
            <div className="h-80 mt-4">
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
          </div>
        )}
      </div>
    </div>
  );
};
