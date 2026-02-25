import React, { useState } from "react";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { Dropdown } from "../../../../components/ui/Dropdown";
import { Banner } from "../../../../components/ui/Banner";
import { Loader } from "../../../../components/ui/Loader";
import {
  FilterPanel,
  type FilterValues,
} from "../../../../components/filters/FilterPanel";
import { googleAdwordsProductGroupsService } from "../../../../services/googleAdwords/googleAdwordsProductGroups";
import {
  BulkUpdateConfirmationModal,
  type BulkUpdatePreviewRow,
  type BulkUpdateStatusDetails,
} from "../BulkUpdateConfirmationModal";
import { BulkActionsDropdown } from "../BulkActionsDropdown";
import { formatStatusForDisplay } from "../../utils/googleAdsUtils";
import { Send } from "lucide-react";

export interface GoogleProductGroup {
  id: number;
  product_group_id: number;
  ad_id?: number; // ad_id from ads table (used for API calls)
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

/** Composite key = "adgroup_id-product_group_id" so selection is unique per row. */
type ProductGroupSelectionKey = string;

interface GoogleCampaignDetailProductGroupsTabProps {
  productGroups: GoogleProductGroup[];
  loading: boolean;
  showDraftsOnly?: boolean;
  onToggleDraftsOnly?: () => void;
  selectedProductGroupIds: Set<ProductGroupSelectionKey>;
  getProductGroupSelectionKey: (
    pg: GoogleProductGroup,
  ) => ProductGroupSelectionKey;
  onSelectAll: (checked: boolean) => void;
  onSelectProductGroup: (
    key: ProductGroupSelectionKey,
    checked: boolean,
  ) => void;
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
  getSortIcon: (
    column: string,
    currentSortBy: string,
    currentSortOrder: "asc" | "desc",
  ) => React.ReactNode;
  formatCurrency2Decimals: (value: number | string | undefined) => string;
  formatPercentage: (value: number | string | undefined) => string;
  onUpdateProductGroupStatus?: (
    key: ProductGroupSelectionKey,
    status: string,
  ) => Promise<void>;
  /** When provided and draft switch is on, show publish icon for draft rows. */
  onPublishDraft?: (productGroup: GoogleProductGroup) => void;
  publishLoadingId?: string | number;
  createButton?: React.ReactNode;
  createPanel?: React.ReactNode;
  accountId?: string;
  channelId?: string;
  onBulkUpdateComplete?: () => void;
}

export const GoogleCampaignDetailProductGroupsTab: React.FC<
  GoogleCampaignDetailProductGroupsTabProps
> = ({
  productGroups,
  loading,
  showDraftsOnly = false,
  onToggleDraftsOnly,
  selectedProductGroupIds,
  getProductGroupSelectionKey,
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
  onUpdateProductGroupStatus,
  onPublishDraft,
  publishLoadingId,
  createButton,
  createPanel,
  accountId,
  channelId,
  onBulkUpdateComplete,
}) => {
  const [editingProductGroupKey, setEditingProductGroupKey] =
    useState<ProductGroupSelectionKey | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("");
  const [updatingProductGroupKey, setUpdatingProductGroupKey] =
    useState<ProductGroupSelectionKey | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalData, setStatusModalData] = useState<{
    productGroup: GoogleProductGroup;
    oldValue: string;
    newValue: string;
  } | null>(null);

  const isDraftProductGroup = (pg: GoogleProductGroup) => {
    const status = (pg.status || "").toUpperCase();
    if (status === "SAVED_DRAFT" || status === "DRAFT") return true;
    const id = pg.ad_id ?? pg.id ?? pg.product_group_id;
    return String(id).startsWith("draft-");
  };
  // Server returns only drafts when showDraftsOnly/draft_only is true, else all + drafts merged
  const displayedProductGroups = productGroups;

