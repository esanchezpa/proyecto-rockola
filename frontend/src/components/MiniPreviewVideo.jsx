import React from 'react';

export default function MiniPreviewVideo({ track, isPlayingOtherTrack, delaySec }) {
    if (!track) {
        return (
            <div className="mini-preview-audio size-large empty">
                <div style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-card)',
                    color: 'var(--text-muted)'
                }}>
                    🔌 Seleccione un Vídeo
                </div>
            </div>
        );
    }

    return (
        <div className="mini-preview-audio size-large">
            <div style={{
                width: '100%',
                aspectRatio: '16/9',
                background: '#000',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                color: '#fff',
                border: '4px solid var(--border-color)',
                borderRadius: '16px'
            }}>
                <span style={{ fontSize: 40, marginBottom: 12 }}>🎬</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
                    Preparando visualización...
                </span>

                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '24px 16px 16px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                    color: '#fff',
                    textAlign: 'center'
                }}>
                    <strong style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>
                        {track.title || track.filename.replace(/\.[^/.]+$/, '')}
                    </strong>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {track.artist || 'Desconocido'}
                    </div>

                    {isPlayingOtherTrack ? (
                        <div style={{ fontSize: 12, color: '#ef4444', marginTop: 8, fontWeight: 'bold' }}>
                            ❌ Vista previa en MiniPlayer pausada (Pista en curso)
                        </div>
                    ) : (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                            🕒 Esperando {delaySec}s para auto-iniciar en MiniPlayer
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
