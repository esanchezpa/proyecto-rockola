import { useEffect, useRef } from 'react';
import useRockolaStore from '../store/useRockolaStore';

export default function useKeyManager() {
    const insertCoin = useRockolaStore((s) => s.insertCoin);
    const keyBindings = useRockolaStore((s) => s.keyBindings);
    const lastCoinTime = useRef(0);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Prevenir comportamiento por defecto para teclas de navegación
            if ([keyBindings.up, keyBindings.down, keyBindings.left, keyBindings.right].includes(e.code)) {
                // e.preventDefault(); // Comentado para no romper scroll si es necesario, pero útil en modo kiosko
            }

            // Moneda (Insert Coin) con debounce
            if (e.key === keyBindings.insert_coin || e.code === keyBindings.insert_coin) {
                const now = Date.now();
                if (now - lastCoinTime.current > 300) {
                    insertCoin();
                    lastCoinTime.current = now;
                }
            }

            // Cancelar (Escape) - puede usarse para volver atrás o cerrar overlays
            if (e.code === keyBindings.cancel) {
                // Lógica de cancelación si es necesaria globalmente
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [keyBindings, insertCoin]);
}
