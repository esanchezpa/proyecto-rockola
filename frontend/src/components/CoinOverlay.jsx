import React, { useEffect, useState } from 'react';
import useRockolaStore from '../store/useRockolaStore';

/**
 * CoinOverlay — full-screen, centered "¡INSERTE MONEDA!" popup
 * shown when user tries to add a track without credits.
 */
export default function CoinOverlay() {
    const coinAlert = useRockolaStore((s) => s.coinAlert);
    const [visible, setVisible] = useState(false);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        if (coinAlert) {
            setVisible(true);
            setAnimating(true);
            const timer = setTimeout(() => {
                setAnimating(false);
                setTimeout(() => setVisible(false), 400);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [coinAlert]);

    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: animating ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0)',
            transition: 'background 0.4s ease',
            pointerEvents: animating ? 'auto' : 'none',
        }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                padding: '40px 60px',
                background: 'linear-gradient(135deg, #d97706, #b45309, #78350f)',
                border: '4px solid #f59e0b',
                borderRadius: 24,
                boxShadow: animating
                    ? '0 0 80px rgba(245, 158, 11, 0.6), 0 0 200px rgba(245, 158, 11, 0.3), inset 0 0 30px rgba(255,255,255,0.1)'
                    : '0 0 0px transparent',
                transform: animating ? 'scale(1)' : 'scale(0.5)',
                opacity: animating ? 1 : 0,
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                textAlign: 'center',
            }}>
                {/* Big coin icon */}
                <div style={{
                    fontSize: 72,
                    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
                    animation: animating ? 'coinBounce 0.6s ease-in-out infinite alternate' : 'none',
                }}>
                    🪙
                </div>

                {/* Main text */}
                <div style={{
                    fontSize: 36,
                    fontWeight: 900,
                    letterSpacing: 3,
                    color: '#fef3c7',
                    textShadow: '0 3px 10px rgba(0,0,0,0.5)',
                    textTransform: 'uppercase',
                }}>
                    ¡INSERTE MONEDA!
                </div>

                {/* Subtitle */}
                <div style={{
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: 500,
                    letterSpacing: 1,
                }}>
                    Para reproducir música necesitas créditos
                </div>
            </div>

            <style>{`
                @keyframes coinBounce {
                    0% { transform: translateY(0) rotate(-5deg); }
                    100% { transform: translateY(-12px) rotate(5deg); }
                }
            `}</style>
        </div>
    );
}
