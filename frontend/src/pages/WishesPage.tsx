import {
    useCallback,
    useEffect,
    useState,
    type FormEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { wishesService } from '../services/wishes.service';
import type { Wish, WishPaperColor } from '../types/wish.types';
import './WishesPage.css';

const PAPER_COLORS: {
    id: WishPaperColor;
    name: string;
    hex: string;
}[] = [
        { id: 'pink', name: 'Hồng đào', hex: '#f48db4' },
        { id: 'yellow', name: 'Vàng nắng', hex: '#ffd36f' },
        { id: 'blue', name: 'Xanh trời', hex: '#85b7f5' },
        { id: 'purple', name: 'Tím mộng mơ', hex: '#b59aeb' },
        { id: 'green', name: 'Xanh lá', hex: '#9bd7a3' },
    ];

const FLOWER_POSITIONS = [
    { left: 61.9, top: 40.4 },
    { left: 6.4, top: 38.3 },
    { left: 62.4, top: 20.9 },
    { left: 69.2, top: 32.4 },
    { left: 84.4, top: 25.7 },
    { left: 51.8, top: 24.6 },
    { left: 24.1, top: 38.6 },
    { left: 29.2, top: 16.6 },
    { left: 49.6, top: 16.2 },
    { left: 35.4, top: 14.9 },
    { left: 53.6, top: 11.8 },
    { left: 15.6, top: 29.3 },
    { left: 77.8, top: 24.5 },
    { left: 43.8, top: 13.6 },
    { left: 43.3, top: 19.9 },
    { left: 58.3, top: 16.5 },
    { left: 68.7, top: 23.5 },
    { left: 26, top: 56.8 },
    { left: 58.5, top: 7 },
    { left: 89.8, top: 48.4 },
    { left: 8.6, top: 46.3 },
    { left: 30.8, top: 22.1 },
    { left: 28.6, top: 30.6 },
    { left: 22.7, top: 45 },
    { left: 21.4, top: 29.2 },
    { left: 74.5, top: 20.5 },
    { left: 90.5, top: 30.4 },
    { left: 33, top: 36.3 },
    { left: 77.3, top: 55.7 },
    { left: 45.7, top: 28.3 },
    { left: 93.7, top: 36.6 },
    { left: 15.8, top: 42.1 },
    { left: 61.5, top: 31.2 },
    { left: 68.9, top: 12.1 },
    { left: 89.5, top: 55.1 },
    { left: 21.8, top: 23.5 },
    { left: 68.1, top: 53.2 },
    { left: 73.8, top: 45.8 },
    { left: 37.9, top: 33.6 },
    { left: 40.1, top: 24.1 },
    { left: 94.6, top: 45.6 },
    { left: 80.5, top: 43.9 },
    { left: 16.4, top: 51.2 },
    { left: 82.6, top: 50.2 },
    { left: 78.9, top: 34.9 },
    { left: 87, top: 39 },
];

const STARTING_BLOSSOMS = [
    { left: 4, top: 18, flower: '🌼' },
    { left: 50, top: 3, flower: '🌸' },
    { left: 96, top: 20, flower: '🌼' },
];

function getFlowerPosition(index: number) {
    const basePosition = FLOWER_POSITIONS[index % FLOWER_POSITIONS.length];
    const layer = Math.floor(index / FLOWER_POSITIONS.length);

    if (layer === 0) {
        return { ...basePosition, layer };
    }

    const angle = layer * 2.39996;
    const distance = 1.25 + ((layer - 1) % 8) * 0.7;
    return {
        left: Math.min(96, Math.max(4, basePosition.left + Math.cos(angle) * distance)),
        top: Math.min(58, Math.max(7, basePosition.top + Math.sin(angle) * distance)),
        layer,
    };
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error
        ? error.message
        : 'Không thể tải lời chúc. Vui lòng thử lại.';
}

function WishesPage() {
    const navigate = useNavigate();
    const { guest } = useAuth();
    const senderName = guest?.profile?.nickname || guest?.fullName || 'Khách mời';
    const [wishes, setWishes] = useState<Wish[]>([]);
    const [message, setMessage] = useState('');
    const [paperColor, setPaperColor] = useState<WishPaperColor>('pink');
    const [isLoadingWishes, setIsLoadingWishes] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bloomingWishId, setBloomingWishId] = useState<string | null>(null);
    const [isWishListOpen, setIsWishListOpen] = useState(false);
    const [selectedWish, setSelectedWish] = useState<Wish | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const loadWishes = useCallback(async (showLoading = false) => {
        if (showLoading) {
            setIsLoadingWishes(true);
        }

        try {
            const loadedWishes = await wishesService.list();
            setWishes(loadedWishes);
            setErrorMessage('');
        } catch (error) {
            setErrorMessage(getErrorMessage(error));
        } finally {
            setIsLoadingWishes(false);
        }
    }, []);

    useEffect(() => {
        let isActive = true;
        void wishesService.list()
            .then((loadedWishes) => {
                if (isActive) {
                    setWishes(loadedWishes);
                    setErrorMessage('');
                }
            })
            .catch((error: unknown) => {
                if (isActive) {
                    setErrorMessage(getErrorMessage(error));
                }
            })
            .finally(() => {
                if (isActive) {
                    setIsLoadingWishes(false);
                }
            });

        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        if (!isWishListOpen) {
            return;
        }

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsWishListOpen(false);
                setSelectedWish(null);
            }
        };

        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [isWishListOpen]);

    const openWishList = () => {
        setSelectedWish(null);
        setIsWishListOpen(true);
        void loadWishes(true);
    };

    const openWish = (wish: Wish) => {
        setSelectedWish(wish);
        setIsWishListOpen(true);
    };

    const submitWish = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedMessage = message.trim();
        if (!trimmedMessage) {
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            const wish = await wishesService.create({
                message: trimmedMessage,
                paperColor,
            });
            setMessage('');
            setWishes((current) => [wish, ...current]);
            setBloomingWishId(wish.id);
            setSuccessMessage('Lời chúc của bạn đã nở thành một bông hoa!');
        } catch (error) {
            setErrorMessage(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    const flowerWishes = [...wishes].reverse();

    return (
        <main className="wishes-page">
            <header className="wishes-header">
                <button
                    className="wishes-back-button"
                    type="button"
                    onClick={() => navigate('/')}
                    aria-label="Trang chủ"
                >
                    <img src="/storyboard/home-button.png" alt="" />
                </button>
                <img
                    className="wishes-brand-logo"
                    src="/storyboard/logo.png"
                    alt="Graduation World"
                />
            </header>

            <div className="wishes-content">
                <section className="wishes-tree-panel" aria-labelledby="wishes-title">
                    <div className="wishes-intro">
                        <span className="wishes-eyebrow">GỬI ĐIỀU ƯỚC, LƯU GIỮ KỶ NIỆM</span>
                        <h1 id="wishes-title">Cây lời chúc</h1>
                        <p>
                            Gửi lời chúc đến chủ buổi tiệc và treo một mảnh kỷ niệm của bạn lên cây nhé.
                        </p>
                    </div>

                    <div className="wishes-tree-stage">
                        <div className="wishes-tree-art">
                            <button
                                className="wishes-tree-button"
                                type="button"
                                onClick={openWishList}
                                aria-label={`Mở cây để xem ${wishes.length} lời chúc`}
                            >
                                <img
                                    src="/storyboard/wish-tree.png"
                                    alt="Cây xanh nhiều tán lá với vài bông hoa ban đầu"
                                />
                            </button>
                            {STARTING_BLOSSOMS.map((blossom, index) => (
                                <span
                                    className="wish-tree-starting-flower"
                                    key={`starting-${index}`}
                                    style={{ left: `${blossom.left}%`, top: `${blossom.top}%` }}
                                    aria-hidden="true"
                                >
                                    {blossom.flower}
                                </span>
                            ))}
                            {flowerWishes.map((wish, index) => {
                                const position = getFlowerPosition(index);
                                const isBlooming = wish.id === bloomingWishId;
                                return (
                                    <div
                                        className={`wish-tree-memory wish-tree-memory--${wish.paperColor}${isBlooming ? ' is-blooming' : ''}`}
                                        key={wish.id}
                                        style={{
                                            left: `${position.left}%`,
                                            top: `${position.top}%`,
                                            zIndex: 3 + position.layer,
                                        }}
                                    >
                                        <button
                                            className={`wish-tree-flower wish-tree-flower--${wish.paperColor}`}
                                            type="button"
                                            onClick={() => openWish(wish)}
                                            aria-label={`Đọc lời chúc của ${wish.senderName}: ${wish.message}`}
                                            title={`Lời chúc của ${wish.senderName}`}
                                        >
                                            <span className="wish-flower-bud" aria-hidden="true">●</span>
                                            <span
                                                className={`wish-flower-open wish-flower-open--${wish.paperColor}`}
                                                aria-hidden="true"
                                            >
                                                🌸
                                            </span>
                                        </button>
                                        {isBlooming && (
                                            <>
                                                <span className="wish-bloom-sparkles" aria-hidden="true">
                                                    <span>✦</span><span>✧</span><span>✦</span>
                                                </span>
                                                <span className="wish-falling-petals" aria-hidden="true">
                                                    <span>✿</span><span>✿</span><span>✿</span><span>✿</span>
                                                </span>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <span className="wishes-tree-hint">
                            Chạm vào cây để xem lời chúc
                        </span>
                        <div
                            key={bloomingWishId ?? 'wish-count'}
                            className={`wishes-count-pill${bloomingWishId ? ' is-incrementing' : ''}`}
                            aria-live="polite"
                        >
                            <span aria-hidden="true">♡</span>
                            {wishes.length} lời chúc đang treo
                        </div>
                    </div>
                </section>

                <section className="wishes-form-panel" aria-labelledby="wish-form-title">
                    <div className="wishes-form-heading">
                        <span className="wishes-form-icon" aria-hidden="true">✦</span>
                        <div>
                            <h2 id="wish-form-title">Treo lời chúc của bạn</h2>
                            <p>Tên người gửi sẽ lấy từ hồ sơ khách mời.</p>
                        </div>
                    </div>

                    <form onSubmit={submitWish}>
                        <fieldset className="wishes-color-fieldset">
                            <legend>Chọn màu giấy</legend>
                            <div className="wishes-color-options">
                                {PAPER_COLORS.map((color) => (
                                    <button
                                        key={color.id}
                                        className={`wishes-color-option${paperColor === color.id ? ' is-selected' : ''}`}
                                        type="button"
                                        aria-label={color.name}
                                        aria-pressed={paperColor === color.id}
                                        title={color.name}
                                        onClick={() => setPaperColor(color.id)}
                                    >
                                        <span
                                            className="wishes-color-swatch"
                                            style={{ backgroundColor: color.hex }}
                                        />
                                        <span>{color.name}</span>
                                    </button>
                                ))}
                            </div>
                        </fieldset>

                        <label className="wishes-message-label" htmlFor="wish-message">
                            Lời chúc
                            <textarea
                                id="wish-message"
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                                placeholder="Viết lời chúc thật dễ thương dành cho chủ buổi tiệc..."
                                maxLength={300}
                                rows={5}
                                required
                            />
                        </label>
                        <div className="wishes-form-meta">
                            <span>{senderName}</span>
                            <span>{message.length}/300</span>
                        </div>

                        <button
                            className="wishes-submit-button"
                            type="submit"
                            disabled={!message.trim() || isSubmitting}
                        >
                            {isSubmitting ? 'Đang gửi lời chúc...' : 'Gửi lời chúc'}
                            <span aria-hidden="true">↗</span>
                        </button>
                    </form>

                    {errorMessage && (
                        <p className="wishes-message wishes-message--error" role="alert">
                            {errorMessage}
                        </p>
                    )}
                    {successMessage && (
                        <p className="wishes-message wishes-message--success" role="status">
                            {successMessage}
                        </p>
                    )}
                </section>
            </div>

            {isWishListOpen && (
                <div
                    className="wishes-modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setIsWishListOpen(false);
                            setSelectedWish(null);
                        }
                    }}
                >
                    <section
                        className="wishes-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="wishes-modal-title"
                    >
                        <header className="wishes-modal-header">
                            <div>
                                <span className="wishes-modal-eyebrow">
                                    {selectedWish ? 'MỘT BÔNG HOA KỶ NIỆM' : 'NHỮNG ĐIỀU ƯỚC ĐƯỢC GỬI GẮM'}
                                </span>
                                <h2 id="wishes-modal-title">
                                    {selectedWish ? 'Lời chúc trên hoa' : 'Lời chúc trên cây'}
                                </h2>
                                <p>
                                    {selectedWish
                                        ? `Từ ${selectedWish.senderName}`
                                        : `${wishes.length} lời chúc dành tặng chủ buổi tiệc`}
                                </p>
                            </div>
                            <button
                                className="wishes-modal-close"
                                type="button"
                                aria-label="Đóng danh sách lời chúc"
                                onClick={() => {
                                    setIsWishListOpen(false);
                                    setSelectedWish(null);
                                }}
                            >
                                ×
                            </button>
                        </header>

                        {selectedWish ? (
                            <article className={`wish-detail wish-note wish-note--${selectedWish.paperColor}`}>
                                <span className="wish-detail-flower" aria-hidden="true">🌸</span>
                                <div>
                                    <strong>{selectedWish.senderName}</strong>
                                    <p>{selectedWish.message}</p>
                                </div>
                                <button
                                    className="wishes-retry-button"
                                    type="button"
                                    onClick={() => setSelectedWish(null)}
                                >
                                    Xem tất cả lời chúc
                                </button>
                            </article>
                        ) : isLoadingWishes ? (
                            <p className="wishes-modal-state" role="status">
                                Đang hái những lời chúc...
                            </p>
                        ) : errorMessage ? (
                            <div className="wishes-modal-state">
                                <p className="wishes-message wishes-message--error" role="alert">
                                    {errorMessage}
                                </p>
                                <button
                                    className="wishes-retry-button"
                                    type="button"
                                    onClick={() => void loadWishes(true)}
                                >
                                    Thử tải lại
                                </button>
                            </div>
                        ) : wishes.length === 0 ? (
                            <div className="wishes-modal-state">
                                <span aria-hidden="true">🌱</span>
                                <strong>Cây đang chờ lời chúc đầu tiên</strong>
                                <p>Hãy chọn màu giấy và treo lời chúc của bạn lên cây nhé.</p>
                            </div>
                        ) : (
                            <div className="wishes-list">
                                {wishes.map((wish) => (
                                    <article
                                        className={`wish-note wish-note--${wish.paperColor}`}
                                        key={wish.id}
                                    >
                                        <span className="wish-note-heart" aria-hidden="true">♡</span>
                                        <div>
                                            <strong>{wish.senderName}</strong>
                                            <p>{wish.message}</p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </main>
    );
}

export default WishesPage;
