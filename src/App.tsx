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
    { label: "Tổng số chi đoàn", value: stats.units, icon: Building2, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Tổng số đoàn viên", value: stats.members, icon: Users, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Hoạt động sắp tới", value: recentActivities.length, icon: Calendar, color: "text-orange-400", bg: "bg-orange-500/10" },
    { label: "Đoàn viên tiêu biểu", value: (stats as any).outstanding || 0, icon: Star, color: "text-purple-400", bg: "bg-purple-500/10" },
  ];

  return (
    <div id="dashboard-page">
      <div className="mb-12">
        <h2 className="text-5xl font-bold text-white tracking-tighter">
          Xin chào, {profile?.fullName || (profile?.role === 'admin' ? 'Quản trị viên' : 'Bí thư')}
        </h2>
        <p className="text-white/40 mt-2 text-xs uppercase tracking-widest leading-relaxed">Hệ thống quản lý dữ liệu và hồ sơ đoàn viên trực thuộc</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {cards.map((card) => (
          <div key={card.label} className="bg-surface/50 border border-white/5 p-8 rounded-3xl flex flex-col justify-between transition-all hover:bg-surface/80 group shadow-lg backdrop-blur-sm">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", card.bg, card.color)}>
              <card.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">{card.label}</p>
              <h3 className="text-4xl font-bold text-white tracking-tighter">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-surface/40 border border-white/5 p-10 rounded-[2.5rem] shadow-xl backdrop-blur-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3">
                <Calendar className="text-accent" size={16} />
                Hoạt động sắp tới
              </h3>
              <div className="flex items-center gap-4">
                {(profile?.role === 'admin' || profile?.role === 'secretary') && (
                  <Link 
                    to="/activities" 
                    className="flex items-center gap-2 px-3 py-1.5 bg-accent/20 text-accent border border-accent/20 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-accent/30 transition-colors"
                  >
                    <Plus size={12} />
                    Thêm mới
                  </Link>
                )}
                <Link to="/activities" className="text-[10px] text-accent font-bold uppercase tracking-widest cursor-pointer hover:underline">Xem tất cả</Link>
              </div>
            </div>
           <div className="space-y-4">
             {recentActivities.length > 0 ? (
               recentActivities.map((evt) => (
                 <div key={evt.id} className="flex justify-between items-center p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/20 transition-all cursor-pointer group">
                    <div>
                      <p className="font-bold text-white text-lg group-hover:text-accent transition-colors">{evt.title}</p>
                      <p className="text-[10px] uppercase tracking-widest text-white/30 mt-1">{evt.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-white/60 tabular-nums">{new Date(evt.date).toLocaleDateString("vi-VN")}</p>
                    </div>
                 </div>
               ))
             ) : (
               <div className="py-10 text-center border border-dashed border-white/10 rounded-2xl">
                 <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold">Chưa có hoạt động tiếp theo</p>
               </div>
             )}
           </div>
        </div>

        <div className="bg-surface/40 border border-white/5 p-10 rounded-[2.5rem] shadow-xl backdrop-blur-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3">
                <Users className="text-accent" size={16} />
                Gia nhập gần đây
              </h3>
              <div className="flex items-center gap-4">
                {(profile?.role === 'admin' || profile?.role === 'secretary') && (
                  <Link 
                    to="/members" 
                    className="flex items-center gap-2 px-3 py-1.5 bg-accent/20 text-accent border border-accent/20 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-accent/30 transition-colors"
                  >
                    <Plus size={12} />
                    Thêm mới
                  </Link>
                )}
                <Link to="/members" className="text-[10px] text-accent font-bold uppercase tracking-widest cursor-pointer hover:underline">Xem tất cả</Link>
              </div>
            </div>
           <div className="space-y-6">
             {recentMembers.length > 0 ? (
               recentMembers.map((m) => {
                 const joinDate = m.createdAt ? new Date(m.createdAt).toLocaleDateString("vi-VN") : "N/A";
                 return (
                   <div key={m.id} className="flex items-center gap-5 group cursor-pointer">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center font-bold text-xl text-white group-hover:border-accent transition-all shadow-inner">
                          {m.fullName.charAt(0)}
                        </div>
                        {m.isOutstanding && (
                          <div className="absolute -top-1 -right-1 bg-yellow-400 text-black rounded-full p-1 border border-yellow-500 shadow-lg">
                            <Star size={8} fill="currentColor" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white group-hover:text-accent transition-colors">{m.fullName}</p>
                        <p className="text-[10px] uppercase tracking-widest text-white/30 mt-0.5">{m.unitName}</p>
                      </div>
                      <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold">{joinDate}</p>
                   </div>
                 );
               })
             ) : (
               <div className="py-10 text-center border border-dashed border-white/10 rounded-2xl">
                 <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold">Chưa có đoàn viên mới</p>
               </div>
             )}
           </div>
        </div>
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
          <h1 className="text-3xl font-bold text-white mb-2">Quản Lý Đoàn Viên</h1>
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
