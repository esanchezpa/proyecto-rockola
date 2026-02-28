import React from 'react';
import { useCredits } from '../hooks/useCredits';
import useRockolaStore from '../store/useRockolaStore';

const TAB_ICONS = {
    audio: '♪',
    video: '🎬',
    karaoke: '🎤',
    genero: '🎵',
    top: '⭐',
    youtube: '▶',
    config: '⚙️',
};

function formatTime(seconds) {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(Math.floor(seconds % 60)).padStart(2, '0');
    return `${mm}:${ss}`;
}

export default function Header() {
    const { credits, insertCoin } = useCredits();
    const activeTab = useRockolaStore((s) => s.activeTab);
    const adminMode = useRockolaStore((s) => s.adminMode);
    const currentTrack = useRockolaStore((s) => s.currentTrack);
    const isPlaying = useRockolaStore((s) => s.isPlaying);
    const ytTimeRemaining = useRockolaStore((s) => s.ytTimeRemaining);
    const creditsPerCoin = useRockolaStore((s) => s.creditsPerCoin);
    const ytMinutesPerCredit = useRockolaStore((s) => s.ytMinutesPerCredit);

    // Parse title/artist from currentTrack
    const trackTitle = currentTrack?.title?.includes(' - ')
        ? currentTrack.title.split(' - ')[1]
        : currentTrack?.title || '';
    const trackArtist = currentTrack?.title?.includes(' - ')
        ? currentTrack.title.split(' - ')[0]
        : currentTrack?.artist || '';

    const isZeroCredits = !adminMode && credits === 0;

    return (
        <header className="header">
            {/* LEFT: Logo */}
            <div className="header-logo">
                <span className="header-logo-icon">{TAB_ICONS[activeTab] || '♪'}</span>
                <h1>Rockola Perú</h1>
            </div>

            {/* CENTER: Now playing indicator */}
            {currentTrack ? (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                    maxWidth: '35%',
                }}>
                    <span style={{ fontSize: 16, opacity: 0.7 }}>
                        {isPlaying ? '▶' : '⏸'}
                    </span>
                    <div style={{ minWidth: 0 }}>
                        <div style={{
                            fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {trackTitle}
                        </div>
                        {trackArtist && (
                            <div style={{
                                fontSize: 10, color: 'var(--text-muted)',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                                {trackArtist}
                            </div>
                        )}
                    </div>
                    {/* YouTube timer display */}
                    {currentTrack?.type === 'youtube' && !adminMode && ytTimeRemaining > 0 && (
                        <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: ytTimeRemaining < 60 ? '#ef4444' : '#fbbf24',
                            background: 'rgba(255,255,255,0.08)',
                            padding: '2px 8px', borderRadius: 6,
                            fontVariantNumeric: 'tabular-nums',
                            flexShrink: 0,
                        }}>
                            ⏱ {formatTime(ytTimeRemaining)}
                        </span>
                    )}
                </div>
            ) : (
                <div style={{
                    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                    fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic',
                }}>
                    Sin reproducción
                </div>
            )}

            {/* RIGHT: Credits section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Coin info label */}
                {!adminMode && (
                    <div style={{
                        fontSize: 9, color: 'var(--text-muted)',
                        lineHeight: 1.4, textAlign: 'right',
                        letterSpacing: 0.3,
                    }}>
                        <span style={{ color: '#fcd34d', fontWeight: 700 }}>1 MONEDA</span> = {creditsPerCoin} canciones
                        <br />{creditsPerCoin} videos · {ytMinutesPerCredit} min YouTube
                    </div>
                )}

                {/* Credits badge */}
                <div
                    className={`credits-badge ${isZeroCredits ? 'credits-pulse' : ''}`}
                    onClick={insertCoin}
                    title="Click para insertar moneda (simulado)"
                >
                    <div className="credits-text">
                        {adminMode ? (
                            <>
                                <span className="credits-label" style={{ color: '#fbbf24' }}>MODO ADMIN</span>
                                <span className="credits-value">CRÉDITOS: ∞</span>
                            </>
                        ) : (
                            <>
                                <span className="credits-label">
                                    {credits > 0 ? 'CRÉDITOS' : 'INSERTE MONEDA'}
                                </span>
                                <span className="credits-value">
                                    {credits > 0 ? '' : `CRÉDITOS: ${String(credits).padStart(2, '0')}`}
                                </span>
                            </>
                        )}
                    </div>
                    {!adminMode && credits > 0 && (
                        <span style={{ fontSize: '20px', fontWeight: 900 }}>
                            {String(credits).padStart(2, '0')}
                        </span>
                    )}
                    <span className="credits-coin">{adminMode ? '🔓' : '🪙'}</span>
                </div>
            </div>
        </header>
    );
}
