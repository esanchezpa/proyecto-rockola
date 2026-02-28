import { useEffect, useCallback } from 'react';
import useRockolaStore from '../store/useRockolaStore';
import { getConfig, updateConfig } from '../api/rockolaApi';

export function useRockolaConfig() {
    const directories = useRockolaStore((s) => s.directories);
    const setDirectories = useRockolaStore((s) => s.setDirectories);

    useEffect(() => {
        getConfig()
            .then((cfg) => {
                setDirectories({
                    audio: cfg.audioPath || '',
                    video: cfg.videoPath || '',
                    karaoke: cfg.karaokePath || '',
                });
            })
            .catch((err) => console.error('Error loading config:', err));
    }, [setDirectories]);

    const saveConfig = useCallback(
        async (newDirs) => {
            try {
                const result = await updateConfig({
                    audioPath: newDirs.audio,
                    videoPath: newDirs.video,
                    karaokePath: newDirs.karaoke,
                });
                setDirectories({
                    audio: result.config.audioPath,
                    video: result.config.videoPath,
                    karaoke: result.config.karaokePath,
                });
                return true;
            } catch (err) {
                console.error('Error saving config:', err);
                return false;
            }
        },
        [setDirectories]
    );

    return { directories, saveConfig };
}
