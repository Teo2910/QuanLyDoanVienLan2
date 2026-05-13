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
    <div id="dashboard-page">
      <div className="mb-12">
        <h2 className="text-5xl font-bold text-slate-900 tracking-tighter">
          Xin chào, {profile?.fullName || (profile?.role === 'admin' ? 'Quản trị viên' : 'Bí thư')}
        </h2>
        <p className="text-slate-400 mt-2 text-xs uppercase tracking-widest font-bold leading-relaxed">Chào mừng bạn trở lại hệ thống quản lý Đoàn TNCS Hồ Chí Minh</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {cards.map((card) => (
          <div key={card.label} className="bg-white border border-slate-100 p-8 rounded-3xl flex flex-col justify-between transition-all hover:shadow-xl hover:-translate-y-1 group shadow-sm">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:rotate-3", card.bg, card.color)}>
              <card.icon size={28} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">{card.label}</p>
              <h3 className="text-4xl font-bold text-slate-900 tracking-tighter">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white border border-slate-100 p-10 rounded-[2.5rem] shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold flex items-center gap-3">
                <Calendar className="text-accent" size={16} />
                Hoạt động sắp tới
              </h3>
              <div className="flex items-center gap-4">
                {(profile?.role === 'admin' || profile?.role === 'secretary') && (
                  <Link 
                    to="/activities" 
                    className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-accent hover:text-white transition-all shadow-sm"
                  >
                    <Plus size={12} />
                    Phát động
                  </Link>
                )}
                <Link to="/activities" className="text-[10px] text-accent font-bold uppercase tracking-widest cursor-pointer hover:underline">Tất cả</Link>
              </div>
            </div>
           <div className="space-y-4">
             {recentActivities.length > 0 ? (
               recentActivities.map((evt) => (
                 <div key={evt.id} className="flex justify-between items-center p-6 bg-slate-50 border border-slate-100 rounded-2xl hover:border-accent hover:bg-white transition-all cursor-pointer group shadow-sm">
                    <div>
                      <p className="font-bold text-slate-900 text-lg group-hover:text-accent transition-colors">{evt.title}</p>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-semibold">{evt.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-500 tabular-nums">{new Date(evt.date).toLocaleDateString("vi-VN")}</p>
                    </div>
                 </div>
               ))
             ) : (
               <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                 <p className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">Chưa có hoạt động mới</p>
               </div>
             )}
           </div>
        </div>

        <div className="bg-white border border-slate-100 p-10 rounded-[2.5rem] shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold flex items-center gap-3">
                <Users className="text-accent" size={16} />
                Gia nhập gần đây
              </h3>
              <div className="flex items-center gap-4">
                {(profile?.role === 'admin' || profile?.role === 'secretary') && (
                  <Link 
                    to="/members" 
                    className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-accent hover:text-white transition-all shadow-sm"
                  >
                    <Plus size={12} />
                    Kết nạp
                  </Link>
                )}
                <Link to="/members" className="text-[10px] text-accent font-bold uppercase tracking-widest cursor-pointer hover:underline">Tất cả</Link>
              </div>
            </div>
           <div className="space-y-6">
             {recentMembers.length > 0 ? (
               recentMembers.map((m) => {
                 const joinDate = m.createdAt ? new Date(m.createdAt).toLocaleDateString("vi-VN") : "N/A";
                 return (
                   <div key={m.id} className="flex items-center gap-5 group cursor-pointer p-2 rounded-2xl hover:bg-slate-50 transition-all">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-bold text-2xl text-slate-900 group-hover:border-accent group-hover:text-accent transition-all shadow-sm">
                          {m.fullName.charAt(0)}
                        </div>
                        {m.isOutstanding && (
                          <div className="absolute -top-1 -right-1 bg-amber-400 text-white rounded-full p-1 border-2 border-white shadow-lg">
                            <Star size={10} fill="currentColor" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 group-hover:text-accent transition-colors">{m.fullName}</p>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-0.5 font-semibold">{m.unitName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">Ngày vào</p>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{joinDate}</p>
                      </div>
                   </div>
                 );
               })
             ) : (
               <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                 <p className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">Chưa có đoàn viên mới</p>
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
