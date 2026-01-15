import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { accountsService } from "../services/accounts";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { Button } from "../components/ui";
import { Checkbox } from "../components/ui/Checkbox";

interface AmazonProfile {
  id?: string;
  name?: string;
  type?: string;
  validPaymentMethod?: boolean;
  marketplaceStringId?: string;
  sellerId?: string;
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
  seller_id?: string;
  marketplace_id?: string;
  is_selected?: boolean;
}

export const ListAmazonProfiles: React.FC = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();
  const [profiles, setProfiles] = useState<AmazonProfile[]>([]);
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
      // Fetch all accounts and their channels to find the accountId for this channel
      const accounts = await accountsService.getAccounts();
      for (const account of accounts) {
        const channels = await accountsService.getAccountChannels(account.id);
        const channel = channels.find((ch) => ch.id === parseInt(channelId, 10));
        if (channel) {
          setAccountId(account.id);
          return;
        }
      }
    } catch (error) {
      console.error("Failed to load accountId:", error);
    }
  };

  const loadProfiles = async () => {
    if (!channelId) return;

    try {
      setLoading(true);
      setError(null);

      // Always fetch fresh profiles from Amazon
      console.log("Fetching fresh profiles from Amazon...");
      const response = await accountsService.fetchProfiles(
        parseInt(channelId)
      );
      
      // Handle both array response (old format) and object response (new format with excluded_profiles)
      const amazonProfiles = Array.isArray(response) ? response : response.profiles || [];
      const excluded = response.excluded_profiles || [];
      
      console.log("Profiles fetched from Amazon:", amazonProfiles);
      console.log("Excluded profiles:", excluded);

      if (amazonProfiles.length === 0 && excluded.length === 0) {
        setError("No profiles found from Amazon API");
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
      amazonProfiles.forEach((profile: any) => {
        if (profile.is_selected) {
          const profileId =
            profile.profileId ||
            profile.profile_id ||
            profile.id;
          if (profileId) {
            selectedIds.add(String(profileId));
          }
        }
      });

      console.log("Selected profile IDs from API response:", Array.from(selectedIds));

      // Set profiles from Amazon (they already have is_selected flag set for current channel)
      setProfiles(amazonProfiles);
      setSelectedProfileIds(selectedIds);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to fetch profiles from Amazon. Please try again."
      );
      console.error("Failed to fetch profiles from Amazon:", err);
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
        new Set(profiles.map((p) => {
          const id = p.profileId || p.profile_id || p.id;
          return id ? String(id) : "";
        }).filter(Boolean))
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

      // Only include selected profiles in the data to save
      const selectedProfiles = profiles.filter((profile) => {
        const profileId =
          profile.profileId || profile.profile_id || profile.id;
        return profileId && selectedProfileIds.has(String(profileId));
      });

      const profilesToSave = selectedProfiles.map((profile) => {
        const profileId =
          profile.profileId ||
          profile.profile_id ||
          profile.id ||
          "";
        const profileName = getProfileName(profile);

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

        const accountInfo = {
          id: sellerId,
          sellerId: sellerId,
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
        // Success - navigate back to channels page
        if (accountId) {
          navigate(`/accounts/${accountId}/channels`);
        } else {
          navigate(-1);
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

  const getProfileId = (profile: AmazonProfile): string => {
    // Use the same logic as when extracting IDs from saved profiles
    const id =
      profile.profileId ||
      profile.profile_id ||
      profile.id;
    return id ? String(id) : "";
  };

  const getProfileName = (profile: AmazonProfile): string => {
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
                Amazon Profiles
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
                      {excludedProfiles.map((excluded, index) => (
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
                    onChange={toggleAll}
                    label={`Select All (${selectedProfileIds.size}/${profiles.length})`}
                    size="small"
                  />
                </div>

                <div className="space-y-3 mb-6">
                  {profiles.map((profile) => {
                    const profileId = getProfileId(profile);
                    const isSelected = selectedProfileIds.has(profileId);
                    console.log(`Profile ${profileId}: isSelected=${isSelected}, selectedProfileIds:`, Array.from(selectedProfileIds));
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
                          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onChange={(checked) => {
                                if (checked) {
                                  setSelectedProfileIds(new Set([...selectedProfileIds, profileId]));
                                } else {
                                  const newSelected = new Set(selectedProfileIds);
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
                    onClick={() => {
                      if (accountId) {
                        navigate(`/accounts/${accountId}/channels`);
                      } else {
                        navigate(-1);
                      }
                    }}
                    disabled={saving}
                    size="sm"
                    className="bg-[#f9f9f6] border border-[#072929] h-[36px] px-2 py-1.5 rounded-[8px] flex items-center justify-center"
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
