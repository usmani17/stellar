import api from "../api";

export interface ProfileSyncStatus {
  id: number;
  name: string;
  customer_id?: string;
  advertiser_id?: string;
  profileId?: string;
  status: "syncing" | "completed" | "idle" | "error";
  last_synced_at: string | null;
}

export interface SyncStatus {
  status: "syncing" | "completed" | "idle" | "error";
  last_synced_at: string | null;
  profiles?: ProfileSyncStatus[];
}

export interface GoogleSyncStatusResponse {
  campaigns: SyncStatus;
  adgroups: SyncStatus;
  ads: SyncStatus;
  keywords: SyncStatus;
}

export const googleAdwordsSyncStatusService = {
  getGoogleSyncStatus: async (
    accountId: number
  ): Promise<GoogleSyncStatusResponse> => {
    // Add cache-busting timestamp to ensure fresh data (prevents React/browser caching)
    const timestamp = new Date().getTime();
    const response = await api.get<GoogleSyncStatusResponse>(
      `/google-adwords/${accountId}/google-sync-status/?_t=${timestamp}`
    );
    return response.data;
  },
};
