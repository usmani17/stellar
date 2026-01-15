import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { accountsService } from "../services/accounts";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { Button, Checkbox } from "../components/ui";

interface AmazonProfile {
  // Amazon API fields (primary)
  id?: string;
  name?: string;
  type?: string;
  validPaymentMethod?: boolean;
  marketplaceStringId?: string;
  sellerId?: string;
  // Alternative field names (for compatibility)
  profileId?: string;
  profile_id?: string;
  profile_name?: string;
  countryCode?: string;
  country_code?: string;
  currencyCode?: string;
  currency_code?: string;
  timezone?: string;
  accountInfo?: any;
  account_info?: any;
  // Database fields (from backend)
  seller_id?: string;
  marketplace_id?: string;
}

export const SelectAmazonProfiles: React.FC = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();
  const [profiles, setProfiles] = useState<AmazonProfile[]>([]);
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(
    new Set()
  );
  const [excludedProfiles, setExcludedProfiles] = useState<Array<{
    profileId: string;
    name: string;
    channel_id: number;
    channel_name: string;
    account_name: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (channelId) {
      loadProfiles();
    }
  }, [channelId]);

  const loadProfiles = async () => {
    if (!channelId) return;

    try {
      setLoading(true);
      setError(null);

      // First, try to load profiles from our DB
      const savedProfilesResponse = await accountsService.getProfiles(
        parseInt(channelId)
      );
      const savedProfiles = savedProfilesResponse.profiles || [];
      console.log("Saved profiles from DB:", savedProfiles);

      // If no profiles in DB, fetch from Amazon
      if (savedProfiles.length === 0) {
        console.log("No profiles in DB, fetching from Amazon...");
        try {
          const amazonProfilesResponse = await accountsService.fetchProfiles(
            parseInt(channelId)
          );
          console.log("Profiles fetched from Amazon:", amazonProfilesResponse);

          // The response is an object with a 'profiles' property and 'excluded_profiles'
          const amazonProfiles = amazonProfilesResponse?.profiles || [];
          const excluded = amazonProfilesResponse?.excluded_profiles || [];
          
          // Set excluded profiles
          setExcludedProfiles(excluded);
          
          if (amazonProfiles.length > 0) {
            // Use profiles from Amazon
            setProfiles(amazonProfiles);
            setSelectedProfileIds(new Set());
            return;
          }
        } catch (fetchErr: any) {
          console.error("Failed to fetch profiles from Amazon:", fetchErr);
          // Continue with empty profiles - will show error message
        }
      }

      // Set selected profile IDs based on is_selected flag
      const selectedIds = new Set<string>();
      savedProfiles.forEach((savedProfile: any) => {
        if (savedProfile.is_selected) {
          const profileId =
            savedProfile.profileId ||
            savedProfile.profile_id ||
            savedProfile.id;
          if (profileId) {
            selectedIds.add(String(profileId));
          }
        }
      });

      // Now set both profiles and selected IDs
      setProfiles(savedProfiles);

      // If we have saved profiles, also try to fetch excluded profiles
      // This helps show excluded profiles even when profiles exist in DB
      try {
        const amazonProfilesResponse = await accountsService.fetchProfiles(
          parseInt(channelId)
        );
        const excluded = amazonProfilesResponse?.excluded_profiles || [];
        setExcludedProfiles(excluded);
      } catch (fetchErr: any) {
        // If fetch fails, just continue without excluded profiles
        console.warn("Could not fetch excluded profiles:", fetchErr);
      }

      // Ensure selected IDs exist in the returned list
      const dbProfileIds = savedProfiles
        .map((p: any) => {
          const id = p.id || p.profileId || p.profile_id;
          return id ? String(id) : null;
        })
        .filter(Boolean);

      const validSelectedIds = new Set<string>();
      selectedIds.forEach((id) => {
        if (dbProfileIds.includes(id)) {
          validSelectedIds.add(id);
        }
      });

      setSelectedProfileIds(validSelectedIds);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          "Failed to load Amazon profiles. Please try again."
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
    if (!channelId || selectedProfileIds.size === 0) {
      setError("Please select at least one profile");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Prepare profile data for saving - ensure we have the correct structure
      const profilesToSave = profiles.map((profile) => {
        const profileId = getProfileId(profile);
        const profileName = getProfileName(profile);

        // Extract sellerId from accountInfo or profile
        const sellerId =
          profile.sellerId ||
          profile.seller_id ||
          profile.accountInfo?.id ||
          profile.accountInfo?.sellerId ||
          profile.account_info?.id ||
          profile.account_info?.sellerId ||
          "";

        // Extract marketplaceId from accountInfo or profile
        const marketplaceId =
          profile.marketplaceStringId ||
          profile.marketplace_id ||
          profile.accountInfo?.marketplaceStringId ||
          profile.accountInfo?.marketplaceId ||
          profile.account_info?.marketplaceStringId ||
          profile.account_info?.marketplaceId ||
          "";

        // Build accountInfo object with all necessary fields
        const accountInfo = {
          ...(profile.accountInfo || profile.account_info || {}),
          // Ensure sellerId and marketplaceId are in accountInfo for backend compatibility
          id:
            sellerId ||
            profile.accountInfo?.id ||
            profile.account_info?.id ||
            "",
          sellerId:
            sellerId ||
            profile.accountInfo?.sellerId ||
            profile.account_info?.sellerId ||
            "",
          marketplaceStringId:
            marketplaceId ||
            profile.accountInfo?.marketplaceStringId ||
            profile.account_info?.marketplaceStringId ||
            "",
          marketplaceId:
            marketplaceId ||
            profile.accountInfo?.marketplaceId ||
            profile.account_info?.marketplaceId ||
            "",
        };

        // Return profile in the format expected by backend
        return {
          id: profileId,
          name: profileName,
          type: profile.type || profile.accountInfo?.type || "",
          validPaymentMethod:
            profile.validPaymentMethod ||
            profile.accountInfo?.validPaymentMethod ||
            false,
          marketplaceStringId: marketplaceId,
          sellerId: sellerId,
          countryCode:
            getCountryCode(profile) !== "N/A" ? getCountryCode(profile) : "",
          currencyCode:
            getCurrencyCode(profile) !== "N/A" ? getCurrencyCode(profile) : "",
          timezone: profile.timezone || "",
          accountInfo: accountInfo,
        };
      });

      console.log(
        "Saving profiles - selected IDs:",
        Array.from(selectedProfileIds)
      );
      console.log("Saving profiles - profiles data to send:", profilesToSave);

      const result = await accountsService.saveProfiles(
        parseInt(channelId),
        Array.from(selectedProfileIds),
        profilesToSave
      );

      console.log("Save profiles result:", result);

      if (result && result.message) {
        // Success - navigate to accounts
        navigate("/accounts");
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

  const getProfileId = (profile: AmazonProfile): string => {
    // Handle all possible field names for profile ID
    // Check in order: profileId (most common), id, profile_id
    const id = profile.profileId || profile.id || profile.profile_id;
    return id ? String(id) : "";
  };

  const getProfileName = (profile: AmazonProfile): string => {
    // Amazon API returns 'name' field directly, or nested in accountInfo
    const name =
      profile.name ||
      profile.profile_name ||
      profile.accountInfo?.name ||
      profile.account_info?.name ||
      "";
    if (!name) {
      console.warn("No name found for profile:", profile);
    }
    return name || "Unnamed Profile";
  };

  const getCountryCode = (profile: AmazonProfile): string => {
    return profile.countryCode || profile.country_code || "N/A";
  };

  const getCurrencyCode = (profile: AmazonProfile): string => {
    return profile.currencyCode || profile.currency_code || "N/A";
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
                Select Amazon Profiles
              </h1>
              <p className="text-[14px] text-[#556179]">
                Choose which Amazon Advertising profiles you want to connect.
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
                  No profiles found. Please check your Amazon account
                  connection.
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
                    onChange={(checked) => {
                      if (checked) {
                        setSelectedProfileIds(
                          new Set(
                            profiles.map((p) => getProfileId(p)).filter(Boolean)
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

                <div className="space-y-3 mb-6">
                  {profiles.map((profile) => {
                    const profileId = getProfileId(profile);
                    const isSelected = selectedProfileIds.has(profileId);
                    const profileName = getProfileName(profile);
                    const profileType = profile.type || "";

                    // Extract sellerId from various possible locations
                    const sellerId =
                      profile.sellerId ||
                      profile.seller_id ||
                      profile.accountInfo?.id ||
                      profile.accountInfo?.sellerId ||
                      profile.account_info?.id ||
                      profile.account_info?.sellerId ||
                      "";

                    // Extract marketplaceId from various possible locations
                    const marketplaceId =
                      profile.marketplaceStringId ||
                      profile.marketplace_id ||
                      profile.accountInfo?.marketplaceStringId ||
                      profile.accountInfo?.marketplaceId ||
                      profile.account_info?.marketplaceStringId ||
                      profile.account_info?.marketplaceId ||
                      "";

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
                              <span>ProfileId: {profileId}</span>
                              {profileType && <span>Type: {profileType}</span>}
                              {sellerId && <span>SellerId: {sellerId}</span>}
                              {marketplaceId && (
                                <span>MarketplaceId: {marketplaceId}</span>
                              )}
                              {getCountryCode(profile) !== "N/A" && (
                                <span>Country: {getCountryCode(profile)}</span>
                              )}
                              {getCurrencyCode(profile) !== "N/A" && (
                                <span>
                                  Currency: {getCurrencyCode(profile)}
                                </span>
                              )}
                              {profile.timezone && (
                                <span>Timezone: {profile.timezone}</span>
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
                    onClick={() => navigate("/accounts")}
                    disabled={saving}
                    className="rounded-lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || selectedProfileIds.size === 0}
                    className="rounded-lg"
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
