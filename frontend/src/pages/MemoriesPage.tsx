import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
    type TouchEvent as ReactTouchEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { memoriesService } from '../services/memories.service';
import type { MemoryPhoto } from '../types/memory.types';
import './MemoriesPage.css';

const PHOTO_FRAME_URL = '/storyboard/bk-photo-frame.png';
const MEMORY_WALL_URL = '/storyboard/memory-wall.png';
const MAX_PHOTO_SIZE = 12 * 1024 * 1024;
const MAX_NOTE_LENGTH = 160;

const BOARD_SLOTS = [
    { left: 32, top: 41, rotation: -5 },
    { left: 40.5, top: 42, rotation: 4 },
    { left: 49, top: 42, rotation: -2 },
    { left: 58, top: 42, rotation: 3 },
    { left: 66.5, top: 41.5, rotation: -4 },
    { left: 75, top: 41, rotation: 4 },
    { left: 31, top: 55, rotation: 4 },
    { left: 40, top: 55.5, rotation: -3 },
    { left: 49, top: 55, rotation: 2 },
    { left: 58, top: 55, rotation: -3 },
    { left: 67, top: 55, rotation: 4 },
    { left: 76, top: 54.5, rotation: -4 },
    { left: 30, top: 69, rotation: -4 },
    { left: 39, top: 69.5, rotation: 3 },
    { left: 48, top: 70, rotation: -2 },
    { left: 57, top: 69.5, rotation: 4 },
    { left: 66, top: 69, rotation: -3 },
    { left: 75, top: 68.5, rotation: 3 },
];

type FrameChoice = 'bku' | 'none';

interface PhotoDraft {
    file: File;
    previewUrl: string;
}

function loadImage(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Không thể đọc ảnh này.'));
        image.src = source;
    });
}

function drawCover(
    context: CanvasRenderingContext2D,
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
    width: number,
    height: number,
) {
    const scale = Math.max(width / sourceWidth, height / sourceHeight);
    const drawnWidth = sourceWidth * scale;
    const drawnHeight = sourceHeight * scale;
    context.drawImage(
        source,
        (width - drawnWidth) / 2,
        (height - drawnHeight) / 2,
        drawnWidth,
        drawnHeight,
    );
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Không thể xử lý ảnh. Vui lòng thử lại.'));
            },
            'image/jpeg',
            0.92,
        );
    });
}

async function captureVideoFrame(
    video: HTMLVideoElement,
    frameChoice: FrameChoice,
): Promise<File> {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1082;
    const context = canvas.getContext('2d');
    if (!context || !video.videoWidth || !video.videoHeight) {
        throw new Error('Camera chưa sẵn sàng. Vui lòng chờ và chụp lại.');
    }

    drawCover(
        context,
        video,
        video.videoWidth,
        video.videoHeight,
        canvas.width,
        canvas.height,
    );

    if (frameChoice === 'bku') {
        const frame = await loadImage(PHOTO_FRAME_URL);
        context.drawImage(frame, 0, 0, canvas.width, canvas.height);
    }

    const blob = await canvasToJpeg(canvas);
    return new File([blob], 'graduation-photo.jpg', { type: 'image/jpeg' });
}

