
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import InvitationPage from '../pages/InvitationPage';
import WorldPage from '../pages/WorldPage';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import AdminLayout from '../admin/AdminLayout';
import AdminLoginPage from '../pages/admin/AdminLoginPage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminGuestsPage from '../pages/admin/AdminGuestsPage';
import AdminInvitationsPage from '../pages/admin/AdminInvitationsPage';
import AdminRsvpsPage from '../pages/admin/AdminRsvpsPage';
import AdminWorldSettingsPage from '../pages/admin/AdminWorldSettingsPage';

function HomePage() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <p>Đang kiểm tra phiên đăng nhập...</p>;
    }

    return (
        <div style={{ padding: 30 }}>
            <h1>Graduation World</h1>
            {isAuthenticated ? (
                <p>Bạn đã đăng nhập.</p>
            ) : (
                <p>Bạn chưa đăng nhập. Vui lòng mở invitation link.</p>
            )}
        </div>
    );
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/invite/:token" element={<InvitationPage />} />

            <Route element={<ProtectedRoute />}>
                <Route path="/world" element={<WorldPage />} />
            </Route>

            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route element={<AdminRoute />}>
                <Route element={<AdminLayout />}>
                    <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                    <Route path="/admin/guests" element={<AdminGuestsPage />} />
                    <Route path="/admin/invitations" element={<AdminInvitationsPage />} />
                    <Route path="/admin/rsvps" element={<AdminRsvpsPage />} />
                    <Route path="/admin/world-settings" element={<AdminWorldSettingsPage />} />
                </Route>
            </Route>

            <Route path="*" element={<p>Không tìm thấy trang.</p>} />
        </Routes>
    );
}

export default AppRoutes;
