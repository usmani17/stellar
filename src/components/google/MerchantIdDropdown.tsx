/**
 * Reusable Merchant ID Dropdown Component
 * Fetches and displays merchant accounts with refresh capability
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Dropdown } from "../ui/Dropdown";
import { campaignsService } from "../../services/campaigns";

interface MerchantIdDropdownProps {
  value: string;
  onChange: (value: string) => void;
  accountId?: string;
  channelId?: string;
  selectedProfileId?: string;
  campaignType?: string;
  isOpen?: boolean;
  errors?: Record<string, string>;
  disabled?: boolean;
  showAccountCount?: boolean;
  mode?: "create" | "edit";
}

export const MerchantIdDropdown: React.FC<MerchantIdDropdownProps> = ({
  value,
  onChange,
  accountId,
  channelId,
  selectedProfileId,
  campaignType = "SHOPPING",
  isOpen = true,
  errors,
  disabled = false,
  showAccountCount = true,
  mode = "create",
}) => {
  const [merchantAccountOptions, setMerchantAccountOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [loadingMerchantAccounts, setLoadingMerchantAccounts] = useState(false);
  const [merchantAccountsError, setMerchantAccountsError] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const fetchMerchantAccounts = useCallback(async () => {
    if (
      !accountId ||
      campaignType !== "SHOPPING" ||
      !selectedProfileId ||
      !channelId
    ) {
      setMerchantAccountOptions([]);
      setMerchantAccountsError(null);
      console.warn('Not Valid',{ accountId, campaignType, selectedProfileId, channelId });
      return;
    }

    setLoadingMerchantAccounts(true);
    setMerchantAccountsError(null);

    try {
      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = parseInt(channelId, 10);
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }
      const accounts = await campaignsService.getGoogleMerchantAccounts(
        accountIdNum,
        channelIdNum,
        selectedProfileId
      );
      setMerchantAccountOptions(accounts);

      if (accounts.length === 0) {
        setMerchantAccountsError(
          "No Merchant Center accounts found. Please link a Merchant Center account to your Google Ads account."
        );
      } else {
        setMerchantAccountsError(null);
        if (!value && accounts.length > 0) {
          onChangeRef.current(accounts[0].value);
        }
      }
    } catch (error: unknown) {
      console.error("Error fetching merchant accounts:", error);
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to fetch Merchant Center accounts";
      setMerchantAccountsError(errorMessage);
      setMerchantAccountOptions([]);
    } finally {
      setLoadingMerchantAccounts(false);
    }
  }, [accountId, channelId, campaignType, selectedProfileId, value]);

  useEffect(() => {
    if (
      !isOpen ||
      campaignType !== "SHOPPING" ||
      !accountId ||
      !selectedProfileId ||
      !channelId
    ) {
      if (campaignType !== "SHOPPING") {
        setMerchantAccountOptions([]);
        setMerchantAccountsError(null);
      }
      return;
    }

    fetchMerchantAccounts();
  }, [isOpen, campaignType, accountId, selectedProfileId, channelId, fetchMerchantAccounts]);

  const isDropdownDisabled =
    disabled ||
    loadingMerchantAccounts ||
    (mode === "edit" && campaignType === "SHOPPING");
  const hasError = errors?.merchant_id;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="form-label mb-0">Merchant ID *</label>
        <button
          type="button"
          onClick={fetchMerchantAccounts}
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
        value={value || ""}
        onChange={onChange}
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
        disabled={isDropdownDisabled}
      />
      {hasError && (
        <p className="text-[10px] text-red-500 mt-1">{errors?.merchant_id}</p>
      )}
      {merchantAccountsError && !hasError && (
        <p className="text-[10px] text-yellow-600 mt-1">{merchantAccountsError}</p>
      )}
      {!loadingMerchantAccounts &&
        merchantAccountOptions.length > 0 &&
        !merchantAccountsError &&
        showAccountCount && (
          <p className="text-[10px] text-gray-500 mt-1">
            {merchantAccountOptions.length} merchant account(s) available
          </p>
        )}
    </div>
  );
};
