import React, { useState, useEffect } from "react";
import { googleAdwordsConversionActionsService, type GoogleConversionAction } from "../../../services/googleAdwords/googleAdwordsConversionActions";
import { accountsService } from "../../../services/accounts";
import { Loader } from "../../../components/ui/Loader";

interface BulkConversionActionsPanelProps {
  accountId: string;
  channelId: string;
  selectedCampaigns: Set<string | number>;
  campaigns: Array<{
    campaign_id: string | number;
    campaign_name?: string;
    customer_id?: string;
  }>;
  onApply: (conversionActionIds: string[]) => void;
  onCancel: () => void;
}

export const BulkConversionActionsPanel: React.FC<BulkConversionActionsPanelProps> = ({
  accountId,
  channelId,
  selectedCampaigns,
  campaigns,
  onApply,
  onCancel,
}) => {
  const [conversionActions, setConversionActions] = useState<GoogleConversionAction[]>([]);
  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get unique customer IDs from selected campaigns
  const customerIds = React.useMemo(() => {
    const selectedCampaignsData = campaigns.filter((c) =>
      selectedCampaigns.has(c.campaign_id)
    );
    const ids = new Set<string>();
    selectedCampaignsData.forEach((c) => {
      if (c.customer_id) {
        ids.add(c.customer_id);
      }
    });
    return Array.from(ids);
  }, [campaigns, selectedCampaigns]);

  // Fetch conversion actions for the first customer ID
  useEffect(() => {
    const fetchConversionActions = async () => {
      if (!accountId || !channelId || customerIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const accountIdNum = parseInt(accountId, 10);
        const channelIdNum = parseInt(channelId, 10);
        
        if (isNaN(accountIdNum) || isNaN(channelIdNum)) {
          setError("Invalid account ID or channel ID");
          setLoading(false);
          return;
        }

        // Get profiles to find profile ID from customer ID
        const profilesData = await accountsService.getGoogleProfiles(channelIdNum, true);
        const profiles = profilesData.profiles || [];
        
        // Find profile matching the first customer ID
        const customerId = customerIds[0];
        const matchingProfile = profiles.find((p: any) => {
          const profileCustomerId = p.customer_id_raw || p.customer_id?.replace(/-/g, "");
          const targetCustomerId = customerId.replace(/-/g, "");
          return profileCustomerId === targetCustomerId;
        });

        const profileId = matchingProfile?.id || profiles[0]?.id;
        
        if (!profileId) {
          setError("No profile found for selected campaigns");
          setLoading(false);
          return;
        }

        const response = await googleAdwordsConversionActionsService.listConversionActions(
          accountIdNum,
          channelIdNum,
          profileId
        );

        if (response.success && response.conversion_actions) {
          setConversionActions(response.conversion_actions);
        } else {
          setError("Failed to load conversion actions");
        }
      } catch (err: any) {
        console.error("Error fetching conversion actions:", err);
        setError(err.message || "Failed to load conversion actions");
      } finally {
        setLoading(false);
      }
    };

    fetchConversionActions();
  }, [accountId, channelId, customerIds]);

  const handleToggleAction = (actionId: string) => {
    setSelectedActionIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(actionId)) {
        newSet.delete(actionId);
      } else {
        newSet.add(actionId);
      }
      return newSet;
    });
  };

  const handleApply = () => {
    if (selectedActionIds.size === 0) return;
    onApply(Array.from(selectedActionIds));
  };

  if (loading) {
    return (
      <div className="mb-4">
        <div className="border border-gray-200 rounded-xl p-4 bg-[#f9f9f6]">
          <div className="flex items-center justify-center py-8">
            <Loader size="sm" message="Loading conversion actions..." />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4">
        <div className="border border-gray-200 rounded-xl p-4 bg-[#f9f9f6]">
          <div className="text-[10.64px] text-red-600 mb-2">{error}</div>
          <button
            type="button"
            onClick={onCancel}
            className="cancel-button"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="border border-gray-200 rounded-xl p-4 bg-[#f9f9f6]">
        <div className="mb-3">
          <label className="block text-[10.64px] font-semibold text-[#556179] mb-2 uppercase">
            Select Conversion Actions
          </label>
          <div className="max-h-[200px] overflow-y-auto border border-gray-200 rounded-lg bg-[#FEFEFB]">
            {conversionActions.length === 0 ? (
              <div className="p-3 text-[10.64px] text-[#556179] text-center">
                No conversion actions available
              </div>
            ) : (
              conversionActions.map((action) => (
                <label
                  key={action.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedActionIds.has(action.id)}
                    onChange={() => handleToggleAction(action.id)}
                    className="w-4 h-4 text-[#136D6D] border-gray-300 rounded focus:ring-[#136D6D]"
                  />
                  <div className="flex-1">
                    <div className="text-[10.64px] font-medium text-[#313850]">
                      {action.name}
                    </div>
                    {action.category && (
                      <div className="text-[9px] text-[#556179]">
                        {action.category}
                      </div>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="cancel-button"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={selectedActionIds.size === 0}
            className="create-entity-button btn-sm"
          >
            Apply ({selectedActionIds.size} selected)
          </button>
        </div>
      </div>
    </div>
  );
};
