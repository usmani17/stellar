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
    <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] w-full">
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
                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] w-[35px]">
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
                  className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] ${
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
                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                  Ad Group
                </th>

                {/* State Header */}
                <th
                  className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] min-w-[115px] ${
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
                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                  Bid
                </th>

                {/* Profile Name Header */}
                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                  Profile
                </th>

                {/* Keyword Header */}
                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                  Keyword
                </th>

                {/* Keyword Type Header */}
                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                  Keyword Type
                </th>

                {/* Keyword Bid Header */}
                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                  Keyword Bid
                </th>

                {/* Match Type Header */}
                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                  Match Type
                </th>

                {/* Targeting Header */}
                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                  Targeting
                </th>

                {/* CTR Header */}
                <th
                  className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] ${
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
                  className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] ${
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
                  className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] ${
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
                    <td className="py-[10px] px-[10px]">
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
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.name}
                      </span>
                    </td>

                    {/* Ad Group */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.adgroup_name || "—"}
                      </span>
                    </td>

                    {/* State */}
                    <td className="py-[10px] px-[10px] min-w-[115px]">
                      {inlineEditLoading.has(target.id) ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {pendingChange?.field === "status"
                              ? pendingChange.newValue === "enabled"
                                ? "Enabled"
                                : "Paused"
                              : target.status}
                          </span>
                          <div className="w-4 h-4 border-2 border-[#136D6D] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : pendingChange?.id === target.id &&
                        pendingChange?.field === "status" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {pendingChange.newValue === "enabled"
                              ? "Enabled"
                              : "Paused"}
                          </span>
                        </div>
                      ) : editingField?.id === target.id &&
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
                                target.status?.toLowerCase() || "enabled";
                              return statusLower === "enable" ||
                                statusLower === "enabled"
                                ? "enabled"
                                : "paused";
                            })()}
                            onChange={(val) => {
                              // Mark that a selection was made for this target
                              statusSelectionMadeRef.current = target.id;
                              const newValue = val as string;
                              onEditChange?.(newValue);
                              // Call onEditEnd with the new value immediately when a value is selected
                              onEditEnd?.(newValue);
                              // Clear the ref after a short delay to allow onClose to check it
                              setTimeout(() => {
                                if (
                                  statusSelectionMadeRef.current ===
                                  target.id
                                ) {
                                  statusSelectionMadeRef.current = null;
                                }
                              }, 200);
                            }}
                            onClose={() => {
                              // Only cancel if no selection was made (clicked outside)
                              if (
                                statusSelectionMadeRef.current !==
                                  target.id &&
                                editingField?.id === target.id
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
                                target.status?.toLowerCase() || "enabled";
                              const statusValue =
                                statusLower === "enable" ||
                                statusLower === "enabled"
                                  ? "enabled"
                                  : "paused";
                              onEditStart?.(target.id, "status", statusValue);
                            }
                          }}
                        >
                          <StatusBadge status={target.status} />
                        </div>
                      )}
                    </td>

                    {/* Bid */}
                    <td className="py-[10px] px-[10px]">
                      {inlineEditLoading.has(target.id) ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
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
                      ) : pendingChange?.id === target.id &&
                        pendingChange?.field === "bid" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            $
                            {parseFloat(
                              pendingChange.newValue || "0"
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      ) : editingField?.id === target.id &&
                        editingField?.field === "bid" ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editedValue}
                            onChange={(e) => onEditChange?.(e.target.value)}
                            className="text-[13.3px] text-[#0b0f16] leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-24"
                            autoFocus
                            onBlur={(e) => onEditEnd?.(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === "Escape") {
                                onEditEnd?.(
                                  (e.target as HTMLInputElement).value
                                );
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          className={`text-[13.3px] leading-[1.26] ${
                            isArchived
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-[#0b0f16] cursor-pointer hover:underline"
                          }`}
                          onClick={() => {
                            if (!isArchived) {
                              const currentBid = target.bid
                                ? target.bid.replace(/[^0-9.]/g, "")
                                : "0";
                              onEditStart?.(target.id, "bid", currentBid);
                            }
                          }}
                        >
                          {target.bid || "$0.00"}
                        </div>
                      )}
                    </td>

                    {/* Profile Name */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.profile_name || "—"}
                      </span>
                    </td>

                    {/* Keyword */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.keyword || "—"}
                      </span>
                    </td>

                    {/* Keyword Type */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.keyword_type || "—"}
                      </span>
                    </td>

                    {/* Keyword Bid */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.keyword_bid || "$0.00"}
                      </span>
                    </td>

                    {/* Match Type */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.match_type || "—"}
                      </span>
                    </td>

                    {/* Targeting */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.targeting || "—"}
                      </span>
                    </td>

                    {/* CTR */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.ctr}
                      </span>
                    </td>

                    {/* Spends */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.spends}
                      </span>
                    </td>

                    {/* Sales */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
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
