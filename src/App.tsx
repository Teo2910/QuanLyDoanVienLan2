import React, { useEffect, useState, FormEvent } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { UnitList } from "./pages/Units/UnitList";
import { MemberList } from "./pages/Members/MemberList";
import { Statistics } from "./pages/Statistics/Statistics";
import { ActivityList } from "./pages/Activities/ActivityList";
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

      // Get 5 most recent joiners
      const sortedMembers = [...filteredMembers]
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 5)
        .map(m => ({
          ...m,
          unitName: uData.find(u => u.id === m.unitId)?.name || "N/A"
        }));
      
      setRecentMembers(sortedMembers);

      // Get 5 upcoming activities
      const sortedActivities = [...aData]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .filter(a => new Date(a.date).getTime() >= Date.now())
        .slice(0, 5);
      
      setRecentActivities(sortedActivities);
    });
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useLiveSync("units:changed", loadData);
  useLiveSync("members:changed", loadData);
  useLiveSync("activities:changed", loadData);

  return (
    <div id="dashboard-page" className="max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="mb-20 relative">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1"
          >
            <div className="flex items-center gap-3 mb-8">
              <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-[10px] uppercase tracking-[0.3em] font-black border border-accent/20">Quản lý btc v4.0</span>
              <div className="h-px w-16 bg-white/10" />
              <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Cập nhật {new Date().toLocaleDateString('vi-VN')}</span>
            </div>
            <h2 className="text-6xl md:text-8xl font-display font-bold text-white tracking-tighter leading-[0.85] mb-8">
              Xin chào, <br />
              <span className="font-serif italic text-accent text-gradient lowercase">{profile?.fullName || (profile?.email?.split('@')[0])}</span>
            </h2>
            <p className="text-white/40 max-w-lg text-sm leading-relaxed font-medium">
              Chào mừng bạn trở lại với trung tâm điều hành Quản lý Đoàn viên. 
              Mọi dữ liệu đã được đồng bộ hóa thời gian thực và sẵn sàng để xử lý.
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hidden xl:flex flex-col items-center bg-accent/5 border border-accent/10 rounded-[3rem] p-10 min-w-[280px]"
          >
             <p className="text-[10px] uppercase tracking-[0.4em] text-accent font-black mb-4">Trạng thái hệ thống</p>
             <div className="flex items-center justify-center gap-4 text-white font-display font-bold text-3xl">
               <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse accent-glow" />
               Ổn định
             </div>
             <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold mt-4">Tất cả dịch vụ đang chạy</p>
          </motion.div>
        </div>
      </section>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-8 mb-20">
        {/* Main Stats Card */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="md:col-span-6 lg:col-span-8 bento-card flex flex-col justify-between overflow-hidden relative"
        >
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-accent/5 blur-[100px] rounded-full" />
          <div className="flex justify-between items-start mb-16 relative z-10">
            <div>
              <h3 className="text-xs uppercase tracking-[0.4em] text-white/40 font-black mb-2">Thống kê đoàn số</h3>
              <p className="text-[10px] text-white/20 italic">Dữ liệu tổng hợp từ các chi đoàn</p>
            </div>
            <div className="w-14 h-14 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center text-accent">
              <Users size={28} />
            </div>
          </div>
          <div className="flex items-end gap-12 relative z-10">
            <div>
              <span className="text-9xl font-display font-bold text-white tracking-tighter tabular-nums leading-none">
                {stats.members}
              </span>
              <p className="text-[11px] uppercase tracking-[0.4em] text-accent font-black mt-6 leading-none">đang sinh hoạt</p>
            </div>
            <div className="pb-4 space-y-3">
               <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-accent/40" />
                 <span className="text-xs text-white/40 font-bold">{stats.units} cơ sở chi đoàn</span>
               </div>
               <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-green-500/40" />
                 <span className="text-xs text-white/40 font-bold">{stats.outstanding} đoàn viên tiêu biểu</span>
               </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="md:col-span-6 lg:col-span-4 bento-card bg-accent flex flex-col justify-between group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
            <Plus size={160} className="text-black" />
          </div>
          <div className="relative z-10">
            <h3 className="text-xs uppercase tracking-[0.4em] text-black font-black mb-2 opacity-60">Lối tắt nhanh</h3>
            <p className="text-[11px] text-black italic font-bold">Nâng cao hiệu suất làm việc</p>
          </div>
          <div className="relative z-10 flex flex-col gap-4">
            <Link 
              to="/members" 
              className="flex items-center justify-between p-6 bg-black/[0.08] hover:bg-black rounded-[2rem] text-black hover:text-accent transition-all duration-500 font-black text-[10px] uppercase tracking-[0.2em] border border-white/10"
            >
              <span>Tiếp nhận đoàn viên</span>
              <Plus size={18} strokeWidth={3} />
            </Link>
            <Link 
              to="/activities" 
              className="flex items-center justify-between p-6 bg-black/[0.08] hover:bg-black rounded-[2rem] text-black hover:text-accent transition-all duration-500 font-black text-[10px] uppercase tracking-[0.2em] border border-white/10"
            >
              <span>Lên lịch hoạt động</span>
              <Plus size={18} strokeWidth={3} />
            </Link>
          </div>
        </motion.div>

        {/* Events Block */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="md:col-span-6 lg:col-span-6 bento-card"
        >
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-xs uppercase tracking-[0.4em] text-white/40 font-black mb-2">Lịch hoạt động</h3>
              <p className="text-[10px] text-white/20 italic">Các sự kiện sắp diễn ra</p>
            </div>
            <Link to="/activities" className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:text-accent hover:border-accent/40 transition-all group">
              <Plus size={18} className="group-rotate-90 transition-transform" />
            </Link>
          </div>
          <div className="space-y-4">
            {recentActivities.map((act) => (
              <div key={act.id} className="flex items-center justify-between p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-accent/40 transition-all group">
                <div className="flex items-center gap-6">
                   <div className="w-14 h-14 rounded-3xl bg-accent/5 border border-accent/10 flex items-center justify-center text-accent text-lg font-display font-bold tabular-nums">
                     {new Date(act.date).getDate()}
                   </div>
                   <div>
                     <p className="text-sm font-bold text-white group-hover:text-accent transition-colors mb-1">{act.title}</p>
                     <p className="text-[9px] uppercase tracking-[0.2em] text-white/20 font-black">{act.type}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-xs font-serif italic text-white/20">Th. {new Date(act.date).getMonth() + 1}</p>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <div className="py-20 text-center border border-dashed border-white/10 rounded-[2.5rem]">
                <p className="text-[10px] uppercase tracking-[0.4em] text-white/10 font-black">Trống</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Members Block */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="md:col-span-6 lg:col-span-6 bento-card"
        >
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-xs uppercase tracking-[0.4em] text-white/40 font-black mb-2">Đoàn viên mới</h3>
              <p className="text-[10px] text-white/20 italic">Cập nhật hồ sơ tự động</p>
            </div>
            <Link to="/members" className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:text-accent hover:border-accent/40 transition-all">
              <Users size={18} />
            </Link>
          </div>
          <div className="space-y-8">
            {recentMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between group cursor-default">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt="V" className="w-14 h-14 rounded-[1.25rem] object-cover border border-white/10" />
                    ) : (
                      <div className="w-14 h-14 rounded-[1.25rem] bg-surface-light border border-white/5 flex items-center justify-center font-serif italic text-2xl text-white/10">
                        {m.fullName.charAt(0)}
                      </div>
                    )}
                    {m.isOutstanding && (
                      <div className="absolute -top-1.5 -right-1.5 bg-accent text-black p-1.5 rounded-xl border border-accent shadow-lg">
                        <Star size={10} fill="currentColor" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-accent transition-colors">{m.fullName}</h4>
                    <p className="text-[9px] uppercase tracking-[0.2em] text-white/20 font-black mt-1.5 truncate max-w-[180px]">{m.unitName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-lg bg-accent/5 border border-accent/10 text-[8px] font-black uppercase tracking-[0.3em] text-accent">Hồ sơ xác thực</span>
                </div>
              </div>
            ))}
            {recentMembers.length === 0 && (
              <div className="py-20 text-center border border-dashed border-white/10 rounded-[2.5rem]">
                <p className="text-[10px] uppercase tracking-[0.4em] text-white/10 font-black">Trống</p>
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
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
       <div className="max-w-md w-full bg-white/[0.03] border border-white/10 p-10 rounded-[3rem] text-center shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-6">
            <Star className="text-accent" size={32} />
          </div>
          <h1 className="text-3xl font-serif text-white italic mb-2">Quản Lý Đoàn Viên</h1>
          <p className="text-white/40 mb-8 text-sm uppercase tracking-widest font-medium">
            {isRegister ? "Đăng ký tài khoản mới" : "Cổng thông tin nội bộ"}
          </p>

          {error && (
            <div className="w-full p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold uppercase tracking-widest">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <input 
              type="email"
              placeholder="Email của bạn"
              required
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all font-medium"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input 
              type="password"
              placeholder="Mật khẩu"
              required
              minLength={6}
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all font-medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            
            {isRegister && (
              <>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setRole('secretary')}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] uppercase tracking-widest font-bold border transition-all",
                      role === 'secretary' ? "bg-accent/20 border-accent text-accent" : "bg-white/5 border-white/5 text-white/40"
                    )}
                  >
                    Bí thư
                  </button>
                  <button 
                    type="button"
                    onClick={() => setRole('admin')}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] uppercase tracking-widest font-bold border transition-all",
                      role === 'admin' ? "bg-accent/20 border-accent text-accent" : "bg-white/5 border-white/5 text-white/40"
                    )}
                  >
                    Quản trị viên
                  </button>
                </div>

                {role === 'secretary' && (
                  <CustomSelect
                    options={units.map(u => ({ value: u.id, label: u.name }))}
                    value={unitId}
                    onChange={setUnitId}
                    placeholder="Chọn chi đoàn..."
                  />
                )}
              </>
            )}

            <button 
              type="submit"
              className="w-full flex items-center justify-center gap-4 py-4 bg-accent text-accent-foreground rounded-full font-bold uppercase tracking-widest text-xs hover:opacity-90 transition-all shadow-xl shadow-accent/20"
            >
              {isRegister ? "Đăng ký ngay" : "Tiếp tục truy cập"}
            </button>
          </form>

          <button 
            onClick={() => { setIsRegister(!isRegister); setError(null); }}
            className="mt-6 text-[10px] text-white/50 uppercase tracking-widest hover:text-white transition-colors"
          >
            {isRegister ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký tại đây"}
          </button>
       </div>
    </div>
  );
};

import { ErrorBoundary } from "./components/ErrorBoundary";

const AppContent = () => {
  const { user, loading } = useAuth();
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
            <Route path="/logs" element={<PageTransition key="logs"><LogList /></PageTransition>} />
            <Route path="/knowledge-base" element={<PageTransition key="knowledge"><KnowledgeBase /></PageTransition>} />
            <Route path="/ai-assistant" element={<PageTransition key="ai"><AIAssistant /></PageTransition>} />
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
