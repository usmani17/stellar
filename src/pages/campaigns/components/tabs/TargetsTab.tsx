import React from "react";
import { Button } from "../../../../components/ui";
import { Dropdown } from "../../../../components/ui/Dropdown";
import { TargetsTable } from "../../../../components/campaigns/TargetsTable";
import {
  FilterPanel,
  type FilterValues,
} from "../../../../components/filters/FilterPanel";
import {
  CreateTargetPanel,
  type TargetInput,
} from "../../../../components/targets/CreateTargetPanel";
import { Pagination } from "../Pagination";
import type { Target, AdGroup } from "../../../../services/campaigns";

interface TargetsTabProps {
  // Data
  targets: Target[];
  targetsLoading: boolean;
  allAdgroups: AdGroup[];
  adgroups: AdGroup[];
  campaignId: string | null;
  campaignType: string | null;

  // Selection
  selectedTargetIds: Set<number>;
  onSelectAll: (checked: boolean) => void;
  onSelect: (id: number, checked: boolean) => void;

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

  // Create Panel
  isCreatePanelOpen: boolean;
  onToggleCreatePanel: () => void;
  onCloseCreatePanel: () => void;
  onCreateTargets: (targets: TargetInput[]) => Promise<void>;
  onLoadAllAdGroups: () => Promise<void>;
  createLoading: boolean;
  createError: string | null;
  createFieldErrors: Record<string, string>;
  createdTargets: any[];
  failedCount: number;
  failedTargets: any[];

  // Bulk Actions
  showBulkActions: boolean;
  onToggleBulkActions: () => void;
  onCloseBulkActions: () => void;
  bulkActionsRef: React.RefObject<HTMLDivElement | null>;
  onBulkStatusAction: (action: "enable" | "pause") => void;
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
  editingField: { id: number; field: "status" | "bid" } | null;
  editedValue: string;
  onEditStart: (
    id: number,
    field: "status" | "bid",
    currentValue: string
  ) => void;
  onEditChange: (value: string) => void;
  onEditEnd: (newValue?: string) => void;
  onEditCancel: () => void;
  editLoading: Set<number>;
  pendingChange: {
    id: number;
    field: "status" | "bid";
    newValue: string;
    oldValue: string;
  } | null;
}

