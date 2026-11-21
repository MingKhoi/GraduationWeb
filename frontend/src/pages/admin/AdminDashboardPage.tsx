import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
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

  if (error) return <p className="admin-error">⚠️ {error}</p>;
  if (!data) {
    return (
      <p className="admin-loading">
        <span className="admin-spinner" aria-hidden="true" />
        Đang tải tổng quan...
      </p>
    );
  }

  const cards: Array<{ label: string; value: number; icon: string; hint: string; tone: string; to: string }> = [
    { label: 'Khách mời', value: data.totalGuests, icon: '♙', hint: 'Tổng khách trong danh sách', tone: 'blue', to: '/admin/guests' },
    { label: 'Sẽ tham dự', value: data.attendingGuests, icon: '✓', hint: 'Đã xác nhận tham dự', tone: 'green', to: '/admin/rsvps' },
    { label: 'Thiệp đã gửi', value: data.totalInvitations, icon: '✉', hint: `${data.activeInvitations} thiệp đang hoạt động`, tone: 'purple', to: '/admin/invitations' },
    { label: 'Chờ phản hồi', value: data.pendingGuests, icon: '◷', hint: `${data.notAttendingGuests} khách không tham dự`, tone: 'orange', to: '/admin/rsvps' },
  ];
  const responseRate = data.totalGuests
    ? Math.round(((data.attendingGuests + data.notAttendingGuests) / data.totalGuests) * 100)
    : 0;

  return (
    <section className="admin-dashboard">
      {error && <p className="admin-error">{error}</p>}
      <div className="admin-dashboard-welcome">
        <div>
          <span className="admin-eyebrow">BẢNG ĐIỀU KHIỂN</span>
          <h2>Ngày tốt nghiệp thật đáng nhớ!</h2>
          <p>Theo dõi khách mời và chuẩn bị cho ngày đặc biệt của bạn.</p>
          <Link to="/admin/invitations" className="admin-welcome-action">Tạo thiệp mời <span aria-hidden="true">→</span></Link>
        </div>
        <img src="/admin/campus-illustration.png" alt="" />
      </div>
      <div className="admin-cards">
        {cards.map(({ label, value, icon, hint, tone, to }) => (
          <Link key={label} to={to} className={`admin-stat-card is-${tone}`}>
            <span className="admin-stat-icon" aria-hidden="true">{icon}</span>
            <span className="admin-stat-label">{label}</span>
            <strong>{value}</strong>
            <small>{hint}</small>
            <span className="admin-stat-arrow" aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
      <div className="admin-dashboard-lower">
        <article className="admin-panel admin-response-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Tình hình phản hồi</h2>
              <p className="admin-panel-sub">Tiến độ xác nhận tham dự của khách mời</p>
            </div>
            <Link to="/admin/rsvps">Chi tiết <span aria-hidden="true">→</span></Link>
          </div>
          <div className="admin-response-summary">
            <div className="admin-response-ring" style={{ '--response-rate': `${responseRate}%` } as CSSProperties}>
              <span>{responseRate}<small>%</small></span>
            </div>
            <div className="admin-response-legend">
              <p><i className="is-attending" />Sẽ tham dự <strong>{data.attendingGuests}</strong></p>
              <p><i className="is-pending" />Chưa phản hồi <strong>{data.pendingGuests}</strong></p>
              <p><i className="is-declined" />Không tham dự <strong>{data.notAttendingGuests}</strong></p>
            </div>
          </div>
        </article>
        <article className="admin-panel admin-quick-panel">
          <h2>Bắt đầu nhanh</h2>
          <p className="admin-panel-sub">Các thao tác thường dùng</p>
          <Link to="/admin/guests"><span className="is-blue">♙</span><span>Thêm khách mời<small>Tạo hồ sơ khách mới</small></span><b>→</b></Link>
          <Link to="/admin/invitations"><span className="is-pink">✉</span><span>Soạn thiệp mời<small>Gửi lời mời cá nhân hóa</small></span><b>→</b></Link>
          <Link to="/admin/rsvps"><span className="is-green">✓</span><span>Xem RSVP<small>Theo dõi xác nhận tham dự</small></span><b>→</b></Link>
        </article>
      </div>
    </section>
  );
}
