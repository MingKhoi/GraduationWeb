import { apiRequest } from './api';
import type { AuthResponse, Guest } from '../types/auth.types';

export const authService = {
    // Xác thực bằng invitation token
    async exchangeInvitation(token: string): Promise<AuthResponse> {
        return apiRequest<AuthResponse>('/auth/exchange', {
            method: 'POST',
            body: JSON.stringify({ token }),
        });
    },

    // Lấy thông tin khách đang đăng nhập
    async getMe(): Promise<Guest> {
        return apiRequest<Guest>('/auth/me');
    },

    // Đăng xuất
    async logout(): Promise<{ message: string }> {
        return apiRequest('/auth/logout', {
            method: 'POST',
        });
    },
};