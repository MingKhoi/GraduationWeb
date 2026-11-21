import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../services/api';

interface GuestRsvp { id: string; fullName: string; rsvp: { status: string } | null }

type RsvpFilter = 'ALL' | 'ATTENDING' | 'PENDING' | 'NOT_ATTENDING';

const rsvpMeta: Record<string, { label: string; tone: string }> = {
  ATTENDING: { label: 'Sẽ tham dự', tone: 'is-attending' },
  NOT_ATTENDING: { label: 'Không tham dự', tone: 'is-expired' },
  PENDING: { label: 'Chưa phản hồi', tone: 'is-pending' },
};

export default function AdminRsvpsPage() {
  const [guests, setGuests] = useState<GuestRsvp[]>([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RsvpFilter>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiRequest<GuestRsvp[]>('/guests')
      .then(setGuests)
      .catch((err) => setError(err instanceof Error ? err.message : 'Không thể tải RSVP'))
      .finally(() => setIsLoading(false));
  }, []);

  const counts = guests.reduce<Record<string, number>>((acc, guest) => {
    const status = guest.rsvp?.status ?? 'PENDING';
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});
  const filteredGuests = useMemo(() => guests.filter((guest) => {
    const status = guest.rsvp?.status ?? 'PENDING';
    const matchesStatus = filter === 'ALL' || status === filter;
    return matchesStatus && guest.fullName.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'));
  }), [filter, guests, search]);

  return (
    <section className="admin-rsvps-page">
      {error && <p className="admin-error">⚠️ {error}</p>}
      <div className="admin-rsvp-summary">
        <article className="is-attending">
          <span>✓</span><div><strong>{counts.ATTENDING ?? 0}</strong><small>Sẽ tham dự</small></div>
        </article>
        <article className="is-pending">
          <span>◷</span><div><strong>{counts.PENDING ?? 0}</strong><small>Chưa phản hồi</small></div>
        </article>
        <article className="is-declined">
          <span>×</span><div><strong>{counts.NOT_ATTENDING ?? 0}</strong><small>Không tham dự</small></div>
        </article>
        <article className="is-total">
          <span>♙</span><div><strong>{guests.length}</strong><small>Tổng khách mời</small></div>
        </article>
      </div>
      <div className="admin-rsvp-tools">
        <label className="admin-search-wrap">
          <span aria-hidden="true">⌕</span>
          <input
            className="admin-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm tên khách mời"
            aria-label="Tìm tên khách mời"
          />
        </label>
        <div className="admin-filter-pills" role="group" aria-label="Lọc trạng thái RSVP">
          {([
            ['ALL', 'Tất cả'],
            ['ATTENDING', 'Sẽ tham dự'],
            ['PENDING', 'Chờ phản hồi'],
            ['NOT_ATTENDING', 'Không tham dự'],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="admin-rsvp-list-heading">
        <div><h2>Phản hồi khách mời</h2><p>Cập nhật trạng thái tham dự theo thời gian thực.</p></div>
        <span className="admin-count-pill">{filteredGuests.length} khách</span>
      </div>
      {isLoading ? (
        <p className="admin-loading"><span className="admin-spinner" aria-hidden="true" />Đang tải phản hồi...</p>
      ) : filteredGuests.length === 0 ? (
        <div className="admin-empty">
          <span className="admin-empty-icon" aria-hidden="true">📝</span>
          <strong>{guests.length ? 'Không tìm thấy phản hồi phù hợp' : 'Chưa có dữ liệu RSVP'}</strong>
          <p>{guests.length ? 'Thử từ khóa hoặc bộ lọc khác.' : 'Phản hồi của khách sẽ hiển thị tại đây.'}</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table admin-rsvp-table">
            <thead><tr><th>Khách mời</th><th>Trạng thái</th><th>Ghi nhận</th></tr></thead>
            <tbody>{filteredGuests.map((guest) => {
              const status = guest.rsvp?.status ?? 'PENDING';
              const meta = rsvpMeta[status];
              return (
                <tr key={guest.id}>
                  <td data-label="Khách mời"><span className="admin-guest-cell"><span className="admin-guest-avatar" aria-hidden="true">{guest.fullName.trim().charAt(0).toUpperCase()}</span><strong>{guest.fullName}</strong></span></td>
                  <td data-label="Trạng thái"><span className={`admin-badge ${meta?.tone ?? 'is-none'}`}>{meta?.label ?? status}</span></td>
                  <td data-label="Ghi nhận" className="admin-rsvp-last-updated">{guest.rsvp ? 'Đã gửi phản hồi' : 'Đang chờ phản hồi'}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
