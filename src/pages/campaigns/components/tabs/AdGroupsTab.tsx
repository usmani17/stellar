import React, { useRef } from "react";
import { Button } from "../../../../components/ui";
import { Dropdown } from "../../../../components/ui/Dropdown";
import { AdGroupsTable } from "../../../../components/campaigns/AdGroupsTable";
import {
  FilterPanel,
  type FilterValues,
} from "../../../../components/filters/FilterPanel";
import { CreateAdGroupSection } from "../../../../components/adgroups/CreateAdGroupSection";
import {
  CreateAdGroupPanel,
  type AdGroupInput,
} from "../../../../components/adgroups/CreateAdGroupPanel";
import { Pagination } from "../Pagination";
import type { AdGroup, CampaignDetail } from "../../../../services/campaigns";

interface AdGroupsTabProps {
  // Data
  adgroups: AdGroup[];
  adgroupsLoading: boolean;
  campaignDetail: CampaignDetail | null;
  campaignId: string | null;
  campaignType: string | null;

  // Selection
  selectedAdGroupIds: Set<string | number>;
  onSelectAll: (checked: boolean) => void;
  onSelect: (id: string | number, checked: boolean) => void;

  // Pagination
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;

  // Sorting
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (column: string) => void;

  // Filters
  isFilterPanelOpen: boolean;
  onToggleFilterPanel: () => void;
  onCloseFilterPanel: () => void;
  filters: FilterValues;
  onApplyFilters: (filters: FilterValues) => void;
  filtersString: string;
  /** @deprecated Use filtersString for skip-check; kept for backward compatibility */
  lastAppliedFiltersRef?: React.MutableRefObject<string>;

  // Create Panel
  isCreatePanelOpen: boolean;
  onToggleCreatePanel: () => void;
  onCloseCreatePanel: () => void;
  onCreateAdGroups: (adgroups: AdGroupInput[]) => Promise<void>;
  createLoading: boolean;
  createError: string | null;
  createFieldErrors: Record<string, string>;
  createdAdGroups: any[];
  failedCount: number;
  failedAdGroups: any[];

  // Bulk Actions
  showBulkActions: boolean;
  onToggleBulkActions: () => void;
  onCloseBulkActions: () => void;
  bulkActionsRef: React.RefObject<HTMLDivElement | null>;
  onBulkStatusAction: (action: "enable" | "pause" | "archive") => void;
  onBulkDelete: () => void;
  onBulkEditBid: () => void;

  // Bid Panel
  showBidPanel: boolean;
  bidAction: "increase" | "decrease" | "set";
  bidUnit: "percent" | "amount";
  bidValue: string;
  bidUpperLimit: string;
  bidLowerLimit: string;
  onBidActionChange: (action: "increase" | "decrease" | "set") => void;
  onBidUnitChange: (unit: "percent" | "amount") => void;
  onBidValueChange: (value: string) => void;
  onBidUpperLimitChange: (value: string) => void;
  onBidLowerLimitChange: (value: string) => void;
  onBidPanelCancel: () => void;
  onBidPanelApply: () => void;
  bulkLoading: boolean;

  // Inline Edit
  editingField: { id: number; field: "status" | "default_bid" | "name" } | null;
  editedValue: string;
  onEditStart: (
    id: number,
    field: "status" | "default_bid" | "name",
    currentValue: string
  ) => void;
  onEditChange: (value: string) => void;
  onEditEnd: (newValue?: string) => void;
  onEditCancel: () => void;
  editLoading: Set<number>;
  pendingChange: {
    id: number;
    field: "status" | "default_bid" | "name";
    newValue: string;
    oldValue: string;
  } | null;
  onConfirmChange: () => Promise<void>;
  onCancelChange: () => void;

  // Total Row
  totalRow?: any;
}

