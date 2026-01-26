import React, { useRef } from "react";
import { StatusBadge } from "../ui/StatusBadge";
import { Dropdown } from "../ui/Dropdown";
import { Checkbox } from "../ui/Checkbox";
import { Loader } from "../ui/Loader";

interface NegativeTarget {
  id: number;
  profileId?: string;
  last_updated?: string;
  targetId?: number;
  name?: string; // For backward compatibility
  expression?: string;
  expressions?: string; // For SB schema
  resolvedExpression?: string;
  resolvedExpressions?: string; // For SB schema
  state?: string;
  status?: string; // For backward compatibility
  adGroupId?: number;
  campaignId?: string | number;
  creationDateTime?: string;
  lastUpdateDateTime?: string;
  servingStatus?: string;
  servingStatusDetails?: string;
}

interface NegativeTargetsTableProps {
  negativeTargets: NegativeTarget[];
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
  campaignType?: string; // SP, SB, or SD
}

export const NegativeTargetsTable: React.FC<NegativeTargetsTableProps> = ({
  negativeTargets,
  loading = false,
  onSelectAll,
  onSelect,
  selectedIds = new Set(),
  sortBy = "id",
  sortOrder = "asc",
  campaignType,
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
    negativeTargets.length > 0 &&
    negativeTargets.every((ntg) => selectedIds.has(ntg.id));
  const someSelected =
    negativeTargets.length > 0 &&
    negativeTargets.some((ntg) => selectedIds.has(ntg.id)) &&
    !allSelected;
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
            Loading negative targets...
          </div>
        ) : negativeTargets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[13.3px] text-[#556179] mb-4">
              No negative targets found
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
                        onChange={(checked) => onSelectAll(checked)}
                      />
                    </th>
                  )}

                  {/* Profile ID Header */}
                  <th className="table-header">
                    Profile ID
                  </th>

                  {/* Expression Header */}
                  <th className="table-header">
                    Expression
                  </th>

                  {/* Resolved Expression Header */}
                  <th className="table-header">
                    Resolved Expression
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
                {negativeTargets.map((target, index) => {
                  const isLastRow = index === negativeTargets.length - 1;
                  const expression =
                    target.expression ||
                    target.expressions ||
                    target.name ||
                    "";
                  const resolvedExpression =
                    target.resolvedExpression ||
                    target.resolvedExpressions ||
                    "";
                  const statusValue = target.status || target.state || "ENABLED";
                  const isArchived = statusValue?.toLowerCase() === "archived";
                  return (
                    <tr
                      key={target.id}
                      className={`${!isLastRow ? "border-b border-[#e8e8e3]" : ""
                        } ${isArchived ? "bg-gray-100 opacity-60" : "hover:bg-gray-50"} transition-colors`}
                    >
                      {/* Checkbox */}
                      {onSelect && (
                        <td className="table-cell w-[50px]">
                          <Checkbox
                            checked={selectedIds.has(target.id)}
                            onChange={(checked) => onSelect(target.id, checked)}
                          />
                        </td>
                      )}

                      {/* Profile ID */}
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">
                          {target.profileId || "—"}
                        </span>
                      </td>

                      {/* Expression */}
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">
                          {expression || "—"}
                        </span>
                      </td>

                      {/* Resolved Expression */}
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">
                          {resolvedExpression || "—"}
                        </span>
                      </td>

                      {/* State */}
                      <td className="table-cell min-w-[250px]">
                        {editingField?.id === target.id &&
                          editingField?.field === "status" ? (
                          <Dropdown
                            options={[
                              ...(campaignType === "SD"
                                ? [
                                  { value: "enabled", label: "Enabled" },
                                  { value: "paused", label: "Paused" },
                                  { value: "archived", label: "Archived" },
                                ]
                                : [
                                  { value: "ENABLED", label: "ENABLED" },
                                  { value: "PAUSED", label: "PAUSED" },
                                ]),
                            ]}
                            value={editedValue || target.state || (campaignType === "SD" ? "enabled" : "ENABLED")}
                            onChange={(value) => {
                              statusSelectionMadeRef.current = target.id;
                              onEditChange?.(value);
                              onEditEnd?.(value);
                            }}
                            onClose={() => {
                              if (
                                statusSelectionMadeRef.current !== target.id
                              ) {
                                onEditCancel?.();
                              }
                              statusSelectionMadeRef.current = null;
                            }}
                            defaultOpen={true}
                            buttonClassName="inline-edit-dropdown"
                            width="w-full"
                            align="center"
                          />
                        ) : (
                          <div
                            className={`rounded px-2 py-1 transition-colors ${isArchived
                              ? "cursor-not-allowed opacity-60"
                              : "cursor-pointer hover:bg-gray-100"
                              }`}
                            onClick={() => {
                              if (!isArchived) {
                                onEditStart?.(target.id, "status", statusValue);
                              }
                            }}
                          >
                            <StatusBadge
                              status={statusValue}
                              uppercase={campaignType !== "SD"}
                            />
                            {inlineEditLoading.has(target.id) && (
                              <span className="ml-2 text-[11.2px] text-gray-500">
                                Updating...
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Ad Group ID */}
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">
                          {target.adGroupId || "—"}
                        </span>
                      </td>

                      {/* Campaign ID */}
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">
                          {target.campaignId || "—"}
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
      {/* Loading overlay for table */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-overlay-content">
            <Loader size="md" message="Loading negative targets..." />
          </div>
        </div>
      )}
    </div>
  );
};
