import React, { useState } from "react";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { Dropdown } from "../../../../components/ui/Dropdown";
import { Banner } from "../../../../components/ui/Banner";
import { Loader } from "../../../../components/ui/Loader";
import { FilterPanel, type FilterValues } from "../../../../components/filters/FilterPanel";

interface GoogleAssetGroup {
  id: number;
  asset_group_id: number;
  name?: string;
  status: string;
  final_urls?: string[];
  campaign_id?: number;
  campaign_name?: string;
  ctr?: number | string;
  spends?: number | string;
  sales?: number | string;
}

interface GoogleCampaignDetailAssetGroupsTabProps {
  assetGroups: GoogleAssetGroup[];
  loading: boolean;
  selectedAssetGroupIds: Set<number>;
  onSelectAll: (checked: boolean) => void;
  onSelectAssetGroup: (id: number, checked: boolean) => void;
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
  formatPercentage: (value: number | string | undefined) => string;
  formatCurrency2Decimals: (value: number | string | undefined) => string;
  getSortIcon: (column: string, currentSortBy: string, currentSortOrder: "asc" | "desc") => React.ReactNode;
  onEditAssetGroup?: (assetGroup: GoogleAssetGroup) => void;
  editLoadingAssetGroupId?: number | null;
  onUpdateAssetGroupStatus?: (assetGroupId: number, status: string) => Promise<void>;
}

