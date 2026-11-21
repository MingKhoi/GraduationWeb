import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '../../services/api';

interface GuestWithInvitation {
  id: string;
  fullName: string;
  invitation: { expiresAt: string | null; message: string | null; createdAt: string } | null;
}

export default function AdminInvitationsPage() {
  const [guests, setGuests] = useState<GuestWithInvitation[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<GuestWithInvitation | null>(null);
  const [invitationMessage, setInvitationMessage] = useState('');
  const [invitationExpiresAt, setInvitationExpiresAt] = useState('');
  const [createdUrl, setCreatedUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = () => apiRequest<GuestWithInvitation[]>('/guests')
    .then(setGuests)
    .catch((err) => setError(err instanceof Error ? err.message : 'Không thể tải thiệp'));

  useEffect(() => { void load(); }, []);

  const copyInvitationLink = async (url: string) => {
    if (!navigator.clipboard?.writeText) return false;
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedGuest) return;

    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      const result = await apiRequest<{ invitationUrl: string }>('/invitations', {
        method: 'POST',
        body: JSON.stringify({
          guestId: selectedGuest.id,
          message: invitationMessage.trim(),
          ...(invitationExpiresAt ? { expiresAt: new Date(`${invitationExpiresAt}T23:59:59`).toISOString() } : {}),
        }),
      });
      setCreatedUrl(result.invitationUrl);
      let successMessage = '✓ Đã tạo thiệp. Bạn có thể sao chép liên kết bên dưới.';
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(result.invitationUrl);
          successMessage = '✓ Đã tạo thiệp và sao chép liên kết.';
        } catch {
          successMessage = '✓ Đã tạo thiệp; hãy sao chép liên kết bên dưới.';
        }
      }
      setSuccess(successMessage);
      setSelectedGuest(null);
      setInvitationMessage('');
      setInvitationExpiresAt('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo thiệp');
    } finally {
      setIsSaving(false);
    }
  };

  const reissue = async (guestId: string) => {
    setError('');
    setSuccess('');
    try {
      const result = await apiRequest<{ invitationUrl: string }>(`/invitations/reissue/${guestId}`, { method: 'PATCH' });
      setCreatedUrl(result.invitationUrl);
      const copied = await copyInvitationLink(result.invitationUrl);
      setSuccess(copied
        ? '✓ Đã cấp lại thiệp và sao chép liên kết.'
        : '✓ Đã cấp lại thiệp. Hãy sao chép liên kết bên dưới.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cấp lại thiệp');
    }
  };

  const revoke = async (guestId: string) => {
    if (!window.confirm('Thu hồi thiệp và các phiên guest hiện tại?')) return;
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/invitations/revoke/${guestId}`, { method: 'DELETE' });
      setSuccess('✓ Đã thu hồi thiệp.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thu hồi thiệp');
    }
  };

  const pickGuest = (guest: GuestWithInvitation) => {
    setSelectedGuest(guest);
    setInvitationMessage('');
    setInvitationExpiresAt('');
    setError('');
    setSuccess('');
    setCreatedUrl('');
  };

  const hasInvitation = guests.filter((guest) => guest.invitation).length;
  const unlimitedInvitationCount = guests.filter((guest) => (
    guest.invitation && !guest.invitation.expiresAt
  )).length;

  return (
    <section className="admin-invitations-page">
      <div className="admin-invitation-stats">
        <article><span aria-hidden="true">✉</span><strong>{guests.length}</strong><small>Khách trong danh sách</small></article>
        <article className="is-active"><span aria-hidden="true">✓</span><strong>{hasInvitation}</strong><small>Đã có thiệp</small></article>
        <article className="is-pending"><span aria-hidden="true">∞</span><strong>{unlimitedInvitationCount}</strong><small>Thiệp không giới hạn</small></article>
      </div>
      {error && <p className="admin-error">⚠️ {error}</p>}
      {success && <p className="admin-success">{success}</p>}
      {createdUrl && (
        <p className="admin-invitation-url">
          <span aria-hidden="true">🔗</span>
          <a href={createdUrl}>{createdUrl}</a>
        </p>
      )}
      {selectedGuest && (
        <form className="admin-form admin-invitation-composer" onSubmit={(event) => void create(event)}>
          <div className="admin-invitation-form-heading">
            <span aria-hidden="true">✉</span>
            <div>
              <h2>Soạn lời mời</h2>
              <p className="admin-panel-sub">Dành riêng cho {selectedGuest.fullName}</p>
            </div>
          </div>
          <p className="admin-panel-sub">Lời mời sẽ hiển thị trên thiệp của khách.</p>
          <label>
            Nội dung lời mời
            <textarea
              value={invitationMessage}
              maxLength={120}
              onChange={(event) => setInvitationMessage(event.target.value)}
              placeholder="Ví dụ: Trân trọng kính mời bạn đến chung vui trong ngày tốt nghiệp của mình."
              required
            />
          </label>
          <div className="admin-form-grid">
            <label>
              Hết hạn vào ngày (tùy chọn)
              <input
                type="date"
                value={invitationExpiresAt}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setInvitationExpiresAt(event.target.value)}
              />
            </label>
            <p className="admin-form-hint">
              {invitationMessage.length}/120 ký tự<br />
              Bỏ trống ngày hết hạn nếu thiệp không giới hạn thời gian.
            </p>
          </div>
          <div className="admin-invitation-actions">
            <button disabled={!invitationMessage.trim() || isSaving}>Tạo thiệp</button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setSelectedGuest(null);
                setInvitationMessage('');
                setInvitationExpiresAt('');
              }}
            >
              Hủy
            </button>
          </div>
        </form>
      )}
      <div className="admin-toolbar">
        <div className="admin-list-title">
          <h2>Danh sách thiệp mời</h2>
          <p>Đã tạo {hasInvitation} trên tổng số {guests.length} khách.</p>
        </div>
        <span className="admin-count-pill">{guests.length} khách</span>
      </div>
      {guests.length === 0 ? (
        <div className="admin-empty">
          <span className="admin-empty-icon" aria-hidden="true">💌</span>
          <strong>Chưa có khách mời nào</strong>
          <p>Hãy thêm khách ở trang "Khách mời" trước khi soạn thiệp.</p>
        </div>
      ) : (
        <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th>Khách</th><th>Lời mời</th><th>Hết hạn</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>{guests.map((guest) => {
            const isExpired = guest.invitation?.expiresAt && new Date(guest.invitation.expiresAt) < new Date();
            return (
              <tr key={guest.id}>
                <td data-label="Khách"><strong>{guest.fullName}</strong></td>
                <td data-label="Lời mời">{guest.invitation?.message ?? '—'}</td>
                <td data-label="Hết hạn">{guest.invitation?.expiresAt ? new Date(guest.invitation.expiresAt).toLocaleDateString('vi-VN') : 'Không giới hạn'}</td>
                <td data-label="Trạng thái">
                  {guest.invitation
                    ? <span className={`admin-badge ${isExpired ? 'is-expired' : 'is-active'}`}>{isExpired ? 'Hết hạn' : 'Đang hoạt động'}</span>
                    : <span className="admin-badge is-none">Chưa có thiệp</span>}
                </td>
                <td data-label="Thao tác">
                  {guest.invitation ? (
                    <>
                      <button className="ghost" onClick={() => void reissue(guest.id)}>Cấp lại</button>
                      {' '}
                      <button className="danger" onClick={() => void revoke(guest.id)}>Thu hồi</button>
                    </>
                  ) : (
                    <button onClick={() => pickGuest(guest)}>Soạn lời mời</button>
                  )}
                </td>
              </tr>
            );
          })}</tbody>
        </table></div>
      )}
    </section>
  );
}
