import { NavLink, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const links = [
    ['/admin/dashboard', 'Tổng quan'],
    ['/admin/guests', 'Khách mời'],
    ['/admin/invitations', 'Thiệp mời'],
    ['/admin/rsvps', 'RSVP'],
    ['/admin/world-settings', 'Cài đặt thế giới'],
  ];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <h2>Graduation World</h2>
        <nav>
          {links.map(([to, label]) => (
            <NavLink key={to} to={to}>{label}</NavLink>
          ))}
        </nav>
        <button className="admin-logout" onClick={() => void logout()}>
          Đăng xuất
        </button>
      </aside>
      <main className="admin-main">
        <header className="admin-header">
          <span>Quản trị</span>
          <strong>{admin?.email}</strong>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
