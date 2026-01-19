import React from "react";
import { Button } from "../../../../components/ui";
import { NegativeKeywordsTable } from "../../../../components/campaigns/NegativeKeywordsTable";
import {
  FilterPanel,
  type FilterValues,
} from "../../../../components/filters/FilterPanel";
import {
  CreateNegativeKeywordPanel,
  type NegativeKeywordInput,
} from "../../../../components/campaigns/CreateNegativeKeywordPanel";
import { Pagination } from "../Pagination";
import type { NegativeKeyword, AdGroup } from "../../../../services/campaigns";

interface NegativeKeywordsTabProps {
  // Data
  negativeKeywords: NegativeKeyword[];
  negativeKeywordsLoading: boolean;
  allAdgroups: AdGroup[];
  adgroups: AdGroup[];
  campaignId: string | null;
  campaignType: string | null;

  // Selection
  selectedNegativeKeywordIds: Set<number>;
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
  onCreateNegativeKeywords: (keywords: NegativeKeywordInput[]) => Promise<void>;
  onLoadAllAdGroups: () => Promise<void>;
  createLoading: boolean;
  createError: string | null;
  createFieldErrors: Record<string, string>;
  createdNegativeKeywords: any[];
  failedCount: number;
  failedNegativeKeywords: any[];

  // Bulk Actions
  showBulkActions: boolean;
  onToggleBulkActions: () => void;
  onCloseBulkActions: () => void;
  bulkActionsRef: React.RefObject<HTMLDivElement | null>;
  onBulkStatusAction: (action: "enable" | "pause") => void;
  onBulkDelete: () => void;

  // Inline Edit
  editingField: { id: number; field: "status" } | null;
  editedValue: string;
  onEditStart: (id: number, field: "status", currentValue: string) => void;
  onEditChange: (value: string) => void;
  onEditEnd: (newValue?: string) => void;
  onEditCancel: () => void;
  editLoading: Set<number>;
  pendingChange: {
    id: number;
    field: "status";
    newValue: string;
    oldValue: string;
  } | null;
}

export const NegativeKeywordsTab: React.FC<NegativeKeywordsTabProps> = ({
  negativeKeywords,
  negativeKeywordsLoading,
  allAdgroups,
  adgroups,
  campaignId,
  campaignType,
  selectedNegativeKeywordIds,
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
  onCreateNegativeKeywords,
  onLoadAllAdGroups,
  createLoading,
  createError,
  createFieldErrors,
  createdNegativeKeywords,
  failedCount,
  failedNegativeKeywords,
  showBulkActions,
  onToggleBulkActions,
  onCloseBulkActions,
  bulkActionsRef,
  onBulkStatusAction,
  onBulkDelete,
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
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
            Negative Keywords
          </h2>
          <div className="flex items-center gap-2">
            {/* Bulk Actions Dropdown */}
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
                  Edit
                </span>
              </Button>
              {showBulkActions && (
                <div className="absolute top-[42px] left-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                  <div className="overflow-y-auto">
                    {[
                      { value: "enable", label: "Enabled" },
                      { value: "pause", label: "Paused" },
                      { value: "delete", label: "Delete" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        disabled={selectedNegativeKeywordIds.size === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedNegativeKeywordIds.size === 0) return;
                          if (opt.value === "delete") {
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
            {/* Create Negative Keyword Button */}
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
              className="create-entity-button text-[10.64px] font-normal"
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
              Create Negative Keywords
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
                { value: "keywordText", label: "Text" },
                { value: "state", label: "Status" },
              ]}
              useUppercaseState={true}
            />
          </div>
        )}

        {/* Create Negative Keyword Panel */}
        {isCreatePanelOpen && (
          <CreateNegativeKeywordPanel
            isOpen={isCreatePanelOpen}
            onClose={onCloseCreatePanel}
            onSubmit={onCreateNegativeKeywords}
            adgroups={(allAdgroups.length > 0 ? allAdgroups : adgroups).map(
              (ag) => ({
                adGroupId: (ag as any).adGroupId || String(ag.id),
                name: ag.name,
              })
            )}
            campaignId={campaignId || ""}
            campaignType={campaignType || undefined}
            loading={createLoading}
            submitError={createError}
            fieldErrors={createFieldErrors}
            createdNegativeKeywords={createdNegativeKeywords}
            failedCount={failedCount}
            failedNegativeKeywords={failedNegativeKeywords}
          />
        )}

        <div className="mb-4">
          <NegativeKeywordsTable
            negativeKeywords={negativeKeywords}
            loading={negativeKeywordsLoading}
            onSelectAll={onSelectAll}
            onSelect={onSelect}
            selectedIds={selectedNegativeKeywordIds}
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
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        loading={negativeKeywordsLoading}
      />
    </>
  );
};

