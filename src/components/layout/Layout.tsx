import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, Menu, X, Calendar, User, Camera, Check, BarChart3, Users, Building2, LayoutGrid, Database, Activity, Bot, Award } from "lucide-react";
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
    { name: profile?.role === "admin" ? "Phòng trào & Báo cáo" : "Báo cáo phong trào", href: "/movements", icon: Award },
    { name: "Quản lý đơn vị", href: "/units", icon: Building2 },
    { name: "Danh sách đoàn viên", href: "/members", icon: Users },
    { name: "Thống kê", href: "/statistics", icon: BarChart3 },
    { name: "Hoạt động", href: "/activities", icon: Calendar },
    ...(profile?.role === "admin" ? [
      { name: "Tài liệu nghiệp vụ", href: "/knowledge-base", icon: Database },
      { name: "Nhật ký hệ thống", href: "/logs", icon: Activity },
    ] : []),
    { name: "Trợ lý AI", href: "/ai-assistant", icon: Bot },
  ];

  const userInitials = profile?.email?.substring(0, 2).toUpperCase() || "??";
  const userRoleName = profile?.role === "admin" ? "Quản trị viên" : "Bí thư";

  return (
    <div id="app-layout" className="min-h-screen bg-slate-50 flex text-slate-900">
      {/* Sidebar */}
      <aside
        id="sidebar"
        className={cn(
          "bg-white border-r border-slate-200 w-72 transition-all duration-300 ease-in-out z-50 flex flex-col shadow-xl shrink-0 overflow-hidden h-screen sticky top-0",
          !isSidebarOpen && "w-0 opacity-0 -translate-x-full"
        )}
      >
        <div className="p-10 w-72">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
              <span className="text-white font-black text-sm">QN</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Quản lý Đoàn</h1>
              <p className="text-[9px] uppercase tracking-[0.1em] text-slate-400 font-bold">Thanh niên Đà Lạt</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-2 w-72 mt-2 overflow-y-auto custom-scrollbar">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                  isActive
                    ? "bg-accent/5 text-accent shadow-sm border border-accent/10"
                    : "text-slate-500 hover:text-accent hover:bg-slate-50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 shrink-0",
                  isActive 
                    ? "bg-accent text-white shadow-lg shadow-accent/20" 
                    : "bg-slate-100 text-slate-400 group-hover:bg-accent/10 group-hover:text-accent"
                )}>
                  <Icon size={20} />
                </div>
                
                <span className={cn(
                  "text-[15px] font-semibold tracking-tight transition-all duration-300",
                  isActive ? "text-accent" : "text-slate-600"
                )}>
                  {item.name}
                </span>

                {isActive && (
                  <motion.div 
                    layoutId="active-nav-indicator"
                    className="absolute right-4 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(37,99,235,0.8)]"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-100 w-72">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsProfileModalOpen(true)}
            className="bg-slate-50 p-4 rounded-xl flex items-center space-x-3 border border-slate-100 w-full hover:bg-slate-100 transition-all text-left group"
          >
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover shadow-md border border-white group-hover:border-accent/40" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-white shadow-lg text-[10px]">
                {userInitials}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate group-hover:text-accent transition-colors">{profile?.fullName || profile?.email}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-tighter font-semibold">{userRoleName}</p>
            </div>
          </motion.button>
          <motion.button 
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.95 }}
            onClick={logout}
            className="mt-6 flex items-center gap-3 px-4 py-2 w-full text-slate-400 hover:text-red-500 transition-all text-[10px] font-black uppercase tracking-widest hover:bg-red-50 rounded-xl"
          >
            <LogOut size={14} />
            <span>Đăng xuất</span>
          </motion.button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 transition-all duration-300 h-screen flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-20 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-10">
          <div className="flex items-center gap-4">
            <button 
              id="sidebar-toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Quản lý Đoàn viên</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none mt-1 font-semibold">DLU Internal Portal</p>
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
                className="flex items-center gap-3 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-100"
              >
                <div className="text-right hidden lg:block">
                  <p className="text-[10px] uppercase tracking-widest text-slate-900 font-black">{userRoleName}</p>
                  <div className="flex items-center justify-end gap-1">
                     <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                     <p className="text-[9px] text-slate-400 uppercase tracking-tighter">Trực tuyến</p>
                  </div>
                </div>
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center font-bold text-accent shadow-sm text-[10px]">
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
                      className="absolute right-0 mt-4 w-80 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <div>
                          <h4 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-1">Người dùng hệ thống</h4>
                          <p className="text-[9px] text-slate-400 italic">Trạng thái thời gian thực ({users.length})</p>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); fetchUsersData(); }}
                          className={cn("p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-accent transition-all", isLoadingUsers && "animate-spin")}
                          title="Làm mới danh sách"
                        >
                          <Activity size={12} />
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {isLoadingUsers && users.length === 0 ? (
                           <div className="py-8 text-center animate-pulse">
                            <Activity size={24} className="mx-auto text-accent mb-2" />
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Đang tải...</p>
                          </div>
                        ) : users.length === 0 ? (
                          <div className="py-8 text-center">
                            <Users size={24} className="mx-auto text-slate-200 mb-2" />
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Không tìm thấy người dùng</p>
                          </div>
                        ) : (
                          users.map((u) => {
                            const isOnline = onlineUids.includes(u.uid);
                            const displayName = u.fullName || (u.email ? u.email.split('@')[0] : 'User');
                            return (
                              <div key={u.uid || u.email} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                                <div className="relative">
                                  {u.avatarUrl ? (
                                    <img src={u.avatarUrl} alt={displayName} className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                      <User size={14} className="text-slate-300" />
                                    </div>
                                  )}
                                  <div className={cn(
                                    "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white shadow-sm transition-all duration-500",
                                    isOnline ? "bg-green-500 scale-110" : "bg-slate-300 scale-90"
                                  )} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <div className="flex justify-between items-start">
                                    <p className="text-[11px] font-bold text-slate-900 truncate">{displayName}</p>
                                    <p className={cn(
                                      "text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded-full",
                                      isOnline ? "text-green-600 bg-green-50" : "text-slate-400 bg-slate-50"
                                    )}>
                                      {isOnline ? "TRỰC TUYẾN" : "NGOẠI TUYẾN"}
                                    </p>
                                  </div>
                                  <p className="text-[9px] text-slate-400 uppercase tracking-tighter truncate mt-0.5">
                                    {u.role === 'admin' ? 'Quản trị viên' : 'Bí thư chi đoàn'}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div className="p-4 border-t border-slate-100 flex justify-center bg-slate-50">
                         <motion.button 
                          whileHover={{ scale: 1.05, color: "#0066cc" }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { setIsUserListOpen(false); setIsProfileModalOpen(true); }}
                          className="text-[9px] uppercase tracking-widest text-accent font-black hover:bg-white py-2 px-6 rounded-xl transition-all shadow-sm"
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

        <div className="p-10 flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar bg-slate-50/50">
          {children}
        </div>
      </main>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 rounded-[3rem] w-full max-w-md relative shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-accent/10 to-transparent -z-10" />
            
            <button 
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors z-10"
            >
              <X size={24} />
            </button>
            
            <div className="overflow-y-auto flex-1 p-10 custom-scrollbar">
              <div className="text-center mb-8 pt-4">
                 <div className="relative inline-block group mb-6">
                    <div className="w-24 h-24 rounded-3xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner">
                       {profileForm.avatarUrl ? (
                         <img src={profileForm.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                       ) : (
                         <User size={40} className="text-slate-200" />
                       )}
                    </div>
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 bg-accent text-white p-2 rounded-xl shadow-lg transition-transform hover:scale-110 cursor-pointer"
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
                 <h3 className="text-2xl font-bold text-slate-900">Cập nhật hồ sơ</h3>
                 <p className="text-slate-400 uppercase tracking-widest text-[9px] mt-1 font-bold">Quản lý định danh của bạn</p>
              </div>
              
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 block">Họ và tên</label>
                  <input
                    required
                    placeholder="Nhập họ tên đầy đủ"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all font-medium"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({...profileForm, fullName: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 block">Email liên hệ</label>
                  <input
                    type="email"
                    required
                    placeholder="Địa chỉ email"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all font-medium"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 block">Số điện thoại</label>
                  <input
                    placeholder="Số điện thoại liên hệ"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all font-medium"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                  />
                </div>

                <div className="pt-4">
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full flex items-center justify-center gap-3 py-4 bg-accent text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-accent/20"
                  >
                    <Check size={16} />
                    Xác nhận cập nhật
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