export const AdGroupsTab: React.FC<AdGroupsTabProps> = ({
  adgroups,
  adgroupsLoading,
  campaignDetail,
  campaignId,
  campaignType,
  selectedAdGroupIds,
  onSelectAll,
  onSelect,
  currentPage,
  totalPages,
  onPageChange,
  sortBy,
  sortOrder,
  onSort,
  isFilterPanelOpen,
  onToggleFilterPanel,
  onCloseFilterPanel,
  filters,
  onApplyFilters,
  filtersString,
  lastAppliedFiltersRef,
  isCreatePanelOpen,
  onToggleCreatePanel,
  onCloseCreatePanel,
  onCreateAdGroups,
  createLoading,
  createError,
  createFieldErrors,
  createdAdGroups,
  failedCount,
  failedAdGroups,
  showBulkActions,
  onToggleBulkActions,
  onCloseBulkActions,
  bulkActionsRef,
  onBulkStatusAction,
  onBulkDelete,
  onBulkEditBid,
  showBidPanel,
  bidAction,
  bidUnit,
  bidValue,
  bidUpperLimit,
  bidLowerLimit,
  onBidActionChange,
  onBidUnitChange,
  onBidValueChange,
  onBidUpperLimitChange,
  onBidLowerLimitChange,
  onBidPanelCancel,
  onBidPanelApply,
  bulkLoading,
  editingField,
  editedValue,
  onEditStart,
  onEditChange,
  onEditEnd,
  onEditCancel,
  editLoading,
  pendingChange,
  onConfirmChange,
  onCancelChange,
  totalRow,
}) => {
  return (
    <>
      {/* Header with Create Adgroup, Bulk Edit, and Filter Buttons */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
          Ad Groups
        </h2>
        <div className="flex items-center gap-2">
          {/* Create Adgroup Button */}
          <CreateAdGroupSection
            isOpen={isCreatePanelOpen}
            onToggle={() => {
              onToggleCreatePanel();
              onCloseFilterPanel();
              onCloseBulkActions();
            }}
          />
          {/* Bulk Edit Button */}
          <div
            className="relative inline-flex justify-end"
            ref={bulkActionsRef}
          >
            <Button
              type="button"
              variant="ghost"
              className="edit-button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleBulkActions();
              }}
            >
              <svg
                className="w-4 h-4 text-[#072929]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 3.5a2.121 2.121 0 113 3L12 16l-4 1 1-4 9.5-9.5z"
                />
              </svg>
              <span className="text-[10.64px] text-[#072929] font-normal">
                Bulk Actions
              </span>
            </Button>
            {showBulkActions && (
              <div className="absolute top-[38px] left-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                <div className="overflow-y-auto">
                  {[
                    { value: "enable", label: "Enabled" },
                    { value: "pause", label: "Paused" },
                    ...(campaignType !== "SB"
                      ? [{ value: "edit_bid", label: "Edit Default Bid" }]
                      : []),
                    ...(campaignType === "SD"
                      ? [{ value: "archive", label: "Archive" }]
                      : campaignType !== "SB"
                        ? [{ value: "archive", label: "Archived" }]
                        : []),
                    ...(campaignType !== "SD" && campaignType !== "SB"
                      ? [{ value: "delete", label: "Delete" }]
                      : []),
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      disabled={selectedAdGroupIds.size === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedAdGroupIds.size === 0) return;
                        if (opt.value === "edit_bid") {
                          onBulkEditBid();
                        } else if (opt.value === "delete") {
                          onBulkDelete();
                        } else {
                          onBulkStatusAction(
                            opt.value as "enable" | "pause" | "archive"
                          );
                        }
                        onToggleBulkActions();
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Add Filter Button */}
          <button
            onClick={() => {
              onToggleFilterPanel();
              onCloseCreatePanel();
              onCloseBulkActions();
            }}
            className="edit-button"
          >
            <svg
              className="w-5 h-5 text-[#072929]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span className="text-[10.64px] text-[#072929] font-normal">
              Add Filter
            </span>
            <svg
              className={`w-5 h-5 text-[#E3E3E3] transition-transform ${isFilterPanelOpen ? "rotate-180" : ""
                }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Bid editor panel for Ad Groups */}
      {selectedAdGroupIds.size > 0 && showBidPanel && (
        <div className="mb-4">
          <div className="border border-gray-200 rounded-xl p-4 bg-[#f9f9f6]">
            <div className="flex flex-wrap items-end gap-3 justify-between">
              <div className="w-[160px]">
                <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                  Action
                </label>
                <Dropdown
                  options={[
                    { value: "increase", label: "Increase By" },
                    { value: "decrease", label: "Decrease By" },
                    { value: "set", label: "Set To" },
                  ]}
                  value={bidAction}
                  onChange={(val) => {
                    const action = val as typeof bidAction;
                    onBidActionChange(action);
                    if (action === "set") {
                      onBidUnitChange("amount");
                    }
                  }}
                  buttonClassName="w-full bg-[#FEFEFB] edit-button"
                  width="w-full"
                />
              </div>
              {(bidAction === "increase" || bidAction === "decrease") && (
                <div className="w-[140px]">
                  <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                    Unit
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`flex-1 px-3 py-2 rounded-lg border items-center ${bidUnit === "percent"
                          ? "bg-forest-f40  border-forest-f40"
                          : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-50"
                        }`}
                      onClick={() => onBidUnitChange("percent")}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      className={`flex-1 px-3 py-2 rounded-lg border items-center ${bidUnit === "amount"
                          ? "bg-forest-f40  border-forest-f40"
                          : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-50"
                        }`}
                      onClick={() => onBidUnitChange("amount")}
                    >
                      $
                    </button>
                  </div>
                </div>
              )}
              <div className="w-[160px]">
                <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                  Value
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={bidValue}
                    onChange={(e) => onBidValueChange(e.target.value)}
                    className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.64px] text-[#556179]">
                    {bidUnit === "percent" ? "%" : "$"}
                  </span>
                </div>
              </div>
              {bidAction === "increase" && (
                <div className="w-[160px]">
                  <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                    Upper Limit (optional)
                  </label>
                  <input
                    type="number"
                    value={bidUpperLimit}
                    onChange={(e) => onBidUpperLimitChange(e.target.value)}
                    className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                  />
                </div>
              )}
              {bidAction === "decrease" && (
                <div className="w-[160px]">
                  <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                    Lower Limit (optional)
                  </label>
                  <input
                    type="number"
                    value={bidLowerLimit}
                    onChange={(e) => onBidLowerLimitChange(e.target.value)}
                    className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onBidPanelCancel}
                  className="cancel-button"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onBidPanelApply}
                  disabled={!bidValue || bulkLoading}
                  className="apply-button"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Adgroup Panel */}
      {isCreatePanelOpen && campaignId && (
        <CreateAdGroupPanel
          isOpen={isCreatePanelOpen}
          onClose={onCloseCreatePanel}
          onSubmit={onCreateAdGroups}
          campaignId={campaignId}
          campaignType={campaignType || "SP"}
          loading={createLoading}
          submitError={createError}
          fieldErrors={createFieldErrors}
          createdAdGroups={createdAdGroups}
          failedCount={failedCount}
          failedAdGroups={failedAdGroups}
        />
      )}

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <div className="mb-4">
          <FilterPanel
            key={`adgroups-filter-${filtersString}`}
            isOpen={true}
            onClose={onCloseFilterPanel}
            onApply={(newFilters) => {
              const filtersStr = JSON.stringify(
                [...newFilters].sort((a, b) => {
                  if (a.field !== b.field)
                    return a.field.localeCompare(b.field);
                  const aOp = a.operator || "";
                  const bOp = b.operator || "";
                  if (aOp !== bOp) return aOp.localeCompare(bOp);
                  return String(a.value).localeCompare(String(b.value));
                })
              );

              // Skip only if new filters are deeply equal to current (apply immediately on add/remove)
              if (filtersStr === filtersString) {
                return;
              }

              onApplyFilters(newFilters);
            }}
            initialFilters={filters}
            filterFields={[
              { value: "name", label: "Ad Group Name" },
              { value: "state", label: "State" },
              ...(campaignType !== "SB"
                ? [{ value: "default_bid" as const, label: "Default Bid" }]
                : []),
            ]}
          />
        </div>
      )}

      <div className="mb-4">
        <AdGroupsTable
          adgroups={adgroups}
          loading={adgroupsLoading}
          campaignDetail={campaignDetail}
          campaignId={campaignId}
          campaignType={campaignType}
          onSelectAll={onSelectAll}
          onSelect={onSelect}
          selectedIds={selectedAdGroupIds}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
          editingField={editingField}
          editedValue={editedValue}
          onEditStart={onEditStart}
          onEditChange={onEditChange}
          onEditEnd={onEditEnd}
          onEditCancel={onEditCancel}
          inlineEditLoading={editLoading}
          pendingChange={pendingChange}
          onConfirmChange={onConfirmChange}
          onCancelChange={onCancelChange}
          showTotalRow={adgroups.length > 0}
          totalRow={totalRow}
        />
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        loading={adgroupsLoading}
      />
    </>
  );
};
