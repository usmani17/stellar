import React, { useRef } from "react";
import { Checkbox } from "../ui/Checkbox";
import { StatusBadge } from "../ui/StatusBadge";
import { Dropdown } from "../ui/Dropdown";
import { Loader } from "../ui/Loader";

import type { Keyword } from "../../services/campaigns";

interface KeywordsTableProps {
  keywords: Keyword[];
  loading?: boolean;
  onSelectAll?: (checked: boolean) => void;
  onSelect?: (id: number, checked: boolean) => void;
  selectedIds?: Set<number>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
  editingField?: {
    id: number;
    field: "state" | "bid";
  } | null;
  editedValue?: string;
  onEditStart?: (
    id: number,
    field: "state" | "bid",
    currentValue: string,
  ) => void;
  onEditChange?: (value: string) => void;
  onEditEnd?: (value?: string, keywordId?: number, field?: "state" | "bid") => void;
  onEditCancel?: () => void;
  inlineEditLoading?: Set<number>;
  pendingChange?: {
    id: number;
    field: "state" | "bid" | "status";
    newValue: string;
    oldValue: string;
  } | null;
}

export const KeywordsTable: React.FC<KeywordsTableProps> = ({
  keywords,
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
    keywords.length > 0 && keywords.every((kw) => selectedIds.has(kw.id));
  const someSelected = keywords.some((kw) => selectedIds.has(kw.id));

  const handleSelectAll = (checked: boolean) => {
    onSelectAll?.(checked);
  };

  const handleSelect = (id: number, checked: boolean) => {
    onSelect?.(id, checked);
  };

  return (
    <div
      className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full"
      style={{ position: "relative", minHeight: loading ? "400px" : "auto" }}
    >
      <div className="overflow-x-auto w-full">
        {keywords.length === 0 && !loading ? (
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
                No Keywords Found
              </h3>
              {/* Description */}
              <p className="text-sm text-[#556179] text-center leading-relaxed">
                There are no keywords for this campaign yet. Keywords will
                appear here when they are created.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            <table className="min-w-full">
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

                  {/* Keyword Header */}
                  <th
                    className={`table-header ${
                      onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                    onClick={() => onSort?.("name")}
                  >
                    <div className="flex items-center gap-1">
                      Keyword
                      {getSortIcon("name")}
                    </div>
                  </th>

                  {/* Ad Group Header */}
                  <th className="table-header">Ad Group</th>

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
                  <th className="table-header">Bid</th>

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
                {keywords.map((keyword, index) => {
                  const isLastRow = index === keywords.length - 1;
                  const isArchived =
                    keyword.state?.toLowerCase() === "archived";
                  const isEnabled = keyword.state?.toLowerCase() === "enabled";
                  const isPaused = keyword.state?.toLowerCase() === "paused";
                  return (
                    <tr
                      key={keyword.id}
                      className={`${
                        !isLastRow ? "border-b border-[#e8e8e3]" : ""
                      } ${isArchived ? "bg-gray-100 opacity-60" : "hover:bg-gray-50"} transition-colors`}
                    >
                      {/* Checkbox */}
                      <td className="table-cell">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedIds.has(keyword.id)}
                            onChange={(checked) =>
                              handleSelect(keyword.id, checked)
                            }
                            size="small"
                          />
                        </div>
                      </td>

                      {/* Keyword Name */}
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">
                          {keyword.name}
                        </span>
                      </td>

                      {/* Ad Group */}
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">
                          {keyword.adgroup_name || "—"}
                        </span>
                      </td>

                      {/* State */}
                      <td className="table-cell min-w-[250px]">
                        {(() => {
                          if (inlineEditLoading.has(keyword.id)) {
                            return (
                              <div className="flex items-center gap-2">
                                <span className="table-text leading-[1.26]">
                                  {pendingChange?.field === "state" || pendingChange?.field === "status"
                                    ? pendingChange.newValue === "enabled"
                                      ? "Enabled"
                                      : pendingChange.newValue === "paused"
                                        ? "Paused"
                                        : "Archived"
                                    : keyword.state}
                                </span>
                                <div className="w-4 h-4 border-2 border-[#136D6D] border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            );
                          }

                          if (
                            pendingChange?.id === keyword.id &&
                            pendingChange?.field === "state" || pendingChange?.field === "status"
                          ) {
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
                                <StatusBadge status={keyword.state} />
                              </div>
                            );
                          }

                          const stateLower =
                            keyword.state?.toLowerCase() || "enabled";
                          const stateValue =
                            stateLower === "enable" || stateLower === "enabled"
                              ? "enabled"
                              : "paused";

                          const currentValue =
                            editingField?.id === keyword.id &&
                            editingField?.field === "state"
                              ? editedValue
                              : stateValue;

                          return (
                            <Dropdown
                              options={[
                                { value: "enabled", label: "Enabled" },
                                { value: "paused", label: "Paused" },
                                { value: "archive", label: "Archive" },
                              ]}
                              value={currentValue}
                              onChange={(val) => {
                                const newValue = val as string;
                                if (
                                  editingField?.id !== keyword.id ||
                                  editingField?.field !== "state"
                                ) {
                                  onEditStart?.(
                                    keyword.id,
                                    "state",
                                    stateValue,
                                  );
                                }
                                onEditChange?.(newValue);
                                onEditEnd?.(newValue, keyword.id, "state");
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
                          if (inlineEditLoading.has(keyword.id)) {
                            return (
                              <div className="flex items-center gap-2">
                                <span className="table-text leading-[1.26]">
                                  $
                                  {parseFloat(
                                    pendingChange?.newValue || "0",
                                  ).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                                <div className="w-4 h-4 border-2 border-[#136D6D] border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            );
                          }

                          if (
                            pendingChange?.id === keyword.id &&
                            pendingChange?.field === "bid"
                          ) {
                            return (
                              <div className="flex items-center gap-2">
                                <span className="table-text leading-[1.26]">
                                  $
                                  {parseFloat(
                                    pendingChange.newValue || "0",
                                  ).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            );
                          }

                          const currentBid =
                            keyword.bid != null && keyword.bid !== ""
                              ? String(keyword.bid).replace(/[^0-9.]/g, "")
                              : "0";

                          const bidValue =
                            editingField?.id === keyword.id &&
                            editingField?.field === "bid"
                              ? editedValue
                              : currentBid;

                          return (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={bidValue}
                              onFocus={() => {
                                if (
                                  !isArchived &&
                                  (editingField?.id !== keyword.id ||
                                    editingField?.field !== "bid")
                                ) {
                                  onEditStart?.(keyword.id, "bid", currentBid);
                                }
                              }}
                              onChange={(e) => {
                                if (isArchived) return;
                                onEditChange?.(e.target.value);
                              }}
                              onBlur={(e) => {
                                if (isArchived) return;
                                const inputValue = e.target.value;
                                if (
                                  editingField?.id === keyword.id &&
                                  editingField?.field === "bid"
                                ) {
                                  onEditEnd?.(inputValue, keyword.id, "bid");
                                }
                              }}
                              onKeyDown={(e) => {
                                if (isArchived) return;
                                if (e.key === "Enter" || e.key === "Escape") {
                                  onEditEnd?.(
                                    (e.target as HTMLInputElement).value,
                                    keyword.id,
                                    "bid",
                                  );
                                }
                              }}
                              disabled={isArchived}
                              className={`inline-edit-input w-24 ${
                                isArchived
                                  ? "opacity-60 cursor-not-allowed bg-gray-50"
                                  : ""
                              }`}
                            />
                          );
                        })()}
                      </td>

                      {/* CTR */}
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">
                          {keyword.ctr}
                        </span>
                      </td>

                      {/* Spends */}
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">
                          {keyword.spends}
                        </span>
                      </td>

                      {/* Sales */}
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">
                          {keyword.sales}
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
            <Loader size="md" message="Loading keywords..." />
          </div>
        </div>
      )}
    </div>
  );
};
