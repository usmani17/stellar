import React, { useState, useRef, useEffect } from "react";
import { Dropdown, type DropdownOption } from "../ui/Dropdown";
import { Chip } from "../ui/Chip";
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
    | "adGroupId";
  operator?: string; // For campaign_name, budget, profile_name, account_name, name, default_bid, spends, sales, ctr, bid, adgroup_name, sku, adId, asin, adGroupId
  value: string | number;
}

export type FilterValues = FilterItem[];

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterValues) => void;
  initialFilters?: FilterValues;
  filterFields?: Array<{ value: string; label: string }>;
  accountId?: string;
  channelType?: "amazon" | "google" | "walmart";
}

const DEFAULT_FILTER_FIELDS = [
  { value: "campaign_name", label: "Campaign Name" },
  { value: "state", label: "State" },
  { value: "budget", label: "Budget" },
  { value: "type", label: "Type" },
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
const TYPE_OPTIONS = ["SP", "SB", "SD"];
const TARGETING_TYPE_OPTIONS = ["AUTO", "MANUAL"];
const STATUS_OPTIONS = ["ENABLED", "PAUSED", "REMOVED"];
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

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  onApply,
  initialFilters = [],
  filterFields,
  accountId,
  channelType,
}) => {
  // Use initialFilters directly as the source of truth - no internal state sync
  // This prevents infinite loops when parent updates filters
  const [activeFilters, setActiveFilters] =
    useState<FilterValues>(initialFilters);
  const [selectedField, setSelectedField] = useState<string>("");
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  const [filterValue, setFilterValue] = useState<string>("");
  const [profileOptions, setProfileOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const isInitialMountRef = useRef(true);

  // Only sync on initial mount, not on every prop change
  // This prevents infinite loops - parent component manages filter state
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      setActiveFilters(initialFilters);
    }
  }, []); // Empty deps - only run on mount

  // Fetch profiles when profile_name is selected and it's an Amazon channel
  useEffect(() => {
    const loadProfiles = async () => {
      if (!accountId) return;

      try {
        setLoadingProfiles(true);
        // Get channels for the account
        const channels = await accountsService.getAccountChannels(
          parseInt(accountId)
        );
        const amazonChannel = channels.find(
          (ch) => ch.channel_type === "amazon"
        );

        if (amazonChannel) {
          // Fetch active profiles (is_selected=true, deleted_at is null)
          const response = await accountsService.getProfiles(amazonChannel.id);
          const activeProfiles = (response.profiles || []).filter(
            (profile: any) => profile.is_selected && !profile.deleted_at
          );

          const options = activeProfiles.map((profile: any) => ({
            value: profile.name || profile.profileId || "",
            label: profile.name || profile.profileId || "",
          }));

          setProfileOptions(options);
        }
      } catch (error) {
        console.error("Failed to load profiles:", error);
        setProfileOptions([]);
      } finally {
        setLoadingProfiles(false);
      }
    };

    const isProfileDropdown =
      selectedField === "profile_name" && channelType === "amazon" && accountId;

    if (isProfileDropdown && profileOptions.length === 0) {
      loadProfiles();
    } else if (!isProfileDropdown) {
      setProfileOptions([]);
      // Clear operator when switching away from profile dropdown
      if (selectedField !== "profile_name") {
        setSelectedOperator("");
      }
    }
  }, [selectedField, channelType, accountId, profileOptions.length]);

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
            firstField === "adgroup_name");

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
    if (!selectedField || !filterValue) return;

    // For profile dropdown, use "equals" operator implicitly (don't store it)
    const isProfileDropdown =
      selectedField === "profile_name" &&
      channelType === "amazon" &&
      profileOptions.length > 0;

    // For fields that require operators, ensure operator is selected (unless it's a profile dropdown)
    if (
      !isProfileDropdown &&
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
        selectedField === "adGroupId") &&
      !selectedOperator
    ) {
      return;
    }

    const newFilter: FilterItem = {
      id: `${selectedField}-${Date.now()}`,
      field: selectedField as FilterItem["field"],
      // For profile dropdown, use "equals" operator implicitly (don't show it to user)
      operator: isProfileDropdown ? "equals" : selectedOperator || undefined,
      value:
        selectedField === "budget" ||
        selectedField === "default_bid" ||
        selectedField === "spends" ||
        selectedField === "sales" ||
        selectedField === "ctr" ||
        selectedField === "bid"
          ? parseFloat(filterValue) || 0
          : filterValue,
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
          nextField === "adGroupId");

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
    }
    setFilterValue("");
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
    if (filter.field === "state" || filter.field === "type") {
      return filter.value;
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
    selectedField === "status" || selectedField === "advertising_channel_type";

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6]"
    >
      {/* Filter Builder */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-end gap-2">
          {/* Field Dropdown */}
          <div className="w-[200px]">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Filter
            </label>
            <Dropdown<string>
              options={FILTER_FIELDS.map((f) => ({
                value: f.value,
                label: f.label,
              }))}
              value={selectedField || undefined}
              placeholder="Select Filter"
              onChange={(value) => {
                setSelectedField(value);
                setFilterValue("");

                // Check if this is a profile dropdown
                const isProfileDropdown =
                  value === "profile_name" && channelType === "amazon";

                // Auto-select first operator if field needs operator (not for profile dropdown)
                const needsOp =
                  !isProfileDropdown &&
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
                    value === "adGroupId"
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
              buttonClassName="w-full bg-[#FEFEFB]"
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
                  selectedField === "adGroupId"
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
                buttonClassName="w-full bg-[#FEFEFB]"
              />
            </div>
          )}

          {/* Value Input - Only show when a field is selected */}
          {selectedField && (
            <div className="w-[200px]">
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Value
              </label>
              {isProfileDropdown ? (
                <Dropdown<string>
                  options={profileOptions}
                  value={filterValue || undefined}
                  placeholder={
                    loadingProfiles ? "Loading profiles..." : "Select Profile"
                  }
                  onChange={(value) => setFilterValue(value)}
                  buttonClassName="w-full bg-[#FEFEFB]"
                  disabled={loadingProfiles}
                />
              ) : isStateOrType ? (
                <Dropdown<string>
                  options={(selectedField === "state"
                    ? STATE_OPTIONS
                    : TYPE_OPTIONS
                  ).map((opt) => ({
                    value: opt,
                    label: opt,
                  }))}
                  value={filterValue || undefined}
                  placeholder={`Select ${
                    selectedField === "state" ? "State" : "Type"
                  }`}
                  onChange={(value) => setFilterValue(value)}
                  buttonClassName="w-full bg-[#FEFEFB]"
                />
              ) : isTargetingType ? (
                <Dropdown<string>
                  options={TARGETING_TYPE_OPTIONS.map((opt) => ({
                    value: opt,
                    label: opt,
                  }))}
                  value={filterValue || undefined}
                  placeholder="Select Targeting Type"
                  onChange={(value) => setFilterValue(value)}
                  buttonClassName="w-full bg-[#FEFEFB]"
                />
              ) : isStatusOrChannelType ? (
                <Dropdown<string>
                  options={(selectedField === "status"
                    ? STATUS_OPTIONS
                    : CHANNEL_TYPE_OPTIONS
                  ).map((opt) => ({
                    value: opt,
                    label: opt,
                  }))}
                  value={filterValue || undefined}
                  placeholder={`Select ${
                    selectedField === "status" ? "Status" : "Channel Type"
                  }`}
                  onChange={(value) => setFilterValue(value)}
                  buttonClassName="w-full bg-[#FEFEFB]"
                />
              ) : selectedField === "budget" ? (
                <input
                  type="number"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder="Enter budget"
                  className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                />
              ) : (
                <input
                  type="text"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder="Enter value"
                  className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                />
              )}
            </div>
          )}

          {/* Add Filter Button */}
          <button
            onClick={handleAddFilter}
            disabled={
              !selectedField ||
              !filterValue ||
              (needsOperator && !selectedOperator && !isProfileDropdown)
            }
            className="px-4 py-2.5 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Add Filter
          </button>
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
        <button
          onClick={handleClearAll}
          className="px-4 py-2 text-[#556179] bg-[#FEFEFB] border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-[11.2px]"
        >
          Clear All
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-4 py-2 bg-[#136D6D] text-white hover:!text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};
