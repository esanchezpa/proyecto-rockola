import React, { useState, useEffect, useRef } from 'react';
import { useQueue } from '../hooks/useQueue';

const IMAGES = [
    '/images/concert_stage.png',
    '/images/guitar_player.png',
    '/images/microphone_stage.png',
    '/images/percussion_drums.png',
    '/images/female_singer.png',
    '/images/concert_crowd.png',
];

const MORE_TRACKS = [
    { title: 'Cambio Mi Corazón', duration: '3:42', imageIndex: 1 },
    { title: 'Te Vas', duration: '4:15', imageIndex: 4 },
    { title: 'Apostemos que me caso', duration: '3:55', imageIndex: 2 },
];

export default function PlayerPage({ onBack }) {
    const { currentTrack, queue, isPlaying, togglePlay, nextTrack, setPlaying } = useQueue();
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState('00:00');
    const totalDuration = '04:20';
    const intervalRef = useRef(null);

    useEffect(() => {
        if (isPlaying) {
            intervalRef.current = setInterval(() => {
                setProgress((p) => {
                    if (p >= 100) {
                        clearInterval(intervalRef.current);
                        nextTrack();
                        return 0;
                    }
                    const newP = p + 0.15;
                    const seconds = Math.floor((newP / 100) * 260);
                    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
                    const ss = String(seconds % 60).padStart(2, '0');
                    setCurrentTime(`${mm}:${ss}`);
                    return newP;
                });
            }, 400);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [isPlaying, currentTrack]);

    if (!currentTrack) {
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    gap: 16,
                }}
            >
                <span style={{ fontSize: 64 }}>🎵</span>
                <h2 style={{ color: 'var(--text-secondary)' }}>No hay canciones en la cola</h2>
                <p style={{ color: 'var(--text-muted)' }}>
                    Inserta una moneda y selecciona una canción para empezar
                </p>
                {onBack && (
                    <button
                        onClick={onBack}
                        style={{
                            marginTop: 16,
                            padding: '10px 24px',
                            background: 'var(--accent-blue)',
                            border: 'none',
                            borderRadius: 8,
                            color: 'white',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        ← Volver al menú
                    </button>
                )}
            </div>
        );
    }

    const trackTitle = currentTrack.title?.includes(' - ')
        ? currentTrack.title.split(' - ')[1]
        : currentTrack.title;
    const trackArtist = currentTrack.title?.includes(' - ')
        ? currentTrack.title.split(' - ')[0]
        : 'Artista';

    return (
        <div className="player-page">
            <div className="player-hero">
                <img
                    className="player-hero-image"
                    src={currentTrack.thumbnail || IMAGES[0]}
                    alt={currentTrack.title}
                />
                <div className="player-hero-overlay">
                    <span className="player-badge playing">EN REPRODUCCIÓN</span>
                    <div className="player-track-title">{trackTitle?.toUpperCase()}</div>
                    <div className="player-track-artist">{trackArtist?.toUpperCase()}</div>
                    <div className="player-track-genre">Cumbia Peruana • 2023</div>
                </div>
                <div className="player-time">
                    {currentTime} / {totalDuration}
                </div>
            </div>

            <div className="player-progress">
                <div className="player-progress-fill" style={{ width: `${progress}%` }} />
                <div className="player-progress-thumb" style={{ left: `${progress}%` }} />
            </div>

            <div className="player-bottom">
                <div className="player-queue">
                    <div className="player-queue-header">
                        <span style={{ fontSize: 16 }}>🎵</span>
                        <span className="section-title" style={{ fontSize: 14 }}>
                            COLA DE REPRODUCCIÓN
                        </span>
                        <span className="section-count">{queue.length}</span>
                    </div>
                    <div className="player-queue-list no-scrollbar">
                        {queue.map((track, i) => (
                            <div key={track.id} className="queue-card">
                                <img
                                    className="queue-card-image"
                                    src={track.thumbnail || IMAGES[(i + 1) % IMAGES.length]}
                                    alt={track.title}
                                />
                                <span className="queue-card-number">#{i + 1}</span>
                                <div className="queue-card-info">
                                    <div className="queue-card-title">
                                        {track.title?.includes(' - ') ? track.title.split(' - ')[1] : track.title}
                                    </div>
                                    <div className="queue-card-artist">
                                        {track.title?.includes(' - ') ? track.title.split(' - ')[0] : ''}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="queue-add-card" onClick={onBack}>
                            +
                        </div>
                    </div>
                </div>

                <div className="player-sidebar">
                    <div className="sidebar-header">
                        <span>⏱</span> MÁS DE {trackArtist?.toUpperCase()}
                    </div>
                    {MORE_TRACKS.map((t, i) => (
                        <div key={i} className="sidebar-item">
                            <img
                                className="sidebar-item-image"
                                src={IMAGES[t.imageIndex]}
                                alt={t.title}
                            />
                            <div className="sidebar-item-info">
                                <div className="sidebar-item-title">{t.title}</div>
                                <div className="sidebar-item-duration">{t.duration}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bottom-bar">
                <div className="bottom-group">
                    <span className="bottom-key">←</span>
                    <span className="bottom-key">→</span>
                    <span className="bottom-label">EXPLORAR COLA</span>
                </div>
                <div className="bottom-group">
                    <span className="bottom-key enter" onClick={togglePlay}>
                        ENTER
                    </span>
                    <span className="bottom-label action">PAUSE / PLAY</span>
                </div>
                <div className="bottom-group">
                    <span
                        className="bottom-key"
                        onClick={onBack}
                        style={{ cursor: 'pointer' }}
                    >
                        ✕
                    </span>
                    <span className="bottom-label">SALIR</span>
                </div>
            </div>
        </div>
    );
}
