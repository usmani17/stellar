import React, { useRef } from "react";
import { Checkbox } from "../ui/Checkbox";
import { StatusBadge } from "../ui/StatusBadge";
import { Dropdown } from "../ui/Dropdown";

export interface SBAd {
  id: number;
  profileId?: string;
  adId?: string | number;
  name?: string;
  state?: string;
  status?: string;
  adGroupId?: string | number;
  campaignId?: string | number;
  landingPage?: string | any; // Can be JSON string or object
  creative?: string | any; // Can be JSON string or object
  servingStatus?: string;
  servingStatusDetails?: string | string[]; // Can be JSON string or array
  creationDateTime?: string | null;
  lastUpdateDateTime?: string | null;
  last_updated?: string;
}

interface SBAdsTableProps {
  ads: SBAd[];
  loading?: boolean;
  onSelectAll?: (checked: boolean) => void;
  onSelect?: (id: number, checked: boolean) => void;
  selectedIds?: Set<number>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
  editingField?: {
    id: number;
    field: "status" | "name";
  } | null;
  editedValue?: string;
  onEditStart?: (
    id: number,
    field: "status" | "name",
    currentValue: string
  ) => void;
  onEditChange?: (value: string) => void;
  onEditEnd?: (value?: string) => void;
  onEditCancel?: () => void;
  inlineEditLoading?: Set<number>;
  pendingChange?: {
    id: number;
    field: "status" | "name";
    newValue: string;
    oldValue: string;
  } | null;
  onConfirmChange?: () => void;
  onCancelChange?: () => void;
}

