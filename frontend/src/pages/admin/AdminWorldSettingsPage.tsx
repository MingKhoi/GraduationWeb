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
    try {
      const saved = await apiRequest<WorldSettings>('/world-settings/admin', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setSettings(saved);
      setSuccess('Đã lưu cài đặt thế giới.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu cài đặt');
    }
  };

  const setField = (field: keyof WorldSettings, value: string) => {
    setSettings((current) => current ? { ...current, [field]: value || null } : current);
  };

  if (!settings) return <p className="admin-loading">Đang tải cài đặt...</p>;

  return (
    <section>
      <h1>Cài đặt thế giới</h1>
      {error && <p className="admin-error">{error}</p>}
      {success && <p className="admin-success">{success}</p>}
      <form className="admin-form" onSubmit={update}>
        <label>Tên sự kiện<input value={settings.eventTitle} onChange={(e) => setField('eventTitle', e.target.value)} /></label>
        <label>Ngày sự kiện<input type="date" value={settings.eventDate?.slice(0, 10) ?? ''} onChange={(e) => setField('eventDate', e.target.value)} /></label>
        <label>Mô tả<textarea value={settings.eventDescription ?? ''} onChange={(e) => setField('eventDescription', e.target.value)} /></label>
        <label>Lời chào<textarea value={settings.welcomeMessage ?? ''} onChange={(e) => setField('welcomeMessage', e.target.value)} /></label>
        <label>Tên thế giới<input value={settings.worldName} onChange={(e) => setField('worldName', e.target.value)} /></label>
        <label>URL nhạc nền<input type="url" value={settings.musicUrl ?? ''} onChange={(e) => setField('musicUrl', e.target.value)} /></label>
        <label>Môi trường<select value={settings.environment} onChange={(e) => setField('environment', e.target.value)}><option value="night">Night</option><option value="day">Day</option><option value="campus">Campus</option></select></label>
        <label>Thông báo công khai<textarea value={settings.announcement ?? ''} onChange={(e) => setField('announcement', e.target.value)} /></label>
        <button>Lưu cài đặt</button>
      </form>
    </section>
  );
}
