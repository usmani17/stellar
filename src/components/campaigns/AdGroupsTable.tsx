import React from "react";
import { Checkbox } from "../ui/Checkbox";
import { StatusBadge } from "../ui/StatusBadge";
import type { AdGroup } from "../../services/campaigns";

interface AdGroupsTableProps {
  adgroups: AdGroup[];
  loading?: boolean;
  onSelectAll?: (checked: boolean) => void;
  onSelect?: (id: number, checked: boolean) => void;
  selectedIds?: Set<number>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
  editingField?: { id: number; field: "status" | "default_bid" } | null;
  editedValue?: string;
  onEditStart?: (id: number, field: "status" | "default_bid", currentValue: string) => void;
  onEditChange?: (value: string) => void;
  onEditEnd?: () => void;
  inlineEditLoading?: Set<number>;
  pendingChange?: {
    id: number;
    field: "status" | "default_bid";
    newValue: string;
    oldValue: string;
  } | null;
  onConfirmChange?: () => void;
  onCancelChange?: () => void;
  showTotalRow?: boolean;
  totalRow?: {
    spends: string;
    sales: string;
    ctr: string;
  };
}

export const AdGroupsTable: React.FC<AdGroupsTableProps> = ({
  adgroups,
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
  inlineEditLoading = new Set(),
  pendingChange = null,
  onConfirmChange,
  onCancelChange,
  showTotalRow = false,
  totalRow,
}) => {
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
    adgroups.length > 0 && adgroups.every((ag) => selectedIds.has(ag.id));
  const someSelected = adgroups.some((ag) => selectedIds.has(ag.id));

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
            Loading ad groups...
          </div>
        ) : adgroups.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[13.3px] text-[#556179] mb-4">
              No ad groups found
            </p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            <table className="min-w-full">
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

                {/* Ad Group Name Header */}
                <th
                  className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] ${
                    onSort ? "cursor-pointer hover:bg-gray-50" : ""
                  }`}
                  onClick={() => onSort?.("name")}
                >
                  <div className="flex items-center gap-1">
                    Ad Group Name
                    {getSortIcon("name")}
                  </div>
                </th>

                {/* State Header */}
                <th
                  className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] ${
                    onSort ? "cursor-pointer hover:bg-gray-50" : ""
                  }`}
                  onClick={() => onSort?.("status")}
                >
                  <div className="flex items-center gap-1">
                    State
                    {getSortIcon("status")}
                  </div>
                </th>

                {/* Default Bid Header */}
                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                  Default Bid
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
              {adgroups.map((adgroup, index) => {
                const isLastRow = index === adgroups.length - 1;
                return (
                  <tr
                    key={adgroup.id}
                    className={`${
                      !isLastRow ? "border-b border-[#e8e8e3]" : ""
                    } hover:bg-gray-50 transition-colors`}
                  >
                    {/* Checkbox */}
                    <td className="py-[10px] px-[10px]">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={selectedIds.has(adgroup.id)}
                          onChange={(checked) =>
                            handleSelect(adgroup.id, checked)
                          }
                          size="small"
                        />
                      </div>
                    </td>

                    {/* Ad Group Name */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {adgroup.name}
                      </span>
                    </td>

                    {/* State */}
                    <td className="py-[10px] px-[10px]">
                      {inlineEditLoading.has(adgroup.id) ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {pendingChange?.field === "status" 
                              ? pendingChange.newValue === "enabled" ? "Enabled" 
                              : pendingChange.newValue === "paused" ? "Paused" 
                              : "Archived"
                              : adgroup.status}
                          </span>
                          <div className="w-4 h-4 border-2 border-[#136D6D] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : pendingChange?.id === adgroup.id && pendingChange?.field === "status" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            {pendingChange.newValue === "enabled" ? "Enabled" 
                              : pendingChange.newValue === "paused" ? "Paused" 
                              : "Archived"}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={onConfirmChange}
                              className="p-1 hover:bg-green-50 rounded transition-colors"
                              title="Yes"
                            >
                              <svg
                                className="w-4 h-4 text-green-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={onCancelChange}
                              className="p-1 hover:bg-red-50 rounded transition-colors"
                              title="No"
                            >
                              <svg
                                className="w-4 h-4 text-red-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
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
                        </div>
                      ) : editingField?.id === adgroup.id && editingField?.field === "status" ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editedValue}
                            onChange={(e) => onEditChange?.(e.target.value)}
                            className="text-[13.3px] text-[#0b0f16] leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1"
                            autoFocus
                            onBlur={onEditEnd}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === "Escape") {
                                onEditEnd?.();
                              }
                            }}
                          >
                            <option value="enabled">Enabled</option>
                            <option value="paused">Paused</option>
                            <option value="archived">Archived</option>
                          </select>
                        </div>
                      ) : (
                        <div
                          className="text-[13.3px] text-[#0b0f16] leading-[1.26] cursor-pointer hover:underline"
                          onClick={() => {
                            const statusLower = adgroup.status?.toLowerCase() || "enabled";
                            const statusValue =
                              statusLower === "enable" || statusLower === "enabled"
                                ? "enabled"
                                : statusLower === "paused"
                                ? "paused"
                                : "archived";
                            onEditStart?.(adgroup.id, "status", statusValue);
                          }}
                        >
                          <StatusBadge status={adgroup.status} />
                        </div>
                      )}
                    </td>

                    {/* Default Bid */}
                    <td className="py-[10px] px-[10px]">
                      {inlineEditLoading.has(adgroup.id) ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            ${parseFloat(pendingChange?.newValue || "0").toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          <div className="w-4 h-4 border-2 border-[#136D6D] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : pendingChange?.id === adgroup.id && pendingChange?.field === "default_bid" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                            ${parseFloat(pendingChange.newValue || "0").toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={onConfirmChange}
                              className="p-1 hover:bg-green-50 rounded transition-colors"
                              title="Yes"
                            >
                              <svg
                                className="w-4 h-4 text-green-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={onCancelChange}
                              className="p-1 hover:bg-red-50 rounded transition-colors"
                              title="No"
                            >
                              <svg
                                className="w-4 h-4 text-red-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
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
                        </div>
                      ) : editingField?.id === adgroup.id && editingField?.field === "default_bid" ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editedValue}
                            onChange={(e) => onEditChange?.(e.target.value)}
                            className="text-[13.3px] text-[#0b0f16] leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-24"
                            autoFocus
                            onBlur={onEditEnd}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === "Escape") {
                                onEditEnd?.();
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          className="text-[13.3px] text-[#0b0f16] leading-[1.26] cursor-pointer hover:underline"
                          onClick={() => {
                            const bidValue = adgroup.default_bid
                              ? adgroup.default_bid.replace(/[^0-9.]/g, "")
                              : "0";
                            onEditStart?.(adgroup.id, "default_bid", bidValue);
                          }}
                        >
                          {adgroup.default_bid || "$0.00"}
                        </div>
                      )}
                    </td>

                    {/* CTR */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {adgroup.ctr}
                      </span>
                    </td>

                    {/* Spends */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {adgroup.spends}
                      </span>
                    </td>

                    {/* Sales */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {adgroup.sales}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {/* Total Row */}
              {showTotalRow && totalRow && (
                <tr className="border-t-2 border-[#136D6D] bg-[#f9f9f6] font-semibold">
                  <td className="py-[10px] px-[10px]" colSpan={3}>
                    <span className="text-[13.3px] text-[#072929] leading-[1.26]">Total</span>
                  </td>
                  <td className="py-[10px] px-[10px]">
                    <span className="text-[13.3px] text-[#072929] leading-[1.26]">—</span>
                  </td>
                  <td className="py-[10px] px-[10px]">
                    <span className="text-[13.3px] text-[#072929] leading-[1.26]">
                      {totalRow.ctr}
                    </span>
                  </td>
                  <td className="py-[10px] px-[10px]">
                    <span className="text-[13.3px] text-[#072929] leading-[1.26]">
                      {totalRow.spends}
                    </span>
                  </td>
                  <td className="py-[10px] px-[10px]">
                    <span className="text-[13.3px] text-[#072929] leading-[1.26]">
                      {totalRow.sales}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
};
