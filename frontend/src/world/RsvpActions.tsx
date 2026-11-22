import { useState, type CSSProperties } from 'react';
import type { RSVPStatus } from '../types/auth.types';
import './RsvpActions.css';

type RsvpActionsProps = {
    onSubmit: (status: RSVPStatus) => Promise<void>;
    initialStatus?: RSVPStatus | null;
};

type ConfettiStyle = CSSProperties & {
    '--i': number;
    '--angle': string;
};

const CONFETTI = Array.from({ length: 18 }, (_, index) => index);

function getConfettiStyle(index: number): ConfettiStyle {
    return {
        '--i': index,
        '--angle': `${index * 20}deg`,
    };
}

export default function RsvpActions({
    onSubmit,
    initialStatus = null,
}: RsvpActionsProps) {
    const [selected, setSelected] = useState<RSVPStatus | null>(initialStatus);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSelect = async (status: RSVPStatus) => {
        if (isSubmitting) return;

        setIsSubmitting(true);
        setError('');

        try {
            await onSubmit(status);
            setSelected(status);
        } catch (err) {
            console.error('RSVP failed:', err);
            setError('Chưa thể gửi phản hồi. Bạn vui lòng thử lại nhé!');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isAttending = selected === 'ATTENDING';

    return (
        <section className="rsvp-section">
            <p className="rsvp-heading">Bạn sẽ tham dự chứ?</p>

            <div className="rsvp-buttons">
                <button
                    type="button"
                    className={`rsvp-button attend ${selected === 'ATTENDING' ? 'selected' : ''}`}
                    disabled={isSubmitting}
                    aria-pressed={selected === 'ATTENDING'}
                    onClick={() => void handleSelect('ATTENDING')}
                >
                    <span className="rsvp-button-icon" aria-hidden="true">✓</span>
                    {isSubmitting && selected !== 'ATTENDING' ? 'Đang gửi...' : 'Tham dự'}
                </button>

                <button
                    type="button"
                    className={`rsvp-button decline ${selected === 'NOT_ATTENDING' ? 'selected' : ''}`}
                    disabled={isSubmitting}
                    aria-pressed={selected === 'NOT_ATTENDING'}
                    onClick={() => void handleSelect('NOT_ATTENDING')}
                >
                    <span className="rsvp-button-icon" aria-hidden="true">×</span>
                    Không tham dự
                </button>
            </div>

            {isSubmitting && (
                <p className="rsvp-loading">Đang gửi phản hồi của bạn...</p>
            )}

            {error && (
                <p className="rsvp-error" role="alert">
                    {error}
                </p>
            )}

            {selected && !isSubmitting && !error && (
                <div
                    key={selected}
                    className={`rsvp-result ${isAttending ? 'result-attend' : 'result-decline'}`}
                    role="status"
                >
                    {isAttending && (
                        <div className="rsvp-confetti" aria-hidden="true">
                            {CONFETTI.map((item) => (
                                <span key={item} style={getConfettiStyle(item)} />
                            ))}
                        </div>
                    )}

                    <div className="rsvp-result-icon" aria-hidden="true">
                        <img className="rsvp-result-icon-img"
                            src={
                                isAttending
                                    ? '/storyboard/happy.png'
                                    : '/storyboard/sad.png'
                            }
                            alt=""
                        />
                    </div>

                    <div>
                        <h3>{isAttending ? 'Deeeeeeee' : 'Buồn thíiiiii'}</h3>
                        <p>
                            {isAttending
                                ? 'Bạn nhát định phải tới nheee!!'
                                : `Chả iu em.`}
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
}
