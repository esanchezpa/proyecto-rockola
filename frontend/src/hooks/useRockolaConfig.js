import { useEffect, useCallback } from 'react';
import useRockolaStore from '../store/useRockolaStore';
import { getConfig, updateConfig } from '../api/rockolaApi';

export function useRockolaConfig() {
    const directories = useRockolaStore((s) => s.directories);
    const setDirectories = useRockolaStore((s) => s.setDirectories);
    const keyBindings = useRockolaStore((s) => s.keyBindings);
    const setKeyBindings = useRockolaStore((s) => s.setKeyBindings);

    useEffect(() => {
        getConfig()
            .then((cfg) => {
                setDirectories({
                    audio: cfg.audioPath || '',
                    video: cfg.videoPath || '',
                    karaoke: cfg.karaokePath || '',
                });
                if (cfg.keyBindings) {
                    setKeyBindings(cfg.keyBindings);
                }
            })
            .catch((err) => console.error('Error loading config:', err));
    }, [setDirectories, setKeyBindings]);

    const saveConfig = useCallback(
        async (newDirs, newBindings) => {
            try {
                const payload = {
                    audioPath: newDirs?.audio || directories.audio,
                    videoPath: newDirs?.video || directories.video,
                    karaokePath: newDirs?.karaoke || directories.karaoke,
                };
                if (newBindings) payload.keyBindings = newBindings;

                const result = await updateConfig(payload);

                setDirectories({
                    audio: result.config.audioPath,
                    video: result.config.videoPath,
                    karaoke: result.config.karaokePath,
                });
                if (result.config.keyBindings) {
                    setKeyBindings(result.config.keyBindings);
                }
                return true;
            } catch (err) {
                console.error('Error saving config:', err);
                return false;
            }
        },
        [setDirectories, setKeyBindings, directories]
    );

    return { directories, keyBindings, saveConfig };
}
