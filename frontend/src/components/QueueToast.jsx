import React, { useState, useEffect } from 'react';
import useRockolaStore from '../store/useRockolaStore';

export default function QueueToast() {
    const queueToast = useRockolaStore((s) => s.queueToast);
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (queueToast) {
            setMessage(queueToast);
            // Trigger fade-in after a frame
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setVisible(true));
            });

            // Fade out before clearing
            const fadeOutTimer = setTimeout(() => {
                setVisible(false);
            }, 3000);

            return () => clearTimeout(fadeOutTimer);
        } else {
            setVisible(false);
            // Clear message after fade-out completes
            const clearTimer = setTimeout(() => setMessage(''), 500);
            return () => clearTimeout(clearTimer);
        }
    }, [queueToast]);

    if (!message) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.5s ease',
        }}>
            <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))',
                backdropFilter: 'blur(20px)',
                borderRadius: 20,
                padding: '28px 48px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(16, 185, 129, 0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                textAlign: 'center',
                maxWidth: '80vw',
            }}>
                <div style={{
                    fontSize: 40,
                    marginBottom: 8,
                }}>
                    ✅
                </div>
                <div style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: 'white',
                    letterSpacing: 0.5,
                    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}>
                    ¡Agregado a la cola!
                </div>
                <div style={{
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.85)',
                    marginTop: 6,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '60vw',
                }}>
                    {message}
                </div>
            </div>
        </div>
    );
}
