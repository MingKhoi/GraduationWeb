import { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';

interface Overview {
  totalGuests: number;
  attendingGuests: number;
  notAttendingGuests: number;
  pendingGuests: number;
  totalInvitations: number;
  activeInvitations: number;
  expiredInvitations: number;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<Overview>('/admin/overview')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu'));
  }, []);

  if (error) return <p className="admin-error">{error}</p>;
  if (!data) return <p className="admin-loading">Đang tải tổng quan...</p>;

  const cards = [
    ['Tổng khách', data.totalGuests],
    ['Sẽ tham dự', data.attendingGuests],
    ['Chưa phản hồi', data.pendingGuests],
    ['Không tham dự', data.notAttendingGuests],
    ['Thiệp đã phát', data.totalInvitations],
    ['Thiệp còn hiệu lực', data.activeInvitations],
  ];

  return (
    <section>
      <h1>Tổng quan sự kiện</h1>
      <div className="admin-cards">
        {cards.map(([label, value]) => (
          <article key={String(label)}><span>{label}</span><strong>{value}</strong></article>
        ))}
      </div>
    </section>
  );
}
