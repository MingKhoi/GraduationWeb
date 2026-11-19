import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';

export default function AdminRoute() {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const location = useLocation();

  if (isLoading) return <p className="admin-loading">Đang kiểm tra phiên Admin...</p>;
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
