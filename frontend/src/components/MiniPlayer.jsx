import React, { useState, useRef, useEffect, useCallback } from 'react';
import useRockolaStore from '../store/useRockolaStore';

const IMAGES = [
    '/images/concert_stage.png',
    '/images/guitar_player.png',
    '/images/microphone_stage.png',
    '/images/percussion_drums.png',
    '/images/female_singer.png',
    '/images/concert_crowd.png',
];

const formatTimeDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(Math.floor(seconds % 60)).padStart(2, '0');
    return `${mm}:${ss}`;
};

export default function MiniPlayer() {
    const currentTrack = useRockolaStore((s) => s.currentTrack);
    const isPlaying = useRockolaStore((s) => s.isPlaying);
    const queue = useRockolaStore((s) => s.queue);
    const queueDisplayCount = useRockolaStore((s) => s.queueDisplayCount) || 5;
    const togglePlay = useRockolaStore((s) => s.togglePlay);
    const nextTrack = useRockolaStore((s) => s.nextTrack);
    const focusZone = useRockolaStore((s) => s.focusZone);
    const playerSize = useRockolaStore((s) => s.playerSize);
    const playerPosition = useRockolaStore((s) => s.playerPosition);
    const consumeYtTime = useRockolaStore((s) => s.consumeYtTime);
    const ytTimeRemaining = useRockolaStore((s) => s.ytTimeRemaining);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState('00:00');
    const [selectedControl, setSelectedControl] = useState(0); // 0=play, 1=next
    const [toast, setToast] = useState(null);
    const mediaRef = useRef(null);
    const prevTrackId = useRef(null);
    const ytIframeRef = useRef(null);

    const isVideo = currentTrack?.type === 'video';
    const isYouTube = currentTrack?.type === 'youtube';
    const isAudio = currentTrack && !isVideo && !isYouTube;

    const CONTROLS_COUNT = 2; // play/pause, next

    // Keyboard navigation for player controls
    useEffect(() => {
        if (focusZone !== 'player') return;

        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key) {
                case 'ArrowRight': {
                    if (currentTrack) {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedControl((prev) => Math.min(prev + 1, CONTROLS_COUNT - 1));
                    }
                    break;
                }
                case 'ArrowLeft': {
                    if (currentTrack) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (selectedControl === 0) {
                            useRockolaStore.getState().setFocusZone('grid');
                        } else {
                            setSelectedControl((prev) => Math.max(prev - 1, 0));
                        }
                    }
                    break;
                }
                case 'ArrowUp': {
                    e.preventDefault();
                    e.stopPropagation();
                    // Return to grid
                    useRockolaStore.getState().setFocusZone('grid');
                    break;
                }
                case 'Enter': {
                    if (currentTrack) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (selectedControl === 0) togglePlay();
                        else if (selectedControl === 1) handleNextTrack();
                    }
                    break;
                }
                default:
                    return;
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [focusZone, currentTrack, selectedControl, togglePlay, nextTrack]);

    // Plan de implementación actualizado:
    // - **Nueva Sección de Cola**: Incrustar una lista detallada de las próximas canciones directamente debajo de los controles del MiniPlayer, eliminando el popup flotante.
    // - **Visualización de Audio en Panel Derecho**: Modificar el componente para que, al reproducir audio, se muestre la carátula o un visualizador en la misma zona derecha donde aparecen los videos de YouTube/Locales.
    // - **Consolidación de Diseño**: Deshabilitar el "pre-preview" de álbum flotante y reutilizar el área de preview principal para mostrar la información del audio actual.
    // - **Consolidación de "SIGUIENTES"**: Eliminar el texto estático de "SIGUIENTES" y reemplazarlo por la nueva sección interactiva integrada en el cuerpo del MiniPlayer.

    // YouTube timer countdown — consume 1 second every second while YT is playing
    useEffect(() => {
        if (!isYouTube || !isPlaying) return;
        const interval = setInterval(() => {
            consumeYtTime(1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isYouTube, isPlaying, consumeYtTime]);

    // Handle track changes — load and play new source
    useEffect(() => {
        if (!currentTrack) {
            prevTrackId.current = null;
            setProgress(0);
            setCurrentTime('00:00');
            return;
        }

        // Different track? Reset and load
        if (prevTrackId.current !== currentTrack.id) {
            prevTrackId.current = currentTrack.id;
            setProgress(0);
            setCurrentTime('00:00');

            // Force play state for new tracks
            if (!isPlaying) {
                useRockolaStore.setState({ isPlaying: true });
            }

            // Small delay to let the DOM element mount/update
            setTimeout(() => {
                const el = mediaRef.current;
                if (el && currentTrack.sourceUrl && !isYouTube) {
                    el.src = currentTrack.sourceUrl;
                    el.load();

                    if (currentTrack.savedTime) {
                        el.currentTime = currentTrack.savedTime;
                    }

                    el.play().catch((e) => {
                        console.warn('Auto-play local media failed:', e);
                        if (e.name === 'NotAllowedError') {
                            useRockolaStore.setState({ requiresInteraction: true });
                        }
                    });
                }
            }, 100);
        }
    }, [currentTrack?.id, currentTrack?.sourceUrl, isYouTube, isPlaying]);

    // Handle play/pause toggle
    useEffect(() => {
        if (isYouTube) {
            // YouTube: use IFrame API
            const yt = ytPlayerRef.current;
            if (yt && typeof yt.pauseVideo === 'function') {
                if (isPlaying) {
                    yt.playVideo();
                } else {
                    yt.pauseVideo();
                }
            }
            return;
        }

        const el = mediaRef.current;
        if (!el) return;

        if (isPlaying) {
            el.play().catch((e) => {
                console.warn('Play failed:', e);
                if (e.name === 'NotAllowedError') {
                    useRockolaStore.setState({ requiresInteraction: true });
                }
            });
        } else {
            el.pause();
        }
    }, [isPlaying, isYouTube]);

    const handleTimeUpdate = useCallback(() => {
        const el = mediaRef.current;
        if (el && el.duration) {
            const pct = (el.currentTime / el.duration) * 100;
            setProgress(pct);
            const mm = String(Math.floor(el.currentTime / 60)).padStart(2, '0');
            const ss = String(Math.floor(el.currentTime % 60)).padStart(2, '0');
            setCurrentTime(`${mm}:${ss}`);
        }
    }, []);

    const handleEnded = useCallback(() => {
        nextTrack();
    }, [nextTrack]);

    // YouTube IFrame Player API — reliable end detection
    const ytPlayerRef = useRef(null);
    const ytContainerRef = useRef(null);
    const prevYtVideoId = useRef(null);
    const [ytError, setYtError] = useState(null);

    const handleYtError = useCallback((event) => {
        // Error codes: 2=invalid param, 5=HTML5 error, 100=not found/private,
        //              101/150=blocked for embedding
        const code = event?.data;
        console.warn('YouTube player error:', code);
        setYtError(code);

        // Auto-skip to next track after short delay
        setTimeout(() => {
            setYtError(null);
            nextTrack();
        }, 2000);
    }, [nextTrack]);

    useEffect(() => {
        if (!isYouTube || !currentTrack?.videoId) {
            // Cleanup if switching away from YouTube
            if (ytPlayerRef.current) {
                try { ytPlayerRef.current.destroy(); } catch { }
                ytPlayerRef.current = null;
            }
            prevYtVideoId.current = null;
            setYtError(null);
            return;
        }

        // Same video? Skip
        if (prevYtVideoId.current === currentTrack.videoId) return;
        prevYtVideoId.current = currentTrack.videoId;
        setYtError(null);

        // Load YT API script once
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(tag);
        }

        const loadVideo = () => {
            // If player already exists, just load the new video
            if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
                try {
                    if (currentTrack.savedTime) {
                        ytPlayerRef.current.loadVideoById(currentTrack.videoId, currentTrack.savedTime);
                    } else {
                        ytPlayerRef.current.loadVideoById(currentTrack.videoId);
                    }
                } catch (err) {
                    console.warn('loadVideoById failed:', err);
                    handleYtError({ data: 101 });
                }
                return;
            }

            // Create new player
            if (!ytContainerRef.current) return;

            ytPlayerRef.current = new window.YT.Player(ytContainerRef.current, {
                videoId: currentTrack.videoId,
                width: '100%',
                height: '100%',
                playerVars: {
                    autoplay: 1,
                    rel: 0,
                    modestbranding: 1,
                    origin: window.location.origin,
                },
                events: {
                    onStateChange: (event) => {
                        // 0 = ended, -1 = unstarted, 1 = playing, 2 = paused, 3 = buffering, 5 = video cued
                        if (event.data === 0) {
                            // Video finished naturally. Add a small safety delay to prevent
                            // rapid re-renders and iframe zombie state glitches.
                            setTimeout(() => {
                                nextTrack();
                            }, 1000);
                        } else if (event.data === 1 && !isPlaying) {
                            // Ensure our global state knows it's playing if YT auto-started
                            useRockolaStore.setState({ isPlaying: true });
                        }
                    },
                    onError: handleYtError,
                },
            });
        };

        if (window.YT && window.YT.Player) {
            setTimeout(loadVideo, 100);
        } else {
            window.onYouTubeIframeAPIReady = () => {
                setTimeout(loadVideo, 100);
            };
        }
    }, [isYouTube, currentTrack?.videoId, nextTrack, handleYtError]);

    // Listener de eventos globales para Vista Previa
    useEffect(() => {
        const handleStartPreview = (e) => {
            const previewTrack = e.detail.track;
            const current = useRockolaStore.getState().currentTrack;

            let savedTime = 0;
            if (current && !current.isPreviewMode) {
                if (current.type === 'youtube' && ytPlayerRef.current?.getCurrentTime) {
                    savedTime = ytPlayerRef.current.getCurrentTime();
                } else if (mediaRef.current) {
                    savedTime = mediaRef.current.currentTime;
                }

                useRockolaStore.setState({ pausedTrack: { ...current, savedTime } });
            }

            useRockolaStore.setState({
                currentTrack: previewTrack,
                isPlaying: true
            });
        };

        const handleStopPreview = () => {
            const current = useRockolaStore.getState().currentTrack;
            const paused = useRockolaStore.getState().pausedTrack;

            if (current?.isPreviewMode) {
                if (paused) {
                    useRockolaStore.setState({
                        currentTrack: paused,
                        pausedTrack: null,
                        isPlaying: true
                    });
                } else {
                    useRockolaStore.setState({ currentTrack: null, isPlaying: false });
                }
            }
        };

        window.addEventListener('START_PREVIEW', handleStartPreview);
        window.addEventListener('STOP_PREVIEW', handleStopPreview);

        return () => {
            window.removeEventListener('START_PREVIEW', handleStartPreview);
            window.removeEventListener('STOP_PREVIEW', handleStopPreview);
        };
    }, []);

    const handleNextTrack = useCallback(() => {
        if (queue.length === 0) {
            setToast('🚫 No hay temas en cola');
            setTimeout(() => setToast(null), 3000);
        } else {
            nextTrack();
        }
    }, [queue.length, nextTrack]);

    const renderEmbeddedQueue = () => {
        return (
            <div className="mini-player-embedded-queue" style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
            }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>COLA DE REPRODUCCIÓN ({queue.length})</span>
                    {queue.length > 0 && <span style={{ fontSize: 11, color: 'var(--accent-orange)' }}>Próximos temas</span>}
                </div>

                {queue.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                        No hay canciones en cola...
                    </div>
                ) : (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        maxHeight: '150px',
                        overflowY: 'auto',
                        paddingRight: 8
                    }}>
                        {queue.slice(0, queueDisplayCount).map((track, i) => (
                            <div key={track.id || i} style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '8px 10px',
                                background: i === 0 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(255,255,255,0.03)',
                                borderLeft: i === 0 ? '3px solid var(--accent-yellow)' : '3px solid transparent',
                                borderRadius: 6,
                                gap: 12,
                                transition: 'background 0.2s',
                                cursor: 'pointer'
                            }} onClick={() => {
                                if (window.confirm(`¿Seguro que deseas sacar "${track.title}" de la cola?`)) {
                                    useRockolaStore.getState().removeFromQueue(track.id);
                                }
                            }}>
                                <span style={{ fontSize: 12, color: i === 0 ? 'var(--accent-yellow)' : 'var(--text-muted)', minWidth: 20 }}>
                                    #{i + 1}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {track.title}
                                    </div>
                                    <div style={{ fontSize: 11, color: i === 0 ? 'var(--accent-yellow)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {track.artist || 'Desconocido'}
                                    </div>
                                </div>
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>✖</span>
                            </div>
                        ))}
                        {queue.length > queueDisplayCount && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
                                + {queue.length - queueDisplayCount} canciones más en espera
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (!currentTrack) return null;

    const thumbnail = currentTrack.thumbnail || IMAGES[0];

    const trackTitle = currentTrack.title?.includes(' - ')
        ? currentTrack.title.split(' - ')[1] || currentTrack.title
        : currentTrack.title;
    const trackArtist = currentTrack.title?.includes(' - ')
        ? currentTrack.title.split(' - ')[0]
        : currentTrack.artist || '';

    const nextInQueue = queue[0];

    // Helper to render the YouTube time remaining badge
    const ytTimeBadge = (size = 'normal') => {
        if (!isYouTube) return null;
        const isSmall = size === 'small';
        return (
            <div style={{
                display: 'flex', alignItems: 'center', gap: isSmall ? 4 : 6,
                padding: isSmall ? '2px 8px' : '4px 12px',
                background: 'rgba(239, 68, 68, 0.15)',
                borderRadius: isSmall ? 6 : 8,
                border: '1px solid var(--accent-red)',
                ...(isSmall ? {} : { marginRight: 16 }),
            }}>
                <span style={{ fontSize: isSmall ? 13 : 16 }}>⏱️</span>
                <span style={{
                    fontSize: isSmall ? 13 : 18,
                    fontWeight: isSmall ? 800 : 900,
                    color: 'var(--accent-red)',
                    fontFamily: 'monospace',
                    ...(isSmall ? {} : { letterSpacing: 1 }),
                }}>
                    {Math.floor(ytTimeRemaining / 60).toString().padStart(2, '0')}:
                    {(ytTimeRemaining % 60).toString().padStart(2, '0')}
                </span>
            </div>
        );
    };

    return (
        <>
            {/* Unified media element — always mounted, just switches src */}
            {isAudio && (
                <audio
                    ref={mediaRef}
                    key="audio-player"
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleEnded}
                    autoPlay
                    style={{ display: 'none' }}
                />
            )}

            {/* Video player area */}
            {isVideo && currentTrack.sourceUrl && (
                <div className="video-player-area">
                    <video
                        ref={mediaRef}
                        key={`video-${currentTrack.id}`}
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={handleEnded}
                        autoPlay
                        style={{ width: '100%', maxHeight: '50vh', background: '#000' }}
                        controls={false}
                    />
                </div>
            )}

            {/* Audio cover art area (same location as video) */}
            {isAudio && (
                <div className="video-player-area" style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#000',
                    height: '100%'
                }}>
                    <img
                        src={thumbnail}
                        alt={currentTrack.title}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                        }}
                    />
                </div>
            )}

            {/* YouTube player area — stable container, reuses YT.Player */}
            {isYouTube && currentTrack.videoId && (
                <div className="video-player-area" style={{ position: 'relative' }}>
                    <div
                        ref={ytContainerRef}
                        style={{ width: '100%', height: '100%' }}
                    />
                    {ytError && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.85)',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: 8, zIndex: 10,
                        }}>
                            <span style={{ fontSize: 32 }}>🚫</span>
                            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 14 }}>
                                Video bloqueado para reproducción embebida
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                Saltando al siguiente...
                            </span>
                        </div>
                    )}
                </div>
            )}

            {(() => {
                const isVisualTrack = isVideo || isYouTube || isAudio;
                const isCompact = isVisualTrack && playerPosition !== 'bottom' && playerSize <= 35;

                if (isCompact) {
                    // ===== COMPACT TWO-ROW LAYOUT =====
                    return (
                        <div className="mini-player">
                            <div className="mini-player-progress">
                                <div className="mini-player-progress-fill" style={{ width: `${progress}%` }} />
                            </div>
                            {/* Row 1: Controls */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '8px 12px 4px',
                            }}>
                                {/* Empty space for symmetry */}
                                <div style={{ flex: 1 }}></div>

                                {/* Center Controls */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                                }}>
                                    <div className="mini-player-time" style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                                        <span style={{ fontSize: 16, color: 'var(--accent-orange)' }}>{currentTime}</span>
                                        <span style={{ fontSize: 18, color: '#4ADE80', fontWeight: 900, marginLeft: 6 }}>
                                            / {currentTrack.duration ? formatTimeDuration(currentTrack.duration) : '00:00'}
                                        </span>
                                    </div>
                                    {ytTimeBadge('small')}
                                    <button
                                        className={`mini-player-btn ${focusZone === 'player' && selectedControl === 0 ? 'player-control-selected' : ''}`}
                                        onClick={togglePlay}
                                        title={isPlaying ? 'Pausa' : 'Reproducir'}
                                    >
                                        {isPlaying ? '⏸' : '▶'}
                                    </button>
                                    <button
                                        className={`mini-player-btn ${focusZone === 'player' && selectedControl === 1 ? 'player-control-selected' : ''}`}
                                        onClick={nextTrack}
                                        title="Siguiente"
                                        disabled={currentTrack?.id?.startsWith('idle-')}
                                        style={{ opacity: currentTrack?.id?.startsWith('idle-') ? 0.3 : 1 }}
                                    >
                                        ⏭
                                    </button>
                                </div>

                                {/* Empty right area to balance the center controls */}
                                <div style={{ flex: 1 }}></div>
                            </div>
                            {/* Row 2: Track info + next */}
                            <div style={{
                                display: 'flex', alignItems: 'center',
                                gap: 8, padding: '4px 12px 8px',
                            }}>
                                <img
                                    className="mini-player-thumb"
                                    src={thumbnail}
                                    alt={currentTrack.title}
                                    style={{ width: 36, height: 36, borderRadius: 6 }}
                                    onError={(e) => { e.target.src = IMAGES[0]; }}
                                />
                                <div className="mini-player-info" style={{ flex: 1, minWidth: 0 }}>
                                    <div className="mini-player-title" style={{ fontSize: 12 }}>{trackTitle}</div>
                                    <div className="mini-player-artist" style={{ fontSize: 10 }}>{trackArtist}</div>
                                </div>
                                {nextInQueue && (
                                    <div style={{
                                        fontSize: 10, color: 'var(--text-muted)',
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        flexShrink: 0, maxWidth: '40%',
                                    }}>
                                        <span style={{ color: 'var(--accent-yellow)', fontWeight: 700, fontSize: 9 }}>SIG:</span>
                                        <span style={{
                                            whiteSpace: 'nowrap', overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}>
                                            {nextInQueue.title?.includes(' - ')
                                                ? nextInQueue.title.split(' - ')[1]
                                                : nextInQueue.title}
                                        </span>
                                    </div>
                                )}
                            </div>
                            {toast && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    marginBottom: 8,
                                    background: 'var(--accent-red)',
                                    color: '#fff',
                                    padding: '6px 16px',
                                    borderRadius: 20,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    boxShadow: 'var(--shadow-glow-red)',
                                    zIndex: 100,
                                    animation: 'fadeInUp 0.3s ease'
                                }}>
                                    {toast}
                                </div>
                            )}

                            {/* Insert the unified queue component here */}
                            {renderEmbeddedQueue()}
                        </div>
                    );
                }

                // ===== NORMAL SINGLE-ROW LAYOUT =====
                return (
                    <div className="mini-player">
                        <div className="mini-player-progress">
                            <div className="mini-player-progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="mini-player-content">
                            <div className="mini-player-track">
                                <img
                                    className="mini-player-thumb"
                                    src={thumbnail}
                                    alt={currentTrack.title}
                                    onError={(e) => { e.target.src = IMAGES[0]; }}
                                />
                                <div className="mini-player-info">
                                    <div className="mini-player-title">{trackTitle}</div>
                                    <div className="mini-player-artist">{trackArtist}</div>
                                </div>
                                {ytTimeBadge('normal')}
                                <div className="mini-player-time" style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                                    <span style={{ fontSize: 18, color: 'var(--accent-orange)' }}>{currentTime}</span>
                                    <span style={{ fontSize: 20, color: '#4ADE80', fontWeight: 900, marginLeft: 6 }}>
                                        / {currentTrack.duration ? formatTimeDuration(currentTrack.duration) : '00:00'}
                                    </span>
                                </div>
                            </div>
                            <div className="mini-player-controls">
                                <button
                                    className={`mini-player-btn ${focusZone === 'player' && selectedControl === 0 ? 'player-control-selected' : ''}`}
                                    onClick={togglePlay}
                                    title={isPlaying ? 'Pausa' : 'Reproducir'}
                                >
                                    {isPlaying ? '⏸' : '▶'}
                                </button>
                                <button
                                    className={`mini-player-btn ${focusZone === 'player' && selectedControl === 1 ? 'player-control-selected' : ''}`}
                                    onClick={nextTrack}
                                    title="Siguiente"
                                    disabled={currentTrack?.id?.startsWith('idle-')}
                                    style={{ opacity: currentTrack?.id?.startsWith('idle-') ? 0.3 : 1 }}
                                >
                                    ⏭
                                </button>
                            </div>
                        </div>

                        {/* FUSION DE COLA E INCORPORACION DE "SIGUIENTES" */}
                        {renderEmbeddedQueue()}
                    </div>
                );
            })()}

        </>
    );
}
