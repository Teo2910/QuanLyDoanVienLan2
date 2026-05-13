import React, { useEffect, useState, FormEvent } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { UnitList } from "./pages/Units/UnitList";
import { MemberList } from "./pages/Members/MemberList";
import { Statistics } from "./pages/Statistics/Statistics";
import { ActivityList } from "./pages/Activities/ActivityList";
import { MovementList } from "./pages/Movements/MovementList";
import { LogList } from "./pages/Logs/LogList";
import { KnowledgeBase } from "./pages/KnowledgeBase/KnowledgeBase";
import { AIAssistant } from "./pages/AIAssistant/AIAssistant";
import { dataService } from "./services/dataService";
import { cn } from "./lib/utils";
import { Users, Building2, Calendar, Star, LogIn, Plus } from "lucide-react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SearchProvider } from "./contexts/SearchContext";
import { Member, UserProfile, Activity } from "./types";
import { motion, AnimatePresence } from "motion/react";
import { CustomSelect } from "./components/CustomSelect";
import { useLiveSync } from "./hooks/useLiveSync";

import { ChatWidget } from "./components/ChatWidget";

const PageTransition = ({ children }: { children: React.ReactNode; key?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ units: 0, members: 0, outstanding: 0 });
  const [recentMembers, setRecentMembers] = useState<(Member & { unitName: string })[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  const loadData = React.useCallback(() => {
    Promise.all([
      dataService.getUnits(), 
      dataService.getMembers(),
      dataService.getActivities()
    ]).then(([uData, mData, aData]) => {
      // Filter data if secretary
      const filteredMembers = profile?.isSecretary && profile?.unitId
        ? mData.filter(m => m.unitId === profile.unitId)
        : mData;

      setStats({ 
        units: uData.length, 
        members: filteredMembers.length,
        outstanding: filteredMembers.filter(m => m.isOutstanding).length
      });

      // Get 3 most recent joiners
      const sortedMembers = [...filteredMembers]
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 3)
        .map(m => ({
          ...m,
          unitName: uData.find(u => u.id === m.unitId)?.name || "N/A"
        }));
      
      setRecentMembers(sortedMembers);

      // Get 3 upcoming activities
      const sortedActivities = [...aData]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .filter(a => new Date(a.date).getTime() >= Date.now())
        .slice(0, 3);
      
      setRecentActivities(sortedActivities);
    });
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useLiveSync("units:changed", loadData);
  useLiveSync("members:changed", loadData);
  useLiveSync("activities:changed", loadData);

  const cards = [
    { label: "Tổng số chi đoàn", value: stats.units, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Tổng số đoàn viên", value: stats.members, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Hoạt động sắp tới", value: recentActivities.length, icon: Calendar, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Đoàn viên tiêu biểu", value: (stats as any).outstanding || 0, icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div id="dashboard-page" className="max-w-7xl mx-auto px-4 lg:px-8 py-4 lg:py-8">
      <div className="mb-10 lg:mb-16 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-slate-900 tracking-tighter leading-none mb-4">
            Xin chào, <span className="text-accent">{profile?.fullName || (profile?.role === 'admin' ? 'Quản trị viên' : 'Bí thư')}</span>
          </h2>
          <p className="text-slate-400 text-[8px] lg:text-[10px] uppercase tracking-[0.3em] lg:tracking-[0.4em] font-black flex items-center gap-2">
             <div className="w-6 lg:w-8 h-px bg-slate-200" /> Hệ thống quản lý Đoàn cơ sở
          </p>
        </motion.div>
        <div className="bg-white px-4 lg:px-6 py-3 lg:py-4 rounded-2xl lg:rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex items-center gap-3 lg:gap-4 w-full lg:w-auto">
           <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
              <Star size={20} className="lg:hidden" fill="currentColor" />
              <Star size={24} className="hidden lg:block" fill="currentColor" />
           </div>
           <div>
              <p className="text-[8px] lg:text-[10px] uppercase font-black text-slate-400 tracking-widest leading-none mb-1">Phiên làm việc</p>
              <p className="text-slate-900 font-black text-xs lg:text-sm tabular-nums capitalize">
                {new Date().toLocaleDateString("vi-VN", { weekday: 'long', day: '2-digit', month: '2-digit' })}
              </p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8 mb-10 lg:mb-16">
        {cards.map((card, index) => (
          <motion.div 
            key={card.label} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white border border-slate-100 p-6 lg:p-10 rounded-2xl lg:rounded-[3rem] flex flex-col justify-between transition-all md:hover:shadow-2xl md:hover:shadow-slate-200/60 md:hover:-translate-y-2 group shadow-sm relative overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 scale-0 group-hover:scale-100" />
            <div className={cn("w-12 h-12 lg:w-16 lg:h-16 rounded-xl lg:rounded-[1.8rem] flex items-center justify-center mb-6 lg:mb-10 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-lg relative z-10", card.bg, card.color)}>
              <card.icon size={24} className="lg:hidden" strokeWidth={2.5} />
              <card.icon size={32} className="hidden lg:block" strokeWidth={2.5} />
            </div>
            <div className="relative z-10">
              <p className="text-[8px] lg:text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1 lg:mb-2 opacity-60">{card.label}</p>
              <h3 className="text-3xl lg:text-5xl font-black text-slate-900 tracking-tighter">{card.value}</h3>
            </div>
            <div className="w-12 h-1 bg-slate-100 rounded-full mt-6 group-hover:w-full transition-all duration-700 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
        {/* Recent Activities Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-100 p-6 lg:p-12 rounded-3xl lg:rounded-[4rem] shadow-sm hover:shadow-2xl transition-all duration-500"
        >
            <div className="flex justify-between items-center mb-6 lg:mb-10">
              <h3 className="text-[9px] lg:text-[11px] uppercase tracking-[0.2em] lg:tracking-[0.3em] text-slate-400 font-black flex items-center gap-3 lg:gap-4">
                <div className="w-1.5 lg:w-2 h-8 lg:h-10 bg-accent rounded-full" />
                Hoạt động sắp tới
              </h3>
              <Link to="/activities" className="text-[8px] lg:text-[10px] text-accent font-black uppercase tracking-widest hover:bg-accent/5 px-3 lg:px-4 py-2 rounded-xl transition-all">Tất cả →</Link>
            </div>
           <div className="space-y-3 lg:space-y-4">
             {recentActivities.length > 0 ? (
               recentActivities.map((evt) => (
                 <motion.div 
                    whileHover={{ x: 10 }}
                    key={evt.id} 
                    className="flex justify-between items-center p-5 lg:p-8 bg-slate-50 border border-slate-100 rounded-2xl lg:rounded-[2.5rem] hover:border-accent hover:bg-white transition-all cursor-pointer group shadow-sm"
                 >
                    <div className="flex items-center gap-4 lg:gap-6">
                       <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-accent shadow-sm group-hover:scale-110 transition-transform shrink-0">
                          <Calendar size={20} className="lg:hidden" />
                          <Calendar size={24} className="hidden lg:block" />
                       </div>
                       <div className="min-w-0">
                          <p className="font-black text-slate-900 text-base lg:text-xl group-hover:text-accent transition-colors leading-tight truncate">{evt.title}</p>
                          <span className="inline-block text-[8px] uppercase tracking-widest text-white bg-slate-900 px-2 lg:px-3 py-1 rounded-lg mt-1.5 lg:mt-2 font-black whitespace-nowrap">{evt.type}</span>
                       </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                       <p className="text-base lg:text-lg font-black text-slate-900 tabular-nums">
                         {new Date(evt.date).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit' })}
                       </p>
                       <p className="text-[8px] lg:text-[10px] uppercase font-black text-slate-300 tracking-widest">{new Date(evt.date).getFullYear()}</p>
                    </div>
                 </motion.div>
               ))
             ) : (
               <div className="py-12 lg:py-20 text-center border-4 border-dashed border-slate-50 rounded-2xl lg:rounded-[3rem] bg-slate-50/20">
                 <Calendar size={32} className="lg:hidden mx-auto text-slate-100 mb-3" />
                 <Calendar size={40} className="hidden lg:block mx-auto text-slate-100 mb-4" />
                 <p className="text-[9px] lg:text-[10px] uppercase tracking-widest text-slate-300 font-black">Lịch trình đang trống</p>
               </div>
             )}
           </div>
        </motion.div>

        {/* Recent Members Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-slate-100 p-6 lg:p-12 rounded-3xl lg:rounded-[4rem] shadow-sm hover:shadow-2xl transition-all duration-500"
        >
            <div className="flex justify-between items-center mb-6 lg:mb-10">
              <h3 className="text-[9px] lg:text-[11px] uppercase tracking-[0.2em] lg:tracking-[0.3em] text-slate-400 font-black flex items-center gap-3 lg:gap-4">
                <div className="w-1.5 lg:w-2 h-8 lg:h-10 bg-emerald-500 rounded-full" />
                Kết nạp mới
              </h3>
              <Link to="/members" className="text-[8px] lg:text-[10px] text-emerald-600 font-black uppercase tracking-widest hover:bg-emerald-50 px-3 lg:px-4 py-2 rounded-xl transition-all">Tất cả →</Link>
            </div>
           <div className="space-y-4 lg:space-y-6">
             {recentMembers.length > 0 ? (
               recentMembers.map((m) => {
                 const joinDate = m.createdAt ? new Date(m.createdAt).toLocaleDateString("vi-VN") : "N/A";
                 return (
                   <motion.div 
                      whileHover={{ scale: 1.02 }}
                      key={m.id} 
                      className="flex items-center gap-4 lg:gap-6 group cursor-pointer p-3 lg:p-4 rounded-2xl lg:rounded-3xl hover:bg-slate-50/80 transition-all border border-transparent hover:border-slate-100 shadow-sm hover:shadow-md"
                   >
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-xl lg:rounded-[1.8rem] bg-white border-2 border-slate-100 flex items-center justify-center font-black text-lg lg:text-2xl text-slate-900 group-hover:border-accent group-hover:text-accent transition-all shadow-xl shadow-slate-200/50 overflow-hidden relative">
                          <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          {m.fullName.charAt(0)}
                        </div>
                        {m.isOutstanding && (
                          <div className="absolute -top-1 -right-1 bg-amber-400 text-white rounded-lg lg:rounded-xl p-1 lg:p-1.5 border-2 lg:border-4 border-white shadow-lg animate-bounce">
                            <Star size={8} className="lg:hidden" fill="currentColor" />
                            <Star size={12} className="hidden lg:block" fill="currentColor" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 text-base lg:text-xl group-hover:text-accent transition-colors truncate leading-tight mb-1">{m.fullName}</p>
                        <p className="text-[8px] lg:text-[9px] uppercase tracking-widest text-slate-400 font-black flex items-center gap-1.5 lg:gap-2">
                           <Building2 size={10} className="text-accent lg:hidden" />
                           <Building2 size={14} className="text-accent hidden lg:block" /> 
                           <span className="truncate">{m.unitName}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-[8px] lg:text-[10px] uppercase tracking-widest text-slate-300 font-black mb-1">Ngày vào</p>
                        <p className="text-[10px] lg:text-xs font-black text-slate-900 bg-white px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg lg:rounded-xl border border-slate-100 tabular-nums shadow-sm">{joinDate}</p>
                      </div>
                   </motion.div>
                 );
               })
             ) : (
               <div className="py-12 lg:py-20 text-center border-4 border-dashed border-slate-50 rounded-2xl lg:rounded-[3rem] bg-slate-50/20">
                 <Users size={32} className="lg:hidden mx-auto text-slate-100 mb-3" />
                 <Users size={40} className="hidden lg:block mx-auto text-slate-100 mb-4" />
                 <p className="text-[9px] lg:text-[10px] uppercase tracking-widest text-slate-300 font-black">Chưa có kết nạp mới</p>
               </div>
             )}
           </div>
        </motion.div>
      </div>
    </div>
  );
};

const AuthScreen = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<'admin' | 'secretary'>('secretary');
  const [unitId, setUnitId] = useState("unit-1");
  const [units, setUnits] = useState<{id: string, name: string}[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dataService.getUnits().then(setUnits);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isRegister) {
        await register({ email, password, role, unitId: role === 'secretary' ? unitId : undefined });
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra, vui lòng thử lại");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-gradient-to-br from-white to-slate-100">
       <div className="max-w-md w-full bg-white border border-slate-200 p-12 rounded-[4rem] text-center shadow-2xl flex flex-col items-center">
          <div className="w-20 h-20 bg-accent flex items-center justify-center mb-8 rounded-[2rem] shadow-xl shadow-accent/20">
            <Star className="text-white" size={40} fill="currentColor" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter">Quản Lý Đoàn</h1>
          <p className="text-slate-400 mb-10 text-xs uppercase tracking-[0.2em] font-bold">
            {isRegister ? "Đăng ký thành viên mới" : "Cổng thông tin nội bộ"}
          </p>

          {error && (
            <div className="w-full p-4 mb-6 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-[10px] font-bold uppercase tracking-widest shadow-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="w-full space-y-5 text-left">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1 mb-2 block">Email / Tài khoản</label>
              <input 
                type="email"
                placeholder="Nhập email của bạn"
                required
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1 mb-2 block">Mật khẩu</label>
              <input 
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            {isRegister && (
              <>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1 mb-2 block">Vai trò trong hệ thống</label>
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setRole('secretary')}
                      className={cn(
                        "flex-1 py-3 rounded-2xl text-[10px] uppercase tracking-widest font-black border-2 transition-all",
                        role === 'secretary' ? "bg-accent text-white border-accent shadow-lg shadow-accent/20" : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                      )}
                    >
                      Bí thư
                    </button>
                    <button 
                      type="button"
                      onClick={() => setRole('admin')}
                      className={cn(
                        "flex-1 py-3 rounded-2xl text-[10px] uppercase tracking-widest font-black border-2 transition-all",
                        role === 'admin' ? "bg-accent text-white border-accent shadow-lg shadow-accent/20" : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                      )}
                    >
                      Quản trị
                    </button>
                  </div>
                </div>

                {role === 'secretary' && (
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1 mb-2 block">Trực thuộc Chi đoàn</label>
                    <CustomSelect
                      options={units.map(u => ({ value: u.id, label: u.name }))}
                      value={unitId}
                      onChange={setUnitId}
                      placeholder="Chọn chi đoàn..."
                    />
                  </div>
                )}
              </>
            )}

            <button 
              type="submit"
              className="w-full py-5 bg-accent text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-accent/20 mt-4 active:scale-95"
            >
              {isRegister ? "Khởi tạo tài khoản" : "Truy cập hệ thống"}
            </button>
          </form>

          <button 
            onClick={() => { setIsRegister(!isRegister); setError(null); }}
            className="mt-8 text-[10px] text-slate-400 uppercase tracking-widest font-black hover:text-accent transition-colors"
          >
            {isRegister ? "Đã có tài khoản? Đăng nhập" : "Yêu cầu cấp tài khoản mới?"}
          </button>
       </div>
    </div>
  );
};

import { ErrorBoundary } from "./components/ErrorBoundary";

const AppContent = () => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <ErrorBoundary>
      <Layout>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location}>
            <Route path="/" element={<PageTransition key="dashboard"><Dashboard /></PageTransition>} />
            <Route path="/units" element={<PageTransition key="units"><UnitList /></PageTransition>} />
            <Route path="/members" element={<PageTransition key="members"><MemberList /></PageTransition>} />
            <Route path="/statistics" element={<PageTransition key="statistics"><Statistics /></PageTransition>} />
            <Route path="/activities" element={<PageTransition key="activities"><ActivityList /></PageTransition>} />
            <Route path="/movements" element={<PageTransition key="movements"><MovementList /></PageTransition>} />
            
            {isAdmin && (
              <>
                <Route path="/logs" element={<PageTransition key="logs"><LogList /></PageTransition>} />
                <Route path="/knowledge-base" element={<PageTransition key="knowledge"><KnowledgeBase /></PageTransition>} />
              </>
            )}
            
            <Route path="/ai-assistant" element={<PageTransition key="ai"><AIAssistant /></PageTransition>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </Layout>
      <ChatWidget />
    </ErrorBoundary>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <Router>
          <AppContent />
        </Router>
      </SearchProvider>
    </AuthProvider>
  );
}
