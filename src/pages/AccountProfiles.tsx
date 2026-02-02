import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccounts } from "../contexts/AccountsContext";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import {
  accountsSyncStatusService,
  transformEntitySyncStatusToLegacy,
  getPerProfileAmazonAdTypes,
} from "../services/accountsSyncStatus";
import { accountsService } from "../services/accounts";
import api from "../services/api";
import { ConfirmationModal } from "../components/ui/ConfirmationModal";
import type {
  AdTypeSyncStatus,
  GoogleSyncStatusResponse,
  ProfileSyncStatus,
} from "../services/googleAdwords/googleAdwordsSyncStatus";
import type { PlatformSyncStatusResponse } from "../services/accountsSyncStatus";
import GoogleIcon from "../assets/images/ri_google-fill.svg";
import AmazonIcon from "../assets/images/amazon-fill.svg";

type EntityStatus = "syncing" | "completed" | "idle" | "error";
type Platform = "google" | "amazon" | "tiktok";

interface ProfileRow {
  platform: Platform;
  id: number;
  channel_id: number;
  channelName: string; // Integration/channel name (first column)
  name: string;
  profileIdLabel: string | undefined; // customer_id, profileId, or advertiser_id
  customer_id_raw?: string; // Google: raw customer ID for sync status lookup
  country?: string; // countryCode for Amazon (from DB)
  currency?: string; // currency_code for Amazon (from DB)
  campaign: { status: EntityStatus; last_synced_at: string | null; error?: string | null };
  keywords: { status: EntityStatus; last_synced_at: string | null; error?: string | null };
  adgroups: { status: EntityStatus; last_synced_at: string | null; error?: string | null };
  lastSyncedAt: string | null;
  /** Amazon only: per-profile SP/SB/SD ad_types for each entity (from new API format) */
  campaignAdTypes?: { SP?: AdTypeSyncStatus; SB?: AdTypeSyncStatus; SD?: AdTypeSyncStatus };
  adgroupAdTypes?: { SP?: AdTypeSyncStatus; SB?: AdTypeSyncStatus; SD?: AdTypeSyncStatus };
  keywordAdTypes?: { SP?: AdTypeSyncStatus; SB?: AdTypeSyncStatus; SD?: AdTypeSyncStatus };
}

function formatLastSynced(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} h ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "—";
  }
}

const TickIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 13l4 4L19 7" />
  </svg>
);

const SyncingIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg
    className={`${className} animate-spin`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 11-6.219-8.56" />
  </svg>
);

const ErrorIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

function StatusBadge({ 
  status, 
  error 
}: { 
  status: EntityStatus;
  error?: string | null;
}) {
  // Show tick mark only for "completed" status
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
        <TickIcon className="w-3.5 h-3.5 flex-shrink-0" />
      </span>
    );
  }
  
  // Show error icon with tooltip if error status
  if (status === "error" && error) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="relative [&:hover>div]:block">
          <ErrorIcon className="w-3.5 h-3.5 flex-shrink-0 text-red-600 cursor-help" />
          <div className="absolute bottom-full left-0 mb-2 hidden z-50 pointer-events-none">
            <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap max-w-xs">
              {error}
              <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </span>
        <span className="text-xs text-[#556179] font-normal">Error</span>
      </span>
    );
  }
  
  // Show syncing icon with "Syncing" text for all other statuses
  return (
    <span className="inline-flex items-center gap-1.5">
      <SyncingIcon className="w-3.5 h-3.5 flex-shrink-0 text-[#136D6D]" />
      <span className="text-xs text-[#556179] font-normal">Syncing</span>
    </span>
  );
}

