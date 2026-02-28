import React, { useCallback } from 'react';
import { useGridNavigation } from '../hooks/useGridNavigation';

const GENRES = [
    { id: 'cumbia', name: 'CUMBIA', desc: 'Clásicos y Modernos', icon: '🎵', color: '#f97316' },
    { id: 'salsa', name: 'SALSA', desc: 'Sensual y Dura', icon: '💃', color: '#22c55e' },
    { id: 'huayno', name: 'HUAYNO', desc: 'Folclore Peruano', icon: '🏔️', color: '#a855f7' },
    { id: 'rock', name: 'ROCK PERUANO', desc: '80s, 90s y Actual', icon: '⚡', color: '#eab308' },
    { id: 'reggaeton', name: 'REGGAETON', desc: 'Old School y Nuevo', icon: '💎', color: '#ec4899' },
    { id: 'baladas', name: 'BALADAS', desc: 'Románticas', icon: '🎹', color: '#3b82f6' },
    { id: 'techno', name: 'TECHNO', desc: 'Eurodance 90s', icon: '🎛️', color: '#f97316' },
    { id: 'chicha', name: 'CHICHA', desc: 'Clásica y Psicodélica', icon: '🎸', color: '#06b6d4' },
];

export default function GenrePage() {
    const handleSelect = useCallback((idx) => {
        // Por ahora, seleccionar género podría filtrar, pero el usuario solo pide navegar
    }, []);

    const { selectedIndex, pageStart, pageEnd } = useGridNavigation(GENRES.length, 4, handleSelect);

    const pageGenres = GENRES.slice(pageStart, pageEnd);

    return (
        <div>
            <div className="section-header">
                <span className="section-icon">🎵</span>
                <span className="section-title">SELECCIONAR GÉNERO</span>
            </div>

            <div className="genre-grid">
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
                                    : {}
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
                            <div className="genre-card-name">{g.name}</div>
                            <div className="genre-card-desc">{g.desc}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
