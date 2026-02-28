import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useRockolaStore = create(
    persist(
        (set, get) => ({
            // Credits system
            credits: 0,
            pricePerSong: 1,
            creditsPerCoin: 3,          // configurable
            ytMinutesPerCredit: 12,     // configurable
            selectionAlertSec: 20,      // seconds before the "Select a Song" alert is presented

            // Admin mode
            adminMode: false,

            // Queue system
            queue: [],
            currentTrack: null,
            isPlaying: false,
            requiresInteraction: false,

            // YouTube timer (seconds)
            ytTimeRemaining: 0,
            ytTimerActive: false,

            // Idle autoplay settings
            idleEnabled: true,
            idleTimeoutMin: 2,          // minutes of inactivity before autoplay (0 credits)
            idleTimeoutCreditsMin: 3,   // minutes to wait when credits exist
            idleTimeoutPausedSec: 60,   // seconds to wait when manually paused
            idleDurationSec: 25,        // seconds each random preview plays
            idleSources: ['audio', 'video', 'youtube'], // which sources to use
            idleActive: false,          // whether idle mode is currently running

            // Configuration
            directories: {
                audio: '',
                video: '',
                karaoke: '',
            },

            // Player display settings
            playerSize: 35,
            playerPosition: 'right',
            audioCoverSize: 'medium', // small, medium, large

            // YouTube pre-cached data
            ytTrending: [],
            ytMusicVideos: [],
            ytLoaded: false,

            // Navigation
            activeTab: 'audio',
            selectedIndex: -1,
            focusZone: 'nav',

            // Global toast
            queueToast: null,
            coinAlert: null,    // triggers big INSERTE MONEDA overlay

            // Actions — Admin
            toggleAdminMode: () =>
                set((state) => ({ adminMode: !state.adminMode })),
            setAdminMode: (val) => set({ adminMode: val }),

            // Actions — Credits
            insertCoin: () => {
                const { creditsPerCoin } = get();
                set((state) => ({ credits: state.credits + creditsPerCoin }));
            },

            consumeCredit: () => {
                const { credits, pricePerSong, adminMode } = get();
                // Admin mode = infinite credits, never consume
                if (adminMode) return true;
                if (credits >= pricePerSong) {
                    set({ credits: credits - pricePerSong });
                    return true;
                }
                return false;
            },

            // Actions — YouTube timer
            consumeYtTime: (seconds = 1) => {
                const { ytTimeRemaining, adminMode } = get();
                if (adminMode) return;
                if (ytTimeRemaining <= 0) return;
                const newTime = Math.max(0, ytTimeRemaining - seconds);
                set({ ytTimeRemaining: newTime });
                if (newTime <= 0) {
                    // Time expired — stop playback and clear YouTube track
                    const { currentTrack } = get();
                    if (currentTrack?.type === 'youtube') {
                        set({ ytTimerActive: false });
                        // Auto-skip to next non-youtube or stop
                        get().nextTrack();
                    }
                }
            },
            resetYtTimer: () => set({ ytTimeRemaining: 0, ytTimerActive: false }),

            // Actions — Queue
            addToQueue: (track) => {
                const { consumeCredit, queue, currentTrack, adminMode, ytTimeRemaining } = get();

                // Check duplicates — same track already playing or in queue
                if (currentTrack && currentTrack.id === track.id) return 'duplicate';
                if (queue.some((t) => t.id === track.id)) return 'duplicate';

                const isCurrentlyIdle = get().idleActive || (currentTrack && currentTrack.id?.startsWith('idle-'));

                if (track.type === 'youtube') {
                    // YouTube: check if there's time remaining or consume a credit
                    if (!adminMode && ytTimeRemaining <= 0) {
                        if (!consumeCredit()) {
                            // Trigger INSERTE MONEDA overlay
                            set({ coinAlert: Date.now() });
                            return false;
                        }
                        const { ytMinutesPerCredit } = get();
                        set({ ytTimeRemaining: ytMinutesPerCredit * 60, ytTimerActive: true });
                    }
                } else {
                    // Audio/Video/Karaoke: consume 1 credit per song
                    if (!consumeCredit()) {
                        set({ coinAlert: Date.now() });
                        return false;
                    }
                }

                if (!currentTrack || isCurrentlyIdle) {
                    set({ currentTrack: track, isPlaying: true, idleActive: false });
                } else {
                    set({ queue: [...queue, track] });
                }

                // Show global toast
                set({ queueToast: track.title || 'Canción' });
                setTimeout(() => {
                    set({ queueToast: null });
                }, 3500);

                return true;
            },

            nextTrack: () => {
                const { queue } = get();
                if (queue.length > 0) {
                    const [next, ...rest] = queue;
                    set({ currentTrack: next, queue: rest, isPlaying: true });
                } else {
                    set({ currentTrack: null, isPlaying: false });
                }
            },

            removeFromQueue: (id) => {
                set((state) => ({
                    queue: state.queue.filter((t) => t.id !== id),
                }));
            },

            togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

            setPlaying: (val) => set({ isPlaying: val }),

            // Actions — Navigation
            setActiveTab: (tab) => set({ activeTab: tab, selectedIndex: -1, focusZone: 'nav' }),
            setSelectedIndex: (i) => set({ selectedIndex: i }),
            setFocusZone: (zone) => {
                if (zone === 'nav') {
                    set({ focusZone: 'nav', selectedIndex: -1 });
                } else if (zone === 'player') {
                    set({ focusZone: 'player' });
                } else {
                    // Entering grid — select first item if nothing selected
                    const { selectedIndex } = get();
                    set({ focusZone: 'grid', selectedIndex: selectedIndex < 0 ? 0 : selectedIndex });
                }
            },

            // Actions — Player config
            setPlayerSize: (size) => set({ playerSize: size }),
            setPlayerPosition: (pos) => set({ playerPosition: pos }),
            setAudioCoverSize: (size) => set({ audioCoverSize: size }),

            // Actions — Credits config
            setCreditsPerCoin: (n) => set({ creditsPerCoin: n }),
            setYtMinutesPerCredit: (n) => set({ ytMinutesPerCredit: n }),
            setSelectionAlertSec: (n) => set({ selectionAlertSec: n }),

            // Actions — Idle autoplay config
            setIdleEnabled: (val) => set({ idleEnabled: val }),
            setIdleTimeoutMin: (val) => set({ idleTimeoutMin: val }),
            setIdleTimeoutCreditsMin: (val) => set({ idleTimeoutCreditsMin: val }),
            setIdleTimeoutPausedSec: (val) => set({ idleTimeoutPausedSec: val }),
            setIdleDurationSec: (val) => set({ idleDurationSec: val }),
            setIdleSources: (sources) => set({ idleSources: sources }),
            setIdleActive: (val) => set({ idleActive: val }),

            // Actions — YouTube data
            setYtData: (trending, music) => set({ ytTrending: trending, ytMusicVideos: music, ytLoaded: true }),

            // Actions — Config
            setDirectories: (dirs) => set({ directories: dirs }),
        }),
        {
            name: 'rockola-config',
            partialize: (state) => ({
                adminMode: state.adminMode,
                directories: state.directories,
                playerSize: state.playerSize,
                playerPosition: state.playerPosition,
                audioCoverSize: state.audioCoverSize,
                creditsPerCoin: state.creditsPerCoin,
                ytMinutesPerCredit: state.ytMinutesPerCredit,
                selectionAlertSec: state.selectionAlertSec,
                idleEnabled: state.idleEnabled,
                idleTimeoutMin: state.idleTimeoutMin,
                idleTimeoutCreditsMin: state.idleTimeoutCreditsMin,
                idleTimeoutPausedSec: state.idleTimeoutPausedSec,
                idleDurationSec: state.idleDurationSec,
                idleSources: state.idleSources,
            }),
        }
    )
);

export default useRockolaStore;
