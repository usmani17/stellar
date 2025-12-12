import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { accountsService } from "../services/accounts";
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
  const [profiles, setProfiles] = useState<AmazonProfile[]>([]);
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);

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
          const amazonProfiles = await accountsService.fetchProfiles(
            parseInt(channelId)
          );
          console.log("Profiles fetched from Amazon:", amazonProfiles);

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
          // Use consistent ID extraction logic
          const profileId =
            savedProfile.profileId ||
            savedProfile.profile_id ||
            savedProfile.id;
          if (profileId) {
            selectedIds.add(String(profileId));
          }
        }
      });

      console.log("Selected profile IDs from DB:", Array.from(selectedIds));

      // Now set both profiles and selected IDs
      setProfiles(savedProfiles);

      // Ensure selected IDs exist in the returned list - use same extraction logic
      const dbProfileIds = savedProfiles
        .map((p: any) => {
          const id = p.profileId || p.profile_id || p.id;
          return id ? String(id) : null;
        })
        .filter(Boolean);

      console.log("All profile IDs from DB:", dbProfileIds);

      const validSelectedIds = new Set<string>();
      selectedIds.forEach((id) => {
        if (dbProfileIds.includes(id)) {
          validSelectedIds.add(id);
        }
      });

      console.log("Valid selected profile IDs:", Array.from(validSelectedIds));
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

      const profilesToSave = profiles.map((profile) => {
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
      <div className="flex-1 ml-[272px]">
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