function wrapNote(
    context: CanvasRenderingContext2D,
    note: string,
    maxWidth: number,
    maxLines: number,
): string[] {
    const words = note.trim().split(/\s+/);
    const lines: string[] = [];
    let line = '';

    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (context.measureText(candidate).width > maxWidth && line) {
            lines.push(line);
            line = word;
            if (lines.length === maxLines) break;
        } else {
            line = candidate;
        }
    }

    if (lines.length < maxLines && line) lines.push(line);
    if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
        lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.…]*$/, '')}…`;
    }
    return lines;
}

async function composeNote(photo: File, note: string): Promise<Blob> {
    const sourceUrl = URL.createObjectURL(photo);
    try {
        const image = await loadImage(sourceUrl);
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Không thể tạo ảnh để tải xuống.');

        context.drawImage(image, 0, 0);
        if (note.trim()) {
            const padding = Math.max(20, canvas.width * 0.035);
            const fontSize = Math.max(18, Math.round(canvas.width * 0.032));
            const lineHeight = fontSize * 1.35;
            context.font = `600 ${fontSize}px "Segoe UI", Arial, sans-serif`;
            const lines = wrapNote(context, note, canvas.width - padding * 2, 3);
            const bannerHeight = lineHeight * lines.length + padding;
            const top = canvas.height - bannerHeight;

            context.fillStyle = 'rgba(17, 35, 67, .76)';
            context.fillRect(0, top, canvas.width, bannerHeight);
            context.fillStyle = '#fff';
            context.textAlign = 'center';
            context.textBaseline = 'top';
            lines.forEach((line, index) => {
                context.fillText(
                    line,
                    canvas.width / 2,
                    top + padding / 2 + index * lineHeight,
                    canvas.width - padding * 2,
                );
            });
        }

        return await canvasToJpeg(canvas);
    } finally {
        URL.revokeObjectURL(sourceUrl);
    }
}

function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error
        ? error.message
        : 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

function cameraErrorText(error: unknown): string {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
        return 'Bạn cần cho phép trình duyệt sử dụng camera để chụp ảnh.';
    }
    if (error instanceof DOMException && error.name === 'NotFoundError') {
        return 'Không tìm thấy camera trên thiết bị này.';
    }
    return 'Không thể mở camera. Hãy kiểm tra quyền truy cập và thử lại.';
}

function MemoriesPage() {
    const navigate = useNavigate();
    const { guest } = useAuth();
    const senderName = guest?.profile?.nickname || guest?.fullName || 'Khách mời';
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const photoSwipeStart = useRef<{ x: number; y: number } | null>(null);
    const [memories, setMemories] = useState<MemoryPhoto[]>([]);
    const [isLoadingWall, setIsLoadingWall] = useState(true);
    const [wallError, setWallError] = useState('');
    const [actionError, setActionError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [draft, setDraft] = useState<PhotoDraft | null>(null);
    const [draftNote, setDraftNote] = useState('');
    const [frameChoice, setFrameChoice] = useState<FrameChoice>('bku');
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [activePhoto, setActivePhoto] = useState<MemoryPhoto | null>(null);
    const activePhotoIndex = activePhoto
        ? memories.findIndex((photo) => photo.id === activePhoto.id)
        : -1;

    const refreshWall = useCallback(async () => {
        setIsLoadingWall(true);
        setWallError('');
        try {
            setMemories(await memoriesService.list());
        } catch (error) {
            setWallError(getErrorMessage(error));
        } finally {
            setIsLoadingWall(false);
        }
    }, []);

    const showAdjacentPhoto = (direction: -1 | 1) => {
        const nextPhoto = memories[activePhotoIndex + direction];
        if (nextPhoto) setActivePhoto(nextPhoto);
    };

    const startPhotoSwipe = (event: ReactTouchEvent<HTMLDivElement>) => {
        const touch = event.changedTouches.item(0);
        if (touch) photoSwipeStart.current = { x: touch.clientX, y: touch.clientY };
    };

    const finishPhotoSwipe = (event: ReactTouchEvent<HTMLDivElement>) => {
        const start = photoSwipeStart.current;
        const touch = event.changedTouches.item(0);
        photoSwipeStart.current = null;
        if (!start || !touch) return;

        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
        showAdjacentPhoto(deltaX < 0 ? 1 : -1);
    };

    useEffect(() => {
        let isActive = true;
        void memoriesService.list()
            .then((loadedMemories) => {
                if (isActive) setMemories(loadedMemories);
            })
            .catch((error: unknown) => {
                if (isActive) setWallError(getErrorMessage(error));
            })
            .finally(() => {
                if (isActive) setIsLoadingWall(false);
            });

        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        if (!draft) return;
        return () => URL.revokeObjectURL(draft.previewUrl);
    }, [draft]);

    useEffect(() => {
        if (!isCameraOpen) return;
        let isActive = true;
        let cameraStream: MediaStream | null = null;
        const cameraVideo = videoRef.current;

        const startCamera = async () => {
            if (!navigator.mediaDevices?.getUserMedia) return;
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
                    setIsCameraReady(true);
                }
            } catch (error) {
                if (isActive) setCameraError(cameraErrorText(error));
            }
        };

        void startCamera();
        return () => {
            isActive = false;
            cameraStream?.getTracks().forEach((track) => track.stop());
            if (cameraVideo) cameraVideo.srcObject = null;
        };
    }, [isCameraOpen]);

    useEffect(() => {
        if (!isGalleryOpen && !activePhoto && !isCameraOpen) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsGalleryOpen(false);
                setActivePhoto(null);
                setIsCameraOpen(false);
            }
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [activePhoto, isCameraOpen, isGalleryOpen]);

    const replaceDraft = (file: File) => {
        const previewUrl = URL.createObjectURL(file);
        setDraft({ file, previewUrl });
        setDraftNote('');
        setActionError('');
        setSuccessMessage('');
    };

    const clearDraft = () => {
        setDraft(null);
        setDraftNote('');
    };

    const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setActionError('Vui lòng chọn ảnh JPEG, PNG hoặc WebP.');
            return;
        }
        if (file.size > MAX_PHOTO_SIZE) {
            setActionError('Ảnh không được vượt quá 12 MB.');
            return;
        }
        replaceDraft(file);
    };

    const openCamera = () => {
        setActionError('');
        setCameraError('');
        setIsCameraReady(false);
        setIsCameraOpen(true);
    };

    const capturePhoto = async () => {
        const video = videoRef.current;
        if (!video || !isCameraReady) return;
        try {
            const photo = await captureVideoFrame(video, frameChoice);
            replaceDraft(photo);
            setIsCameraOpen(false);
        } catch (error) {
            setCameraError(getErrorMessage(error));
        }
    };

    const uploadDraft = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!draft || isPosting) return;

        setIsPosting(true);
        setActionError('');
        setSuccessMessage('');
        try {
            const composed = await composeNote(draft.file, draftNote);
            const photo = new File([composed], 'graduation-memory.jpg', {
                type: composed.type,
            });
            const created = await memoriesService.create(photo, draftNote.trim());
            setMemories((current) => [created, ...current]);
            clearDraft();
            setSuccessMessage('Ảnh đã được treo lên bảng kỷ niệm!');
        } catch (error) {
            setActionError(getErrorMessage(error));
        } finally {
            setIsPosting(false);
        }
    };

    const downloadDraft = async () => {
        if (!draft || isDownloading) return;
        setIsDownloading(true);
        setActionError('');
        try {
            const composed = await composeNote(draft.file, draftNote);
            downloadBlob(composed, 'graduation-memory.jpg');
        } catch (error) {
            setActionError(getErrorMessage(error));
        } finally {
            setIsDownloading(false);
        }
    };

    const downloadMemory = async (memory: MemoryPhoto) => {
        setIsDownloading(true);
        setActionError('');
        try {
            const photo = await memoriesService.download(memory.id);
            const extension = memory.mimeType.split('/')[1] || 'jpg';
            downloadBlob(photo, `graduation-memory.${extension}`);
        } catch (error) {
            setActionError(getErrorMessage(error));
        } finally {
            setIsDownloading(false);
        }
    };

    const openGallery = () => {
        setIsGalleryOpen(true);
        void refreshWall();
    };

    const cameraSupported =
        typeof navigator !== 'undefined' &&
        typeof navigator.mediaDevices?.getUserMedia === 'function';

    return (
        <main className="memories-page">
            <header className="memories-header">
                <button
                    className="memories-back-button"
                    type="button"
                    onClick={() => navigate('/')}
                    aria-label="Trang chủ"
                >
                    <img src="/storyboard/home-button.png" alt="" />
                </button>
                <img
                    className="memories-brand-logo"
                    src="/storyboard/logo.png"
                    alt="Graduation World"
                />
            </header>

            <section className="memories-intro" aria-labelledby="memories-title">
                <span>NHỮNG KHOẢNH KHẮC CỦA CHÚNG MÌNH</span>
                <h1 id="memories-title">Góc lưu niệm</h1>
                <p>Tải ảnh lên bảng hoặc chụp một tấm thật xinh để lưu lại ngày đặc biệt này.</p>
            </section>

            <div className="memories-layout">
                <section className="memory-wall-panel" aria-label="Bảng ảnh kỷ niệm">
                    <div className="memory-wall-heading">
                        <div>
                            <h2>Bảng ký ức</h2>
                            <p>{memories.length} bức ảnh được chia sẻ</p>
                        </div>
                        <button
                            className="memory-gallery-button"
                            type="button"
                            onClick={openGallery}
                        >
                            Xem bảng <span aria-hidden="true">↗</span>
                        </button>
                    </div>

                    <div className="memory-board-art">
                        <button
                            className="memory-board-base"
                            type="button"
                            onClick={openGallery}
                            aria-label={`Mở bảng xem ${memories.length} bức ảnh`}
                        >
                            <img
                                src={MEMORY_WALL_URL}
                                alt="Bảng ký ức có nhiều khung ảnh đang chờ được treo"
                            />
                        </button>
                        {memories.slice(0, BOARD_SLOTS.length).map((memory, index) => {
                            const slot = BOARD_SLOTS[index];
                            return (
                                <button
                                    className="memory-board-photo"
                                    key={memory.id}
                                    type="button"
                                    style={{
                                        left: `${slot.left}%`,
                                        top: `${slot.top}%`,
                                        transform: `translate(-50%, -50%) rotate(${slot.rotation}deg)`,
                                    }}
                                    onClick={() => setActivePhoto(memory)}
                                    aria-label={`Xem ảnh của ${memory.senderName}`}
                                >
                                    <img
                                        src={memoriesService.imageUrl(memory.id)}
                                        crossOrigin="use-credentials"
                                        alt=""
                                    />
                                </button>
                            );
                        })}
                    </div>

                    <div className="memory-wall-footer">
                        <span>
                            Nhấn vào bảng để xem ảnh hoặc chọn một tấm ảnh đang treo.
                        </span>
                        {wallError && (
                            <button
                                type="button"
                                className="memory-retry-button"
                                onClick={() => void refreshWall()}
                            >
                                Tải lại bảng
                            </button>
                        )}
                    </div>
                    {wallError && (
                        <p className="memory-error" role="alert">{wallError}</p>
                    )}
                </section>

                <section className="memory-tools-panel" aria-label="Chụp và tải ảnh">
                    <div className="memory-tools-heading">
                        {/* <span className="memory-tools-icon" aria-hidden="true">📸</span> */}
                        <div>
                            <h2>Góc chụp hình</h2>
                            <p>Chụp ảnh hoặc chọn ảnh có sẵn từ thiết bị.</p>
                        </div>
                    </div>

                    <button
                        className="memory-camera-tile"
                        type="button"
                        onClick={openCamera}
                        aria-label="Mở camera chụp ảnh tốt nghiệp"
                    >
                        <img src={PHOTO_FRAME_URL} alt="" />
                    </button>

                    <div className="memory-tool-divider"><span>hoặc</span></div>
                    <input
                        ref={fileInputRef}
                        className="memory-file-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={chooseFile}
                        aria-label="Chọn ảnh từ thiết bị"
                    />
                    <button
                        className="memory-upload-button"
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <span aria-hidden="true">＋</span> Tải ảnh từ thiết bị
                    </button>
                    <p className="memory-upload-hint">JPEG, PNG hoặc WebP · Tối đa 12 MB</p>

                    {draft && (
                        <form className="memory-editor" onSubmit={uploadDraft}>
                            <div className="memory-draft-preview">
                                <img src={draft.previewUrl} alt="Ảnh đang chỉnh sửa" />
                                {draftNote.trim() && (
                                    <span className="memory-note-overlay">{draftNote}</span>
                                )}
                                <button
                                    className="memory-discard-button"
                                    type="button"
                                    aria-label="Bỏ ảnh đang chọn"
                                    onClick={clearDraft}
                                >
                                    ×
                                </button>
                            </div>
                            <label className="memory-note-label" htmlFor="memory-note">
                                Ghi chú trên ảnh
                                <textarea
                                    id="memory-note"
                                    value={draftNote}
                                    onChange={(event) => setDraftNote(event.target.value)}
                                    maxLength={MAX_NOTE_LENGTH}
                                    rows={2}
                                    placeholder="Viết một dòng để lưu lại khoảnh khắc..."
                                />
                            </label>
                            <div className="memory-note-meta">
                                <span>{senderName}</span>
                                <span>{draftNote.length}/{MAX_NOTE_LENGTH}</span>
                            </div>
                            <div className="memory-editor-actions">
                                <button
                                    className="memory-download-draft"
                                    type="button"
                                    disabled={isDownloading || isPosting}
                                    onClick={() => void downloadDraft()}
                                >
                                    {isDownloading ? 'Đang tạo ảnh...' : 'Tải ảnh về'}
                                </button>
                                <button
                                    className="memory-post-button"
                                    type="submit"
                                    disabled={isPosting || isDownloading}
                                >
                                    {isPosting ? 'Đang treo ảnh...' : 'Treo lên tường'}
                                </button>
                            </div>
                        </form>
                    )}

                    {actionError && (
                        <p className="memory-error" role="alert">{actionError}</p>
                    )}
                    {successMessage && (
                        <p className="memory-success" role="status">{successMessage}</p>
                    )}
                </section>
            </div>

            {isCameraOpen && (
                <div
                    className="memory-modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setIsCameraOpen(false);
                    }}
                >
                    <section
                        className="memory-camera-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="memory-camera-title"
                    >
                        <header className="memory-modal-header">
                            <div>
                                <span className="memory-modal-eyebrow">LƯU LẠI KHOẢNH KHẮC</span>
                                <h2 id="memory-camera-title">Chụp ảnh tốt nghiệp</h2>
                            </div>
                            <button
                                className="memory-modal-close"
                                type="button"
                                aria-label="Đóng camera"
                                onClick={() => setIsCameraOpen(false)}
                            >
                                ×
                            </button>
                        </header>

                        <div className="memory-camera-preview">
                            {cameraSupported ? (
                                <>
                                    <video ref={videoRef} autoPlay muted playsInline />
                                    {frameChoice === 'bku' && (
                                        <img
                                            className="memory-camera-frame"
                                            src={PHOTO_FRAME_URL}
                                            alt=""
                                        />
                                    )}
                                    {!isCameraReady && !cameraError && (
                                        <div className="memory-camera-loading" role="status">
                                            Đang kết nối camera...
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="memory-camera-error">
                                    Trình duyệt hoặc thiết bị chưa hỗ trợ camera. Bạn vẫn có thể tải ảnh từ thiết bị.
                                </p>
                            )}
                        </div>

                        {cameraError && (
                            <p className="memory-camera-error" role="alert">{cameraError}</p>
                        )}

                        <fieldset className="memory-frame-picker">
                            <legend>Chọn khung ảnh</legend>
                            <button
                                type="button"
                                className={frameChoice === 'bku' ? 'is-selected' : ''}
                                aria-pressed={frameChoice === 'bku'}
                                onClick={() => setFrameChoice('bku')}
                            >
                                Bách Khoa
                            </button>
                            <button
                                type="button"
                                className={frameChoice === 'none' ? 'is-selected' : ''}
                                aria-pressed={frameChoice === 'none'}
                                onClick={() => setFrameChoice('none')}
                            >
                                Không khung
                            </button>
                        </fieldset>

                        <button
                            className="memory-capture-button"
                            type="button"
                            disabled={!isCameraReady}
                            onClick={() => void capturePhoto()}
                        >
                            <span aria-hidden="true">●</span> Chụp ảnh
                        </button>
                    </section>
                </div>
            )}

            {isGalleryOpen && (
                <div
                    className="memory-modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setIsGalleryOpen(false);
                    }}
                >
                    <section
                        className="memory-gallery-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="memory-gallery-title"
                    >
                        <header className="memory-modal-header">
                            <div>
                                {/* <span className="memory-modal-eyebrow">NHỮNG KHOẢNH KHẮC ĐƯỢC CHIA SẺ</span> */}
                                <h2 id="memory-gallery-title">Bảng ký ức</h2>
                                <p>{memories.length} bức ảnh</p>

                            </div>
                            <button
                                className="memory-modal-close"
                                type="button"
                                aria-label="Đóng bảng ký ức"
                                onClick={() => setIsGalleryOpen(false)}
                            >
                                ×
                            </button>
                        </header>
                        {isLoadingWall ? (
                            <p className="memory-gallery-state" role="status">Đang tải ảnh...</p>
                        ) : wallError ? (
                            <div className="memory-gallery-state">
                                <p className="memory-error" role="alert">{wallError}</p>
                                <button
                                    className="memory-retry-button"
                                    type="button"
                                    onClick={() => void refreshWall()}
                                >
                                    Thử tải lại
                                </button>
                            </div>
                        ) : memories.length === 0 ? (
                            <div className="memory-gallery-state">
                                <span aria-hidden="true">🖼️</span>
                                <strong>Bảng đang chờ những tấm ảnh đầu tiên</strong>
                                <p>Hãy tải ảnh lên hoặc chụp một tấm để treo lên tường nhé.</p>
                            </div>
                        ) : (
                            <div className="memory-gallery-grid">
                                {memories.map((memory) => (
                                    <button
                                        className="memory-gallery-card"
                                        key={memory.id}
                                        type="button"
                                        onClick={() => {
                                            setIsGalleryOpen(false);
                                            setActivePhoto(memory);
                                        }}
                                    >
                                        <img
                                            src={memoriesService.imageUrl(memory.id)}
                                            crossOrigin="use-credentials"
                                            alt={`Ảnh được chia sẻ bởi ${memory.senderName}`}
                                        />
                                        <span>
                                            <strong>{memory.senderName}</strong>
                                            {memory.note && <small>{memory.note}</small>}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {activePhoto && (
                <div
                    className="memory-modal-backdrop memory-detail-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setActivePhoto(null);
                    }}
                >
                    <section
                        className="memory-detail-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="memory-detail-title"
                    >
                        <header className="memory-modal-header">
                            <div>
                                <span className="memory-modal-eyebrow">KHOẢNH KHẮC LƯU NIỆM</span>
                                <h2 id="memory-detail-title">{activePhoto.senderName}</h2>
                            </div>
                            <button
                                className="memory-modal-close"
                                type="button"
                                aria-label="Đóng ảnh"
                                onClick={() => setActivePhoto(null)}
                            >
                                ×
                            </button>
                        </header>
                        <div
                            className="memory-detail-viewer"
                            onTouchStart={startPhotoSwipe}
                            onTouchEnd={finishPhotoSwipe}
                        >
                            <img
                                className="memory-detail-image"
                                src={memoriesService.imageUrl(activePhoto.id)}
                                crossOrigin="use-credentials"
                                alt={`Ảnh lưu niệm của ${activePhoto.senderName}`}
                            />
                        </div>
                        <div className="memory-detail-navigation" aria-label="Điều hướng ảnh">
                            <button
                                type="button"
                                aria-label="Ảnh trước"
                                disabled={activePhotoIndex <= 0}
                                onClick={() => showAdjacentPhoto(-1)}
                            >
                                ←
                            </button>
                            <span>
                                {activePhotoIndex >= 0 ? activePhotoIndex + 1 : 0} / {memories.length}
                            </span>
                            <button
                                type="button"
                                aria-label="Ảnh tiếp theo"
                                disabled={activePhotoIndex < 0 || activePhotoIndex >= memories.length - 1}
                                onClick={() => showAdjacentPhoto(1)}
                            >
                                →
                            </button>
                        </div>
                        {/* {activePhoto.note && (
                            <p className="memory-detail-note">{activePhoto.note}</p>
                        )} */}
                        <div className="memory-detail-actions">
                            <button
                                className="memory-detail-download"
                                type="button"
                                disabled={isDownloading}
                                onClick={() => void downloadMemory(activePhoto)}
                            >
                                {isDownloading ? 'Đang tải ảnh...' : 'Tải ảnh về'}
                            </button>
                        </div>
                        {actionError && (
                            <p className="memory-error" role="alert">{actionError}</p>
                        )}
                    </section>
                </div>
            )}
        </main>
    );
}

export default MemoriesPage;
