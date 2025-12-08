import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { accountsService } from "../services/accounts";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { Button } from "../components/ui";

interface AmazonProfile {
  // Amazon API fields (primary)
  id?: string;
  name?: string;
  type?: string;
  validPaymentMethod?: boolean;
  marketplaceStringId?: string;
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
}

export const SelectAmazonProfiles: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<AmazonProfile[]>([]);
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accountId) {
      loadProfiles();
    }
  }, [accountId]);

  const loadProfiles = async () => {
    if (!accountId) return;

    try {
      setLoading(true);
      setError(null);
      const profilesData = await accountsService.fetchProfiles(
        parseInt(accountId)
      );
      console.log("Fetched profiles from API:", profilesData);
      console.log("First profile structure:", profilesData[0]);
      setProfiles(profilesData);
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

  const toggleAll = () => {
    if (selectedProfileIds.size === profiles.length) {
      setSelectedProfileIds(new Set());
    } else {
      setSelectedProfileIds(
        new Set(profiles.map((p) => p.id || p.profileId || p.profile_id || ""))
      );
    }
  };

  const handleSave = async () => {
    if (!accountId || selectedProfileIds.size === 0) {
      setError("Please select at least one profile");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      console.log("Saving profiles - selected IDs:", Array.from(selectedProfileIds));
      console.log("Saving profiles - profiles data:", profiles);
      // Send profiles as-is from Amazon API (they already have 'id' and 'name' fields)
      const result = await accountsService.saveProfiles(
        parseInt(accountId),
        Array.from(selectedProfileIds),
        profiles
      );
      console.log("Save profiles result:", result);
      navigate("/accounts");
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Failed to save profiles. Please try again."
      );
      console.error("Failed to save profiles:", err);
    } finally {
      setSaving(false);
    }
  };

  const getProfileId = (profile: AmazonProfile): string => {
    // Amazon API returns 'id' field, not 'profileId'
    return profile.id || profile.profileId || profile.profile_id || "";
  };

  const getProfileName = (profile: AmazonProfile): string => {
    // Amazon API returns 'name' field directly
    const name = profile.name || profile.profile_name || "";
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

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#072929] mx-auto mb-4"></div>
                <p className="text-[14px] text-[#556179]">Loading profiles...</p>
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-12 bg-[#FEFEFB] border border-[#E8E8E3] rounded-2xl">
                <p className="text-[14px] text-[#556179] mb-4">
                  No profiles found. Please check your Amazon account connection.
                </p>
                <Button onClick={loadProfiles} variant="outline">
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        profiles.length > 0 &&
                        selectedProfileIds.size === profiles.length
                      }
                      onChange={toggleAll}
                      className="w-4 h-4 text-[#072929] border-[#E6E6E6] rounded focus:ring-[#072929]"
                    />
                    <label className="text-[14px] font-medium text-[#072929]">
                      Select All ({selectedProfileIds.size}/{profiles.length})
                    </label>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {profiles.map((profile) => {
                    const profileId = getProfileId(profile);
                    const isSelected = selectedProfileIds.has(profileId);
                    const profileName = getProfileName(profile);
                    const profileType = profile.type || '';
                    const marketplaceId = profile.marketplaceStringId || '';

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
                              <span>ID: {profileId}</span>
                              {profileType && <span>Type: {profileType}</span>}
                              {marketplaceId && <span>Marketplace: {marketplaceId}</span>}
                              {getCountryCode(profile) !== 'N/A' && (
                                <span>Country: {getCountryCode(profile)}</span>
                              )}
                              {getCurrencyCode(profile) !== 'N/A' && (
                                <span>Currency: {getCurrencyCode(profile)}</span>
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
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || selectedProfileIds.size === 0}
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