export const TargetsTab: React.FC<TargetsTabProps> = ({
  targets,
  targetsLoading,
  allAdgroups,
  adgroups,
  campaignId,
  campaignType,
  selectedTargetIds,
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
  isCreatePanelOpen,
  onToggleCreatePanel,
  onCloseCreatePanel,
  onCreateTargets,
  onLoadAllAdGroups,
  createLoading,
  createError,
  createFieldErrors,
  createdTargets,
  failedCount,
  failedTargets,
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
}) => {
  return (
    <>
      {/* Header with Filter Button and Create Target Button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
          Targets
        </h2>
        <div className="flex items-center gap-3">
          {/* Bulk Actions Dropdown */}
          {selectedTargetIds.size > 0 && (
            <div className="relative" ref={bulkActionsRef}>
              <Button
                type="button"
                variant="ghost"
                className="px-2.5 py-1 bg-[#FEFEFB] border border-[#E3E3E3] rounded-lg flex items-center gap-1.5 h-8 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[9.5px] text-[#072929] font-medium"
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
                  Edit
                </span>
              </Button>
              {showBulkActions && (
                <div className="absolute top-[38px] left-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                  <div className="overflow-y-auto">
                    {[
                      { value: "enable", label: "Enabled" },
                      { value: "pause", label: "Paused" },
                      { value: "edit_bid", label: "Edit Bid" },
                      { value: "delete", label: "Delete" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        disabled={selectedTargetIds.size === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedTargetIds.size === 0) return;
                          if (opt.value === "edit_bid") {
                            onBulkEditBid();
                          } else if (opt.value === "delete") {
                            onBulkDelete();
                          } else {
                            onBulkStatusAction(opt.value as "enable" | "pause");
                          }
                          onCloseBulkActions();
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Create Target Button */}
          <button
            onClick={async () => {
              const newState = !isCreatePanelOpen;
              onToggleCreatePanel();
              onCloseFilterPanel();
              onCloseBulkActions();
              if (newState) {
                await onLoadAllAdGroups();
              }
            }}
            className="create-entity-button text-[10.64px] font-semibold"
          >
            <svg
              className="w-4 h-4 !text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Targets
            <svg
              className={`w-4 h-4 !text-white transition-transform ${
                isCreatePanelOpen ? "rotate-180" : ""
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
              className={`w-5 h-5 text-[#E3E3E3] transition-transform ${
                isFilterPanelOpen ? "rotate-180" : ""
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

      {/* Create Target Panel */}
      {isCreatePanelOpen && (
        <CreateTargetPanel
          isOpen={isCreatePanelOpen}
          campaignType={campaignType}
          onClose={onCloseCreatePanel}
          onSubmit={onCreateTargets}
          adgroups={(allAdgroups.length > 0 ? allAdgroups : adgroups).map(
            (ag) => ({
              adGroupId: (ag as any).adGroupId || String(ag.id),
              name: ag.name,
            })
          )}
          campaignId={campaignId || ""}
          loading={createLoading}
          submitError={createError}
          fieldErrors={createFieldErrors}
          createdTargets={createdTargets}
          failedCount={failedCount}
          failedTargets={failedTargets}
        />
      )}

      {/* Bid editor panel for Targets */}
      {selectedTargetIds.size > 0 && showBidPanel && (
        <div className="px-6 mb-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
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
                  buttonClassName="w-full"
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
                      className={`flex-1 px-3 py-2 rounded-lg border items-center ${
                        bidUnit === "percent"
                          ? "bg-forest-f40 border-forest-f40"
                          : "bg-[#FEFEFB] text-forest-f60 border-gray-200 hover:bg-gray-50"
                      }`}
                      onClick={() => onBidUnitChange("percent")}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      className={`flex-1 px-3 py-2 rounded-lg border items-center ${
                        bidUnit === "amount"
                          ? "bg-forest-f40 border-forest-f40"
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
                <input
                  type="number"
                  value={bidValue}
                  onChange={(e) => onBidValueChange(e.target.value)}
                  className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                />
              </div>
              {bidAction === "increase" && (
                <div className="w-[160px]">
                  <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                    Upper Limit (Optional)
                  </label>
                  <input
                    type="number"
                    value={bidUpperLimit}
                    onChange={(e) => onBidUpperLimitChange(e.target.value)}
                    placeholder="$0.00"
                    className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                  />
                </div>
              )}
              {bidAction === "decrease" && (
                <div className="w-[160px]">
                  <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                    Lower Limit (Optional)
                  </label>
                  <input
                    type="number"
                    value={bidLowerLimit}
                    onChange={(e) => onBidLowerLimitChange(e.target.value)}
                    placeholder="$0.00"
                    className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onBidPanelCancel}
                  className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onBidPanelApply}
                  disabled={!bidValue || bulkLoading}
                  className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <div className="mb-4">
          <FilterPanel
            isOpen={true}
            onClose={onCloseFilterPanel}
            onApply={(newFilters) => {
              onApplyFilters(newFilters);
            }}
            initialFilters={filters}
            filterFields={[
              { value: "name", label: "Target" },
              { value: "state", label: "State" },
              { value: "bid", label: "Bid" },
              { value: "adgroup_name", label: "Ad Group" },
            ]}
          />
        </div>
      )}

      <div className="mb-4">
        <TargetsTable
          targets={targets}
          loading={targetsLoading}
          onSelectAll={onSelectAll}
          onSelect={onSelect}
          selectedIds={selectedTargetIds}
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
        />
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        loading={targetsLoading}
      />
    </>
  );
};

