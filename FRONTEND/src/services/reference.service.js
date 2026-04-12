/**
 * Reference Service
 * Provides reference data from endpoints that don't require module-specific permissions
 * Used for cross-module lookups (dropdowns, etc.)
 * 
 * Features:
 * - In-memory cache with 5-minute TTL
 * - Reduces redundant API calls
 * - Prevents rate limiting issues
 */

import api from './api';
import cacheService from './cache.service';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generic cached API call
 * @param {string} endpoint - API endpoint
 * @param {string} cacheKey - Cache key
 * @returns {Promise<any>}
 */
const getCachedData = async (endpoint, cacheKey) => {
    // Check cache first
    const cached = cacheService.get(cacheKey);
    if (cached) {
        return cached;
    }

    // Fetch from API
    const response = await api.get(endpoint);
    const data = response.data;

    // Store in cache
    cacheService.set(cacheKey, data, CACHE_TTL);

    return data;
};

/**
 * Get suppliers for reference (dropdown selections)
 * Only returns {id, name} - no permission required beyond authentication
 */
export const getReferenceSuppliers = async () => {
    return getCachedData('/reference/suppliers', 'ref:suppliers');
};

/**
 * Get accounting accounts for reference
 */
export const getReferenceAccounts = async () => {
    return getCachedData('/reference/accounts', 'ref:accounts');
};

/**
 * Get cost centers for reference
 */
export const getReferenceCostCenters = async () => {
    return getCachedData('/reference/cost-centers', 'ref:cost-centers');
};

/**
 * Get cost centers scoped to the current user (only CCs they manage or belong to)
 * Admins get all cost centers
 */
export const getMyScopedCostCenters = async () => {
    return getCachedData('/reference/my-cost-centers', 'ref:my-cost-centers');
};

/**
 * Get contracts for reference
 */
export const getReferenceContracts = async () => {
    return getCachedData('/reference/contracts', 'ref:contracts');
};

/**
 * Get users for reference
 */
export const getReferenceUsers = async () => {
    return getCachedData('/reference/users', 'ref:users');
};

/**
 * Clear all reference cache (useful after creating/updating reference data)
 */
export const clearReferenceCache = () => {
    cacheService.clear('ref:suppliers');
    cacheService.clear('ref:accounts');
    cacheService.clear('ref:cost-centers');
    cacheService.clear('ref:my-cost-centers');
    cacheService.clear('ref:contracts');
    cacheService.clear('ref:users');
};
