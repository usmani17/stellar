import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { accountsService } from "../services/accounts";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { Button } from "../components/ui";
import { Checkbox } from "../components/ui/Checkbox";

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
      loadProfiles();
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

  const loadProfiles = async () => {
    if (!channelId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await accountsService.fetchMetaProfiles(
        parseInt(channelId)
      );

      const metaProfiles = Array.isArray(response)
        ? response
        : response.profiles || [];
      const excluded = response.excluded_profiles || [];

      if (metaProfiles.length === 0 && excluded.length === 0) {
        setError("No profiles found from Meta API");
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
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to fetch profiles from Meta. Please try again."
      );
      console.error("Failed to load Meta profiles:", err);
      setProfiles([]);
      setSelectedProfileIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  const toggleProfile = (profileId: string) => {
    const newSelected = new Set(selectedProfileIds);
    if (newSelected.has(profileId)) {
      newSelected.delete(profileId);
    } else {
      newSelected.add(profileId);
    }
    setSelectedProfileIds(newSelected);
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedProfileIds(
        new Set(
          profiles
            .map((p) => {
              const id =
                p.account_id || p.profileId || p.profile_id || p.id;
              return id ? String(id) : "";
            })
            .filter(Boolean)
        )
      );
    } else {
      setSelectedProfileIds(new Set());
    }
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

        if (accountId) {
          navigate(`/brands/${accountId}/integrations`, { replace: true });
        } else {
          navigate(-1);
        }
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

  const getProfileId = (profile: MetaProfile): string => {
    const id =
      profile.account_id || profile.profileId || profile.profile_id || profile.id;
    return id ? String(id) : "";
  };

  const getProfileName = (profile: MetaProfile): string => {
    return profile.name || profile.business_name || "Unnamed Profile";
  };

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />

      <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
        <DashboardHeader />

        <div className="p-8 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-[24px] font-medium text-[#072929] mb-2">
                Meta Profiles
              </h1>
              <p className="text-[14px] text-[#556179]">
                Choose which Meta ad accounts you want to connect.
              </p>
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

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#072929] mx-auto mb-4"></div>
                <p className="text-[14px] text-[#556179]">
                  Loading profiles...
                </p>
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-12 bg-[#FEFEFB] border border-[#E8E8E3] rounded-2xl">
                <p className="text-[14px] text-[#556179] mb-4">
                  No profiles found. Please check your Meta account connection.
                </p>
                <Button onClick={loadProfiles} variant="outline">
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <Checkbox
                    checked={
                      profiles.length > 0 &&
                      selectedProfileIds.size === profiles.length
                    }
                    onChange={toggleAll}
                    label={`Select All (${selectedProfileIds.size}/${profiles.length})`}
                    size="small"
                  />
                </div>

                <div className="space-y-3 mb-6">
                  {profiles.map((profile) => {
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
                          <div
                            className="mt-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={(checked) => {
                                if (checked) {
                                  setSelectedProfileIds(
                                    new Set([...selectedProfileIds, profileId])
                                  );
                                } else {
                                  const newSelected = new Set(
                                    selectedProfileIds
                                  );
                                  newSelected.delete(profileId);
                                  setSelectedProfileIds(newSelected);
                                }
                              }}
                              size="small"
                            />
                          </div>
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
                    onClick={() => {
                      if (accountId) {
                        navigate(`/brands/${accountId}/integrations`);
                      } else {
                        navigate(-1);
                      }
                    }}
                    disabled={saving}
                    size="sm"
                    className="cancel-button"
                  >
                    <span className="text-[14px] font-semibold text-[#072929]">
                      Cancel
                    </span>
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || selectedProfileIds.size === 0}
                    size="sm"
                    className="bg-[#136d6d] text-[#fbfafc] hover:bg-[#0e5a5a] px-2 py-1.5 h-[36px] rounded-lg flex items-center gap-2 justify-center"
                  >
                    {saving
                      ? "Saving..."
                      : `Save ${selectedProfileIds.size} Profile${
                          selectedProfileIds.size !== 1 ? "s" : ""
                        }`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
