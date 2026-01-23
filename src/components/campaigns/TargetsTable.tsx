import React, { useRef } from "react";
import { Checkbox } from "../ui/Checkbox";
import { StatusBadge } from "../ui/StatusBadge";
import { Dropdown } from "../ui/Dropdown";
import type { Target } from "../../services/campaigns";

interface TargetsTableProps {
  targets: Target[];
  loading?: boolean;
  onSelectAll?: (checked: boolean) => void;
  onSelect?: (id: number, checked: boolean) => void;
  selectedIds?: Set<number>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
  editingField?: {
    id: number;
    field: "status" | "bid";
  } | null;
  editedValue?: string;
  onEditStart?: (
    id: number,
    field: "status" | "bid",
    currentValue: string
  ) => void;
  onEditChange?: (value: string) => void;
  onEditEnd?: (value?: string) => void;
  onEditCancel?: () => void;
  inlineEditLoading?: Set<number>;
  pendingChange?: {
    id: number;
    field: "status" | "bid";
    newValue: string;
    oldValue: string;
  } | null;
  campaignType?: string; // SP, SB, or SD
}

export const TargetsTable: React.FC<TargetsTableProps> = ({
  targets,
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
  campaignType,
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
    targets.length > 0 && targets.every((tgt) => selectedIds.has(tgt.id));
  const someSelected = targets.some((tgt) => selectedIds.has(tgt.id));

  const handleSelectAll = (checked: boolean) => {
    onSelectAll?.(checked);
  };

  const handleSelect = (id: number, checked: boolean) => {
    onSelect?.(id, checked);
  };

  return (
    <div className="table-container">
      {loading ? (
        <div className="text-center py-8 text-[#556179] text-[13.3px]">
          Loading targets...
        </div>
      ) : targets.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[13.3px] text-[#556179] mb-4">No targets found</p>
        </div>
      ) : (
        <div className="max-h-[600px] overflow-auto w-full overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-max">
            <thead className="sticky top-0 bg-[#fefefb] z-10">
              <tr className="border-b border-[#e8e8e3]">
                {/* Checkbox Header */}
                <th className="table-header w-[35px]">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={handleSelectAll}
                      size="small"
                    />
                  </div>
                </th>

                {/* Target Name Header */}
                <th
                  className={`table-header ${
                    onSort ? "cursor-pointer hover:bg-gray-50" : ""
                  }`}
                  onClick={() => onSort?.("name")}
                >
                  <div className="flex items-center gap-1">
                    Target
                    {getSortIcon("name")}
                  </div>
                </th>

                {/* Ad Group Header */}
                <th className="table-header">
                  Ad Group
                </th>

                {/* State Header */}
                <th
                  className={`table-header min-w-[250px] ${
                    onSort ? "cursor-pointer hover:bg-gray-50" : ""
                  }`}
                  onClick={() => onSort?.("status")}
                >
                  <div className="flex items-center gap-1">
                    State
                    {getSortIcon("status")}
                  </div>
                </th>

                {/* Bid Header */}
                <th className="table-header">
                  Bid
                </th>

                {/* Profile Name Header */}
                <th className="table-header">
                  Profile
                </th>

                {/* Keyword Header */}
                <th className="table-header">
                  Keyword
                </th>

                {/* Keyword Type Header */}
                <th className="table-header">
                  Keyword Type
                </th>

                {/* Keyword Bid Header */}
                <th className="table-header">
                  Keyword Bid
                </th>

                {/* Match Type Header */}
                <th className="table-header">
                  Match Type
                </th>

                {/* Targeting Header */}
                <th className="table-header">
                  Targeting
                </th>

                {/* CTR Header */}
                <th
                  className={`table-header ${
                    onSort ? "cursor-pointer hover:bg-gray-50" : ""
                  }`}
                  onClick={() => onSort?.("ctr")}
                >
                  <div className="flex items-center gap-1">
                    CTR
                    {getSortIcon("ctr")}
                  </div>
                </th>

                {/* Spends Header */}
                <th
                  className={`table-header ${
                    onSort ? "cursor-pointer hover:bg-gray-50" : ""
                  }`}
                  onClick={() => onSort?.("spends")}
                >
                  <div className="flex items-center gap-1">
                    Spends
                    {getSortIcon("spends")}
                  </div>
                </th>

                {/* Sales Header */}
                <th
                  className={`table-header ${
                    onSort ? "cursor-pointer hover:bg-gray-50" : ""
                  }`}
                  onClick={() => onSort?.("sales")}
                >
                  <div className="flex items-center gap-1">
                    Sales
                    {getSortIcon("sales")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {targets.map((target, index) => {
                const isLastRow = index === targets.length - 1;
                const isArchived = target.status?.toLowerCase() === "archived";
                return (
                  <tr
                    key={target.id}
                    className={`${
                      !isLastRow ? "border-b border-[#e8e8e3]" : ""
                    } ${isArchived ? "bg-gray-100 opacity-60" : "hover:bg-gray-50"} transition-colors`}
                  >
                    {/* Checkbox */}
                    <td className="table-cell">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={selectedIds.has(target.id)}
                          onChange={(checked) =>
                            handleSelect(target.id, checked)
                          }
                          size="small"
                        />
                      </div>
                    </td>

                    {/* Target Name */}
                    <td className="table-cell">
                      <span className="table-text leading-[1.26]">
                        {target.name}
                      </span>
                    </td>

                    {/* Ad Group */}
                    <td className="table-cell">
                      <span className="table-text leading-[1.26]">
                        {target.adgroup_name || "—"}
                      </span>
                    </td>

                    {/* State */}
                    <td className="table-cell min-w-[250px]">
                      {(() => {
                        if (inlineEditLoading.has(target.id)) {
                          return (
                            <div className="flex items-center gap-2">
                              <span className="table-text leading-[1.26]">
                                {pendingChange?.field === "status"
                                  ? pendingChange.newValue === "enabled"
                                    ? "Enabled"
                                    : "Paused"
                                  : target.status}
                              </span>
                              <div className="w-4 h-4 border-2 border-[#136D6D] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          );
                        }
                        
                        if (pendingChange?.id === target.id &&
                            pendingChange?.field === "status") {
                          return (
                            <div className="flex items-center gap-2">
                              <span className="table-text leading-[1.26]">
                                {pendingChange.newValue === "enabled"
                                  ? "Enabled"
                                  : "Paused"}
                              </span>
                            </div>
                          );
                        }
                        
                        if (isArchived) {
                          return (
                            <div className="opacity-60">
                              <StatusBadge status={target.status} />
                            </div>
                          );
                        }
                        
                        const statusLower =
                          target.status?.toLowerCase() || "enabled";
                        let statusValue = "enabled";
                        if (
                          statusLower === "archived" ||
                          statusLower === "archive"
                        ) {
                          statusValue = "archived";
                        } else if (
                          statusLower === "enable" ||
                          statusLower === "enabled"
                        ) {
                          statusValue = "enabled";
                        } else {
                          statusValue = "paused";
                        }
                        
                        const currentValue = editingField?.id === target.id &&
                          editingField?.field === "status"
                          ? editedValue
                          : statusValue;
                        
                        return (
                          <Dropdown
                            options={[
                              { value: "enabled", label: "Enabled" },
                              { value: "paused", label: "Paused" },
                              ...(campaignType === "SD"
                                ? [{ value: "archived", label: "Archived" }]
                                : []),
                            ]}
                            value={currentValue}
                            onChange={(val) => {
                              const newValue = val as string;
                              if (editingField?.id !== target.id ||
                                  editingField?.field !== "status") {
                                onEditStart?.(target.id, "status", statusValue);
                              }
                              onEditChange?.(newValue);
                              onEditEnd?.(newValue);
                            }}
                            buttonClassName="inline-edit-dropdown"
                            width="w-full"
                            align="center"
                          />
                        );
                      })()}
                    </td>

                    {/* Bid */}
                    <td className="table-cell">
                      {(() => {
                        if (inlineEditLoading.has(target.id)) {
                          return (
                            <div className="flex items-center gap-2">
                              <span className="table-text leading-[1.26]">
                                $
                                {parseFloat(
                                  pendingChange?.newValue || "0"
                                ).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                              <div className="w-4 h-4 border-2 border-[#136D6D] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          );
                        }
                        
                        if (pendingChange?.id === target.id &&
                            pendingChange?.field === "bid") {
                          return (
                            <div className="flex items-center gap-2">
                              <span className="table-text leading-[1.26]">
                                $
                                {parseFloat(
                                  pendingChange.newValue || "0"
                                ).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          );
                        }
                        
                        const currentBid = target.bid
                          ? target.bid.replace(/[^0-9.]/g, "")
                          : "0";
                        
                        const bidValue = editingField?.id === target.id &&
                          editingField?.field === "bid"
                          ? editedValue
                          : currentBid;
                        
                        return (
                          <div className="flex items-center gap-1">
                            <span className="text-[13.3px] text-[#0b0f16]">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0.02"
                              value={bidValue}
                              onFocus={() => {
                                if (!isArchived &&
                                    (editingField?.id !== target.id ||
                                     editingField?.field !== "bid")) {
                                  onEditStart?.(target.id, "bid", currentBid);
                                }
                              }}
                              onChange={(e) => {
                                if (isArchived) return;
                                onEditChange?.(e.target.value);
                              }}
                              onBlur={(e) => {
                                if (isArchived) return;
                                setTimeout(() => {
                                  const inputValue = e.target.value;
                                  if (editingField?.id === target.id &&
                                      editingField?.field === "bid") {
                                    onEditEnd?.(inputValue);
                                  }
                                }, 200);
                              }}
                              onKeyDown={(e) => {
                                if (isArchived) return;
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  onEditEnd?.(
                                    (e.target as HTMLInputElement).value
                                  );
                                } else if (e.key === "Escape") {
                                  e.preventDefault();
                                  onEditCancel?.();
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              disabled={isArchived}
                              className={`table-text leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-20 ${
                                isArchived ? "opacity-60 cursor-not-allowed bg-gray-50" : ""
                              }`}
                            />
                          </div>
                        );
                      })()}
                    </td>

                    {/* Profile Name */}
                    <td className="table-cell">
                      <span className="table-text leading-[1.26]">
                        {target.profile_name || "—"}
                      </span>
                    </td>

                    {/* Keyword */}
                    <td className="table-cell">
                      <span className="table-text leading-[1.26]">
                        {target.keyword || "—"}
                      </span>
                    </td>

                    {/* Keyword Type */}
                    <td className="table-cell">
                      <span className="table-text leading-[1.26]">
                        {target.keyword_type || "—"}
                      </span>
                    </td>

                    {/* Keyword Bid */}
                    <td className="table-cell">
                      <span className="table-text leading-[1.26]">
                        {target.keyword_bid || "$0.00"}
                      </span>
                    </td>

                    {/* Match Type */}
                    <td className="table-cell">
                      <span className="table-text leading-[1.26]">
                        {target.match_type || "—"}
                      </span>
                    </td>

                    {/* Targeting */}
                    <td className="table-cell">
                      <span className="table-text leading-[1.26]">
                        {target.targeting || "—"}
                      </span>
                    </td>

                    {/* CTR */}
                    <td className="table-cell">
                      <span className="table-text leading-[1.26]">
                        {target.ctr}
                      </span>
                    </td>

                    {/* Spends */}
                    <td className="table-cell">
                      <span className="table-text leading-[1.26]">
                        {target.spends}
                      </span>
                    </td>

                    {/* Sales */}
                    <td className="table-cell">
                      <span className="table-text leading-[1.26]">
                        {target.sales}
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
  );
};
