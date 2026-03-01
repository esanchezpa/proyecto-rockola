import React, { useState, useEffect } from 'react';
import { useRockolaConfig } from '../hooks/useRockolaConfig';
import { refreshMediaCache } from '../api/rockolaApi';
import useRockolaStore from '../store/useRockolaStore';

const sizeOptions = [
    { value: 20, label: '20%' },
    { value: 35, label: '35%' },
    { value: 50, label: '50%' },
];

const queueDisplayOptions = [3, 4, 5, 8, 10];

const positionOptions = [
    { value: 'left', label: 'Izquierda', icon: '◧' },
    { value: 'right', label: 'Derecha', icon: '◨' },
    { value: 'bottom', label: 'Abajo', icon: '⬓' },
];

const creditOptions = [1, 2, 3, 5, 10];
const ytTimeOptions = [5, 10, 12, 15, 20, 30];
const selectionAlertOptions = [5, 10, 20, 30, 45, 60];
const idleTimeoutOptions = [0.25, 0.5, 1, 2, 3, 5, 10];
const idlePausedOptions = [15, 30, 60, 120, 300];
const idleDurationOptions = [15, 20, 25, 30, 45, 60];

const viewStyleOptions = [
    { value: 'grid', label: 'Cuadrícula' },
    { value: 'list', label: 'Lista' },
];
const previewStartOptions = [0, 5, 10, 15, 20, 30, 60];
const previewDurationOptions = [10, 15, 20, 30, 45, 60];
const previewDelayOptions = [10, 20, 30, 45, 60];

const coverSizeOptions = [
    { value: 'small', label: 'Pequeño' },
    { value: 'medium', label: 'Mediano' },
    { value: 'large', label: 'Grande' },
];

