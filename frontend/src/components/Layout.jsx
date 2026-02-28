import React from 'react';
import Header from './Header';
import NavTabs from './NavTabs';
import MiniPlayer from './MiniPlayer';
import BottomBar from './BottomBar';
import QueueToast from './QueueToast';
import IdleAutoplay from './IdleAutoplay';
import SelectionAlert from './SelectionAlert';
import useRockolaStore from '../store/useRockolaStore';

export default function Layout({ children }) {
    const currentTrack = useRockolaStore((s) => s.currentTrack);
    const playerSize = useRockolaStore((s) => s.playerSize);
    const playerPosition = useRockolaStore((s) => s.playerPosition);
    const requiresInteraction = useRockolaStore((s) => s.requiresInteraction);

    const isVideoTrack = currentTrack?.type === 'video' || currentTrack?.type === 'youtube';

    // Interaction unblocker
    React.useEffect(() => {
        if (!requiresInteraction) return;

        const unlockAudio = () => {
            useRockolaStore.setState({ requiresInteraction: false });
            const isPlaying = useRockolaStore.getState().isPlaying;
            if (isPlaying) {
                useRockolaStore.getState().setPlaying(false);
                setTimeout(() => useRockolaStore.getState().setPlaying(true), 50);
            }
        };

        window.addEventListener('keydown', unlockAudio, { once: true, capture: true });
        window.addEventListener('click', unlockAudio, { once: true, capture: true });

        return () => {
            window.removeEventListener('keydown', unlockAudio, { capture: true });
            window.removeEventListener('click', unlockAudio, { capture: true });
        };
    }, [requiresInteraction]);

    // Calculate player height as vh
    const playerVh = isVideoTrack ? playerSize : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <Header />
            <NavTabs />

            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: (isVideoTrack && playerPosition !== 'bottom') ? 'row' : 'column',
                overflow: 'hidden',
                minHeight: 0,
            }}>
                <main className="main-content" style={{
                    flex: 1,
                    overflow: 'auto',
                    minWidth: 0,
                    order: (isVideoTrack && playerPosition === 'left') ? 2 : 1
                }}>
                    {children}
                </main>

                <div style={{
                    order: (isVideoTrack && playerPosition === 'left') ? 1 : 2,
                    ...(isVideoTrack
                        ? (playerPosition === 'bottom'
                            ? { height: `${playerVh}vh`, width: '100%' }
                            : { width: `${playerVh}%`, minWidth: 280 })
                        : { height: 'auto', width: '100%' }),
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    // Hidden safely offscreen behind the navbar if we have no video playing 
                    // and we want it to just behave correctly like a bottom bar.
                    // But actually MiniPlayer has its own logic for 'compact' audio mode.
                }}>
                    <MiniPlayer />
                </div>
            </div>

            <BottomBar />
            <QueueToast />
            <IdleAutoplay />
            <SelectionAlert />

        </div>
    );
}
