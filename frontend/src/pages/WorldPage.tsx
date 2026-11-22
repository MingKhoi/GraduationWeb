import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toBlob } from 'html-to-image';
import { useAuth } from '../hooks/useAuth';
import GraduationStoryScene from '../world/GraduationStoryScene';
import RsvpActions from '../world/RsvpActions';
import { apiRequest } from '../services/api';
import type { RSVPStatus } from '../types/auth.types';

type ScriptStep = 'welcome' | 'teaser' | 'walking' | 'letter' | 'opening' | 'invitation' | 'explore';

type WorldSettings = {
    eventTitle: string;
    eventDate: string | null;
    eventDescription: string | null;
};

const invitationGateAddresses = [
    { label: 'Cổng 1', address: 'Cổng 1: 268 Đ. Lý Thường Kiệt, Điền Hồng, Hồ Chí Minh, Việt Nam' },
    { label: 'Cổng 3', address: 'Cổng 3: 142 Tô Hiến Thành, Điền Hồng, Hồ Chí Minh, Việt Nam' },
] as const;

function isInvitationNavigationState(state: unknown): state is { openInvitation: true } {
    return typeof state === 'object'
        && state !== null
        && 'openInvitation' in state
        && state.openInvitation === true;
}

function WorldPage() {
    const { guest } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const stageRef = useRef<HTMLElement | null>(null);
    const [step, setStep] = useState<ScriptStep>(
        () => isInvitationNavigationState(location.state) ? 'invitation' : 'welcome',
    );
    const [feedback, setFeedback] = useState('');
    const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');
    const [isCopyingAddress, setIsCopyingAddress] = useState(false);
    const [isSavingInvitation, setIsSavingInvitation] = useState(false);
    const [worldSettings, setWorldSettings] = useState<WorldSettings | null>(null);

    const guestName = guest?.fullName || guest?.profile?.nickname || 'bạn';
    const invitationMessage = guest?.invitation?.message?.trim()
        || 'Mời bạn đến chung vui và chúc mừng lễ tốt nghiệp cùng Khôi.';
    const welcomeLine = `Xin chào ${guestName}! Mình là Khôi. Chào mừng bạn đến với thế giới nhỏ của mình!`;
    const teaserLine = 'À, mà khoan! Mình có một món quà đặc biệt muốn gửi đến bạn. Theo mình nào!';
    const walkingLine = 'Đi thôi! Khôi đang dẫn bạn đến tấm thiệp đã chuẩn bị riêng.';
    const letterLine = 'Đến nơi rồi! Đây là tấm thiệp mình đã chuẩn bị riêng cho bạn. Nhấn vào để mở nhé!';
    const sceneStage = step === 'welcome' || step === 'explore'
        ? 'welcome'
        : step === 'teaser' || step === 'walking'
            ? 'walk'
            : step === 'letter' || step === 'opening'
                ? 'letter'
                : 'invitation';
    const sceneMotion = step === 'walking'
        ? 'walking'
        : step === 'opening'
            ? 'opening'
            : step === 'invitation'
                ? 'revealed'
                : 'idle';
    const dialogueLine = step === 'welcome'
        ? welcomeLine
        : step === 'teaser'
            ? teaserLine
            : step === 'walking'
                ? walkingLine
                : step === 'letter'
                    ? letterLine
                    : '';

    useEffect(() => {
        const delay = step === 'walking' ? 2400 : step === 'opening' ? 1000 : 0;
        if (!delay) return;

        const timer = window.setTimeout(
            () => setStep(step === 'walking' ? 'letter' : 'invitation'),
            delay,
        );
        return () => window.clearTimeout(timer);
    }, [step]);

    useEffect(() => {
        apiRequest<WorldSettings>('/world-settings')
            .then(setWorldSettings)
            .catch(() => setWorldSettings(null));
    }, []);

    useEffect(() => () => {
        window.speechSynthesis?.cancel();
    }, []);

    const playGreeting = (text: string) => {
        if (!('speechSynthesis' in window)) {
            setFeedback('Trình duyệt này chưa hỗ trợ phát giọng nói.');
            setFeedbackType('error');
            return;
        }

        window.speechSynthesis.cancel();
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = 'vi-VN';
        speech.rate = 0.95;
        speech.onerror = () => {
            setFeedback('Không thể phát lời thoại. Bạn vẫn có thể đọc nội dung trên màn hình.');
            setFeedbackType('error');
        };
        window.speechSynthesis.speak(speech);
    };

    const saveRsvp = async (status: RSVPStatus) => {
        await apiRequest<{ status?: RSVPStatus }>('/rsvps/me', {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    };

    const copyAddress = async (gate: (typeof invitationGateAddresses)[number]) => {
        setFeedback('');
        if (!navigator.clipboard?.writeText) {
            setFeedback('Trình duyệt này chưa hỗ trợ sao chép địa chỉ.');
            setFeedbackType('error');
            return;
        }

        setIsCopyingAddress(true);
        try {
            await navigator.clipboard.writeText(gate.address);
            setFeedback(`Đã sao chép địa chỉ ${gate.label}.`);
            setFeedbackType('success');
        } catch (error) {
            setFeedback(error instanceof Error
                ? `Không thể sao chép địa chỉ ${gate.label}: ${error.message}`
                : `Không thể sao chép địa chỉ ${gate.label}.`);
            setFeedbackType('error');
        } finally {
            setIsCopyingAddress(false);
        }
    };

    const saveInvitation = async () => {
        const stage = stageRef.current;
        if (!stage) {
            setFeedback('Không tìm thấy màn hình thiệp mời để lưu.');
            setFeedbackType('error');
            return;
        }

        setIsSavingInvitation(true);
        try {
            const imageBlob = await toBlob(stage, { cacheBust: true, pixelRatio: 2 });
            if (!imageBlob) {
                throw new Error('Trình duyệt không tạo được ảnh PNG.');
            }

            const imageUrl = URL.createObjectURL(imageBlob);
            const link = document.createElement('a');
            link.download = 'thiep-moi.png';
            link.href = imageUrl;
            document.body.appendChild(link);
            try {
                link.click();
            } finally {
                link.remove();
                window.setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);
            }
            setFeedback('Đã tải thiệp mời về thiết bị.');
            setFeedbackType('success');
        } catch (error) {
            setFeedback(error instanceof Error ? error.message : 'Không thể lưu thiệp mời.');
            setFeedbackType('error');
        } finally {
            setIsSavingInvitation(false);
        }
    };

    const formatEventDate = (value: string | null) => {
        if (!value) return 'Đang cập nhật';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Đang cập nhật';
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Asia/Ho_Chi_Minh',
        }).format(date);
    };

    const eventDateLabel = formatEventDate(worldSettings?.eventDate ?? null);

    return (
        <main className="graduation-world">
            <section className="world-mobile-experience">
                <section
                    ref={stageRef}
                    className="world-stage"
                    data-story-step={step}
                    aria-label={step === 'explore' ? 'Khám phá Graduation World' : 'Hành trình cùng Khôi'}
                >
                    <GraduationStoryScene stage={sceneStage} motion={sceneMotion} />

                    {step === 'opening' && (
                        <div className="world-opening" role="status" aria-label="Đang mở thiệp mời">
                            <span className="world-opening-letter" aria-hidden="true" />
                            <span className="world-opening-flap" aria-hidden="true" />
                        </div>
                    )}

                    {step === 'explore' ? (
                        <section className="world-explore-screen" aria-label="Khám phá Graduation World">
                            <header className="world-explore-header">
                                <button
                                    className="world-explore-back"
                                    onClick={() => setStep('invitation')}
                                    aria-label="Quay lại thiệp mời"
                                >
                                    ←
                                </button>
                                <span>GRADUATION WORLD</span>
                                <span className="world-explore-cap" aria-hidden="true">🎓</span>
                            </header>
                            <div className="world-explore-content">
                                <section className="world-explore-hero">
                                    <img
                                        src="/admin/campus-illustration.png"
                                        alt="Khuôn viên Graduation World"
                                    />
                                    <span className="world-explore-eyebrow">✦ THẾ GIỚI CỦA KHÔI ✦</span>
                                    <h1>Chào mừng đến<br />Graduation World!</h1>
                                    <p>
                                        Một góc nhỏ lưu giữ hành trình tốt nghiệp và những khoảnh khắc
                                        đáng nhớ cùng bạn bè.
                                    </p>
                                    <span className="world-explore-sparkle world-explore-sparkle--one" aria-hidden="true">✦</span>
                                    <span className="world-explore-sparkle world-explore-sparkle--two" aria-hidden="true">✧</span>
                                </section>
                                <p className="world-explore-greeting">
                                    <span aria-hidden="true">👋</span>
                                    {guestName}, bạn muốn khám phá điều gì tiếp theo?
                                </p>
                                <div className="world-explore-links">
                                    <button onClick={() => setStep('invitation')}>
                                        <span className="world-explore-link-icon" aria-hidden="true">✉</span>
                                        <span>
                                            <strong>Thiệp mời của bạn</strong>
                                            <small>Xem lại lời mời và thông tin buổi lễ</small>
                                        </span>
                                        <span className="world-explore-link-arrow" aria-hidden="true">→</span>
                                    </button>
                                    <button onClick={() => setStep('welcome')}>
                                        <span className="world-explore-link-icon world-explore-link-icon--gold" aria-hidden="true">🎓</span>
                                        <span>
                                            <strong>Hành trình cùng Khôi</strong>
                                            <small>Gặp lại Khôi và xem lại lời chào</small>
                                        </span>
                                        <span className="world-explore-link-arrow" aria-hidden="true">→</span>
                                    </button>
                                </div>
                                <p className="world-explore-footer">KẾT NỐI · QUẢN LÝ · TỎA SÁNG</p>
                            </div>
                        </section>
                    ) : step !== 'invitation' && step !== 'opening' ? (
                        <div key={step} className={`world-dialogue world-dialogue--${step}`} aria-live="polite">
                            <div className="world-dialogue-content">
                                <div className="world-speaker-row">
                                    <span className="world-speaker">Khôi</span>
                                    <button
                                        className="world-speak"
                                        onClick={() => playGreeting(dialogueLine)}
                                        aria-label="Nghe Khôi nói"
                                        title="Nghe lời thoại"
                                    >
                                        Nghe lời thoại
                                    </button>
                                </div>
                                <p>{dialogueLine}</p>
                                <div className="world-dialogue-actions">
                                    {step === 'welcome' && (
                                        <button className="world-primary-button" onClick={() => setStep('teaser')}>
                                            Tiếp tục <span aria-hidden="true">→</span>
                                        </button>
                                    )}
                                    {step === 'teaser' && (
                                        <>
                                            <button className="world-secondary-button" onClick={() => playGreeting(teaserLine)}>
                                                Nghe lại
                                            </button>
                                            <button className="world-primary-button" onClick={() => setStep('walking')}>
                                                Đi theo Khôi <span aria-hidden="true">→</span>
                                            </button>
                                        </>
                                    )}
                                    {step === 'letter' && (
                                        <button className="world-primary-button" onClick={() => setStep('opening')}>
                                            Mở thiệp <span aria-hidden="true">→</span>
                                        </button>
                                    )}
                                </div>
                                {feedback && (
                                    <p className={`world-feedback is-${feedbackType}`} role="status">
                                        {feedback}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : step === 'invitation' ? (
                        <section className="world-invitation-screen" aria-label="Thiệp mời tốt nghiệp">
                            <header className="world-invitation-heading">
                                <span className="world-invitation-heading-icon" aria-hidden="true">✦</span>
                            </header>
                            <img
                                className="world-invitation-card-banner"
                                src="/storyboard/banner.png"
                                alt="Thư mời lễ tốt nghiệp"
                            />
                            <div className="world-invitation-art">
                                <article className="world-invitation-card">

                                    <div className="world-invitation-card-head">

                                        <h1>{guestName}</h1>
                                    </div>
                                    <div className="world-invitation-card-body">
                                        <p className="world-invitation-card-message">
                                            {invitationMessage}
                                        </p>
                                        <div className="world-invitation-card-details">
                                            <div className="world-invitation-card-detail">
                                                {/* <span className="world-invitation-card-detail-icon" aria-hidden="true">◷</span> */}
                                                <div>
                                                    <span>Thời gian</span>
                                                    <strong>{eventDateLabel}</strong>
                                                    <strong>9h30–13h</strong>
                                                </div>
                                            </div>
                                            <div className="world-invitation-card-detail">
                                                {/* <span className="world-invitation-card-detail-icon" aria-hidden="true">⌖</span> */}
                                                <div>
                                                    <span>Địa điểm</span>
                                                    <div className="world-invitation-card-address-actions">
                                                        {invitationGateAddresses.map((gate) => (
                                                            <div className="world-invitation-card-address-row" key={gate.label}>
                                                                <strong>
                                                                    {gate.label}: {gate.label === 'Cổng 1'
                                                                        ? '268 Lý Thường Kiệt'
                                                                        : '142 Tô Hiến Thành'}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => void copyAddress(gate)}
                                                                        disabled={isCopyingAddress}
                                                                        aria-label={`Sao chép địa chỉ ${gate.label}`}
                                                                        title={`Sao chép địa chỉ ${gate.label}`}
                                                                    >
                                                                        <svg
                                                                            aria-hidden="true"
                                                                            viewBox="0 0 24 24"
                                                                            width="16"
                                                                            height="16"
                                                                            fill="none"
                                                                        >
                                                                            <rect x="8" y="8" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                                                                            <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                                        </svg>
                                                                    </button>
                                                                </strong>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            </div>
                            <div className="world-invitation-controls">
                                <p className="world-invitation-prompt">Bạn sẽ tham dự chứ?</p>
                                <div className="world-art-rsvp-section">
                                    <RsvpActions
                                        onSubmit={saveRsvp}
                                        initialStatus={guest?.rsvp?.status ?? null}
                                    />
                                </div>
                                <div className="world-invitation-actions">
                                    <button
                                        className="world-art-utility-button world-art-utility-button--save"
                                        onClick={() => void saveInvitation()}
                                        disabled={isSavingInvitation}
                                    >
                                        {isSavingInvitation ? 'Đang lưu...' : 'Lưu thiệp mời'}
                                    </button>
                                    {feedback && (
                                        <p className={`world-art-feedback is-${feedbackType}`} role="status">
                                            {feedback}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                className="world-explore-cta"
                                onClick={() => navigate('/')}
                            >
                                <span className="world-explore-cta-icon" aria-hidden="true">✦</span>
                                <span className="world-explore-cta-copy">
                                    <small>Tiếp tục khám phá</small>
                                </span>
                            </button>
                        </section>
                    ) : null}
                </section>
            </section>
            <div className="world-desktop-message">
                <p>Thiệp mời này được thiết kế cho điện thoại.</p>
                <span>Vui lòng mở đường dẫn trên điện thoại để tiếp tục.</span>
            </div>
        </main>
    );
}

export default WorldPage;
