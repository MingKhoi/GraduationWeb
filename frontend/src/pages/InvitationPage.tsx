
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function InvitationPage() {
    const { token } = useParams<{ token: string }>();
    const { login, isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();
    const processedToken = useRef<string | undefined>(undefined);
    const [exchangeError, setExchangeError] = useState<{
        token: string | undefined;
        message: string;
    } | null>(null);
    const isTokenValid = Boolean(token && /^[a-f0-9]{64}$/i.test(token));
    const error = exchangeError && exchangeError.token === token
        ? exchangeError.message
        : !isLoading && !isAuthenticated && !isTokenValid
            ? 'Invitation link không hợp lệ.'
            : '';

    useEffect(() => {
        if (isLoading || processedToken.current === token) return;
        processedToken.current = token;

        if (isAuthenticated) {
            navigate('/', { replace: true });
            return;
        }

        if (!isTokenValid || !token) return;

        const exchangeToken = async () => {
            try {
                await login(token);
                navigate('/world', { replace: true });
            } catch (err) {
                setExchangeError({
                    token,
                    message: err instanceof Error
                        ? err.message
                        : 'Không thể xác thực invitation link.',
                });
            }
        };

        void exchangeToken();
    }, [isAuthenticated, isLoading, isTokenValid, token, login, navigate]);

    if (error) {
        return (
            <div style={{ padding: 30 }}>
                <h1>Graduation World</h1>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div style={{ padding: 30 }}>
            <h1>Graduation World</h1>
            <p>{isLoading ? 'Đang kiểm tra phiên đăng nhập...' : 'Đang xác thực invitation link...'}</p>
        </div>
    );
}

export default InvitationPage;
