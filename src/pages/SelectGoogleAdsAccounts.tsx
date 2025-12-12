import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { accountsService } from "../services/accounts";
import { useAccounts } from "../contexts/AccountsContext";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { Button } from "../components/ui";

interface GoogleAdsAccount {
  customer_id: string;
  customer_id_raw: string;
  resource_name: string;
  name: string;
  currency_code?: string;
  timezone?: string;
  is_manager?: boolean;
}

export const SelectGoogleAdsAccounts: React.FC = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { refreshAccounts } = useAccounts();
  const [accounts, setAccounts] = useState<GoogleAdsAccount[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);

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
      const savedProfilesResponse = await accountsService.getGoogleProfiles(
        parseInt(channelId)
      );
      const savedProfiles = savedProfilesResponse.profiles || [];
      console.log("Saved profiles from DB:", savedProfiles);

      // If no profiles in DB, fetch from Google Ads API
      if (savedProfiles.length === 0) {
        console.log("No profiles in DB, fetching from Google Ads...");
        try {
          const googleProfiles = await accountsService.fetchGoogleProfiles(
            parseInt(channelId)
          );
          console.log("Profiles fetched from Google Ads:", googleProfiles);

          if (googleProfiles.length > 0) {
            // Use profiles from Google Ads
            setAccounts(googleProfiles);
            setSelectedCustomerIds(new Set());
            return;
          }
        } catch (fetchErr: any) {
          console.error("Failed to fetch profiles from Google Ads:", fetchErr);
          // Continue with empty profiles - will show error message
        }
      }

      // Set selected customer IDs based on is_selected flag
      const selectedIds = new Set<string>();
      savedProfiles.forEach((savedProfile: any) => {
        if (savedProfile.is_selected) {
          const customerId = savedProfile.customer_id;
          if (customerId) {
            selectedIds.add(String(customerId));
          }
        }
      });

      // Now set both accounts and selected IDs
      setAccounts(savedProfiles);

      // Ensure selected IDs exist in the returned list
      const dbCustomerIds = savedProfiles.map((p: any) => p.customer_id);
      selectedIds.forEach((id) => {
        if (!dbCustomerIds.includes(id)) {
          selectedIds.delete(id);
        }
      });

      setSelectedCustomerIds(selectedIds);
    } catch (error) {
      console.error("Failed to load profiles:", error);
      setError("Failed to load Google Ads accounts");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (customerId: string) => {
    const newSelected = new Set(selectedCustomerIds);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomerIds(newSelected);
  };

  const handleSave = async () => {
    if (!channelId) return;

    try {
      setSaving(true);
      setError(null);

      const selectedIds = Array.from(selectedCustomerIds);
      
      if (selectedIds.length === 0) {
        setError("Please select at least one Google Ads account");
        setSaving(false);
        return;
      }

      // Save selected profiles
      const response = await accountsService.saveGoogleProfiles(
        parseInt(channelId),
        selectedIds,
        accounts
      );

      // Show setup message if provided
      if (response.setup_message) {
        setSetupMessage(response.setup_message);
        // Show message for 2 seconds before navigating
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Refresh accounts to show the new channel
      await refreshAccounts();

      // Small delay to ensure state is updated before navigation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Redirect to accounts page
      navigate("/accounts", { replace: true });
    } catch (err: any) {
      console.error("Failed to save Google Ads accounts:", err);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to save Google Ads accounts"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#072929] mx-auto mb-4"></div>
          <p className="text-[16px] text-[#072929]">
            Loading Google Ads accounts...
          </p>
        </div>
      </div>
    );
  }

  const toggleAll = () => {
    if (selectedCustomerIds.size === accounts.length) {
      setSelectedCustomerIds(new Set());
    } else {
      setSelectedCustomerIds(new Set(accounts.map((a) => a.customer_id)));
    }
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
                Select Google Ads Accounts
              </h1>
              <p className="text-[14px] text-[#556179]">
                Choose which Google Ads accounts you want to connect.
              </p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-[14px]">
                {error}
              </div>
            )}

            {setupMessage && (
              <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-[14px] flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                <span>{setupMessage}</span>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#072929] mx-auto mb-4"></div>
                <p className="text-[14px] text-[#556179]">
                  Loading accounts...
                </p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12 bg-[#FEFEFB] border border-[#E8E8E3] rounded-2xl">
                <p className="text-[14px] text-[#556179] mb-4">
                  No accounts found. Please check your Google Ads account
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
                    <input
                      type="checkbox"
                      checked={
                        accounts.length > 0 &&
                        selectedCustomerIds.size === accounts.length
                      }
                      onChange={toggleAll}
                      className="w-4 h-4 text-[#072929] border-[#E6E6E6] rounded focus:ring-[#072929]"
                    />
                    <label className="text-[14px] font-medium text-[#072929]">
                      Select All ({selectedCustomerIds.size}/{accounts.length})
                    </label>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {accounts.map((account) => {
                    const isSelected = selectedCustomerIds.has(account.customer_id);

                    return (
                      <div
                        key={account.customer_id}
                        className={`bg-[#FEFEFB] border rounded-2xl p-4 cursor-pointer transition-all ${
                          isSelected
                            ? "border-[#072929] bg-[#F0F0ED]"
                            : "border-[#E8E8E3] hover:border-[#D0D0C8]"
                        }`}
                        onClick={() => toggleSelection(account.customer_id)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(account.customer_id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 w-4 h-4 text-[#072929] border-[#E6E6E6] rounded focus:ring-[#072929]"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-[16px] font-medium text-[#072929]">
                                {account.name}
                              </h3>
                              {account.is_manager && (
                                <span className="px-2 py-0.5 text-[11px] font-medium bg-[#E8F4F8] text-[#0066CC] rounded-full border border-[#B3D9E6]">
                                  Manager Account
                                </span>
                              )}
                            </div>
                            <div className="flex gap-4 text-[14px] text-[#556179] flex-wrap">
                              <span>Customer ID: {account.customer_id}</span>
                              {account.currency_code && (
                                <span>Currency: {account.currency_code}</span>
                              )}
                              {account.timezone && (
                                <span>Timezone: {account.timezone}</span>
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
                    disabled={saving || selectedCustomerIds.size === 0}
                  >
                    {saving
                      ? "Saving..."
                      : `Save ${selectedCustomerIds.size} Account${
                          selectedCustomerIds.size !== 1 ? "s" : ""
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
