import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
// import { API_URL } from '../services/api';
import { SOCKET_URL } from '../services/api';
import { getProfileAvatarUrl } from '../services/profiles.service';
import './LobbyPage.css';

type ReactionId = 'heart' | 'can' | 'poop';

interface Seat {
    seatId: number;
    name: string | null;
    avatarUrl: string | null;
}

interface LobbyMessage {
    id: string;
    seatId: number;
    name: string;
    text: string;
    sentAt: number;
}

interface LobbyReaction {
    id: string;
    fromSeatId: number;
    toSeatId: number;
    reactionId: ReactionId;
    message: string;
}

interface FlyingReaction extends LobbyReaction {
    x: number;
    y: number;
    dx: number;
    dy: number;
}

const REACTION_OPTIONS: {
    id: ReactionId;
    label: string;
    image: string;
}[] = [
        { id: 'heart', label: 'Tim nè em iu', image: '/lobby/heart.png' },
        { id: 'can', label: 'Có cái lon nè', image: '/lobby/can.png' },
        { id: 'poop', label: 'Tặng bạn bọc cớt', image: '/lobby/poop.png' },
    ];

const EMPTY_SEATS: Seat[] = Array.from({ length: 16 }, (_, seatId) => ({
    seatId,
    name: null,
    avatarUrl: null,
}));

