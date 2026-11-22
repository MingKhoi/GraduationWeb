
const BACKEND_URL = (
    import.meta.env.VITE_API_URL || 'http://localhost:3000'
).replace(/\/+$/, '');

// REST API: đi qua Vercel Proxy khi deploy production.
export const API_URL = import.meta.env.PROD
    ? '/api'
    : BACKEND_URL;

// Socket.IO: luôn kết nối trực tiếp đến backend.
export const SOCKET_URL = BACKEND_URL;

export async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            data?.message || `Request failed: ${response.status}`,
        );
    }

    return data as T;
}
