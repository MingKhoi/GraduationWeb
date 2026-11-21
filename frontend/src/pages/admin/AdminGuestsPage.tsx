import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { apiRequest } from '../../services/api';

interface AdminGuest {
  id: string;
  fullName: string;
  email: string | null;
  rsvp: { status: string } | null;
  invitation: { expiresAt: string | null } | null;
}

const rsvpBadge: Record<string, string> = {
  ATTENDING: 'is-attending',
  NOT_ATTENDING: 'is-expired',
  PENDING: 'is-pending',
};

type GuestFilter = 'ALL' | 'ATTENDING' | 'PENDING' | 'NOT_ATTENDING';

const guestFilters: Array<{ value: GuestFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'ATTENDING', label: 'Sẽ tham dự' },
  { value: 'PENDING', label: 'Chờ phản hồi' },
  { value: 'NOT_ATTENDING', label: 'Không tham dự' },
];

export default function AdminGuestsPage() {
  const [guests, setGuests] = useState<AdminGuest[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<GuestFilter>('ALL');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (query: string) => {
    setError('');
    try {
      setGuests(await apiRequest<AdminGuest[]>(`/guests${query ? `?search=${encodeURIComponent(query)}` : ''}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải khách mời');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(search.trim()), search.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const filteredGuests = useMemo(
    () => filter === 'ALL'
      ? guests
      : guests.filter((guest) => (guest.rsvp?.status ?? 'PENDING') === filter),
    [filter, guests],
  );

  const createGuest = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setIsSaving(true);
    try {
      await apiRequest('/guests', {
        method: 'POST',
        body: JSON.stringify({ fullName, email: email || undefined }),
      });
      setFullName('');
      setEmail('');
      setMessage('✓ Đã tạo khách mời.');
      await load(search.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo khách mời');
    } finally {
      setIsSaving(false);
    }
  };

  const removeGuest = async (guest: AdminGuest) => {
    if (!window.confirm(`Xóa khách mời ${guest.fullName}?`)) return;
    setError('');
    try {
      await apiRequest(`/guests/${guest.id}`, { method: 'DELETE' });
      setMessage(`✓ Đã xóa khách mời ${guest.fullName}.`);
      await load(search.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa khách mời');
    }
  };

  return (
    <section className="admin-guests-page">
      {error && <p className="admin-error">⚠️ {error}</p>}
      {message && <p className="admin-success">{message}</p>}
      <form className="admin-inline admin-guest-create" onSubmit={createGuest}>
        <span className="admin-create-icon" aria-hidden="true">♙</span>
        <div className="admin-create-copy">
          <strong>Thêm khách mời mới</strong>
          <small>Nhập tên và thông tin liên hệ của khách.</small>
        </div>
        <label className="admin-sr-only" htmlFor="guest-full-name">Họ tên khách mời</label>
        <input id="guest-full-name" placeholder="Họ tên khách mời" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <label className="admin-sr-only" htmlFor="guest-email">Email khách mời (tùy chọn)</label>
        <input id="guest-email" placeholder="Email (tùy chọn)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button disabled={isSaving}>{isSaving ? 'Đang thêm...' : '+ Thêm khách'}</button>
      </form>
      <div className="admin-guest-list-header">
        <div>
          <h2>Danh sách khách mời</h2>
          <p>Quản lý danh sách và trạng thái phản hồi.</p>
        </div>
        <span className="admin-count-pill">{guests.length} khách</span>
      </div>
      <div className="admin-guest-tools">
        <label className="admin-search-wrap">
          <span aria-hidden="true">⌕</span>
          <input
            className="admin-search"
            placeholder="Tìm theo tên hoặc email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm theo tên hoặc email"
          />
        </label>
        <div className="admin-filter-pills" role="group" aria-label="Lọc khách theo RSVP">
          {guestFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              className={filter === item.value ? 'active' : ''}
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <p className="admin-loading"><span className="admin-spinner" aria-hidden="true" />Đang tải khách mời...</p>
      ) : filteredGuests.length === 0 ? (
        <div className="admin-empty">
          <span className="admin-empty-icon" aria-hidden="true">👥</span>
          <strong>{guests.length ? 'Không tìm thấy khách phù hợp' : 'Chưa có khách mời nào'}</strong>
          <p>{guests.length ? 'Thử từ khóa hoặc bộ lọc khác.' : 'Thêm khách đầu tiên bằng biểu mẫu phía trên.'}</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Khách mời</th><th>Email</th><th>Phản hồi</th><th>Thiệp mời</th><th></th></tr></thead>
            <tbody>{filteredGuests.map((guest) => {
              const isExpired = guest.invitation?.expiresAt && new Date(guest.invitation.expiresAt) < new Date();
              return (
                <tr key={guest.id}>
                  <td data-label="Khách mời">
                    <span className="admin-guest-cell">
                      <span className="admin-guest-avatar" aria-hidden="true">{guest.fullName.trim().charAt(0).toUpperCase()}</span>
                      <strong>{guest.fullName}</strong>
                    </span>
                  </td>
                  <td data-label="Email">{guest.email ?? '—'}</td>
                  <td data-label="Phản hồi">
                    <span className={`admin-badge ${rsvpBadge[guest.rsvp?.status ?? 'PENDING'] ?? 'is-pending'}`}>
                      {guest.rsvp?.status === 'ATTENDING' ? 'Sẽ tham dự' : guest.rsvp?.status === 'NOT_ATTENDING' ? 'Không tham dự' : 'Chờ phản hồi'}
                    </span>
                  </td>
                  <td data-label="Thiệp mời">
                    {guest.invitation
                      ? <span className={`admin-badge ${isExpired ? 'is-expired' : 'is-active'}`}>{isExpired ? 'Hết hạn' : 'Có thiệp'}</span>
                      : <span className="admin-badge is-none">Chưa có</span>}
                  </td>
                  <td data-label="Thao tác"><button className="danger" onClick={() => void removeGuest(guest)}>Xóa</button></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
