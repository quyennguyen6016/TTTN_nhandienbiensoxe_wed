import { useState } from 'react';
import { Camera, Car, ChevronLeft, ChevronRight, History, LayoutDashboard, LogOut, ScanLine, Settings, Users } from 'lucide-react';

export type ViewType = 'dashboard' | 'recognition' | 'camera' | 'history' | 'vehicles' | 'owners' | 'settings';

const ALL_MENU: { id: ViewType; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean }[] = [
  { id: 'dashboard',   label: 'Dashboard',       icon: LayoutDashboard },
  { id: 'recognition', label: 'Nhận diện ảnh',   icon: ScanLine },
  { id: 'camera',      label: 'Camera realtime',  icon: Camera },
  { id: 'history',     label: 'Lịch sử',          icon: History },
  { id: 'vehicles',    label: 'Xe',               icon: Car },
  { id: 'owners',      label: 'Chủ xe',           icon: Users },
  { id: 'settings',    label: 'Cấu hình',         icon: Settings,  adminOnly: true },
];

interface SidebarProps {
  activeView: ViewType;
  setActiveView: (v: ViewType) => void;
  onLogout: () => void;
  isAdmin: boolean;
}

export function Sidebar({ activeView, setActiveView, onLogout, isAdmin }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const menuItems = ALL_MENU.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <a className="sidebar-brand" href="#" onClick={e => { e.preventDefault(); setActiveView('dashboard'); }}>
        <div className="sidebar-brand-icon"><ScanLine size={18} /></div>
        <div className="sidebar-brand-text">
          <div className="sidebar-brand-title">PlateVision <span>Pro</span></div>
          <div className="sidebar-brand-sub">ALPR System</div>
        </div>
      </a>

      <nav className="sidebar-nav">
        {menuItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`nav-item${activeView === id ? ' active' : ''}`} data-label={label} onClick={() => setActiveView(id)}>
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button onClick={onLogout}><LogOut size={16} /><span>Đăng xuất</span></button>
      </div>

      <button className="sidebar-collapse-btn" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Mở rộng' : 'Thu gọn'}>
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>
    </aside>
  );
}
