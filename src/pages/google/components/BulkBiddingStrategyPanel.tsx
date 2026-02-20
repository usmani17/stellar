import React, { useState, useEffect } from "react";
import { Dropdown } from "../../../components/ui/Dropdown";

interface BulkBiddingStrategyPanelProps {
  selectedCampaigns: Set<string | number>;
  campaigns: Array<{
    campaign_id: string | number;
    campaign_name?: string;
    advertising_channel_type?: string;
    bidding_strategy_type?: string;
    target_cpa_micros?: number;
    target_roas?: number;
  }>;
  currencyCode?: string;
  onApply: (strategy: {
    bidding_strategy_type: string;
    target_cpa_micros?: number;
    target_roas?: number;
    target_impression_share_location?: string;
    target_impression_share_location_fraction_micros?: number;
    target_impression_share_cpc_bid_ceiling_micros?: number;
  }) => void;
  onCancel: () => void;
}

// Bidding strategy types by campaign type
const BIDDING_STRATEGIES = {
  SEARCH: [
    { value: "MANUAL_CPC", label: "Manual CPC" },
    { value: "MAXIMIZE_CONVERSIONS", label: "Maximize Conversions" },
    { value: "MAXIMIZE_CONVERSION_VALUE", label: "Maximize Conversion Value" },
    { value: "TARGET_IMPRESSION_SHARE", label: "Target Impression Share" },
    { value: "TARGET_SPEND", label: "Target Spend" },
  ],
  SHOPPING: [
    { value: "MANUAL_CPC", label: "Manual CPC" },
    { value: "MAXIMIZE_CONVERSION_VALUE", label: "Maximize Conversion Value" },
    { value: "TARGET_ROAS", label: "Target ROAS" },
  ],
  PERFORMANCE_MAX: [
    { value: "MAXIMIZE_CONVERSIONS", label: "Maximize Conversions" },
    { value: "MAXIMIZE_CONVERSION_VALUE", label: "Maximize Conversion Value" },
  ],
  DEMAND_GEN: [
    { value: "MAXIMIZE_CONVERSIONS", label: "Maximize Conversions" },
    { value: "MAXIMIZE_CONVERSION_VALUE", label: "Maximize Conversion Value" },
    { value: "TARGET_CPA", label: "Target CPA" },
    { value: "TARGET_ROAS", label: "Target ROAS" },
  ],
  DISPLAY: [
    { value: "MANUAL_CPC", label: "Manual CPC" },
    { value: "MAXIMIZE_CONVERSIONS", label: "Maximize Conversions" },
    { value: "MAXIMIZE_CONVERSION_VALUE", label: "Maximize Conversion Value" },
    { value: "TARGET_CPA", label: "Target CPA" },
    { value: "TARGET_ROAS", label: "Target ROAS" },
    { value: "TARGET_IMPRESSION_SHARE", label: "Target Impression Share" },
    { value: "TARGET_SPEND", label: "Target Spend" },
  ],
  DEFAULT: [
    { value: "MANUAL_CPC", label: "Manual CPC" },
    { value: "MAXIMIZE_CONVERSIONS", label: "Maximize Conversions" },
    { value: "MAXIMIZE_CONVERSION_VALUE", label: "Maximize Conversion Value" },
    { value: "TARGET_CPA", label: "Target CPA" },
    { value: "TARGET_ROAS", label: "Target ROAS" },
    { value: "TARGET_IMPRESSION_SHARE", label: "Target Impression Share" },
    { value: "TARGET_SPEND", label: "Target Spend" },
  ],
};

const IMPRESSION_SHARE_LOCATIONS = [
  { value: "ANYWHERE_ON_PAGE", label: "Anywhere on page" },
  { value: "TOP_OF_PAGE", label: "Top of page" },
  { value: "ABSOLUTE_TOP_OF_PAGE", label: "Absolute top of page" },
];

