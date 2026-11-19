import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '../../services/api';

interface GuestWithInvitation {
  id: string;
  fullName: string;
  invitation: { expiresAt: string | null; message: string | null } | null;
}

export default function AdminInvitationsPage() {
  const [guests, setGuests] = useState<GuestWithInvitation[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<GuestWithInvitation | null>(null);
  const [invitationMessage, setInvitationMessage] = useState('');
  const [createdUrl, setCreatedUrl] = useState('');

  const load = () => apiRequest<GuestWithInvitation[]>('/guests')
    .then(setGuests)
    .catch((err) => setError(err instanceof Error ? err.message : 'Không thể tải thiệp'));

  useEffect(() => { void load(); }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedGuest) return;

    setError('');
    setSuccess('');
    try {
      const result = await apiRequest<{ invitationUrl: string }>('/invitations', {
        method: 'POST',
        body: JSON.stringify({
          guestId: selectedGuest.id,
          message: invitationMessage.trim(),
        }),
      });
      setCreatedUrl(result.invitationUrl);
      let successMessage = 'Đã tạo thiệp. Bạn có thể sao chép liên kết bên dưới.';
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(result.invitationUrl);
          successMessage = 'Đã tạo thiệp và sao chép liên kết.';
        } catch {
          successMessage = 'Đã tạo thiệp; trình duyệt không cho phép tự sao chép. Hãy sao chép liên kết bên dưới.';
        }
      }
      setSuccess(successMessage);
      setSelectedGuest(null);
      setInvitationMessage('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo thiệp');
    }
  };

  const reissue = async (guestId: string) => {
    setError('');
    try {
      const result = await apiRequest<{ invitationUrl: string }>(`/invitations/reissue/${guestId}`, { method: 'PATCH' });
      await navigator.clipboard?.writeText(result.invitationUrl);
      setSuccess('Đã cấp lại thiệp và sao chép liên kết.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cấp lại thiệp');
    }
  };

  const revoke = async (guestId: string) => {
    if (!window.confirm('Thu hồi thiệp và các phiên guest hiện tại?')) return;
    await apiRequest(`/invitations/revoke/${guestId}`, { method: 'DELETE' });
    setSuccess('Đã thu hồi thiệp.');
    await load();
  };

  return (
    <section>
      <h1>Quản lý thiệp mời</h1>
      {error && <p className="admin-error">{error}</p>}
      {success && <p className="admin-success">{success}</p>}
      {createdUrl && <p className="admin-invitation-url"><a href={createdUrl}>{createdUrl}</a></p>}
      {selectedGuest && (
        <form className="admin-form admin-invitation-composer" onSubmit={(event) => void create(event)}>
          <h2>Soạn lời mời cho {selectedGuest.fullName}</h2>
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
          <small>{invitationMessage.length}/120 ký tự</small>
          <div className="admin-invitation-actions">
            <button disabled={!invitationMessage.trim()}>Tạo thiệp</button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setSelectedGuest(null);
                setInvitationMessage('');
              }}
            >
              Hủy
            </button>
          </div>
        </form>
      )}
      {guests.length === 0 ? <p>Chưa có khách mời.</p> : (
        <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th>Khách</th><th>Lời mời</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>{guests.map((guest) => (
            <tr key={guest.id}>
              <td>{guest.fullName}</td>
              <td>{guest.invitation?.message ?? '—'}</td>
              <td>{guest.invitation ? (guest.invitation.expiresAt && new Date(guest.invitation.expiresAt) < new Date() ? 'Hết hạn' : 'Đang hoạt động') : 'Chưa có thiệp'}</td>
              <td>
                {guest.invitation ? (
                  <>
                    <button onClick={() => void reissue(guest.id)}>Cấp lại</button>
                    {' '}
                    <button className="danger" onClick={() => void revoke(guest.id)}>Thu hồi</button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedGuest(guest);
                      setInvitationMessage('');
                      setError('');
                      setSuccess('');
                      setCreatedUrl('');
                    }}
                  >
                    Soạn lời mời
                  </button>
                )}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </section>
  );
}
