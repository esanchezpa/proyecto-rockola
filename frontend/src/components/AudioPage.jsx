import React, { useState, useEffect, useCallback, useRef } from 'react';
import MiniPreviewAudio from './MiniPreviewAudio';
import { useQueue } from '../hooks/useQueue';
import { useGridNavigation } from '../hooks/useGridNavigation';
import { searchLocalMedia, getStreamUrl, fetchArtists } from '../api/rockolaApi';
import useRockolaStore from '../store/useRockolaStore';

const formatTimeDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(Math.floor(seconds % 60)).padStart(2, '0');
    return `${mm}:${ss}`;
};

const GENERIC_MUSIC_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzY0NzQ4YiI+PHBhdGggZD0iTTEyIDN2MTAuNTVBNCA0IDAgMTAxNCAxN1Y3aDRWM2gtNnoiLz48L3N2Zz4=';

export default function AudioPage() {
    const [songs, setSongs] = useState([]);
    const [artists, setArtists] = useState([]);
    const { addToQueue } = useQueue();
    const [toast, setToast] = useState(null);
    const [artCache, setArtCache] = useState({});

    // Search states
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const searchInputRef = useRef(null);
    const focusZone = useRockolaStore((s) => s.focusZone);
    const setFocusZone = useRockolaStore((s) => s.setFocusZone);
    const selectedGenre = useRockolaStore((s) => s.selectedGenre);
    const setSelectedGenre = useRockolaStore((s) => s.setSelectedGenre);
    const selectedArtist = useRockolaStore((s) => s.selectedArtist);
    const setSelectedArtist = useRockolaStore((s) => s.setSelectedArtist);
    const viewMode = useRockolaStore((s) => s.viewMode);
    const setViewMode = useRockolaStore((s) => s.setViewMode);

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

    // Fetch Songs
    useEffect(() => {
        if (viewMode === 'list') {
            searchLocalMedia(debouncedTerm, 'audio', 5000, selectedGenre, selectedArtist)
                .then((data) => setSongs(data))
                .catch(() => setSongs([]));
        }
    }, [debouncedTerm, selectedGenre, selectedArtist, viewMode]);

    // Handle viewToggles zone
    useEffect(() => {
        if (focusZone !== 'viewToggles') return;

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusZone('grid');
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusZone('search');
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setViewMode('list');
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setViewMode('artists');
            } else if (e.key === 'Enter') {
                e.preventDefault();
                setFocusZone('grid');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [focusZone, setFocusZone, setViewMode]);

    // Fetch Artists
    useEffect(() => {
        if (selectedGenre) {
            fetchArtists(selectedGenre)
                .then((data) => {
                    if (debouncedTerm) {
                        const lower = debouncedTerm.toLowerCase();
                        data = data.filter(a => a.name.toLowerCase().includes(lower));
                    }
                    setArtists(data);
                })
                .catch(() => setArtists([]));
        }
    }, [debouncedTerm, selectedGenre]);

    const handleSelect = useCallback((globalIdx) => {
        if (viewMode === 'artists') {
            const artist = artists[globalIdx];
            if (artist) {
                useRockolaStore.getState().setArtistAndNavigate(artist.name);
            }
            return;
        }

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
            artwork: file.artwork,
            duration: file.duration,
            thumbnail: file.artwork
                ? getStreamUrl(file.artwork)
                : (artCache[`track-${file.id}`] || artCache[file.artist?.toLowerCase()] || GENERIC_MUSIC_ICON),
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
    }, [songs, artists, viewMode, addToQueue, artCache]);

    // Navigation logic
    const listLength = viewMode === 'list' ? songs.length : artists.length;
    const itemsPerPage = viewMode === 'list' ? 5000 : 12;
    const numColumns = viewMode === 'list' ? 1 : 4;

    const { selectedIndex, page, totalPages, setPage, pageStart, pageEnd } =
        useGridNavigation(listLength, numColumns, handleSelect, itemsPerPage);

    // Auto-scroll to selected item
    useEffect(() => {
        if (focusZone === 'grid') {
            const selectedEl = document.querySelector('.audio-list-item.selected');
            if (selectedEl) {
                selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [selectedIndex, page, focusZone]);

    const getThumbnail = (file) => {
        if (!file) return GENERIC_MUSIC_ICON;
        if (file.artwork) return getStreamUrl(file.artwork);
        return artCache[`track-${file.id}`]
            || artCache[file.artist?.toLowerCase()]
            || GENERIC_MUSIC_ICON;
    };

    const pageSongs = songs.slice(pageStart, pageEnd);
    const pageArtists = artists.slice(pageStart, pageEnd);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {toast && <div className="toast">{toast}</div>}

            <div className="section-header" style={{ marginBottom: 16 }}>
                <div className="section-title-bar" />
                <span className="section-icon">🎵</span>
                <span className="section-title">AUDIO LOCAL {selectedGenre ? `> ${selectedGenre.toUpperCase()}` : ''}</span>
                <span className="section-count">{songs.length}</span>
                {selectedGenre && (
                    <button
                        onClick={() => setSelectedGenre('')}
                        style={{
                            marginLeft: 'auto', padding: '4px 12px', background: 'var(--accent-red)',
                            border: 'none', borderRadius: 4, color: 'white', fontWeight: 'bold',
                            cursor: 'pointer', fontSize: 12
                        }}
                    >
                        ✕ Quitar Filtro
                    </button>
                )}
            </div>

            <div style={{ marginBottom: 16 }}>
                {selectedGenre && !selectedArtist && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                flex: 1, padding: '10px', borderRadius: 8, fontWeight: 'bold',
                                background: viewMode === 'list' ? 'var(--accent-blue)' : 'var(--surface-color)',
                                color: viewMode === 'list' ? '#fff' : 'var(--text-muted)',
                                border: '2px solid',
                                borderColor: focusZone === 'viewToggles' && viewMode === 'list' ? 'white' : (viewMode === 'list' ? 'var(--accent-blue)' : 'transparent'),
                                boxShadow: focusZone === 'viewToggles' && viewMode === 'list' ? '0 0 10px white' : 'none',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            📝 LISTA DE CANCIONES
                        </button>
                        <button
                            onClick={() => setViewMode('artists')}
                            style={{
                                flex: 1, padding: '10px', borderRadius: 8, fontWeight: 'bold',
                                background: viewMode === 'artists' ? 'var(--accent-blue)' : 'var(--surface-color)',
                                color: viewMode === 'artists' ? '#fff' : 'var(--text-muted)',
                                border: '2px solid',
                                borderColor: focusZone === 'viewToggles' && viewMode === 'artists' ? 'white' : (viewMode === 'artists' ? 'var(--accent-blue)' : 'transparent'),
                                boxShadow: focusZone === 'viewToggles' && viewMode === 'artists' ? '0 0 10px white' : 'none',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            🎤 ARTISTAS ({artists.length})
                        </button>
                    </div>
                )}

                {selectedArtist && (
                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-color)', padding: '12px 20px', borderRadius: 8 }}>
                        <span style={{ fontSize: 24 }}>🎤</span>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Filtrando por artista</div>
                            <div style={{ fontSize: 18, fontWeight: 'bold', color: 'var(--accent-green)' }}>{selectedArtist}</div>
                        </div>
                        <button
                            onClick={() => setSelectedArtist('')}
                            style={{ marginLeft: 'auto', background: 'var(--bg-primary)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 4, cursor: 'pointer' }}
                        >
                            ✕ Cancelar
                        </button>
                    </div>
                )}

                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar canción o artista..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            if (selectedGenre && !selectedArtist) setFocusZone('viewToggles');
                            else setFocusZone('grid');
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

            {viewMode === 'list' && songs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                    <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>📁</span>
                    <p>No se encontraron canciones.</p>
                </div>
            ) : viewMode === 'artists' && artists.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                    <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>🎤</span>
                    <p>No se encontraron artistas en este género.</p>
                </div>
            ) : (
                <div className="audio-page-layout" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    {viewMode === 'artists' ? (
                        <div className="genre-grid" style={{ paddingBottom: 16 }}>
                            {pageArtists.map((artist, i) => {
                                const globalIdx = pageStart + i;
                                const isSelected = selectedIndex === i && focusZone === 'grid';
                                const cover = artist.artwork ? getStreamUrl(artist.artwork) : GENERIC_MUSIC_ICON;
                                return (
                                    <div
                                        key={artist.name}
                                        className={`genre-card ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleSelect(globalIdx)}
                                        style={
                                            isSelected
                                                ? { background: `linear-gradient(135deg, var(--accent-blue), #2563eb)` }
                                                : { borderLeft: `4px solid var(--accent-blue)`, background: 'var(--bg-secondary)', overflow: 'hidden' }
                                        }
                                    >
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: `url("${cover}") center/cover opacity(0.3)` }} />
                                        <span className="genre-card-icon" style={{ position: 'relative', zIndex: 1 }}>🎤</span>
                                        <span className="genre-card-arrow" style={{ position: 'relative', zIndex: 1 }}>→</span>
                                        <div className="genre-card-name" style={{ color: isSelected ? '#fff' : 'var(--accent-blue)', position: 'relative', zIndex: 1 }}>
                                            {artist.name}
                                        </div>
                                        <div className="genre-card-desc" style={{ position: 'relative', zIndex: 1 }}>
                                            {artist.count} canciones
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="audio-list-container">
                            {pageSongs.map((file, i) => {
                                const globalIdx = pageStart + i;
                                const isSelected = selectedIndex === i && focusZone === 'grid';
                                const thumb = getThumbnail(file);
                                return (
                                    <div
                                        key={file.id}
                                        className={`audio-list-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleSelect(globalIdx)}
                                        style={{ display: 'flex', alignItems: 'center' }}
                                    >
                                        <div style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 6,
                                            backgroundImage: `url("${thumb}")`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            marginRight: 14,
                                            flexShrink: 0,
                                            border: isSelected ? '2px solid var(--accent-green)' : '1px solid rgba(255,255,255,0.1)'
                                        }} />
                                        <div className="audio-list-info" style={{ flex: 1, overflow: 'hidden' }}>
                                            <div className="audio-list-title" title={file.title} style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                <span style={{ color: 'var(--accent-blue)', marginRight: 6 }}>{globalIdx + 1}.</span>
                                                {isSelected && file.title.length > 40 ? (
                                                    <marquee behavior="scroll" direction="right" scrollamount="3" style={{ display: 'inline-block', verticalAlign: 'bottom', width: 'calc(100% - 30px)' }}>
                                                        {file.title}
                                                    </marquee>
                                                ) : (
                                                    file.title
                                                )}
                                            </div>
                                            <div className="audio-list-artist" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85em', color: 'var(--text-muted)', marginTop: 4 }}>
                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {file.artist !== 'Desconocido' ? file.artist : 'Desconocido'}
                                                </span>
                                                {file.duration && (
                                                    <span style={{ color: 'var(--accent-orange)', whiteSpace: 'nowrap' }}>
                                                        • {formatTimeDuration(file.duration)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--accent-green)', marginLeft: 8, flexShrink: 0 }}>
                                                ↵ Play
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="pagination" style={{ marginTop: 'auto', paddingTop: 8 }}>
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
            )}
        </div>
    );
}
