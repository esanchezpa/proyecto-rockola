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
export function useGridNavigation(totalItems, columns = 4, onSelect, itemsPerPage = 8) {
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
        // Only handle when grid is focused
        if (focusZone !== 'grid') return;
        if (pageItemCount === 0) return;

        // Don't intercept if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        let newIndex = selectedIndex;
        let newPage = page;

        switch (e.key) {
            case 'ArrowRight': {
                e.preventDefault();
                e.stopPropagation();
                const row = Math.floor(selectedIndex / columns);
                const col = selectedIndex % columns;
                const rowStart = row * columns;
                const rowEnd = Math.min(rowStart + columns, pageItemCount);
                const rowLen = rowEnd - rowStart;
                const nextCol = (col + 1) % rowLen;
                newIndex = rowStart + nextCol;
                break;
            }
            case 'ArrowLeft': {
                e.preventDefault();
                e.stopPropagation();
                const row = Math.floor(selectedIndex / columns);
                const col = selectedIndex % columns;
                const rowStart = row * columns;
                const rowEnd = Math.min(rowStart + columns, pageItemCount);
                const rowLen = rowEnd - rowStart;
                const prevCol = (col - 1 + rowLen) % rowLen;
                newIndex = rowStart + prevCol;
                break;
            }
            case 'ArrowDown': {
                e.preventDefault();
                e.stopPropagation();
                const nextRow = selectedIndex + columns;
                if (nextRow < pageItemCount) {
                    newIndex = nextRow;
                } else if (page < totalPages - 1) {
                    newPage = page + 1;
                    newIndex = selectedIndex % columns;
                } else {
                    // Start of player focus unlock
                    setFocusZone('player');
                }
                break;
            }
            case 'ArrowUp': {
                e.preventDefault();
                e.stopPropagation();
                const prevRow = selectedIndex - columns;
                if (prevRow >= 0) {
                    newIndex = prevRow;
                } else if (page > 0) {
                    // Go to previous page, last row
                    newPage = page - 1;
                    const prevPageItems = Math.min(itemsPerPage, totalItems - newPage * itemsPerPage);
                    const lastRowStart = Math.floor((prevPageItems - 1) / columns) * columns;
                    const col = selectedIndex % columns;
                    newIndex = Math.min(lastRowStart + col, prevPageItems - 1);
                } else {
                    // First row, first page — switch to nav bar OR search input
                    const activeTab = useRockolaStore.getState().activeTab;
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
    }, [selectedIndex, setSelectedIndex, pageItemCount, columns, onSelect, page, totalPages, pageStart, totalItems, focusZone, setFocusZone]);

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
