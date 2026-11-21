import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '../../services/api';

interface WorldSettings {
  eventTitle: string;
  eventDate: string | null;
  eventDescription: string | null;
  welcomeMessage: string | null;
  worldName: string;
  musicUrl: string | null;
  environment: string;
  announcement: string | null;
}

export default function AdminWorldSettingsPage() {
  const [settings, setSettings] = useState<WorldSettings | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    apiRequest<WorldSettings>('/world-settings/admin')
      .then(setSettings)
      .catch((err) => setError(err instanceof Error ? err.message : 'Không thể tải cài đặt'));
  }, []);

  const update = async (event: FormEvent) => {
    event.preventDefault();
    if (!settings) return;
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      const saved = await apiRequest<WorldSettings>('/world-settings/admin', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setSettings(saved);
      setSuccess('✓ Đã lưu cài đặt thế giới.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu cài đặt');
    } finally {
      setIsSaving(false);
    }
  };

  const setField = (field: keyof WorldSettings, value: string) => {
    setSettings((current) => current ? { ...current, [field]: value || null } : current);
  };

  if (!settings) {
    return (
      error
        ? <p className="admin-error" role="alert">⚠️ {error}</p>
        : <p className="admin-loading">
            <span className="admin-spinner" aria-hidden="true" />
            Đang tải cài đặt...
          </p>
    );
  }

  return (
    <section className="admin-settings-page">
      {error && <p className="admin-error">{error}</p>}
      {success && <p className="admin-success">{success}</p>}
      <form className="admin-settings-form" onSubmit={update}>
        <div className="admin-panel">
          <div className="admin-settings-panel-title">
            <span aria-hidden="true">✦</span>
            <div>
              <h2>Thông tin sự kiện</h2>
              <p className="admin-panel-sub">Các nội dung cơ bản hiển thị trong lời mời của bạn.</p>
            </div>
          </div>
          <div className="admin-form-grid">
            <label>Tên sự kiện<input value={settings.eventTitle} onChange={(e) => setField('eventTitle', e.target.value)} required /></label>
            <label>Ngày sự kiện<input type="date" value={settings.eventDate?.slice(0, 10) ?? ''} onChange={(e) => setField('eventDate', e.target.value)} /></label>
          </div>
          <label>Mô tả sự kiện<textarea value={settings.eventDescription ?? ''} onChange={(e) => setField('eventDescription', e.target.value)} rows={3} /></label>
          <label>Lời chào khách mời<textarea value={settings.welcomeMessage ?? ''} onChange={(e) => setField('welcomeMessage', e.target.value)} rows={3} /></label>
        </div>
        <div className="admin-panel">
          <div className="admin-settings-panel-title">
            <span aria-hidden="true">☁</span>
            <div>
              <h2>Thế giới &amp; thông báo</h2>
              <p className="admin-panel-sub">Tùy chỉnh không gian và thông tin gửi đến khách.</p>
            </div>
          </div>
          <div className="admin-form-grid">
            <label>Tên thế giới<input value={settings.worldName} onChange={(e) => setField('worldName', e.target.value)} required /></label>
            <label>Môi trường<select value={settings.environment} onChange={(e) => setField('environment', e.target.value)}><option value="night">Ban đêm</option><option value="day">Ban ngày</option><option value="campus">Khuôn viên trường</option></select></label>
          </div>
          <label>URL nhạc nền<input type="url" value={settings.musicUrl ?? ''} onChange={(e) => setField('musicUrl', e.target.value)} placeholder="https://..." /></label>
          <label>Thông báo công khai<textarea value={settings.announcement ?? ''} onChange={(e) => setField('announcement', e.target.value)} rows={3} /></label>
        </div>
        <div className="admin-settings-actions">
          <span>Các thay đổi chỉ được áp dụng sau khi lưu.</span>
          <button disabled={isSaving}>{isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}</button>
        </div>
      </form>
    </section>
  );
}
