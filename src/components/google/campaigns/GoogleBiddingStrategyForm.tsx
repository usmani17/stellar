// Google Bidding Strategy Form Component
// Reusable component for bidding strategy configuration
// Used by BaseGoogleCampaignForm, GoogleSearchCampaignForm, and GoogleShoppingCampaignForm

import React from "react";
import { Dropdown } from "../../ui/Dropdown";
import type { BaseCampaignFormProps } from "./types";
import { getAvailableBiddingStrategies, getDefaultBiddingStrategy } from "./utils";

interface GoogleBiddingStrategyFormProps extends BaseCampaignFormProps {
  showTitle?: boolean; // Whether to show "Bidding Strategy" title (default: true)
  /** When provided, only render fields whose keys are in this list. Used by Assistant chat to show AI-requested fields only. */
  visibleKeys?: string[];
  /** When true, render fields one per line (single column). Used by Assistant chat. */
  flatLayout?: boolean;
}

const BIDDING_FORM_KEYS = {
  bidding_strategy_type: "bidding_strategy_type",
  target_cpa_micros: "target_cpa_micros",
  target_roas: "target_roas",
  target_spend_micros: "target_spend_micros",
  target_impression_share_location: "target_impression_share_location",
  target_impression_share_location_fraction_micros: "target_impression_share_location_fraction_micros",
  target_impression_share_cpc_bid_ceiling_micros: "target_impression_share_cpc_bid_ceiling_micros",
} as const;

function shouldShowField(key: string, visibleKeys?: string[]): boolean {
  if (!visibleKeys || visibleKeys.length === 0) return true;
  return visibleKeys.includes(key);
}

