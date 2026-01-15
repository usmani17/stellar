import React, { useState } from "react";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { Banner } from "../../../../components/ui/Banner";
import { FilterPanel, type FilterValues } from "../../../../components/filters/FilterPanel";

interface GoogleProductGroup {
  id: number;
  product_group_id: number;
  product_group_name?: string;
  product_group_type?: string;
  status?: string;
  cpc_bid_dollars?: number;
  campaign_id?: number;
  campaign_name?: string;
  adgroup_id?: number;
  adgroup_name?: string;
  ctr?: number | string;
  spends?: number | string;
  sales?: number | string;
}

interface GoogleCampaignDetailProductGroupsTabProps {
  productGroups: GoogleProductGroup[];
  loading: boolean;
  selectedProductGroupIds: Set<number>;
  onSelectAll: (checked: boolean) => void;
  onSelectProductGroup: (id: number, checked: boolean) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (column: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isFilterPanelOpen: boolean;
  onToggleFilterPanel: () => void;
  filters: FilterValues;
  onApplyFilters: (filters: FilterValues) => void;
  syncing: boolean;
  onSync: () => void;
  syncingAnalytics?: boolean;
  onSyncAnalytics?: () => void;
  syncMessage: string | null;
  getSortIcon: (column: string, currentSortBy: string, currentSortOrder: "asc" | "desc") => React.ReactNode;
  formatCurrency2Decimals: (value: number | string | undefined) => string;
  formatPercentage: (value: number | string | undefined) => string;
}

export const GoogleCampaignDetailProductGroupsTab: React.FC<GoogleCampaignDetailProductGroupsTabProps> = ({
  productGroups,
  loading,
  selectedProductGroupIds,
  onSelectAll,
  onSelectProductGroup,
  sortBy,
  sortOrder,
  onSort,
  currentPage,
  totalPages,
  onPageChange,
  isFilterPanelOpen,
  onToggleFilterPanel,
  filters,
  onApplyFilters,
  syncing,
  onSync,
  syncingAnalytics,
  onSyncAnalytics,
  syncMessage,
  getSortIcon,
  formatCurrency2Decimals,
  formatPercentage,
}) => {
  return (
    <>
      {/* Sync Message */}
      {syncMessage && (
        <div className="mb-4">
          <Banner
            type={syncMessage.includes("error") || syncMessage.includes("Failed") ? "error" : "success"}
            message={syncMessage}
            dismissable={true}
            onDismiss={() => {}}
          />
        </div>
      )}
      
      {/* Header with Filter Button and Sync Button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
          Product Groups
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleFilterPanel}
            className="px-3 py-2 bg-background-field border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:bg-gray-50 transition-colors"
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
          <button
            onClick={onSync}
            disabled={syncing || syncingAnalytics}
            className="px-3 py-2 bg-[#136D6D] text-white border border-[#136D6D] rounded-lg flex items-center gap-2 h-10 hover:bg-[#0e5a5a] transition-colors disabled:opacity-50"
          >
            {syncing ? (
              <span className="flex items-center gap-2 text-[10.64px] text-white font-normal">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                Syncing...
              </span>
            ) : (
              <span className="text-[10.64px] text-white font-normal">Sync Product Groups</span>
            )}
          </button>
          {onSyncAnalytics && (
            <button
              onClick={onSyncAnalytics}
              disabled={syncing || syncingAnalytics}
              className="px-3 py-2 bg-[#136D6D] text-white border border-[#136D6D] rounded-lg flex items-center gap-2 h-10 hover:bg-[#0e5a5a] transition-colors disabled:opacity-50"
            >
              {syncingAnalytics ? (
                <span className="flex items-center gap-2 text-[10.64px] text-white font-normal">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  Syncing Analytics...
                </span>
              ) : (
                <span className="text-[10.64px] text-white font-normal">Sync Analytics</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <div className="mb-4">
          <FilterPanel
            isOpen={true}
            onClose={onToggleFilterPanel}
            onApply={(newFilters) => {
              onApplyFilters(newFilters);
            }}
            initialFilters={filters}
            filterFields={[
              { value: "name", label: "Product Group Name" },
              { value: "status", label: "Status" },
              { value: "adgroup_name", label: "Ad Group Name" },
            ]}
          />
        </div>
      )}

      {/* Product Groups Table */}
      <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <div className="text-center py-8 text-[#556179] text-[13.3px]">
              Loading product groups...
            </div>
          ) : productGroups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[13.3px] text-[#556179] mb-4">
                No product groups found
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e8e8e3]">
                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] w-[35px]">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={productGroups.length > 0 && productGroups.every((pg) => selectedProductGroupIds.has(pg.id))}
                        onChange={onSelectAll}
                        size="small"
                      />
                    </div>
                  </th>
                  <th
                    className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                    onClick={() => onSort("product_group_name")}
                  >
                    <div className="flex items-center gap-1">
                      Product Group
                      {getSortIcon("product_group_name", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] hidden lg:table-cell">
                    Ad Group
                  </th>
                  <th
                    className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50 hidden md:table-cell"
                    onClick={() => onSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {getSortIcon("status", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th
                    className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50 hidden md:table-cell"
                    onClick={() => onSort("cpc_bid_dollars")}
                  >
                    <div className="flex items-center gap-1">
                      CPC Bid
                      {getSortIcon("cpc_bid_dollars", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] hidden md:table-cell">
                    CTR
                  </th>
                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] hidden md:table-cell">
                    Spends
                  </th>
                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] hidden md:table-cell">
                    Sales
                  </th>
                </tr>
              </thead>
              <tbody>
                {productGroups.map((productGroup, index) => {
                  const isLastRow = index === productGroups.length - 1;
                  return (
                    <tr
                      key={productGroup.id}
                      className={`${
                        !isLastRow ? "border-b border-[#e8e8e3]" : ""
                      } hover:bg-gray-50 transition-colors`}
                    >
                      <td className="py-[10px] px-[10px]">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedProductGroupIds.has(productGroup.id)}
                            onChange={(checked) => onSelectProductGroup(productGroup.id, checked)}
                            size="small"
                          />
                        </div>
                      </td>
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26] underline cursor-pointer">
                          All products
                        </span>
                      </td>
                      <td className="py-[10px] px-[10px] hidden lg:table-cell">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {productGroup.adgroup_name || "—"}
                        </span>
                      </td>
                      <td className="py-[10px] px-[10px] hidden md:table-cell">
                        {productGroup.status && <StatusBadge status={productGroup.status} />}
                      </td>
                      <td className="py-[10px] px-[10px] hidden md:table-cell">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {formatCurrency2Decimals(productGroup.cpc_bid_dollars)}
                        </span>
                      </td>
                      <td className="py-[10px] px-[10px] hidden md:table-cell">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {formatPercentage(productGroup.ctr)}
                        </span>
                      </td>
                      <td className="py-[10px] px-[10px] hidden md:table-cell">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {formatCurrency2Decimals(productGroup.spends)}
                        </span>
                      </td>
                      <td className="py-[10px] px-[10px] hidden md:table-cell">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {formatCurrency2Decimals(productGroup.sales)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {!loading && productGroups.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-end mt-4">
          <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${
                    currentPage === pageNum
                      ? "bg-white text-[#136D6D] font-semibold"
                      : "text-black hover:bg-gray-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                ...
              </span>
            )}
            {totalPages > 5 && (
              <button
                onClick={() => onPageChange(totalPages)}
                className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${
                  currentPage === totalPages
                    ? "bg-white text-[#136D6D] font-semibold"
                    : "text-black hover:bg-gray-50"
                }`}
              >
                {totalPages}
              </button>
            )}
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
};

