import { useEffect } from 'react';

interface KeyboardShortcutsConfig {
    onEscape?: () => void;
    onSearch?: () => void;
    onNewGallery?: () => void;
    onShowHelp?: () => void;
}

export function useKeyboardShortcuts({
    onEscape,
    onSearch,
    onNewGallery,
    onShowHelp,
}: KeyboardShortcutsConfig) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if user is typing in an input field
            const isInputFocused =
                document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA' ||
                document.activeElement?.getAttribute('contenteditable') === 'true';

            // Escape - Always works, even in inputs
            if (e.key === 'Escape' && onEscape) {
                onEscape();
                return;
            }

            // Don't trigger shortcuts if user is typing
            if (isInputFocused) return;

            // Ctrl/Cmd + K - Focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k' && onSearch) {
                e.preventDefault();
                onSearch();
                return;
            }

            // N - New gallery
            if (e.key === 'n' && onNewGallery) {
                e.preventDefault();
                onNewGallery();
                return;
            }

            // ? - Show shortcuts help
            if (e.key === '?' && onShowHelp) {
                e.preventDefault();
                onShowHelp();
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onEscape, onSearch, onNewGallery, onShowHelp]);
}