export const GoogleBiddingStrategyForm: React.FC<GoogleBiddingStrategyFormProps> = ({
  formData,
  errors,
  onChange,
  showTitle = true,
  visibleKeys,
  flatLayout = false,
}) => {
  const gridClass = flatLayout ? "flex flex-col gap-3" : "grid grid-cols-1 md:grid-cols-3 gap-4";

  return (
    <>
      {showTitle && (
        <h3 className="text-[15px] font-bold text-[#072929] mb-3">
          Bidding Strategy
        </h3>
      )}

      <div className="space-y-5">
        <div className={gridClass}>
          {/* Bidding Strategy Type */}
          {shouldShowField(BIDDING_FORM_KEYS.bidding_strategy_type, visibleKeys) && (
          <div>
            <label className="form-label">
              Strategy Type
            </label>
            <Dropdown<string>
              options={getAvailableBiddingStrategies(formData.campaign_type)}
              value={formData.bidding_strategy_type || getDefaultBiddingStrategy(formData.campaign_type)}
              onChange={(value) => onChange("bidding_strategy_type", value)}
              buttonClassName="edit-button w-full"
            />
          </div>
          )}

          {/* Target CPA (required when TARGET_CPA is selected) */}
          {shouldShowField(BIDDING_FORM_KEYS.target_cpa_micros, visibleKeys) && formData.bidding_strategy_type === "TARGET_CPA" && (
            <div>
              <label className="form-label">
                Target CPA ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.target_cpa_micros || ""}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value >= 0) {
                    onChange("target_cpa_micros", value);
                  } else if (e.target.value === "") {
                    onChange("target_cpa_micros", "");
                  }
                }}
                className={`campaign-input w-full ${
                  errors.target_cpa_micros ? "border-red-500" : "border-gray-200"
                }`}
                placeholder="1.00"
              />
              {errors.target_cpa_micros && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.target_cpa_micros}
                </p>
              )}
              <p className="text-[10px] text-[#556179] mt-1">
                Target cost per acquisition
              </p>
            </div>
          )}

          {/* Target ROAS (required when TARGET_ROAS is selected) */}
          {shouldShowField(BIDDING_FORM_KEYS.target_roas, visibleKeys) && formData.bidding_strategy_type === "TARGET_ROAS" && (
            <div>
              <label className="form-label">
                Target ROAS *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.target_roas || ""}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  onChange("target_roas", value);
                }}
                className={`campaign-input w-full ${
                  errors.target_roas ? "border-red-500" : "border-gray-200"
                }`}
                placeholder="3.0"
              />
              {errors.target_roas && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.target_roas}
                </p>
              )}
              <p className="text-[10px] text-[#556179] mt-1">
                Target return on ad spend
              </p>
            </div>
          )}

          {/* Target Spend (required when TARGET_SPEND is selected) */}
          {shouldShowField(BIDDING_FORM_KEYS.target_spend_micros, visibleKeys) && formData.bidding_strategy_type === "TARGET_SPEND" && (
            <div>
              <label className="form-label">
                Target Spend ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.target_spend_micros || ""}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value >= 0) {
                    onChange("target_spend_micros", value);
                  } else if (e.target.value === "") {
                    onChange("target_spend_micros", "");
                  }
                }}
                className={`campaign-input w-full ${
                  errors.target_spend_micros ? "border-red-500" : "border-gray-200"
                }`}
                placeholder="10.00"
              />
              {errors.target_spend_micros && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.target_spend_micros}
                </p>
              )}
              <p className="text-[10px] text-[#556179] mt-1">
                Target daily spend amount in dollars
              </p>
            </div>
          )}

          {/* Target Impression Share - Location */}
          {shouldShowField(BIDDING_FORM_KEYS.target_impression_share_location, visibleKeys) && formData.bidding_strategy_type === "TARGET_IMPRESSION_SHARE" && (
            <div className="col-span-full">
              <label className="form-label mb-3 block">
                Where do you want your ads to appear? *
              </label>
              {errors.target_impression_share_location && (
                <p className="text-[10px] text-red-500 mb-2">
                  {errors.target_impression_share_location}
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: "ANYWHERE_ON_PAGE", label: "Anywhere on results page", description: "Anywhere on the search results page" },
                  { value: "TOP_OF_PAGE", label: "Top of results page", description: "Top portion of the search results page" },
                  { value: "ABSOLUTE_TOP_OF_PAGE", label: "Absolute top of results page", description: "Very top of the search results page" },
                ].map((option) => (
                  <div
                    key={option.value}
                    onClick={() => onChange("target_impression_share_location", option.value)}
                    className={`border-2 rounded-lg p-4 bg-white cursor-pointer transition-all ${
                      (formData.target_impression_share_location || "TOP_OF_PAGE") === option.value
                        ? "border-forest-f40 bg-forest-f40/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <label className="flex flex-col gap-3 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="impression_share_location"
                          checked={(formData.target_impression_share_location || "TOP_OF_PAGE") === option.value}
                          onChange={() => onChange("target_impression_share_location", option.value)}
                          className="w-4 h-4 accent-forest-f40 border-gray-300 focus:ring-forest-f40"
                        />
                        <span className="text-[13px] text-[#072929] font-semibold">
                          {option.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#556179] ml-6">
                        {option.description}
                      </p>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Target Impression Share - Additional fields in same row */}
        {formData.bidding_strategy_type === "TARGET_IMPRESSION_SHARE" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shouldShowField(BIDDING_FORM_KEYS.target_impression_share_location_fraction_micros, visibleKeys) && (
            <div>
              <label className="form-label">
                Percent (%) impression share to target *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.target_impression_share_location_fraction_micros || ""}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value >= 0) {
                    onChange("target_impression_share_location_fraction_micros", value);
                  } else if (e.target.value === "") {
                    onChange("target_impression_share_location_fraction_micros", "");
                  }
                }}
                className={`campaign-input w-full ${
                  errors.target_impression_share_location_fraction_micros ? "border-red-500" : "border-gray-200"
                }`}
                placeholder="2.0"
              />
              {errors.target_impression_share_location_fraction_micros && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.target_impression_share_location_fraction_micros}
                </p>
              )}
              <p className="text-[10px] text-[#556179] mt-1">
                Target impression share percentage (0-100)
              </p>
            </div>
            )}

            {shouldShowField(BIDDING_FORM_KEYS.target_impression_share_cpc_bid_ceiling_micros, visibleKeys) && (
            <div>
              <label className="form-label">
                Maximum CPC bid limit *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.target_impression_share_cpc_bid_ceiling_micros || ""}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value >= 0) {
                    onChange("target_impression_share_cpc_bid_ceiling_micros", value);
                  } else if (e.target.value === "") {
                    onChange("target_impression_share_cpc_bid_ceiling_micros", "");
                  }
                }}
                className={`campaign-input w-full ${
                  errors.target_impression_share_cpc_bid_ceiling_micros ? "border-red-500" : "border-gray-200"
                }`}
                placeholder="3.00"
              />
              {errors.target_impression_share_cpc_bid_ceiling_micros && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.target_impression_share_cpc_bid_ceiling_micros}
                </p>
              )}
              <p className="text-[10px] text-[#556179] mt-1">
                Maximum CPC bid limit in dollars
              </p>
            </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
