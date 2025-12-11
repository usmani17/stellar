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
      await accountsService.saveGoogleProfiles(
        parseInt(channelId),
        selectedIds,
        accounts
      );

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64">
        <DashboardHeader />
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Select Google Ads Accounts
              </h1>
              <p className="text-gray-600 mb-6">
                Choose which Google Ads accounts you want to connect to this channel.
                You can select multiple accounts.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}

              {accounts.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {accounts.map((account) => (
                    <label
                      key={account.customer_id}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedCustomerIds.has(account.customer_id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="google_ads_account"
                        value={account.customer_id}
                        checked={selectedCustomerIds.has(account.customer_id)}
                        onChange={() => toggleSelection(account.customer_id)}
                        className="mr-4 h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {account.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Customer ID: {account.customer_id}
                          {account.currency_code && ` • ${account.currency_code}`}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No Google Ads accounts found.
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => navigate("/accounts")}
                  variant="outline"
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={selectedCustomerIds.size === 0 || saving}
                >
                  {saving ? "Saving..." : `Connect ${selectedCustomerIds.size} Account${selectedCustomerIds.size !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
