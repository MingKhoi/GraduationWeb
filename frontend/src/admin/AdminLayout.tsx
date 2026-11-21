import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';

const NAV_ITEMS = [
  { to: '/admin/dashboard', icon: '⌂', label: 'Tổng quan' },
  { to: '/admin/guests', icon: '♙', label: 'Khách mời' },
  { to: '/admin/invitations', icon: '✉', label: 'Thiệp mời' },
  { to: '/admin/rsvps', icon: '✓', label: 'RSVP' },
  { to: '/admin/world-settings', icon: '⚙', label: 'Cài đặt' },
] as const;

const PAGE_META: Record<string, { icon: string; intro: string }> = {
  '/admin/dashboard': { icon: '▦', intro: 'Bức tranh tổng thể về số lượng khách và thiệp mời của sự kiện.' },
  '/admin/guests': { icon: '♙', intro: 'Thêm mới, tìm kiếm và quản lý danh sách khách được mời.' },
  '/admin/invitations': { icon: '✉', intro: 'Soạn lời mời riêng cho từng khách, cấp lại hoặc thu hồi thiệp.' },
  '/admin/rsvps': { icon: '✓', intro: 'Theo dõi phản hồi tham dự của khách mời.' },
  '/admin/world-settings': { icon: '⚙', intro: 'Tùy chỉnh nội dung và không gian của thế giới tốt nghiệp.' },
};

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const location = useLocation();
  const meta = PAGE_META[location.pathname];
  const initial = admin?.email?.[0]?.toUpperCase() ?? 'A';

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-icon" aria-hidden="true">🎓</span>
          <div>
            <h2>Graduation World</h2>
            <small>BẢNG ĐIỀU KHIỂN</small>
          </div>
        </div>
        <nav>
          <span className="admin-nav-label">Quản lý</span>
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink key={to} to={to}>
              <span className="admin-nav-icon" aria-hidden="true">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <span className="admin-avatar" aria-hidden="true">{initial}</span>
            <span>{admin?.email}</span>
          </div>
          <button className="admin-logout" onClick={() => void logout()}>
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-title">
            <span className="admin-header-mark" aria-hidden="true">🎓</span>
            <span>
              Graduation World
              <small>Xin chào, {admin?.email?.split('@')[0] ?? 'Admin'}!</small>
            </span>
          </div>
          <div className="admin-header-actions">
            <span className="admin-header-chip">Hệ thống hoạt động</span>
            <button
              className="admin-mobile-logout"
              onClick={() => void logout()}
              aria-label="Đăng xuất"
              title="Đăng xuất"
            >
              ↪
            </button>
            <span className="admin-header-avatar" aria-hidden="true">{initial}</span>
          </div>
        </header>
        {meta && (
          <h1 className="admin-page-heading">
            <span className="admin-title-icon" aria-hidden="true">{meta.icon}</span>
            <span>
              {NAV_ITEMS.find((item) => item.to === location.pathname)?.label}
              <small>{meta.intro}</small>
            </span>
          </h1>
        )}
        <Outlet />
        <footer className="admin-footer">
          Graduation World <span>·</span> Quản trị sự kiện tốt nghiệp
        </footer>
      </main>
    </div>
  );
}
