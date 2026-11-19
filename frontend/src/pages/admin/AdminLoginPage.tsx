import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      const state = location.state as { from?: string } | null;
      navigate(state?.from ?? '/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <form onSubmit={submit}>
        <h1>Đăng nhập Admin</h1>
        {error && <p className="admin-error">{error}</p>}
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Mật khẩu<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></label>
        <button disabled={loading}>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
      </form>
    </div>
  );
}
