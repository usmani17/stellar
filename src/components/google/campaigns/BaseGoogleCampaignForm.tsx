// Base Google Campaign Form Component
// This component contains all common fields shared across campaign types

import React from "react";
import { Dropdown } from "../../ui/Dropdown";
import type { CreateGoogleCampaignData } from "./types";
import {
  CAMPAIGN_TYPES,
  STATUS_OPTIONS,
  getAvailableBiddingStrategies,
  getDefaultBiddingStrategy,
} from "./utils";

interface BaseGoogleCampaignFormProps {
  formData: CreateGoogleCampaignData;
  errors: Partial<Record<keyof CreateGoogleCampaignData, string>>;
  onChange: (field: keyof CreateGoogleCampaignData, value: any) => void;
  mode?: "create" | "edit";
  // Google Profiles
  googleProfiles: Array<{ value: string; label: string; customer_id: string; customer_id_raw: string }>;
  selectedProfileId: string;
  setSelectedProfileId: (id: string) => void;
  loadingProfiles: boolean;
  profilesError: string | null;
  // Budgets
  budgetOptions: Array<{ value: string; label: string }>;
  selectedBudgetId: string;
  setSelectedBudgetId: (id: string) => void;
  useCustomBudgetName: boolean;
  setUseCustomBudgetName: (value: boolean) => void;
  loadingBudgets: boolean;
  // Quick fill handlers
  onQuickFillPerformanceMax?: () => void;
  onQuickFillShopping?: () => void;
  onQuickFillSearch?: () => void;
}