export const SBAdsTable: React.FC<SBAdsTableProps> = ({
  ads,
  loading = false,
  onSelectAll,
  onSelect,
  selectedIds = new Set(),
  sortBy = "id",
  sortOrder = "asc",
  onSort,
  editingField = null,
  editedValue = "",
  onEditStart,
  onEditChange,
  onEditEnd,
  onEditCancel,
  inlineEditLoading = new Set(),
  pendingChange = null,
  onConfirmChange,
  onCancelChange,
}) => {
  const statusSelectionMadeRef = useRef<number | null>(null);
  const getSortIcon = (column: string) => {
    if (sortBy !== column || !onSort) {
      return (
        <svg
          className="w-4 h-4 ml-1 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    return sortOrder === "asc" ? (
      <svg
        className="w-4 h-4 ml-1 text-[#136D6D]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 ml-1 text-[#136D6D]"
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
    );
  };

  const allSelected =
    ads.length > 0 && ads.every((ad) => selectedIds.has(ad.id));
  const someSelected = ads.some((ad) => selectedIds.has(ad.id));

  const handleSelectAll = (checked: boolean) => {
    onSelectAll?.(checked);
  };

  const handleSelect = (id: number, checked: boolean) => {
    onSelect?.(id, checked);
  };

  return (
    <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
      <div className="overflow-x-auto w-full">
        {loading ? (
          <div className="text-center py-8 text-[#556179] text-[13.3px]">
            Loading ads...
          </div>
        ) : ads.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[13.3px] text-[#556179] mb-4">No ads found</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f5f5f0] border-b border-[#e8e8e3]">
                {onSelectAll && (
                  <th className="table-cell text-left">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th
                  className="table-header cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("adId")}
                >
                  <div className="flex items-center">
                    Ad ID
                    {getSortIcon("adId")}
                  </div>
                </th>
                <th
                  className="table-header cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("name")}
                >
                  <div className="flex items-center">
                    Name
                    {getSortIcon("name")}
                  </div>
                </th>
                <th
                  className="table-header cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("status")}
                >
                  <div className="flex items-center">
                    State
                    {getSortIcon("status")}
                  </div>
                </th>
                <th
                  className="table-header cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("adGroupId")}
                >
                  <div className="flex items-center">
                    Ad Group ID
                    {getSortIcon("adGroupId")}
                  </div>
                </th>
                <th
                  className="table-header cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("campaignId")}
                >
                  <div className="flex items-center">
                    Campaign ID
                    {getSortIcon("campaignId")}
                  </div>
                </th>
                <th className="table-header">
                  Serving Status
                </th>
                <th
                  className="table-header cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("creationDateTime")}
                >
                  <div className="flex items-center">
                    Creation Date
                    {getSortIcon("creationDateTime")}
                  </div>
                </th>
                <th
                  className="table-header cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("lastUpdateDateTime")}
                >
                  <div className="flex items-center">
                    Last Update Date
                    {getSortIcon("lastUpdateDateTime")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad) => {
                const statusValue = ad.status || ad.state || "";
                const isArchived = statusValue?.toLowerCase() === "archived";

                // Parse landingPage if it's a JSON string
                let landingPageObj: any = null;
                if (ad.landingPage) {
                  try {
                    landingPageObj =
                      typeof ad.landingPage === "string"
                        ? JSON.parse(ad.landingPage)
                        : ad.landingPage;
                  } catch (e) {
                    // If parsing fails, use as is
                    landingPageObj = ad.landingPage;
                  }
                }

                // Parse creative if it's a JSON string
                let creativeObj: any = null;
                if (ad.creative) {
                  try {
                    creativeObj =
                      typeof ad.creative === "string"
                        ? JSON.parse(ad.creative)
                        : ad.creative;
                  } catch (e) {
                    // If parsing fails, use as is
                    creativeObj = ad.creative;
                  }
                }

                // Format dates
                const formatDate = (dateStr: string | null | undefined) => {
                  if (!dateStr) return "—";
                  try {
                    const date = new Date(dateStr);
                    return (
                      date.toLocaleDateString() +
                      " " +
                      date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    );
                  } catch (e) {
                    return dateStr;
                  }
                };

                return (
                  <tr
                    key={ad.id}
                    className={`border-b border-[#e8e8e3] hover:bg-gray-50 transition-colors ${
                      isArchived ? "bg-gray-100 opacity-60" : ""
                    }`}
                  >
                    {onSelect && (
                      <td className="table-cell">
                        <Checkbox
                          checked={selectedIds.has(ad.id)}
                          onChange={(checked) => handleSelect(ad.id, checked)}
                        />
                      </td>
                    )}
                    <td className="table-cell text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      {ad.adId || "—"}
                    </td>
                    <td className="table-cell text-[13.3px] text-[#0b0f16] leading-[1.26] min-w-[150px] max-w-[200px]">
                      {inlineEditLoading.has(ad.id) ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {pendingChange?.field === "name"
                              ? pendingChange.newValue
                              : ad.name || "—"}
                          </span>
                          <div className="w-4 h-4 border-2 border-[#136D6D] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : pendingChange?.id === ad.id &&
                        pendingChange?.field === "name" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {pendingChange.newValue}
                          </span>
                        </div>
                      ) : editingField?.id === ad.id &&
                        editingField?.field === "name" ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editedValue}
                            onChange={(e) => onEditChange?.(e.target.value)}
                            className="text-[13.3px] text-[#0b0f16] leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-full min-w-[150px] max-w-[200px]"
                            autoFocus
                            onBlur={() => onEditEnd?.()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === "Escape") {
                                onEditEnd?.();
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          className={`text-[13.3px] text-left truncate block w-full whitespace-nowrap ${
                            isArchived
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-[#0b0f16] cursor-pointer hover:underline"
                          }`}
                          onClick={() => {
                            if (!isArchived) {
                              onEditStart?.(
                                ad.id,
                                "name",
                                ad.name || ""
                              );
                            }
                          }}
                          title={ad.name || "—"}
                        >
                          {ad.name || "—"}
                        </div>
                      )}
                    </td>
                    <td className="table-cell text-[13.3px] text-[#0b0f16] leading-[1.26] min-w-[115px]">
                      {inlineEditLoading.has(ad.id) ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {pendingChange?.field === "status"
                              ? pendingChange.newValue === "enabled"
                                ? "Enabled"
                                : "Paused"
                              : statusValue}
                          </span>
                          <div className="w-4 h-4 border-2 border-[#136D6D] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : pendingChange?.id === ad.id &&
                        pendingChange?.field === "status" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {pendingChange.newValue === "enabled"
                              ? "Enabled"
                              : "Paused"}
                          </span>
                        </div>
                      ) : editingField?.id === ad.id &&
                        editingField?.field === "status" ? (
                        <div className="flex items-center gap-2">
                          <Dropdown
                            options={[
                              { value: "enabled", label: "Enabled" },
                              { value: "paused", label: "Paused" },
                            ]}
                            value={(() => {
                              if (editedValue) return editedValue;
                              const statusLower =
                                statusValue?.toLowerCase() || "enabled";
                              return statusLower === "enable" ||
                                statusLower === "enabled"
                                ? "enabled"
                                : "paused";
                            })()}
                            onChange={(val) => {
                              // Mark that a selection was made for this ad
                              statusSelectionMadeRef.current = ad.id;
                              const newValue = val as string;
                              onEditChange?.(newValue);
                              // Call onEditEnd with the new value immediately when a value is selected
                              // This will trigger the pending change confirmation
                              onEditEnd?.(newValue);
                              // Clear the ref after a short delay to allow onClose to check it
                              setTimeout(() => {
                                if (
                                  statusSelectionMadeRef.current ===
                                  ad.id
                                ) {
                                  statusSelectionMadeRef.current = null;
                                }
                              }, 200);
                            }}
                            onClose={() => {
                              // Only cancel if no selection was made (clicked outside)
                              // If a selection was made, statusSelectionMadeRef will be set
                              if (
                                statusSelectionMadeRef.current !==
                                  ad.id &&
                                editingField?.id === ad.id
                              ) {
                                onEditCancel?.();
                              }
                            }}
                            defaultOpen={true}
                            closeOnSelect={true}
                            buttonClassName="w-full text-[13.3px] px-2 py-1"
                            width="w-full"
                            align="center"
                          />
                        </div>
                      ) : (
                        <div
                          className={`text-[13.3px] leading-[1.26] ${
                            isArchived
                              ? "cursor-not-allowed opacity-60"
                              : "cursor-pointer hover:underline"
                          }`}
                          onClick={() => {
                            if (!isArchived) {
                              const statusLower =
                                statusValue?.toLowerCase() || "enabled";
                              const statusValueNormalized =
                                statusLower === "enable" ||
                                statusLower === "enabled"
                                  ? "enabled"
                                  : "paused";
                              onEditStart?.(
                                ad.id,
                                "status",
                                statusValueNormalized
                              );
                            }
                          }}
                        >
                          <StatusBadge status={statusValue} />
                        </div>
                      )}
                    </td>
                    <td className="table-cell text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      {ad.adGroupId != null && ad.adGroupId !== ""
                        ? String(ad.adGroupId)
                        : "—"}
                    </td>
                    <td className="table-cell text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      {ad.campaignId != null && ad.campaignId !== ""
                        ? String(ad.campaignId)
                        : "—"}
                    </td>
                    <td className="table-cell text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      {ad.servingStatus || "—"}
                    </td>
                    <td className="table-cell text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      {formatDate(ad.creationDateTime)}
                    </td>
                    <td className="table-cell text-[13.3px] text-[#0b0f16] leading-[1.26]">
                      {formatDate(ad.lastUpdateDateTime)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
