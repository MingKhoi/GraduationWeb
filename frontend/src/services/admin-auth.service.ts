import { apiRequest } from './api';

export interface Admin {
  id: string;
  email: string;
  createdAt?: string;
}

export const adminAuthService = {
  login(email: string, password: string) {
    return apiRequest<{ message: string; admin: Admin }>('/admin-auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  logout() {
    return apiRequest<{ message: string }>('/admin-auth/logout', {
      method: 'POST',
    });
  },
  me() {
    return apiRequest<Admin>('/admin-auth/me');
  },
};
