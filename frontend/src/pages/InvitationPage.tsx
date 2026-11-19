
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function InvitationPage() {
    const { token } = useParams<{ token: string }>();
    const { login } = useAuth();
    const navigate = useNavigate();

    const [error, setError] = useState('');

    useEffect(() => {
        const exchangeToken = async () => {
            if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
                setError('Invitation link không hợp lệ.');
                return;
            }

            try {
                await login(token);
                navigate('/world', { replace: true });
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Không thể xác thực invitation link.',
                );
            }
        };

        exchangeToken();
    }, [token, login, navigate]);

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
            <p>Đang xác thực invitation link...</p>
        </div>
    );
}

export default InvitationPage;
