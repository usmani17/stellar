import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccounts } from "../contexts/AccountsContext";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import { googleAdwordsSyncStatusService } from "../services/googleAdwords/googleAdwordsSyncStatus";
import { accountsSyncStatusService } from "../services/accountsSyncStatus";
import { accountsService } from "../services/accounts";
import type {
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

function StatusBadge({ status }: { status: EntityStatus }) {
  const label =
    status === "syncing"
      ? "Syncing"
      : status === "completed"
        ? "Completed"
        : status === "error"
          ? "Error"
          : "Idle";
  const className =
    status === "syncing"
      ? "bg-blue-100 text-blue-800"
      : status === "completed"
        ? "bg-green-100 text-green-800"
        : status === "error"
          ? "bg-red-100 text-red-800"
          : "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}
    >
      {label}
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
      name: row.name,
      profileIdLabel: row.profileIdLabel,
      campaign: row.campaign,
      keywords: row.keywords,
      adgroups: row.adgroups,
      lastSyncedAt,
    };
  });
}

/** Amazon profile from our DB (GET /accounts/channels/:channelId/profiles/) - no Amazon API */
interface AmazonProfileFromDb {
  id: number;
  profileId: string;
  name: string;
  countryCode?: string;
  currency_code?: string;
  is_selected?: boolean;
}

function buildAmazonProfileRows(profiles: AmazonProfileFromDb[]): ProfileRow[] {
  const idle = { status: "idle" as EntityStatus, last_synced_at: null };
  return profiles.map((p) => ({
    platform: "amazon" as Platform,
    id: p.id,
    name: p.name,
    profileIdLabel: p.profileId,
    country: p.countryCode ?? "",
    currency: p.currency_code ?? "",
    campaign: idle,
    keywords: idle,
    adgroups: idle,
    lastSyncedAt: null,
  }));
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

  const [googleData, setGoogleData] =
    useState<GoogleSyncStatusResponse | null>(null);
  const [amazonProfiles, setAmazonProfiles] = useState<AmazonProfileFromDb[]>(
    []
  );
  const [tiktokData, setTiktokData] =
    useState<PlatformSyncStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  const profileRows = useMemo(() => {
    const googleRows = buildProfileRowsFromResponse(googleData, "google");
    const amazonRows = buildAmazonProfileRows(amazonProfiles);
    const tiktokRows = buildProfileRowsFromResponse(tiktokData, "tiktok");
    return [...googleRows, ...amazonRows, ...tiktokRows];
  }, [googleData, amazonProfiles, tiktokData]);

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

  useEffect(() => {
    if (!accountIdNum) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setSyncError(null);
    setGoogleData(null);
    setAmazonProfiles([]);
    setTiktokData(null);

    const loadAmazonProfilesForChannel = async () => {
      const channels = await accountsService.getAccountChannels(accountIdNum);
      const amazonChannel = channels.find(
        (c) => c.channel_type === "amazon"
      );
      if (!amazonChannel || cancelled) return;
      const res = await accountsService.getAmazonProfiles(amazonChannel.id);
      if (!cancelled && res?.profiles) {
        setAmazonProfiles(res.profiles);
      }
    };

    Promise.allSettled([
      googleAdwordsSyncStatusService
        .getGoogleSyncStatus(accountIdNum)
        .then((d) => (!cancelled ? setGoogleData(d) : undefined)),
      loadAmazonProfilesForChannel(),
      accountsSyncStatusService
        .getTikTokSyncStatus(accountIdNum)
        .then((d) => (!cancelled ? setTiktokData(d) : undefined)),
    ])
      .then((results) => {
        if (cancelled) return;
        const err = results.find((r) => r.status === "rejected");
        if (err && err.status === "rejected") {
          setSyncError(
            (err.reason?.response?.data?.error as string) ||
              "Failed to load profiles"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
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
          <h1 className="text-[22px] sm:text-[24px] font-medium text-[#072929] leading-[normal] mb-6">
            {account ? `${account.name} – Profiles` : "Profiles"}
          </h1>

          {syncError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-800 text-sm">
              {syncError}
            </div>
          )}

          <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header min-w-[180px]">Profile name</th>
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
                ) : profileRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="table-cell text-center py-12 text-[#556179]"
                    >
                      <p className="text-[14px] mb-1">
                        No profiles found for this account.
                      </p>
                      <p className="text-[13px]">
                        Connect Google, Amazon, or TikTok integrations and
                        select profiles in{" "}
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/brands/${accountIdNum}/integrations`)
                          }
                          className="text-[#136d6d] hover:underline"
                        >
                          Integrations
                        </button>
                        .
                      </p>
                    </td>
                  </tr>
                ) : (
                  profileRows.map((row) => (
                    <tr
                      key={`${row.platform}-${row.id}`}
                      className="table-row group"
                    >
                      <td className="table-cell">
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
                          <span className="text-[#0b0f16] font-medium">
                            {row.name ||
                              row.profileIdLabel ||
                              `Profile ${row.id}`}
                          </span>
                          {row.profileIdLabel && (
                            <span className="text-[#556179] text-sm">
                              ({row.profileIdLabel})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="table-cell text-[#0b0f16]">
                        {row.country ?? "—"}
                      </td>
                      <td className="table-cell text-[#0b0f16]">
                        {row.currency ?? "—"}
                      </td>
                      <td className="table-cell">
                        <div className="flex flex-col gap-0.5">
                          <StatusBadge status={row.campaign.status} />
                          <span className="text-[13px] text-[#556179]">
                            {formatLastSynced(row.campaign.last_synced_at)}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex flex-col gap-0.5">
                          <StatusBadge status={row.keywords.status} />
                          <span className="text-[13px] text-[#556179]">
                            {formatLastSynced(row.keywords.last_synced_at)}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex flex-col gap-0.5">
                          <StatusBadge status={row.adgroups.status} />
                          <span className="text-[13px] text-[#556179]">
                            {formatLastSynced(row.adgroups.last_synced_at)}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="text-[14px] text-[#0b0f16]">
                          {formatLastSynced(row.lastSyncedAt)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
