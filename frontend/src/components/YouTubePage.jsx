import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQueue } from '../hooks/useQueue';
import { searchYouTube, getYouTubeSuggestions } from '../api/rockolaApi';
import useRockolaStore from '../store/useRockolaStore';
import ErrorBoundary from './ErrorBoundary';

const ROWS = 3;
const VISIBLE_COLS = 4;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Module-level cache — survives tab switches
let searchCache = {
    query: '',
    results: null,
    nextPageToken: null,
    timestamp: 0,
};

export default function YouTubePage() {
    // Restore from cache if still valid
    const cachedValid = searchCache.results && (Date.now() - searchCache.timestamp < CACHE_TTL);

    const [query, setQuery] = useState(cachedValid ? searchCache.query : '');
    const [searchResults, setSearchResults] = useState(cachedValid ? searchCache.results : null);
    const [nextPageToken, setNextPageToken] = useState(cachedValid ? searchCache.nextPageToken : null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestIdx, setSuggestIdx] = useState(-1);
    const [toast, setToast] = useState(null);
    const [searching, setSearching] = useState(false);
    const { addToQueue } = useQueue();
    const searchInputRef = useRef(null);
    const suggestTimer = useRef(null);
    const searchTimer = useRef(null);
    const activeQuery = useRef(cachedValid ? searchCache.query : '');
    const trackRef = useRef(null);
    const skipTransition = useRef(false);

    // Save search state to cache on unmount
    useEffect(() => {
        return () => {
            if (searchResults && activeQuery.current) {
                searchCache = {
                    query: activeQuery.current,
                    results: searchResults,
                    nextPageToken,
                    timestamp: Date.now(),
                };
            }
        };
    }, [searchResults, nextPageToken]);

    // Focus zone management
    const [focusArea, setFocusArea] = useState('carousel'); // 'search' or 'carousel'

    // Get pre-loaded YouTube data from store
    const ytTrending = useRockolaStore((s) => s.ytTrending);
    const ytMusicVideos = useRockolaStore((s) => s.ytMusicVideos);
    const focusZone = useRockolaStore((s) => s.focusZone);

    // Carousel state
    const [scrollCol, setScrollCol] = useState(0);
    const [selRow, setSelRow] = useState(0);
    const [selCol, setSelCol] = useState(0);

    // Combine all videos
    const allVideos = useMemo(() => {
        if (searchResults) return searchResults;
        return [...ytTrending, ...ytMusicVideos];
    }, [searchResults, ytTrending, ytMusicVideos]);

    const totalCols = Math.ceil(allVideos.length / ROWS);

    const getVideoAt = useCallback((col, row) => {
        const idx = col * ROWS + row;
        return idx < allVideos.length ? allVideos[idx] : null;
    }, [allVideos]);

    // ===== CENTER the selected column in the viewport =====
    const computeScrollCol = useCallback((selectedCol, total) => {
        const half = Math.floor(VISIBLE_COLS / 2);
        let target = selectedCol - half;
        if (target < 0) target = 0;
        if (total > VISIBLE_COLS && target > total - VISIBLE_COLS) {
            target = total - VISIBLE_COLS;
        }
        return Math.max(0, target);
    }, []);

    // ===== SEARCH LOGIC =====

    // Debounced suggestions fetching
    const fetchSuggestions = useCallback((q) => {
        if (suggestTimer.current) clearTimeout(suggestTimer.current);
        if (!q || q.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        suggestTimer.current = setTimeout(() => {
            getYouTubeSuggestions(q)
                .then((data) => {
                    setSuggestions(data.suggestions || []);
                    setShowSuggestions(true);
                    setSuggestIdx(-1);
                })
                .catch(() => { });
        }, 250);
    }, []);

    const handleInputChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        fetchSuggestions(val);
    };

    // Core search execution — cancels timers and runs immediately
    const executeSearch = useCallback((q) => {
        if (!q || !q.trim()) return;
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (suggestTimer.current) clearTimeout(suggestTimer.current);

        setShowSuggestions(false);
        setSuggestions([]);
        setSearching(true);
        activeQuery.current = q;
        searchYouTube(q)
            .then((data) => {
                setSearchResults(data.results || []);
                setNextPageToken(data.nextPageToken || null);
                setScrollCol(0);
                setSelCol(0);
                setSelRow(0);
            })
            .catch(() => { })
            .finally(() => setSearching(false));
    }, []);

    // Load more results (pagination) — seamless, no view reset
    const loadMoreResults = useCallback(() => {
        if (loadingMore || !nextPageToken || !activeQuery.current) return;
        setLoadingMore(true);
        searchYouTube(activeQuery.current, nextPageToken)
            .then((data) => {
                const newResults = data.results || [];
                // Disable CSS transition so new columns appear without visual jump
                skipTransition.current = true;
                if (trackRef.current) {
                    trackRef.current.style.transition = 'none';
                }
                setSearchResults((prev) => [...(prev || []), ...newResults]);
                setNextPageToken(data.nextPageToken || null);
                // Re-enable transition after paint
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        skipTransition.current = false;
                        if (trackRef.current) {
                            trackRef.current.style.transition = '';
                        }
                    });
                });
            })
            .catch(() => { })
            .finally(() => setLoadingMore(false));
    }, [loadingMore, nextPageToken]);

    const handleSelectSuggestion = (suggestion) => {
        setQuery(suggestion);
        executeSearch(suggestion);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        executeSearch(query);
    };

    const handleClearSearch = () => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (suggestTimer.current) clearTimeout(suggestTimer.current);
        setQuery('');
        setSearchResults(null);
        setNextPageToken(null);
        setSuggestions([]);
        setShowSuggestions(false);
        activeQuery.current = '';
        setScrollCol(0);
        setSelCol(0);
        setSelRow(0);
    };

    // ===== QUEUE LOGIC =====
    const handleSelect = useCallback((video) => {
        if (!video) return;
        const success = addToQueue({
            id: video.id || `yt-${video.videoId}`,
            title: video.title,
            type: 'youtube',
            videoId: video.videoId,
            thumbnail: video.thumbnail,
            sourceUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
        });
        if (success === 'duplicate') {
            setToast('⚠️ Ya se encuentra en la cola');
            setTimeout(() => setToast(null), 3000);
        } else if (!success) {
            setToast('💰 ¡Inserte Moneda!');
            setTimeout(() => setToast(null), 3000);
        }
    }, [addToQueue]);

    // ===== KEYBOARD NAVIGATION =====

    // Search input keyboard handling
    const handleSearchKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (showSuggestions && suggestions.length > 0) {
                setSuggestIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
            } else {
                setShowSuggestions(false);
                setFocusArea('carousel');
                searchInputRef.current?.blur();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (showSuggestions && suggestIdx > 0) {
                setSuggestIdx((prev) => prev - 1);
            } else if (suggestIdx === 0) {
                setSuggestIdx(-1);
            } else {
                useRockolaStore.getState().setFocusZone('nav');
                setShowSuggestions(false);
                searchInputRef.current?.blur();
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (showSuggestions && suggestIdx >= 0) {
                handleSelectSuggestion(suggestions[suggestIdx]);
            } else {
                executeSearch(query);
            }
            searchInputRef.current?.blur();
            setFocusArea('carousel');
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            searchInputRef.current?.blur();
            setFocusArea('carousel');
        }
    };

    // Carousel keyboard navigation
    useEffect(() => {
        if (focusZone !== 'grid' || focusArea !== 'carousel') return;

        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key) {
                case 'ArrowRight': {
                    e.preventDefault();
                    e.stopPropagation();
                    const nextCol = selCol + 1;
                    if (nextCol < totalCols) {
                        setSelCol(nextCol);
                        setScrollCol(computeScrollCol(nextCol, totalCols));
                    } else if (searchResults && nextPageToken && !loadingMore) {
                        // At the absolute last column — trigger loading
                        loadMoreResults();
                    }
                    break;
                }
                case 'ArrowLeft': {
                    e.preventDefault();
                    e.stopPropagation();
                    const prevCol = selCol - 1;
                    if (prevCol >= 0) {
                        setSelCol(prevCol);
                        setScrollCol(computeScrollCol(prevCol, totalCols));
                    }
                    break;
                }
                case 'ArrowDown': {
                    e.preventDefault();
                    e.stopPropagation();
                    if (selRow < ROWS - 1) {
                        const nextVideo = getVideoAt(selCol, selRow + 1);
                        if (nextVideo) {
                            setSelRow(selRow + 1);
                        }
                    } else {
                        // Last row → go to player controls
                        useRockolaStore.getState().setFocusZone('player');
                    }
                    break;
                }
                case 'ArrowUp': {
                    e.preventDefault();
                    e.stopPropagation();
                    if (selRow > 0) {
                        setSelRow(selRow - 1);
                    } else {
                        // First row → go to search bar
                        setFocusArea('search');
                        setTimeout(() => searchInputRef.current?.focus(), 50);
                    }
                    break;
                }
                case 'Enter': {
                    e.preventDefault();
                    e.stopPropagation();
                    const video = getVideoAt(selCol, selRow);
                    if (video) handleSelect(video);
                    break;
                }
                default:
                    return;
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [focusZone, focusArea, selCol, selRow, totalCols, handleSelect, getVideoAt, computeScrollCol, searchResults, nextPageToken, loadMoreResults, loadingMore]);

    // When entering grid from nav
    useEffect(() => {
        if (focusZone === 'grid') {
            setFocusArea('carousel');
        }
    }, [focusZone]);

    // ===== RENDER VIDEO CARD =====
    const renderVideoCard = (video, col, row) => {
        if (!video) return <div key={`empty-${col}-${row}`} className="carousel-cell carousel-cell-empty" />;
        const isSelected = focusZone === 'grid' && focusArea === 'carousel' && selCol === col && selRow === row;
        return (
            <div
                key={video.id || `${video.videoId}-${col}-${row}`}
                className={`carousel-cell media-card youtube-card ${isSelected ? 'selected-red' : ''}`}
                onClick={() => handleSelect(video)}
            >
                <div style={{ position: 'relative' }}>
                    <img
                        className="media-card-image"
                        src={video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
                        alt={video.title}
                        onError={(e) => { e.target.src = '/images/concert_stage.png'; }}
                    />
                    {video.duration && (
                        <span className="media-card-duration">{video.duration}</span>
                    )}
                    {isSelected && (
                        <span className="media-card-badge selected">REPRODUCIR</span>
                    )}
                </div>
                <div className="media-card-info" style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <div className="youtube-channel-avatar" style={{ fontSize: 10, width: 24, height: 24, minWidth: 24 }}>
                        {video.channel?.[0] || '?'}
                    </div>
                    <div className="youtube-info" style={{ minWidth: 0 }}>
                        <div className="media-card-title" style={{ fontSize: 11 }}>{video.title}</div>
                        <div className="media-card-artist" style={{ fontSize: 10 }}>{video.channel}</div>
                        <div className="youtube-views" style={{ fontSize: 9 }}>
                            {video.views}{video.views && video.published ? ' • ' : ''}{video.published}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // translateX: percentage relative to track's own width
    // Track width = (totalCols / VISIBLE_COLS) * 100% of viewport
    // To shift by scrollCol columns: -(scrollCol / totalCols) * 100%
    const translateX = totalCols > 0 ? -(scrollCol / totalCols) * 100 : 0;

    return (
        <div>
            {toast && <div className="toast">{toast}</div>}

            {/* Search bar with suggestions */}
            <div className="youtube-search-wrapper">
                <form className="youtube-search-bar" onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
                    <span className="youtube-search-icon">🔍</span>
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Buscar en YouTube..."
                        value={query}
                        onChange={handleInputChange}
                        onKeyDown={handleSearchKeyDown}
                        onFocus={() => {
                            setFocusArea('search');
                            if (suggestions.length > 0) setShowSuggestions(true);
                        }}
                        onBlur={() => {
                            setTimeout(() => setShowSuggestions(false), 200);
                        }}
                        className={focusArea === 'search' ? 'search-focused' : ''}
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={handleClearSearch}
                            style={{
                                background: 'none', border: 'none', color: 'var(--text-muted)',
                                cursor: 'pointer', fontSize: 16, padding: '4px 8px',
                            }}
                        >✕</button>
                    )}
                    <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>🔍</button>
                    {searching && (
                        <span style={{ position: 'absolute', right: 60, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)' }}>
                            Buscando...
                        </span>
                    )}
                </form>

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="youtube-suggestions">
                        {suggestions.map((s, i) => (
                            <div
                                key={i}
                                className={`youtube-suggestion-item ${suggestIdx === i ? 'active' : ''}`}
                                onMouseDown={() => handleSelectSuggestion(s)}
                                onMouseEnter={() => setSuggestIdx(i)}
                            >
                                <span style={{ marginRight: 8, opacity: 0.4 }}>🔍</span>
                                {s}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Search results header */}
            {searchResults && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <button
                        style={{
                            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)', padding: '6px 14px', borderRadius: 8,
                            cursor: 'pointer', fontSize: 12,
                        }}
                        onClick={handleClearSearch}
                    >
                        ← Tendencias
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        🔍 "{query}" — {searchResults.length} resultados
                        {nextPageToken && ' (más disponibles →)'}
                    </span>
                </div>
            )}

            <div className="section-header">
                <span className="section-icon">{searchResults ? '🔍' : '🔥'}</span>
                <span className="section-title">{searchResults ? 'RESULTADOS' : 'TENDENCIAS Y VÍDEOS MUSICALES'}</span>
                <span className="section-count">{allVideos.length}</span>
                {totalCols > VISIBLE_COLS && (
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                        {scrollCol + 1}–{Math.min(scrollCol + VISIBLE_COLS, totalCols)} de {totalCols} columnas
                    </span>
                )}
            </div>

            {/* Infinite Carousel */}
            <div className="carousel-viewport">
                <div
                    ref={trackRef}
                    className="carousel-track"
                    style={{
                        transform: `translateX(${translateX}%)`,
                        width: `${((totalCols + (loadingMore ? 1 : 0)) / VISIBLE_COLS) * 100}%`,
                    }}
                >
                    {Array.from({ length: totalCols }, (_, colIdx) => (
                        <div
                            key={`col-${colIdx}`}
                            className="carousel-column"
                            style={{ width: `${100 / (totalCols + (loadingMore ? 1 : 0))}%` }}
                        >
                            {Array.from({ length: ROWS }, (_, rowIdx) => {
                                const video = getVideoAt(colIdx, rowIdx);
                                return renderVideoCard(video, colIdx, rowIdx);
                            })}
                        </div>
                    ))}
                    {/* Loading placeholder column */}
                    {loadingMore && (
                        <div
                            className="carousel-column"
                            style={{
                                width: `${100 / (totalCols + 1)}%`,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                            }}
                        >
                            {Array.from({ length: ROWS }, (_, i) => (
                                <div key={`loading-${i}`} style={{
                                    flex: 1,
                                    width: '90%',
                                    background: 'var(--bg-card)',
                                    borderRadius: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0.5,
                                    animation: 'pulse 1.5s ease-in-out infinite',
                                }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                        {i === 1 ? 'Cargando...' : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Scroll indicator + loading more */}
            {totalCols > VISIBLE_COLS && (
                <div style={{
                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4,
                    padding: '8px 0', marginTop: 4,
                }}>
                    {Array.from({ length: Math.min(totalCols, 20) }, (_, i) => (
                        <div
                            key={i}
                            style={{
                                width: i >= scrollCol && i < scrollCol + VISIBLE_COLS ? 16 : 6,
                                height: 4,
                                borderRadius: 2,
                                background: i >= scrollCol && i < scrollCol + VISIBLE_COLS
                                    ? 'var(--accent-blue)'
                                    : 'rgba(255,255,255,0.15)',
                                transition: 'all 0.3s',
                            }}
                        />
                    ))}
                    {loadingMore && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>
                            Cargando más...
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
