import React, { useState, useRef, useEffect, useCallback } from "react";
import { Dropdown, type DropdownOption } from "../ui/Dropdown";
import { Chip } from "../ui/Chip";
import { Checkbox } from "../ui/Checkbox";
import { accountsService } from "../../services/accounts";

export interface FilterItem {
  id: string;
  field:
    | "campaign_name"
    | "state"
    | "budget"
    | "type"
    | "targeting_type"
    | "profile_name"
    | "status"
    | "advertising_channel_type"
    | "account_name"
    | "name"
    | "default_bid"
    | "spends"
    | "sales"
    | "ctr"
    | "bid"
    | "adgroup_name"
    | "sku"
    | "adId"
    | "asin"
    | "adGroupId"
    | "keywordText"
    | "keyword_text"
    | "match_type"
    | "expression";
  operator?: string; // For campaign_name, budget, profile_name, account_name, name, default_bid, spends, sales, ctr, bid, adgroup_name, sku, adId, asin, adGroupId, keywordText, keyword_text, match_type, expression
  value: string | number | string[] | { min: number; max: number }; // Support arrays for multi-select fields (type, state, profile_name), and object for "between" operator
}

export type FilterValues = FilterItem[];

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterValues) => void;
  initialFilters?: FilterValues;
  filterFields?: Array<{ value: string; label: string }>;
  accountId?: string;
  channelType?: "amazon" | "google" | "walmart" | "tiktok";
  useUppercaseState?: boolean;
}

const DEFAULT_FILTER_FIELDS = [
  { value: "campaign_name", label: "Campaign Name" },
  { value: "state", label: "State" },
  { value: "budget", label: "Budget" },
  { value: "type", label: "Type" },
  { value: "targeting_type", label: "Targeting Type" },
  { value: "profile_name", label: "Profile" },
] as const;

const GOOGLE_FILTER_FIELDS = [
  { value: "campaign_name", label: "Campaign Name" },
  { value: "status", label: "Status" },
  { value: "budget", label: "Budget" },
  { value: "advertising_channel_type", label: "Channel Type" },
  { value: "account_name", label: "Account Name" },
] as const;

const STRING_OPERATORS = [
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does Not Contain" },
  { value: "equals", label: "Equals" },
];

const NUMERIC_OPERATORS = [
  { value: "lt", label: "<" },
  { value: "gt", label: ">" },
  { value: "eq", label: "=" },
  { value: "lte", label: "<=" },
  { value: "gte", label: ">=" },
];

