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
    <main className="admin-login">
      <section className="admin-login-hero" aria-label="Graduation World">
        <img src="/admin/graduation-world-hero.png" alt="" />
        <img className="admin-login-campus" src="/admin/campus-illustration.png" alt="" />
      </section>
      <form className="admin-login-card" onSubmit={submit}>
        <div className="admin-login-logo">
          <span className="admin-login-badge" aria-hidden="true">🎓</span>
          <div>
            <h2>Admin Login</h2>
            <p className="admin-login-sub">Cổng quản trị sự kiện tốt nghiệp</p>
          </div>
        </div>
        {error && <p className="admin-error" role="alert">⚠️ {error}</p>}
        <label>
          Email admin
          <span className="admin-input-wrap">
            <span aria-hidden="true">✉</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" placeholder="admin@example.com" />
          </span>
        </label>
        <label>
          Mật khẩu
          <span className="admin-input-wrap">
            <span aria-hidden="true">▣</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="current-password" placeholder="Nhập mật khẩu" />
          </span>
        </label>
        <button disabled={loading}>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'} <span aria-hidden="true">→</span></button>
        <p className="admin-login-footnote"><strong>Graduation World</strong><br />Khu vực dành riêng cho quản trị viên</p>
      </form>
    </main>
  );
}
