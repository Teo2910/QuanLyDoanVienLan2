import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, Menu, X, Calendar, User, Camera, Check, BarChart3, Users, Building2, LayoutDashboard, Database, Activity, Bot, Star } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { dataService } from "../../services/dataService";
import { io, Socket } from "socket.io-client";

import { motion, AnimatePresence } from "motion/react";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { profile, logout, updateProfile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
  const [isUserListOpen, setIsUserListOpen] = React.useState(false);
  const [users, setUsers] = React.useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(false);
  const [onlineUids, setOnlineUids] = React.useState<string[]>([]);
  const socketRef = React.useRef<Socket | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [profileForm, setProfileForm] = React.useState({
    fullName: profile?.fullName || "",
    avatarUrl: profile?.avatarUrl || "",
    email: profile?.email || "",
    phone: profile?.phone || ""
  });
  const location = useLocation();

  React.useEffect(() => {
    // Socket.io for Real-time presence
    if (profile?.uid) {
      // Connect to the same host
      socketRef.current = io();
      
      socketRef.current.on("connect", () => {
        console.log("Connected to presence server");
        socketRef.current?.emit("presence:online", profile.uid);
      });

      socketRef.current.on("presence:update", (onlineUsers: { uid: string }[]) => {
        console.log("Presence update received:", onlineUsers);
        setOnlineUids(onlineUsers.map(u => u.uid));
      });

      // Periodically announce presence just in case of reconnections
      const presenceInterval = setInterval(() => {
        if (socketRef.current?.connected && profile.uid) {
          socketRef.current.emit("presence:online", profile.uid);
        }
      }, 30000);

      return () => {
        clearInterval(presenceInterval);
        socketRef.current?.disconnect();
      };
    }
  }, [profile?.uid]);

  const fetchUsersData = React.useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      console.log("[Presence] Fetching system users...");
      const data = await dataService.getUsers();
      console.log("[Presence] Received users:", data);
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("[Presence] Error fetching users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsersData();
    
    // Refresh user list occasionally to catch new registrations
    const refreshInterval = setInterval(fetchUsersData, 30000);
    return () => clearInterval(refreshInterval);
  }, [fetchUsersData]);

  React.useEffect(() => {
    if (profile) {
      console.log("[Presence] Current profile:", profile.email, profile.uid);
      setProfileForm({
        fullName: profile.fullName || "",
        avatarUrl: profile.avatarUrl || "",
        email: profile.email || "",
        phone: profile.phone || ""
      });
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile(profileForm);
    setIsProfileModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Ảnh quá lớn. Vui lòng chọn ảnh dưới 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const navigation = [
    { name: "Tổng quan", href: "/", icon: LayoutDashboard },
    { name: "Quản lý đơn vị", href: "/units", icon: Building2 },
    { name: "Danh sách đoàn viên", href: "/members", icon: Users },
    { name: "Thống kê", href: "/statistics", icon: BarChart3 },
    { name: "Hoạt động", href: "/activities", icon: Calendar },
    { name: "Tài liệu nghiệp vụ", href: "/knowledge-base", icon: Database },
    { name: "Nhật ký hệ thống", href: "/logs", icon: Activity },
    { name: "Trợ lý AI", href: "/ai-assistant", icon: Bot },
  ];

  const userInitials = profile?.email?.substring(0, 2).toUpperCase() || "??";
  const userRoleName = profile?.role === "admin" ? "Quản trị viên" : "Bí thư";

  return (
    <div id="app-layout" className="min-h-screen bg-background flex text-secondary-foreground font-sans selection:bg-accent/30">
      {/* Sidebar */}
      <aside
        id="sidebar"
        className={cn(
          "bg-surface/30 backdrop-blur-2xl border-r border-white/5 w-72 transition-all duration-500 ease-in-out z-50 flex flex-col shadow-2xl shrink-0 overflow-hidden",
          !isSidebarOpen && "w-0 opacity-0 -translate-x-full"
        )}
      >
        <div className="p-10 w-72">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-accent rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20">
              <Star className="text-black" size={24} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-white tracking-tight leading-none">QLDV</h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-black mt-1">Hệ thống btc</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-1.5 w-72 overflow-y-auto fancy-scrollbar">
          <p className="px-4 py-2 text-[9px] uppercase tracking-[0.4em] text-white/20 font-black mb-2">Menu chính</p>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                  isActive
                    ? "bg-white/5 text-white"
                    : "text-white/30 hover:text-white hover:bg-white/[0.02]"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="nav-active"
                    className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-accent rounded-full"
                  />
                )}
                <item.icon size={20} className={cn("transition-colors", isActive ? "text-accent" : "group-hover:text-white")} />
                <span className="text-sm font-medium tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-8 border-t border-white/5 w-72">
          <motion.div 
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.05)" }}
            onClick={() => setIsProfileModalOpen(true)}
            className="p-4 rounded-[1.5rem] bg-white/[0.02] border border-white/5 flex items-center gap-4 cursor-pointer transition-all group"
          >
            <div className="relative">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-11 h-11 rounded-2xl object-cover shadow-xl border border-white/10 group-hover:border-accent/50" />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-accent to-purple-600 flex items-center justify-center font-bold text-white shadow-xl text-xs">
                  {userInitials}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-surface animate-pulse" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate leading-tight">{profile?.fullName || (profile?.email?.split('@')[0])}</p>
              <p className="text-[9px] text-white/30 uppercase tracking-[0.1em] font-black mt-1">Đang trực tuyến</p>
            </div>
          </motion.div>
          
          <button 
            onClick={logout}
            className="mt-6 flex items-center justify-center gap-3 w-full py-3.5 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-red-400 hover:bg-red-500/5 transition-all rounded-2xl border border-transparent hover:border-red-500/10"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 transition-all duration-500 h-screen flex flex-col overflow-hidden relative">
        {/* Subtle Background Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 blur-[120px] -z-10 rounded-full" />
        
        {/* Top Header */}
        <header className="h-24 border-b border-white/5 bg-background/50 backdrop-blur-3xl sticky top-0 z-40 flex items-center justify-between px-12">
          <div className="flex items-center gap-6">
            <button 
              id="sidebar-toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-3 hover:bg-white/5 rounded-2xl text-white/40 hover:text-white transition-all border border-transparent hover:border-white/10"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <nav className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-black text-white/20 mb-1">
                <span>Trang chủ</span>
                <span className="text-white/10">/</span>
                <span className="text-accent">{navigation.find(n => n.href === location.pathname)?.name || "Dashboard"}</span>
              </nav>
              <h2 className="font-display text-lg text-white font-bold tracking-tight">
                {navigation.find(n => n.href === location.pathname)?.name || "Tổng quan hệ thống"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-black">Cập nhật lần cuối</span>
              <span className="text-[10px] text-white/40 tabular-nums">Vừa xong (Live Sync)</span>
            </div>
            
            <motion.div 
              whileHover={{ scale: 1.05 }}
              onClick={() => {
                const newState = !isUserListOpen;
                setIsUserListOpen(newState);
                if (newState) fetchUsersData();
              }}
              className="relative cursor-pointer group"
            >
              <div className="flex items-center gap-4 p-2.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-2xl transition-all shadow-xl">
                 <div className="text-right hidden sm:block">
                   <p className="text-[9px] uppercase tracking-[0.2em] text-white font-black">{profile?.fullName || profile?.email}</p>
                   <p className="text-[8px] text-accent font-bold uppercase tracking-widest leading-none mt-1">{userRoleName}</p>
                 </div>
                 {profile?.avatarUrl ? (
                   <img src={profile.avatarUrl} alt="Avatar" className="w-9 h-9 rounded-xl object-cover border border-white/10 group-hover:border-accent/40" />
                 ) : (
                   <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center font-bold text-accent text-[10px]">
                     {userInitials}
                   </div>
                 )}
              </div>
              
              <AnimatePresence>
                {isUserListOpen && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={(e) => { e.stopPropagation(); setIsUserListOpen(false); }}
                      className="fixed inset-0 z-40"
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      className="absolute right-0 mt-5 w-80 bg-[#161b22]/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                    >
                      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                              <Users className="text-accent" size={16} />
                           </div>
                           <div>
                              <h4 className="text-[10px] uppercase tracking-[0.3em] text-white font-black">Người dùng</h4>
                              <p className="text-[8px] text-white/30 uppercase font-bold mt-1">Trực tuyến: {onlineUids.length}</p>
                           </div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); fetchUsersData(); }}
                          className={cn("p-2 rounded-xl hover:bg-white/5 text-white/30 hover:text-white transition-all", isLoadingUsers && "animate-spin")}
                        >
                          <Activity size={14} />
                        </button>
                      </div>
                      <div className="max-h-96 overflow-y-auto p-4 space-y-2 fancy-scrollbar">
                        {users.map((u) => {
                          const isOnline = onlineUids.includes(u.uid);
                          return (
                            <motion.div 
                              whileHover={{ x: 5, backgroundColor: "rgba(255,255,255,0.03)" }}
                              key={u.uid || u.email} 
                              className="flex items-center gap-4 p-3.5 rounded-2xl border border-transparent hover:border-white/5 transition-all group"
                            >
                              <div className="relative">
                                {u.avatarUrl ? (
                                  <img src={u.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-2xl object-cover border border-white/10" />
                                ) : (
                                  <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center font-serif italic text-lg text-white/20">
                                    {u.fullName?.charAt(0) || u.email?.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className={cn(
                                  "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#161b22] shadow-sm",
                                  isOnline ? "bg-green-500" : "bg-white/10"
                                )} />
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-bold text-white truncate">{u.fullName || (u.email?.split('@')[0])}</p>
                                <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mt-0.5">
                                  {u.role === 'admin' ? 'Admin' : 'Bí thư'}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                      <div className="p-6 border-t border-white/5 bg-white/[0.01]">
                         <button 
                          onClick={(e) => { e.stopPropagation(); setIsUserListOpen(false); setIsProfileModalOpen(true); }}
                          className="w-full py-3 bg-white/5 hover:bg-accent text-[9px] text-white hover:text-black font-black uppercase tracking-[0.3em] rounded-xl transition-all border border-white/5"
                        >
                          Sửa hồ sơ
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </header>

        <div className="p-12 flex-1 overflow-x-hidden overflow-y-auto fancy-scrollbar">
          {children}
        </div>
      </main>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface border border-white/10 rounded-[3rem] w-full max-w-md relative shadow-2xl shadow-black/50 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-accent/20 to-transparent -z-10" />
            
            <button 
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors z-10"
            >
              <X size={24} />
            </button>
            
            <div className="overflow-y-auto flex-1 p-10 custom-scrollbar">
              <div className="text-center mb-8 pt-4">
                 <div className="relative inline-block group mb-6">
                    <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shadow-2xl">
                       {profileForm.avatarUrl ? (
                         <img src={profileForm.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                       ) : (
                         <User size={40} className="text-white/20" />
                       )}
                    </div>
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 bg-accent text-white p-2 rounded-xl shadow-xl transition-transform hover:scale-110 cursor-pointer"
                    >
                       <Camera size={14} />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                    />
                 </div>
                 <h3 className="text-2xl font-serif text-white italic">Cập nhật hồ sơ</h3>
                 <p className="text-white/30 uppercase tracking-widest text-[9px] mt-1 font-bold">Thay đổi thông tin cá nhân của bạn</p>
              </div>
              
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Họ và tên</label>
                  <input
                    required
                    placeholder="Nhập họ tên đầy đủ"
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all font-medium"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({...profileForm, fullName: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Email (Gmail)</label>
                  <input
                    type="email"
                    required
                    placeholder="Địa chỉ gmail của bạn"
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all font-medium"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Số điện thoại</label>
                  <input
                    placeholder="Số điện thoại liên hệ"
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all font-medium"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 block">Link ảnh đại diện</label>
                  <input
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all font-medium"
                    value={profileForm.avatarUrl}
                    onChange={(e) => setProfileForm({...profileForm, avatarUrl: e.target.value})}
                  />
                  <p className="text-[9px] text-white/20 mt-2 italic">* Sử dụng link ảnh từ internet (Unsplash, Imgur...)</p>
                </div>

                <div className="pt-4">
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full flex items-center justify-center gap-3 py-4 bg-accent border border-white/20 text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all shadow-xl shadow-accent/20"
                  >
                    <Check size={16} />
                    Lưu thay đổi
                  </motion.button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
