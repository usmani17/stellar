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
import { GoogleAssetManagementPanel } from "../../../../components/google/GoogleAssetManagementPanel";
import {
  BulkUpdateConfirmationModal,
  type BulkUpdatePreviewRow,
  type BulkUpdateStatusDetails,
} from "../BulkUpdateConfirmationModal";
import { BulkActionsDropdown } from "../BulkActionsDropdown";
import { formatStatusForDisplay } from "../../utils/googleAdsUtils";

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
  health?: string; // Health detection status
  headline_count?: number; // Number of headlines
  image_count?: number; // Number of images
  video_count?: number; // Number of videos
  description_count?: number; // Number of descriptions
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
  syncMessage: string | null;
  formatPercentage: (value: number | string | undefined) => string;
  formatCurrency2Decimals: (value: number | string | undefined) => string;
  getSortIcon: (
    column: string,
    currentSortBy: string,
    currentSortOrder: "asc" | "desc"
  ) => React.ReactNode;
  onEditAssetGroup?: (assetGroup: GoogleAssetGroup) => void;
  editLoadingAssetGroupId?: number | null;
  onUpdateAssetGroupStatus?: (
    assetGroupId: number,
    status: string
  ) => Promise<void>;
  onBulkUpdateAssetGroupStatus?: (
    assetGroupIds: (string | number)[],
    status: "ENABLED" | "PAUSED"
  ) => Promise<{ updated: number; failed: number; errors: string[] }>;
  profileId?: number; // Profile ID for asset management
  campaignId?: string | number; // Campaign ID for asset management
  onViewAssets?: (assetGroup: GoogleAssetGroup) => void;
  viewAssetsModalOpen?: boolean;
  viewingAssetGroupName?: string;
  assetGroupAssets?: {
    headlines: string[];
    descriptions: string[];
    long_headline?: string;
    marketing_image_url?: string;
    square_marketing_image_url?: string;
    logo_url?: string;
    business_name?: string;
    final_urls?: string[];
    video_assets?: Array<{
      id: number;
      name?: string;
      youtube_video_id?: string;
    }>;
  } | null;
  loadingAssets?: boolean;
  onCloseViewAssetsModal?: () => void;
  createButton?: React.ReactNode;
  createPanel?: React.ReactNode;
  onBulkUpdateComplete?: () => void;
}

export const GoogleCampaignDetailAssetGroupsTab: React.FC<
  GoogleCampaignDetailAssetGroupsTabProps