const STATE_OPTIONS = ["Enabled", "Paused", "Archived"];
const TIKTOK_STATE_OPTIONS = ["Enabled", "Paused", "Deleted"];
const TYPE_OPTIONS = ["SP", "SB", "SD"];
const TIKTOK_TYPE_OPTIONS = [
  "TRAFFIC",
  "CONVERSIONS",
  "APP_PROMOTION",
  "REACH",
  "VIDEO_VIEWS",
  "LEAD_GENERATION",
  "PRODUCT_SALES",
  "ENGAGEMENT",
];
const TARGETING_TYPE_OPTIONS = ["AUTO", "MANUAL"];
const STATUS_OPTIONS = ["ENABLED", "PAUSED", "REMOVED"];
const MATCH_TYPE_OPTIONS = ["EXACT", "PHRASE", "BROAD"];
// Expression types supported for negative targets
const EXPRESSION_TYPE_OPTIONS = [
  { value: "ASIN_BRAND_SAME_AS", label: "ASIN Brand Same As" },
  { value: "ASIN_SAME_AS", label: "ASIN Same As" },
];
const CHANNEL_TYPE_OPTIONS = [
  "SEARCH",
  "DISPLAY",
  "SHOPPING",
  "PERFORMANCE_MAX",
  "VIDEO",
  "HOTEL",
  "MULTI_CHANNEL",
  "LOCAL",
  "SMART",
];
const ASSET_TYPE_OPTIONS = ["Image", "Video"];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  onApply,
  initialFilters = [],
  filterFields,
  accountId,
  channelType,
  useUppercaseState = false,
}) => {
  // Use initialFilters directly as the source of truth - no internal state sync
  // This prevents infinite loops when parent updates filters
  const [activeFilters, setActiveFilters] =
    useState<FilterValues>(initialFilters);
  const [selectedField, setSelectedField] = useState<string>("");
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  const [filterValue, setFilterValue] = useState<string>("");
  const [selectedMultiValues, setSelectedMultiValues] = useState<string[]>([]); // For multi-select fields (type, state, profile_name)
  const [expressionType, setExpressionType] = useState<string>("ASIN_SAME_AS");
  const [profileOptions, setProfileOptions] = useState<
    Array<{
      value: string;
      label: string;
      profileName?: string;
      profileId?: string;
    }>
  >([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const isInitialMountRef = useRef(true);
  const profilesLoadedRef = useRef(false);
  const loadingProfilesRef = useRef(false);

  // Only sync on initial mount, not on every prop change
  // This prevents infinite loops - parent component manages filter state
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      setActiveFilters(initialFilters);
    }
  }, []); // Empty deps - only run on mount

  // Shared function to load profiles
  const loadProfiles = useCallback(async () => {
    if (!accountId || channelType !== "amazon") return;

    // Prevent concurrent requests
    if (loadingProfilesRef.current) return;

    // If already loaded, don't reload
    if (profilesLoadedRef.current) return;

    try {
      loadingProfilesRef.current = true;
      setLoadingProfiles(true);
      // Get channels for the account
      const channels = await accountsService.getAccountChannels(
        parseInt(accountId)
      );
      const amazonChannel = channels.find((ch) => ch.channel_type === "amazon");

      if (amazonChannel) {
        // Fetch active profiles (is_selected=true, deleted_at is null)
        const response = await accountsService.getProfiles(amazonChannel.id);
        const activeProfiles = (response.profiles || []).filter(
          (profile: any) => profile.is_selected && !profile.deleted_at
        );

        const options = activeProfiles.map((profile: any) => {
          const profileName = profile.name || profile.profileId || "";
          const profileId = profile.profileId || profile.id || "";
          const countryCode = profile.countryCode || profile.country_code || "";
          const label = countryCode
            ? `${profileName} (${countryCode})`
            : profileName;
          // Use profileId as value to ensure uniqueness, or fallback to composite key
          const uniqueValue = profileId || `${profileName}|${countryCode}`;
          return {
            value: uniqueValue,
            label: label,
            profileName: profileName,
            profileId: profileId,
          };
        });

        setProfileOptions(options);
        profilesLoadedRef.current = true;
      }
    } catch (error) {
      console.error("Failed to load profiles:", error);
      setProfileOptions([]);
      profilesLoadedRef.current = false;
    } finally {
      setLoadingProfiles(false);
      loadingProfilesRef.current = false;
    }
  }, [accountId, channelType]);

  // Reset loaded flag when account or channel changes
  useEffect(() => {
    profilesLoadedRef.current = false;
    setProfileOptions([]);
  }, [accountId, channelType]);

  // Preload profiles when panel opens (if Amazon channel) - only once
  useEffect(() => {
    if (
      isOpen &&
      accountId &&
      channelType === "amazon" &&
      !profilesLoadedRef.current &&
      !loadingProfilesRef.current
    ) {
      loadProfiles();
    }
  }, [isOpen, accountId, channelType, loadProfiles]);

  // Fetch profiles immediately when profile_name is selected
  useEffect(() => {
    const isProfileDropdown =
      selectedField === "profile_name" && channelType === "amazon";

    // If not profile dropdown, don't clear options (keep them for when user switches back)
    if (!isProfileDropdown) {
      // Clear operator when switching away from profile dropdown
      if (selectedField !== "profile_name") {
        setSelectedOperator("");
      }
      return;
    }

    // Load profiles immediately when profile_name is selected (if not already loaded)
    if (!profilesLoadedRef.current && !loadingProfilesRef.current) {
      loadProfiles();
    }
  }, [selectedField, channelType, loadProfiles]);

  // Clear operator when profiles load and dropdown becomes available
  useEffect(() => {
    const isProfileDropdown =
      selectedField === "profile_name" &&
      channelType === "amazon" &&
      profileOptions.length > 0;

    if (isProfileDropdown && selectedOperator) {
      setSelectedOperator("");
    }
  }, [profileOptions.length, selectedField, channelType, selectedOperator]);

  // Sync selectedMultiValues when profile_name field is selected and profileOptions are loaded
  // This handles the case where filters are already applied and panel is reopened
  useEffect(() => {
    if (
      selectedField === "profile_name" &&
      channelType === "amazon" &&
      profileOptions.length > 0
    ) {
      // Find existing filter for profile_name
      const existingFilter = activeFilters.find(
        (f) => f.field === "profile_name"
      );
      if (existingFilter) {
        if (Array.isArray(existingFilter.value)) {
          // Map profile names back to unique values
          const uniqueValues = existingFilter.value
            .map((profileName: string) => {
              const option = profileOptions.find(
                (opt) => opt.profileName === profileName
              );
              return option?.value;
            })
            .filter((v): v is string => v !== undefined);
          if (uniqueValues.length > 0) {
            setSelectedMultiValues(uniqueValues);
          }
        }
      }
    } else if (selectedField !== "profile_name") {
      // Clear selectedMultiValues when switching away from profile_name
      setSelectedMultiValues([]);
    }
  }, [selectedField, profileOptions, activeFilters, channelType]);

  // Apply filters when component unmounts (panel closes) if they changed
  useEffect(() => {
    return () => {
      // Cleanup function runs when component unmounts
      // Check if filters changed and apply them
      const filtersChanged =
        JSON.stringify(activeFilters) !== JSON.stringify(initialFilters);
      if (filtersChanged) {
        onApply(activeFilters);
      }
    };
  }, [activeFilters, initialFilters, onApply]);

  const FILTER_FIELDS = filterFields || DEFAULT_FILTER_FIELDS;

  // Get next available filter field that hasn't been used
  // Multi-select fields (type, state, targeting_type, profile_name) can't be added again once applied
  const getNextAvailableField = (): string => {
    const usedFields = new Set(activeFilters.map((f) => f.field));
    const availableField = FILTER_FIELDS.find(
      (f) => !usedFields.has(f.value as FilterItem["field"])
    );
    return availableField?.value || FILTER_FIELDS[0]?.value || "";
  };

  // Auto-select first filter and operator when panel opens
  useEffect(() => {
    if (isOpen && !selectedField && FILTER_FIELDS.length > 0) {
      const firstField = getNextAvailableField();
      if (firstField) {
        setSelectedField(firstField);

        // Auto-select first operator if field needs operator
        // Don't auto-select for profile dropdown
        const isProfileDropdownField =
          firstField === "profile_name" && channelType === "amazon";
        const needsOp =
          !isProfileDropdownField &&
          (firstField === "campaign_name" ||
            firstField === "budget" ||
            firstField === "profile_name" ||
            firstField === "account_name" ||
            firstField === "name" ||
            firstField === "default_bid" ||
            firstField === "spends" ||
            firstField === "sales" ||
            firstField === "ctr" ||
            firstField === "bid" ||
            firstField === "adgroup_name" ||
            firstField === "keywordText" ||
            firstField === "keyword_text");

        if (needsOp) {
          // For string fields, use "contains", for numeric use "eq"
          if (
            firstField === "campaign_name" ||
            firstField === "profile_name" ||
            firstField === "account_name" ||
            firstField === "name" ||
            firstField === "adgroup_name"
          ) {
            setSelectedOperator(STRING_OPERATORS[0]?.value || "");
          } else if (
            firstField === "budget" ||
            firstField === "default_bid" ||
            firstField === "spends" ||
            firstField === "sales" ||
            firstField === "ctr" ||
            firstField === "bid"
          ) {
            setSelectedOperator(NUMERIC_OPERATORS[2]?.value || "eq"); // "=" operator
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleAddFilter = () => {
    // Check if this is a multi-select field
    const isMultiSelectField =
      selectedField === "type" ||
      selectedField === "state" ||
      selectedField === "targeting_type" ||
      (selectedField === "profile_name" &&
        channelType === "amazon" &&
        profileOptions.length > 0);

    // For multi-select fields, check if at least one value is selected
    if (isMultiSelectField) {
      if (selectedMultiValues.length === 0) return;
    } else {
      // For regular fields, check if filterValue is provided
      if (!selectedField || !filterValue) return;
    }

    // For profile dropdown, use "equals" operator implicitly (don't store it)
    const isProfileDropdown =
      selectedField === "profile_name" &&
      channelType === "amazon" &&
      profileOptions.length > 0;

    // For fields that require operators, ensure operator is selected (unless it's a profile dropdown or multi-select)
    if (
      !isProfileDropdown &&
      !isMultiSelectField &&
      (selectedField === "campaign_name" ||
        selectedField === "budget" ||
        selectedField === "profile_name" ||
        selectedField === "account_name" ||
        selectedField === "name" ||
        selectedField === "default_bid" ||
        selectedField === "spends" ||
        selectedField === "sales" ||
        selectedField === "ctr" ||
        selectedField === "bid" ||
        selectedField === "adgroup_name" ||
        selectedField === "sku" ||
        selectedField === "adId" ||
        selectedField === "asin" ||
        selectedField === "adGroupId" ||
        selectedField === "keywordText" ||
        selectedField === "keyword_text" ||
        selectedField === "expression") &&
      !selectedOperator
    ) {
      return;
    }

    // For profile_name filters, convert unique values back to profile names
    let filterValueToStore: any = isMultiSelectField
      ? selectedMultiValues // Store array for multi-select fields
      : selectedField === "budget" ||
        selectedField === "default_bid" ||
        selectedField === "spends" ||
        selectedField === "sales" ||
        selectedField === "ctr" ||
        selectedField === "bid"
      ? parseFloat(filterValue) || 0
      : filterValue;

    if (selectedField === "profile_name" && isProfileDropdown) {
      if (isMultiSelectField && Array.isArray(selectedMultiValues)) {
        // Convert array of unique values to array of profile names
        filterValueToStore = selectedMultiValues.map((uniqueValue) => {
          const option = profileOptions.find(
            (opt) => opt.value === uniqueValue
          );
          return option?.profileName || uniqueValue;
        });
      } else if (typeof filterValue === "string") {
        // Convert single unique value to profile name
        const option = profileOptions.find((opt) => opt.value === filterValue);
        filterValueToStore = option?.profileName || filterValue;
      }
    }

    const newFilter: FilterItem = {
      id: `${selectedField}-${Date.now()}`,
      field: selectedField as FilterItem["field"],
      // For profile dropdown, use "equals" operator implicitly (don't show it to user)
      operator: isProfileDropdown ? "equals" : selectedOperator || undefined,
      value: filterValueToStore,
    };

    setActiveFilters([...activeFilters, newFilter]);

    // Auto-select next available filter
    const nextField = getNextAvailableField();
    if (nextField) {
      setSelectedField(nextField);

      // Auto-select first operator if field needs operator
      // Don't auto-select for profile dropdown
      const isProfileDropdownField =
        nextField === "profile_name" && channelType === "amazon";
      const needsOp =
        !isProfileDropdownField &&
        (nextField === "campaign_name" ||
          nextField === "budget" ||
          nextField === "profile_name" ||
          nextField === "account_name" ||
          nextField === "name" ||
          nextField === "default_bid" ||
          nextField === "spends" ||
          nextField === "sales" ||
          nextField === "ctr" ||
          nextField === "bid" ||
          nextField === "adgroup_name" ||
          nextField === "sku" ||
          nextField === "adId" ||
          nextField === "asin" ||
          nextField === "adGroupId" ||
          nextField === "keywordText" ||
          nextField === "keyword_text");

      if (needsOp) {
        // For string fields, use "contains", for numeric use "eq"
        if (
          nextField === "campaign_name" ||
          nextField === "profile_name" ||
          nextField === "account_name" ||
          nextField === "name" ||
          nextField === "adgroup_name" ||
          nextField === "sku" ||
          nextField === "adId" ||
          nextField === "asin" ||
          nextField === "adGroupId"
        ) {
          setSelectedOperator(STRING_OPERATORS[0]?.value || "");
        } else if (
          nextField === "budget" ||
          nextField === "default_bid" ||
          nextField === "spends" ||
          nextField === "sales" ||
          nextField === "ctr" ||
          nextField === "bid"
        ) {
          setSelectedOperator(NUMERIC_OPERATORS[2]?.value || "eq"); // "=" operator
        }
      } else {
        setSelectedOperator("");
      }
    } else {
      setSelectedField("");
      setSelectedOperator("");
      setExpressionType("ASIN_SAME_AS");
    }
    setFilterValue("");
    setSelectedMultiValues([]); // Reset multi-select values
  };

  const handleRemoveFilter = (filterId: string) => {
    const updatedFilters = activeFilters.filter((f) => f.id !== filterId);
    setActiveFilters(updatedFilters);
    // Automatically apply the updated filters to refresh data
    onApply(updatedFilters);
  };

  const handleApply = () => {
    onApply(activeFilters);
    // Don't auto-close - let user toggle with button
  };

  const handleClearAll = () => {
    setActiveFilters([]);
    onApply([]);
    onClose(); // Close the filter panel after clearing
  };

  const getOperatorLabel = (operator: string) => {
    const allOperators = [...STRING_OPERATORS, ...NUMERIC_OPERATORS];
    return allOperators.find((op) => op.value === operator)?.label || operator;
  };

  const getFieldLabel = (field: string) => {
    return FILTER_FIELDS.find((f) => f.value === field)?.label || field;
  };

  const getFilterDisplayValue = (filter: FilterItem) => {
    // For profile_name filters, show label with country code if available
    if (filter.field === "profile_name" && Array.isArray(filter.value)) {
      const displayValues = filter.value.map((val) => {
        // val is profile name, find option by profileName
        const option = profileOptions.find((opt) => opt.profileName === val);
        return option ? option.label : val;
      });
      return displayValues.length > 0 ? displayValues.join(", ") : "";
    }
    if (filter.field === "profile_name" && typeof filter.value === "string") {
      // filter.value is profile name, find option by profileName
      const option = profileOptions.find(
        (opt) => opt.profileName === filter.value
      );
      return option ? option.label : filter.value;
    }
    // Handle array values for multi-select fields
    if (Array.isArray(filter.value)) {
      return filter.value.length > 0 ? filter.value.join(", ") : "";
    }
    if (filter.field === "state" || filter.field === "type") {
      return filter.value.toString();
    }
    if (filter.operator) {
      return `${getOperatorLabel(filter.operator)} ${filter.value}`;
    }
    return filter.value.toString();
  };

  const needsOperatorFields = [
    "campaign_name",
    "profile_name",
    "account_name",
    "name",
    "adgroup_name",
    "sku",
    "adId",
    "asin",
    "adGroupId",
    "keywordText",
    "keyword_text",
    "expression",
    "budget",
    "default_bid",
    "spends",
    "sales",
    "ctr",
    "bid",
  ];

  // Check if profile_name is a dropdown (Amazon channel with profiles available)
  const isProfileDropdown =
    selectedField === "profile_name" &&
    channelType === "amazon" &&
    profileOptions.length > 0;

  // Exclude profile_name from needing operator when it's a dropdown
  const needsOperator =
    needsOperatorFields.includes(selectedField as string) && !isProfileDropdown;

  const isStateOrType = selectedField === "state" || selectedField === "type";
  const isTargetingType = selectedField === "targeting_type";
  const isStatusOrChannelType =
    selectedField === "status" ||
    selectedField === "advertising_channel_type" ||
    selectedField === "match_type";
  const isAssetType = selectedField === "assetType";
  const isExpression = selectedField === "expression";

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6]"
    >
      {/* Filter Builder */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start gap-2">
          {/* Field Dropdown */}
          <div className="w-[200px]">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Filter
            </label>
            <Dropdown<string>
              options={FILTER_FIELDS.filter((f) => {
                // Exclude multi-select fields that are already applied (they support multiple selections)
                const usedFields = new Set(
                  activeFilters.map((filter) => filter.field)
                );
                const multiSelectFields = new Set([
                  "type",
                  "state",
                  "targeting_type",
                  ...(channelType === "amazon" ? ["profile_name"] : []),
                ]);
                const fieldValue = f.value as FilterItem["field"];
                // If it's a multi-select field and already used, exclude it
                if (
                  multiSelectFields.has(fieldValue as string) &&
                  usedFields.has(fieldValue)
                ) {
                  return false;
                }
                return true;
              }).map((f) => ({
                value: f.value,
                label: f.label,
              }))}
              value={selectedField || undefined}
              placeholder="Select Filter"
              onChange={(value) => {
                setSelectedField(value);
                setFilterValue("");
                setSelectedMultiValues([]); // Reset multi-select values

                // Check if this is a profile dropdown
                const isProfileDropdown =
                  value === "profile_name" && channelType === "amazon";

                // Check if this is a multi-select field
                const isMultiSelectField =
                  value === "type" ||
                  value === "state" ||
                  value === "targeting_type" ||
                  isProfileDropdown;

                // Auto-select first operator if field needs operator (not for profile dropdown or multi-select)
                const needsOp =
                  !isProfileDropdown &&
                  !isMultiSelectField &&
                  needsOperatorFields.includes(value as string);

                if (needsOp) {
                  // For string fields, use "contains", for numeric use "eq"
                  if (
                    value === "campaign_name" ||
                    value === "profile_name" ||
                    value === "account_name" ||
                    value === "name" ||
                    value === "adgroup_name" ||
                    value === "sku" ||
                    value === "adId" ||
                    value === "asin" ||
                    value === "adGroupId" ||
                    value === "keywordText" ||
                    value === "keyword_text"
                  ) {
                    setSelectedOperator(STRING_OPERATORS[0]?.value || "");
                  } else if (
                    value === "budget" ||
                    value === "default_bid" ||
                    value === "spends" ||
                    value === "sales" ||
                    value === "ctr" ||
                    value === "bid"
                  ) {
                    setSelectedOperator(NUMERIC_OPERATORS[2]?.value || "eq"); // "=" operator
                  }
                } else {
                  setSelectedOperator("");
                }
              }}
              buttonClassName="edit-button w-full"
            />
          </div>

          {/* Operator Dropdown (for campaign_name and budget) */}
          {selectedField && needsOperator && (
            <div className="w-[150px]">
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Operator
              </label>
              <Dropdown<string>
                options={
                  selectedField === "campaign_name" ||
                  selectedField === "profile_name" ||
                  selectedField === "account_name" ||
                  selectedField === "name" ||
                  selectedField === "adgroup_name" ||
                  selectedField === "sku" ||
                  selectedField === "adId" ||
                  selectedField === "asin" ||
                  selectedField === "adGroupId" ||
                  selectedField === "keywordText" ||
                  selectedField === "keyword_text" ||
                  selectedField === "expression"
                    ? STRING_OPERATORS.map((op) => ({
                        value: op.value,
                        label: op.label,
                      }))
                    : NUMERIC_OPERATORS.map((op) => ({
                        value: op.value,
                        label: op.label,
                      }))
                }
                value={selectedOperator || undefined}
                placeholder="Select Operator"
                onChange={(value) => setSelectedOperator(value)}
                buttonClassName="edit-button w-full"
              />
            </div>
          )}

          {/* Value Input - Only show when a field is selected */}
          {selectedField && (
            <div className={isExpression ? "flex-1" : "w-[150px]"}>
              {!isExpression && (
                <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                  Value
                </label>
              )}
              {isProfileDropdown ? (
                <div className="max-h-[200px] overflow-y-auto border border-gray-200 rounded-lg bg-[#FEFEFB] p-2">
                  {loadingProfiles ? (
                    <div className="text-[11.2px] text-[#556179] py-2">
                      Loading profiles...
                    </div>
                  ) : profileOptions.length === 0 ? (
                    <div className="text-[11.2px] text-[#556179] py-2">
                      No profiles available
                    </div>
                  ) : (
                    profileOptions.map((option) => (
                      <div
                        key={option.value}
                        className="py-1.5 px-2 hover:bg-gray-100 rounded cursor-pointer"
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          // Skip if clicking on checkbox button or label - let Checkbox handle those
                          if (
                            target.closest('button[role="checkbox"]') ||
                            target.tagName === "LABEL" ||
                            target.closest("label")
                          ) {
                            return;
                          }
                          // Handle clicks on empty space only
                          if (selectedMultiValues.includes(option.value)) {
                            setSelectedMultiValues(
                              selectedMultiValues.filter(
                                (v) => v !== option.value
                              )
                            );
                          } else {
                            setSelectedMultiValues([
                              ...selectedMultiValues,
                              option.value,
                            ]);
                          }
                        }}
                      >
                        <Checkbox
                          checked={selectedMultiValues.includes(option.value)}
                          onChange={(checked) => {
                            // Handle checkbox button clicks
                            if (checked) {
                              setSelectedMultiValues([
                                ...selectedMultiValues,
                                option.value,
                              ]);
                            } else {
                              setSelectedMultiValues(
                                selectedMultiValues.filter(
                                  (v) => v !== option.value
                                )
                              );
                            }
                          }}
                          label={option.label}
                          size="small"
                          className="w-full [&_label]:text-[10px]"
                        />
                      </div>
                    ))
                  )}
                </div>
              ) : isStateOrType ? (
                <div className="max-h-[200px] overflow-y-auto border border-gray-200 rounded-lg bg-[#FEFEFB] p-2">
                  {(selectedField === "state"
                    ? useUppercaseState
                      ? STATUS_OPTIONS
                      : STATE_OPTIONS
                    : channelType === "tiktok"
                    ? TIKTOK_TYPE_OPTIONS
                    : TYPE_OPTIONS
                  ).map((opt) => (
                    <div
                      key={opt}
                      className="py-1.5 px-2 hover:bg-gray-100 rounded cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        // Skip if clicking on checkbox button or label - let Checkbox handle those
                        if (
                          target.closest('button[role="checkbox"]') ||
                          target.tagName === "LABEL" ||
                          target.closest("label")
                        ) {
                          return;
                        }
                        // Handle clicks on empty space only
                        if (selectedMultiValues.includes(opt)) {
                          setSelectedMultiValues(
                            selectedMultiValues.filter((v) => v !== opt)
                          );
                        } else {
                          setSelectedMultiValues([...selectedMultiValues, opt]);
                        }
                      }}
                    >
                      <Checkbox
                        checked={selectedMultiValues.includes(opt)}
                        onChange={(checked) => {
                          // Handle checkbox button clicks directly
                          if (checked) {
                            setSelectedMultiValues([
                              ...selectedMultiValues,
                              opt,
                            ]);
                          } else {
                            setSelectedMultiValues(
                              selectedMultiValues.filter((v) => v !== opt)
                            );
                          }
                        }}
                        label={opt}
                        size="small"
                        className="w-full [&_label]:text-[10px]"
                      />
                    </div>
                  ))}
                </div>
              ) : isTargetingType ? (
                <div className="max-h-[200px] overflow-y-auto border border-gray-200 rounded-lg bg-[#FEFEFB] p-2">
                  {TARGETING_TYPE_OPTIONS.map((opt) => (
                    <div
                      key={opt}
                      className="py-1.5 px-2 hover:bg-gray-100 rounded cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        // Skip if clicking on checkbox button or label - let Checkbox handle those
                        if (
                          target.closest('button[role="checkbox"]') ||
                          target.tagName === "LABEL" ||
                          target.closest("label")
                        ) {
                          return;
                        }
                        // Handle clicks on empty space only
                        if (selectedMultiValues.includes(opt)) {
                          setSelectedMultiValues(
                            selectedMultiValues.filter((v) => v !== opt)
                          );
                        } else {
                          setSelectedMultiValues([...selectedMultiValues, opt]);
                        }
                      }}
                    >
                      <Checkbox
                        checked={selectedMultiValues.includes(opt)}
                        onChange={(checked) => {
                          // Handle checkbox button clicks directly
                          if (checked) {
                            setSelectedMultiValues([
                              ...selectedMultiValues,
                              opt,
                            ]);
                          } else {
                            setSelectedMultiValues(
                              selectedMultiValues.filter((v) => v !== opt)
                            );
                          }
                        }}
                        label={opt}
                        size="small"
                        className="w-full [&_label]:text-[10px]"
                      />
                    </div>
                  ))}
                </div>
              ) : isStatusOrChannelType ? (
                <Dropdown<string>
                  options={(selectedField === "status"
                    ? STATUS_OPTIONS
                    : selectedField === "match_type"
                    ? MATCH_TYPE_OPTIONS
                    : CHANNEL_TYPE_OPTIONS
                  ).map((opt) => ({
                    value: opt,
                    label: opt,
                  }))}
                  value={filterValue || undefined}
                  placeholder={`Select ${
                    selectedField === "status"
                      ? "Status"
                      : selectedField === "match_type"
                      ? "Match Type"
                      : "Channel Type"
                  }`}
                  onChange={(value) => setFilterValue(value)}
                  buttonClassName="edit-button w-full"
                />
              ) : isAssetType ? (
                <Dropdown<string>
                  options={ASSET_TYPE_OPTIONS.map((opt) => ({
                    value: opt,
                    label: opt,
                  }))}
                  value={filterValue || undefined}
                  placeholder="Select Asset Type"
                  onChange={(value) => setFilterValue(value)}
                  buttonClassName="edit-button w-full"
                />
              ) : isExpression ? (
                <div className="flex flex-row gap-2 items-end">
                  {/* Expression Type Dropdown */}
                  <div className="flex-1">
                    <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                      Expression Type
                    </label>
                    <Dropdown<string>
                      options={EXPRESSION_TYPE_OPTIONS.map((opt) => ({
                        value: opt.value,
                        label: opt.label,
                      }))}
                      value={expressionType || undefined}
                      placeholder="Select Expression Type"
                      onChange={(value) => setExpressionType(value)}
                      buttonClassName="edit-button w-full"
                    />
                  </div>
                  {/* Expression Value Input */}
                  <div className="flex-1">
                    <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                      Expression Value (ASIN)
                    </label>
                    <input
                      type="text"
                      value={filterValue}
                      onChange={(e) =>
                        setFilterValue(e.target.value.toUpperCase())
                      }
                      placeholder="Enter ASIN (e.g., B08N5WRWNW)"
                      className={`w-full px-3 py-2 border rounded-lg text-[13.3px] bg-[#FEFEFB] ${filterValue && filterValue.length !== 10
                          ? "border-yellow-300"
                          : "border-gray-200"
                      }`}
                      maxLength={10}
                    />
                    {filterValue && filterValue.length !== 10 && (
                      <p className="mt-1 text-[11.2px] text-yellow-600">
                        ASIN must be exactly 10 characters
                      </p>
                    )}
                  </div>
                </div>
              ) : selectedField === "budget" ? (
                <input
                  type="number"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder="Enter budget"
                  className="campaign-input w-full"
                />
              ) : (
                <input
                  type="text"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder="Enter value"
                  className="campaign-input w-full"
                />
              )}
            </div>
          )}

          {/* Add Filter Button */}
          <div className="flex flex-col">
            {/* Empty placeholder to match label height (text-[11.2px] + mb-2) */}
            <div className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase invisible">
              &nbsp;
            </div>
            <button
              onClick={handleAddFilter}
              disabled={
                !selectedField ||
                (selectedField === "type" ||
                selectedField === "state" ||
                selectedField === "targeting_type" ||
                (selectedField === "profile_name" &&
                  channelType === "amazon" &&
                  profileOptions.length > 0)
                  ? selectedMultiValues.length === 0
                  : !filterValue) ||
                (needsOperator &&
                  !selectedOperator &&
                  !isProfileDropdown &&
                  selectedField !== "type" &&
                  selectedField !== "state" &&
                  selectedField !== "targeting_type")
              }
              className="apply-button-add"
            >
              Add Filter
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters Chips */}
      {activeFilters.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <Chip
                key={filter.id}
                onClose={() => handleRemoveFilter(filter.id)}
              >
                {getFieldLabel(filter.field)}: {getFilterDisplayValue(filter)}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-4 flex items-center justify-end gap-3">
        <button onClick={handleClearAll} className="cancel-button">
          Clear All
        </button>
        <button type="button" onClick={handleApply} className="apply-button">
          Apply Filters
        </button>
      </div>
    </div>
  );
};
