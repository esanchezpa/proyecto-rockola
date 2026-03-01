import { useEffect, useCallback, useState } from 'react';
import useRockolaStore from '../store/useRockolaStore';

/**
 * Hook for grid keyboard navigation with pagination.
 * - Left/Right: cyclic within the current row
 * - Up: moves up a row, or switches focusZone to 'nav' if on first row
 * - Down: moves down a row, or goes to next page
 * - Enter: selects the current item
 * Only active when focusZone === 'grid'
 */
export function useGridNavigation(totalItems, columns = 4, onSelect, itemsPerPage = 8, layout = 'vertical') {
    const [page, setPage] = useState(0);
    const selectedIndex = useRockolaStore((s) => s.selectedIndex);
    const setSelectedIndex = useRockolaStore((s) => s.setSelectedIndex);
    const focusZone = useRockolaStore((s) => s.focusZone);
    const setFocusZone = useRockolaStore((s) => s.setFocusZone);

    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    // Clamp page if items change
    useEffect(() => {
        if (page >= totalPages) setPage(Math.max(0, totalPages - 1));
    }, [totalPages, page]);

    // Items on current page
    const pageStart = page * itemsPerPage;
    const pageEnd = Math.min(pageStart + itemsPerPage, totalItems);
    const pageItemCount = pageEnd - pageStart;

    // Clamp selectedIndex to current page
    useEffect(() => {
        if (selectedIndex >= pageItemCount && pageItemCount > 0) {
            setSelectedIndex(Math.max(0, pageItemCount - 1));
        }
    }, [pageItemCount, selectedIndex, setSelectedIndex]);

    const handleKeyDown = useCallback((e) => {
        if (focusZone !== 'grid') return;
        if (pageItemCount === 0) return;

        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        let newIndex = selectedIndex;
        let newPage = page;

        switch (e.key) {
            case 'ArrowRight': {
                e.preventDefault();
                e.stopPropagation();
                if (layout === 'horizontal') {
                    if (selectedIndex + columns < pageItemCount) {
                        newIndex = selectedIndex + columns;
                    } else {
                        setFocusZone('player');
                    }
                } else {
                    const col = selectedIndex % columns;
                    if (columns === 1 || col === columns - 1 || selectedIndex === pageItemCount - 1) {
                        setFocusZone('player');
                        return;
                    }
                    if (selectedIndex + 1 < pageItemCount) {
                        newIndex = selectedIndex + 1;
                    }
                }
                break;
            }
            case 'ArrowLeft': {
                e.preventDefault();
                e.stopPropagation();
                if (layout === 'horizontal') {
                    if (selectedIndex - columns >= 0) {
                        newIndex = selectedIndex - columns;
                    } else {
                        const state = useRockolaStore.getState();
                        if (state.selectedArtist) {
                            useRockolaStore.setState({ selectedArtist: '', viewMode: 'artists', focusZone: 'grid' });
                            return;
                        } else if (state.selectedGenre) {
                            useRockolaStore.setState({ selectedGenre: '', activeTab: 'genero', focusZone: 'grid' });
                            return;
                        }
                    }
                } else {
                    const col = selectedIndex % columns;
                    if (col === 0) {
                        const state = useRockolaStore.getState();
                        if (state.selectedArtist) {
                            useRockolaStore.setState({ selectedArtist: '', viewMode: 'artists', focusZone: 'grid' });
                            return;
                        } else if (state.selectedGenre) {
                            useRockolaStore.setState({ selectedGenre: '', activeTab: 'genero', focusZone: 'grid' });
                            return;
                        }
                    } else if (selectedIndex > 0) {
                        newIndex = selectedIndex - 1;
                    }
                }
                break;
            }
            case 'ArrowDown': {
                e.preventDefault();
                e.stopPropagation();
                if (layout === 'horizontal') {
                    if (selectedIndex % columns < columns - 1 && selectedIndex + 1 < pageItemCount) {
                        newIndex = selectedIndex + 1;
                    }
                } else {
                    const nextRow = selectedIndex + columns;
                    if (nextRow < pageItemCount) {
                        newIndex = nextRow;
                    } else if (page < totalPages - 1) {
                        newPage = page + 1;
                        newIndex = selectedIndex % columns;
                        const maxIndex = (totalItems - newPage * itemsPerPage) - 1;
                        if (newIndex > maxIndex) newIndex = maxIndex;
                    }
                }
                break;
            }
            case 'ArrowUp': {
                e.preventDefault();
                e.stopPropagation();
                if (layout === 'horizontal') {
                    if (selectedIndex % columns > 0) {
                        newIndex = selectedIndex - 1;
                    } else {
                        setFocusZone('nav');
                    }
                } else {
                    const prevRow = selectedIndex - columns;
                    if (prevRow >= 0) {
                        newIndex = prevRow;
                    } else if (page > 0) {
                        newPage = page - 1;
                        const prevPageItems = itemsPerPage;
                        const col = selectedIndex % columns;
                        const lastRowStart = Math.floor((prevPageItems - 1) / columns) * columns;
                        newIndex = Math.min(lastRowStart + col, prevPageItems - 1);
                    } else {
                        const state = useRockolaStore.getState();
                        const { activeTab, selectedGenre, selectedArtist } = state;

                        if (['audio', 'video'].includes(activeTab) && selectedGenre && !selectedArtist) {
                            setFocusZone('viewToggles');
                            return;
                        }

                        if (['audio', 'video', 'youtube'].includes(activeTab)) {
                            setFocusZone('search');
                            setTimeout(() => {
                                const input = document.querySelector('input[type="text"]');
                                if (input) input.focus();
                            }, 50);
                        } else {
                            setFocusZone('nav');
                        }
                        return;
                    }
                }
                break;
            }
            case 'Enter':
                e.preventDefault();
                e.stopPropagation();
                if (onSelect && selectedIndex < pageItemCount) {
                    onSelect(pageStart + selectedIndex);
                }
                return;
            default:
                return;
        }

        if (newPage !== page) {
            setPage(newPage);
            const newPageItems = Math.min(itemsPerPage, totalItems - newPage * itemsPerPage);
            newIndex = Math.min(newIndex, newPageItems - 1);
        }

        if (newIndex !== selectedIndex) {
            setSelectedIndex(newIndex);
        }
    }, [selectedIndex, setSelectedIndex, pageItemCount, columns, onSelect, page, totalPages, pageStart, totalItems, itemsPerPage, focusZone, setFocusZone, layout]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [handleKeyDown]);

    return {
        selectedIndex,
        page,
        totalPages,
        setPage,
        pageStart,
        pageEnd,
        pageItemCount,
    };
}
