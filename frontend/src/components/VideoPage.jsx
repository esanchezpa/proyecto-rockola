import React, { useState, useEffect, useCallback } from 'react';
import MediaCard from './MediaCard';
import MiniPreviewVideo from './MiniPreviewVideo';
import { useQueue } from '../hooks/useQueue';
import { useGridNavigation } from '../hooks/useGridNavigation';
import { searchLocalMedia, getStreamUrl } from '../api/rockolaApi';
import useRockolaStore from '../store/useRockolaStore';

const formatTimeDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(Math.floor(seconds % 60)).padStart(2, '0');
    return `${mm}:${ss}`;
};

const IMAGES = [
    '/images/concert_stage.png',
    '/images/guitar_player.png',
    '/images/microphone_stage.png',
    '/images/percussion_drums.png',
    '/images/female_singer.png',
    '/images/concert_crowd.png',
];

export default function VideoPage() {
    const [videos, setVideos] = useState([]);
    const { addToQueue } = useQueue();
    const [toast, setToast] = useState(null);

    // Search states
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const [displayCount, setDisplayCount] = useState(50);
    const searchInputRef = React.useRef(null);
    const focusZone = useRockolaStore((s) => s.focusZone);
    const setFocusZone = useRockolaStore((s) => s.setFocusZone);
    const videoViewStyle = useRockolaStore((s) => s.videoViewStyle);

    // Auto-preview logic
    const videoPreviewDelaySec = useRockolaStore((s) => s.videoPreviewDelaySec) || 30;
    const currentTrack = useRockolaStore((s) => s.currentTrack);

    const isList = videoViewStyle === 'list';

    // Debounce timer
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedTerm(searchTerm);
            setDisplayCount(50); // reset view list amount
        }, 350);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Force native DOM focus when zone changes to search
    useEffect(() => {
        if (focusZone === 'search' && searchInputRef.current) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        }
    }, [focusZone]);

    useEffect(() => {
        searchLocalMedia(debouncedTerm, 'video', 10000)
            .then((data) => setVideos(data))
            .catch(() => setVideos([]));
    }, [debouncedTerm]);

    const handleSelect = useCallback((globalIdx) => {
        const file = videos[globalIdx];
        if (!file) return;
        const streamUrl = getStreamUrl(file.path);
        const success = addToQueue({
            id: file.id,
            title: file.filename.replace(/\.[^/.]+$/, ''),
            type: 'video',
            sourceUrl: streamUrl,
            thumbnail: IMAGES[globalIdx % IMAGES.length],
        });
        if (success === 'duplicate') {
            setToast('⚠️ Ya se encuentra en la cola');
            setTimeout(() => setToast(null), 3000);
        } else if (!success) {
            setToast('💰 ¡Inserte Moneda!');
            setTimeout(() => setToast(null), 3000);
        }
    }, [videos, addToQueue]);

    const { selectedIndex, page, totalPages, setPage, pageStart, pageEnd } =
        useGridNavigation(videos.length, isList ? 1 : 4, handleSelect, isList ? 10000 : 12);

    const selectedGlobalTrack = videos[pageStart + selectedIndex] || null;

    // --- LOGICA DE VISTA PREVIA ---
    useEffect(() => {
        // Al moverse el cursor, detener cualquier preview activa
        const current = useRockolaStore.getState().currentTrack;
        if (current?.isPreviewMode) {
            window.dispatchEvent(new CustomEvent('STOP_PREVIEW'));
        }

        if (!selectedGlobalTrack || focusZone !== 'grid') return;

        // Se permite que la Vista Previa detenga la pista actual. 
        // Eliminado la condición de: if (current && !current.isIdle && !current.isPreviewMode) return;

        const timer = setTimeout(() => {
            const streamUrl = getStreamUrl(selectedGlobalTrack.path);
            const previewTrack = {
                id: selectedGlobalTrack.id,
                title: selectedGlobalTrack.filename.replace(/\.[^/.]+$/, ''),
                artist: 'Vista Previa Local',
                type: 'video',
                sourceUrl: streamUrl,
                isPreviewMode: true,
                duration: selectedGlobalTrack.duration
            };
            window.dispatchEvent(new CustomEvent('START_PREVIEW', { detail: { track: previewTrack } }));
        }, videoPreviewDelaySec * 1000);

        return () => clearTimeout(timer);
    }, [selectedGlobalTrack, focusZone, videoPreviewDelaySec]);

    // Limpieza al salir de la pestaña
    useEffect(() => {
        return () => {
            const current = useRockolaStore.getState().currentTrack;
            if (current?.isPreviewMode) {
                window.dispatchEvent(new CustomEvent('STOP_PREVIEW'));
            }
        };
    }, []);

    // --- FIN LOGICA VISTA PREVIA ---

    // Auto-scroll    // Auto-scroll
    useEffect(() => {
        if (focusZone === 'grid') {
            // Lazy load more items if approaching the bottom of currently displayed list
            if (isList && selectedIndex >= displayCount - 5) {
                setDisplayCount(prev => Math.min(prev + 50, videos.length));
            }

            const selector = isList ? '.audio-list-item.selected' : '.media-card.selected';
            const selectedEl = document.querySelector(selector);
            if (selectedEl) {
                selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [selectedIndex, focusZone, isList, displayCount, videos.length]);

    const pageVideos = isList ? videos.slice(0, displayCount) : videos.slice(pageStart, pageEnd);

    return (
        <div>
            {toast && <div className="toast">{toast}</div>}

            <div className="section-header" style={{ marginBottom: 16 }}>
                <span className="section-icon">🎬</span>
                <span className="section-title">VÍDEOS LOCALES</span>
                <span className="section-count">{videos.length}</span>
            </div>

            <div style={{ marginBottom: 16 }}>
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar video..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setFocusZone('grid');
                            e.target.blur();
                        } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setFocusZone('nav');
                            e.target.blur();
                        }
                    }}
                    onFocus={() => {
                        if (focusZone !== 'search') setFocusZone('search');
                    }}
                    style={{
                        width: '100%',
                        padding: '14px 20px',
                        borderRadius: 8,
                        border: focusZone === 'search' ? '2px solid var(--accent-blue)' : '2px solid transparent',
                        backgroundColor: 'var(--surface-color)',
                        color: 'var(--text-primary)',
                        fontSize: 16,
                        outline: 'none',
                        transition: 'border-color 0.2s',
                    }}
                />
            </div>

            {videos.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: 'var(--text-secondary)',
                }}>
                    <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>🎬</span>
                    <p>No se encontraron videos.</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Configura la carpeta de videos en ⚙️ Configuración
                    </p>
                </div>
            ) : isList ? (
                <div className="audio-page-layout">
                    <div className="audio-list-container">
                        {pageVideos.map((file, i) => {
                            const globalIdx = pageStart + i;
                            const isSelected = selectedIndex === i && focusZone === 'grid';
                            const title = file.filename.replace(/\.[^/.]+$/, '');
                            return (
                                <div
                                    key={file.id}
                                    className={`audio-list-item ${isSelected && focusZone === 'grid' ? 'selected' : ''}`}
                                    onClick={() => handleSelect(globalIdx)}
                                >
                                    <div className="audio-list-info">
                                        <div className="audio-list-title" title={title}>
                                            {isSelected && title.length > 50 ? (
                                                <marquee behavior="scroll" direction="right" scrollamount="3">
                                                    {title}
                                                </marquee>
                                            ) : (
                                                title
                                            )}
                                        </div>
                                        <div className="audio-list-artist" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span>VÍDEO LOCAL</span>
                                            {file.duration && (
                                                <span style={{ color: 'var(--accent-orange)' }}>
                                                    • {formatTimeDuration(file.duration)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <div style={{ fontSize: 12, fontWeight: 'bold', color: '#fff', marginLeft: 8 }}>
                                            ↵ Play
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {totalPages > 1 && (
                            <div className="pagination" style={{ marginTop: 8 }}>
                                <button className="pagination-btn" disabled={page === 0} onClick={() => setPage(page - 1)}>
                                    ‹ Anterior
                                </button>
                                <span className="pagination-info">Página {page + 1} de {totalPages}</span>
                                <button className="pagination-btn" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                                    Siguiente ›
                                </button>
                            </div>
                        )}
                    </div>
                    {(!currentTrack || (currentTrack.type !== 'video' && currentTrack.type !== 'youtube')) && (
                        <MiniPreviewVideo
                            track={selectedGlobalTrack}
                            isPlayingOtherTrack={!!currentTrack && !currentTrack.isIdle && !currentTrack.isPreviewMode}
                            delaySec={videoPreviewDelaySec}
                        />
                    )}
                </div>
            ) : (
                <>
                    <div className="media-grid">
                        {pageVideos.map((file, i) => {
                            const globalIdx = pageStart + i;
                            return (
                                <MediaCard
                                    key={file.id}
                                    title={file.filename.replace(/\.[^/.]+$/, '')}
                                    artist="Archivo Local • Video"
                                    duration={file.duration || '🎬'}
                                    imageIndex={globalIdx}
                                    videoSrc={getStreamUrl(file.path)}
                                    selected={selectedIndex === i}
                                    badge={selectedIndex === i ? 'REPRODUCIR' : null}
                                    badgeType="selected"
                                    showPlayOverlay
                                    onClick={() => handleSelect(globalIdx)}
                                />
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                className="pagination-btn"
                                disabled={page === 0}
                                onClick={() => setPage(page - 1)}
                            >
                                ‹ Anterior
                            </button>
                            <span className="pagination-info">
                                Página {page + 1} de {totalPages}
                            </span>
                            <button
                                className="pagination-btn"
                                disabled={page >= totalPages - 1}
                                onClick={() => setPage(page + 1)}
                            >
                                Siguiente ›
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
