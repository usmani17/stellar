import React, { useRef } from "react";
import { Checkbox } from "../ui/Checkbox";
import { StatusBadge } from "../ui/StatusBadge";
import { Dropdown } from "../ui/Dropdown";
import { Loader } from "../ui/Loader";

export interface SBAd {
  id: number;
  profileId?: string;
  adId?: string | number;
  name?: string;
  state?: string;
  status?: string;
  adGroupId?: string | number;
  adgroup_name?: string;
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
  onEditEnd?: (value?: string, adId?: number, field?: "status" | "name") => void;
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
          <div className="flex flex-col items-center justify-center h-[400px] w-full py-12 px-6">
            <div className="flex flex-col items-center justify-center max-w-md">
              {/* Icon */}
              <div className="mb-6 w-20 h-20 rounded-full bg-[#F5F5F0] flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-[#556179]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              {/* Title */}
              <h3 className="text-lg font-medium text-teal-950 mb-2">
                No Ads Found
              </h3>
              {/* Description */}
              <p className="text-sm text-[#556179] text-center leading-relaxed">
                There are no ads for this campaign yet. Ads will appear here when they are created.
              </p>
            </div>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f5f5f0] border-b border-[#e8e8e3]">
                {onSelectAll && (
                  <th className="table-header text-left">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th
                  className="table-header"
                  onClick={() => onSort?.("adId")}
                >
                  <div className="flex items-center">
                    Ad ID
                    {getSortIcon("adId")}
                  </div>
                </th>
                <th
                  className="table-header"
                  onClick={() => onSort?.("name")}
                >
                  <div className="flex items-center">
                    Name
                    {getSortIcon("name")}
                  </div>
                </th>
                <th
                  className="table-header"
                  onClick={() => onSort?.("status")}
                >
                  <div className="flex items-center">
                    State
                    {getSortIcon("status")}
                  </div>
                </th>
                <th className="table-header">
                  Ad Group Name
                </th>
                <th className="table-header">
                  Serving Status
                </th>
                <th
                  className="table-header"
                  onClick={() => onSort?.("creationDateTime")}
                >
                  <div className="flex items-center">
                    Creation Date
                    {getSortIcon("creationDateTime")}
                  </div>
                </th>
                <th
                  className="table-header"
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
                    className={`table-row group ${isArchived ? "bg-gray-100 opacity-60" : ""
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
                    <td className="table-cell table-text leading-[1.26]">
                      {ad.adId || "—"}
                    </td>
                    <td className="table-cell table-text leading-[1.26] min-w-[150px] max-w-[200px]">
                      {(() => {
                        if (isArchived) {
                          return (
                            <span className="table-text leading-[1.26] opacity-60">
                              {ad.name || "—"}
                            </span>
                          );
                        }

                        if (inlineEditLoading.has(ad.id)) {
                          return (
                            <div className="flex items-center gap-2">
                              <span className="table-text leading-[1.26]">
                                {pendingChange?.field === "name"
                                  ? pendingChange.newValue
                                  : ad.name || "—"}
                              </span>
                              <Loader size="sm" showMessage={false} />
                            </div>
                          );
                        }

                        const nameValue = editingField?.id === ad.id &&
                          editingField?.field === "name"
                          ? editedValue
                          : (ad.name || "");

                        return (
                          <input
                            type="text"
                            value={nameValue}
                            onFocus={() => {
                              if (editingField?.id !== ad.id ||
                                editingField?.field !== "name") {
                                onEditStart?.(
                                  ad.id,
                                  "name",
                                  ad.name || ""
                                );
                              }
                            }}
                            onChange={(e) => {
                              onEditChange?.(e.target.value);
                            }}
                            onBlur={() => {
                              onEditEnd?.();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === "Escape") {
                                onEditEnd?.();
                              }
                            }}
                            className="inline-edit-input"
                            disabled={isArchived}
                            title={
                              isArchived
                                ? "Archived ads cannot be modified"
                                : undefined
                            }
                          />
                        );
                      })()}
                    </td>
                    <td className="table-cell table-text leading-[1.26] min-w-[250px]">
                      {(() => {
                        if (inlineEditLoading.has(ad.id)) {
                          return (
                            <div className="flex items-center gap-2">
                              <span className="table-text leading-[1.26]">
                                {pendingChange?.field === "status"
                                  ? pendingChange.newValue === "enabled"
                                    ? "Enabled"
                                    : pendingChange.newValue === "paused"
                                      ? "Paused"
                                      : "Archived"
                                  : statusValue}
                              </span>
                              <div className="w-4 h-4 border-2 border-[#136D6D] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          );
                        }

                        if (pendingChange?.id === ad.id &&
                          pendingChange?.field === "status") {
                          return (
                            <div className="flex items-center gap-2">
                              <span className="table-text leading-[1.26]">
                                {pendingChange.newValue === "enabled"
                                  ? "Enabled"
                                  : pendingChange.newValue === "paused"
                                    ? "Paused"
                                    : "Archived"}
                              </span>
                            </div>
                          );
                        }

                        if (isArchived) {
                          return (
                            <div className="opacity-60">
                              <StatusBadge status={statusValue} />
                            </div>
                          );
                        }

                        const statusLower =
                          statusValue?.toLowerCase() || "enabled";
                        const statusValueNormalized =
                          statusLower === "enable" ||
                            statusLower === "enabled"
                            ? "enabled"
                            : statusLower === "paused"
                              ? "paused"
                              : "archived";

                        const currentValue = editingField?.id === ad.id &&
                          editingField?.field === "status"
                          ? editedValue
                          : statusValueNormalized;

                        return (
                          <Dropdown
                            options={[
                              { value: "enabled", label: "Enabled" },
                              { value: "paused", label: "Paused" },
                            ]}
                            value={currentValue}
                            onChange={(val) => {
                              const newValue = val as string;
                              const wasEditing = editingField?.id === ad.id &&
                                editingField?.field === "status";

                              if (!wasEditing) {
                                onEditStart?.(ad.id, "status", statusValueNormalized);
                              }
                              onEditChange?.(newValue);
                              onEditEnd?.(newValue, ad.id, "status");
                            }}
                            buttonClassName="edit-button"
                            width="w-full"
                            align="center"
                          />
                        );
                      })()}
                    </td>
                    <td className="table-cell table-text leading-[1.26]">
                      {ad.adgroup_name || "—"}
                    </td>
                    <td className="table-cell table-text leading-[1.26]">
                      {ad.servingStatus || "—"}
                    </td>
                    <td className="table-cell table-text leading-[1.26]">
                      {formatDate(ad.creationDateTime)}
                    </td>
                    <td className="table-cell table-text leading-[1.26]">
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
