import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '../../services/api';

interface AdminGuest {
  id: string;
  fullName: string;
  email: string | null;
  rsvp: { status: string } | null;
  invitation: { expiresAt: string | null } | null;
}

export default function AdminGuestsPage() {
  const [guests, setGuests] = useState<AdminGuest[]>([]);
  const [search, setSearch] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async (query = '') => {
    setError('');
    try {
      setGuests(await apiRequest<AdminGuest[]>(`/guests${query ? `?search=${encodeURIComponent(query)}` : ''}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải khách mời');
    }
  };

  useEffect(() => { void load(); }, []);

  const createGuest = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      await apiRequest('/guests', {
        method: 'POST',
        body: JSON.stringify({ fullName, email: email || undefined }),
      });
      setFullName('');
      setEmail('');
      setMessage('Đã tạo khách mời.');
      await load(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo khách mời');
    }
  };

  const removeGuest = async (guest: AdminGuest) => {
    if (!window.confirm(`Xóa khách mời ${guest.fullName}?`)) return;
    await apiRequest(`/guests/${guest.id}`, { method: 'DELETE' });
    await load(search);
  };

  return (
    <section>
      <h1>Quản lý khách mời</h1>
      {error && <p className="admin-error">{error}</p>}
      {message && <p className="admin-success">{message}</p>}
      <form className="admin-inline" onSubmit={createGuest}>
        <input placeholder="Họ tên" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input placeholder="Email tùy chọn" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button>Thêm khách</button>
      </form>
      <input className="admin-search" placeholder="Tìm theo tên hoặc email" value={search} onChange={(e) => setSearch(e.target.value)} onInput={(e) => void load((e.target as HTMLInputElement).value)} />
      {guests.length === 0 ? <p>Chưa có khách mời.</p> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Tên</th><th>Email</th><th>RSVP</th><th>Thiệp</th><th></th></tr></thead>
            <tbody>{guests.map((guest) => (
              <tr key={guest.id}>
                <td>{guest.fullName}</td><td>{guest.email ?? '-'}</td>
                <td>{guest.rsvp?.status ?? 'PENDING'}</td>
                <td>{guest.invitation ? (guest.invitation.expiresAt && new Date(guest.invitation.expiresAt) < new Date() ? 'Hết hạn' : 'Có thiệp') : 'Chưa có'}</td>
                <td><button className="danger" onClick={() => void removeGuest(guest)}>Xóa</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