export const GoogleCampaignDetailAssetGroupsTab: React.FC<GoogleCampaignDetailAssetGroupsTabProps> = ({
  assetGroups,
  loading,
  selectedAssetGroupIds,
  onSelectAll,
  onSelectAssetGroup,
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
  formatPercentage,
  formatCurrency2Decimals,
  getSortIcon,
  onEditAssetGroup,
  editLoadingAssetGroupId,
  onUpdateAssetGroupStatus,
}) => {
  const [editingAssetGroupId, setEditingAssetGroupId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<"status" | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [updatingAssetGroupId, setUpdatingAssetGroupId] = useState<number | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalData, setStatusModalData] = useState<{
    assetGroup: GoogleAssetGroup;
    oldValue: string;
    newValue: string;
  } | null>(null);

  const handleStatusClick = (assetGroup: GoogleAssetGroup) => {
    if (onUpdateAssetGroupStatus) {
      setEditingAssetGroupId(assetGroup.id);
      setEditingField("status");
      // Normalize status to uppercase to match dropdown options
      const currentStatus = (assetGroup.status || "ENABLED").toUpperCase();
      // Map common variations to standard values
      const normalizedStatus =
        currentStatus === "ENABLE" || currentStatus === "ENABLED"
          ? "ENABLED"
          : currentStatus === "PAUSE" || currentStatus === "PAUSED"
          ? "PAUSED"
          : currentStatus;
      setEditingValue(normalizedStatus);
    }
  };

  const handleStatusChange = (assetGroupId: number, newStatus: string) => {
    const assetGroup = assetGroups.find((ag) => ag.id === assetGroupId);
    if (!assetGroup) {
      setEditingAssetGroupId(null);
      setEditingField(null);
      setEditingValue("");
      return;
    }

    // Status uses confirmation modal
    const currentStatus = (assetGroup.status || "ENABLED").toUpperCase();
    const normalizedCurrent =
      currentStatus === "ENABLE" || currentStatus === "ENABLED"
        ? "ENABLED"
        : currentStatus === "PAUSE" || currentStatus === "PAUSED"
        ? "PAUSED"
        : currentStatus;
    const newStatusUpper = newStatus.toUpperCase();
    const hasChanged = newStatusUpper !== normalizedCurrent;

    if (hasChanged) {
      // Format status values for display
      const statusDisplayMap: Record<string, string> = {
        ENABLED: "Enabled",
        PAUSED: "Paused",
        Enabled: "Enabled",
        Paused: "Paused",
      };
      const oldValue = statusDisplayMap[normalizedCurrent] || normalizedCurrent;
      const newValue = statusDisplayMap[newStatusUpper] || newStatus;

      setStatusModalData({
        assetGroup,
        oldValue,
        newValue,
      });
      setShowStatusModal(true);
    }
    setEditingAssetGroupId(null);
    setEditingField(null);
    setEditingValue("");
  };

  const handleEditEnd = () => {
    if (!editingAssetGroupId || !editingField) return;

    const assetGroup = assetGroups.find((ag) => ag.id === editingAssetGroupId);
    if (!assetGroup) {
      setEditingAssetGroupId(null);
      setEditingField(null);
      setEditingValue("");
      return;
    }

    if (editingField === "status") {
      handleStatusChange(editingAssetGroupId, editingValue);
    }
  };

  const confirmStatusChange = async () => {
    if (!statusModalData || !onUpdateAssetGroupStatus) return;

    setUpdatingAssetGroupId(statusModalData.assetGroup.id);
    try {
      // Map display value back to API value
      const statusMap: Record<string, "ENABLED" | "PAUSED"> = {
        Enabled: "ENABLED",
        ENABLED: "ENABLED",
        Paused: "PAUSED",
        PAUSED: "PAUSED",
      };
      const apiStatus = statusMap[statusModalData.newValue] || statusModalData.newValue.toUpperCase() as "ENABLED" | "PAUSED";
      
      await onUpdateAssetGroupStatus(statusModalData.assetGroup.id, apiStatus);
      setShowStatusModal(false);
      setStatusModalData(null);
    } catch (error) {
      console.error("Failed to update asset group status:", error);
      alert("Failed to update asset group status. Please try again.");
    } finally {
      setUpdatingAssetGroupId(null);
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
          Asset Groups
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
            className="create-entity-button disabled:opacity-50"
          >
            {syncing ? (
              <span className="flex items-center gap-2 text-[10.64px] text-white font-normal">
                <Loader size="sm" variant="white" showMessage={false} className="!flex-row gap-2" />
                Syncing...
              </span>
            ) : (
              <span className="text-[10.64px] text-white font-normal">Sync Asset Groups</span>
            )}
          </button>
          {onSyncAnalytics && (
            <button
              onClick={onSyncAnalytics}
              disabled={syncing || syncingAnalytics}
              className="create-entity-button disabled:opacity-50"
            >
              {syncingAnalytics ? (
                <span className="flex items-center gap-2 text-[10.64px] text-white font-normal">
                  <Loader size="sm" variant="white" showMessage={false} className="!flex-row gap-2" />
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
              { value: "name", label: "Asset Group Name" },
              { value: "status", label: "Status" },
            ]}
          />
        </div>
      )}

      {/* Asset Groups Table */}
      <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <div className="text-center py-8 text-[#556179] text-[13.3px]">
              Loading asset groups...
            </div>
          ) : assetGroups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[13.3px] text-[#556179] mb-4">
                No asset groups found
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
                          assetGroups.length > 0 &&
                          assetGroups.every((ag) => selectedAssetGroupIds.has(ag.id))
                        }
                        onChange={onSelectAll}
                        size="small"
                      />
                    </div>
                  </th>
                  <th
                    className="table-header"
                    onClick={() => onSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Asset Group Name
                      {getSortIcon("name", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th
                    className="table-header cursor-pointer hover:bg-gray-50 hidden md:table-cell"
                    onClick={() => onSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {getSortIcon("status", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th className="table-header hidden lg:table-cell">
                    Final URLs
                  </th>
                  <th className="table-header hidden md:table-cell">
                    CTR
                  </th>
                  <th className="table-header hidden md:table-cell">
                    Spends
                  </th>
                  <th className="table-header hidden md:table-cell">
                    Sales
                  </th>
                </tr>
              </thead>
              <tbody>
                {assetGroups.map((assetGroup, index) => {
                  const isLastRow = index === assetGroups.length - 1;
                  return (
                    <tr
                      key={assetGroup.id}
                      className={`${
                        !isLastRow ? "border-b border-[#e8e8e3]" : ""
                      } hover:bg-gray-50 transition-colors`}
                    >
                      <td className="table-cell">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedAssetGroupIds.has(assetGroup.id)}
                            onChange={(checked) => onSelectAssetGroup(assetGroup.id, checked)}
                            size="small"
                          />
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="group relative flex items-center gap-2">
                          <span className="table-text leading-[1.26]">
                            {assetGroup.name || "—"}
                          </span>
                          {onEditAssetGroup && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditAssetGroup(assetGroup);
                              }}
                              className="table-edit-icon flex-shrink-0"
                              title="Edit asset group"
                              disabled={editLoadingAssetGroupId === assetGroup.id}
                            >
                              {editLoadingAssetGroupId === assetGroup.id ? (
                                <Loader size="sm" showMessage={false} />
                              ) : (
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
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          {updatingAssetGroupId === assetGroup.id ? (
                            <div className="flex items-center gap-2">
                              <StatusBadge status={assetGroup.status} />
                              <Loader size="sm" showMessage={false} />
                            </div>
                          ) : editingAssetGroupId === assetGroup.id &&
                            editingField === "status" &&
                            onUpdateAssetGroupStatus ? (
                            <Dropdown<string>
                              options={[
                                { value: "ENABLED", label: "Enabled" },
                                { value: "PAUSED", label: "Paused" },
                              ]}
                              value={editingValue}
                              onChange={(val) => {
                                handleStatusChange(assetGroup.id, val as string);
                              }}
                              defaultOpen={true}
                              closeOnSelect={true}
                              buttonClassName="text-[13.3px] px-2 py-1"
                              width="w-32"
                            />
                          ) : (
                            <div
                              className={
                                onUpdateAssetGroupStatus
                                  ? "cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                                  : ""
                              }
                              onClick={() =>
                                onUpdateAssetGroupStatus && handleStatusClick(assetGroup)
                              }
                            >
                              <StatusBadge status={assetGroup.status} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="table-cell hidden lg:table-cell">
                        <span className="table-text leading-[1.26] truncate block max-w-[300px]">
                          {assetGroup.final_urls && Array.isArray(assetGroup.final_urls) && assetGroup.final_urls.length > 0
                            ? assetGroup.final_urls[0]
                            : assetGroup.final_urls && typeof assetGroup.final_urls === 'string'
                            ? assetGroup.final_urls
                            : "—"}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatPercentage(assetGroup.ctr)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatCurrency2Decimals(assetGroup.spends)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="table-text leading-[1.26]">
                          {formatCurrency2Decimals(assetGroup.sales)}
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
      {!loading && assetGroups.length > 0 && totalPages > 1 && (
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

      {/* Status Change Confirmation Modal */}
      {showStatusModal && statusModalData && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              cancelStatusChange();
            }
          }}
        >
          <div
            className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[18px] font-semibold text-[#072929] mb-4">
              Confirm Status Change
            </h3>
            <div className="mb-4">
              <p className="text-[12.8px] text-[#556179] mb-2">
                Asset Group:{" "}
                <span className="font-semibold text-[#072929]">
                  {statusModalData.assetGroup.name || "Unnamed Asset Group"}
                </span>
              </p>
              <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-[12.8px] text-[#556179]">Status:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[12.8px] text-[#556179]">
                      {statusModalData.oldValue}
                    </span>
                    <span className="text-[12.8px] text-[#556179]">→</span>
                    <span className="text-[12.8px] font-semibold text-[#072929]">
                      {statusModalData.newValue}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelStatusChange}
                className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-button-text text-text-primary rounded-lg items-center hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStatusChange}
                disabled={updatingAssetGroupId === statusModalData.assetGroup.id}
                className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingAssetGroupId === statusModalData.assetGroup.id
                  ? "Updating..."
                  : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

