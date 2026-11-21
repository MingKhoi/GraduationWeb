import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getProfileAvatarUrl, profilesService } from '../services/profiles.service';
import type { Guest, GuestProfile } from '../types/auth.types';
import './HomePage.css';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ProfileSetupModalProps {
    guest: Guest;
    onClose: () => void;
    onSaved: (profile: GuestProfile) => void;
}

function ProfileSetupModal({ guest, onClose, onSaved }: ProfileSetupModalProps) {
    const [nickname, setNickname] = useState(
        guest.profile?.nickname || guest.fullName.slice(0, 30),
    );
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
    const [hasAvatarPreviewError, setHasAvatarPreviewError] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const initial = nickname.trim().charAt(0).toUpperCase() || '?';
    const profileAvatarUrl = getProfileAvatarUrl(guest.profile?.avatarUrl);
    const displayedAvatarUrl = avatarPreviewUrl || profileAvatarUrl;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const avatarPreviewRef = useRef<string | null>(null);

    useEffect(() => {
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (isCameraOpen) {
                    setIsCameraOpen(false);
                    setIsCameraReady(false);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [isCameraOpen, onClose]);

    useEffect(() => () => {
        if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current);
    }, []);

    useEffect(() => {
        if (!isCameraOpen) return;
        let isActive = true;
        let cameraStream: MediaStream | null = null;
        const cameraVideo = videoRef.current;

        const startCamera = async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
                setCameraError('Trình duyệt này chưa hỗ trợ camera. Bạn có thể tải ảnh từ thiết bị.');
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: false,
                });
                if (!isActive) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                cameraStream = stream;
                if (cameraVideo) {
                    cameraVideo.srcObject = stream;
                    await cameraVideo.play();
                    if (isActive) setIsCameraReady(true);
                }
            } catch (error) {
                if (isActive) {
                    setCameraError(
                        error instanceof DOMException && error.name === 'NotAllowedError'
                            ? 'Bạn cần cấp quyền camera để chụp ảnh.'
                            : 'Không thể mở camera. Vui lòng kiểm tra quyền truy cập hoặc tải ảnh lên.',
                    );
                }
            }
        };

        void startCamera();
        return () => {
            isActive = false;
            cameraStream?.getTracks().forEach((track) => track.stop());
            if (cameraVideo) cameraVideo.srcObject = null;
        };
    }, [isCameraOpen]);

    const replaceAvatar = (file: File) => {
        if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current);
        const previewUrl = URL.createObjectURL(file);
        avatarPreviewRef.current = previewUrl;
        setAvatarFile(file);
        setAvatarPreviewUrl(previewUrl);
        setHasAvatarPreviewError(false);
        setErrorMessage('');
        setCameraError('');
    };

    const chooseAvatar = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
            setErrorMessage('Vui lòng chọn ảnh JPEG, PNG hoặc WebP.');
            return;
        }
        if (file.size > MAX_AVATAR_SIZE) {
            setErrorMessage('Ảnh đại diện không được vượt quá 5 MB.');
            return;
        }

        replaceAvatar(file);
    };

    const captureAvatar = async () => {
        const video = videoRef.current;
        if (!video || !isCameraReady) return;

        try {
            const scale = Math.min(1, 1200 / Math.max(video.videoWidth, video.videoHeight));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            const context = canvas.getContext('2d');
            if (!context || !canvas.width || !canvas.height) {
                throw new Error('Camera chưa sẵn sàng. Vui lòng thử chụp lại.');
            }
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const photo = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Không thể xử lý ảnh. Vui lòng chụp lại.'));
                    },
                    'image/jpeg',
                    0.9,
                );
            });
            replaceAvatar(new File([photo], 'avatar.jpg', { type: 'image/jpeg' }));
            setIsCameraOpen(false);
            setIsCameraReady(false);
        } catch (error) {
            setCameraError(
                error instanceof Error ? error.message : 'Không thể chụp ảnh. Vui lòng thử lại.',
            );
        }
    };

    const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedNickname = nickname.trim();
        if (!trimmedNickname) {
            setErrorMessage('Vui lòng nhập biệt danh của bạn.');
            return;
        }

        setIsSaving(true);
        setErrorMessage('');
        try {
            const profile = avatarFile
                ? await profilesService.uploadAvatar(avatarFile, trimmedNickname)
                : await profilesService.update({ nickname: trimmedNickname });
            onSaved(profile);
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Không thể lưu hồ sơ. Vui lòng thử lại.',
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div
            className="home-modal-backdrop"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                className="home-profile-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="home-profile-title"
            >
                <header>
                    <div>
                        <span className="home-modal-eyebrow">HOÀN THIỆN HỒ SƠ CỦA BẠN</span>
                        <h2 id="home-profile-title">Chỉnh avatar &amp; biệt danh</h2>
                    </div>
                    <button
                        type="button"
                        className="home-modal-close"
                        aria-label="Để sau"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>
                <p className="home-profile-description">
                    Thêm một chút dấu ấn riêng để bạn bè nhận ra bạn trong Graduation World nhé.
                </p>

                <form className="home-profile-form" onSubmit={saveProfile}>
                    <div className="home-profile-avatar-preview" aria-hidden="true">
                        {displayedAvatarUrl && !hasAvatarPreviewError ? (
                            <img
                                src={displayedAvatarUrl}
                                alt=""
                                onError={() => setHasAvatarPreviewError(true)}
                            />
                        ) : (
                            <span>{initial}</span>
                        )}
                    </div>
                    <label className="home-profile-field">
                        Biệt danh
                        <input
                            type="text"
                            value={nickname}
                            onChange={(event) => setNickname(event.target.value)}
                            maxLength={30}
                            placeholder="Ví dụ: Minh Anh"
                            required
                        />
                    </label>
                    <input
                        ref={fileInputRef}
                        className="home-profile-file-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        aria-label="Chọn ảnh đại diện từ thiết bị"
                        onChange={chooseAvatar}
                    />
                    <div className="home-profile-avatar-actions">
                        <button
                            className="home-profile-photo-button"
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Tải ảnh lên
                        </button>
                        <button
                            className="home-profile-photo-button"
                            type="button"
                            onClick={() => {
                                setCameraError('');
                                setIsCameraReady(false);
                                setIsCameraOpen(true);
                            }}
                        >
                            Chụp ảnh
                        </button>
                    </div>
                    <p className="home-profile-hint">JPEG, PNG hoặc WebP · Tối đa 5 MB</p>
                    {isCameraOpen && (
                        <div className="home-profile-camera">
                            <div className="home-profile-camera-preview">
                                <video ref={videoRef} autoPlay muted playsInline />
                                {!isCameraReady && !cameraError && (
                                    <span role="status">Đang mở camera...</span>
                                )}
                            </div>
                            {cameraError && (
                                <p className="home-profile-error" role="alert">{cameraError}</p>
                            )}
                            <div className="home-profile-avatar-actions">
                                <button
                                    className="home-profile-photo-button"
                                    type="button"
                                    onClick={() => {
                                        setIsCameraOpen(false);
                                        setIsCameraReady(false);
                                    }}
                                >
                                    Đóng camera
                                </button>
                                <button
                                    className="home-modal-action"
                                    type="button"
                                    disabled={!isCameraReady}
                                    onClick={() => void captureAvatar()}
                                >
                                    Chụp ảnh
                                </button>
                            </div>
                        </div>
                    )}
                    {errorMessage && (
                        <p className="home-profile-error" role="alert">{errorMessage}</p>
                    )}
                    <div className="home-profile-actions">
                        <button
                            className="home-profile-later"
                            type="button"
                            onClick={onClose}
                        >
                            Để sau
                        </button>
                        <button
                            className="home-modal-action"
                            type="submit"
                            disabled={isSaving}
                        >
                            {isSaving ? 'Đang lưu...' : 'Lưu hồ sơ'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

function HomeAvatar({ guestName, avatarUrl }: { guestName: string; avatarUrl: string | null }) {
    const [hasAvatarError, setHasAvatarError] = useState(false);
    const initial = guestName.trim().charAt(0).toUpperCase() || '?';
    const imageUrl = getProfileAvatarUrl(avatarUrl);

    return (
        <span className="home-brand-avatar" role="img" aria-label={`Avatar của ${guestName}`}>
            {imageUrl && !hasAvatarError ? (
                <img
                    src={imageUrl}
                    alt=""
                    onError={() => setHasAvatarError(true)}
                />
            ) : (
                <span aria-hidden="true">{initial}</span>
            )}
        </span>
    );
}

function HomePage() {
    const {
        guest,
        isAuthenticated,
        isLoading,
        updateGuestProfile,
    } = useAuth();
    const navigate = useNavigate();
    const [isInvitationOpen, setIsInvitationOpen] = useState(false);
    const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
    const [hasDismissedProfilePrompt, setHasDismissedProfilePrompt] = useState(false);

    const guestName = guest?.profile?.nickname || guest?.fullName || 'Khách mời';
    const shouldShowProfilePrompt = Boolean(
        !isLoading && guest && !guest.profile && !hasDismissedProfilePrompt,
    );
    const invitationMessage = guest?.invitation?.message?.trim()
        || 'Trân trọng kính mời bạn tham dự lễ tốt nghiệp và cùng lưu giữ những kỷ niệm thật đẹp.';

    const closeProfilePrompt = useCallback(() => {
        setIsProfileEditorOpen(false);
        setHasDismissedProfilePrompt(true);
    }, []);

    const handleProfileSaved = useCallback((profile: GuestProfile) => {
        updateGuestProfile(profile);
        setIsProfileEditorOpen(false);
        setHasDismissedProfilePrompt(true);
    }, [updateGuestProfile]);

    useEffect(() => {
        if (!isInvitationOpen) return;

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsInvitationOpen(false);
        };

        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [isInvitationOpen]);

    const viewInvitation = () => {
        if (isAuthenticated) {
            navigate('/world', { state: { openInvitation: true } });
            return;
        }
        setIsInvitationOpen(true);
    };

    const enterLobby = () => {
        if (isAuthenticated) {
            navigate('/lobby');
            return;
        }
        setIsInvitationOpen(true);
    };

    const enterWishes = () => {
        if (isAuthenticated) {
            navigate('/wishes');
            return;
        }
        setIsInvitationOpen(true);
    };

    const enterMemories = () => {
        if (isAuthenticated) {
            navigate('/memories');
            return;
        }
        setIsInvitationOpen(true);
    };

    if (isLoading) {
        return (
            <main className="home-page">
                <div className="home-loading" role="status">Đang tải Graduation World...</div>
            </main>
        );
    }

    return (
        <div className="home-page" id="home-top">
            <header className="home-header">
                <div className="home-brand">
                    <button
                        className="home-brand-avatar-button"
                        type="button"
                        aria-label={isAuthenticated ? 'Chỉnh avatar và biệt danh' : 'Mở thiệp mời'}
                        onClick={() => {
                            if (isAuthenticated) setIsProfileEditorOpen(true);
                            else setIsInvitationOpen(true);
                        }}
                    >
                        <HomeAvatar
                            key={guest?.profile?.avatarUrl || 'default-avatar'}
                            guestName={guestName}
                            avatarUrl={guest?.profile?.avatarUrl ?? null}
                        />
                    </button>
                    <a className="home-brand-logo-link" href="#home-top" aria-label="Graduation World, trang chủ">
                        <img className="home-brand-logo" src="/storyboard/logo.png" alt="" />
                    </a>
                </div>
                <button
                    className="home-invitation-button"
                    type="button"
                    aria-label="Xem thiệp mời"
                    onClick={viewInvitation}
                >
                    <img src="/storyboard/invitation-button.png" alt="" />
                </button>
            </header>

            <main className="home-main">
                <section className="home-welcome" aria-labelledby="home-welcome-title">
                    <h1 id="home-welcome-title">Xin chào, {guestName}!</h1>
                    <p>
                        Chào mừng bạn đến với thế giới nhỏ xíu của Khôi Bùi nhe!! Luv you so much 😘
                    </p>
                </section>

                <section className="home-campus-card" aria-label="Không gian Graduation World">
                    <img
                        src="/storyboard/campus-illustration.png"
                        alt="Khuôn viên trường Graduation World"
                    />
                    <div className="home-campus-caption">
                        <span>✦ MỘT HÀNH TRÌNH ĐÁNG NHỚ ✦</span>
                        <strong>Chào mừng đến với thế giới của Khôi</strong>
                    </div>
                </section>

                <section className="home-areas" aria-label="Các khu vực tương tác">
                    <button
                        className="home-area-card home-area-card--lobby"
                        id="sanh-cho"
                        type="button"
                        onClick={enterLobby}
                    >
                        <img className="home-area-icon" src="/storyboard/lobby-area-icon.png" alt="" />
                        <span className="home-area-copy">
                            <span className="home-area-title">Sảnh chờ</span>
                            <span className="home-area-description">Trò chuyện &amp; gửi icon hiệu ứng</span>
                        </span>
                    </button>

                    <button
                        className="home-area-card"
                        id="cay-loi-chuc"
                        type="button"
                        onClick={enterWishes}
                    >
                        <img className="home-area-icon" src="/storyboard/wishes-area-icon.png" alt="" />
                        <span className="home-area-copy">
                            <span className="home-area-title">Cây lời chúc</span>
                            <span className="home-area-description">Chọn màu giấy &amp; treo lời chúc</span>
                        </span>
                    </button>

                    <button
                        className="home-area-card"
                        id="goc-luu-niem"
                        type="button"
                        onClick={enterMemories}
                    >
                        <img className="home-area-icon" src="/storyboard/memories-area-icon.png" alt="" />
                        <span className="home-area-copy">
                            <span className="home-area-title">Góc lưu niệm</span>
                            <span className="home-area-description">Chụp, đăng tải &amp; lưu ảnh</span>
                        </span>
                    </button>
                </section>
            </main>


            {isInvitationOpen && (
                <div
                    className="home-modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setIsInvitationOpen(false);
                    }}
                >
                    <section
                        className="home-invitation-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="home-modal-title"
                    >
                        <header>
                            <div>
                                <span className="home-modal-eyebrow">THIỆP MỜI CỦA BẠN</span>
                                <h2 id="home-modal-title">
                                    {isAuthenticated ? guest?.fullName : 'Chào bạn!'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                className="home-modal-close"
                                aria-label="Đóng thiệp mời"
                                onClick={() => setIsInvitationOpen(false)}
                            >
                                ×
                            </button>
                        </header>
                        <p>
                            {isAuthenticated
                                ? invitationMessage
                                : 'Để xem thiệp mời cá nhân, vui lòng mở đường dẫn mời mà bạn nhận được.'}
                        </p>
                        {isAuthenticated && (
                            <div className="home-modal-details">
                                <span>🎓</span>
                                <div>
                                    <strong>Lễ tốt nghiệp của Minh Khôi</strong>
                                    <small>Graduation World · ĐH Bách Khoa</small>
                                </div>
                            </div>
                        )}
                        {isAuthenticated && (
                            <button
                                className="home-modal-action"
                                type="button"
                                onClick={() => navigate('/world')}
                            >
                                Bắt đầu hành trình <span aria-hidden="true">→</span>
                            </button>
                        )}
                    </section>
                </div>
            )}
            {(shouldShowProfilePrompt || isProfileEditorOpen) && guest && (
                <ProfileSetupModal
                    guest={guest}
                    onClose={closeProfilePrompt}
                    onSaved={handleProfileSaved}
                />
            )}
        </div>
    );
}

export default HomePage;
