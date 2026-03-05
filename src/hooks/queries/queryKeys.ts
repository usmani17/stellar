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
    listAll: () => [...queryKeys.accounts.all, "list", "all"] as const,
    listPaginated: (page?: number, pageSize?: number) =>
      [...queryKeys.accounts.all, "list", "paginated", page ?? 1, pageSize ?? 10] as const,
    detail: (id: number) => [...queryKeys.accounts.all, "detail", id] as const,
  },
  channels: {
    all: ["channels"] as const,
    lists: (accountId: number) =>
      [...queryKeys.channels.all, "list", accountId] as const,
    detail: (accountId: number, channelId: number) =>
      [...queryKeys.channels.all, "detail", accountId, channelId] as const,
  },
  campaigns: {
    all: ["campaigns"] as const,
    lists: (
      accountId: number,
      params?: Record<string, any>,
      channelId?: number | string | null,
      profileId?: string | number | null
    ) => {
      // Create a stable key from params by sorting keys
      const paramsKey = params
        ? JSON.stringify(
            Object.keys(params)
              .sort()
              .reduce((acc, key) => {
                acc[key] = params[key];
                return acc;
              }, {} as Record<string, any>)
          )
        : "default";
      return [
        ...queryKeys.campaigns.all,
        "list",
        accountId,
        paramsKey,
        channelId ?? "",
        profileId ?? "",
      ] as const;
    },
    detail: (accountId: number, campaignId: string | number) =>
      [
        ...queryKeys.campaigns.all,
        "detail",
        accountId,
        campaignId,
      ] as const,
  },
  googleProfiles: {
    all: ["googleProfiles"] as const,
    lists: (channelId: number) =>
      [...queryKeys.googleProfiles.all, "list", channelId] as const,
  },
  columnPreferences: {
    all: ["columnPreferences"] as const,
    detail: (marketplace: string, entityType: string, presetName?: string) =>
      [
        ...queryKeys.columnPreferences.all,
        "detail",
        marketplace,
        entityType,
        presetName || "default",
      ] as const,
  },
  assets: {
    all: ["assets"] as const,
    lists: (profileId: number, assetType?: string) =>
      [
        ...queryKeys.assets.all,
        "list",
        profileId,
        assetType || "all",
      ] as const,
    detail: (profileId: number, assetId: string) =>
      [
        ...queryKeys.assets.all,
        "detail",
        profileId,
        assetId,
      ] as const,
  },
  googleConversionActions: {
    all: ["googleConversionActions"] as const,
    lists: (accountId: number, channelId: number, profileId: number) =>
      [
        ...queryKeys.googleConversionActions.all,
        "list",
        accountId,
        channelId,
        profileId,
      ] as const,
  },

  workflows: {
    all: ["workflows"] as const,
    lists: (accountId: number, search?: string) =>
      [...queryKeys.workflows.all, "list", accountId, search ?? ""] as const,
    detail: (id: number) =>
      [...queryKeys.workflows.all, "detail", id] as const,
    runs: (workflowId: number) =>
      [...queryKeys.workflows.all, "runs", workflowId] as const,
  },
  brandSettings: {
    all: ["brandSettings"] as const,
    detail: (accountId: number) =>
      [...queryKeys.brandSettings.all, accountId] as const,
  },
  strategies: {
    all: ["strategies"] as const,
    lists: () => [...queryKeys.strategies.all, "list"] as const,
    detail: (id: number) => [...queryKeys.strategies.all, "detail", id] as const,
  },
  automations: {
    all: ["automations"] as const,
    lists: (strategyId: number) =>
      [...queryKeys.automations.all, "list", strategyId] as const,
  },
} as const;
