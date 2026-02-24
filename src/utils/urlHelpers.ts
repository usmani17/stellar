/**
 * URL helper utilities for account-based navigation
 */

const LAST_SELECTED_ACCOUNT_KEY = 'lastSelectedAccountId';

/**
 * Extract account_id from URL pathname
 * @param pathname - Current pathname (e.g., '/brands/1/58/amazon/campaigns' or '/brands/1/amazon/campaigns')
 * @returns account_id as number or null if not found
 */
export const getAccountIdFromUrl = (pathname: string): number | null => {
  const match = pathname.match(/^\/brands\/(\d+)/);
  if (match && match[1]) {
    const accountId = parseInt(match[1], 10);
    return isNaN(accountId) ? null : accountId;
  }
  return null;
};

/**
 * Extract channel_id from URL pathname (for Amazon routes: /brands/:accountId/:channelId/amazon/...)
 * @param pathname - Current pathname (e.g., '/brands/1/58/amazon/campaigns')
 * @returns channel_id as number or null if not found
 */
export const getChannelIdFromUrl = (pathname: string): number | null => {
  const match = pathname.match(/^\/brands\/\d+\/(\d+)\/(?:amazon|google|tiktok|meta)\//);
  if (match && match[1]) {
    const channelId = parseInt(match[1], 10);
    return isNaN(channelId) ? null : channelId;
  }
  return null;
};

/**
 * Get last selected account ID from localStorage
 * @returns account_id as number or null if not found
 */
export const getAccountIdFromStorage = (): number | null => {
  try {
    const stored = localStorage.getItem(LAST_SELECTED_ACCOUNT_KEY);
    if (stored) {
      const accountId = parseInt(stored, 10);
      return isNaN(accountId) ? null : accountId;
    }
  } catch (error) {
    console.error('Error reading account ID from storage:', error);
  }
  return null;
};

/**
 * Save account ID to localStorage
 * @param accountId - Account ID to save
 */
export const saveAccountIdToStorage = (accountId: number): void => {
  try {
    localStorage.setItem(LAST_SELECTED_ACCOUNT_KEY, accountId.toString());
  } catch (error) {
    console.error('Error saving account ID to storage:', error);
  }
};

/**
 * Clear last selected account ID from localStorage.
 * Call this on logout so the next user/session does not use the previous user's selection.
 */
export const clearAccountIdFromStorage = (): void => {
  try {
    localStorage.removeItem(LAST_SELECTED_ACCOUNT_KEY);
  } catch (error) {
    console.error('Error clearing account ID from storage:', error);
  }
};

/**
 * Get current account ID from URL params or localStorage fallback
 * @param pathname - Current pathname
 * @returns account_id as number or null if not found
 */
export const getCurrentAccountId = (pathname: string): number | null => {
  // First try to get from URL
  const urlAccountId = getAccountIdFromUrl(pathname);
  if (urlAccountId !== null) {
    // Save to storage for fallback
    saveAccountIdToStorage(urlAccountId);
    return urlAccountId;
  }
  
  // Fallback to localStorage
  return getAccountIdFromStorage();
};

/**
 * Build a route with account ID
 * @param accountId - Account ID
 * @param path - Path after account (e.g., 'channels', 'amazon/campaigns')
 * @returns Full route path
 */
export const buildAccountRoute = (accountId: number, path: string): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `/brands/${accountId}/${cleanPath}`;
};

/**
 * Build a marketplace-specific route.
 * For Amazon/TikTok/Google: includes channelId in path and optional profileId as query.
 * @param accountId - Account ID
 * @param channelId - Channel ID (required for all marketplaces)
 * @param marketplace - Marketplace name (e.g., 'amazon', 'google', 'tiktok')
 * @param entity - Entity name (e.g., 'campaigns', 'adgroups')
 * @param id - Optional entity ID for detail pages
 * @param profileId - Optional profile ID as query param (?profile_id=xxx)
 * @returns Full route path
 */
export const buildMarketplaceRoute = (
  accountId: number,
  channelId: number | string,
  marketplace: string,
  entity: string,
  id?: string | number,
  profileId?: string | number
): string => {
  const includeChannelInPath =
    marketplace === 'amazon' || marketplace === 'tiktok' || marketplace === 'google' || marketplace === 'meta';
  const basePath = includeChannelInPath
    ? `/brands/${accountId}/${channelId}/${marketplace}/${entity}`
    : `/brands/${accountId}/${marketplace}/${entity}`;
  const pathWithId = id !== undefined ? `${basePath}/${id}` : basePath;
  if (profileId !== undefined && profileId !== '' && includeChannelInPath) {
    const q = `profile_id=${encodeURIComponent(String(profileId))}`;
    return `${pathWithId}?${q}`;
  }
  return pathWithId;
};

/**
 * Check if a route requires account ID
 * @param pathname - Route pathname
 * @returns true if route requires account ID
 */
export const requiresAccountId = (pathname: string): boolean => {
  // Routes that don't require account ID
  if (pathname === '/brands' || pathname.startsWith('/brands/oauth')) {
    return false;
  }
  
  // Routes starting with /channels/:channelId don't require account_id in URL
  if (pathname.startsWith('/channels/')) {
    return false;
  }
  
  // Routes starting with /brands/:accountId require account ID
  if (pathname.startsWith('/brands/')) {
    return true;
  }
  
  // Default to false for other routes (like /login, /signup, etc.)
  return false;
};

/**
 * Extract marketplace from URL pathname.
 * Supports both /brands/:accountId/:channelId/amazon/... and /brands/:accountId/amazon/...
 */
export const getMarketplaceFromUrl = (pathname: string): string | null => {
  const segments = pathname.split('/').filter(Boolean);
  // /brands/26/58/amazon/campaigns -> ['brands','26','58','amazon','campaigns']
  // /brands/26/amazon/campaigns -> ['brands','26','amazon','campaigns']
  if (segments[0] !== 'brands' || !segments[1]) return null;
  const second = segments[2];
  if (second && ['amazon', 'google', 'tiktok', 'meta'].includes(second)) {
    return second;
  }
  if (segments[3] && ['amazon', 'google', 'tiktok', 'meta'].includes(segments[3])) {
    return segments[3];
  }
  return null;
};

/**
 * Extract entity from URL pathname.
 * Supports both /brands/:accountId/:channelId/amazon/entity and /brands/:accountId/amazon/entity
 */
export const getEntityFromUrl = (pathname: string): string | null => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'brands' || !segments[1]) return null;
  const second = segments[2];
  if (second && ['amazon', 'google', 'tiktok', 'meta'].includes(second)) {
    return segments[3] ?? null;
  }
  if (segments[3] && ['amazon', 'google', 'tiktok', 'meta'].includes(segments[3])) {
    return segments[4] ?? null;
  }
  return null;
};

