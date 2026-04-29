import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { UnitList } from "./pages/Units/UnitList";
import { MemberList } from "./pages/Members/MemberList";
import { useEffect, useState } from "react";
import { dataService } from "./services/dataService";
import { cn } from "./lib/utils";
import { Users, Building2, Calendar, Star, LogIn } from "lucide-react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ units: 0, members: 0 });

  useEffect(() => {
    Promise.all([dataService.getUnits(), dataService.getMembers()]).then(([u, m]) => {
      setStats({ units: u.length, members: m.length });
    });
  }, []);

  const cards = [
    { label: "Tổng số chi đoàn", value: stats.units, icon: Building2, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Tổng số đoàn viên", value: stats.members, icon: Users, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Hoạt động tháng này", value: 12, icon: Calendar, color: "text-orange-400", bg: "bg-orange-500/10" },
    { label: "Đoàn viên tiêu biểu", value: 4, icon: Star, color: "text-purple-400", bg: "bg-purple-500/10" },
  ];

  return (
    <div id="dashboard-page" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-12">
        <h2 className="text-4xl font-serif text-white tracking-tight">Xin chào, {profile?.role === 'admin' ? 'Quản trị viên' : 'Bí thư'}</h2>
        <p className="text-white/40 mt-2 text-sm uppercase tracking-widest font-medium">Hệ thống quản lý dữ liệu trực thuộc</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {cards.map((card) => (
          <div key={card.label} className="bg-white/[0.03] border border-white/10 p-8 rounded-3xl flex flex-col justify-between transition-all hover:bg-white/[0.05] group">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", card.bg, card.color)}>
              <card.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">{card.label}</p>
              <h3 className="text-4xl font-light text-white tracking-tighter italic">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white/[0.02] border border-white/10 p-10 rounded-[2.5rem]">
           <div className="flex justify-between items-center mb-8">
             <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3">
               <Calendar className="text-accent" size={16} />
               Hoạt động sắp tới
             </h3>
             <span className="text-[10px] text-accent font-bold uppercase tracking-widest cursor-pointer hover:underline">Xem tất cả</span>
           </div>
           <div className="space-y-4">
             {[
               { title: "Đại hội Chi đoàn K44", date: "15/05/2026", type: "Hội họp" },
               { title: "Chiến dịch Mùa hè xanh", date: "01/07/2026", type: "Phong trào" },
               { title: "Lớp bồi dưỡng cảm tình Đoàn", date: "20/05/2026", type: "Giáo dục" },
             ].map((evt) => (
               <div key={evt.title} className="flex justify-between items-center p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/20 transition-all cursor-pointer group">
                  <div>
                    <p className="font-serif italic text-white text-lg group-hover:text-accent transition-colors">{evt.title}</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/30 mt-1">{evt.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-white/60 tabular-nums">{evt.date}</p>
                  </div>
               </div>
             ))}
           </div>
        </div>

        <div className="bg-white/[0.02] border border-white/10 p-10 rounded-[2.5rem]">
           <div className="flex justify-between items-center mb-8">
             <h3 className="text-xs uppercase tracking-[0.2em] text-white/60 font-bold flex items-center gap-3">
               <Users className="text-accent" size={16} />
               Gia nhập gần đây
             </h3>
             <span className="text-[10px] text-accent font-bold uppercase tracking-widest cursor-pointer hover:underline">Phê duyệt</span>
           </div>
           <div className="space-y-6">
             {[
               { name: "Phạm Minh Hoàng", date: "Hôm nay", unit: "CNTT K44" },
               { name: "Vũ Phương Linh", date: "Hôm qua", unit: "Toán K44" },
               { name: "Nguyễn Tuấn Anh", date: "2 ngày trước", unit: "Vật lý K43" },
             ].map((user) => (
               <div key={user.name} className="flex items-center gap-5 group cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center font-serif italic text-xl text-white group-hover:border-accent transition-all shadow-inner">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-serif italic text-white group-hover:text-accent transition-colors">{user.name}</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/30 mt-0.5">{user.unit}</p>
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold">{user.date}</p>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { user, loading, login } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
         <div className="max-w-md w-full bg-white/[0.03] border border-white/10 p-12 rounded-[3rem] text-center shadow-2xl flex flex-col items-center">
            <div className="w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center mb-8">
              <Star className="text-accent" size={40} />
            </div>
            <h1 className="text-4xl font-serif text-white italic mb-4">Quản Lý Đoàn Viên</h1>
            <p className="text-white/40 mb-10 leading-relaxed text-sm">Hệ thống quản lý dữ liệu nội bộ. Vui lòng nhấn nút bên dưới để truy cập.</p>
            <button 
              onClick={() => login("admin@local.test")}
              className="w-full flex items-center justify-center gap-4 py-4 bg-accent text-accent-foreground rounded-full font-bold uppercase tracking-widest text-xs hover:opacity-90 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-accent/20"
            >
              <LogIn size={20} />
              Truy cập Hệ thống (Admin)
            </button>
            <div className="mt-4 w-full">
              <button 
                onClick={() => login("sec@local.test")}
                className="w-full flex items-center justify-center gap-4 py-4 bg-white/5 border border-white/10 text-white/60 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
              >
                Tiếp tục: Bí thư chi đoàn
              </button>
            </div>
            <p className="mt-8 text-[10px] text-white/20 uppercase tracking-[0.2em]">Cổng thông tin nội bộ (Offline Mode)</p>
         </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/units" element={<UnitList />} />
          <Route path="/members" element={<MemberList />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
