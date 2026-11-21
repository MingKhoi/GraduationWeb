type InvitationBannerProps = {
    receiverName: string;
    invitationContent: string;
    eventDate: string | null;
    eventStartTime: string | null;
    eventEndTime: string | null;
    eventLocation: string | null;
};

function formatEventDate(value: string | null) {
    if (!value) return 'Đang cập nhật';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Đang cập nhật';

    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Ho_Chi_Minh',
    }).format(date);
}

function formatEventWeekday(value: string | null) {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('vi-VN', {
        weekday: 'long',
        timeZone: 'Asia/Ho_Chi_Minh',
    }).format(date);
}

function formatTimeRange(start: string | null, end: string | null) {
    if (start && end) return `${start} – ${end}`;
    if (start) return `Từ ${start}`;
    if (end) return `Đến ${end}`;
    return '';
}

export default function InvitationBanner({
    receiverName,
    invitationContent,
    eventDate,
    eventStartTime,
    eventEndTime,
    eventLocation,
}: InvitationBannerProps) {
    const locations = eventLocation
        ?.split(/\r?\n/)
        .map((location) => location.trim())
        .filter(Boolean) ?? [];

    return (
        <section className="invitation-banner" aria-label="Thông tin thiệp mời tốt nghiệp">
            <img
                className="invitation-banner-image"
                src="/storyboard/frameletter.png"
                alt="Khung thiệp mời tốt nghiệp"
            />
            <div className="invitation-banner-dynamic">
                <p className="invitation-banner-eyebrow">THƯ MỜI THAM DỰ LỄ TỐT NGHIỆP</p>
                {receiverName && <h1>{receiverName}</h1>}
                <div className="invitation-banner-divider" aria-hidden="true"><span>✦</span></div>
                {invitationContent && (
                    <p className="invitation-banner-content">{invitationContent}</p>
                )}
                <div className="invitation-banner-details">
                    <div className="invitation-banner-detail">
                        <span className="invitation-banner-detail-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none">
                                <rect x="3.5" y="5" width="17" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
                                <path d="M7.5 3v4M16.5 3v4M4 9.5h16M8 13h2M14 13h2M8 17h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                        </span>
                        <span className="invitation-banner-detail-copy">
                            <span className="invitation-banner-detail-label">Thời gian</span>
                            <strong>{formatEventDate(eventDate)}</strong>
                            {(formatEventWeekday(eventDate) || formatTimeRange(eventStartTime, eventEndTime)) && (
                                <span>
                                    {[formatEventWeekday(eventDate), formatTimeRange(eventStartTime, eventEndTime)]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </span>
                            )}
                        </span>
                    </div>
                    {locations.length > 0 && (
                        <div className="invitation-banner-detail invitation-banner-locations">
                            <span className="invitation-banner-detail-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" stroke="currentColor" strokeWidth="1.8" />
                                    <circle cx="12" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.8" />
                                </svg>
                            </span>
                            <span className="invitation-banner-detail-copy">
                                <span className="invitation-banner-detail-label">Địa điểm</span>
                                {locations.map((location) => <span key={location}>{location}</span>)}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
