import { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';

interface GuestRsvp { id: string; fullName: string; rsvp: { status: string } | null }

export default function AdminRsvpsPage() {
  const [guests, setGuests] = useState<GuestRsvp[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<GuestRsvp[]>('/guests')
      .then(setGuests)
      .catch((err) => setError(err instanceof Error ? err.message : 'Không thể tải RSVP'));
  }, []);

  return (
    <section>
      <h1>Danh sách RSVP</h1>
      {error && <p className="admin-error">{error}</p>}
      {guests.length === 0 ? <p>Chưa có dữ liệu RSVP.</p> : (
        <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th>Khách</th><th>Trạng thái</th></tr></thead>
          <tbody>{guests.map((guest) => <tr key={guest.id}><td>{guest.fullName}</td><td>{guest.rsvp?.status ?? 'PENDING'}</td></tr>)}</tbody>
        </table></div>
      )}
    </section>
  );
}
