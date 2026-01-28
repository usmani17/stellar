import api from "./api";
import type { GoogleSyncStatusResponse } from "./googleAdwords/googleAdwordsSyncStatus";

/** Same response shape as Google sync status. */
export type PlatformSyncStatusResponse = GoogleSyncStatusResponse;

/** Combined entity sync status: one call returns all platforms. */
export type EntitySyncStatusResponse = {
  google?: PlatformSyncStatusResponse;
  amazon?: PlatformSyncStatusResponse;
  tiktok?: PlatformSyncStatusResponse;
};

export const accountsSyncStatusService = {
  /** Single endpoint for all platforms (Profiles page). */
  getEntitySyncStatus: async (
    accountId: number
  ): Promise<EntitySyncStatusResponse> => {
    const t = new Date().getTime();
    const res = await api.get<EntitySyncStatusResponse>(
      `/accounts/${accountId}/entity-sync-status/?_t=${t}`
    );
    return res.data;
  },

  getAmazonSyncStatus: async (
    accountId: number
  ): Promise<PlatformSyncStatusResponse> => {
    const t = new Date().getTime();
    const res = await api.get<PlatformSyncStatusResponse>(
      `/accounts/${accountId}/amazon-sync-status/?_t=${t}`
    );
    return res.data;
  },

  getTikTokSyncStatus: async (
    accountId: number
  ): Promise<PlatformSyncStatusResponse> => {
    const t = new Date().getTime();
    const res = await api.get<PlatformSyncStatusResponse>(
      `/accounts/${accountId}/tiktok-sync-status/?_t=${t}`
    );
    return res.data;
  },
};
