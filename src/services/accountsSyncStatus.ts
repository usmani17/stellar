import api from "./api";
import type {
  GoogleSyncStatusResponse,
  ProfileSyncStatus,
} from "./googleAdwords/googleAdwordsSyncStatus";

/** Same response shape as Google sync status. */
export type PlatformSyncStatusResponse = GoogleSyncStatusResponse;

/** Per-entity status within a sync_status_obj. */
export interface EntitySyncStatusPart {
  status: "syncing" | "completed" | "idle" | "error";
  last_synced_at: string | null;
  last_synced_before?: string | null;
  error?: string | null;
}

/** sync_status_obj: one profile+ad_type (e.g. profile X, SP). */
export interface SyncStatusObj {
  status: string;
  last_synced_at: string | null;
  last_synced_before?: string | null;
  campaigns: EntitySyncStatusPart;
  adgroups: EntitySyncStatusPart;
  ads: EntitySyncStatusPart;
  keywords?: EntitySyncStatusPart;
}

/** New API format: payload[platform][profile_id][ad_type] = sync_status_obj */
export type EntitySyncStatusResponseNew = {
  google?: Record<string, Record<string, SyncStatusObj>>;
  amazon?: Record<string, Record<string, SyncStatusObj>>;
  tiktok?: Record<string, Record<string, SyncStatusObj>>;
  meta?: Record<string, Record<string, SyncStatusObj>>;
};

/** Combined entity sync status (legacy shape for Profiles page). */
export type EntitySyncStatusResponse = {
  google?: PlatformSyncStatusResponse;
  amazon?: PlatformSyncStatusResponse;
  tiktok?: PlatformSyncStatusResponse;
  meta?: PlatformSyncStatusResponse;
};

const STATUS_PRIORITY: Record<string, number> = {
  error: 4,
  syncing: 3,
  completed: 2,
  idle: 1,
};

function mergeStatus(a: string, b: string): string {
  const pa = STATUS_PRIORITY[a] ?? 0;
  const pb = STATUS_PRIORITY[b] ?? 0;
  if (pa >= pb) return a;
  return b;
}

/** Row shape needed for transform (id + profile identifier). */
export interface ProfileRowForTransform {
  id: number;
  platform: "google" | "amazon" | "tiktok" | "meta";
  profileIdLabel?: string;
  customer_id_raw?: string;
}

/** AdTypes shape for AmazonAdTypeStatus (SP, SB, SD). */
export interface AmazonAdTypes {
  SP?: EntitySyncStatusPart;
  SB?: EntitySyncStatusPart;
  SD?: EntitySyncStatusPart;
}

/**
 * Get per-profile ad_types from new format for a single Amazon profile row.
 * Used so each row shows its own SP/SB/SD status instead of aggregated across all profiles.
 */
export function getPerProfileAmazonAdTypes(
  entitySyncData: EntitySyncStatusResponseNew | null,
  row: { profileIdLabel?: string; customer_id_raw?: string }
): { campaignAdTypes: AmazonAdTypes; adgroupAdTypes: AmazonAdTypes; keywordAdTypes: AmazonAdTypes } {
  const empty: AmazonAdTypes = {};
  if (!entitySyncData?.amazon) {
    return { campaignAdTypes: empty, adgroupAdTypes: empty, keywordAdTypes: empty };
  }
  const profileId = row.profileIdLabel ?? "";
  const altId = row.customer_id_raw;
  const adTypeData =
    entitySyncData.amazon[profileId] ??
    (altId ? entitySyncData.amazon[altId] : undefined) ??
    (profileId && /[\d-]+/.test(profileId) ? entitySyncData.amazon[profileId.replace(/-/g, "")] : undefined);
  if (!adTypeData) {
    return { campaignAdTypes: empty, adgroupAdTypes: empty, keywordAdTypes: empty };
  }
  const campaignAdTypes: AmazonAdTypes = {};
  const adgroupAdTypes: AmazonAdTypes = {};
  const keywordAdTypes: AmazonAdTypes = {};
  for (const at of ["SP", "SB", "SD"] as const) {
    const obj = adTypeData[at];
    if (!obj) continue;
    campaignAdTypes[at] = obj.campaigns;
    adgroupAdTypes[at] = obj.adgroups;
    if (at !== "SD") {
      keywordAdTypes[at] = obj.keywords ?? { status: "idle", last_synced_at: null };
    }
  }
  return { campaignAdTypes, adgroupAdTypes, keywordAdTypes };
}

/**
 * Transform new API format to legacy PlatformSyncStatusResponse for mergeSyncStatusIntoRows.
 * Maps profile_id keys to profile rows by profileIdLabel / customer_id_raw.
 */
