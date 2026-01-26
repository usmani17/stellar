import React, { useRef } from "react";
import { StatusBadge } from "../ui/StatusBadge";
import { Tooltip } from "../ui/Tooltip";
import { Dropdown } from "../ui/Dropdown";
import { Checkbox } from "../ui/Checkbox";
import { Loader } from "../ui";

interface NegativeKeyword {
  id: number;
  profileId?: string;
  last_updated?: string;
  keywordId?: number | string;
  keywordText?: string;
  name?: string; // For backward compatibility
  matchType?: string;
  state?: string;
  status?: string; // For backward compatibility
  adGroupId?: number;
  campaignId?: string | number;
  creationDateTime?: string;
  lastUpdateDateTime?: string;
  servingStatus?: string;
  servingStatusDetails?: string;
}

interface NegativeKeywordsTableProps {
  negativeKeywords: NegativeKeyword[];
  loading?: boolean;
  onSelectAll?: (checked: boolean) => void;
  onSelect?: (id: number, checked: boolean) => void;
  selectedIds?: Set<number>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
  editingField?: {
    id: number;
    field: "status";
  } | null;
  editedValue?: string;
  onEditStart?: (id: number, field: "status", currentValue: string) => void;
  onEditChange?: (value: string) => void;
  onEditEnd?: (value?: string) => void;
  onEditCancel?: () => void;
  inlineEditLoading?: Set<number>;
  pendingChange?: {
    id: number;
    field: "status";
    newValue: string;
    oldValue: string;
  } | null;
}

