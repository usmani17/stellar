import { useState, useEffect } from "react";

/**
 * Hook to manage chart collapse state with localStorage persistence
 * @param localStorageKey - Unique key for localStorage (e.g., "google-campaigns-chart-collapsed")
 * @returns Tuple of [isCollapsed, toggleCollapse]
 */
export const useChartCollapse = (
  localStorageKey: string
): [boolean, () => void] => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem(localStorageKey);
    return saved === "true";
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(localStorageKey, String(isCollapsed));
  }, [isCollapsed, localStorageKey]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  return [isCollapsed, toggleCollapse];
};
