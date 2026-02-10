import { useState, useEffect, useCallback } from "react";

/**
 * Hook for debounced search: keeps immediate input value for the controlled input
 * and a debounced value that updates after the user stops typing. Use the
 * debounced value for API/backend calls.
 *
 * @param initialValue - Initial search string
 * @param delayMs - Debounce delay in milliseconds (default 400)
 * @returns [value, setValue, debouncedValue] - value for input, setter, debounced value for API
 */
export function useDebouncedSearch(
  initialValue: string = "",
  delayMs: number = 400,
): [string, (value: string) => void, string] {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  const setValueCallback = useCallback((next: string) => {
    setValue(next);
  }, []);

  return [value, setValueCallback, debouncedValue];
}
