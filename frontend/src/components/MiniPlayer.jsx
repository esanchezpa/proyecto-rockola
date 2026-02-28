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

export default function MiniPlayer() {
    const currentTrack = useRockolaStore((s) => s.currentTrack);
    const isPlaying = useRockolaStore((s) => s.isPlaying);
    const queue = useRockolaStore((s) => s.queue);
    const togglePlay = useRockolaStore((s) => s.togglePlay);
    const nextTrack = useRockolaStore((s) => s.nextTrack);
    const focusZone = useRockolaStore((s) => s.focusZone);
    const playerSize = useRockolaStore((s) => s.playerSize);
    const playerPosition = useRockolaStore((s) => s.playerPosition);
    const consumeYtTime = useRockolaStore((s) => s.consumeYtTime);
    const ytTimeRemaining = useRockolaStore((s) => s.ytTimeRemaining);
    const [showQueue, setShowQueue] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState('00:00');
    const [selectedControl, setSelectedControl] = useState(0); // 0=play, 1=next, 2=queue
    const mediaRef = useRef(null);
    const prevTrackId = useRef(null);
    const ytIframeRef = useRef(null);

    const isVideo = currentTrack?.type === 'video';
    const isYouTube = currentTrack?.type === 'youtube';
    const isAudio = currentTrack && !isVideo && !isYouTube;

    const CONTROLS_COUNT = 3; // play/pause, next, queue

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
                        setSelectedControl((prev) => Math.max(prev - 1, 0));
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
                        else if (selectedControl === 1) nextTrack();
                        else if (selectedControl === 2) setShowQueue((prev) => !prev);
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
                    ytPlayerRef.current.loadVideoById(currentTrack.videoId);
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

            {/* Mini player bar */}
            {(() => {
                const isVideoTrack = currentTrack?.type === 'video' || currentTrack?.type === 'youtube';
                const isCompact = isVideoTrack && playerPosition !== 'bottom' && playerSize <= 35;

                if (isCompact) {
                    // ===== COMPACT TWO-ROW LAYOUT =====
                    return (
                        <div className="mini-player">
                            <div className="mini-player-progress">
                                <div className="mini-player-progress-fill" style={{ width: `${progress}%` }} />
                            </div>
                            {/* Row 1: Controls */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: 8, padding: '8px 12px 4px',
                            }}>
                                <span className="mini-player-time">{currentTime}</span>
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
                                >
                                    ⏭
                                </button>
                                <button
                                    className={`mini-player-btn ${showQueue ? 'active-btn' : ''} ${focusZone === 'player' && selectedControl === 2 ? 'player-control-selected' : ''}`}
                                    onClick={() => setShowQueue(!showQueue)}
                                    title="Cola de reproducción"
                                >
                                    🎵 <span className="mini-player-queue-count">{queue.length}</span>
                                </button>
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
                                <span className="mini-player-time">{currentTime}</span>
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
                                >
                                    ⏭
                                </button>
                                <button
                                    className={`mini-player-btn ${showQueue ? 'active-btn' : ''} ${focusZone === 'player' && selectedControl === 2 ? 'player-control-selected' : ''}`}
                                    onClick={() => setShowQueue(!showQueue)}
                                    title="Cola de reproducción"
                                >
                                    🎵 <span className="mini-player-queue-count">{queue.length}</span>
                                </button>
                            </div>
                            {nextInQueue && (
                                <div className="mini-player-next">
                                    <span className="mini-player-next-label">SIGUIENTE:</span>
                                    <span className="mini-player-next-title">
                                        {nextInQueue.title?.includes(' - ')
                                            ? nextInQueue.title.split(' - ')[1]
                                            : nextInQueue.title}
                                    </span>
                                    {nextInQueue.title?.includes(' - ') && (
                                        <span className="mini-player-next-artist">
                                            — {nextInQueue.title.split(' - ')[0]}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Queue overlay */}
            {showQueue && (
                <div className="queue-overlay">
                    <div className="queue-overlay-header">
                        <span>🎵 Cola de Reproducción ({queue.length})</span>
                        <button onClick={() => setShowQueue(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer' }}>✕</button>
                    </div>
                    {queue.length === 0 ? (
                        <div className="queue-overlay-empty">
                            No hay canciones en la cola
                        </div>
                    ) : (
                        <div className="queue-overlay-list">
                            {queue.map((track, i) => (
                                <div key={track.id} className="queue-overlay-item">
                                    <span className="queue-overlay-num">#{i + 1}</span>
                                    <img
                                        className="queue-overlay-thumb"
                                        src={track.thumbnail || IMAGES[(i + 1) % IMAGES.length]}
                                        alt={track.title}
                                        onError={(e) => { e.target.src = IMAGES[0]; }}
                                    />
                                    <div className="queue-overlay-info">
                                        <div className="queue-overlay-title">{track.title}</div>
                                        <div className="queue-overlay-type">{track.type === 'youtube' ? '🌐 YouTube' : '💾 Local'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
