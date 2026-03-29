import type { AxiosError } from "axios";

const DEFAULT_API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

/**
 * Maps axios/API failures to a user-visible string. When there is no HTTP
 * response (network down, wrong URL, CORS/mixed-content blocks), avoid showing
 * the generic axios "Network Error" alone.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as AxiosError<{
    detail?: string;
    error?: string;
    message?: string;
  }>;
  const data = e.response?.data;

  if (data) {
    if (typeof data === "string") return data;
    if (data.error) return String(data.error);
    if (data.message) return String(data.message);
    if (data.detail) return String(data.detail);
  }

  if (!e.response) {
    const msg = (e.message || "").toLowerCase();
    const code = (e as { code?: string }).code;
    if (
      code === "ERR_NETWORK" ||
      code === "ECONNABORTED" ||
      msg.includes("network error") ||
      msg.includes("failed to fetch")
    ) {
      return `Cannot reach the API (${DEFAULT_API_BASE}). Start the backend, set VITE_API_BASE_URL if needed, and avoid loading the app over HTTPS while the API is HTTP (mixed content is blocked).`;
    }
  }

  if (e.message) return e.message;
  return fallback;
}
