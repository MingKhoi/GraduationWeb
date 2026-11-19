import { useEffect, useRef, useState } from 'react';
import { toBlob } from 'html-to-image';
import { useAuth } from '../hooks/useAuth';
import GraduationStoryScene from '../world/GraduationStoryScene';
import RsvpActions from '../world/RsvpActions';
import { apiRequest } from '../services/api';
import type { RSVPStatus } from '../types/auth.types';

type ScriptStep = 'welcome' | 'teaser' | 'walking' | 'letter' | 'opening' | 'invitation';

const invitationGateAddresses = [
    { label: 'Cổng 1', address: 'Cổng 1: 268 Đ. Lý Thường Kiệt, Điền Hồng, Hồ Chí Minh, Việt Nam' },
    { label: 'Cổng 3', address: 'Cổng 3: 142 Tô Hiến Thành, Điền Hồng, Hồ Chí Minh, Việt Nam' },
] as const;

function WorldPage() {
    const { guest } = useAuth();
    const stageRef = useRef<HTMLElement | null>(null);
    const [step, setStep] = useState<ScriptStep>('welcome');
    const [feedback, setFeedback] = useState('');
    const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');
    const [isCopyingAddress, setIsCopyingAddress] = useState(false);
    const [isSavingInvitation, setIsSavingInvitation] = useState(false);

    const guestName = guest?.fullName || guest?.profile?.nickname || 'bạn';
    const invitationMessage = guest?.invitation?.message?.trim()
        || 'Mời bạn đến chung vui và chúc mừng lễ tốt nghiệp cùng Khôi.';
    const welcomeLine = `Xin chào ${guestName}! Mình là Khôi. Chào mừng bạn đến với thế giới nhỏ của mình!`;
    const teaserLine = 'À, mà khoan! Mình có một món quà đặc biệt muốn gửi đến bạn. Theo mình nào!';
    const walkingLine = 'Đi thôi! Khôi đang dẫn bạn đến tấm thiệp đã chuẩn bị riêng.';
    const letterLine = 'Đến nơi rồi! Đây là tấm thiệp mình đã chuẩn bị riêng cho bạn. Nhấn vào để mở nhé!';
    const sceneStage = step === 'welcome'
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

    return (
        <main className="graduation-world">
            <section className="world-mobile-experience">
                <section
                    ref={stageRef}
                    className="world-stage"
                    data-story-step={step}
                    aria-label="Hành trình cùng Khôi"
                >
                    <GraduationStoryScene stage={sceneStage} motion={sceneMotion} />

                    {step === 'opening' && (
                        <div className="world-opening" role="status" aria-label="Đang mở thiệp mời">
                            <span className="world-opening-letter" aria-hidden="true" />
                            <span className="world-opening-flap" aria-hidden="true" />
                        </div>
                    )}

                    {step !== 'invitation' && step !== 'opening' ? (
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
                        <>
                            <div className="world-invitation-art">
                                <img src="/storyboard/invitation-template.png" alt="" />
                                <p className="world-art-guest">Kính mời {guestName}</p>
                                <p className="world-art-message">{invitationMessage}</p>
                                <button
                                    className="world-art-address-copy world-art-address-copy--gate-one"
                                    onClick={() => void copyAddress(invitationGateAddresses[0])}
                                    disabled={isCopyingAddress}
                                    aria-label="Sao chép địa chỉ Cổng 1"
                                    title="Sao chép địa chỉ Cổng 1"
                                >
                                    <span className="world-art-copy-icon" aria-hidden="true" />
                                </button>
                                <button
                                    className="world-art-address-copy world-art-address-copy--gate-three"
                                    onClick={() => void copyAddress(invitationGateAddresses[1])}
                                    disabled={isCopyingAddress}
                                    aria-label="Sao chép địa chỉ Cổng 3"
                                    title="Sao chép địa chỉ Cổng 3"
                                >
                                    <span className="world-art-copy-icon" aria-hidden="true" />
                                </button>
                                <div className="world-art-rsvp-section">
                                    <RsvpActions
                                        onSubmit={saveRsvp}
                                        initialStatus={guest?.rsvp?.status ?? null}
                                    />
                                </div>
                                <button
                                    className="world-art-utility-button world-art-utility-button--save"
                                    onClick={() => void saveInvitation()}
                                    disabled={isSavingInvitation}
                                    aria-label="Tải hình ảnh màn hình thiệp mời"
                                >
                                    Lưu thiệp
                                </button>
                                {feedback && (
                                    <p className={`world-art-feedback is-${feedbackType}`} role="status">
                                        {feedback}
                                    </p>
                                )}
                            </div>
                            <div className="world-rotate-message" role="status">
                                <span className="world-rotate-icon" aria-hidden="true">↻</span>
                                <p>Xoay ngang điện thoại để xem trọn thiệp mời</p>
                            </div>
                        </>
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
