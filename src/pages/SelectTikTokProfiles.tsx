import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { accountsService } from "../services/accounts";
import { useAccounts } from "../contexts/AccountsContext";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { Button, Checkbox } from "../components/ui";
import { Banner } from "../components/ui/Banner";

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [excludedProfiles, setExcludedProfiles] = useState<
    Array<{
      advertiser_id: string;
      name: string;
      channel_id: number;
      channel_name: string;
      account_name: string;
    }>
  >([]);

  // Check for channel created success message on mount
  useEffect(() => {
    const channelSuccess = localStorage.getItem('channel_created_success');
    if (channelSuccess) {
      try {
        const { message } = JSON.parse(channelSuccess);
        setSuccessMessage(message);
        localStorage.removeItem('channel_created_success');
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      } catch (e) {
        console.error('Failed to parse success message:', e);
        localStorage.removeItem('channel_created_success');
      }
    }
  }, []);

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

      // Always fetch fresh profiles from TikTok API
      console.log("Fetching fresh profiles from TikTok API...");
      const response = await accountsService.fetchTikTokProfiles(
        parseInt(channelId)
      );
      
      // Handle both array response (old format) and object response (new format with excluded_profiles)
      const tiktokProfiles = Array.isArray(response) ? response : response.profiles || [];
      const excluded = response.excluded_profiles || [];
      
      console.log("Profiles fetched from TikTok:", tiktokProfiles);
      console.log("Excluded profiles:", excluded);

      if (tiktokProfiles.length === 0 && excluded.length === 0) {
        setError("No profiles found from TikTok API");
        setProfiles([]);
        setSelectedProfileIds(new Set());
        setExcludedProfiles([]);
        return;
      }
      
      // Set excluded profiles for display
      setExcludedProfiles(excluded);

      // Profiles from API already include is_selected status for current channel profiles
      // Extract selected profile IDs from the profiles array
      const selectedIds = new Set<string>();
      tiktokProfiles.forEach((profile: any) => {
        if (profile.is_selected) {
          const profileId = profile.advertiser_id || profile.id;
          if (profileId) {
            selectedIds.add(String(profileId));
          }
        }
      });

      console.log("Selected profile IDs from API response:", Array.from(selectedIds));

      // Set profiles from TikTok (they already have is_selected flag set for current channel)
      setProfiles(tiktokProfiles);
      setSelectedProfileIds(selectedIds);
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

      // Only include selected profiles in the data to save
      const selectedProfiles = profiles.filter((profile) => {
        const profileId = profile.advertiser_id || profile.id;
        return profileId && selectedProfileIds.has(String(profileId));
      });

      // Prepare profile data for saving
      const profilesToSave = selectedProfiles.map((profile) => {
        const profileId = profile.advertiser_id || profile.id || "";
        const profileName =
          profile.advertiser_name || `Advertiser ${profileId}`;

        return {
          advertiser_id: String(profileId),
          advertiser_name: profileName,
          name: profileName,
          company: profile.company || "",
          description: profile.description || "",
          brand: profile.brand || "",
          address: profile.address || "",
          industry: profile.industry || "",
          email: profile.email || "",
          cellphone_number: profile.cellphone_number || "",
          telephone_number: profile.telephone_number || "",
          contacter: profile.contacter || "",
          license_url: profile.license_url || "",
          license_no: profile.license_no || "",
          license_province: profile.license_province || "",
          license_city: profile.license_city || "",
          currency: profile.currency || "",
          timezone: profile.timezone || "",
          display_timezone: profile.display_timezone || "",
          country: profile.country || "",
          language: profile.language || "",
          advertiser_account_type: profile.advertiser_account_type || "",
          role: profile.role || "",
          balance: profile.balance || null,
          promotion_area: profile.promotion_area || "",
          promotion_center_city: profile.promotion_center_city || "",
          promotion_center_province: profile.promotion_center_province || "",
          tiktok_status: profile.tiktok_status || profile.status || "",
          status: profile.tiktok_status || profile.status || "",
          rejection_reason: profile.rejection_reason || "",
          create_time: profile.create_time || null,
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
        // Store success message in localStorage to show on next page
        const profileCount = selectedProfileIds.size;
        localStorage.setItem('profiles_saved_success', JSON.stringify({
          message: `${profileCount} profile${profileCount !== 1 ? 's' : ''} connected successfully!`,
          type: 'success'
        }));
        // Success - navigate back to channels page
        if (accountId) {
          navigate(`/brands/${accountId}/channels`);
        } else {
          // Fallback to accounts page if accountId not found
          navigate("/brands");
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

            {successMessage && (
              <Banner
                type="success"
                message={successMessage}
                dismissable={true}
                onDismiss={() => setSuccessMessage(null)}
                className="mb-6"
              />
            )}
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
                      Some advertisers are already connected to other channels
                    </h3>
                    <p className="text-[13px] text-amber-700 mb-2">
                      The following {excludedProfiles.length} advertiser
                      {excludedProfiles.length > 1 ? "s are" : " is"} already
                      connected to another channel. To connect them to this
                      channel, you first need to unselect them from the
                      original channel.
                    </p>
                    <div className="mt-3 space-y-2">
                      {excludedProfiles.map((excluded) => (
                        <div
                          key={excluded.advertiser_id}
                          className="text-[13px] text-amber-700 bg-amber-100 px-3 py-2 rounded border border-amber-200"
                        >
                          <span className="font-medium">
                            {excluded.name || `Advertiser ${excluded.advertiser_id}`}
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
                    onClick={() => {
                      if (accountId) {
                        navigate(`/brands/${accountId}/channels`);
                      } else {
                        navigate("/brands");
                      }
                    }}
                    disabled={saving}
                    className="cancel-button"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="create-entity-button btn-sm"
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
