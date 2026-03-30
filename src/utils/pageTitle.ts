/**
 * Utility functions for managing page titles
 */

const DEFAULT_TITLE = "Prism";
const TITLE_PREFIX = "Prism";

/**
 * Sets the page title with the Prism prefix
 * @param title - The page title (e.g., "Google Campaigns")
 * @returns The full title that was set
 */
export const setPageTitle = (title: string): string => {
  const fullTitle = title ? `${TITLE_PREFIX} - ${title}` : DEFAULT_TITLE;
  document.title = fullTitle;
  return fullTitle;
};

/**
 * Resets the page title to the default
 */
export const resetPageTitle = (): void => {
  document.title = DEFAULT_TITLE;
};

/**
 * Gets the current page title
 */
export const getPageTitle = (): string => {
  return document.title;
};

