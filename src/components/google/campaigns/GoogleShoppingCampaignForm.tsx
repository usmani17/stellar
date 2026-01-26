// Shopping Campaign Form Component
// This component handles Shopping campaign-specific fields

import React from "react";
import { Dropdown } from "../../ui/Dropdown";
import type { ShoppingCampaignFormProps } from "./types";
import { SALES_COUNTRY_OPTIONS, CAMPAIGN_PRIORITY_OPTIONS, DEVICE_OPTIONS } from "./utils";
import { GoogleLanguageTargetingForm } from "./GoogleLanguageTargetingForm";

export const GoogleShoppingCampaignForm: React.FC<ShoppingCampaignFormProps> = ({
  formData,
  errors,
  onChange,
  mode = "create",
  merchantAccountOptions,
  loadingMerchantAccounts,
  merchantAccountsError,
  onFetchMerchantAccounts,
  languageOptions = [],
  loadingLanguages = false,
}) => {
  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
        Shopping Settings
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Merchant ID */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="form-label mb-0">
              Merchant ID *
            </label>
            <button
              type="button"
              onClick={onFetchMerchantAccounts}
              disabled={loadingMerchantAccounts}
              className="text-[10px] text-[#136D6D] hover:text-[#0e5a5a] disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              title="Refresh merchant accounts list"
            >
              <svg
                className={`w-3 h-3 ${loadingMerchantAccounts ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {loadingMerchantAccounts ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <Dropdown<string>
            options={merchantAccountOptions}
            value={formData.merchant_id || ""}
            onChange={(value) => {
              onChange("merchant_id", value);
            }}
            placeholder={
              loadingMerchantAccounts
                ? "Loading merchant accounts..."
                : merchantAccountOptions.length === 0
                ? "No merchant accounts available"
                : "Select merchant account"
            }
            buttonClassName="edit-button w-full"
            searchable={true}
            searchPlaceholder="Search merchant accounts..."
            emptyMessage={
              loadingMerchantAccounts
                ? "Loading..."
                : merchantAccountsError
                ? merchantAccountsError
                : "No Merchant Center accounts found. Please link a Merchant Center account to your Google Ads account."
            }
            disabled={loadingMerchantAccounts || (mode === "edit" && formData.campaign_type === "SHOPPING")}
          />
          {errors.merchant_id && (
            <p className="text-[10px] text-red-500 mt-1">
              {errors.merchant_id}
            </p>
          )}
          {merchantAccountsError && !errors.merchant_id && (
            <p className="text-[10px] text-yellow-600 mt-1">
              {merchantAccountsError}
            </p>
          )}
          {!loadingMerchantAccounts && merchantAccountOptions.length > 0 && !merchantAccountsError && (
            <p className="text-[10px] text-gray-500 mt-1">
              {merchantAccountOptions.length} merchant account(s) available
            </p>
          )}
        </div>

        {/* Sales Country */}
        <div>
          <label className="form-label">
            Sales Country
          </label>
          <Dropdown<string>
            options={SALES_COUNTRY_OPTIONS}
            value={formData.sales_country || "US"}
            onChange={(value) => onChange("sales_country", value)}
            buttonClassName="edit-button w-full"
            disabled={mode === "edit" && formData.campaign_type === "SHOPPING"}
          />
        </div>

        {/* Campaign Priority */}
        <div>
          <label className="form-label">
            Campaign Priority
          </label>
          <Dropdown<number>
            options={CAMPAIGN_PRIORITY_OPTIONS}
            value={formData.campaign_priority || 0}
            onChange={(value) => onChange("campaign_priority", value)}
            buttonClassName="w-full edit-button"
          />
          <p className="text-[10px] text-[#556179] mt-1">
            Priority determines how your Shopping campaigns compete with each other. Low (0) = lowest priority, High (2) = highest priority.
          </p>
        </div>

        {/* Enable Local */}
        <div className="pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enable_local || false}
              onChange={(e) =>
                onChange("enable_local", e.target.checked)
              }
              className={`w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40 ${
                errors.enable_local ? "border-red-500" : ""
              }`}
            />
            <span className="form-label mb-0">
              Enable Local
            </span>
          </label>
          <p className="text-[10px] text-[#556179] mt-1 ml-6">
            Enable local inventory ads to show your products to nearby customers with local inventory available.
          </p>
        </div>
      </div>

      {/* Network Settings */}
      <div className="mt-6">
        <h3 className="text-[15px] font-bold text-[#072929] mb-3">
          Network Settings
        </h3>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Search Network card */}
          <div 
            className={`border rounded-lg p-4 bg-white transition-colors cursor-pointer ${
              formData.network_settings?.target_search_network
                ? "border-forest-f40 bg-forest-f40/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() =>
              onChange("network_settings", {
                target_google_search: formData.network_settings?.target_google_search ?? true,
                target_search_network: !formData.network_settings?.target_search_network,
                target_content_network:
                  formData.network_settings?.target_content_network ?? false,
                target_partner_search_network:
                  formData.network_settings?.target_partner_search_network ?? false,
              })
            }
          >
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[13px] font-semibold text-[#072929]">
                Search Network
              </h4>
              {formData.network_settings?.target_search_network && (
                <span className="text-[10px] px-2 py-0.5 bg-forest-f40/20 text-forest-f40 rounded font-medium">
                  Enabled
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#556179] mb-3">
              Ads can appear near Google Search results and other Google sites
              when people search for terms that are relevant to your products.
            </p>
            <label 
              className="flex items-center gap-2 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={formData.network_settings?.target_search_network ?? true}
                onChange={(e) => {
                  e.stopPropagation();
                  onChange("network_settings", {
                    target_google_search: formData.network_settings?.target_google_search ?? true,
                    target_search_network: e.target.checked,
                    target_content_network:
                      formData.network_settings?.target_content_network ?? false,
                    target_partner_search_network:
                      formData.network_settings?.target_partner_search_network ?? false,
                  });
                }}
                className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
              />
              <span className="text-[12px] text-[#072929]">
                Include Google search partners
              </span>
            </label>
          </div>

          {/* Display Network card */}
          <div 
            className={`border rounded-lg p-4 bg-white transition-colors cursor-pointer ${
              formData.network_settings?.target_content_network
                ? "border-forest-f40 bg-forest-f40/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() =>
              onChange("network_settings", {
                target_google_search: formData.network_settings?.target_google_search ?? true,
                target_search_network:
                  formData.network_settings?.target_search_network ?? true,
                target_content_network: !formData.network_settings?.target_content_network,
                target_partner_search_network:
                  formData.network_settings?.target_partner_search_network ?? false,
              })
            }
          >
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[13px] font-semibold text-[#072929]">
                Display Network
              </h4>
              {formData.network_settings?.target_content_network && (
                <span className="text-[10px] px-2 py-0.5 bg-forest-f40/20 text-forest-f40 rounded font-medium">
                  Enabled
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#556179] mb-3">
              Easy way to get additional conversions at similar or lower costs than
              Search with unused Search budget.
            </p>
            <label 
              className="flex items-center gap-2 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={formData.network_settings?.target_content_network ?? false}
                onChange={(e) => {
                  e.stopPropagation();
                  onChange("network_settings", {
                    target_google_search: formData.network_settings?.target_google_search ?? true,
                    target_search_network:
                      formData.network_settings?.target_search_network ?? true,
                    target_content_network: e.target.checked,
                    target_partner_search_network:
                      formData.network_settings?.target_partner_search_network ?? false,
                  });
                }}
                className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
              />
              <span className="text-[12px] text-[#072929]">
                Include Google Display Network
              </span>
            </label>
          </div>
        </div>
        </div>
      </div>

      {/* Device Targeting */}
      <div className="mt-6">
        <h3 className="text-[15px] font-bold text-[#072929] mb-3">
          Device Targeting
        </h3>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DEVICE_OPTIONS.map((device) => (
            <div key={device.value} className="border border-gray-200 rounded-lg p-4 bg-white">
              <label className="flex flex-col items-center gap-2 cursor-pointer">
                <div className="text-3xl mb-1">{device.icon}</div>
                <input
                  type="checkbox"
                  checked={formData.device_ids?.includes(device.value) ?? false}
                  onChange={(e) => {
                    const currentIds = formData.device_ids || [];
                    if (e.target.checked) {
                      onChange("device_ids", [...currentIds, device.value]);
                    } else {
                      onChange("device_ids", currentIds.filter(id => id !== device.value));
                    }
                  }}
                  className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                />
                <span className="text-[12px] text-[#072929] font-medium">
                  {device.label}
                </span>
              </label>
            </div>
          ))}
          </div>
          <p className="text-[10px] text-[#556179] mt-4">
            Select devices to target. If none selected, ads will show on all devices.
          </p>
        </div>
      </div>

      {/* Language Targeting - Available for Shopping campaigns */}
      {languageOptions && languageOptions.length > 0 && (
        <GoogleLanguageTargetingForm
          languageIds={formData.language_ids}
          languageOptions={languageOptions}
          loadingLanguages={loadingLanguages || false}
          onLanguageIdsChange={(ids: string[] | undefined) => onChange("language_ids", ids)}
          errors={errors}
        />
      )}
    </div>
  );
};
