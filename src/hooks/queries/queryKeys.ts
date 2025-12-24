/**
 * Centralized query keys factory for type-safe React Query keys
 *
 * Usage:
 * - queryKeys.accounts.lists() -> ["accounts", "list"]
 * - queryKeys.accounts.detail(1) -> ["accounts", "detail", 1]
 */
export const queryKeys = {
  accounts: {
    all: ["accounts"] as const,
    lists: () => [...queryKeys.accounts.all, "list"] as const,
    detail: (id: number) => [...queryKeys.accounts.all, "detail", id] as const,
  },
} as const;
