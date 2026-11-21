
import { Routes, Route } from 'react-router-dom';
import InvitationPage from '../pages/InvitationPage';
import HomePage from '../pages/HomePage';
import WorldPage from '../pages/WorldPage';
import LobbyPage from '../pages/LobbyPage';
import WishesPage from '../pages/WishesPage';
import MemoriesPage from '../pages/MemoriesPage';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import AdminLayout from '../admin/AdminLayout';
import AdminLoginPage from '../pages/admin/AdminLoginPage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminGuestsPage from '../pages/admin/AdminGuestsPage';
import AdminInvitationsPage from '../pages/admin/AdminInvitationsPage';
import AdminRsvpsPage from '../pages/admin/AdminRsvpsPage';
import AdminWorldSettingsPage from '../pages/admin/AdminWorldSettingsPage';

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/invite/:token" element={<InvitationPage />} />

            <Route element={<ProtectedRoute />}>
                <Route path="/world" element={<WorldPage />} />
                <Route path="/lobby" element={<LobbyPage />} />
                <Route path="/wishes" element={<WishesPage />} />
                <Route path="/memories" element={<MemoriesPage />} />
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
