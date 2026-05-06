import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, Menu, X, Calendar, User, Camera, Check, BarChart3, Users, Building2, LayoutDashboard, Database, Activity } from "lucide-react";
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
      socketRef.current = io();
      
      socketRef.current.on("connect", () => {
        socketRef.current?.emit("presence:online", profile.uid);
      });

      socketRef.current.on("presence:update", (onlineUsers: { uid: string }[]) => {
        setOnlineUids(onlineUsers.map(u => u.uid));
      });

      return () => {
        socketRef.current?.disconnect();
      };
    }
  }, [profile?.uid]);

  React.useEffect(() => {
    const fetchUsersData = async () => {
      const data = await dataService.getUsers();
      setUsers(data);
    };
    fetchUsersData();
  }, []);

  React.useEffect(() => {
    if (profile) {
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
  ];

  const userInitials = profile?.email?.substring(0, 2).toUpperCase() || "??";
  const userRoleName = profile?.role === "admin" ? "Quản trị viên" : "Bí thư";

  return (
    <div id="app-layout" className="min-h-screen bg-background flex text-secondary-foreground">
      {/* Sidebar */}
      <aside
        id="sidebar"
        className={cn(
          "bg-surface/50 backdrop-blur-xl border-r border-white/5 w-64 fixed inset-y-0 left-0 transition-transform duration-300 ease-in-out z-50 flex flex-col shadow-2xl",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="p-8">
          <h1 className="text-2xl font-serif italic text-white tracking-tight">Quản lý Đoàn viên</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-1">Hệ thống nội bộ</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                  isActive
                    ? "bg-white/5 border border-white/10 text-white"
                    : "text-white/40 hover:text-white"
                )}
              >
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-3 w-full"
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    isActive ? "bg-accent shadow-[0_0_8px_rgba(122,162,247,0.5)]" : "border border-white/30 group-hover:border-white/60"
                  )} />
                  <span className="text-sm font-medium tracking-wide">{item.name}</span>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/10">
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="bg-white/5 p-4 rounded-xl flex items-center space-x-3 border border-white/5 w-full hover:bg-white/10 transition-all text-left"
          >
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover shadow-lg border border-white/10" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg text-[10px]">
                {userInitials}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{profile?.fullName || profile?.email}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-tighter">{userRoleName}</p>
            </div>
          </button>
          <button 
            onClick={logout}
            className="mt-4 flex items-center gap-3 px-4 py-2 w-full text-white/30 hover:text-white transition-colors text-xs font-medium uppercase tracking-widest"
          >
            <LogOut size={14} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 min-h-screen flex flex-col",
        isSidebarOpen ? "ml-64" : "ml-0"
      )}>
        {/* Top Header */}
        <header className="h-20 border-b border-white/10 bg-background/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-10">
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
              <h2 className="font-serif text-xl text-white">Quản lý Đoàn viên</h2>
              <p className="text-[10px] text-white/30 uppercase tracking-widest leading-none mt-1">Cơ sở dữ liệu tập trung</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={() => setIsUserListOpen(!isUserListOpen)}
                className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10"
              >
                <div className="text-right hidden lg:block">
                  <p className="text-[10px] uppercase tracking-widest text-white font-bold">{userRoleName}</p>
                  <div className="flex items-center justify-end gap-1">
                     <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
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
              </button>

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
                      <div className="p-4 border-b border-white/10 bg-white/5">
                        <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-bold mb-1">Người dùng hệ thống</h4>
                        <p className="text-[9px] text-white/20 italic">Đang hiển thị trạng thái thời gian thực</p>
                      </div>
                      <div className="max-h-80 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {users.map((u) => {
                          const isOnline = onlineUids.includes(u.uid);
                          return (
                            <div key={u.uid} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                              <div className="relative">
                                {u.avatarUrl ? (
                                  <img src={u.avatarUrl} alt={u.fullName} className="w-10 h-10 rounded-full object-cover shadow-md" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white/40 text-[10px]">
                                    {u.email.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div className={cn(
                                  "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface shadow-sm",
                                  isOnline ? "bg-green-500" : "bg-white/20"
                                )} />
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <p className="text-[11px] font-bold text-white truncate">{u.fullName || u.email}</p>
                                <div className="flex justify-between items-center">
                                  <p className="text-[9px] text-white/30 uppercase tracking-tighter">
                                    {u.role === 'admin' ? 'Quản trị viên' : 'Bí thư'}
                                  </p>
                                  <p className={cn(
                                    "text-[9px] font-bold tracking-tighter",
                                    isOnline ? "text-green-500" : "text-white/20"
                                  )}>
                                    {isOnline ? "ONLINE" : "OFFLINE"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="p-4 border-t border-white/10 flex justify-center">
                         <button 
                          onClick={() => { setIsUserListOpen(false); setIsProfileModalOpen(true); }}
                          className="text-[9px] uppercase tracking-widest text-accent font-bold hover:underline"
                        >
                          Chỉnh sửa hồ sơ
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="p-10 flex-1 overflow-auto custom-scrollbar">
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
                  <button 
                    type="submit"
                    className="w-full flex items-center justify-center gap-3 py-4 bg-accent text-accent-foreground rounded-full font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-all shadow-xl shadow-accent/20"
                  >
                    <Check size={16} />
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
