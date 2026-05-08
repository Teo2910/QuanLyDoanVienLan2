import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, Menu, X, Calendar, User, Camera, Check, BarChart3, Users, Building2, LayoutGrid, Database, Activity, Bot } from "lucide-react";
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
    { name: "Tổng quan", href: "/", icon: LayoutGrid },
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
    <div id="app-layout" className="h-screen bg-background flex text-secondary-foreground overflow-hidden">
      {/* Sidebar */}
      <aside
        id="sidebar"
        className={cn(
          "bg-[#0a0b10] border-r border-white/5 w-64 transition-all duration-300 ease-in-out z-50 flex flex-col shadow-2xl shrink-0 overflow-hidden h-screen",
          !isSidebarOpen && "w-0 opacity-0 -translate-x-full"
        )}
      >
        <div className="p-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <span className="text-white font-black text-xs">QN</span>
            </div>
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold text-white tracking-tight whitespace-nowrap">Quản lý Đoàn</h1>
              <p className="text-[9px] uppercase tracking-[0.1em] text-white/30 font-bold whitespace-nowrap">Hệ thống quản trị</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                  isActive
                    ? "bg-[#242632]/80 shadow-xl border border-white/5 text-white"
                    : "text-white/40 hover:text-white hover:bg-white/[0.02]"
                )}
              >
                <div className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 shrink-0",
                  isActive 
                    ? "bg-[#2a2d3d] shadow-[0_0_15px_rgba(59,130,246,0.15)] text-blue-400" 
                    : "bg-[#1e1f28] text-white/40 group-hover:text-white"
                )}>
                  <Icon size={20} />
                </div>
                
                <span className={cn(
                  "text-[15px] font-medium tracking-tight transition-all duration-300 whitespace-nowrap",
                  isActive ? "text-white" : "text-white/40"
                )}>
                  {item.name}
                </span>

                {isActive && (
                  <motion.div 
                    layoutId="active-nav-indicator"
                    className="absolute right-4 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/10 shrink-0">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsProfileModalOpen(true)}
            className="bg-white/5 p-4 rounded-xl flex items-center space-x-3 border border-white/5 w-full hover:bg-white/10 transition-all text-left group"
          >
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover shadow-lg border border-white/10 group-hover:border-accent/40" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg text-[10px]">
                {userInitials}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-black text-white truncate group-hover:text-accent transition-colors">{profile?.fullName || profile?.email}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-tighter">{userRoleName}</p>
            </div>
          </motion.button>
          <motion.button 
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.95 }}
            onClick={logout}
            className="mt-6 flex items-center gap-3 px-4 py-2 w-full text-white/30 hover:text-red-400 transition-all text-[10px] font-black uppercase tracking-widest bg-white/5 border border-transparent hover:border-red-500/10 rounded-xl"
          >
            <LogOut size={14} />
            <span>Đăng xuất</span>
          </motion.button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 transition-all duration-300 h-screen flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 shrink-0 border-b border-white/10 bg-background/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <button 
              id="sidebar-toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg text-white/60 transition-colors"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="h-8 w-[1px] bg-white/10 mx-2" />
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Quản lý Đoàn viên</h2>
              <p className="text-[10px] text-white/30 uppercase tracking-widest leading-none mt-1">Cơ sở dữ liệu tập trung</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const newState = !isUserListOpen;
                  setIsUserListOpen(newState);
                  if (newState) fetchUsersData();
                }}
                className="flex items-center gap-3 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
              >
                <div className="text-right hidden lg:block">
                  <p className="text-[10px] uppercase tracking-widest text-white font-black">{userRoleName}</p>
                  <div className="flex items-center justify-end gap-1">
                     <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                     <p className="text-[9px] text-white/40 uppercase tracking-tighter">Trực tuyến</p>
                  </div>
                </div>
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-white/10 shadow-lg" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent shadow-lg text-[10px]">
                    {userInitials}
                  </div>
                )}
              </motion.button>

              <AnimatePresence>
                {isUserListOpen && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsUserListOpen(false)}
                      className="fixed inset-0 z-40"
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-72 bg-surface/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                        <div>
                          <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-bold mb-1">Người dùng hệ thống</h4>
                          <p className="text-[9px] text-white/20 italic">Trạng thái thời gian thực ({users.length})</p>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); fetchUsersData(); }}
                          className={cn("p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all", isLoadingUsers && "animate-spin")}
                          title="Làm mới danh sách"
                        >
                          <Activity size={12} />
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {isLoadingUsers && users.length === 0 ? (
                           <div className="py-8 text-center animate-pulse">
                            <Activity size={24} className="mx-auto text-accent mb-2" />
                            <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Đang tải...</p>
                          </div>
                        ) : users.length === 0 ? (
                          <div className="py-8 text-center">
                            <Users size={24} className="mx-auto text-white/10 mb-2" />
                            <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Không tìm thấy người dùng</p>
                          </div>
                        ) : (
                          users.map((u) => {
                            const isOnline = onlineUids.includes(u.uid);
                            const displayName = u.fullName || (u.email ? u.email.split('@')[0] : 'User');
                            return (
                              <div key={u.uid || u.email} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group">
                                <div className="relative">
                                  {u.avatarUrl ? (
                                    <img src={u.avatarUrl} alt={displayName} className="w-10 h-10 rounded-full object-cover shadow-md border border-white/10" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                      <User size={14} className="text-white/20" />
                                    </div>
                                  )}
                                  <div className={cn(
                                    "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1a1b26] shadow-sm transition-all duration-500",
                                    isOnline ? "bg-green-500 scale-110" : "bg-white/20 scale-90"
                                  )} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <div className="flex justify-between items-start">
                                    <p className="text-[11px] font-bold text-white truncate">{displayName}</p>
                                    <p className={cn(
                                      "text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded-full",
                                      isOnline ? "text-green-500 bg-green-500/10" : "text-white/20 bg-white/5"
                                    )}>
                                      {isOnline ? "TRỰC TUYẾN" : "NGOẠI TUYẾN"}
                                    </p>
                                  </div>
                                  <p className="text-[9px] text-white/30 uppercase tracking-tighter truncate mt-0.5">
                                    {u.role === 'admin' ? 'Quản trị viên' : 'Bí thư chi đoàn'}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div className="p-4 border-t border-white/10 flex justify-center bg-white/[0.02]">
                         <motion.button 
                          whileHover={{ scale: 1.1, color: "#fff" }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => { setIsUserListOpen(false); setIsProfileModalOpen(true); }}
                          className="text-[9px] uppercase tracking-widest text-accent font-black hover:bg-accent/10 py-2 px-4 rounded-lg transition-all"
                        >
                          Chỉnh sửa hồ sơ
                        </motion.button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
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
                 <h3 className="text-2xl font-bold text-white">Cập nhật hồ sơ</h3>
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
