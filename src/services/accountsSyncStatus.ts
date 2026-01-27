import api from "./api";
import type { GoogleSyncStatusResponse } from "./googleAdwords/googleAdwordsSyncStatus";

/** Same response shape as Google sync status. */
export type PlatformSyncStatusResponse = GoogleSyncStatusResponse;

export const accountsSyncStatusService = {
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
