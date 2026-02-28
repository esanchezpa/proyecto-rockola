import React, { useState, useEffect, useCallback } from 'react';
import MediaCard from './MediaCard';
import { useQueue } from '../hooks/useQueue';
import { useGridNavigation } from '../hooks/useGridNavigation';
import { searchLocalMedia, getStreamUrl } from '../api/rockolaApi';
import useRockolaStore from '../store/useRockolaStore';

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
    const searchInputRef = React.useRef(null);
    const focusZone = useRockolaStore((s) => s.focusZone);
    const setFocusZone = useRockolaStore((s) => s.setFocusZone);

    // Debounce timer
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedTerm(searchTerm);
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
        searchLocalMedia(debouncedTerm, 'video', 100)
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
        useGridNavigation(videos.length, 4, handleSelect);

    // Auto-scroll to selected item
    useEffect(() => {
        if (focusZone === 'grid') {
            const selectedEl = document.querySelector('.media-card.selected');
            if (selectedEl) {
                selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [selectedIndex, page, focusZone]);

    const pageVideos = videos.slice(pageStart, pageEnd);

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
