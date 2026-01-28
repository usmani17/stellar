import api from "../api";

export interface ProfileSyncStatus {
  id: number;
  name: string;
  customer_id?: string;
  advertiser_id?: string;
  profileId?: string;
  status: "syncing" | "completed" | "idle" | "error";
  last_synced_at: string | null;
  last_synced_before?: string | null;
}

/** Per-ad-type status for Amazon (SP, SB); SD has no keywords. */
export interface AdTypeSyncStatus {
  status: "syncing" | "completed" | "idle" | "error";
  last_synced_at: string | null;
  last_synced_before?: string | null;
}

export interface SyncStatus {
  status: "syncing" | "completed" | "idle" | "error";
  last_synced_at: string | null;
  last_synced_before?: string | null;
  profiles?: ProfileSyncStatus[];
  /** Amazon only: SP, SB (and SD for campaigns/adgroups/ads; keywords have no SD) */
  ad_types?: {
    SP?: AdTypeSyncStatus;
    SB?: AdTypeSyncStatus;
    SD?: AdTypeSyncStatus;
  };
}

export interface GoogleSyncStatusResponse {
  campaigns: SyncStatus;
  adgroups: SyncStatus;
  ads: SyncStatus;
  keywords: SyncStatus;
}

export const googleAdwordsSyncStatusService = {
  getGoogleSyncStatus: async (
    accountId: number,
    channelId: number
  ): Promise<GoogleSyncStatusResponse> => {
    // Validate channelId before constructing URL
    if (!channelId || isNaN(channelId)) {
      throw new Error(`Invalid channelId: ${channelId}. channelId must be a valid number.`);
    }
    // Add cache-busting timestamp to ensure fresh data (prevents React/browser caching)
    const timestamp = new Date().getTime();
    const response = await api.get<GoogleSyncStatusResponse>(
      `/google-adwords/${accountId}/channels/${channelId}/google-sync-status/?_t=${timestamp}`
    );
    return response.data;
  },
};