export const BaseGoogleCampaignForm: React.FC<BaseGoogleCampaignFormProps> = ({
  formData,
  errors,
  onChange,
  mode = "create",
  googleProfiles,
  selectedProfileId,
  setSelectedProfileId,
  loadingProfiles,
  profilesError,
  budgetOptions,
  selectedBudgetId,
  setSelectedBudgetId,
  useCustomBudgetName,
  setUseCustomBudgetName,
  loadingBudgets,
  onQuickFillPerformanceMax,
  onQuickFillShopping,
  onQuickFillSearch,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Google Ads Account (Profile) - Only show if more than one account */}
        {googleProfiles.length > 1 && (
          <div>
            <label className="form-label">
              Google Ads Account *
            </label>
            <Dropdown<string>
              options={googleProfiles}
              value={selectedProfileId}
              onChange={(value) => {
                setSelectedProfileId(value);
              }}
              placeholder={
                loadingProfiles
                  ? "Loading accounts..."
                  : googleProfiles.length === 0
                  ? "No Google Ads accounts available"
                  : "Select Google Ads account"
              }
              buttonClassName="w-full"
              searchable={googleProfiles.length > 5}
              searchPlaceholder="Search accounts..."
              emptyMessage={
                loadingProfiles
                  ? "Loading..."
                  : profilesError
                  ? profilesError
                  : "No Google Ads accounts found. Please enable Google Ads accounts first."
              }
              disabled={loadingProfiles}
            />
            {profilesError && (
              <p className="text-[10px] text-red-500 mt-1">
                {profilesError}
              </p>
            )}
            {!loadingProfiles && googleProfiles.length > 0 && !profilesError && (
              <p className="text-[10px] text-gray-500 mt-1">
                {googleProfiles.length} account(s) available
              </p>
            )}
          </div>
        )}

        {/* Campaign Type */}
        <div>
          <label className="form-label">
            Campaign Type *
          </label>
          <div className="space-y-2">
            <Dropdown<string>
              options={CAMPAIGN_TYPES}
              value={formData.campaign_type}
              onChange={(value) => onChange("campaign_type", value)}
              placeholder="Select campaign type"
              buttonClassName="edit-button w-full"
              disabled={mode === "edit"}
            />
            {/* Quick Fill Buttons for Testing */}
            {mode !== "edit" && (
              <div className="flex gap-2 flex-wrap">
                {onQuickFillPerformanceMax && (
                  <button
                    type="button"
                    onClick={onQuickFillPerformanceMax}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] hover:bg-blue-200 transition-colors"
                    title="Quick fill Performance Max campaign with test data"
                  >
                    Quick Fill PMax
                  </button>
                )}
                {onQuickFillShopping && (
                  <button
                    type="button"
                    onClick={onQuickFillShopping}
                    className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] hover:bg-green-200 transition-colors"
                    title="Quick fill Shopping campaign with test data"
                  >
                    Quick Fill Shopping
                  </button>
                )}
                {onQuickFillSearch && (
                  <button
                    type="button"
                    onClick={onQuickFillSearch}
                    className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-[10px] hover:bg-purple-200 transition-colors"
                    title="Quick fill Search campaign with test data"
                  >
                    Quick Fill Search
                  </button>
                )}
              </div>
            )}
          </div>
          {errors.campaign_type && (
            <p className="text-[10px] text-red-500 mt-1">
              {errors.campaign_type}
            </p>
          )}
        </div>

        {/* Campaign Name */}
        <div>
          <label className="form-label">
            Campaign Name *
          </label>
          <input
            type="text"
            data-field="name"
            name="name"
            value={formData.name}
            onChange={(e) => onChange("name", e.target.value)}
            className={`campaign-input w-full ${
              errors.name ? "border-red-500" : ""
            }`}
            placeholder="Enter campaign name"
          />
          {errors.name && (
            <p className="text-[10px] text-red-500 mt-1">{errors.name}</p>
          )}
        </div>

        {/* Budget Amount */}
        <div>
          <label className="form-label">
            Budget Amount ($) *
          </label>
          <input
            type="number"
            data-field="budget_amount"
            name="budget_amount"
            step="0.01"
            min="0"
            value={formData.budget_amount || ""}
            onChange={(e) =>
              onChange("budget_amount", parseFloat(e.target.value) || 0)
            }
            className={`campaign-input w-full ${
              errors.budget_amount ? "border-red-500" : ""
            }`}
            placeholder="0.00"
          />
          {errors.budget_amount && (
            <p className="text-[10px] text-red-500 mt-1">
              {errors.budget_amount}
            </p>
          )}
        </div>

        {/* Budget Name */}
        <div>
          <label className="form-label">
            Budget Name
          </label>
          {useCustomBudgetName || selectedBudgetId === "__CUSTOM__" ? (
            <div>
              <input
                type="text"
                value={formData.budget_name || ""}
                onChange={(e) => {
                  onChange("budget_name", e.target.value);
                }}
                className={`campaign-input w-full ${
                  errors.budget_name ? "border-red-500" : ""
                }`}
                placeholder="Enter custom budget name"
              />
              <button
                type="button"
                onClick={() => {
                  setUseCustomBudgetName(false);
                  setSelectedBudgetId("");
                  onChange("budget_name", "");
                }}
                className="text-[10px] text-[#136D6D] mt-1 hover:underline"
              >
                ← Back to budget list
              </button>
            </div>
          ) : (
            <Dropdown<string>
              options={budgetOptions}
              value={selectedBudgetId || (formData.budget_name && budgetOptions.find(opt => opt.value === formData.budget_name) ? formData.budget_name : "")}
              placeholder={loadingBudgets ? "Loading budgets..." : "Select a budget or choose Custom..."}
              onChange={(value) => {
                if (value === "__CUSTOM__") {
                  setUseCustomBudgetName(true);
                  setSelectedBudgetId("__CUSTOM__");
                  onChange("budget_name", "");
                } else {
                  setUseCustomBudgetName(false);
                  setSelectedBudgetId(value);
                  onChange("budget_name", value);
                }
              }}
              disabled={loadingBudgets}
              searchable={true}
              searchPlaceholder="Search budgets..."
              emptyMessage="No budgets found"
              buttonClassName="edit-button w-full"
            />
          )}
        </div>

        {/* Start Date */}
        <div>
          <label className="form-label">
            Start Date
          </label>
          {(() => {
            // Check if start date is today or in the past (only in edit mode)
            const isReadonly = mode === "edit" && formData.start_date ? (() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const startDate = new Date(formData.start_date);
              startDate.setHours(0, 0, 0, 0);
              return startDate <= today;
            })() : false;
            
            return (
              <input
                type="date"
                value={formData.start_date || ""}
                onChange={(e) => onChange("start_date", e.target.value)}
                disabled={isReadonly}
                className={`campaign-input w-full ${
                  isReadonly ? "bg-gray-100 cursor-not-allowed opacity-60" : ""
                }`}
                title={isReadonly ? "Start date cannot be changed if it's today or in the past" : ""}
              />
            );
          })()}
        </div>

        {/* End Date */}
        <div>
          <label className="form-label">
            End Date
          </label>
          <input
            type="date"
            value={formData.end_date || ""}
            onChange={(e) => onChange("end_date", e.target.value)}
            className={`campaign-input w-full ${
              errors.end_date ? "border-red-500" : ""
            }`}
          />
        </div>

        {/* Status */}
        <div>
          <label className="form-label">
            Status
          </label>
          <Dropdown<string>
            options={STATUS_OPTIONS}
            value={formData.status || "PAUSED"}
            onChange={(value) => onChange("status", value)}
            buttonClassName="edit-button w-full"
          />
        </div>
      </div>

      {/* Bidding Strategy Section */}
      <div className="mt-6">
        <h3 className="text-[15px] font-bold text-[#072929] mb-3">
          Bidding Strategy
        </h3>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bidding Strategy Type */}
          <div>
            <label className="form-label">
              Bidding Strategy
            </label>
            <Dropdown<string>
              options={getAvailableBiddingStrategies(formData.campaign_type)}
              value={formData.bidding_strategy_type || getDefaultBiddingStrategy(formData.campaign_type)}
              onChange={(value) => onChange("bidding_strategy_type", value)}
              buttonClassName="edit-button w-full"
            />
          </div>

          {/* Target CPA (required when TARGET_CPA is selected) */}
          {formData.bidding_strategy_type === "TARGET_CPA" && (
            <div>
              <label className="form-label">
                Target CPA ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.target_cpa_micros ? (formData.target_cpa_micros / 1000000).toFixed(2) : ""}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  onChange("target_cpa_micros", Math.round(value * 1000000));
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
          {formData.bidding_strategy_type === "TARGET_ROAS" && (
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
          {formData.bidding_strategy_type === "TARGET_SPEND" && (
            <div>
              <label className="form-label">
                Target Spend ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.target_spend_micros ? (formData.target_spend_micros / 1000000).toFixed(2) : ""}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  onChange("target_spend_micros", Math.round(value * 1000000));
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
          {formData.bidding_strategy_type === "TARGET_IMPRESSION_SHARE" && (
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
            <div>
              <label className="form-label">
                Percent (%) impression share to target *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.target_impression_share_location_fraction_micros ? (formData.target_impression_share_location_fraction_micros / 10000).toFixed(1) : ""}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  onChange("target_impression_share_location_fraction_micros", Math.round(value * 10000));
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

            <div>
              <label className="form-label">
                Maximum CPC bid limit *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.target_impression_share_cpc_bid_ceiling_micros ? (formData.target_impression_share_cpc_bid_ceiling_micros / 1000000).toFixed(2) : ""}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  onChange("target_impression_share_cpc_bid_ceiling_micros", Math.round(value * 1000000));
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
          </div>
        )}
        </div>
      </div>

    </>
  );
};
