// Base Google Campaign Form Component
// This component contains all common fields shared across campaign types

import React from "react";
import { Dropdown } from "../../ui/Dropdown";
import type { CreateGoogleCampaignData } from "./types";
import { CAMPAIGN_TYPES, STATUS_OPTIONS } from "./utils";
import { GoogleBiddingStrategyForm } from "./GoogleBiddingStrategyForm";

function shouldShowBaseField(key: string, visibleKeys?: string[]): boolean {
  if (!visibleKeys || visibleKeys.length === 0) return true;
  return visibleKeys.includes(key);
}

interface BaseGoogleCampaignFormProps {
  formData: CreateGoogleCampaignData;
  errors: Partial<Record<keyof CreateGoogleCampaignData, string>>;
  onChange: (field: keyof CreateGoogleCampaignData, value: any) => void;
  mode?: "create" | "edit";
  // Google Profiles (optional when chatMode)
  googleProfiles?: Array<{
    value: string;
    label: string;
    customer_id: string;
    customer_id_raw: string;
    profile_id?: number;
  }>;
  selectedProfileId?: string;
  setSelectedProfileId?: (id: string) => void;
  loadingProfiles?: boolean;
  profilesError?: string | null;
  // Budgets (optional when chatMode / simpleBudgetMode)
  // When using existing budget: value=resource_name, label="Name ($X)", name=budget name. Custom: value=__CUSTOM__, label="Custom..."
  budgetOptions?: Array<{ value: string; label: string; name?: string }>;
  selectedBudgetId?: string;
  setSelectedBudgetId?: (id: string) => void;
  useCustomBudgetName?: boolean;
  setUseCustomBudgetName?: (value: boolean) => void;
  loadingBudgets?: boolean;
  // Quick fill handlers
  onQuickFillPerformanceMax?: () => void;
  onQuickFillShopping?: () => void;
  onQuickFillSearch?: () => void;
  onQuickFillDemandGen?: () => void;
  /** When true, hide Google Ads Account selector (e.g. on draft detail page) */
  hideProfileSelector?: boolean;
  /** When true, hide Campaign Type selector and quick fill buttons */
  hideCampaignType?: boolean;
  /** When true, use simple budget_amount/budget_name inputs instead of budget dropdown. Used by Assistant chat. */
  simpleBudgetMode?: boolean;
  /** When provided, only render base fields whose keys are in this list. Used by Assistant chat. */
  visibleKeys?: string[];
  /** When true, render fields one per line (single column). Used by Assistant chat. */
  flatLayout?: boolean;
}

