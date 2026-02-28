import React from 'react';
import useRockolaStore from '../store/useRockolaStore';

export default function BottomBar() {
    const activeTab = useRockolaStore((s) => s.activeTab);

    const getActions = () => {
        switch (activeTab) {
            case 'youtube':
                return (
                    <>
                        <div className="bottom-group">
                            <span className="bottom-key enter">ENTER</span>
                            <span className="bottom-label action">REPRODUCIR</span>
                        </div>
                        <div className="bottom-group">
                            <span className="bottom-key keyboard">TECLADO</span>
                            <span className="bottom-label">BUSCAR</span>
                        </div>
                    </>
                );
            case 'genero':
            case 'karaoke':
                return (
                    <div className="bottom-group">
                        <span className="bottom-key enter">ENTER</span>
                        <span className="bottom-label action">SELECCIONAR</span>
                    </div>
                );
            default:
                return (
                    <div className="bottom-group">
                        <span className="bottom-key enter">ENTER</span>
                        <span className="bottom-label action">REPRODUCIR</span>
                    </div>
                );
        }
    };

    return (
        <div className="bottom-bar">
            <div className="bottom-group">
                <span className="bottom-key">↑</span>
                <span className="bottom-key">↓</span>
                <span className="bottom-key">←</span>
                <span className="bottom-key">→</span>
                <span className="bottom-label">NAVEGAR</span>
            </div>
            {getActions()}
        </div>
    );
}
