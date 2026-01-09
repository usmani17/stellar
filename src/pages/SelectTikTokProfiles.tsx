import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { accountsService } from "../services/accounts";
import { useAccounts } from "../contexts/AccountsContext";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { Button, Checkbox } from "../components/ui";

interface TikTokProfile {
  id?: number;
  advertiser_id?: string;
  advertiser_name?: string;
  company?: string;
  description?: string;
  currency?: string;
  timezone?: string;
  country?: string;
  language?: string;
  tiktok_status?: string;
  is_selected?: boolean;
}

export const SelectTikTokProfiles: React.FC = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { accounts } = useAccounts();
  const { sidebarWidth } = useSidebar();
  const [profiles, setProfiles] = useState<TikTokProfile[]>([]);
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);

  useEffect(() => {
    if (channelId) {
      // Find the account that contains this channel
      const channelIdNum = parseInt(channelId);
      for (const account of accounts) {
        if (account.channels) {
          const channel = account.channels.find((ch) => ch.id === channelIdNum);
          if (channel) {
            setAccountId(account.id);
            break;
          }
        }
      }
      loadProfiles();
    }
  }, [channelId, accounts]);

  const loadProfiles = async () => {
    if (!channelId) return;

    try {
      setLoading(true);
      setError(null);

      // Always fetch from TikTok API first to get latest advertisers
      // This will also save them to the database and preserve selection status
      console.log("Fetching latest advertisers from TikTok API...");
      try {
        await accountsService.fetchTikTokProfiles(parseInt(channelId));
        console.log(
          "Successfully fetched and saved advertisers from TikTok API"
        );
      } catch (fetchErr: any) {
        console.error("Failed to fetch profiles from TikTok:", fetchErr);
        // Continue - we'll try to load from DB as fallback
        setError(
          fetchErr.response?.data?.error ||
            "Failed to fetch latest advertisers from TikTok. Showing cached data."
        );
      }

      // Now load profiles from database (which includes selection status)
      const savedProfilesResponse = await accountsService.getTikTokProfiles(
        parseInt(channelId)
      );
      const savedProfiles = savedProfilesResponse.profiles || [];
      console.log("Loaded profiles from DB:", savedProfiles);

      // Set selected profile IDs based on is_selected flag
      const selectedIds = new Set<string>();
      savedProfiles.forEach((savedProfile: any) => {
        if (savedProfile.is_selected) {
          const profileId = savedProfile.advertiser_id || savedProfile.id;
          if (profileId) {
            selectedIds.add(String(profileId));
          }
        }
      });

      // Set both profiles and selected IDs (ensure all IDs are strings)
      setProfiles(savedProfiles);
      setSelectedProfileIds(
        new Set(Array.from(selectedIds).map((id) => String(id)))
      );
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          "Failed to load TikTok advertisers. Please try again."
      );
      console.error("Failed to load profiles:", err);
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

  const handleSave = async () => {
    if (!channelId) {
      setError("Channel ID is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Prepare profile data for saving
      const profilesToSave = profiles.map((profile) => {
        const profileId = profile.advertiser_id || profile.id || "";
        const profileName =
          profile.advertiser_name || `Advertiser ${profileId}`;

        return {
          advertiser_id: String(profileId),
          advertiser_name: profileName,
          company: profile.company || "",
          description: profile.description || "",
          currency: profile.currency || "",
          timezone: profile.timezone || "",
          country: profile.country || "",
          language: profile.language || "",
          tiktok_status: profile.tiktok_status || "",
        };
      });

      console.log(
        "Saving profiles - selected IDs:",
        Array.from(selectedProfileIds)
      );
      console.log("Saving profiles - profiles data to send:", profilesToSave);

      const result = await accountsService.saveTikTokProfiles(
        parseInt(channelId),
        Array.from(selectedProfileIds),
        profilesToSave
      );

      console.log("Save profiles result:", result);

      if (result && result.message) {
        // Success - navigate back to channels page
        if (accountId) {
          navigate(`/accounts/${accountId}/channels`);
        } else {
          // Fallback to accounts page if accountId not found
          navigate("/accounts");
        }
      } else {
        setError("Profiles saved but no confirmation received");
      }
    } catch (err: any) {
      console.error("Failed to save profiles - full error:", err);
      console.error("Error response:", err.response);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to save profiles. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const getProfileId = (profile: TikTokProfile): string => {
    const id = profile.advertiser_id || profile.id;
    return id ? String(id) : "";
  };

  const getProfileName = (profile: TikTokProfile): string => {
    return profile.advertiser_name || `Advertiser ${getProfileId(profile)}`;
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
        {/* Header */}
        <DashboardHeader />

        {/* Main Content Area */}
        <div className="p-8 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-[24px] font-medium text-[#072929] mb-2">
                Select TikTok Advertisers
              </h1>
              <p className="text-[14px] text-[#556179]">
                Choose which TikTok advertiser accounts you want to connect.
              </p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-[14px]">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#072929] mx-auto mb-4"></div>
                <p className="text-[14px] text-[#556179]">
                  Loading advertisers...
                </p>
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-12 bg-[#FEFEFB] border border-[#E8E8E3] rounded-2xl">
                <p className="text-[14px] text-[#556179] mb-4">
                  No advertisers found. Please check your TikTok account
                  connection.
                </p>
                <Button onClick={loadProfiles} variant="outline">
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={
                        profiles.length > 0 &&
                        selectedProfileIds.size === profiles.length
                      }
                      onChange={(checked) => {
                        if (checked) {
                          setSelectedProfileIds(
                            new Set(
                              profiles
                                .map((p) => p.advertiser_id || p.id || "")
                                .filter(Boolean)
                                .map((id) => String(id))
                            )
                          );
                        } else {
                          setSelectedProfileIds(new Set());
                        }
                      }}
                      label={`Select All (${selectedProfileIds.size}/${profiles.length})`}
                      size="small"
                    />
                  </div>
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
                              onChange={() => toggleProfile(profileId)}
                              size="small"
                            />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-[16px] font-medium text-[#072929] mb-1">
                              {profileName}
                            </h3>
                            <div className="flex gap-4 text-[14px] text-[#556179] flex-wrap">
                              <span>Advertiser ID: {profileId}</span>
                              {profile.company && (
                                <span>Company: {profile.company}</span>
                              )}
                              {profile.currency && (
                                <span>Currency: {profile.currency}</span>
                              )}
                              {profile.country && (
                                <span>Country: {profile.country}</span>
                              )}
                              {profile.timezone && (
                                <span>Timezone: {profile.timezone}</span>
                              )}
                              {profile.tiktok_status && (
                                <span>Status: {profile.tiktok_status}</span>
                              )}
                            </div>
                            {profile.description && (
                              <p className="text-[12px] text-[#556179] mt-2">
                                {profile.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (accountId) {
                        navigate(`/accounts/${accountId}/channels`);
                      } else {
                        navigate("/accounts");
                      }
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg"
                  >
                    {saving
                      ? "Saving..."
                      : selectedProfileIds.size > 0
                      ? `Save ${selectedProfileIds.size} Advertiser${
                          selectedProfileIds.size !== 1 ? "s" : ""
                        }`
                      : "Save Advertisers"}
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
