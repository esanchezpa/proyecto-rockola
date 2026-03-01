import React, { useState, useEffect, useCallback } from 'react';
import { useGridNavigation } from '../hooks/useGridNavigation';
import { fetchGenres } from '../api/rockolaApi';
import useRockolaStore from '../store/useRockolaStore';

// Helper to generate a consistent color based on string
const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
};

// Default generic icon generator
const getIcon = (str) => {
    const icons = ['🎵', '🎶', '📻', '🎸', '🥁', '🎹', '🎷', '🎺', '💽', '🎧'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return icons[Math.abs(hash) % icons.length];
};

export default function GenrePage() {
    const [genres, setGenres] = useState([]);

    useEffect(() => {
        fetchGenres().then(data => {
            const mapped = data.map(g => ({
                id: g.toLowerCase().replace(/\s+/g, '-'),
                name: g.toUpperCase(),
                desc: 'Catálogo Local',
                icon: getIcon(g),
                color: stringToColor(g),
                rawName: g
            }));
            setGenres(mapped);
        }).catch(err => console.error("Error fetching genres:", err));
    }, []);

    const handleSelect = useCallback((idx) => {
        const selectedGenre = genres[idx];
        if (selectedGenre) {
            useRockolaStore.getState().setGenreAndNavigate(selectedGenre.rawName);
        }
    }, [genres]);

    const { selectedIndex, pageStart, pageEnd } = useGridNavigation(
        genres.length,
        3, // 3 rows
        handleSelect,
        genres.length > 0 ? genres.length : 1,
        'horizontal'
    );

    useEffect(() => {
        if (selectedIndex >= 0) {
            const selectedEl = document.querySelector('.genre-card.selected');
            if (selectedEl) {
                selectedEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    const pageGenres = genres.slice(pageStart, pageEnd);

    return (
        <div>
            <div className="section-header">
                <span className="section-icon">🎵</span>
                <span className="section-title">SELECCIONAR GÉNERO</span>
            </div>

            {genres.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Cargando géneros...
                </div>
            ) : (
                <div className="carousel-grid">
                    {pageGenres.map((g, i) => {
                        const isSelected = selectedIndex === i;
                        return (
                            <div
                                key={g.id}
                                className={`genre-card ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleSelect(pageStart + i)}
                                style={
                                    isSelected
                                        ? { background: `linear-gradient(135deg, ${g.color}, ${g.color}dd)` }
                                        : { borderLeft: `4px solid ${g.color}`, background: 'var(--bg-secondary)' }
                                }
                            >
                                {isSelected && (
                                    <span
                                        className="media-card-badge selected"
                                        style={{ position: 'absolute', top: 8, right: 8, left: 'auto' }}
                                    >
                                        SELECCIONADO
                                    </span>
                                )}
                                <span className="genre-card-icon">{g.icon}</span>
                                <span className="genre-card-arrow">→</span>
                                <div className="genre-card-name" style={{ color: isSelected ? '#fff' : g.color }}>
                                    {g.name}
                                </div>
                                <div className="genre-card-desc">{g.desc}</div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