  // Bulk edit state
  const [showBulkConfirmationModal, setShowBulkConfirmationModal] =
    useState(false);
  const [pendingStatusAction, setPendingStatusAction] = useState<
    "ENABLED" | "PAUSED" | null
  >(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkUpdateResults, setBulkUpdateResults] = useState<{
    updated: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const getSelectedProductGroupsData = () =>
    displayedProductGroups.filter((pg) =>
      selectedProductGroupIds.has(getProductGroupSelectionKey(pg)),
    );
  const selectableProductGroups = displayedProductGroups.filter(
    (pg) => (pg.status || "").toUpperCase() !== "REMOVED",
  );

  const runBulkStatus = async (statusValue: "ENABLED" | "PAUSED") => {
    if (!accountId || !channelId || selectedProductGroupIds.size === 0) return;
    const accountIdNum = parseInt(accountId, 10);
    const channelIdNum = parseInt(channelId, 10);
    if (isNaN(accountIdNum) || isNaN(channelIdNum)) return;
    setBulkLoading(true);
    setBulkUpdateResults(null);
    try {
      const selectedRows = getSelectedProductGroupsData();
      // Backend accepts one adGroupId per request; group by ad group and call once per ad group
      const byAdGroup = new Map<number, GoogleProductGroup[]>();
      for (const pg of selectedRows) {
        const adGroupId = pg.adgroup_id ?? 0;
        if (!byAdGroup.has(adGroupId)) byAdGroup.set(adGroupId, []);
        byAdGroup.get(adGroupId)!.push(pg);
      }
      let totalUpdated = 0;
      let totalFailed = 0;
      const allErrors: string[] = [];
      for (const [adGroupId, pgs] of byAdGroup) {
        // Use ad_id (which maps to adId in database) - convert to string since backend expects text type
        const productGroupIds = pgs.map((pg) => {
          const adId = pg.ad_id ?? pg.id ?? pg.product_group_id;
          return String(adId);
        });
        const result =
          await googleAdwordsProductGroupsService.bulkUpdateGoogleProductGroups(
            accountIdNum,
            channelIdNum,
            {
              productGroupIds,
              action: "status",
              status: statusValue,
              adGroupId: String(adGroupId),
            },
          );
        totalUpdated += result?.updated ?? 0;
        totalFailed += result?.failed ?? 0;
        if (result?.errors?.length) allErrors.push(...result.errors);
      }
      setBulkUpdateResults({
        updated: totalUpdated,
        failed: totalFailed,
        errors: allErrors,
      });
      if (totalUpdated > 0 && onBulkUpdateComplete) onBulkUpdateComplete();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Bulk update failed";
      setBulkUpdateResults({
        updated: 0,
        failed: selectedProductGroupIds.size,
        errors: [message],
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleStatusClick = (productGroup: GoogleProductGroup) => {
    if (onUpdateProductGroupStatus) {
      const key = getProductGroupSelectionKey(productGroup);
      setEditingProductGroupKey(key);
      const currentStatus = (productGroup.status || "ENABLED").toUpperCase();
      const normalizedStatus =
        currentStatus === "ENABLE" || currentStatus === "ENABLED"
          ? "ENABLED"
          : currentStatus === "PAUSE" || currentStatus === "PAUSED"
            ? "PAUSED"
            : currentStatus;
      setEditingStatus(normalizedStatus);
    }
  };

  const handleStatusChange = (
    selectionKey: ProductGroupSelectionKey,
    newStatus: string,
  ) => {
    const productGroup = productGroups.find(
      (pg) => getProductGroupSelectionKey(pg) === selectionKey,
    );
    if (!productGroup) return;

    const oldStatus = (productGroup.status || "ENABLED").toUpperCase();
    const newStatusUpper = newStatus.toUpperCase();

    if (newStatusUpper !== oldStatus) {
      // Close dropdown immediately
      setEditingProductGroupKey(null);
      setEditingStatus("");

      // Format status values for display
      const statusDisplayMap: Record<string, string> = {
        ENABLED: "Enabled",
        PAUSED: "Paused",
        REMOVED: "Remove",
        Enabled: "Enabled",
        Paused: "Paused",
        Removed: "Remove",
      };
      const oldValue = statusDisplayMap[oldStatus] || oldStatus;
      const newValue = statusDisplayMap[newStatusUpper] || newStatusUpper;

      setStatusModalData({
        productGroup,
        oldValue,
        newValue,
      });
      setShowStatusModal(true);
    } else {
      setEditingProductGroupKey(null);
      setEditingStatus("");
    }
  };

  const confirmStatusChange = async () => {
    if (!statusModalData || !onUpdateProductGroupStatus) return;

    const selectionKey = getProductGroupSelectionKey(
      statusModalData.productGroup,
    );
    setUpdatingProductGroupKey(selectionKey);
    try {
      // Map display value back to API value
      const statusMap: Record<string, "ENABLED" | "PAUSED" | "REMOVED"> = {
        Enabled: "ENABLED",
        ENABLED: "ENABLED",
        Paused: "PAUSED",
        PAUSED: "PAUSED",
        Remove: "REMOVED",
        Removed: "REMOVED",
        REMOVED: "REMOVED",
      };
      const apiStatus =
        statusMap[statusModalData.newValue] ||
        (statusModalData.newValue.toUpperCase() as
          | "ENABLED"
          | "PAUSED"
          | "REMOVED");

      await onUpdateProductGroupStatus(selectionKey, apiStatus);
      setShowStatusModal(false);
      setStatusModalData(null);
    } catch (error) {
      console.error("Failed to update product group status:", error);
      alert("Failed to update product group status. Please try again.");
    } finally {
      setUpdatingProductGroupKey(null);
    }
  };

  const cancelStatusChange = () => {
    setShowStatusModal(false);
    setStatusModalData(null);
  };

  return (
    <>
      {/* Sync Message */}
      {syncMessage && (
        <div className="mb-4">
          <Banner
            type={
              syncMessage.includes("error") || syncMessage.includes("Failed")
                ? "error"
                : "success"
            }
            message={syncMessage}
            dismissable={true}
            onDismiss={() => {}}
          />
        </div>
      )}

      {/* Header with Filter Button */}
      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center gap-2">
          {createButton}
          {accountId && channelId && onBulkUpdateComplete && (() => {
            const bulkOptions = showDraftsOnly
              ? []
              : [
                  { value: "ENABLED", label: "Enable" },
                  { value: "PAUSED", label: "Pause" },
                ];
            return bulkOptions.length > 0 ? (
              <BulkActionsDropdown
                options={bulkOptions}
                selectedCount={selectedProductGroupIds.size}
                onSelect={(value) => {
                  setPendingStatusAction(value as "ENABLED" | "PAUSED");
                  setShowBulkConfirmationModal(true);
                }}
              />
            ) : null;
          })()}
          <button onClick={onToggleFilterPanel} className="edit-button">
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

      {/* Create Panel - below create button */}
      {createPanel}

      {/* Show drafts switch - above table (label inside switch like other tabs) */}
      <div className="flex items-center mb-3">
        <button
          type="button"
          role="switch"
          aria-checked={showDraftsOnly}
          onClick={() => onToggleDraftsOnly?.()}
          className={`relative inline-flex items-center h-6 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#072929] focus:ring-offset-2 overflow-hidden ${
            showDraftsOnly ? "bg-forest-f40" : "bg-gray-200"
          }`}
        >
          <span
            className={`absolute top-1/2 -translate-y-1/2 pointer-events-none text-[10.64px] font-medium whitespace-nowrap transition-all duration-200 ${
              showDraftsOnly
                ? "left-2 right-auto text-white"
                : "left-auto right-2 text-[#556179]"
            }`}
          >
            Draft
          </span>
          <span
            className={`absolute top-1/2 -translate-y-1/2 left-0.5 w-5 h-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
              showDraftsOnly ? "translate-x-10" : "translate-x-0"
            }`}
          />
        </button>
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
          ) : displayedProductGroups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[13.3px] text-[#556179] mb-4">
                {showDraftsOnly
                  ? "No draft product groups found"
                  : "No product groups found"}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e8e8e3]">
                  <th className="table-header w-[35px]">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={
                          selectableProductGroups.length > 0 &&
                          selectableProductGroups.every((pg) =>
                            selectedProductGroupIds.has(
                              getProductGroupSelectionKey(pg),
                            ),
                          )
                        }
                        onChange={(checked) =>
                          selectableProductGroups.forEach((pg) =>
                            onSelectProductGroup(
                              getProductGroupSelectionKey(pg),
                              checked,
                            ),
                          )
                        }
                        size="small"
                      />
                    </div>
                  </th>
                  <th
                    className="table-header"
                    onClick={() => onSort("product_group_name")}
                  >
                    <div className="flex items-center gap-1">
                      Product Group
                      {getSortIcon("product_group_name", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden lg:table-cell">
                    Ad Group
                  </th>
                  <th
                    className="table-header hidden md:table-cell"
                    onClick={() => onSort("status")}
                    style={{
                      width: "140px",
                      minWidth: "140px",
                      maxWidth: "140px",
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {getSortIcon("status", sortBy, sortOrder)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedProductGroups.map((productGroup, index) => {
                  const isLastRow = index === productGroups.length - 1;
                  const productGroupStatus = (
                    productGroup.status || ""
                  ).toUpperCase();
                  const isRemoved = productGroupStatus === "REMOVED";
                  return (
                    <tr
                      key={getProductGroupSelectionKey(productGroup)}
                      className={`${
                        !isLastRow ? "border-b border-[#e8e8e3]" : ""
                      } ${isRemoved ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"} transition-colors`}
                    >
                      <td className="table-cell">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedProductGroupIds.has(
                              getProductGroupSelectionKey(productGroup),
                            )}
                            onChange={(checked) =>
                              !isRemoved &&
                              onSelectProductGroup(
                                getProductGroupSelectionKey(productGroup),
                                checked,
                              )
                            }
                            disabled={isRemoved}
                            size="small"
                          />
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <span className="table-text leading-[1.26] underline cursor-pointer">
                            All products
                          </span>
                          {onPublishDraft &&
                            showDraftsOnly &&
                            isDraftProductGroup(productGroup) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onPublishDraft(productGroup);
                                }}
                                className="shrink-0 p-1 rounded cursor-pointer opacity-100 hover:bg-gray-100 border-0 bg-transparent inline-flex items-center justify-center"
                                style={{ pointerEvents: "auto" }}
                                title="Publish draft to Google Ads"
                                disabled={
                                  publishLoadingId === productGroup.id ||
                                  publishLoadingId === productGroup.product_group_id ||
                                  publishLoadingId === productGroup.ad_id
                                }
                              >
                                {publishLoadingId === productGroup.id ||
                                publishLoadingId === productGroup.product_group_id ||
                                publishLoadingId === productGroup.ad_id ? (
                                  <Loader size="sm" showMessage={false} />
                                ) : (
                                  <Send
                                    className="w-4 h-4 text-[#136D6D]"
                                    aria-hidden
                                  />
                                )}
                              </button>
                            )}
                        </div>
                      </td>
                      <td className="table-cell hidden lg:table-cell">
                        <span className="table-text leading-[1.26]">
                          {productGroup.adgroup_name || "—"}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell w-[140px] max-w-[140px]">
                        <div className="flex items-center gap-2 w-full relative">
                          {updatingProductGroupKey ===
                          getProductGroupSelectionKey(productGroup) ? (
                            <div className="flex items-center gap-2">
                              <StatusBadge
                                status={productGroup.status || "ENABLED"}
                              />
                              <Loader size="sm" showMessage={false} />
                            </div>
                          ) : editingProductGroupKey ===
                              getProductGroupSelectionKey(productGroup) &&
                            onUpdateProductGroupStatus &&
                            !isRemoved &&
                            !isDraftProductGroup(productGroup) ? (
                            <div
                              className="relative z-[100000] w-full"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Dropdown
                                options={[
                                  { value: "ENABLED", label: "Enabled" },
                                  { value: "PAUSED", label: "Paused" },
                                ]}
                                value={editingStatus}
                                onChange={(val) => {
                                  const newValue = val as string;
                                  handleStatusChange(
                                    getProductGroupSelectionKey(productGroup),
                                    newValue,
                                  );
                                }}
                                defaultOpen={true}
                                closeOnSelect={true}
                                buttonClassName="edit-button google-table-dropdown w-full"
                                width="w-full"
                                className="w-full"
                                menuClassName="z-[100000]"
                                disabled={isRemoved}
                              />
                            </div>
                          ) : isDraftProductGroup(productGroup) ? (
                            <span className="table-text leading-[1.26] cursor-default">
                              {productGroup.status === "SAVED_DRAFT" ||
                              productGroup.status === "DRAFT"
                                ? "Saved as draft"
                                : productGroup.status || "Enabled"}
                            </span>
                          ) : productGroup.status ? (
                            <button
                              type="button"
                              className={
                                onUpdateProductGroupStatus && !isRemoved
                                  ? "edit-button w-full text-[13.3px] flex items-center justify-between"
                                  : "edit-button w-full text-[13.3px] flex items-center justify-between cursor-default"
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isRemoved) {
                                  handleStatusClick(productGroup);
                                }
                              }}
                              disabled={
                                !onUpdateProductGroupStatus || isRemoved
                              }
                            >
                              <span className="truncate flex-1 min-w-0 text-left">
                                {productGroup.status === "ENABLED" ||
                                productGroup.status === "Enabled" ||
                                productGroup.status === "ENABLE"
                                  ? "Enabled"
                                  : productGroup.status === "PAUSED" ||
                                      productGroup.status === "Paused" ||
                                      productGroup.status === "PAUSE"
                                    ? "Paused"
                                    : productGroup.status || "Enabled"}
                              </span>
                              {onUpdateProductGroupStatus && (
                                <svg
                                  className="w-4 h-4 text-[#072929] flex-shrink-0"
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
                              )}
                            </button>
                          ) : null}
                        </div>
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
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Bulk confirmation modal */}
      {accountId && channelId && onBulkUpdateComplete && (
        <BulkUpdateConfirmationModal
          isOpen={showBulkConfirmationModal}
          onClose={() => {
            setShowBulkConfirmationModal(false);
            setPendingStatusAction(null);
            setBulkUpdateResults(null);
          }}
          entityLabel="product group"
          entityNameColumn="Product Group"
          selectedCount={selectedProductGroupIds.size}
          bulkUpdateResults={bulkUpdateResults}
          isValueChange={false}
          valueChangeLabel=""
          previewRows={getSelectedProductGroupsData().map((pg) => {
            const oldStatus = formatStatusForDisplay(pg.status || "ENABLED");
            const newStatus = pendingStatusAction
              ? formatStatusForDisplay(pendingStatusAction)
              : oldStatus;
            return {
              name: pg.product_group_name || "All products",
              oldValue: oldStatus,
              newValue: newStatus,
            } as BulkUpdatePreviewRow;
          })}
          actionDetails={
            !bulkUpdateResults && pendingStatusAction
              ? ({
                  type: "status",
                  newStatus:
                    pendingStatusAction.charAt(0) +
                    pendingStatusAction.slice(1).toLowerCase(),
                } as BulkUpdateStatusDetails)
              : null
          }
          loading={bulkLoading}
          loadingMessage="Updating product groups..."
          successMessage="All product groups updated successfully!"
          onConfirm={async () => {
            if (pendingStatusAction) await runBulkStatus(pendingStatusAction);
          }}
        />
      )}

      {/* Status Change Confirmation Modal */}
      {showStatusModal && statusModalData && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              cancelStatusChange();
            }
          }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={cancelStatusChange}
          />

          {/* Modal */}
          <div
            className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-[#E8E8E3]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                Confirm Status Change
              </h3>

              {/* Content */}
              <div className="mb-4">
                <p className="text-[12.16px] text-[#556179] mb-2">
                  Product Group:{" "}
                  <span className="font-semibold text-[#072929]">
                    {statusModalData.productGroup.product_group_name ||
                      "All products"}
                  </span>
                </p>
                <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[12.16px] text-[#556179]">
                      Status:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[12.16px] text-[#556179]">
                        {statusModalData.oldValue}
                      </span>
                      <span className="text-[12.16px] text-[#556179]">→</span>
                      <span className="text-[12.16px] font-semibold text-[#072929]">
                        {statusModalData.newValue}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={cancelStatusChange}
                  className="cancel-button"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmStatusChange}
                  disabled={
                    updatingProductGroupKey ===
                    getProductGroupSelectionKey(statusModalData.productGroup)
                  }
                  className="create-entity-button btn-sm"
                >
                  {updatingProductGroupKey ===
                  getProductGroupSelectionKey(statusModalData.productGroup)
                    ? "Updating..."
                    : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