function SyncButton({
  profileId,
  profileType,
  accountId,
}: {
  profileId: number;
  profileType: Platform;
  accountId: number;
}) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSyncClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);
    setShowConfirmModal(false);

    try {
      await api.post(`/accounts/${accountId}/profiles/trigger-sync/`, {
        profile_id: profileId,
        profile_type: profileType,
      });
    } catch (e: unknown) {
      const errorMessage =
        (e as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to trigger sync";
      setError(errorMessage);
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
  };

  const platformName = profileType === "google" ? "Google" : profileType === "amazon" ? "Amazon" : "TikTok";

  return (
    <>
      <div className="flex flex-col items-start gap-1">
        <button
          onClick={handleSyncClick}
          disabled={isLoading}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            isLoading
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-[#136d6d] text-white hover:bg-[#0f5a5a]"
          }`}
        >
          Sync
        </button>
        {error && (
          <span className="text-[10px] text-red-600 text-left max-w-[80px]">
            {error}
          </span>
        )}
      </div>
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title="Confirm Sync"
        message={`Are you sure you want to sync this ${platformName} profile?`}
        description="This will trigger a sync operation that may take a few minutes to complete."
        confirmButtonLabel="Sync"
        cancelButtonLabel="Cancel"
        type="info"
        size="sm"
        isLoading={isLoading}
      />
    </>
  );
}

/** Amazon: show SP, SB (and SD for campaigns/adgroups; keywords have no SD) — tick + timestamp when completed, syncing icon otherwise */
function AmazonAdTypeStatus({
  adTypes,
  isLoading = false,
}: {
  adTypes?: {
    SP?: AdTypeSyncStatus;
    SB?: AdTypeSyncStatus;
    SD?: AdTypeSyncStatus;
  };
  isLoading?: boolean;
}) {
  // Show loading placeholders when data is being fetched
  if (isLoading) {
    const order = ["SP", "SB", "SD"] as const;
    return (
      <span className="flex flex-col gap-2 mt-0.5">
        {order.map((key) => (
          <div key={key} className="h-5 bg-gray-200 rounded animate-pulse" style={{ width: '100px' }} />
        ))}
      </span>
    );
  }
  
  const order = ["SP", "SB", "SD"] as const;
  const items = order
    .filter((k) => adTypes?.[k])
    .map((k) => {
      const a = adTypes![k]!;
      // Always use formatLastSynced to ensure "h ago" format (not "hours ago")
      const t = formatLastSynced(a.last_synced_at);
      const isCompleted = (a.status ?? "").toLowerCase() === "completed";
      const isError = (a.status ?? "").toLowerCase() === "error";
      return { key: k, time: t, isCompleted, isError, error: a.error };
    });
  if (items.length === 0) return null;
  return (
    <span className="flex flex-col gap-0.5 text-[13px] text-[#556179] font-normal mt-0.5">
      {items.map(({ key, time, isCompleted, isError, error }) => (
        <span key={key} className="inline-flex items-center gap-1">
          <span className="text-[13px] text-[#556179] font-normal">{key}:</span>
          {isCompleted ? (
            <>
              <TickIcon className="w-3 h-3 text-green-600 flex-shrink-0" />
              {time !== "—" && <span className="text-[13px] text-[#556179] font-normal">{time}</span>}
            </>
          ) : isError && error ? (
            <span className="inline-flex items-center gap-1">
              <span className="relative [&:hover>div]:block">
                <ErrorIcon className="w-3 h-3 flex-shrink-0 text-red-600 cursor-help" />
                <div className="absolute bottom-full left-0 mb-2 hidden z-50 pointer-events-none">
                  <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap max-w-xs">
                    {error}
                    <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </span>
              <span className="text-xs text-[#556179] font-normal">Error</span>
            </span>
          ) : (
            <>
              <SyncingIcon className="w-3 h-3 flex-shrink-0 text-[#136D6D]" />
              <span className="text-xs text-[#556179] font-normal">Syncing</span>
            </>
          )}
        </span>
      ))}
    </span>
  );
}

function buildProfileRowsFromResponse(
  data: GoogleSyncStatusResponse | PlatformSyncStatusResponse | null,
  platform: Platform
): ProfileRow[] {
  if (!data) return [];
  const byId = new Map<
    number,
    {
      name: string;
      profileIdLabel: string | undefined;
      campaign: { status: EntityStatus; last_synced_at: string | null; error?: string | null };
      keywords: { status: EntityStatus; last_synced_at: string | null; error?: string | null };
      adgroups: { status: EntityStatus; last_synced_at: string | null; error?: string | null };
    }
  >();

  const getProfileIdLabel = (p: ProfileSyncStatus) =>
    p.customer_id ?? p.profileId ?? p.advertiser_id;

  const upsert = (
    list: ProfileSyncStatus[] | undefined,
    key: "campaign" | "keywords" | "adgroups"
  ) => {
    (list ?? []).forEach((p) => {
      if (!byId.has(p.id)) {
        byId.set(p.id, {
          name: p.name,
          profileIdLabel: getProfileIdLabel(p),
          campaign: { status: "idle", last_synced_at: null, error: null },
          keywords: { status: "idle", last_synced_at: null, error: null },
          adgroups: { status: "idle", last_synced_at: null, error: null },
        });
      }
      const row = byId.get(p.id)!;
      (row as Record<string, unknown>)[key] = {
        status: (p.status as EntityStatus) ?? "idle",
        last_synced_at: p.last_synced_at ?? null,
        error: p.error ?? null,
      };
    });
  };

  upsert(data.campaigns?.profiles, "campaign");
  upsert(data.keywords?.profiles, "keywords");
  upsert(data.adgroups?.profiles, "adgroups");

  return Array.from(byId.entries()).map(([id, row]) => {
    const lastSyncs = [
      row.campaign.last_synced_at,
      row.keywords.last_synced_at,
      row.adgroups.last_synced_at,
    ].filter(Boolean) as string[];
    const lastSyncedAt =
      lastSyncs.length > 0
        ? lastSyncs.reduce((a, b) => (a > b ? a : b))
        : null;
    return {
      platform,
      id,
      channel_id: 0,
      channelName: "—",
      name: row.name,
      profileIdLabel: row.profileIdLabel,
      campaign: row.campaign,
      keywords: row.keywords,
      adgroups: row.adgroups,
      lastSyncedAt,
    };
  });
}

/** Profile item from GET /accounts/:accountId/profiles/ (all channels; each has channel_id, channel_name, channel_type) */
interface AccountProfileItem {
  channel_id: number;
  channel_name: string;
  channel_type: string;
  id: number;
  name?: string;
  profileId?: string;
  customer_id?: string;
  customer_id_raw?: string;
  advertiser_id?: string;
  advertiser_name?: string;
  countryCode?: string;
  currency_code?: string;
  currency?: string;
}

function buildProfileRowsFromAccountProfiles(
  profiles: AccountProfileItem[]
): ProfileRow[] {
  const idle = { status: "idle" as EntityStatus, last_synced_at: null, error: null };
  return (profiles ?? []).map((p) => {
    const platform = (p.channel_type === "google"
      ? "google"
      : p.channel_type === "tiktok"
        ? "tiktok"
        : "amazon") as Platform;
    const name =
      p.name ?? p.advertiser_name ?? "";
    const profileIdLabel =
      p.profileId ?? p.customer_id ?? p.advertiser_id ?? undefined;
    const country = p.countryCode ?? "";
    const currency = p.currency_code ?? p.currency ?? "";
    const customerIdRaw =
      p.customer_id_raw ??
      (platform === "google" && p.customer_id
        ? p.customer_id.replace(/-/g, "")
        : undefined);
    return {
      platform,
      id: p.id,
      channel_id: p.channel_id,
      channelName: p.channel_name ?? p.channel_type ?? "—",
      name,
      profileIdLabel,
      customer_id_raw: customerIdRaw,
      country,
      currency,
      campaign: idle,
      keywords: idle,
      adgroups: idle,
      lastSyncedAt: null,
    };
  });
}

/** Merge sync status into profile rows by matching profile id */
function mergeSyncStatusIntoRows(
  rows: ProfileRow[],
  syncData: GoogleSyncStatusResponse | PlatformSyncStatusResponse | null,
  platform: Platform
): ProfileRow[] {
  if (!syncData || rows.length === 0) return rows;
  const byId = new Map(
    rows.map((r) => [
      r.id,
      {
        ...r,
        campaign: { ...r.campaign },
        keywords: { ...r.keywords },
        adgroups: { ...r.adgroups },
      },
    ])
  );
  const upsert = (
    list: ProfileSyncStatus[] | undefined,
    key: "campaign" | "keywords" | "adgroups"
  ) => {
    (list ?? []).forEach((p) => {
      const row = byId.get(p.id);
      if (row) {
      (row as Record<string, unknown>)[key] = {
        status: (p.status as EntityStatus) ?? "idle",
        last_synced_at: p.last_synced_at ?? null,
        error: p.error ?? null,
      };
      }
    });
  };
  upsert(syncData.campaigns?.profiles, "campaign");
  upsert(syncData.keywords?.profiles, "keywords");
  upsert(syncData.adgroups?.profiles, "adgroups");
  return Array.from(byId.values()).map((row) => {
    const lastSyncs = [
      row.campaign.last_synced_at,
      row.keywords.last_synced_at,
      row.adgroups.last_synced_at,
    ].filter(Boolean) as string[];
    const lastSyncedAt =
      lastSyncs.length > 0
        ? lastSyncs.reduce((a, b) => (a > b ? a : b))
        : null;
    return { ...row, lastSyncedAt };
  });
}

export const AccountProfiles: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { accounts } = useAccounts();
  const { sidebarWidth } = useSidebar();
  const accountIdNum = accountId ? parseInt(accountId, 10) : undefined;
  const account = accountIdNum
    ? accounts.find((a) => a.id === accountIdNum)
    : null;

  const [allProfiles, setAllProfiles] = useState<AccountProfileItem[]>([]);
  const [entitySyncData, setEntitySyncData] = useState<import("../services/accountsSyncStatus").EntitySyncStatusResponseNew | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatusLoading, setSyncStatusLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [selectedIntegrationChannelId, setSelectedIntegrationChannelId] =
    useState<number | "all">("all");

  const integrationsList = useMemo(() => {
    const seen = new Set<number>();
    const list: { channel_id: number; channel_name: string }[] = [];
    (allProfiles ?? []).forEach((p) => {
      if (!seen.has(p.channel_id)) {
        seen.add(p.channel_id);
        list.push({
          channel_id: p.channel_id,
          channel_name: p.channel_name ?? p.channel_type ?? "—",
        });
      }
    });
    return list.sort((a, b) =>
      a.channel_name.localeCompare(b.channel_name)
    );
  }, [allProfiles]);

  const profileRows = useMemo(() => {
    const rows = buildProfileRowsFromAccountProfiles(allProfiles);
    if (!entitySyncData) {
      return rows;
    }
    const legacy = transformEntitySyncStatusToLegacy(entitySyncData, rows);
    const googleRows = mergeSyncStatusIntoRows(
      rows.filter((r) => r.platform === "google"),
      legacy.google ?? null,
      "google"
    );
    let amazonRows = mergeSyncStatusIntoRows(
      rows.filter((r) => r.platform === "amazon"),
      legacy.amazon ?? null,
      "amazon"
    );
    amazonRows = amazonRows.map((row) => {
      const { campaignAdTypes, adgroupAdTypes, keywordAdTypes } = getPerProfileAmazonAdTypes(
        entitySyncData,
        row
      );
      return { ...row, campaignAdTypes, adgroupAdTypes, keywordAdTypes };
    });
    const tiktokRows = mergeSyncStatusIntoRows(
      rows.filter((r) => r.platform === "tiktok"),
      legacy.tiktok ?? null,
      "tiktok"
    );
    return [...googleRows, ...amazonRows, ...tiktokRows];
  }, [allProfiles, entitySyncData]);

  const filteredProfileRows = useMemo(() => {
    if (selectedIntegrationChannelId === "all") return profileRows;
    return profileRows.filter(
      (row) => row.channel_id === selectedIntegrationChannelId
    );
  }, [profileRows, selectedIntegrationChannelId]);

  useEffect(() => {
    setPageTitle("Profiles");
    return () => resetPageTitle();
  }, []);

  useEffect(() => {
    if (!accountIdNum) {
      navigate("/brands");
      return;
    }
  }, [accountIdNum, navigate]);

  // Step 1: Fetch all profiles for the account and display them
  // Step 2: Once displayed, pull latest sync status and merge into rows
  useEffect(() => {
    if (!accountIdNum) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setSyncStatusLoading(false);
    setSyncError(null);
    setAllProfiles([]);
    setEntitySyncData(null);

    const loadAllProfiles = async () => {
      try {
        const res = await accountsService.getAccountProfiles(accountIdNum);
        if (cancelled) return;
        if (res?.profiles && Array.isArray(res.profiles)) {
          setAllProfiles(res.profiles);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setSyncError(
            (e as { response?: { data?: { error?: string } } })?.response?.data
              ?.error || "Failed to load profiles"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }

      // Step 2: After profiles are displayed, fetch latest sync status (single endpoint)
      if (cancelled) return;
      setSyncStatusLoading(true);
      accountsSyncStatusService
        .getEntitySyncStatus(accountIdNum)
        .then((res) => {
          if (cancelled) return;
          setEntitySyncData(res);
        })
        .catch((e: unknown) => {
          if (!cancelled) {
            setSyncError(
              (e as { response?: { data?: { error?: string } } })?.response
                ?.data?.error || "Failed to load sync status"
            );
          }
        })
        .finally(() => {
          if (!cancelled) setSyncStatusLoading(false);
        });
    };

    loadAllProfiles();
    return () => {
      cancelled = true;
    };
  }, [accountIdNum]);

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
        <DashboardHeader />
        <div className="p-8 bg-white">

          {syncError && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-[12px] bg-red-50 border border-red-100 text-red-800 text-sm">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{syncError}</span>
            </div>
          )}

          {/* Title left, Integration filter right */}
          <div className="flex items-center justify-between gap-2 mb-4 relative ">
            <h1 className="text-[22px] sm:text-[24px] font-medium text-[#072929] leading-[normal]">
              {"Profiles"}
            </h1>
            <div className="search-input-container flex items-center gap-2 h-[40px] min-w-[200px] px-3">
              <label
                htmlFor="profiles-integration-filter"
                className="text-[14px] text-[#556179] font-normal whitespace-nowrap"
              >
                Integration
              </label>
              <select
                id="profiles-integration-filter"
                value={
                  selectedIntegrationChannelId === "all"
                    ? "all"
                    : selectedIntegrationChannelId
                }
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedIntegrationChannelId(
                    v === "all" ? "all" : parseInt(v, 10)
                  );
                }}
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-[14px] text-[#072929] font-['GT_America_Trial'] font-normal cursor-pointer"
              >
                <option value="all">All</option>
                {integrationsList.map(({ channel_id, channel_name }) => (
                  <option key={channel_id} value={channel_id}>
                    {channel_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            className="table-container"
            style={{
              position: "relative",
              minHeight: loading ? "400px" : "auto",
            }}
          >
            <div className="overflow-x-auto w-full">
              {filteredProfileRows.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center h-[400px] w-full py-12 px-6">
                  <div className="flex flex-col items-center justify-center max-w-md">
                    <div className="mb-6 w-20 h-20 rounded-full bg-[#F5F5F0] flex items-center justify-center">
                      <svg
                        className="w-10 h-10 text-[#556179]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-teal-950 mb-2">
                      No Profiles Found
                    </h3>
                    <p className="text-sm text-[#556179] text-center leading-relaxed">
                      {profileRows.length === 0
                        ? "There are no profiles for this account yet. Connect Google, Amazon, or TikTok in Integrations and select profiles to see them here."
                        : "No profiles match the selected integration. Choose \"All\" to see every profile."}
                    </p>
                    {profileRows.length === 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/brands/${accountIdNum}/integrations`)
                        }
                        className="mt-4 text-sm font-medium text-[#136d6d] hover:underline"
                      >
                        Go to Integrations
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <table className="min-w-[900px] w-full">
                  <thead>
                    <tr className="border-b border-[#e8e8e3] bg-[#f5f5f0]">
                      <th className="table-header min-w-[140px] sticky left-0 z-[1] bg-[#f5f5f0] border-r border-[#e8e8e3]">
                        Integration
                      </th>
                      <th className="table-header min-w-[200px]">
                        Profile name
                      </th>
                      <th className="table-header min-w-[100px]">Country</th>
                      <th className="table-header min-w-[80px]">Currency</th>
                      <th className="table-header min-w-[120px] align-top">Campaigns</th>
                      <th className="table-header min-w-[120px] align-top">Ad Groups</th>
                      <th className="table-header min-w-[120px] align-top">Keywords</th>
                      <th className="table-header min-w-[100px] text-left">Sync</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={`skeleton-${i}`} className="table-row">
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-28" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-40" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-16" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-12" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-20" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-20" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-20" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-16" />
                          </td>
                        </tr>
                      ))
                    ) : (
                      filteredProfileRows.map((row) => (
                        <tr
                          key={`${row.platform}-${row.id}`}
                          className="table-row group"
                        >
                          <td className="table-cell sticky left-0 z-[120] bg-[#f5f5f0] group-hover:bg-gray-100 border-r border-[#e8e8e3]">
                            <span className="table-text leading-[1.26] text-[#556179]">
                              {row.channelName}
                            </span>
                          </td>
                          <td className="table-cell min-w-[200px] group-hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                              {row.platform === "google" && (
                                <img
                                  src={GoogleIcon}
                                  alt="Google"
                                  className="w-5 h-5 flex-shrink-0"
                                />
                              )}
                              {row.platform === "amazon" && (
                                <img
                                  src={AmazonIcon}
                                  alt="Amazon"
                                  className="w-5 h-5 flex-shrink-0"
                                />
                              )}
                              {row.platform === "tiktok" && (
                                <svg
                                  className="w-5 h-5 flex-shrink-0"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                  aria-hidden
                                >
                                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                </svg>
                              )}
                              <span className="table-text text-[#556179]">
                                {row.name ||
                                  row.profileIdLabel ||
                                  `Profile ${row.id}`}
                              </span>
                              {row.profileIdLabel && (
                                <span className="table-text leading-[1.26] text-[#556179] text-sm">
                                  ({row.profileIdLabel})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="table-cell min-w-[100px]">
                            <span className="table-text leading-[1.26] whitespace-nowrap">
                              {row.country ?? "—"}
                            </span>
                          </td>
                          <td className="table-cell min-w-[80px]">
                            <span className="table-text leading-[1.26] whitespace-nowrap">
                              {row.currency ?? "—"}
                            </span>
                          </td>
                          <td className="table-cell min-w-[120px] align-top">
                            <div className="flex flex-col gap-0.5">
                              {syncStatusLoading ? (
                                row.platform === "amazon" ? (
                                  <AmazonAdTypeStatus isLoading={true} />
                                ) : (
                                  <div className="h-5 bg-gray-200 rounded animate-pulse" style={{ width: '100px' }} />
                                )
                              ) : (
                                <>
                                  {row.platform === "amazon" ? (
                                    <AmazonAdTypeStatus
                                      adTypes={row.campaignAdTypes}
                                    />
                                  ) : (
                                    <div className="inline-flex items-center gap-1.5">
                                      <StatusBadge status={row.campaign.status} error={row.campaign.error} />
                                      {row.campaign.status === "completed" && (
                                        <span className="table-text leading-[1.26] text-[13px] text-[#556179] font-normal">
                                          {formatLastSynced(row.campaign.last_synced_at)}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="table-cell min-w-[120px] align-top">
                            <div className="flex flex-col gap-0.5">
                              {syncStatusLoading ? (
                                row.platform === "amazon" ? (
                                  <AmazonAdTypeStatus isLoading={true} />
                                ) : (
                                  <div className="h-5 bg-gray-200 rounded animate-pulse" style={{ width: '100px' }} />
                                )
                              ) : (
                                <>
                                  {row.platform === "amazon" ? (
                                    <AmazonAdTypeStatus
                                      adTypes={row.adgroupAdTypes}
                                    />
                                  ) : (
                                    <div className="inline-flex items-center gap-1.5">
                                      <StatusBadge status={row.adgroups.status} error={row.adgroups.error} />
                                      {row.adgroups.status === "completed" && (
                                        <span className="table-text leading-[1.26] text-[13px] text-[#556179] font-normal">
                                          {formatLastSynced(row.adgroups.last_synced_at)}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="table-cell min-w-[120px] align-top">
                            {row.platform === "tiktok" ? (
                              <span className="table-text leading-[1.26] text-[#556179]">—</span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                {syncStatusLoading ? (
                                  row.platform === "amazon" ? (
                                    <AmazonAdTypeStatus isLoading={true} />
                                  ) : (
                                    <div className="h-5 bg-gray-200 rounded animate-pulse" style={{ width: '100px' }} />
                                  )
                                ) : (
                                  <>
                                    {row.platform === "amazon" ? (
                                      <AmazonAdTypeStatus
                                        adTypes={row.keywordAdTypes}
                                      />
                                    ) : (
                                      <div className="inline-flex items-center gap-1.5">
                                        <StatusBadge status={row.keywords.status} error={row.keywords.error} />
                                        {row.keywords.status === "completed" && (
                                          <span className="table-text leading-[1.26] text-[13px] text-[#556179] font-normal">
                                            {formatLastSynced(row.keywords.last_synced_at)}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="table-cell min-w-[100px] text-left">
                            <SyncButton
                              profileId={row.id}
                              profileType={row.platform}
                              accountId={accountIdNum!}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
