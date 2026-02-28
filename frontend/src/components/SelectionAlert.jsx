import React, { useEffect, useState } from 'react';
import useRockolaStore from '../store/useRockolaStore';

export default function SelectionAlert() {
    const credits = useRockolaStore((s) => s.credits);
    const isPlaying = useRockolaStore((s) => s.isPlaying);
    const currentTrack = useRockolaStore((s) => s.currentTrack);
    const idleActive = useRockolaStore((s) => s.idleActive);
    const selectionAlertSec = useRockolaStore((s) => s.selectionAlertSec);
    const [showAlert, setShowAlert] = useState(false);

    // We consider it "not playing real content" if it's completely stopped
    // OR if it's currently playing Idle Autoplay (which means no user selected anything).
    const isPlayingRealContent = isPlaying && currentTrack && !currentTrack.id?.startsWith('idle-');

    useEffect(() => {
        let timeout;

        if (credits > 0 && !isPlayingRealContent) {
            // Wait configured seconds before nagging the user
            timeout = setTimeout(() => {
                setShowAlert(true);
            }, selectionAlertSec * 1000);
        } else {
            setShowAlert(false);
        }

        return () => clearTimeout(timeout);
    }, [credits, isPlayingRealContent, currentTrack, selectionAlertSec]);

    useEffect(() => {
        if (!showAlert) return;

        // Any user interaction dismisses the alert temporarily
        const handleInteraction = (e) => {
            // Only dismiss on Rockola navigation keys to avoid hiding it if they just bump the mouse
            const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'];
            if (e.type === 'keydown' && !navKeys.includes(e.key)) return;

            setShowAlert(false);
        };

        window.addEventListener('keydown', handleInteraction, { capture: true });
        window.addEventListener('click', handleInteraction, { capture: true });

        return () => {
            window.removeEventListener('keydown', handleInteraction, { capture: true });
            window.removeEventListener('click', handleInteraction, { capture: true });
        };
    }, [showAlert]);

    if (!showAlert) return null;

    return (
        <div className="selection-alert-overlay">
            <div className="selection-alert-box">
                <div className="selection-alert-icon">🎵</div>
                <div className="selection-alert-title">¡Selecciona una canción!</div>
                <div className="selection-alert-subtitle">Tienes {credits} créditos disponibles</div>
            </div>
        </div>
    );
}