export function transformEntitySyncStatusToLegacy(
  newFormat: EntitySyncStatusResponseNew,
  profileRows: ProfileRowForTransform[]
): EntitySyncStatusResponse {
  const byPlatform = {
    google: profileRows.filter((r) => r.platform === "google"),
    amazon: profileRows.filter((r) => r.platform === "amazon"),
    tiktok: profileRows.filter((r) => r.platform === "tiktok"),
    meta: profileRows.filter((r) => r.platform === "meta"),
  };

  const buildLegacy = (
    platform: "google" | "amazon" | "tiktok" | "meta",
    rows: ProfileRowForTransform[]
  ): PlatformSyncStatusResponse | undefined => {
    const platformData = newFormat[platform];
    if (!platformData || Object.keys(platformData).length === 0) return undefined;

    const entityKeys = ["campaigns", "adgroups", "keywords"] as const;
    const result: PlatformSyncStatusResponse = {
      campaigns: { status: "idle", last_synced_at: null, profiles: [] },
      adgroups: { status: "idle", last_synced_at: null, profiles: [] },
      ads: { status: "idle", last_synced_at: null, profiles: [] },
      keywords: { status: "idle", last_synced_at: null, profiles: [] },
    };

    for (const row of rows) {
      const profileId = row.profileIdLabel ?? String(row.id);
      const altId = row.customer_id_raw;
      const adTypeData =
        platformData[profileId] ??
        (altId ? platformData[altId] : undefined) ??
        (platform === "google" && profileId && /[\d-]+/.test(profileId)
          ? platformData[profileId.replace(/-/g, "")]
          : undefined);
      if (!adTypeData) continue;

      const adTypes = Object.values(adTypeData);
      const campaignParts = adTypes.flatMap((o) =>
        o.campaigns ? [o.campaigns] : []
      );
      const adgroupParts = adTypes.flatMap((o) =>
        o.adgroups ? [o.adgroups] : []
      );
      const keywordParts = adTypes.flatMap((o) =>
        o.keywords ? [o.keywords] : []
      );

      const pick = (parts: EntitySyncStatusPart[]): ProfileSyncStatus => {
        let status = "idle";
        let last_synced_at: string | null = null;
        let error: string | null = null;
        for (const p of parts) {
          status = mergeStatus(status, p.status);
          if (p.last_synced_at && (!last_synced_at || p.last_synced_at > last_synced_at)) {
            last_synced_at = p.last_synced_at;
          }
          if (p.error) error = p.error;
        }
        return {
          id: row.id,
          name: "",
          status: status as ProfileSyncStatus["status"],
          last_synced_at,
          error,
        };
      };

      const campaignProfile = pick(campaignParts);
      const adgroupProfile = pick(adgroupParts);
      const keywordProfile = pick(keywordParts);

      result.campaigns.profiles!.push(campaignProfile);
      result.adgroups.profiles!.push(adgroupProfile);
      result.keywords.profiles!.push(keywordProfile);
    }

    for (const key of entityKeys) {
      const list = result[key].profiles ?? [];
      let aggStatus = "idle";
      let aggLast: string | null = null;
      for (const p of list) {
        aggStatus = mergeStatus(aggStatus, p.status);
        if (p.last_synced_at && (!aggLast || p.last_synced_at > aggLast)) {
          aggLast = p.last_synced_at;
        }
      }
      result[key].status = aggStatus as PlatformSyncStatusResponse["campaigns"]["status"];
      result[key].last_synced_at = aggLast;
    }

    if (platform === "amazon") {
      const adTypeKeys = ["SP", "SB", "SD"] as const;
      const entityToPart = (e: "campaigns" | "adgroups" | "keywords") =>
        (o: SyncStatusObj) => o[e];
      for (const entity of entityKeys) {
        const partsByAdType: Record<string, EntitySyncStatusPart[]> = {
          SP: [],
          SB: [],
          SD: [],
        };
        for (const row of rows) {
          const profileId = row.profileIdLabel ?? String(row.id);
          const altId = row.customer_id_raw;
          const adTypeData =
            platformData[profileId] ??
            (altId ? platformData[altId] : undefined) ??
            (platform === "google" && profileId && /[\d-]+/.test(profileId)
              ? platformData[profileId.replace(/-/g, "")]
              : undefined);
          if (!adTypeData) continue;
          for (const at of adTypeKeys) {
            const obj = adTypeData[at];
            if (!obj) continue;
            const part = entityToPart(entity)(obj);
            if (part && (entity !== "keywords" || at !== "SD")) {
              partsByAdType[at].push(part);
            }
          }
        }
        result[entity].ad_types = {} as PlatformSyncStatusResponse["campaigns"]["ad_types"];
        for (const at of adTypeKeys) {
          const parts = partsByAdType[at];
          let status = "idle";
          let last_synced_at: string | null = null;
          let error: string | null = null;
          for (const p of parts) {
            status = mergeStatus(status, p.status);
            if (p.last_synced_at && (!last_synced_at || p.last_synced_at > last_synced_at)) {
              last_synced_at = p.last_synced_at;
            }
            if (p.error) error = p.error;
          }
          (result[entity] as { ad_types?: Record<string, EntitySyncStatusPart> }).ad_types![at] = {
            status,
            last_synced_at,
            error,
          };
        }
      }
    }

    return result;
  };

  return {
    google: buildLegacy("google", byPlatform.google) ?? undefined,
    amazon: buildLegacy("amazon", byPlatform.amazon) ?? undefined,
    tiktok: buildLegacy("tiktok", byPlatform.tiktok) ?? undefined,
    meta: buildLegacy("meta", byPlatform.meta) ?? undefined,
  };
}

export const accountsSyncStatusService = {
  /** Single endpoint for all platforms (Profiles page). Returns new format. */
  getEntitySyncStatus: async (
    accountId: number
  ): Promise<EntitySyncStatusResponseNew> => {
    const t = new Date().getTime();
    const res = await api.get<EntitySyncStatusResponseNew>(
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
