import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Users, Building2, Calendar, Star, Activity, TrendingUp, Award, PieChart as PieChartIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { dataService } from "../../services/dataService";
import { useAuth } from "../../contexts/AuthContext";
import { useLiveSync } from "../../hooks/useLiveSync";
import { Member, Activity as ActivityType } from "../../types";
import { cn } from "../../lib/utils";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const Dashboard = () => {
  const { profile } = useAuth();
  const [units, setUnits] = useState<{ id: string, name: string }[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    Promise.all([
      dataService.getUnits(),
      dataService.getMembers(),
      dataService.getActivities()
    ]).then(([uData, mData, aData]) => {
      const filteredMembers = profile?.isSecretary && profile?.unitId
        ? mData.filter(m => m.unitId === profile.unitId)
        : mData;

      setUnits(uData);
      setMembers(filteredMembers);
      setActivities(aData);
      setLoading(false);
    });
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useLiveSync("units:changed", loadData);
  useLiveSync("members:changed", loadData);
  useLiveSync("activities:changed", loadData);

  const stats = useMemo(() => {
    const outstanding = members.filter(m => m.isOutstanding).length;
    const upcomingActivities = activities
      .filter(a => new Date(a.date).getTime() >= Date.now())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Member growth data (last 6 months - mocked based on createdAt)
    const monthNames = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];
    const now = new Date();
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(now.getMonth() - (5 - i));
      const month = d.getMonth();
      const year = d.getFullYear();
      const count = members.filter(m => {
        const cDate = new Date(m.createdAt || 0);
        return cDate.getMonth() === month && cDate.getFullYear() === year;
      }).length;
      return { name: monthNames[month], count };
    });

    // Units distribution
    const unitDist = units.slice(0, 5).map(u => ({
      name: u.name.replace("Chi đoàn ", ""),
      value: members.filter(m => m.unitId === u.id).length
    })).sort((a, b) => b.value - a.value);

    // Ranking distribution
    const rankingDist = members.reduce((acc, m) => {
      const level = m.achievementLevel || "Chưa xếp loại";
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const rankingData = Object.entries(rankingDist).map(([name, value]) => ({ name, value }));

    return {
      totalUnits: units.length,
      totalMembers: members.length,
      outstandingCount: outstanding,
      upcomingCount: upcomingActivities.length,
      recentActivities: upcomingActivities.slice(0, 4),
      recentMembers: [...members].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 4),
      growthData: last6Months,
      unitData: unitDist,
      rankingData
    };
  }, [members, units, activities]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest animate-pulse">Khởi tạo dữ liệu...</p>
      </div>
    );
  }

  const cards = [
    { label: "Tổng số chi đoàn", value: stats.totalUnits, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Tổng số đoàn viên", value: stats.totalMembers, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Hoạt động sắp tới", value: stats.upcomingCount, icon: Calendar, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Đoàn viên tiêu biểu", value: stats.outstandingCount, icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Header section */}
      <div className="mb-10 sm:mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tighter leading-[1.1] mb-3">
            Xin chào, <span className="text-accent">{profile?.fullName || (profile?.role === 'admin' ? 'Quản trị viên' : 'Bí thư')}</span>
          </h2>
          <p className="text-slate-400 text-[8px] sm:text-[10px] uppercase tracking-[0.3em] font-black flex items-center gap-2">
             <div className="w-8 h-px bg-accent/30" /> Trung tâm điều hành SMART VNPT
          </p>
        </motion.div>
        
        <div className="bg-white px-6 py-4 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex items-center gap-4">
           <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <Activity size={20} className="animate-pulse" />
           </div>
           <div>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest leading-none mb-1">Hệ thống</p>
              <p className="text-slate-900 font-black text-sm tabular-nums">Đang vận hành ổn định</p>
           </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {cards.map((card, index) => (
          <motion.div 
            key={card.label} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white border border-slate-100 p-8 rounded-[3rem] flex flex-col justify-between hover:shadow-2xl hover:shadow-slate-200/60 transition-all group shadow-sm relative overflow-hidden"
          >
            <div className={cn("w-16 h-16 rounded-[1.8rem] flex items-center justify-center mb-10 transition-all duration-500 group-hover:scale-110 shadow-lg", card.bg, card.color)}>
              <card.icon size={28} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2 opacity-60">{card.label}</p>
              <h3 className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums">{card.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 text-blue-50">
        {/* Ranking Chart */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 bg-white border border-slate-100 p-8 sm:p-10 rounded-[3.5rem] shadow-sm flex flex-col md:flex-row items-center justify-between gap-10"
        >
          <div className="md:w-1/2">
            <div className="mb-6">
              <h3 className="text-xs uppercase tracking-widest text-slate-400 font-black mb-1 flex items-center gap-2">
                <Award size={14} className="text-amber-500" /> Chất lượng đoàn viên
              </h3>
              <p className="text-slate-300 text-[10px] uppercase font-black tracking-widest">Phân bổ xếp loại</p>
            </div>
            
            <div className="space-y-4">
              {stats.rankingData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}} />
                    <span className="text-sm font-bold text-slate-600">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                        <div 
                          className="h-full rounded-full" 
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                            width: `${(item.value / stats.totalMembers) * 100}%`
                          }} 
                        />
                     </div>
                     <span className="text-sm font-black text-slate-900 tabular-nums">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="h-64 w-64 relative shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={stats.rankingData} 
                  innerRadius={70} 
                  outerRadius={100} 
                  paddingAngle={8} 
                  cornerRadius={10}
                  dataKey="value"
                >
                  {stats.rankingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{stats.totalMembers}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng số</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom section: Units distribution & Recent items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Units column chart */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-100 p-8 sm:p-12 rounded-[4rem] shadow-sm"
        >
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xs uppercase tracking-widest text-slate-400 font-black flex items-center gap-4">
              <div className="w-2 h-10 bg-accent rounded-full" />
              Quy mô chi đoàn lớn
            </h3>
            <Link to="/units" className="text-[10px] text-accent font-black uppercase tracking-widest hover:translate-x-1 transition-transform">Chi tiết →</Link>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.unitData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={24}>
                  {stats.unitData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#dbeafe'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent items list style */}
        <div className="space-y-8">
          {/* Upcoming activities */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-50 p-8 rounded-[3.5rem] border border-slate-100"
          >
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Lịch trình công tác</h4>
              <Link to="/activities" className="text-[10px] text-accent font-black uppercase underline decoration-2 underline-offset-4">Toàn bộ</Link>
            </div>
            <div className="space-y-3">
              {stats.recentActivities.map((act) => (
                <div key={act.id} className="bg-white p-5 rounded-2xl flex justify-between items-center shadow-sm border border-slate-100 hover:border-accent transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                      <Calendar size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate mb-0.5">{act.title}</p>
                      <p className="text-[9px] uppercase font-bold text-slate-400">{act.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-slate-900 leading-none mb-1">{new Date(act.date).toLocaleDateString("vi-VN", {day: '2-digit', month: '2-digit'})}</p>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">2026</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Newest members mini display */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm"
          >
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Nhân sự mới gia nhập</h4>
              <Link to="/members" className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-accent hover:text-white hover:border-accent transition-all">→</Link>
            </div>
            <div className="flex -space-x-4 mb-6">
              {stats.recentMembers.map((m, i) => (
                <div key={m.id} className="w-12 h-12 rounded-2xl bg-white border-4 border-white shadow-lg overflow-hidden flex items-center justify-center font-black text-xl text-accent relative z-[50-i]" style={{zIndex: 50 - i}}>
                   {m.fullName.charAt(0)}
                </div>
              ))}
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border-4 border-white shadow-lg flex items-center justify-center font-black text-xs text-slate-400 z-10">
                +{stats.totalMembers > 4 ? stats.totalMembers - 4 : 0}
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Chào mừng <span className="font-bold text-slate-900">{stats.recentMembers[0]?.fullName}</span> và các đồng chí mới vừa được kết nạp vào hàng ngũ Đoàn viên Thanh niên Cộng sản Hồ Chí Minh.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