export const BulkBiddingStrategyPanel: React.FC<BulkBiddingStrategyPanelProps> = ({
  selectedCampaigns,
  campaigns,
  currencyCode = "USD",
  onApply,
  onCancel,
}) => {
  const [biddingStrategyType, setBiddingStrategyType] = useState<string>("");
  const [targetCpa, setTargetCpa] = useState<string>("");
  const [targetRoas, setTargetRoas] = useState<string>("");
  const [targetImpressionShareLocation, setTargetImpressionShareLocation] = useState<string>("");
  const [targetImpressionShareFraction, setTargetImpressionShareFraction] = useState<string>("");
  const [targetImpressionShareBidCeiling, setTargetImpressionShareBidCeiling] = useState<string>("");

  // Get campaign types from selected campaigns
  const campaignTypes = React.useMemo(() => {
    const selectedCampaignsData = campaigns.filter((c) =>
      selectedCampaigns.has(c.campaign_id)
    );
    const types = new Set<string>();
    selectedCampaignsData.forEach((c) => {
      const type = c.advertising_channel_type?.toUpperCase() || "DEFAULT";
      // Handle enum format: "ADVERTISING_CHANNEL_TYPE_SEARCH" -> "SEARCH"
      const cleanType = type.replace("ADVERTISING_CHANNEL_TYPE_", "");
      types.add(cleanType || "DEFAULT");
    });
    return Array.from(types);
  }, [campaigns, selectedCampaigns]);

  // Get available bidding strategies based on campaign types
  const availableStrategies = React.useMemo(() => {
    if (campaignTypes.length === 0) return BIDDING_STRATEGIES.DEFAULT;
    
    // If all campaigns are the same type, use that type's strategies
    if (campaignTypes.length === 1) {
      const type = campaignTypes[0] as keyof typeof BIDDING_STRATEGIES;
      return BIDDING_STRATEGIES[type] || BIDDING_STRATEGIES.DEFAULT;
    }
    
    // If multiple types, find intersection of allowed strategies
    const strategySets = campaignTypes.map((type) => {
      const typeKey = type as keyof typeof BIDDING_STRATEGIES;
      return new Set((BIDDING_STRATEGIES[typeKey] || BIDDING_STRATEGIES.DEFAULT).map(s => s.value));
    });
    
    const intersection = strategySets.reduce((acc, set) => {
      return new Set([...acc].filter(x => set.has(x)));
    }, strategySets[0]);
    
    return BIDDING_STRATEGIES.DEFAULT.filter(s => intersection.has(s.value));
  }, [campaignTypes]);

  // Reset dependent fields when strategy changes
  useEffect(() => {
    if (biddingStrategyType !== "TARGET_CPA") {
      setTargetCpa("");
    }
    if (biddingStrategyType !== "TARGET_ROAS") {
      setTargetRoas("");
    }
    if (biddingStrategyType !== "TARGET_IMPRESSION_SHARE") {
      setTargetImpressionShareLocation("");
      setTargetImpressionShareFraction("");
      setTargetImpressionShareBidCeiling("");
    }
  }, [biddingStrategyType]);

  const handleApply = () => {
    if (!biddingStrategyType) return;

    const strategy: any = {
      bidding_strategy_type: biddingStrategyType,
    };

    if (biddingStrategyType === "TARGET_CPA" && targetCpa) {
      // Convert to micros (multiply by 1,000,000)
      strategy.target_cpa_micros = Math.round(parseFloat(targetCpa) * 1000000);
    }

    if (biddingStrategyType === "TARGET_ROAS" && targetRoas) {
      strategy.target_roas = parseFloat(targetRoas);
    }

    if (biddingStrategyType === "TARGET_IMPRESSION_SHARE") {
      if (targetImpressionShareLocation) {
        strategy.target_impression_share_location = targetImpressionShareLocation;
      }
      if (targetImpressionShareFraction) {
        // Convert percentage to micros (e.g., 50% = 500000 micros)
        strategy.target_impression_share_location_fraction_micros = Math.round(
          parseFloat(targetImpressionShareFraction) * 10000
        );
      }
      if (targetImpressionShareBidCeiling) {
        // Convert to micros
        strategy.target_impression_share_cpc_bid_ceiling_micros = Math.round(
          parseFloat(targetImpressionShareBidCeiling) * 1000000
        );
      }
    }

    onApply(strategy);
  };

  const isValid = () => {
    if (!biddingStrategyType) return false;
    
    if (biddingStrategyType === "TARGET_CPA") {
      return targetCpa && parseFloat(targetCpa) > 0;
    }
    
    if (biddingStrategyType === "TARGET_ROAS") {
      return targetRoas && parseFloat(targetRoas) > 0;
    }
    
    if (biddingStrategyType === "TARGET_IMPRESSION_SHARE") {
      return targetImpressionShareLocation && targetImpressionShareFraction;
    }
    
    return true;
  };

  return (
    <div className="mb-4">
      <div className="border border-gray-200 rounded-xl p-4 bg-[#f9f9f6]">
        <div className="flex flex-wrap items-end gap-3 justify-between">
          <div className="w-[200px]">
            <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
              Bidding Strategy
            </label>
            <Dropdown
              options={availableStrategies}
              value={biddingStrategyType}
              onChange={(val) => setBiddingStrategyType(val as string)}
              buttonClassName="edit-button google-table-dropdown w-full"
              width="w-full"
              placeholder="Select strategy"
            />
          </div>

          {biddingStrategyType === "TARGET_CPA" && (
            <div className="w-[160px]">
              <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                Target CPA
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={targetCpa}
                  onChange={(e) => setTargetCpa(e.target.value)}
                  className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.64px] text-[#556179]">
                  {currencyCode}
                </span>
              </div>
            </div>
          )}

          {biddingStrategyType === "TARGET_ROAS" && (
            <div className="w-[160px]">
              <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                Target ROAS
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={targetRoas}
                onChange={(e) => setTargetRoas(e.target.value)}
                className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                placeholder="0.00"
              />
            </div>
          )}

          {biddingStrategyType === "TARGET_IMPRESSION_SHARE" && (
            <>
              <div className="w-[180px]">
                <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                  Location
                </label>
                <Dropdown
                  options={IMPRESSION_SHARE_LOCATIONS}
                  value={targetImpressionShareLocation}
                  onChange={(val) => setTargetImpressionShareLocation(val as string)}
                  buttonClassName="edit-button google-table-dropdown w-full"
                  width="w-full"
                  placeholder="Select location"
                />
              </div>
              <div className="w-[140px]">
                <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                  Target Share %
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={targetImpressionShareFraction}
                  onChange={(e) => setTargetImpressionShareFraction(e.target.value)}
                  className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                  placeholder="0.0"
                />
              </div>
              <div className="w-[160px]">
                <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                  Bid Ceiling (optional)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={targetImpressionShareBidCeiling}
                    onChange={(e) => setTargetImpressionShareBidCeiling(e.target.value)}
                    className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.64px] text-[#556179]">
                    {currencyCode}
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-2 ml-auto">
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
              disabled={!isValid()}
              className="create-entity-button btn-sm"
            >
              Apply
            </button>
          </div>
        </div>
        {campaignTypes.length > 1 && (
          <div className="mt-2 text-[10px] text-[#556179]">
            Note: Selected campaigns have different types. Only strategies compatible with all types are shown.
          </div>
        )}
      </div>
    </div>
  );
};
