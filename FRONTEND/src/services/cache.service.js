/**
 * Cache Service
 * Simple in-memory cache with TTL (Time To Live) support
 * Used to reduce redundant API calls for reference data
 */

class CacheService {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 5 * 60 * 1000; // 5 minutes default
    }

    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @returns {any|null} Cached value or null if expired/not found
     */
    get(key) {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    /**
     * Set value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in milliseconds (optional)
     */
    set(key, value, ttl = this.defaultTTL) {
        const expiresAt = Date.now() + ttl;
        this.cache.set(key, { value, expiresAt });
    }

    /**
     * Clear specific key or entire cache
     * @param {string} key - Cache key (optional, clears all if not provided)
     */
    clear(key) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    /**
     * Check if key exists and is not expired
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Clean up expired entries
     */
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
}

// Singleton instance
const cacheService = new CacheService();

// Auto-cleanup every 10 minutes
setInterval(() => cacheService.cleanup(), 10 * 60 * 1000);

export default cacheService;