export const NegativeKeywordsTable: React.FC<NegativeKeywordsTableProps> = ({
  negativeKeywords,
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
}) => {
  const statusSelectionMadeRef = useRef<number | null>(null);
  const allSelected =
    negativeKeywords.length > 0 &&
    negativeKeywords.every((nkw) => selectedIds.has(nkw.id));
  const someSelected = negativeKeywords.some((nkw) => selectedIds.has(nkw.id));

  const handleSelectAll = (checked: boolean) => {
    onSelectAll?.(checked);
  };

  const handleSelect = (id: number, checked: boolean) => {
    onSelect?.(id, checked);
  };
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

  return (
    <div className="table-container" style={{ position: 'relative', minHeight: loading ? '400px' : 'auto' }}>
      <div className="overflow-x-auto w-full">
        {loading ? (
          <div className="text-center py-8 text-[#556179] text-[13.3px]">
            Loading negative keywords...
          </div>
        ) : negativeKeywords.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[13.3px] text-[#556179] mb-4">
              No negative keywords found
            </p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            <table className="min-w-full">
              <thead className="sticky top-0 bg-[#fefefb] z-10">
                <tr className="border-b border-[#e8e8e3]">
                  {/* Checkbox Header */}
                  {onSelectAll && (
                    <th className="table-header w-[50px]">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected && !allSelected}
                        onChange={handleSelectAll}
                      />
                    </th>
                  )}

                  {/* Profile ID Header */}
                  <th className="table-header">
                    Profile ID
                  </th>

                  {/* Keyword ID Header */}
                  <th className="table-header">
                    Keyword ID
                  </th>

                  {/* Keyword Text Header */}
                  <th
                    className={`table-header max-w-[200px] ${onSort ? "cursor-pointer hover:bg-gray-50" : ""
                      }`}
                    onClick={() => onSort?.("keywordText")}
                  >
                    <div className="flex items-center gap-1">
                      Keyword
                      {getSortIcon("keywordText")}
                    </div>
                  </th>

                  {/* Match Type Header */}
                  <th
                    className={`table-header ${onSort ? "cursor-pointer hover:bg-gray-50" : ""
                      }`}
                    onClick={() => onSort?.("matchType")}
                  >
                    <div className="flex items-center gap-1">
                      Match Type
                      {getSortIcon("matchType")}
                    </div>
                  </th>

                  {/* State Header */}
                  <th
                    className={`table-header min-w-[250px] ${onSort ? "cursor-pointer hover:bg-gray-50" : ""
                      }`}
                    onClick={() => onSort?.("state")}
                  >
                    <div className="flex items-center gap-1">
                      State
                      {getSortIcon("state")}
                    </div>
                  </th>

                  {/* Ad Group ID Header */}
                  <th className="table-header">
                    Ad Group ID
                  </th>

                  {/* Campaign ID Header */}
                  <th className="table-header">
                    Campaign ID
                  </th>

                </tr>
              </thead>
              <tbody>
                {negativeKeywords.map((keyword, index) => {
                  const isLastRow = index === negativeKeywords.length - 1;
                  const statusValue = keyword.status || keyword.state || "Enabled";
                  const isArchived = statusValue?.toLowerCase() === "archived";
                  return (
                    <tr
                      key={keyword.id}
                      className={`${!isLastRow ? "border-b border-[#e8e8e3]" : ""
                        } ${isArchived ? "bg-gray-100 opacity-60" : "hover:bg-gray-50"} transition-colors`}
                    >
                      {/* Checkbox */}
                      {onSelect && (
                        <td className="table-cell">
                          <Checkbox
                            checked={selectedIds.has(keyword.id)}
                            onChange={(checked) =>
                              handleSelect(keyword.id, checked)
                            }
                          />
                        </td>
                      )}

                      {/* Profile ID */}
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">
                          {keyword.profileId || "—"}
                        </span>
                      </td>

                      {/* Keyword ID */}
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">
                          {keyword.keywordId || "—"}
                        </span>
                      </td>

                      {/* Keyword Text */}
                      <td className="table-cell">
                        {keyword.keywordText || keyword.name ? (
                          <Tooltip
                            description={
                              keyword.keywordText || keyword.name || ""
                            }
                            position="bottomMiddle"
                          >
                            <div className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                              <span className="table-text leading-[1.26]">
                                {keyword.keywordText || keyword.name}
                              </span>
                            </div>
                          </Tooltip>
                        ) : (
                          <span className="table-text leading-[1.26]">
                            —
                          </span>
                        )}
                      </td>

                      {/* Match Type */}
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">
                          {keyword.matchType || "—"}
                        </span>
                      </td>

                      {/* State */}
                      <td className="table-cell min-w-[250px]">
                        {inlineEditLoading.has(keyword.id) ? (
                          <div className="flex items-center gap-2">
                            <StatusBadge
                              status={
                                pendingChange?.field === "status"
                                  ? pendingChange.newValue === "enabled"
                                    ? "Enabled"
                                    : pendingChange.newValue === "paused"
                                      ? "Paused"
                                      : "Archived"
                                  : statusValue
                              }
                            />
                            <div className="w-4 h-4 border-2 border-[#136D6D] border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : pendingChange?.id === keyword.id &&
                          pendingChange?.field === "status" ? (
                          <div className="flex items-center gap-2">
                            <StatusBadge
                              status={
                                pendingChange.newValue === "enabled"
                                  ? "Enabled"
                                  : pendingChange.newValue === "paused"
                                    ? "Paused"
                                    : "Archived"
                              }
                            />
                          </div>
                        ) : editingField?.id === keyword.id &&
                          editingField?.field === "status" ? (
                          <div className="flex items-center gap-2">
                            <Dropdown
                              options={[
                                { value: "enabled", label: "Enabled" },
                                { value: "paused", label: "Paused" },
                              ]}
                              value={(() => {
                                if (editedValue) return editedValue;
                                const statusLower = (
                                  keyword.status ||
                                  keyword.state ||
                                  "enabled"
                                ).toLowerCase();
                                return statusLower === "enable" ||
                                  statusLower === "enabled"
                                  ? "enabled"
                                  : "paused";
                              })()}
                              onChange={(val) => {
                                // Mark that a selection was made for this keyword
                                statusSelectionMadeRef.current = keyword.id;
                                const newValue = val as string;
                                onEditChange?.(newValue);
                                // Call onEditEnd with the new value immediately when a value is selected
                                onEditEnd?.(newValue);
                                // Clear the ref after a short delay to allow onClose to check it
                                setTimeout(() => {
                                  if (
                                    statusSelectionMadeRef.current ===
                                    keyword.id
                                  ) {
                                    statusSelectionMadeRef.current = null;
                                  }
                                }, 200);
                              }}
                              onClose={() => {
                                // Only cancel if no selection was made (clicked outside)
                                if (
                                  statusSelectionMadeRef.current !==
                                  keyword.id &&
                                  editingField?.id === keyword.id
                                ) {
                                  onEditCancel?.();
                                }
                              }}
                              defaultOpen={true}
                              closeOnSelect={true}
                              buttonClassName="inline-edit-dropdown"
                              width="w-full"
                              align="center"
                            />
                          </div>
                        ) : (
                          <div
                            className={`text-[13.3px] leading-[1.26] ${isArchived
                              ? "cursor-not-allowed opacity-60"
                              : "cursor-pointer hover:underline"
                              }`}
                            onClick={() => {
                              if (!isArchived) {
                                const statusLower = statusValue.toLowerCase();
                                const editStatusValue =
                                  statusLower === "enable" ||
                                    statusLower === "enabled"
                                    ? "enabled"
                                    : "paused";
                                onEditStart?.(keyword.id, "status", editStatusValue);
                              }
                            }}
                          >
                            <StatusBadge
                              status={statusValue}
                              uppercase={true}
                            />
                          </div>
                        )}
                      </td>

                      {/* Ad Group ID */}
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">
                          {keyword.adGroupId || "—"}
                        </span>
                      </td>

                      {/* Campaign ID */}
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">
                          {keyword.campaignId || "—"}
                        </span>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {loading && (
        <div className="loading-overlay">
          <div className="loading-overlay-content">
            <Loader size="md" message="Loading negative keywords..." />
          </div>
        </div>
      )}
      {negativeKeywords.length === 0 && (
        <div className="text-center py-8">
          <Loader message="No negative keywords found" showMessage={false} size="md" />
        </div>
      )}
    </div>
  );
};
