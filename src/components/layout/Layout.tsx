import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Users, LayoutDashboard, Building2, LogOut, Menu, X, Search } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { profile, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const location = useLocation();

  const navigation = [
    { name: "Tổng quan", href: "/", icon: LayoutDashboard },
    { name: "Quản lý đơn vị", href: "/units", icon: Building2 },
    { name: "Danh sách đoàn viên", href: "/members", icon: Users },
  ];

  const userInitials = profile?.email?.substring(0, 2).toUpperCase() || "??";
  const userRoleName = profile?.role === "admin" ? "Quản trị viên" : "Bí thư";

  return (
    <div id="app-layout" className="min-h-screen bg-background flex text-secondary-foreground">
      {/* Sidebar */}
      <aside
        id="sidebar"
        className={cn(
          "bg-surface border-r border-white/10 w-64 fixed inset-y-0 left-0 transition-transform duration-300 ease-in-out z-50 flex flex-col",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="p-8">
          <h1 className="text-2xl font-serif italic text-white tracking-tight">V-Union</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-1">Management Suite</p>
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
                <div className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  isActive ? "bg-accent shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "border border-white/30 group-hover:border-white/60"
                )} />
                <span className="text-sm font-medium tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/10">
          <div className="bg-white/5 p-4 rounded-xl flex items-center space-x-3 border border-white/5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-800 flex items-center justify-center font-bold text-white shadow-lg text-[10px]">
              {userInitials}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{profile?.email}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-tighter">{userRoleName}</p>
            </div>
          </div>
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
            <div className="relative hidden sm:block">
              <input 
                type="text" 
                placeholder="Tìm kiếm nhanh..." 
                className="bg-white/5 border border-white/10 rounded-full py-2 px-10 text-xs w-64 focus:outline-none focus:border-accent/50 focus:ring-0 transition-all placeholder:text-white/20"
              />
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden lg:block">
                <p className="text-[10px] uppercase tracking-widest text-white font-bold">Admin</p>
                <div className="flex items-center justify-end gap-1">
                   <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                   <p className="text-[9px] text-white/40 uppercase tracking-tighter">Trực tuyến</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="p-10 flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
