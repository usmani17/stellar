/**
 * Centralized query keys factory for type-safe React Query keys
 *
 * Usage:
 * - queryKeys.accounts.lists() -> ["accounts", "list"]
 * - queryKeys.accounts.detail(1) -> ["accounts", "detail", 1]
 * - queryKeys.channels.lists(1) -> ["channels", "list", 1]
 */
export const queryKeys = {
  accounts: {
    all: ["accounts"] as const,
    lists: () => [...queryKeys.accounts.all, "list"] as const,
    detail: (id: number) => [...queryKeys.accounts.all, "detail", id] as const,
  },
  channels: {
    all: ["channels"] as const,
    lists: (accountId: number) =>
      [...queryKeys.channels.all, "list", accountId] as const,
    detail: (accountId: number, channelId: number) =>
      [...queryKeys.channels.all, "detail", accountId, channelId] as const,
  },
} as const;
