import { useState, useCallback, useEffect } from 'react';

/**
 * Persists filter state in localStorage per module key.
 *
 * Usage:
 *   const [filters, setFilters] = usePersistedFilters('incidents', {
 *     status: '', priority: '', search: ''
 *   });
 */
const usePersistedFilters = (storageKey, defaultFilters = {}) => {
    const key = `itbm_filters_${storageKey}`;

    const [filters, setFiltersState] = useState(() => {
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults to handle new filter fields added later
                return { ...defaultFilters, ...parsed };
            }
        } catch {
            // Ignore parse errors
        }
        return defaultFilters;
    });

    const setFilters = useCallback((updater) => {
        setFiltersState((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            try {
                localStorage.setItem(key, JSON.stringify(next));
            } catch {
                // Quota exceeded or private mode — silently ignore
            }
            return next;
        });
    }, [key]);

    const clearFilters = useCallback(() => {
        setFilters(defaultFilters);
        try {
            localStorage.removeItem(key);
        } catch { }
    }, [key, setFilters, defaultFilters]);

    return [filters, setFilters, clearFilters];
};

export default usePersistedFilters;
