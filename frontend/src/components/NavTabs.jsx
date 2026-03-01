import React, { useEffect, useCallback } from 'react';
import useRockolaStore from '../store/useRockolaStore';

const TABS = [
    { id: 'audio', label: 'Audio' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'video', label: 'Video' },
    { id: 'karaoke', label: 'Karaoke' },
    { id: 'genero', label: 'Género' },
    { id: 'top', label: 'Top' },
];

export default function NavTabs() {
    const activeTab = useRockolaStore((s) => s.activeTab);
    const setActiveTab = useRockolaStore((s) => s.setActiveTab);
    const adminMode = useRockolaStore((s) => s.adminMode);
    const focusZone = useRockolaStore((s) => s.focusZone);
    const setFocusZone = useRockolaStore((s) => s.setFocusZone);
    const keyBindings = useRockolaStore((s) => s.keyBindings);

    const handleKeyDown = useCallback((e) => {
        if (focusZone !== 'nav') return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        const currentIdx = TABS.findIndex((t) => t.id === activeTab);
        const { up, down, left, right, select } = keyBindings;

        if (e.code === right || e.key === right) {
            e.preventDefault();
            e.stopPropagation();
            const nextIdx = (currentIdx + 1) % TABS.length;
            setActiveTab(TABS[nextIdx].id);
            // Stay in nav zone
            setFocusZone('nav');
        } else if (e.code === left || e.key === left) {
            e.preventDefault();
            e.stopPropagation();
            const prevIdx = (currentIdx - 1 + TABS.length) % TABS.length;
            setActiveTab(TABS[prevIdx].id);
            setFocusZone('nav');
        } else if (e.code === down || e.key === down) {
            e.preventDefault();
            e.stopPropagation();
            // Switch focus to search if it exists, otherwise grid
            if (['audio', 'video', 'youtube'].includes(activeTab)) {
                setFocusZone('search');
            } else {
                setFocusZone('grid');
            }
        } else if (e.code === select || e.key === select) {
            e.preventDefault();
            e.stopPropagation();
            // Switch focus to grid on the active tab
            setFocusZone('grid');
        } else {
            return;
        }
    }, [focusZone, activeTab, setActiveTab, setFocusZone, keyBindings]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [handleKeyDown]);

    return (
        <nav className={`nav-tabs ${focusZone === 'nav' ? 'nav-focused' : ''}`}>
            {TABS.map((tab) => (
                <button
                    key={tab.id}
                    className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                    data-tab={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                >
                    {tab.label}
                </button>
            ))}

            <button
                className={`nav-tab ${activeTab === 'config' ? 'active' : ''}`}
                data-tab="config"
                onClick={() => setActiveTab('config')}
                style={{ marginLeft: 8 }}
                title="Configuración"
            >
                ⚙️
            </button>

            <div className="nav-right">
                {adminMode && (
                    <span style={{
                        background: 'var(--accent-yellow)',
                        color: '#000',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        marginRight: 8,
                    }}>
                        ADMIN
                    </span>
                )}
                ← <strong>NAVEGAR MENÚ</strong> →
            </div>
        </nav>
    );
}
