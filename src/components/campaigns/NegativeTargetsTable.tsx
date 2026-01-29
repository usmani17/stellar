import React from "react";
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
  adgroup_name?: string;
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
  onEditEnd?: (value?: string, targetId?: number, field?: "status") => void;
  onEditCancel?: () => void;
  inlineEditLoading?: Set<number>;
  pendingChange?: {
    id: number;
    field: "status";
    newValue: string;
    oldValue: string;
  } | null;
  campaignType?: string; // SP, SB, or SD
  adgroups?: Array<{ adGroupId: number | string; name?: string }>; // Ad groups to map IDs to names
}

export const NegativeTargetsTable: React.FC<NegativeTargetsTableProps> = ({
  negativeTargets,
  loading = false,
  onSelectAll,
  onSelect,
  selectedIds = new Set(),
  adgroups = [],
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
    <div
      className="table-container"
      style={{ position: "relative", minHeight: loading ? "400px" : "auto" }}
    >
      <div className="overflow-x-auto w-full">
        {loading ? (
          <div className="text-center py-8 text-[#556179] text-[13.3px]">
            Loading negative targets...
          </div>
        ) : negativeTargets.length === 0 ? (
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
                No Negative Targets Found
              </h3>
              {/* Description */}
              <p className="text-sm text-[#556179] text-center leading-relaxed">
                There are no negative targets for this campaign yet. Negative
                targets will appear here when they are created.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative" style={{ overflow: "visible" }}>
            <div
              className="max-h-[600px] overflow-y-auto"
              style={{ overflowX: "visible" }}
            >
              <table className="min-w-full" style={{ position: "relative" }}>
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
                    <th className="table-header">Profile ID</th>

                    {/* Expression Header */}
                    <th className="table-header">Expression</th>

                    {/* Resolved Expression Header */}
                    <th className="table-header">Resolved Expression</th>

                    {/* State Header */}
                    <th
                      className={`table-header min-w-[250px] ${
                        onSort ? "cursor-pointer hover:bg-gray-50" : ""
                      }`}
                      onClick={() => onSort?.("state")}
                    >
                      <div className="flex items-center gap-1">
                        State
                        {getSortIcon("state")}
                      </div>
                    </th>

                    {/* Ad Group Header */}
                    <th className="table-header">Ad Group</th>

                    {/* Campaign ID Header */}
                    <th className="table-header">Campaign ID</th>
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
                    const statusValue =
                      target.status || target.state || "ENABLED";
                    const isArchived =
                      statusValue?.toLowerCase() === "archived";
                    const isStateDropdownOpen =
                      editingField?.id === target.id &&
                      editingField?.field === "status";
                    return (
                      <tr
                        key={target.id}
                        className={`${
                          !isLastRow ? "border-b border-[#e8e8e3]" : ""
                        } ${isArchived ? "bg-gray-100 opacity-60" : "hover:bg-gray-50"} transition-colors`}
                        style={
                          isStateDropdownOpen
                            ? { position: "relative", zIndex: 999 }
                            : undefined
                        }
                      >
                        {/* Checkbox */}
                        {onSelect && (
                          <td className="table-cell w-[50px]">
                            <Checkbox
                              checked={selectedIds.has(target.id)}
                              onChange={(checked) =>
                                onSelect(target.id, checked)
                              }
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
                        <td
                          className="table-cell min-w-[250px]"
                          style={{
                            overflow: "visible",
                            position: "relative",
                            zIndex: isStateDropdownOpen ? 1000 : 1,
                          }}
                        >
                          {inlineEditLoading.has(target.id) ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-[#136D6D] border-t-transparent rounded-full animate-spin"></div>
                              <span className="table-text leading-[1.26]">
                                Updating...
                              </span>
                            </div>
                          ) : pendingChange?.id === target.id &&
                            pendingChange?.field === "status" ? (
                            <div className="flex items-center gap-2">
                              <span className="table-text leading-[1.26]">
                                {pendingChange.newValue === "enabled" ||
                                pendingChange.newValue === "ENABLED"
                                  ? campaignType === "SD"
                                    ? "Enabled"
                                    : "ENABLED"
                                  : pendingChange.newValue === "paused" ||
                                      pendingChange.newValue === "PAUSED"
                                    ? campaignType === "SD"
                                      ? "Paused"
                                      : "PAUSED"
                                    : "Archived"}
                              </span>
                            </div>
                          ) : isArchived ? (
                            <div className="opacity-60">
                              <StatusBadge
                                status={statusValue}
                                uppercase={campaignType !== "SD"}
                              />
                            </div>
                          ) : (
                            <div
                              className="w-[120px]"
                              style={{
                                position: "relative",
                                zIndex: isStateDropdownOpen ? 1001 : undefined,
                              }}
                            >
                              <Dropdown
                                options={[
                                  ...(campaignType === "SD" ||
                                  campaignType === "SB"
                                    ? [
                                        { value: "enabled", label: "Enabled" },
                                        { value: "paused", label: "Paused" },
                                      ]
                                    : [
                                        { value: "ENABLED", label: "ENABLED" },
                                        { value: "PAUSED", label: "PAUSED" },
                                      ]),
                                ]}
                                value={(() => {
                                  const raw =
                                    target.status || target.state || "ENABLED";
                                  const lower = raw?.toLowerCase() || "enabled";
                                  const normalized =
                                    campaignType === "SD" ||
                                    campaignType === "SB"
                                      ? lower === "enable" ||
                                        lower === "enabled"
                                        ? "enabled"
                                        : lower === "paused"
                                          ? "paused"
                                          : "enabled"
                                      : lower === "enable" ||
                                          lower === "enabled"
                                        ? "ENABLED"
                                        : "PAUSED";
                                  return editingField?.id === target.id &&
                                    editingField?.field === "status"
                                    ? editedValue
                                    : normalized;
                                })()}
                                onChange={(value) => {
                                  const raw =
                                    target.status || target.state || "ENABLED";
                                  const lower = raw?.toLowerCase() || "enabled";
                                  console.log(`lower ${`${lower}`}`);
                                  const currentStatus =
                                    campaignType === "SD" ||
                                    campaignType === "SB"
                                      ? lower === "enable" ||
                                        lower === "enabled"
                                        ? "enabled"
                                        : lower === "paused"
                                          ? "paused"
                                          : "enabled"
                                      : lower === "enable" ||
                                          lower === "enabled"
                                        ? "ENABLED"
                                        : "PAUSED";
                                  const wasEditing =
                                    editingField?.id === target.id &&
                                    editingField?.field === "status";

                                  if (!wasEditing) {
                                    onEditStart?.(
                                      target.id,
                                      "status",
                                      currentStatus,
                                    );
                                  }
                                  onEditChange?.(value);
                                  onEditEnd?.(value, target.id, "status");
                                }}
                                buttonClassName="inline-edit-dropdown"
                                width="w-full"
                                align="center"
                              />
                            </div>
                          )}
                        </td>

                        {/* Ad Group Name */}
                        <td className="table-cell">
                          <span className="table-text leading-[1.26]">
                            {(() => {
                              if (!target.adGroupId) return "—";
                              // Try to find ad group by matching IDs (handle both string and number)
                              const adgroup = adgroups.find((ag) => {
                                const agId = String(ag.adGroupId || "");
                                const targetId = String(target.adGroupId || "");
                                return agId === targetId;
                              });
                              // Return name if found, otherwise fall back to ID
                              return (
                                adgroup?.name || String(target.adGroupId) || "—"
                              );
                            })()}
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
