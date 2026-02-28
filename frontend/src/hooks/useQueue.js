import useRockolaStore from '../store/useRockolaStore';

export function useQueue() {
    const queue = useRockolaStore((s) => s.queue);
    const currentTrack = useRockolaStore((s) => s.currentTrack);
    const isPlaying = useRockolaStore((s) => s.isPlaying);
    const addToQueue = useRockolaStore((s) => s.addToQueue);
    const nextTrack = useRockolaStore((s) => s.nextTrack);
    const removeFromQueue = useRockolaStore((s) => s.removeFromQueue);
    const togglePlay = useRockolaStore((s) => s.togglePlay);
    const setPlaying = useRockolaStore((s) => s.setPlaying);

    return {
        queue,
        currentTrack,
        isPlaying,
        addToQueue,
        nextTrack,
        removeFromQueue,
        togglePlay,
        setPlaying,
    };
}
