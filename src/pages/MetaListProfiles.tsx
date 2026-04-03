import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { accountsService } from "../services/accounts";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { Button } from "../components/ui";
import { X } from "lucide-react";

interface MetaProfile {
  id?: string;
  account_id?: string;
  profileId?: string;
  profile_id?: string;
  name?: string;
  business_name?: string;
  currency?: string;
  timezone_name?: string;
  amount_spent?: string;
  balance?: string;
  created_time?: string;
  is_selected?: boolean;
}

export const MetaListProfiles: React.FC = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();
  const [profiles, setProfiles] = useState<MetaProfile[]>([]);
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [excludedProfiles, setExcludedProfiles] = useState<
    Array<{
      profileId: string;
      account_id?: string;
      name: string;
      channel_id: number;
      channel_name: string;
      account_name: string;
    }>
  >([]);

  useEffect(() => {
    if (channelId) {
      loadAccountId();
      loadProfiles(false);
    }
  }, [channelId]);

  const loadAccountId = async () => {
    if (!channelId) return;

    try {
      const accounts = await accountsService.getAccounts();
      for (const account of accounts) {
        const channels = await accountsService.getAccountChannels(account.id);
        const channel = channels.find((ch) => ch.id === parseInt(channelId, 10));
        if (channel) {
          setAccountId(account.id);
          return;
        }
      }
    } catch (err) {
      console.error("Failed to load accountId:", err);
    }
  };

  const loadProfiles = async (isRefresh = false) => {
    if (!channelId) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Backend always calls Meta Graph /me/adaccounts and merges DB is_selected (Google-style).
      const response = await accountsService.fetchMetaProfiles(
        parseInt(channelId),
        { debugMeta: import.meta.env.DEV }
      );

      if (import.meta.env.DEV) {
        console.log("[MetaListProfiles] API response:", response);
      }

      const metaProfiles = Array.isArray(response)
        ? response
        : response.profiles || [];
      const excluded = Array.isArray(response)
        ? []
        : response.excluded_profiles || [];

      if (metaProfiles.length === 0 && excluded.length === 0) {
        setError(
          "No Meta ad accounts returned for this connection. Check the Meta channel token and permissions."
        );
        setProfiles([]);
        setSelectedProfileIds(new Set());
        setExcludedProfiles([]);
        return;
      }

      setExcludedProfiles(excluded);

      const selectedIds = new Set<string>();
      metaProfiles.forEach((profile: MetaProfile) => {
        if (profile.is_selected) {
          const profileId =
            profile.account_id || profile.profileId || profile.profile_id || profile.id;
          if (profileId) {
            selectedIds.add(String(profileId));
          }
        }
      });

      setProfiles(metaProfiles);
      setSelectedProfileIds(selectedIds);
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      console.error("[MetaListProfiles] fetchMetaProfiles failed:", {
        status,
        data,
        message: err.message,
        full: err,
      });
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.response?.data?.detail ||
          (typeof data === "string" ? data : null) ||
          "Failed to fetch profiles from Meta. Please try again."
      );
      setProfiles([]);
      setSelectedProfileIds(new Set());
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const getProfileId = (profile: MetaProfile): string => {
    const id =
      profile.account_id || profile.profileId || profile.profile_id || profile.id;
    return id ? String(id) : "";
  };

  const getProfileName = (profile: MetaProfile): string => {
    return profile.name || profile.business_name || "Unnamed Profile";
  };

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const name = getProfileName(p).toLowerCase();
      const id = getProfileId(p).toLowerCase();
      const biz = (p.business_name || "").toLowerCase();
      return name.includes(q) || id.includes(q) || biz.includes(q);
    });
  }, [profiles, searchQuery]);

  const selectedInViewCount = useMemo(
    () =>
      filteredProfiles.filter((p) =>
        selectedProfileIds.has(getProfileId(p))
      ).length,
    [filteredProfiles, selectedProfileIds]
  );

  const totalSelectedCount = selectedProfileIds.size;

  const toggleProfile = (profileId: string) => {
    const newSelected = new Set(selectedProfileIds);
    if (newSelected.has(profileId)) {
      newSelected.delete(profileId);
    } else {
      newSelected.add(profileId);
    }
    setSelectedProfileIds(newSelected);
  };

  const toggleAll = () => {
    const ids = filteredProfiles.map(getProfileId).filter(Boolean);
    const allSelected =
      ids.length > 0 && ids.every((id) => selectedProfileIds.has(id));
    const next = new Set(selectedProfileIds);
    if (allSelected) {
      ids.forEach((id) => next.delete(id));
    } else {
      ids.forEach((id) => next.add(id));
    }
    setSelectedProfileIds(next);
  };

  const handleSave = async () => {
    if (!channelId) return;

    try {
      setSaving(true);
      setError(null);

      const selectedProfiles = profiles.filter((profile) => {
        const profileId =
          profile.account_id || profile.profileId || profile.profile_id || profile.id;
        return profileId && selectedProfileIds.has(String(profileId));
      });

      const profilesToSave = selectedProfiles.map((profile) => {
        const profileId =
          profile.account_id ||
          profile.profileId ||
          profile.profile_id ||
          profile.id ||
          "";
        const profileName = getProfileName(profile);

        return {
          account_id: profileId,
          profileId: profileId,
          profile_id: profileId,
          id: profileId,
          name: profileName,
          business_name: profile.business_name || "",
          currency: profile.currency || "",
          timezone_name: profile.timezone_name || "",
        };
      });

      const result = await accountsService.saveMetaProfiles(
        parseInt(channelId),
        Array.from(selectedProfileIds),
        profilesToSave
      );

      if (result && result.message) {
        localStorage.setItem(
          "profiles_saved_success",
          JSON.stringify({
            message: result.message,
            type: "success",
            total_saved: result.total_saved,
          })
        );

        navigate(
          accountId != null
            ? `/brands/${accountId}/integrations`
            : "/brands",
          { replace: true }
        );
      } else {
        setError("Profiles saved but no confirmation received");
      }
    } catch (err: any) {
      console.error("Failed to save Meta profiles:", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to save profiles. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const cancelToIntegrations = () => {
    navigate(
      accountId != null
        ? `/brands/${accountId}/integrations`
        : "/brands"
    );
  };

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />

      <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
        <DashboardHeader />

        <div className="px-8 pb-8 pt-24 sm:pt-28 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[24px] font-medium text-[#072929] mb-2">
                  Meta Profiles
                </h1>
                <p className="text-[14px] text-[#556179]">
                  Choose which Meta ad accounts you want to connect.
                </p>
              </div>
              <Button
                onClick={() => loadProfiles(true)}
                disabled={refreshing || loading}
                variant="outline"
                size="sm"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-[14px]">
                {error}
              </div>
            )}

            {excludedProfiles.length > 0 && (
              <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-amber-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-[14px] font-medium text-amber-800 mb-2">
                      Some profiles are already connected to other channels
                    </h3>
                    <p className="text-[13px] text-amber-700 mb-2">
                      The following {excludedProfiles.length} profile
                      {excludedProfiles.length > 1 ? "s are" : " is"} already
                      connected to another channel. To connect them to this
                      channel, you first need to unselect them from the
                      original channel.
                    </p>
                    <div className="mt-3 space-y-2">
                      {excludedProfiles.map((excluded) => (
                        <div
                          key={excluded.profileId}
                          className="text-[13px] text-amber-700 bg-amber-100 px-3 py-2 rounded border border-amber-200"
                        >
                          <span className="font-medium">
                            {excluded.name || `Profile ${excluded.profileId}`}
                          </span>{" "}
                          is connected to{" "}
                          <span className="font-medium">
                            {excluded.channel_name}
                          </span>{" "}
                          ({excluded.account_name})
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {loading || refreshing ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#072929] mx-auto mb-4"></div>
                <p className="text-[16px] text-[#072929]">
                  {refreshing
                    ? "Refreshing profiles from Meta..."
                    : "Loading profiles..."}
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 relative">
                  <input
                    type="text"
                    placeholder="Search profiles by name or account ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-[#E8E8E3] rounded-lg focus:ring-2 focus:ring-[#072929] focus:border-[#072929] text-[14px] outline-none"
                    aria-label="Search profiles by name or account ID"
                  />
                  {searchQuery.trim() ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[#556179] hover:bg-gray-100 hover:text-[#072929] transition-colors"
                      aria-label="Clear search"
                      title="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>

                {filteredProfiles.length === 0 ? (
                  <div className="text-center py-12 bg-[#FEFEFB] border border-[#E8E8E3] rounded-2xl">
                    <p className="text-[14px] text-[#556179] mb-4">
                      {searchQuery.trim()
                        ? "No profiles match your search. Try a different search term."
                        : "No profiles found. Please check your Meta account connection."}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex items-center justify-between flex-wrap gap-3 py-3 px-4 rounded-xl bg-[#F5F5F5] border border-[#E8E8E3]">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={
                              filteredProfiles.length > 0 &&
                              selectedInViewCount === filteredProfiles.length
                            }
                            onChange={toggleAll}
                            className="w-4 h-4 text-[#072929] border-[#E6E6E6] rounded focus:ring-[#072929]"
                          />
                          <label className="text-[14px] font-medium text-[#072929]">
                            {searchQuery.trim()
                              ? `Select all in results (${selectedInViewCount}/${filteredProfiles.length})`
                              : `Select All (${selectedInViewCount}/${filteredProfiles.length})`}
                          </label>
                        </div>
                        {totalSelectedCount > 0 ? (
                          <span className="text-[14px] font-semibold text-[#072929]">
                            {totalSelectedCount} selected in total
                          </span>
                        ) : (
                          <span className="text-[14px] text-[#556179]">
                            No profiles selected
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={cancelToIntegrations}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSave}
                          disabled={saving || totalSelectedCount === 0}
                        >
                          {saving
                            ? "Saving..."
                            : `Save ${totalSelectedCount} Profile${
                                totalSelectedCount !== 1 ? "s" : ""
                              }`}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      {filteredProfiles.map((profile) => {
                        const profileId = getProfileId(profile);
                        const isSelected = selectedProfileIds.has(profileId);
                        const profileName = getProfileName(profile);

                        return (
                          <div
                            key={profileId}
                            className={`bg-[#FEFEFB] border rounded-2xl p-4 cursor-pointer transition-all ${
                              isSelected
                                ? "border-[#072929] bg-[#F0F0ED]"
                                : "border-[#E8E8E3] hover:border-[#D0D0C8]"
                            }`}
                            onClick={() => toggleProfile(profileId)}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleProfile(profileId)}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-1 w-4 h-4 text-[#072929] border-[#E6E6E6] rounded focus:ring-[#072929]"
                              />
                              <div className="flex-1">
                                <h3 className="text-[16px] font-medium text-[#072929] mb-1">
                                  {profileName}
                                </h3>
                                <div className="flex gap-4 text-[14px] text-[#556179] flex-wrap">
                                  <span>Account ID: {profileId}</span>
                                  {profile.business_name && (
                                    <span>
                                      Business: {profile.business_name}
                                    </span>
                                  )}
                                  {profile.currency && (
                                    <span>Currency: {profile.currency}</span>
                                  )}
                                  {profile.timezone_name && (
                                    <span>
                                      Timezone: {profile.timezone_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-3 justify-end">
                      <Button
                        variant="outline"
                        onClick={cancelToIntegrations}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={saving || totalSelectedCount === 0}
                      >
                        {saving
                          ? "Saving..."
                          : `Save ${totalSelectedCount} Profile${
                              totalSelectedCount !== 1 ? "s" : ""
                            }`}
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
