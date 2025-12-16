/**
 * URL helper utilities for account-based navigation
 */

const LAST_SELECTED_ACCOUNT_KEY = 'lastSelectedAccountId';

/**
 * Extract account_id from URL pathname
 * @param pathname - Current pathname (e.g., '/accounts/1/amazon/campaigns')
 * @returns account_id as number or null if not found
 */
export const getAccountIdFromUrl = (pathname: string): number | null => {
  const match = pathname.match(/^\/accounts\/(\d+)/);
  if (match && match[1]) {
    const accountId = parseInt(match[1], 10);
    return isNaN(accountId) ? null : accountId;
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
  return `/accounts/${accountId}/${cleanPath}`;
};

/**
 * Build a marketplace-specific route
 * @param accountId - Account ID
 * @param marketplace - Marketplace name (e.g., 'amazon', 'google', 'walmart')
 * @param entity - Entity name (e.g., 'campaigns', 'adgroups')
 * @param id - Optional entity ID for detail pages
 * @returns Full route path
 */
export const buildMarketplaceRoute = (
  accountId: number,
  marketplace: string,
  entity: string,
  id?: string | number
): string => {
  const basePath = `/accounts/${accountId}/${marketplace}/${entity}`;
  return id !== undefined ? `${basePath}/${id}` : basePath;
};

/**
 * Check if a route requires account ID
 * @param pathname - Route pathname
 * @returns true if route requires account ID
 */
export const requiresAccountId = (pathname: string): boolean => {
  // Routes that don't require account ID
  if (pathname === '/accounts' || pathname.startsWith('/accounts/oauth')) {
    return false;
  }
  
  // Routes starting with /channels/:channelId don't require account_id in URL
  if (pathname.startsWith('/channels/')) {
    return false;
  }
  
  // Routes starting with /accounts/:accountId require account ID
  if (pathname.startsWith('/accounts/')) {
    return true;
  }
  
  // Default to false for other routes (like /login, /signup, etc.)
  return false;
};

/**
 * Extract marketplace from URL pathname
 * @param pathname - Current pathname
 * @returns marketplace name or null if not found
 */
export const getMarketplaceFromUrl = (pathname: string): string | null => {
  const match = pathname.match(/^\/accounts\/\d+\/([^/]+)\//);
  return match ? match[1] : null;
};

/**
 * Extract entity from URL pathname
 * @param pathname - Current pathname
 * @returns entity name or null if not found
 */
export const getEntityFromUrl = (pathname: string): string | null => {
  const match = pathname.match(/^\/accounts\/\d+\/[^/]+\/([^/]+)/);
  return match ? match[1] : null;
};

