import React, { useState, useEffect } from 'react';
import useRockolaStore from '../store/useRockolaStore';

export default function MiniPreviewAudio({ track }) {
    const audioCoverSize = useRockolaStore((s) => s.audioCoverSize) || 'medium';
    // Se solicitó anular la carga asíncrona por rendimiento y fijar una imagen base
    const coverUrl = '/images/microphone_stage.png';

    if (!track) {
        return (
            <div className={`mini-preview-audio size-${audioCoverSize} empty`}>
                <div className="mini-preview-placeholder">
                    <span>🎵</span>
                </div>
                <div className="mini-preview-metadata">
                    <div className="mini-preview-title">Navega por la Lista</div>
                    <div className="mini-preview-artist">---</div>
                </div>
            </div>
        );
    }

    return (
        <div className={`mini-preview-audio size-${audioCoverSize}`}>
            <img
                src={coverUrl}
                alt="Album Cover"
                className="mini-preview-image"
            />
            <div className="mini-preview-metadata">
                <div className="mini-preview-title">{track.title}</div>
                <div className="mini-preview-artist">
                    {track.artist !== 'Desconocido' ? track.artist : 'Archivo Local'}
                </div>
            </div>
        </div>
    );
}