export default function ConfigPage() {
    const { directories, saveConfig } = useRockolaConfig();
    const adminMode = useRockolaStore((s) => s.adminMode);
    const toggleAdminMode = useRockolaStore((s) => s.toggleAdminMode);
    const playerSize = useRockolaStore((s) => s.playerSize);
    const playerPosition = useRockolaStore((s) => s.playerPosition);
    const audioCoverSize = useRockolaStore((s) => s.audioCoverSize);
    const queueDisplayCount = useRockolaStore((s) => s.queueDisplayCount);
    const setPlayerSize = useRockolaStore((s) => s.setPlayerSize);
    const setPlayerPosition = useRockolaStore((s) => s.setPlayerPosition);
    const setAudioCoverSize = useRockolaStore((s) => s.setAudioCoverSize);
    const setQueueDisplayCount = useRockolaStore((s) => s.setQueueDisplayCount);

    // Video view settings
    const videoViewStyle = useRockolaStore((s) => s.videoViewStyle);
    const videoPreviewStart = useRockolaStore((s) => s.videoPreviewStart);
    const videoPreviewDuration = useRockolaStore((s) => s.videoPreviewDuration);
    const videoPreviewDelaySec = useRockolaStore((s) => s.videoPreviewDelaySec);
    const setVideoViewStyle = useRockolaStore((s) => s.setVideoViewStyle);
    const setVideoPreviewStart = useRockolaStore((s) => s.setVideoPreviewStart);
    const setVideoPreviewDuration = useRockolaStore((s) => s.setVideoPreviewDuration);
    const setVideoPreviewDelaySec = useRockolaStore((s) => s.setVideoPreviewDelaySec);

    // Credits config
    const creditsPerCoin = useRockolaStore((s) => s.creditsPerCoin);
    const ytMinutesPerCredit = useRockolaStore((s) => s.ytMinutesPerCredit);
    const selectionAlertSec = useRockolaStore((s) => s.selectionAlertSec);
    const setCreditsPerCoin = useRockolaStore((s) => s.setCreditsPerCoin);
    const setYtMinutesPerCredit = useRockolaStore((s) => s.setYtMinutesPerCredit);
    const setSelectionAlertSec = useRockolaStore((s) => s.setSelectionAlertSec);

    // Idle autoplay config
    const idleEnabled = useRockolaStore((s) => s.idleEnabled);
    const idleTimeoutMin = useRockolaStore((s) => s.idleTimeoutMin);
    const idleTimeoutCreditsMin = useRockolaStore((s) => s.idleTimeoutCreditsMin);
    const idleTimeoutPausedSec = useRockolaStore((s) => s.idleTimeoutPausedSec);
    const idleDurationSec = useRockolaStore((s) => s.idleDurationSec);
    const idleSources = useRockolaStore((s) => s.idleSources);
    const setIdleEnabled = useRockolaStore((s) => s.setIdleEnabled);
    const setIdleTimeoutMin = useRockolaStore((s) => s.setIdleTimeoutMin);
    const setIdleTimeoutCreditsMin = useRockolaStore((s) => s.setIdleTimeoutCreditsMin);
    const setIdleTimeoutPausedSec = useRockolaStore((s) => s.setIdleTimeoutPausedSec);
    const setIdleDurationSec = useRockolaStore((s) => s.setIdleDurationSec);
    const setIdleSources = useRockolaStore((s) => s.setIdleSources);
    const idleStopOnNav = useRockolaStore((s) => s.idleStopOnNav);

    const [audio, setAudio] = useState(directories.audio);
    const [video, setVideo] = useState(directories.video);
    const [karaoke, setKaraoke] = useState(directories.karaoke);
    const [saved, setSaved] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [showPasswordInput, setShowPasswordInput] = useState(false);

    useEffect(() => {
        setAudio(directories.audio);
        setVideo(directories.video);
        setKaraoke(directories.karaoke);
    }, [directories]);

    const handleSave = async () => {
        const ok = await saveConfig({ audio, video, karaoke });
        if (ok) {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
    };

    const handleAdminToggle = () => {
        if (adminMode) {
            toggleAdminMode();
        } else {
            if (showPasswordInput) {
                if (adminPassword === '1234') {
                    toggleAdminMode();
                    setShowPasswordInput(false);
                    setAdminPassword('');
                } else {
                    alert('Contraseña incorrecta');
                }
            } else {
                setShowPasswordInput(true);
            }
        }
    };

    const handleRefreshCache = async () => {
        try {
            alert("Actualizando...");
            await refreshMediaCache();
            alert("¡Actualizado!");
        } catch (error) {
            console.error(error);
            alert("Hubo un error al actualizar los datos.");
        }
    };

    const toggleIdleSource = (source) => {
        if (idleSources.includes(source)) {
            if (idleSources.length <= 1) return; // at least one source must remain
            setIdleSources(idleSources.filter((s) => s !== source));
        } else {
            setIdleSources([...idleSources, source]);
        }
    };

    const optBtnStyle = (isActive) => ({
        padding: '8px 16px',
        background: isActive ? 'var(--accent-blue)' : 'rgba(255,255,255,0.06)',
        border: `2px solid ${isActive ? 'var(--accent-blue)' : 'var(--border-color)'}`,
        borderRadius: 8,
        color: isActive ? '#fff' : 'var(--text-secondary)',
        fontWeight: 700,
        cursor: 'pointer',
        fontSize: 13,
        transition: 'all 0.2s',
    });

    const sectionStyle = {
        background: 'var(--bg-card)',
        border: '2px solid var(--border-color)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 28,
    };

    const labelStyle = {
        fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
        marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1,
    };

    return (
        <div className="config-page">
            <h2>⚙️ Configuración</h2>

            {/* ==================== Admin Mode ==================== */}
            <div style={{
                background: adminMode ? 'rgba(234, 179, 8, 0.1)' : 'var(--bg-card)',
                border: `2px solid ${adminMode ? 'var(--accent-yellow)' : 'var(--border-color)'}`,
                borderRadius: 12,
                padding: 20,
                marginBottom: 28,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                            🔐 Modo Administrador
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            Créditos infinitos — no necesita monedas para reproducir
                        </div>
                    </div>
                    <button
                        onClick={handleAdminToggle}
                        style={{
                            padding: '8px 20px',
                            background: adminMode ? 'var(--accent-red)' : 'var(--accent-yellow)',
                            border: 'none',
                            borderRadius: 8,
                            color: adminMode ? 'white' : '#000',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: 12,
                            textTransform: 'uppercase',
                        }}
                    >
                        {adminMode ? '🔓 Desactivar' : '🔒 Activar'}
                    </button>
                </div>

                {showPasswordInput && !adminMode && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                        <input
                            type="password"
                            placeholder="Contraseña admin..."
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdminToggle()}
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 6,
                                color: 'white',
                                fontFamily: 'var(--font-family)',
                                fontSize: 13,
                                outline: 'none',
                            }}
                            autoFocus
                        />
                        <button onClick={handleAdminToggle} style={{
                            padding: '8px 16px', background: 'var(--accent-green)', border: 'none',
                            borderRadius: 6, color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 12,
                        }}>Confirmar</button>
                        <button onClick={() => { setShowPasswordInput(false); setAdminPassword(''); }} style={{
                            padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                            borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12,
                        }}>Cancelar</button>
                    </div>
                )}

                {adminMode && (
                    <div style={{
                        marginTop: 8, padding: '6px 12px', background: 'rgba(234, 179, 8, 0.15)',
                        borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: 12, color: 'var(--accent-yellow)', fontWeight: 600,
                    }}>
                        ✅ Modo Administrador ACTIVO — Créditos infinitos
                    </div>
                )}
            </div>

            {/* Refresh Cache Panel */}
            <div style={{
                background: 'var(--bg-secondary)', padding: '16px 20px', borderRadius: 12,
                marginTop: 24, border: '1px solid var(--border-color)', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                        🔄 Refrescar Listas
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        Fuerza la re-indexación de la música en MP3s y MP4s (Caché)
                    </div>
                </div>
                <button
                    onClick={handleRefreshCache}
                    style={{
                        padding: '8px 20px', background: 'var(--accent-blue)', border: 'none',
                        borderRadius: 8, color: 'white', fontWeight: 700, cursor: 'pointer',
                        fontSize: 12, textTransform: 'uppercase',
                    }}
                >
                    Actualizar
                </button>
            </div>

            {/* ==================== Autoplay Settings ==================== */}
            <div style={{
                background: 'var(--bg-card)', padding: '16px 20px', borderRadius: 12,
                marginTop: 24, border: '1px solid var(--border-color)', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                        ⏯️ Autoplay al Navegar
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        Si está ACTIVO, la música de fondo (Idle) se pausará en cuanto oprimas cualquier tecla en la aplicación. Si está INACTIVO, la música de fondo continuará mientras estés navegando los menús.
                    </div>
                </div>
                <button
                    onClick={() => useRockolaStore.setState((s) => ({ idleStopOnNav: !s.idleStopOnNav }))}
                    style={{
                        padding: '8px 20px', background: idleStopOnNav ? 'var(--accent-red)' : 'var(--accent-green)',
                        border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, cursor: 'pointer',
                        fontSize: 12, textTransform: 'uppercase', flexShrink: 0, marginLeft: 16
                    }}
                >
                    {idleStopOnNav ? 'DESACTIVAR' : 'ACTIVAR'}
                </button>
            </div>

            {/* ==================== Credits Config ==================== */}
            <div style={sectionStyle}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                    🪙 Sistema de Monedas
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Configura cuántos créditos da cada moneda y el tiempo de YouTube por crédito.
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={labelStyle}>🎫 Créditos por moneda</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {creditOptions.map((n) => (
                            <button key={n} onClick={() => setCreditsPerCoin(n)} style={optBtnStyle(creditsPerCoin === n)}>
                                {n}
                            </button>
                        ))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                        1 moneda = {creditsPerCoin} crédito{creditsPerCoin !== 1 ? 's' : ''} = {creditsPerCoin} canción{creditsPerCoin !== 1 ? 'es' : ''} o video{creditsPerCoin !== 1 ? 's' : ''}
                    </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={labelStyle}>➕ Simular Créditos</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {[1, 5, 10].map((n) => (
                            <button
                                key={`sim-${n}`}
                                onClick={() => useRockolaStore.setState((s) => ({ credits: s.credits + n }))}
                                style={{
                                    padding: '8px 16px',
                                    background: 'var(--accent-purple)',
                                    border: 'none',
                                    borderRadius: 8,
                                    color: '#fff',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: 13,
                                }}
                            >
                                +{n}
                            </button>
                        ))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                        Agregar créditos manualmente (solo para pruebas)
                    </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={labelStyle}>🔔 Tiempo de "Selecciona canción"</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {selectionAlertOptions.map((n) => (
                            <button key={n} onClick={() => setSelectionAlertSec(n)} style={optBtnStyle(selectionAlertSec === n)}>
                                {n}s
                            </button>
                        ))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                        Segundos a esperar antes de mostrar el alerta en pantalla
                    </div>
                </div>

                <div>
                    <div style={labelStyle}>⏱ Minutos de YouTube por crédito</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {ytTimeOptions.map((n) => (
                            <button key={n} onClick={() => setYtMinutesPerCredit(n)} style={optBtnStyle(ytMinutesPerCredit === n)}>
                                {n} min
                            </button>
                        ))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                        1 crédito = {ytMinutesPerCredit} minutos de reproducción en YouTube
                    </div>
                </div>
            </div>

            {/* ==================== Idle Autoplay ==================== */}
            <div style={{
                ...sectionStyle,
                border: `2px solid ${idleEnabled ? 'var(--accent-purple, #8b5cf6)' : 'var(--border-color)'}`,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                            🎲 Reproducción en Reposo
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            Reproduce música aleatoria cuando no hay actividad durante un tiempo.
                        </div>
                    </div>
                    <button
                        onClick={() => setIdleEnabled(!idleEnabled)}
                        style={{
                            padding: '8px 20px',
                            background: idleEnabled ? 'var(--accent-green)' : 'rgba(255,255,255,0.06)',
                            border: `2px solid ${idleEnabled ? 'var(--accent-green)' : 'var(--border-color)'}`,
                            borderRadius: 8,
                            color: 'white',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: 12,
                        }}
                    >
                        {idleEnabled ? '✅ Activado' : '❌ Desactivado'}
                    </button>
                </div>

                {idleEnabled && (
                    <>
                        <div style={{ marginBottom: 16 }}>
                            <div style={labelStyle}>⏰ Inactividad para iniciar (0 Créditos)</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {idleTimeoutOptions.map((n) => (
                                    <button key={n} onClick={() => setIdleTimeoutMin(n)} style={optBtnStyle(idleTimeoutMin === n)}>
                                        {n < 1 ? `${n * 60}s` : `${n} min`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <div style={labelStyle}>⏰ Inactividad para iniciar (Con Créditos)</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {idleTimeoutOptions.map((n) => (
                                    <button key={n} onClick={() => setIdleTimeoutCreditsMin(n)} style={optBtnStyle(idleTimeoutCreditsMin === n)}>
                                        {n < 1 ? `${n * 60}s` : `${n} min`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <div style={labelStyle}>⏸️ Retomar Reposo tras pausar manual</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {idlePausedOptions.map((n) => (
                                    <button key={n} onClick={() => setIdleTimeoutPausedSec(n)} style={optBtnStyle(idleTimeoutPausedSec === n)}>
                                        {n < 60 ? `${n}s` : `${n / 60} min`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <div style={labelStyle}>🎵 Duración de cada preview</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {idleDurationOptions.map((n) => (
                                    <button key={n} onClick={() => setIdleDurationSec(n)} style={optBtnStyle(idleDurationSec === n)}>
                                        {n}s
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div style={labelStyle}>📀 Fuentes de música</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={() => toggleIdleSource('audio')}
                                    style={optBtnStyle(idleSources.includes('audio'))}
                                >
                                    🎵 Audio
                                </button>
                                <button
                                    onClick={() => toggleIdleSource('video')}
                                    style={optBtnStyle(idleSources.includes('video'))}
                                >
                                    🎬 Video
                                </button>
                                <button
                                    onClick={() => toggleIdleSource('youtube')}
                                    style={optBtnStyle(idleSources.includes('youtube'))}
                                >
                                    ▶ YouTube
                                </button>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                                Se seleccionará aleatoriamente de las fuentes activas. Mínimo 1 fuente requerida.
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ==================== Player Display Settings ==================== */}
            <div style={sectionStyle}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                    🎬 Reproductor de Video
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Configura el estilo de vista para videos locales y el reproductor minimizado inter-paneles.
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={labelStyle}>👁️ Estilo de Explorador (Videos Locales)</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {viewStyleOptions.map((opt) => (
                            <button key={opt.value} onClick={() => setVideoViewStyle(opt.value)} style={optBtnStyle(videoViewStyle === opt.value)}>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={labelStyle}>⏱️ Carga de Vista Previa (Segundo de Inicio)</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {previewStartOptions.map((n) => (
                            <button key={n} onClick={() => setVideoPreviewStart(n)} style={optBtnStyle(videoPreviewStart === n)}>
                                {n}s
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={labelStyle}>⌛ Duración de Vista Previa Silenciada</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {previewDurationOptions.map((n) => (
                            <button key={n} onClick={() => setVideoPreviewDuration(n)} style={optBtnStyle(videoPreviewDuration === n)}>
                                {n}s
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={labelStyle}>🐢 Retardo para Autoplay de Video (Navegación)</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {previewDelayOptions.map((n) => (
                            <button key={n} onClick={() => setVideoPreviewDelaySec(n)} style={optBtnStyle(videoPreviewDelaySec === n)}>
                                {n}s
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={labelStyle}>📐 Tamaño del Reproductor (Video)</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {sizeOptions.map((opt) => (
                            <button key={opt.value} onClick={() => setPlayerSize(opt.value)} style={optBtnStyle(playerSize === opt.value)}>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={labelStyle}>🎵 Canciones en Cola Visibles</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {queueDisplayOptions.map((n) => (
                            <button key={n} onClick={() => setQueueDisplayCount(n)} style={optBtnStyle(queueDisplayCount === n)}>
                                {n}
                            </button>
                        ))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                        Cuántas canciones se listarán bajo los controles del MiniPlayer
                    </div>
                </div>

                <div>
                    <div style={labelStyle}>📍 Posición del Reproductor</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {positionOptions.map((opt) => (
                            <button key={opt.value} onClick={() => setPlayerPosition(opt.value)} style={optBtnStyle(playerPosition === opt.value)}>
                                {opt.icon} {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Preview */}
                <div style={{
                    marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.03)',
                    borderRadius: 8, border: '1px solid var(--border-color)',
                }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Vista previa</div>
                    <div style={{
                        display: 'flex',
                        flexDirection: playerPosition === 'bottom' ? 'column' : 'row',
                        gap: 4, height: 60,
                    }}>
                        {playerPosition === 'left' && (
                            <div style={{ width: `${playerSize}%`, background: 'var(--accent-blue)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>▶</div>
                        )}
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
                            Cuadrícula
                        </div>
                        {playerPosition === 'right' && (
                            <div style={{ width: `${playerSize}%`, background: 'var(--accent-blue)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>▶</div>
                        )}
                        {playerPosition === 'bottom' && (
                            <div style={{ height: `${playerSize}%`, background: 'var(--accent-blue)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>▶</div>
                        )}
                    </div>
                </div>
            </div>

            {/* ==================== Audio Cover Settings ==================== */}
            <div style={sectionStyle}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                    🎵 Carátula de Canción (Audio Local)
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Configura el tamaño de la previsualización del álbum al navegar por las pistas de Audio.
                </div>

                <div>
                    <div style={labelStyle}>📐 Tamaño de Carátula</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {coverSizeOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setAudioCoverSize(opt.value)}
                                style={optBtnStyle(audioCoverSize === opt.value)}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
                {/* ==================== Directories ==================== */}
                <div style={sectionStyle}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
                        📂 Carpetas de Música Local
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
                        Configura las rutas donde se encuentran tus archivos de música, videos y karaoke.
                    </div>

                    <div className="config-form-group">
                        <label>🎵 Carpeta de Audio (MP3, WAV, FLAC)</label>
                        <input type="text" value={audio} onChange={(e) => setAudio(e.target.value)}
                            placeholder="C:\Users\edgar\OneDrive\Documentos\TRAE\rockola\music" />
                    </div>

                    <div className="config-form-group">
                        <label>🎬 Carpeta de Videos (MP4, AVI, MKV)</label>
                        <input type="text" value={video} onChange={(e) => setVideo(e.target.value)}
                            placeholder="C:\Users\edgar\OneDrive\Documentos\TRAE\rockola\videos" />
                    </div>

                    <div className="config-form-group">
                        <label>🎤 Carpeta de Karaoke</label>
                        <input type="text" value={karaoke} onChange={(e) => setKaraoke(e.target.value)}
                            placeholder="C:\Users\edgar\OneDrive\Documentos\TRAE\rockola\karaoke" />
                    </div>

                    <button className="config-save-btn" onClick={handleSave}>
                        💾 Guardar Rutas
                    </button>
                </div>

                {
                    saved && (
                        <div className="toast" style={{ background: 'var(--accent-green)' }}>
                            ✅ Configuración guardada correctamente
                        </div>
                    )
                }
            </div>
        </div>
    );
}
