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
import { Dashboard } from "./pages/Dashboard/Dashboard";
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
import { VNPTLogo } from "./components/ui/VNPTLogo";

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-white to-slate-100">
       <motion.div 
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         className="max-w-md w-full bg-white border border-slate-200 p-8 sm:p-12 rounded-3xl sm:rounded-[4rem] text-center shadow-2xl flex flex-col items-center"
       >
          <div className="w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center mb-6 sm:mb-10 transition-transform hover:scale-110 duration-500">
            <VNPTLogo className="w-full h-full" />
          </div>
          <p className="text-slate-400 mb-8 sm:mb-12 text-[9px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.4em] font-black">
            {isRegister ? "Đăng ký thành viên mới" : "Cổng thông tin nội bộ"}
          </p>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full p-4 mb-6 bg-red-50 border border-red-100 rounded-xl sm:rounded-2xl text-red-500 text-[10px] font-bold uppercase tracking-widest shadow-inner"
            >
              {error}
            </motion.div>
          )}
          
          <form onSubmit={handleSubmit} className="w-full space-y-5 sm:space-y-6 text-left">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1 mb-2.5 block">Email / Tài khoản</label>
              <input 
                type="email"
                placeholder="Nhập email của bạn"
                required
                className="w-full px-5 sm:px-8 py-4 sm:py-5 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-[1.8rem] text-slate-900 focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent focus:bg-white transition-all font-bold text-sm sm:text-base outline-none shadow-inner"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1 mb-2.5 block">Mật khẩu</label>
              <input 
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-5 sm:px-8 py-4 sm:py-5 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-[1.8rem] text-slate-900 focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent focus:bg-white transition-all font-bold text-sm sm:text-base outline-none shadow-inner"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            {isRegister && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-5 sm:space-y-6 overflow-hidden"
              >
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1 mb-2.5 block">Vị trí công tác</label>
                  <div className="flex gap-2 sm:gap-4">
                    <button 
                      type="button"
                      onClick={() => setRole('secretary')}
                      className={cn(
                        "flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[9px] sm:text-[11px] uppercase tracking-widest font-black border-2 transition-all outline-none",
                        role === 'secretary' ? "bg-accent text-white border-accent shadow-lg shadow-accent/20" : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                      )}
                    >
                      Bí thư
                    </button>
                    <button 
                      type="button"
                      onClick={() => setRole('admin')}
                      className={cn(
                        "flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[9px] sm:text-[11px] uppercase tracking-widest font-black border-2 transition-all outline-none",
                        role === 'admin' ? "bg-accent text-white border-accent shadow-lg shadow-accent/20" : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                      )}
                    >
                      Quản trị
                    </button>
                  </div>
                </div>

                {role === 'secretary' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1 mb-2.5 block">Trực thuộc Chi đoàn</label>
                    <CustomSelect
                      options={units.map(u => ({ value: u.id, label: u.name }))}
                      value={unitId}
                      onChange={setUnitId}
                      placeholder="Chọn chi đoàn..."
                    />
                  </motion.div>
                )}
              </motion.div>
            )}

            <button 
              type="submit"
              className="w-full py-4 sm:py-6 bg-slate-900 text-white rounded-xl sm:rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs hover:bg-accent transition-all shadow-xl shadow-slate-900/10 mt-6 active:scale-95 outline-none"
            >
              {isRegister ? "Khởi tạo tài khoản" : "Truy cập hệ thống"}
            </button>
          </form>

          <button 
            onClick={() => { setIsRegister(!isRegister); setError(null); }}
            className="mt-8 sm:mt-12 text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-widest font-black hover:text-accent transition-all outline-none group flex items-center gap-2"
          >
            <div className="w-4 h-px bg-slate-200 group-hover:w-8 transition-all" />
            {isRegister ? "Đã có tài khoản? Đăng nhập" : "Yêu cầu cấp tài khoản mới?"}
          </button>
       </motion.div>
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