function LobbyPage() {
    const navigate = useNavigate();
    const socketRef = useRef<Socket | null>(null);
    const seatElements = useRef(new Map<number, HTMLDivElement>());
    const timers = useRef<number[]>([]);
    const messageListRef = useRef<HTMLDivElement>(null);
    const [seats, setSeats] = useState<Seat[]>(EMPTY_SEATS);
    const [messages, setMessages] = useState<LobbyMessage[]>([]);
    const [mySeatId, setMySeatId] = useState<number | null>(null);
    const [targetSeatId, setTargetSeatId] = useState<number | null>(null);
    const [messageText, setMessageText] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [flyingReactions, setFlyingReactions] = useState<FlyingReaction[]>([]);
    const [visibleReactions, setVisibleReactions] = useState<LobbyReaction[]>([]);
    const [now, setNow] = useState(0);

    useEffect(() => {
        // const socket = io(API_URL, { withCredentials: true });
        const socket = io(SOCKET_URL, { withCredentials: true });
        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            setErrorMessage('');
        });
        socket.on('disconnect', () => setIsConnected(false));
        socket.on('connect_error', () => {
            setIsConnected(false);
            setErrorMessage('Không thể kết nối sảnh. Vui lòng kiểm tra mạng và thử lại.');
        });
        socket.on('lobby:error', (payload: { message?: string }) => {
            setErrorMessage(payload.message || 'Đã xảy ra lỗi trong sảnh.');
        });
        socket.on('lobby:welcome', (payload: { seatId: number }) => {
            setMySeatId(payload.seatId);
        });
        socket.on('lobby:state', (state: { seats: Seat[]; messages: LobbyMessage[] }) => {
            setSeats(state.seats);
            setMessages(state.messages);
            setTargetSeatId((current) =>
                current !== null &&
                    state.seats.some((seat) => seat.seatId === current && seat.name !== null)
                    ? current
                    : null,
            );
        });
        socket.on('lobby:message', (message: LobbyMessage) => {
            setMessages((current) => [...current.slice(-49), message]);
        });
        socket.on('lobby:reaction', (reaction: LobbyReaction) => {
            const from = seatElements.current.get(reaction.fromSeatId)?.getBoundingClientRect();
            const to = seatElements.current.get(reaction.toSeatId)?.getBoundingClientRect();

            if (!from || !to) {
                return;
            }

            setFlyingReactions((current) => [
                ...current,
                {
                    ...reaction,
                    x: from.left + from.width / 2,
                    y: from.top + from.height / 2,
                    dx: to.left - from.left,
                    dy: to.top - from.top,
                },
            ]);

            const arrivalTimer = window.setTimeout(() => {
                timers.current = timers.current.filter((timer) => timer !== arrivalTimer);
                setFlyingReactions((current) =>
                    current.filter((item) => item.id !== reaction.id),
                );
                setVisibleReactions((current) => [
                    ...current.filter((item) => item.toSeatId !== reaction.toSeatId),
                    reaction,
                ]);
                const hideTimer = window.setTimeout(() => {
                    timers.current = timers.current.filter((timer) => timer !== hideTimer);
                    setVisibleReactions((current) =>
                        current.filter((item) => item.id !== reaction.id),
                    );
                }, 3000);
                timers.current.push(hideTimer);
            }, 680);
            timers.current.push(arrivalTimer);
        });

        const clock = window.setInterval(() => setNow(Date.now()), 1000);
        return () => {
            socket.disconnect();
            socketRef.current = null;
            window.clearInterval(clock);
            timers.current.forEach(window.clearTimeout);
            timers.current = [];
        };
    }, []);

    useEffect(() => {
        if (!isChatHistoryOpen) {
            return;
        }
        const list = messageListRef.current;
        if (list) {
            list.scrollTop = list.scrollHeight;
        }
    }, [isChatHistoryOpen, messages]);

    const sendMessage = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const text = messageText.trim();
        if (!text || !socketRef.current?.connected) {
            return;
        }
        socketRef.current.emit('lobby:chat', { text });
        setMessageText('');
        setErrorMessage('');
    };

    const sendReaction = (reactionId: ReactionId) => {
        if (targetSeatId === null || !socketRef.current?.connected) {
            return;
        }
        socketRef.current.emit('lobby:reaction', { targetSeatId, reactionId });
        setErrorMessage('');
    };

    const recentMessages = messages.reduce<Map<number, LobbyMessage>>((latest, message) => {
        if (now - message.sentAt < 7000) {
            latest.set(message.seatId, message);
        }
        return latest;
    }, new Map());

    const occupiedCount = seats.filter((seat) => seat.name !== null).length;
    const targetName = seats.find((seat) => seat.seatId === targetSeatId)?.name;

    return (
        <main className="lobby-page">
            <header className="lobby-header">
                <button
                    className="lobby-back-button"
                    type="button"
                    onClick={() => navigate('/')}
                    aria-label="Trang chủ"
                >
                    <img src="/storyboard/home-button.png" alt="" />
                </button>
                <div className="lobby-heading">
                    <img
                        className="lobby-brand-logo"
                        src="/storyboard/logo.png"
                        alt="Graduation World"
                    />
                    <h1>Sảnh chờ</h1>
                    <p>Ngồi lại một chút, trò chuyện và gửi lời yêu thương nhé!</p>
                </div>
                <div className={`lobby-status ${isConnected ? 'is-online' : ''}`} role="status">
                    <span aria-hidden="true" />
                    {isConnected ? 'Đang kết nối' : 'Đang kết nối lại'}
                </div>
            </header>

            <div className="lobby-content">
                <section className="lobby-room-panel" aria-label="Phòng chờ 16 chỗ">
                    <div className="lobby-room-intro">
                        <div>
                            <h2>Phòng chờ</h2>
                            <p>Chọn một khách mời để gửi icon</p>
                        </div>
                        <span className="lobby-capacity">
                            <span aria-hidden="true">●</span> {occupiedCount}/16 khách
                        </span>
                    </div>

                    <div className="lobby-seat-grid">
                        {seats.map((seat) => {
                            const isOccupied = seat.name !== null;
                            const isMe = seat.seatId === mySeatId;
                            const isTarget = seat.seatId === targetSeatId;
                            const activeMessage = recentMessages.get(seat.seatId);
                            const avatarUrl = getProfileAvatarUrl(seat.avatarUrl);
                            const reaction = visibleReactions.find(
                                (item) => item.toSeatId === seat.seatId,
                            );

                            return (
                                <div
                                    className={[
                                        'lobby-seat',
                                        isOccupied ? 'is-occupied' : 'is-empty',
                                        isMe ? 'is-me' : '',
                                        isTarget ? 'is-target' : '',
                                    ].filter(Boolean).join(' ')}
                                    key={seat.seatId}
                                    data-seat-id={seat.seatId}
                                    ref={(element) => {
                                        if (element) seatElements.current.set(seat.seatId, element);
                                        else seatElements.current.delete(seat.seatId);
                                    }}
                                >
                                    {activeMessage && (
                                        <div className="lobby-chat-bubble" key={activeMessage.id}>
                                            {activeMessage.text}
                                        </div>
                                    )}
                                    {reaction && (
                                        <div className="lobby-reaction-toast" key={reaction.id}>
                                            <img
                                                src={`/lobby/${reaction.reactionId}.png`}
                                                alt=""
                                            />
                                            <span>{reaction.message}</span>
                                        </div>
                                    )}
                                    {isOccupied ? (
                                        <button
                                            className="lobby-seat-person"
                                            type="button"
                                            aria-label={`${seat.name}${isMe ? ', bạn' : ', chọn làm người nhận icon'}`}
                                            aria-pressed={isTarget}
                                            disabled={isMe}
                                            onClick={() =>
                                                setTargetSeatId(isTarget ? null : seat.seatId)
                                            }
                                        >
                                            {avatarUrl ? (
                                                <img
                                                    className="lobby-avatar"
                                                    src={avatarUrl}
                                                    alt=""
                                                />
                                            ) : (
                                                <span className="lobby-avatar lobby-avatar--fallback">
                                                    {seat.name?.slice(0, 1).toUpperCase()}
                                                </span>
                                            )}
                                            <span className="lobby-seat-name">{seat.name}</span>
                                            {isMe && <span className="lobby-you-label">Bạn</span>}
                                        </button>
                                    ) : (
                                        <div className="lobby-empty-seat" aria-label="Ghế trống">
                                            <img src="/lobby/chair.png" alt="" />
                                            <span>Ghế trống</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="lobby-reaction-picker">
                        <div className="lobby-picker-copy">
                            <strong>
                                {targetName ? `Gửi cho ${targetName}` : 'Chọn người nhận trước'}
                            </strong>
                            <span>Icon sẽ bay tới chỗ khách mời</span>
                        </div>
                        <div className="lobby-reaction-options">
                            {REACTION_OPTIONS.map((reaction) => (
                                <button
                                    key={reaction.id}
                                    className="lobby-reaction-button"
                                    type="button"
                                    disabled={targetSeatId === null || !isConnected}
                                    onClick={() => sendReaction(reaction.id)}
                                    aria-label={reaction.label}
                                    title={reaction.label}
                                >
                                    <img src={reaction.image} alt="" />
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                <aside
                    className={`lobby-chat-panel${isChatHistoryOpen ? '' : ' is-history-collapsed'}`}
                    aria-label="Trò chuyện trong sảnh"
                >
                    <div className="lobby-chat-heading">
                        <div>
                            <h2>Trò chuyện</h2>
                            <p>Tin nhắn hiện cho mọi người trong sảnh</p>
                        </div>
                        <button
                            className="lobby-history-toggle"
                            type="button"
                            aria-expanded={isChatHistoryOpen}
                            aria-controls="lobby-chat-history"
                            aria-label={isChatHistoryOpen ? 'Ẩn lịch sử chat' : 'Mở lịch sử chat'}
                            onClick={() => setIsChatHistoryOpen((open) => !open)}
                        >
                            {isChatHistoryOpen ? 'Thu gọn' : `Lịch sử (${messages.length})`}
                            <span aria-hidden="true">{isChatHistoryOpen ? '⌃' : '⌄'}</span>
                        </button>
                    </div>

                    <div
                        className="lobby-chat-list"
                        id="lobby-chat-history"
                        ref={messageListRef}
                        aria-live="polite"
                        hidden={!isChatHistoryOpen}
                    >
                        {messages.length === 0 ? (
                            <div className="lobby-chat-empty">
                                <span aria-hidden="true">💬</span>
                                <strong>Bắt đầu câu chuyện nhé!</strong>
                                <p>Tin nhắn của bạn sẽ hiện phía trên chỗ ngồi.</p>
                            </div>
                        ) : (
                            messages.map((message) => (
                                <article className="lobby-chat-message" key={message.id}>
                                    <strong>{message.name}</strong>
                                    <p>{message.text}</p>
                                </article>
                            ))
                        )}
                    </div>

                    <form className="lobby-composer" onSubmit={sendMessage}>
                        <label className="lobby-sr-only" htmlFor="lobby-message">
                            Tin nhắn
                        </label>
                        <input
                            id="lobby-message"
                            value={messageText}
                            onChange={(event) => setMessageText(event.target.value)}
                            placeholder="Nhắn gì đó dễ thương..."
                            maxLength={280}
                            disabled={!isConnected}
                        />
                        <button
                            type="submit"
                            aria-label="Gửi tin nhắn"
                            disabled={!messageText.trim() || !isConnected}
                        >
                            Gửi
                        </button>
                    </form>

                    {errorMessage && (
                        <p className="lobby-error" role="alert">{errorMessage}</p>
                    )}
                    <p className="lobby-chat-note">
                        Lịch sử chat chỉ hiển thị trong phiên sảnh hiện tại.
                    </p>
                </aside>
            </div>

            <div className="lobby-flight-layer" aria-hidden="true">
                {flyingReactions.map((reaction) => (
                    <img
                        className="lobby-flying-icon"
                        key={reaction.id}
                        src={`/lobby/${reaction.reactionId}.png`}
                        alt=""
                        style={{
                            left: reaction.x,
                            top: reaction.y,
                            '--lobby-dx': `${reaction.dx}px`,
                            '--lobby-dy': `${reaction.dy}px`,
                        } as CSSProperties & { '--lobby-dx': string; '--lobby-dy': string }}
                    />
                ))}
            </div>
        </main>
    );
}

export default LobbyPage;
