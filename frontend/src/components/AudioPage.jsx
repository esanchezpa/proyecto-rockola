import React, { useState, useEffect, useCallback, useRef } from 'react';
import MiniPreviewAudio from './MiniPreviewAudio';
import { useQueue } from '../hooks/useQueue';
import { useGridNavigation } from '../hooks/useGridNavigation';
import { searchLocalMedia, getStreamUrl, searchAudioDB } from '../api/rockolaApi';
import useRockolaStore from '../store/useRockolaStore';

const IMAGES = [
    '/images/concert_stage.png',
    '/images/guitar_player.png',
    '/images/microphone_stage.png',
    '/images/percussion_drums.png',
    '/images/female_singer.png',
    '/images/concert_crowd.png',
];

export default function AudioPage() {
    const [songs, setSongs] = useState([]);
    const { addToQueue } = useQueue();
    const [toast, setToast] = useState(null);
    const [artCache, setArtCache] = useState({});

    // Search states
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const searchInputRef = useRef(null);
    const focusZone = useRockolaStore((s) => s.focusZone);
    const setFocusZone = useRockolaStore((s) => s.setFocusZone);

    // Debounce timer
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedTerm(searchTerm);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        searchLocalMedia(debouncedTerm, 'audio', 100)
            .then((data) => {
                setSongs(data);
                // Fetch album art for each unique artist
                const artists = [...new Set(data.map((f) => f.artist).filter((a) => a && a !== 'Desconocido'))];
                artists.forEach((artist) => {
                    searchAudioDB(artist)
                        .then((result) => {
                            if (result?.artists?.[0]) {
                                const a = result.artists[0];
                                const thumb = a.strArtistThumb || a.strArtistFanart || a.strArtistWideThumb;
                                if (thumb) {
                                    setArtCache((prev) => ({ ...prev, [artist.toLowerCase()]: thumb }));
                                }
                            }
                        })
                        .catch(() => { });
                });
                data.forEach((file) => {
                    searchAudioDB(file.title)
                        .then((result) => {
                            if (result?.artists?.[0]) {
                                const a = result.artists[0];
                                const thumb = a.strArtistThumb || a.strArtistFanart || a.strArtistWideThumb;
                                if (thumb) {
                                    setArtCache((prev) => ({ ...prev, [`track-${file.id}`]: thumb }));
                                }
                            }
                        })
                        .catch(() => { });
                });
            })
            .catch(() => setSongs([]));
    }, []);

    const handleSelect = useCallback((globalIdx) => {
        const file = songs[globalIdx];
        if (!file) return;
        const streamUrl = getStreamUrl(file.path);
        const success = addToQueue({
            id: `audio-${file.id}`,
            title: file.artist !== 'Desconocido'
                ? `${file.artist} - ${file.title}`
                : file.title,
            type: 'audio',
            sourceUrl: streamUrl,
            thumbnail: artCache[`track-${file.id}`]
                || artCache[file.artist?.toLowerCase()]
                || IMAGES[globalIdx % IMAGES.length],
        });
        if (success === 'duplicate') {
            setToast('⚠️ Ya se encuentra en la cola');
            setTimeout(() => setToast(null), 3000);
        } else if (!success) {
            setToast('💰 ¡Inserte Moneda!');
            setTimeout(() => setToast(null), 3000);
        } else {
            setToast(`🎵 ${file.title} agregado`);
            setTimeout(() => setToast(null), 3000);
        }
    }, [songs, addToQueue, artCache]);

    // Navigation logic: 1 column list, 10 items per page
    const { selectedIndex, page, totalPages, setPage, pageStart, pageEnd } =
        useGridNavigation(songs.length, 1, handleSelect, 10);

    const getThumbnail = (file, globalIdx) => {
        return artCache[`track-${file.id}`]
            || artCache[file.artist?.toLowerCase()]
            || IMAGES[globalIdx % IMAGES.length];
    };

    const pageSongs = songs.slice(pageStart, pageEnd);
    const selectedGlobalTrack = songs[pageStart + selectedIndex] || null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {toast && <div className="toast">{toast}</div>}

            <div className="section-header" style={{ marginBottom: 16 }}>
                <div className="section-title-bar" />
                <span className="section-icon">🎵</span>
                <span className="section-title">AUDIO LOCAL</span>
                <span className="section-count">{songs.length}</span>
            </div>

            <div style={{ marginBottom: 16 }}>
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar canción o artista..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setFocusZone('grid');
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

            {songs.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: 'var(--text-secondary)',
                }}>
                    <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>📁</span>
                    <p>No se encontraron canciones de Audio local.</p>
                </div>
            ) : (
                <div className="audio-page-layout">
                    {/* Left: The Track List */}
                    <div className="audio-list-container">
                        {pageSongs.map((file, i) => {
                            const globalIdx = pageStart + i;
                            const isSelected = selectedIndex === i;
                            return (
                                <div
                                    key={file.id}
                                    className={`audio-list-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => {
                                        // Wait, clicking doesn't currently update useGridNavigation's internal SelectedIndex immediately, but handleSelect does enqueue
                                        // A simple selection:
                                        handleSelect(globalIdx);
                                    }}
                                >
                                    <div className="audio-list-info">
                                        <div className="audio-list-title">
                                            {isSelected && file.title.length > 25 ? (
                                                <marquee behavior="alternate" direction="left" scrollamount="3">
                                                    {file.title}
                                                </marquee>
                                            ) : (
                                                file.title
                                            )}
                                        </div>
                                        <div className="audio-list-artist">
                                            {file.artist !== 'Desconocido' ? file.artist : 'Archivo Local'}
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <div style={{ fontSize: 12, fontWeight: 'bold' }}>
                                            ↵ Reproducir
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {totalPages > 1 && (
                            <div className="pagination" style={{ marginTop: 8 }}>
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
                    </div>

                    {/* Right: The Preview Audio (Sticky Cover Art) */}
                    <MiniPreviewAudio track={selectedGlobalTrack} />
                </div>
            )}
        </div>
    );
}
