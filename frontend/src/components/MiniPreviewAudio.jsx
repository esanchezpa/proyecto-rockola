import React, { useState, useEffect } from 'react';
import useRockolaStore from '../store/useRockolaStore';

export default function MiniPreviewAudio({ track }) {
    const [coverUrl, setCoverUrl] = useState(null);
    const [imageError, setImageError] = useState(false);
    const audioCoverSize = useRockolaStore((s) => s.audioCoverSize) || 'medium';

    useEffect(() => {
        if (!track || !track.path) {
            setCoverUrl(null);
            setImageError(true);
            return;
        }

        // We URL encode the path so the backend can accept it via query param
        const url = `http://localhost:5000/api/media/cover?path=${encodeURIComponent(track.path)}`;
        setCoverUrl(url);
        setImageError(false);
    }, [track]);

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
            {coverUrl && !imageError ? (
                <img
                    src={coverUrl}
                    alt="Album Cover"
                    className="mini-preview-image"
                    onError={() => setImageError(true)}
                />
            ) : (
                <div className="mini-preview-placeholder">
                    <span>🎵</span>
                </div>
            )}
            <div className="mini-preview-metadata">
                <div className="mini-preview-title">{track.title}</div>
                <div className="mini-preview-artist">
                    {track.artist !== 'Desconocido' ? track.artist : 'Archivo Local'}
                </div>
            </div>
        </div>
    );
}
