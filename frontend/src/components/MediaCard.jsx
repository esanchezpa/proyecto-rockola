import React, { useState, useEffect } from 'react';
import { getVideoThumbnail } from '../utils/thumbnailGenerator';

const IMAGES = [
    '/images/concert_stage.png',
    '/images/guitar_player.png',
    '/images/microphone_stage.png',
    '/images/percussion_drums.png',
    '/images/female_singer.png',
    '/images/concert_crowd.png',
];

export default function MediaCard({
    title,
    artist,
    duration,
    genre,
    imageIndex = 0,
    imageSrc,
    customImage,
    videoSrc,
    selected = false,
    selectedType = 'blue',
    badge,
    badgeType = 'selected',
    showPlayOverlay = false,
    onClick,
    children,
}) {
    const defaultImg = IMAGES[imageIndex % IMAGES.length];
    const [img, setImg] = useState(customImage || imageSrc || defaultImg);

    useEffect(() => {
        if (customImage || imageSrc) {
            setImg(customImage || imageSrc);
            return;
        }
        if (videoSrc) {
            let isMounted = true;
            getVideoThumbnail(videoSrc).then(thumb => {
                if (isMounted && thumb) setImg(thumb);
            });
            return () => { isMounted = false; };
        }
    }, [customImage, imageSrc, videoSrc]);

    return (
        <div
            className={`media-card ${selected ? (selectedType === 'red' ? 'selected-red' : 'selected') : ''}`}
            onClick={onClick}
        >
            <div style={{ position: 'relative' }}>
                <img className="media-card-image" src={img} alt={title} />
                {duration && <span className="media-card-duration">{duration}</span>}
                {badge && (
                    <span className={`media-card-badge ${badgeType}`}>{badge}</span>
                )}
                {showPlayOverlay && <div className="media-card-play-overlay" />}
            </div>
            <div className="media-card-info">
                <div className="media-card-title">{title}</div>
                {artist && <div className="media-card-artist">{artist}</div>}
                {(duration || genre) && (
                    <div className="media-card-meta">
                        {duration && <span className="media-card-tag">{duration}</span>}
                        {genre && <span className="media-card-tag">{genre}</span>}
                    </div>
                )}
                {children}
            </div>
        </div>
    );
}
