import { useEffect, useRef, useCallback } from 'react';
import useRockolaStore from '../store/useRockolaStore';
import { getMedia, getStreamUrl } from '../api/rockolaApi';

/**
 * IdleAutoplay — headless component that monitors user inactivity
 * and plays random previews from configured sources.
 *
 * Activity = clicks, key presses, or touches (NOT mouse movement).
 * When idle timer fires, plays random tracks cycling every N seconds.
 * Any user interaction immediately stops idle mode.
 */
export default function IdleAutoplay() {
    const idleEnabled = useRockolaStore((s) => s.idleEnabled);
    const idleTimeoutMin = useRockolaStore((s) => s.idleTimeoutMin);
    const idleTimeoutCreditsMin = useRockolaStore((s) => s.idleTimeoutCreditsMin);
    const idleTimeoutPausedSec = useRockolaStore((s) => s.idleTimeoutPausedSec);
    const idleDurationSec = useRockolaStore((s) => s.idleDurationSec);
    const idleSources = useRockolaStore((s) => s.idleSources);

    const isPlaying = useRockolaStore((s) => s.isPlaying);
    const credits = useRockolaStore((s) => s.credits);

    const idleTimerRef = useRef(null);
    const previewTimerRef = useRef(null);
    const isIdleRef = useRef(false);
    const cachedAudio = useRef(null);
    const cachedVideo = useRef(null);

    const pickRandom = (arr) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;

    // Fetch and cache media lists
    const getAudioFiles = useCallback(async () => {
        if (cachedAudio.current) return cachedAudio.current;
        try {
            const data = await getMedia('audio');
            // The backend listMedia returns the array directly, not an object with a .files property
            cachedAudio.current = Array.isArray(data) ? data : data.files || [];
            console.log('[IdleAutoplay] getAudioFiles loaded:', cachedAudio.current.length, 'items');
            return cachedAudio.current;
        } catch (err) {
            console.error('[IdleAutoplay] Audio file fetch failed:', err);
            return [];
        }
    }, []);

    const getVideoFiles = useCallback(async () => {
        if (cachedVideo.current) return cachedVideo.current;
        try {
            const data = await getMedia('video');
            cachedVideo.current = Array.isArray(data) ? data : data.files || [];
            console.log('[IdleAutoplay] getVideoFiles loaded:', cachedVideo.current.length, 'items');
            return cachedVideo.current;
        } catch (err) {
            console.error('[IdleAutoplay] Video file fetch failed:', err);
            return [];
        }
    }, []);

    const playRandomTrack = useCallback(async () => {
        const store = useRockolaStore.getState();
        if (!store.idleEnabled || !isIdleRef.current) return;

        // Don't interfere with real user playback
        if (store.queue.length > 0) return;
        if (store.currentTrack && !store.currentTrack.id?.startsWith('idle-')) return;

        const sources = store.idleSources;
        console.log('[IdleAutoplay] Selected sources pool:', sources);
        if (sources.length === 0) return;

        const source = pickRandom(sources);
        console.log('[IdleAutoplay] Chose medium type:', source);
        let track = null;

        try {
            if (source === 'audio') {
                const files = await getAudioFiles();
                if (files.length > 0) {
                    const file = pickRandom(files);
                    if (file) {
                        track = {
                            id: `idle-${Date.now()}`,
                            title: file.title || file.filename.replace(/\.[^/.]+$/, ''),
                            artist: file.artist || 'Archivo Local',
                            type: 'audio',
                            src: getStreamUrl(file.path),
                            sourceUrl: getStreamUrl(file.path),
                        };
                    }
                }
            } else if (source === 'video') {
                const files = await getVideoFiles();
                if (files.length > 0) {
                    const file = pickRandom(files);
                    if (file) {
                        track = {
                            id: `idle-${Date.now()}`,
                            title: file.title || file.filename.replace(/\.[^/.]+$/, ''),
                            artist: file.artist || 'Archivo Local',
                            type: 'video',
                            src: getStreamUrl(file.path),
                            sourceUrl: getStreamUrl(file.path),
                        };
                    }
                }
            } else if (source === 'youtube') {
                const allYt = [...(store.ytTrending || []), ...(store.ytMusicVideos || [])];
                if (allYt.length > 0) {
                    const yt = pickRandom(allYt);
                    if (yt) {
                        track = {
                            id: `idle-${Date.now()}`,
                            title: yt.title,
                            artist: yt.channelTitle || 'YouTube',
                            type: 'youtube',
                            videoId: yt.videoId,
                            thumbnail: yt.thumbnail,
                        };
                    }
                }
            }
        } catch (e) {
            console.warn('[IdleAutoplay] Error fetching media:', e);
        }

        console.log('[IdleAutoplay] Generated track object:', track, 'isIdle:', isIdleRef.current);

        // If no track could be resolved (e.g. empty directory, network error on API), schedule a retry instead of doing nothing
        if (!track && isIdleRef.current) {
            console.warn('[IdleAutoplay] Track was null, retrying with another random source in 5 seconds...');
            previewTimerRef.current = setTimeout(() => {
                if (isIdleRef.current) playRandomTrack();
            }, 5000);
            return;
        }

        if (track && isIdleRef.current) {
            console.log('[IdleAutoplay] Playing:', track.title);
            useRockolaStore.setState({
                idleActive: true,
                currentTrack: track,
                isPlaying: true, // we force it to play immediately
            });

            // Enforce max preview duration configured by the user (e.g. 30s)
            // If the track gets stuck paused, or plays too long, it skips.
            const store = useRockolaStore.getState();
            clearTimeout(previewTimerRef.current);
            previewTimerRef.current = setTimeout(() => {
                if (isIdleRef.current) {
                    console.log(`[IdleAutoplay] Preview time (${store.idleDurationSec}s) up, forcing skip...`);
                    const currentStore = useRockolaStore.getState();
                    if (currentStore.currentTrack?.id?.startsWith('idle-')) {
                        // This triggers stoppedPlaying -> trackFinished, queuing next
                        useRockolaStore.setState({ isPlaying: false, currentTrack: null });
                    }
                }
            }, store.idleDurationSec * 1000);
        }
    }, [getAudioFiles, getVideoFiles]);

    const startIdleMode = useCallback(() => {
        const store = useRockolaStore.getState();
        // Don't start if user has real content playing
        if (store.currentTrack && !store.currentTrack.id?.startsWith('idle-')) return;
        if (store.queue.length > 0) return;

        console.log('[IdleAutoplay] Starting idle mode');
        isIdleRef.current = true;

        // Force state update to clear current Track and toggle play before playing
        useRockolaStore.setState({ isPlaying: false, currentTrack: null });

        playRandomTrack();
    }, [playRandomTrack]);

    const stopIdleMode = useCallback(() => {
        if (!isIdleRef.current) return;
        console.log('[IdleAutoplay] Stopping idle mode, clearing preview timer');
        isIdleRef.current = false;
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;

        const store = useRockolaStore.getState();
        // Clear idle track
        if (store.currentTrack?.id?.startsWith('idle-')) {
            useRockolaStore.setState({
                currentTrack: null,
                isPlaying: false,
                idleActive: false,
            });
            // Stop any HTML5 media element to ensure clean slate
            const audioElements = document.querySelectorAll('video, audio');
            audioElements.forEach(el => {
                try { el.pause(); el.src = ''; } catch { }
            });
        } else {
            useRockolaStore.setState({ idleActive: false });
        }
    }, []);

    const scheduleIdleTimer = useCallback(() => {
        clearTimeout(idleTimerRef.current);

        // If we are already in idle mode, let the current track finish naturally or by its preview timeout.
        // We shouldn't be scheduling a completely new session of Idle mode.
        if (isIdleRef.current) return;

        const store = useRockolaStore.getState();
        // Do not schedule if real content is playing
        if (store.isPlaying && !store.currentTrack?.id?.startsWith('idle-')) {
            return;
        }

        let timeoutMs = idleTimeoutMin * 60 * 1000; // default (0 credits, no track paused)

        // If manually paused (current track exists but is NOT playing, and it's real content)
        if (!store.isPlaying && store.currentTrack && !store.currentTrack.id?.startsWith('idle-')) {
            timeoutMs = idleTimeoutPausedSec * 1000;
        }
        // Else if user has credits but is idling (no track playing)
        else if (store.credits > 0) {
            timeoutMs = idleTimeoutCreditsMin * 60 * 1000;
        }

        console.log(`[IdleAutoplay] Scheduling idle in ${timeoutMs / 1000}s, isPlaying: ${store.isPlaying}, tracks: ${store.currentTrack?.title}`);
        idleTimerRef.current = setTimeout(startIdleMode, timeoutMs);
    }, [idleTimeoutMin, idleTimeoutCreditsMin, idleTimeoutPausedSec, startIdleMode]);

    // Track state changes to handle song ending
    const wasPlayingRef = useRef(false);
    const lastTrackIdRef = useRef(null);
    const trackStartTimeRef = useRef(0);

    useEffect(() => {
        const store = useRockolaStore.getState();
        const stoppedPlaying = wasPlayingRef.current && !isPlaying;
        wasPlayingRef.current = isPlaying;

        // Note when a new track starts playing
        if (isPlaying && store.currentTrack?.id !== lastTrackIdRef.current) {
            trackStartTimeRef.current = Date.now();
        }

        const finishedTrackId = lastTrackIdRef.current;
        lastTrackIdRef.current = store.currentTrack?.id;

        // "Song finished" means it stopped playing AND the track was cleared (no more queue).
        // If the user just pressed PAUSE, currentTrack is still set and we don't treat it as finished.
        const trackFinished = stoppedPlaying && !store.currentTrack;

        if (trackFinished) {
            // A track just finished playing
            if (isIdleRef.current) {
                const trackDuration = Date.now() - trackStartTimeRef.current;
                console.log(`[IdleAutoplay] Idle track finished naturally after ${trackDuration}ms, queuing next...`);

                // If it finished TOO quickly (< 3 seconds), it likely crashed or was blocked. 
                // Add a small delay so we don't spam the API or get trapped in an infinite loop.
                const waitTime = trackDuration < 3000 ? 5000 : 0;

                if (waitTime > 0) {
                    console.warn(`[IdleAutoplay] Track failed quickly. Waiting ${waitTime}ms before next...`);
                }

                clearTimeout(previewTimerRef.current);
                previewTimerRef.current = setTimeout(() => {
                    if (isIdleRef.current) playRandomTrack();
                }, waitTime);

            } else {
                // We are not in idle mode, but a track vanished. Was it a real track or an aborted idle track?
                const wasIdleTrack = finishedTrackId?.startsWith('idle-');

                if (!wasIdleTrack) {
                    // A REAL user track finished
                    if (credits === 0) {
                        startIdleMode();
                    } else {
                        scheduleIdleTimer();
                    }
                } else {
                    // It was an idle track that vanished because the user pressed a key
                    scheduleIdleTimer();
                }
            }
        } else if (!isPlaying && !isIdleRef.current) {
            // Nothing playing (or user manually paused), ensure the long inactivity timer is ticking
            scheduleIdleTimer();
        } else if (isPlaying && !store.currentTrack?.id?.startsWith('idle-')) {
            // Real content started playing, abort idle completely
            stopIdleMode();
            clearTimeout(idleTimerRef.current);
        }
    }, [isPlaying, credits, scheduleIdleTimer, startIdleMode, stopIdleMode, playRandomTrack]);

    // Main effect: monitor activity
    useEffect(() => {
        if (!idleEnabled) {
            stopIdleMode();
            clearTimeout(idleTimerRef.current);
            return;
        }

        const handleUserActivity = (e) => {
            const store = useRockolaStore.getState();
            if (store.idleStopOnNav && isIdleRef.current) {
                // If setting "idleStopOnNav" is enabled and we are in idle state, pressing keys will instantly silence idle.
                stopIdleMode();
            } else {
                // Otherwise (by default), pressing keys while idle simply allows them to navigate while background music continues.
                scheduleIdleTimer();
            }
        };

        // Only track intentional interactions (excluding mouse)
        const events = ['keydown'];
        events.forEach((e) => window.addEventListener(e, handleUserActivity, { passive: true, capture: true }));

        // Start initial idle timer
        scheduleIdleTimer();

        return () => {
            events.forEach((e) => window.removeEventListener(e, handleUserActivity, { capture: true }));
            clearTimeout(idleTimerRef.current);
            clearTimeout(previewTimerRef.current);
            isIdleRef.current = false;
        };
    }, [idleEnabled, scheduleIdleTimer, stopIdleMode]);

    return null;
}
