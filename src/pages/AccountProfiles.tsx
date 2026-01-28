import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccounts } from "../contexts/AccountsContext";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { Loader } from "../components/ui/Loader";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import { accountsSyncStatusService } from "../services/accountsSyncStatus";
import { accountsService } from "../services/accounts";
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
  country?: string; // countryCode for Amazon (from DB)
  currency?: string; // currency_code for Amazon (from DB)
  campaign: { status: EntityStatus; last_synced_at: string | null };
  keywords: { status: EntityStatus; last_synced_at: string | null };
  adgroups: { status: EntityStatus; last_synced_at: string | null };
  lastSyncedAt: string | null;
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

function StatusBadge({ status }: { status: EntityStatus }) {
  const className =
    status === "syncing"
      ? "bg-blue-100 text-blue-800"
      : status === "completed"
        ? "bg-green-100 text-green-800"
        : status === "error"
          ? "bg-red-100 text-red-800"
          : "bg-gray-100 text-gray-600";
  const label =
    status === "syncing"
      ? "Syncing"
      : status === "error"
        ? "Error"
        : status === "idle"
          ? "Idle"
          : null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${className}`}
    >
      {status === "completed" ? (
        <TickIcon className="w-3.5 h-3.5 flex-shrink-0" />
      ) : (
        label
      )}
    </span>
  );
}

/** Amazon: show SP, SB (and SD for campaigns/adgroups; keywords have no SD) — tick + timestamp when completed */
function AmazonAdTypeStatus({
  adTypes,
}: {
  adTypes?: {
    SP?: AdTypeSyncStatus;
    SB?: AdTypeSyncStatus;
    SD?: AdTypeSyncStatus;
  };
}) {
  const order = ["SP", "SB", "SD"] as const;
  const items = order
    .filter((k) => adTypes?.[k])
    .map((k) => {
      const a = adTypes![k]!;
      const t =
        a.last_synced_before ?? formatLastSynced(a.last_synced_at);
      const isCompleted = (a.status ?? "").toLowerCase() === "completed";
      return { key: k, time: t, isCompleted };
    });
  if (items.length === 0) return null;
  return (
    <span className="flex flex-col gap-0.5 text-[12px] text-[#556179] mt-0.5">
      {items.map(({ key, time, isCompleted }) => (
        <span key={key} className="inline-flex items-center gap-1">
          <span className="text-[#556179]">{key}:</span>
          {isCompleted ? (
            <>
              <TickIcon className="w-3 h-3 text-green-600 flex-shrink-0" />
              {time !== "—" && <span>{time}</span>}
            </>
          ) : (
            <span>{time !== "—" ? time : "—"}</span>
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
      campaign: { status: EntityStatus; last_synced_at: string | null };
      keywords: { status: EntityStatus; last_synced_at: string | null };
      adgroups: { status: EntityStatus; last_synced_at: string | null };
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
          campaign: { status: "idle", last_synced_at: null },
          keywords: { status: "idle", last_synced_at: null },
          adgroups: { status: "idle", last_synced_at: null },
        });
      }
      const row = byId.get(p.id)!;
      (row as Record<string, unknown>)[key] = {
        status: (p.status as EntityStatus) ?? "idle",
        last_synced_at: p.last_synced_at ?? null,
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
  advertiser_id?: string;
  advertiser_name?: string;
  countryCode?: string;
  currency_code?: string;
  currency?: string;
}

function buildProfileRowsFromAccountProfiles(
  profiles: AccountProfileItem[]
): ProfileRow[] {
  const idle = { status: "idle" as EntityStatus, last_synced_at: null };
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
    return {
      platform,
      id: p.id,
      channel_id: p.channel_id,
      channelName: p.channel_name ?? p.channel_type ?? "—",
      name,
      profileIdLabel,
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
  const [googleSyncData, setGoogleSyncData] =
    useState<GoogleSyncStatusResponse | null>(null);
  const [amazonSyncData, setAmazonSyncData] =
    useState<PlatformSyncStatusResponse | null>(null);
  const [tiktokSyncData, setTiktokSyncData] =
    useState<PlatformSyncStatusResponse | null>(null);
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
    const googleRows = mergeSyncStatusIntoRows(
      rows.filter((r) => r.platform === "google"),
      googleSyncData,
      "google"
    );
    const amazonRows = mergeSyncStatusIntoRows(
      rows.filter((r) => r.platform === "amazon"),
      amazonSyncData,
      "amazon"
    );
    const tiktokRows = mergeSyncStatusIntoRows(
      rows.filter((r) => r.platform === "tiktok"),
      tiktokSyncData,
      "tiktok"
    );
    return [...googleRows, ...amazonRows, ...tiktokRows];
  }, [
    allProfiles,
    googleSyncData,
    amazonSyncData,
    tiktokSyncData,
  ]);

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
    setGoogleSyncData(null);
    setAmazonSyncData(null);
    setTiktokSyncData(null);

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
          setGoogleSyncData(res.google ?? null);
          setAmazonSyncData(res.amazon ?? null);
          setTiktokSyncData(res.tiktok ?? null);
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
                      <th className="table-header min-w-[120px]">Campaign</th>
                      <th className="table-header min-w-[120px]">Keywords</th>
                      <th className="table-header min-w-[120px]">Ad groups</th>
                      <th className="table-header min-w-[140px]">Last synced</th>
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
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-24" />
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
                            <span className="table-text leading-[1.26]">
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
                              <span className="table-text ">
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
                          <td className="table-cell min-w-[120px]">
                            <div className="flex flex-col gap-0.5">
                              {syncStatusLoading ? (
                                <Loader
                                  size="sm"
                                  showMessage={false}
                                  className="gap-0"
                                />
                              ) : (
                                <>
                                  <div className="inline-flex items-center gap-1.5">
                                    <StatusBadge status={row.campaign.status} />
                                    <span className="table-text leading-[1.26] text-[13px] text-[#556179]">
                                      {formatLastSynced(row.campaign.last_synced_at)}
                                    </span>
                                  </div>
                                  {row.platform === "amazon" && (
                                    <AmazonAdTypeStatus
                                      adTypes={amazonSyncData?.campaigns?.ad_types}
                                    />
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="table-cell min-w-[120px]">
                            <div className="flex flex-col gap-0.5">
                              {syncStatusLoading ? (
                                <Loader
                                  size="sm"
                                  showMessage={false}
                                  className="gap-0"
                                />
                              ) : (
                                <>
                                  <div className="inline-flex items-center gap-1.5">
                                    <StatusBadge status={row.keywords.status} />
                                    <span className="table-text leading-[1.26] text-[13px] text-[#556179]">
                                      {formatLastSynced(row.keywords.last_synced_at)}
                                    </span>
                                  </div>
                                  {row.platform === "amazon" && (
                                    <AmazonAdTypeStatus
                                      adTypes={amazonSyncData?.keywords?.ad_types}
                                    />
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="table-cell min-w-[120px]">
                            <div className="flex flex-col gap-0.5">
                              {syncStatusLoading ? (
                                <Loader
                                  size="sm"
                                  showMessage={false}
                                  className="gap-0"
                                />
                              ) : (
                                <>
                                  <div className="inline-flex items-center gap-1.5">
                                    <StatusBadge status={row.adgroups.status} />
                                    <span className="table-text leading-[1.26] text-[13px] text-[#556179]">
                                      {formatLastSynced(row.adgroups.last_synced_at)}
                                    </span>
                                  </div>
                                  {row.platform === "amazon" && (
                                    <AmazonAdTypeStatus
                                      adTypes={amazonSyncData?.adgroups?.ad_types}
                                    />
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="table-cell min-w-[140px]">
                            {syncStatusLoading ? (
                              <Loader
                                size="sm"
                                showMessage={false}
                                className="gap-0"
                              />
                            ) : (
                              <span className="table-text leading-[1.26] whitespace-nowrap text-[#0b0f16]">
                                {formatLastSynced(row.lastSyncedAt)}
                              </span>
                            )}
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
