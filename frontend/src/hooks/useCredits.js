import useRockolaStore from '../store/useRockolaStore';

export function useCredits() {
    const credits = useRockolaStore((s) => s.credits);
    const pricePerSong = useRockolaStore((s) => s.pricePerSong);
    const insertCoin = useRockolaStore((s) => s.insertCoin);
    const consumeCredit = useRockolaStore((s) => s.consumeCredit);

    return { credits, pricePerSong, insertCoin, consumeCredit };
}
