import React, { useState, useEffect } from 'react';
import MediaCard from './MediaCard';
import { useQueue } from '../hooks/useQueue';
import { useGridNavigation } from '../hooks/useGridNavigation';
import useRockolaStore from '../store/useRockolaStore';

const MOCK_KARAOKE_POPULAR = [
    { id: 'k1', title: 'Grupo 5 - Motor y Motivo', subtitle: 'PISTA ORIGINAL', imageIndex: 0 },
    { id: 'k2', title: 'Agua Marina - Tu Amor Fue Una Mentira', subtitle: 'Con Letra', imageIndex: 4 },
    { id: 'k3', title: 'Corazón Serrano - Díganle', subtitle: 'Con Letra', imageIndex: 2 },
];

const MOCK_DUOS = [
    { id: 'k4', title: 'Pimpinela - Olvídame y Pega la Vuelta', subtitle: 'Balada', imageIndex: 3 },
    { id: 'k5', title: 'Juan Gabriel & Rocio Durcal - Déjame V...', subtitle: 'Ranchera', imageIndex: 4 },
    { id: 'k6', title: 'Shakira & Alejandro Sanz - La Tortura', subtitle: 'Pop Latino', imageIndex: 5 },
];

export default function KaraokePage() {
    const { addToQueue } = useQueue();
    const [toast, setToast] = useState(null);
    const focusZone = useRockolaStore((s) => s.focusZone);

    const allTracks = [...MOCK_KARAOKE_POPULAR, ...MOCK_DUOS];

    const handleSelect = (track) => {
        const success = addToQueue({
            id: track.id,
            title: track.title,
            type: 'local',
            sourceUrl: '',
        });
        if (success === 'duplicate') {
            setToast('⚠️ Ya se encuentra en la cola');
            setTimeout(() => setToast(null), 3000);
        } else if (!success) {
            setToast('💰 ¡Inserte Moneda!');
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleSelectGlobal = (globalIdx) => {
        const track = allTracks[globalIdx];
        if (track) handleSelect(track);
    };

    const { selectedIndex } = useGridNavigation(allTracks.length, 3, handleSelectGlobal, 12);

    // Auto-scroll
    useEffect(() => {
        if (focusZone === 'grid') {
            const selectedEl = document.querySelector('.media-card.selected-red');
            if (selectedEl) {
                selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [selectedIndex, focusZone]);

    return (
        <div>
            {toast && <div className="toast">{toast}</div>}

            <div className="section-header">
                <span className="section-icon">⭐</span>
                <span className="section-title">KARAOKE POPULAR</span>
            </div>

            <div className="media-grid three-cols">
                {MOCK_KARAOKE_POPULAR.map((k, i) => {
                    const isSelected = selectedIndex === i && focusZone === 'grid';
                    return (
                        <MediaCard
                            key={k.id}
                            title={k.title}
                            imageIndex={k.imageIndex}
                            selected={isSelected}
                            selectedType="red"
                            badge={isSelected ? '🎤 SELECCIONADO' : 'KARAOKE'}
                            badgeType={isSelected ? 'playing' : 'karaoke'}
                            onClick={() => handleSelect(k)}
                        >
                            <div
                                className="media-card-subtitle"
                                style={{
                                    color:
                                        k.subtitle === 'PISTA ORIGINAL'
                                            ? '#ef4444'
                                            : 'var(--text-muted)',
                                    fontWeight: k.subtitle === 'PISTA ORIGINAL' ? 600 : 400,
                                }}
                            >
                                {k.subtitle === 'PISTA ORIGINAL' ? '● ' : ''}
                                {k.subtitle}
                            </div>
                        </MediaCard>
                    );
                })}
            </div>

            <div className="section-header" style={{ marginTop: 32 }}>
                <span className="section-icon">👥</span>
                <span className="section-title">DÚOS INOLVIDABLES</span>
            </div>

            <div className="media-grid three-cols">
                {MOCK_DUOS.map((k, i) => {
                    const globalIdx = MOCK_KARAOKE_POPULAR.length + i;
                    const isSelected = selectedIndex === globalIdx && focusZone === 'grid';
                    return (
                        <MediaCard
                            key={k.id}
                            title={k.title}
                            imageIndex={k.imageIndex}
                            selected={isSelected}
                            selectedType="red"
                            badge="KARAOKE"
                            badgeType="karaoke"
                            onClick={() => handleSelect(k)}
                        >
                            <div className="media-card-subtitle">{k.subtitle}</div>
                        </MediaCard>
                    );
                })}
            </div>
        </div>
    );
}