> = ({
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
  syncMessage,
  formatPercentage,
  formatCurrency2Decimals,
  getSortIcon,
  onEditAssetGroup,
  editLoadingAssetGroupId,
  onUpdateAssetGroupStatus,
  onBulkUpdateAssetGroupStatus,
  profileId,
  campaignId,
  onViewAssets,
  viewAssetsModalOpen = false,
  viewingAssetGroupName = "",
  assetGroupAssets,
  loadingAssets = false,
  onCloseViewAssetsModal,
  createButton,
  createPanel,
  onBulkUpdateComplete,
}) => {
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

  const filteredAssetGroups = React.useMemo(() => {
    if (!filters || filters.length === 0) return assetGroups;

    return assetGroups.filter((ag) =>
      filters.every((filter) => {
        const fieldValue = (ag as any)[filter.field];
        if (fieldValue == null) return false;

        // STATUS FILTER — handle FIRST
        if (filter.field === "status") {
          return (
            String(fieldValue).toUpperCase() ===
            String(filter.value).toUpperCase()
          );
        }

        // STRING FILTERS (name, etc.)
        if (
          typeof fieldValue === "string" &&
          typeof filter.value === "string"
        ) {
          const left = fieldValue.toLowerCase();
          const right = filter.value.toLowerCase();

          switch (filter.operator) {
            case "contains":
              return left.includes(right);
            case "not_contains":
              return !left.includes(right);
            case "equals":
              return left === right;
            default:
              return true;
          }
        }

        return true;
      })
    );
  }, [assetGroups, filters]);

  const getSelectedAssetGroupsData = () =>
    filteredAssetGroups.filter((ag) => selectedAssetGroupIds.has(ag.id));

  const selectableAssetGroups = filteredAssetGroups.filter(
    (ag) => (ag.status || "").toUpperCase() !== "REMOVED"
  );

  const isAssetGroupRemoved = (ag: { status?: string }) =>
    (ag.status || "").toUpperCase() === "REMOVED";

  const runBulkStatus = async (statusValue: "ENABLED" | "PAUSED") => {
    if (
      (!onUpdateAssetGroupStatus && !onBulkUpdateAssetGroupStatus) ||
      selectedAssetGroupIds.size === 0
    )
      return;
    const selectedData = getSelectedAssetGroupsData();
    setBulkLoading(true);
    setBulkUpdateResults(null);
    try {
      if (onBulkUpdateAssetGroupStatus) {
        const assetGroupIds = selectedData
          .map((ag) => ag.asset_group_id)
          .filter((id): id is number => id != null);
        const result = await onBulkUpdateAssetGroupStatus(
          assetGroupIds,
          statusValue
        );
        setBulkUpdateResults({
          updated: result.updated,
          failed: result.failed,
          errors: result.errors ?? [],
        });
        if (onBulkUpdateComplete) onBulkUpdateComplete();
      } else if (onUpdateAssetGroupStatus) {
        let totalUpdated = 0;
        let totalFailed = 0;
        const allErrors: string[] = [];
        for (const ag of selectedData) {
          try {
            await onUpdateAssetGroupStatus(ag.id, statusValue);
            totalUpdated += 1;
          } catch (err: unknown) {
            totalFailed += 1;
            const e = err as { message?: string };
            allErrors.push(e?.message || "Failed");
          }
        }
        setBulkUpdateResults({
          updated: totalUpdated,
          failed: totalFailed,
          errors: allErrors,
        });
        if (onBulkUpdateComplete) onBulkUpdateComplete();
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const [editingAssetGroupId, setEditingAssetGroupId] = useState<number | null>(
    null
  );
  const [editingField, setEditingField] = useState<"status" | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [updatingAssetGroupId, setUpdatingAssetGroupId] = useState<
    number | null
  >(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalData, setStatusModalData] = useState<{
    assetGroup: GoogleAssetGroup;
    oldValue: string;
    newValue: string;
  } | null>(null);
  const [assetManagementPanelOpen, setAssetManagementPanelOpen] =
    useState(false);
  const [
    selectedAssetGroupIdForManagement,
    setSelectedAssetGroupIdForManagement,
  ] = useState<string | null>(null);

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
      // Close dropdown immediately when REMOVED is selected
      if (newStatusUpper === "REMOVED") {
        setEditingAssetGroupId(null);
        setEditingField(null);
        setEditingValue("");
      }

      // Format status values for display
      const statusDisplayMap: Record<string, string> = {
        ENABLED: "Enabled",
        PAUSED: "Paused",
        REMOVED: "Remove",
        Enabled: "Enabled",
        Paused: "Paused",
        Removed: "Remove",
      };
      const oldValue = statusDisplayMap[normalizedCurrent] || normalizedCurrent;
      const newValue = statusDisplayMap[newStatusUpper] || newStatus;

      setStatusModalData({
        assetGroup,
        oldValue,
        newValue,
      });
      setShowStatusModal(true);
    } else {
      setEditingAssetGroupId(null);
      setEditingField(null);
      setEditingValue("");
    }
  };

  const confirmStatusChange = async () => {
    if (!statusModalData || !onUpdateAssetGroupStatus) return;

    setUpdatingAssetGroupId(statusModalData.assetGroup.id);
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
          Asset Groups
        </h2>
        <div className="flex items-center gap-2">
          {createButton}
          {(onUpdateAssetGroupStatus || onBulkUpdateAssetGroupStatus) &&
            onBulkUpdateComplete && (
              <BulkActionsDropdown
                options={[
                  { value: "ENABLED", label: "Enable" },
                  { value: "PAUSED", label: "Pause" },
                ]}
                selectedCount={selectedAssetGroupIds.size}
                onSelect={(value) => {
                  setPendingStatusAction(value as "ENABLED" | "PAUSED");
                  setShowBulkConfirmationModal(true);
                }}
              />
            )}
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
          ) : filteredAssetGroups.length === 0 ? (
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
                          selectableAssetGroups.length > 0 &&
                          selectableAssetGroups.every((ag) =>
                            selectedAssetGroupIds.has(ag.id)
                          )
                        }
                        onChange={(checked) =>
                          selectableAssetGroups.forEach((ag) =>
                            onSelectAssetGroup(ag.id, checked)
                          )
                        }
                        size="small"
                      />
                    </div>
                  </th>
                  <th className="table-header" onClick={() => onSort("name")}>
                    <div className="flex items-center gap-1">
                      Asset Group Name
                      {getSortIcon("name", sortBy, sortOrder)}
                    </div>
                  </th>
                  <th
                    className="table-header hidden md:table-cell w-[150px] max-w-[150px]"
                    onClick={() => onSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {getSortIcon("status", sortBy, sortOrder)}
                    </div>
                  </th>
                  {/* <th className="table-header hidden md:table-cell">
                    CTR
                  </th>
                  <th className="table-header hidden md:table-cell">
                    Cost
                  </th>
                  <th className="table-header hidden md:table-cell">
                    Conv. value
                  </th> */}
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssetGroups.map((assetGroup, index) => {
                  const isLastRow = index === filteredAssetGroups.length - 1;
                  const assetGroupStatus = (
                    assetGroup.status || ""
                  ).toUpperCase();
                  const isRemoved = assetGroupStatus === "REMOVED";
                  return (
                    <tr
                      key={assetGroup.id}
                      className={`${
                        !isLastRow ? "border-b border-[#e8e8e3]" : ""
                      } ${
                        isRemoved
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-gray-50"
                      } transition-colors`}
                    >
                      <td className="table-cell">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedAssetGroupIds.has(assetGroup.id)}
                            onChange={(checked) =>
                              !isAssetGroupRemoved(assetGroup) &&
                              onSelectAssetGroup(assetGroup.id, checked)
                            }
                            disabled={isRemoved}
                            size="small"
                          />
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="group relative flex items-center gap-2">
                          <span className="table-text leading-[1.26]">
                            {assetGroup.name || "—"}
                          </span>
                          {/* TODO: Re-enable edit icon later
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
                          */}
                        </div>
                      </td>
                      <td className="table-cell hidden md:table-cell w-[150px] max-w-[150px]">
                        <div className="flex items-center gap-2 w-full relative">
                          {updatingAssetGroupId === assetGroup.id ? (
                            <div className="flex items-center gap-2">
                              <StatusBadge status={assetGroup.status} />
                              <Loader size="sm" showMessage={false} />
                            </div>
                          ) : editingAssetGroupId === assetGroup.id &&
                            editingField === "status" &&
                            onUpdateAssetGroupStatus &&
                            !isRemoved ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="w-full relative"
                            >
                              <Dropdown<string>
                                options={[
                                  { value: "ENABLED", label: "Enabled" },
                                  { value: "PAUSED", label: "Paused" },
                                  { value: "REMOVED", label: "Remove" },
                                ]}
                                value={editingValue}
                                onChange={(val) => {
                                  handleStatusChange(
                                    assetGroup.id,
                                    val as string
                                  );
                                }}
                                defaultOpen={true}
                                closeOnSelect={true}
                                buttonClassName="w-full text-[13.3px] px-2 py-1"
                                width="w-full"
                                className="w-full"
                                menuClassName="z-[100000]"
                                disabled={isRemoved}
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              className={
                                onUpdateAssetGroupStatus && !isRemoved
                                  ? "inline-edit-dropdown w-full text-[13.3px] flex items-center justify-between"
                                  : "inline-edit-dropdown w-full text-[13.3px] flex items-center justify-between cursor-default"
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onUpdateAssetGroupStatus && !isRemoved) {
                                  handleStatusClick(assetGroup);
                                }
                              }}
                              disabled={!onUpdateAssetGroupStatus || isRemoved}
                            >
                              <span className="truncate flex-1 min-w-0 text-left">
                                {assetGroup.status === "ENABLED" ||
                                assetGroup.status === "Enabled" ||
                                assetGroup.status === "ENABLE"
                                  ? "Enabled"
                                  : assetGroup.status === "PAUSED" ||
                                    assetGroup.status === "Paused" ||
                                    assetGroup.status === "PAUSE"
                                  ? "Paused"
                                  : assetGroup.status || "Enabled"}
                              </span>
                              {onUpdateAssetGroupStatus && (
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
                          )}
                        </div>
                      </td>
                      {/* <td className="table-cell hidden md:table-cell">
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
                      </td> */}
                      <td className="table-cell">
                        {onViewAssets && assetGroup.asset_group_id && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewAssets(assetGroup);
                            }}
                            className="text-xs text-[#136D6D] hover:text-[#0d5252] font-medium px-2 py-1 flex items-center gap-1 transition-colors"
                            title="View Assets"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                            View Assets
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Asset Management Panel */}
      {profileId && selectedAssetGroupIdForManagement && (
        <GoogleAssetManagementPanel
          isOpen={assetManagementPanelOpen}
          onClose={() => {
            setAssetManagementPanelOpen(false);
            setSelectedAssetGroupIdForManagement(null);
          }}
          profileId={profileId}
          assetGroupId={selectedAssetGroupIdForManagement}
          campaignId={campaignId ? String(campaignId) : undefined}
          mode="asset-group"
        />
      )}

      {/* Pagination */}
      {!loading && filteredAssetGroups.length > 0 && totalPages > 1 && (
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

      {/* View Assets Modal */}
      {viewAssetsModalOpen && onCloseViewAssetsModal && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onCloseViewAssetsModal();
            }
          }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={onCloseViewAssetsModal}
          />

          {/* Modal */}
          <div
            className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] border border-[#E8E8E3] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#E8E8E3]">
              <h3 className="text-[20px] font-semibold text-[#072929]">
                View Assets - {viewingAssetGroupName}
              </h3>
              <button
                onClick={onCloseViewAssetsModal}
                className="text-[#556179] hover:text-[#072929] transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingAssets ? (
                <div className="flex items-center justify-center py-12">
                  <Loader size="lg" message="Loading assets..." />
                </div>
              ) : assetGroupAssets ? (
                <div className="space-y-6">
                  {/* Beautiful Header: Business Name + Logo */}
                  {(assetGroupAssets.business_name ||
                    assetGroupAssets.logo_url) && (
                    <div className="flex items-center justify-between p-5 bg-gradient-to-r from-[#fefefb] via-[#fafaf7] to-[#f9f9f6] rounded-xl border border-[#e8e8e3] shadow-sm">
                      <div className="flex-1">
                        {assetGroupAssets.business_name && (
                          <h4 className="text-[18px] font-semibold text-[#072929]">
                            {assetGroupAssets.business_name}
                          </h4>
                        )}
                      </div>
                      {assetGroupAssets.logo_url && (
                        <div className="ml-6 p-3 bg-white rounded-lg border border-[#e8e8e3] shadow-sm">
                          <img
                            src={assetGroupAssets.logo_url}
                            alt="Logo"
                            className="h-16 w-16 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Final URLs */}
                  {assetGroupAssets.final_urls &&
                    assetGroupAssets.final_urls.length > 0 && (
                      <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-xl p-4 shadow-sm">
                        <h4 className="text-[13px] font-semibold text-[#072929] mb-3 flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-[#136D6D]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                          Final URLs ({assetGroupAssets.final_urls.length})
                        </h4>
                        <div className="space-y-2">
                          {assetGroupAssets.final_urls.map((url, index) => (
                            <a
                              key={index}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[13px] text-[#136D6D] hover:text-[#0d5252] hover:underline block truncate flex items-center gap-2"
                              title={url}
                            >
                              <svg
                                className="w-3.5 h-3.5 flex-shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                              {url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Headlines - Beautiful Card */}
                  {assetGroupAssets.headlines &&
                    assetGroupAssets.headlines.filter((h) => h && h.trim())
                      .length > 0 && (
                      <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <h4 className="text-[15px] font-semibold text-[#072929]">
                            Headlines
                          </h4>
                          <span className="px-2.5 py-0.5 bg-[#136D6D]/10 text-[#136D6D] text-[11px] font-medium rounded-full">
                            {
                              assetGroupAssets.headlines.filter(
                                (h) => h && h.trim()
                              ).length
                            }
                          </span>
                        </div>
                        <ol className="space-y-3 list-none">
                          {assetGroupAssets.headlines
                            .filter((h) => h && h.trim())
                            .map((headline, index) => (
                              <li
                                key={index}
                                className="flex items-start gap-3"
                              >
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#136D6D]/10 text-[#136D6D] text-[12px] font-semibold flex items-center justify-center mt-0.5">
                                  {index + 1}
                                </span>
                                <p className="text-[14px] text-[#072929] leading-relaxed flex-1">
                                  {headline}
                                </p>
                              </li>
                            ))}
                        </ol>
                      </div>
                    )}

                  {/* Descriptions - Beautiful Card */}
                  {assetGroupAssets.descriptions &&
                    assetGroupAssets.descriptions.filter((d) => d && d.trim())
                      .length > 0 && (
                      <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <h4 className="text-[15px] font-semibold text-[#072929]">
                            Descriptions
                          </h4>
                          <span className="px-2.5 py-0.5 bg-[#136D6D]/10 text-[#136D6D] text-[11px] font-medium rounded-full">
                            {
                              assetGroupAssets.descriptions.filter(
                                (d) => d && d.trim()
                              ).length
                            }
                          </span>
                        </div>
                        <ol className="space-y-3 list-none">
                          {assetGroupAssets.descriptions
                            .filter((d) => d && d.trim())
                            .map((description, index) => (
                              <li
                                key={index}
                                className="flex items-start gap-3"
                              >
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#136D6D]/10 text-[#136D6D] text-[12px] font-semibold flex items-center justify-center mt-0.5">
                                  {index + 1}
                                </span>
                                <p className="text-[14px] text-[#072929] leading-relaxed flex-1">
                                  {description}
                                </p>
                              </li>
                            ))}
                        </ol>
                      </div>
                    )}

                  {/* Long Headline - Beautiful Card */}
                  {assetGroupAssets.long_headline && (
                    <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-xl p-5 shadow-sm">
                      <h4 className="text-[15px] font-semibold text-[#072929] mb-3">
                        Long Headline
                      </h4>
                      <p className="text-[14px] text-[#072929] leading-relaxed pl-2 border-l-3 border-[#136D6D]">
                        {assetGroupAssets.long_headline}
                      </p>
                    </div>
                  )}

                  {/* Media Assets - Images First */}
                  {(assetGroupAssets.marketing_image_url ||
                    assetGroupAssets.square_marketing_image_url) && (
                    <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-xl p-5 shadow-sm">
                      <h4 className="text-[15px] font-semibold text-[#072929] mb-4">
                        Media Assets
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Marketing Image */}
                        {assetGroupAssets.marketing_image_url && (
                          <div className="group border border-[#e8e8e3] rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                            <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
                              <img
                                src={assetGroupAssets.marketing_image_url}
                                alt="Marketing Image"
                                className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            </div>
                            <div className="p-3 bg-white border-t border-[#e8e8e3]">
                              <p className="text-[12px] font-medium text-[#556179] mb-2">
                                Marketing Image
                              </p>
                              <a
                                href={assetGroupAssets.marketing_image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[11px] text-[#136D6D] hover:text-[#0d5252] font-medium hover:underline"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                                View Full
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Square Marketing Image */}
                        {assetGroupAssets.square_marketing_image_url && (
                          <div className="group border border-[#e8e8e3] rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                            <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
                              <img
                                src={
                                  assetGroupAssets.square_marketing_image_url
                                }
                                alt="Square Marketing Image"
                                className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            </div>
                            <div className="p-3 bg-white border-t border-[#e8e8e3]">
                              <p className="text-[12px] font-medium text-[#556179] mb-2">
                                Square Marketing Image
                              </p>
                              <a
                                href={
                                  assetGroupAssets.square_marketing_image_url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[11px] text-[#136D6D] hover:text-[#0d5252] font-medium hover:underline"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                                View Full
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Video Assets - After Media Images */}
                  {assetGroupAssets.video_assets &&
                    assetGroupAssets.video_assets.length > 0 && (
                      <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-xl p-5 shadow-sm">
                        <h4 className="text-[15px] font-semibold text-[#072929] mb-4 flex items-center gap-2">
                          <svg
                            className="w-5 h-5 text-[#136D6D]"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                          </svg>
                          Video Assets
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {assetGroupAssets.video_assets.map(
                            (video: any, index: number) => {
                              if (!video.youtube_video_id) return null;
                              return (
                                <div
                                  key={index}
                                  className="group border border-[#e8e8e3] rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200"
                                >
                                  <div className="aspect-video bg-gray-900 flex items-center justify-center overflow-hidden rounded-t-xl">
                                    <iframe
                                      className="w-full h-full"
                                      src={`https://www.youtube.com/embed/${video.youtube_video_id}`}
                                      title={video.name || `Video ${index + 1}`}
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                  <div className="p-3 bg-white border-t border-[#e8e8e3]">
                                    <p className="text-[12px] font-medium text-[#556179] mb-2 truncate">
                                      {video.name ||
                                        `YouTube Video ${index + 1}`}
                                    </p>
                                    <a
                                      href={`https://www.youtube.com/watch?v=${video.youtube_video_id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FF0000] hover:bg-[#CC0000] text-white text-[11px] font-medium rounded-lg transition-colors duration-200"
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                      </svg>
                                      Watch on YouTube
                                    </a>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}

                  {/* Empty State */}
                  {(!assetGroupAssets.headlines ||
                    assetGroupAssets.headlines.filter((h) => h && h.trim())
                      .length === 0) &&
                    (!assetGroupAssets.descriptions ||
                      assetGroupAssets.descriptions.filter((d) => d && d.trim())
                        .length === 0) &&
                    !assetGroupAssets.long_headline &&
                    !assetGroupAssets.marketing_image_url &&
                    !assetGroupAssets.square_marketing_image_url &&
                    !assetGroupAssets.logo_url &&
                    (!assetGroupAssets.video_assets ||
                      assetGroupAssets.video_assets.length === 0) &&
                    (!assetGroupAssets.final_urls ||
                      assetGroupAssets.final_urls.length === 0) &&
                    !assetGroupAssets.business_name && (
                      <div className="text-center py-12">
                        <p className="text-[13.3px] text-[#556179]">
                          No assets available for this asset group.
                        </p>
                      </div>
                    )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-[13.3px] text-[#556179]">
                    Failed to load assets.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-[#E8E8E3]">
              <button
                type="button"
                onClick={onCloseViewAssetsModal}
                className="px-4 py-2 bg-[#fefefb] border border-[#e8e8e3] text-[#072929] rounded-lg hover:bg-gray-50 transition-colors text-[13.3px] font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk confirmation modal */}
      {(onUpdateAssetGroupStatus || onBulkUpdateAssetGroupStatus) &&
        onBulkUpdateComplete && (
          <BulkUpdateConfirmationModal
            isOpen={showBulkConfirmationModal}
            onClose={() => {
              setShowBulkConfirmationModal(false);
              setPendingStatusAction(null);
              setBulkUpdateResults(null);
            }}
            entityLabel="asset group"
            entityNameColumn="Asset Group Name"
            selectedCount={selectedAssetGroupIds.size}
            bulkUpdateResults={bulkUpdateResults}
            isValueChange={false}
            valueChangeLabel=""
            previewRows={getSelectedAssetGroupsData().map((ag) => {
              const oldStatus = formatStatusForDisplay(ag.status || "ENABLED");
              const newStatus = pendingStatusAction
                ? formatStatusForDisplay(pendingStatusAction)
                : oldStatus;
              return {
                name: ag.name || `Asset Group ${ag.asset_group_id}`,
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
            loadingMessage="Updating asset groups..."
            successMessage="All asset groups updated successfully!"
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
                  Asset Group:{" "}
                  <span className="font-semibold text-[#072929]">
                    {statusModalData.assetGroup.name || "Unnamed Asset Group"}
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
                    updatingAssetGroupId === statusModalData.assetGroup.id
                  }
                  className="create-entity-button btn-sm"
                >
                  {updatingAssetGroupId === statusModalData.assetGroup.id
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
