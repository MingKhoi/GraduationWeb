import {
    createContext,
    useCallback,
    useEffect,
    useState,
    type ReactNode,
} from 'react';

import { authService } from '../services/auth.service';
import type { Guest, GuestProfile } from '../types/auth.types';

interface AuthContextType {
    guest: Guest | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (token: string) => Promise<Guest>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    updateGuestProfile: (profile: GuestProfile) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
    undefined,
);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [guest, setGuest] = useState<Guest | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Khôi phục session khi mở website
    const refreshUser = useCallback(async () => {
        try {
            const currentGuest = await authService.getMe();
            setGuest(currentGuest);
        } catch {
            setGuest(null);
        }
    }, []);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                await refreshUser();
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, [refreshUser]);

    // Đăng nhập bằng invitation token
    const login = async (token: string) => {
        const result = await authService.exchangeInvitation(token);

        setGuest(result.guest);

        return result.guest;
    };

    // Đăng xuất
    const logout = async () => {
        try {
            await authService.logout();
        } finally {
            setGuest(null);
        }
    };

    const updateGuestProfile = useCallback((profile: GuestProfile) => {
        setGuest((currentGuest) => (
            currentGuest ? { ...currentGuest, profile } : currentGuest
        ));
    }, []);

    return (
        <AuthContext.Provider
            value={{
                guest,
                isLoading,
                isAuthenticated: !!guest,
                login,
                logout,
                refreshUser,
                updateGuestProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}