export const BaseGoogleCampaignForm: React.FC<BaseGoogleCampaignFormProps> = ({
  formData,
  errors,
  onChange,
  mode = "create",
  googleProfiles = [],
  selectedProfileId = "",
  setSelectedProfileId = () => {},
  loadingProfiles = false,
  profilesError = null,
  budgetOptions = [],
  selectedBudgetId = "",
  setSelectedBudgetId = () => {},
  useCustomBudgetName = false,
  setUseCustomBudgetName = () => {},
  loadingBudgets = false,
  onQuickFillPerformanceMax,
  onQuickFillShopping,
  onQuickFillSearch,
  onQuickFillDemandGen,
  hideProfileSelector = false,
  hideCampaignType = false,
  simpleBudgetMode = false,
  visibleKeys,
  flatLayout = false,
}) => {
  const showField = (k: string) => shouldShowBaseField(k, visibleKeys);
  const gridClass = flatLayout
    ? "flex flex-col gap-3"
    : "grid grid-cols-1 md:grid-cols-3 gap-4";

  return (
    <>
      <div className={gridClass}>
        {/* Google Ads Account (Profile) - hidden on draft detail page */}
        {!hideProfileSelector && (
          <div>
            <label className="form-label">Google Ads Account *</label>
            <Dropdown<string>
              options={Array.isArray(googleProfiles) ? googleProfiles : []}
              value={selectedProfileId}
              onChange={(value) => {
                setSelectedProfileId(value);
              }}
              placeholder={
                loadingProfiles
                  ? "Loading accounts..."
                  : !Array.isArray(googleProfiles) ||
                      googleProfiles.length === 0
                    ? "No Google Ads accounts available"
                    : "Select Google Ads account"
              }
              buttonClassName="edit-button w-full"
              searchable={
                Array.isArray(googleProfiles) && googleProfiles.length > 5
              }
              searchPlaceholder="Search accounts..."
              emptyMessage={
                loadingProfiles
                  ? "Loading..."
                  : profilesError
                    ? profilesError
                    : "No Google Ads accounts found. Please enable Google Ads accounts first."
              }
              disabled={
                mode === "edit" ||
                loadingProfiles ||
                !Array.isArray(googleProfiles) ||
                googleProfiles.length === 0
              }
            />
            {profilesError && (
              <p className="text-[10px] text-red-500 mt-1">{profilesError}</p>
            )}
            {!loadingProfiles &&
              Array.isArray(googleProfiles) &&
              googleProfiles.length > 0 &&
              !profilesError && (
                <p className="text-[10px] text-gray-500 mt-1">
                  {googleProfiles.length} account(s) available
                </p>
              )}
          </div>
        )}

        {/* Campaign Type - hidden on draft detail page */}
        {!hideCampaignType && showField("campaign_type") && (
          <div>
            <label className="form-label">Campaign Type *</label>
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
                  {onQuickFillDemandGen && (
                    <button
                      type="button"
                      onClick={onQuickFillDemandGen}
                      className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-[10px] hover:bg-orange-200 transition-colors"
                      title="Quick fill Demand Gen (YouTube video) campaign with test data"
                    >
                      Quick Fill Demand Gen
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
        )}

        {/* Campaign Name */}
        {showField("name") && (
          <div>
            <label className="form-label">Campaign Name *</label>
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
        )}

        {/* Budget Amount */}
        {showField("budget_amount") && (
          <div>
            <label className="form-label">Budget Amount ($) *</label>
            <input
              type="number"
              data-field="budget_amount"
              name="budget_amount"
              step="0.01"
              min="0"
              value={
                formData.budget_amount !== undefined &&
                formData.budget_amount !== null
                  ? formData.budget_amount
                  : ""
              }
              onChange={(e) => {
                const value = e.target.value;
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && numValue >= 0) {
                  onChange("budget_amount", numValue);
                } else if (value === "") {
                  // Allow empty value while typing
                  onChange("budget_amount", undefined);
                }
              }}
              onBlur={(e) => {
                const value = e.target.value;
                if (value === "") {
                  onChange("budget_amount", undefined);
                }
              }}
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
        )}

        {/* Budget Name — list existing budgets in dropdown, or custom text when budget_name has a value */}
        {showField("budget_name") && (
          <div>
            <label className="form-label">Budget</label>
            {/* {!simpleBudgetMode && (
            <p className="text-[10px] text-gray-500 mt-0 mb-1">
              Select an existing budget to avoid creation errors, or choose Custom to create a new one.
            </p>
          )} */}
            {simpleBudgetMode ||
            useCustomBudgetName ||
            selectedBudgetId === "__CUSTOM__" ||
            (formData.budget_name != null && String(formData.budget_name).trim() !== "") ? (
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
                {!simpleBudgetMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomBudgetName?.(false);
                      setSelectedBudgetId?.("");
                      onChange("budget_name", "");
                      onChange("budget_resource_name", undefined);
                    }}
                    className="text-[10px] text-[#136D6D] mt-1 hover:underline"
                  >
                    ← Back to budget list
                  </button>
                )}
              </div>
            ) : (
              <Dropdown<string>
                options={budgetOptions}
                value={
                  selectedBudgetId ||
                  formData.budget_resource_name ||
                  (formData.budget_name &&
                  budgetOptions.find(
                    (opt) => opt.value === formData.budget_name,
                  )
                    ? formData.budget_name
                    : "") ||
                  ((formData.budget_name &&
                    budgetOptions.find(
                      (opt) => (opt.name || opt.label) === formData.budget_name,
                    )?.value) ??
                    "")
                }
                placeholder={
                  loadingBudgets
                    ? "Loading budgets..."
                    : "Select a budget or choose Custom..."
                }
                onChange={(value) => {
                  if (value === "__CUSTOM__") {
                    setUseCustomBudgetName(true);
                    setSelectedBudgetId("__CUSTOM__");
                    onChange("budget_name", "");
                    onChange("budget_resource_name", undefined);
                  } else {
                    const opt = budgetOptions.find((o) => o.value === value);
                    setUseCustomBudgetName(false);
                    setSelectedBudgetId(value);
                    onChange("budget_resource_name", value);
                    onChange("budget_name", opt?.name ?? opt?.label ?? value);
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
        )}

        {/* Start Date */}
        {showField("start_date") && (
          <div>
            <label className="form-label">Start Date*</label>
            {(() => {
              // Check if start date is today or in the past (only in edit mode)
              const isReadonly =
                mode === "edit" && formData.start_date
                  ? (() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const startDate = new Date(formData.start_date);
                      startDate.setHours(0, 0, 0, 0);
                      return startDate <= today;
                    })()
                  : false;

              return (
                <input
                  type="date"
                  value={formData.start_date || ""}
                  onChange={(e) => onChange("start_date", e.target.value)}
                  disabled={isReadonly}
                  className={`campaign-input w-full ${
                    isReadonly
                      ? "bg-gray-100 cursor-not-allowed opacity-60"
                      : ""
                  }`}
                  title={
                    isReadonly
                      ? "Start date cannot be changed if it's today or in the past"
                      : ""
                  }
                />
              );
            })()}
          </div>
        )}

        {/* End Date */}
        {showField("end_date") && (
          <div>
            <label className="form-label">End Date</label>
            <input
              type="date"
              value={formData.end_date || ""}
              onChange={(e) => onChange("end_date", e.target.value)}
              className={`campaign-input w-full ${
                errors.end_date ? "border-red-500" : ""
              }`}
            />
          </div>
        )}

        {/* Status */}
        {showField("status") && (
          <div>
            <label className="form-label">Status</label>
            <Dropdown<string>
              options={STATUS_OPTIONS}
              value={formData.status || "PAUSED"}
              onChange={(value) => onChange("status", value)}
              buttonClassName="edit-button w-full"
            />
          </div>
        )}
      </div>

      {/* Bidding Strategy Section - Only show for non-Search/Shopping/Performance Max campaigns (they have tabs) */}
      {formData.campaign_type !== "SEARCH" &&
        formData.campaign_type !== "SHOPPING" &&
        formData.campaign_type !== "PERFORMANCE_MAX" && (
          <div className="mt-6">
            <GoogleBiddingStrategyForm
              formData={formData}
              errors={errors}
              onChange={onChange}
              showTitle={true}
            />
          </div>
        )}
    </>
  );
};
