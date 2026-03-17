import React, { useState } from "react";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { Loader } from "../../../../components/ui/Loader";
import {
  formatCurrency2Decimals,
  getSortIcon,
} from "../../../google/utils/campaignDetailHelpers";
import { normalizeStatusDisplay } from "../../../../utils/statusHelpers";
import type { MetaAdsetRow } from "../../../hooks/useMetaCampaignDetailAdsets";

interface MetaCampaignDetailAdsetsTabProps {
  adsets: MetaAdsetRow[];
  loading: boolean;
  selectedIds: Set<string | number>;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string | number, checked: boolean) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (column: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  createButton?: React.ReactNode;
  createPanel?: React.ReactNode;
  onAdsetNameClick?: (row: MetaAdsetRow) => void;
  onInlineStatusChange?: (adsetId: string, status: string) => void;
  onInlineBudgetBlur?: (adsetId: string, value: number, isDaily: boolean) => void;
  onBulkStatus?: (ids: (string | number)[], status: string) => void;
  onBulkBudget?: (ids: (string | number)[], value: number, isDaily: boolean) => void;
}

const formatDate = (d: string | undefined) => {
  if (!d) return "—";
  try {
    const date = new Date(d);
    return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
};

const rowUsesDailyBudget = (row: MetaAdsetRow): boolean =>
  row.daily_budget != null && String(row.daily_budget).trim() !== "" && parseFloat(String(row.daily_budget)) > 0;

const getRowBudgetDisplay = (row: MetaAdsetRow): string => {
  if (rowUsesDailyBudget(row)) return String(row.daily_budget ?? "");
  if (row.lifetime_budget != null && String(row.lifetime_budget).trim() !== "" && parseFloat(String(row.lifetime_budget)) > 0)
    return String(row.lifetime_budget ?? "");
  return "";
};

export const MetaCampaignDetailAdsetsTab: React.FC<MetaCampaignDetailAdsetsTabProps> = ({
  adsets,
  loading,
  selectedIds,
  onSelectAll,
  onSelectOne,
  sortBy,
  sortOrder,
  onSort,
  currentPage,
  totalPages,
  onPageChange,
  createButton,
  createPanel,
  onAdsetNameClick,
  onInlineStatusChange,
  onInlineBudgetBlur,
  onBulkStatus,
  onBulkBudget,
}) => {
  const allSelected = adsets.length > 0 && adsets.every((a) => selectedIds.has(a.adset_id ?? a.id));
  const someSelected = selectedIds.size > 0;
  const [inlineBudgetId, setInlineBudgetId] = useState<string | null>(null);
  const [inlineBudgetValue, setInlineBudgetValue] = useState("");
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkBudgetValue, setBulkBudgetValue] = useState("");
  const [bulkBudgetIsDaily, setBulkBudgetIsDaily] = useState(true);
  const [showBudgetPanel, setShowBudgetPanel] = useState(false);

  const getStatusOption = (status: string | undefined): string => {
    const u = (status ?? "").toUpperCase();
    if (u === "ACTIVE" || u === "PAUSED" || u === "ARCHIVED" || u === "DELETED") return u;
    return "PAUSED";
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {someSelected && (
            <span className="text-sm text-[#556179]">
              {selectedIds.size} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(onBulkStatus != null || onBulkBudget != null) && (
            <div className="relative inline-flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedIds.size === 0) return;
                  setShowBulkActions((prev) => !prev);
                  setBulkStatusOpen(false);
                }}
                className="edit-button flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedIds.size === 0}
              >
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 3.5a2.121 2.121 0 113 3L12 16l-4 1 1-4 9.5-9.5z"
                  />
                </svg>
                <span className="text-[10.64px] text-[#072929] font-normal">
                  Edit
                </span>
              </button>
              {showBulkActions && (
                <div className="absolute top-[42px] left-0 w-56 bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                  <div className="overflow-y-auto">
                    {onBulkStatus != null && (
                      <>
                        {[
                          { value: "ACTIVE", label: "Enable" },
                          { value: "PAUSED", label: "Pause" },
                          { value: "ARCHIVED", label: "Archive" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            disabled={selectedIds.size === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectedIds.size === 0) return;
                              onBulkStatus(Array.from(selectedIds), opt.value);
                              setShowBulkActions(false);
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                        <div className="border-t border-gray-200" />
                      </>
                    )}
                    {onBulkBudget != null && (
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        disabled={selectedIds.size === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedIds.size === 0) return;
                          setShowBudgetPanel(true);
                          setShowBulkActions(false);
                        }}
                      >
                        Edit Budget
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {createButton}
        </div>
      </div>
      {createPanel}
      {someSelected && onBulkBudget != null && showBudgetPanel && (
        <div className="mb-4 border border-gray-200 rounded-xl p-4 bg-[#f9f9f6]">
          <div className="flex flex-wrap items-end gap-3 justify-between">
            <div className="w-[160px]">
              <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
                Budget Value
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={bulkBudgetValue}
                onChange={(e) => setBulkBudgetValue(e.target.value)}
                placeholder="e.g. 20.00"
                className="bg-[#FEFEFB] w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[10.64px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1 text-[10.64px] text-[#556179]">
                <input
                  type="radio"
                  checked={bulkBudgetIsDaily}
                  onChange={() => setBulkBudgetIsDaily(true)}
                />
                Daily
              </label>
              <label className="flex items-center gap-1 text-[10.64px] text-[#556179]">
                <input
                  type="radio"
                  checked={!bulkBudgetIsDaily}
                  onChange={() => setBulkBudgetIsDaily(false)}
                />
                Lifetime
              </label>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => {
                  setShowBudgetPanel(false);
                  setBulkBudgetValue("");
                }}
                className="cancel-button"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const num = parseFloat(bulkBudgetValue);
                  if (!Number.isNaN(num) && num > 0) {
                    onBulkBudget(Array.from(selectedIds), num, bulkBudgetIsDaily);
                    setBulkBudgetValue("");
                    setShowBudgetPanel(false);
                  }
                }}
                disabled={!bulkBudgetValue.trim()}
                className="create-entity-button btn-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="overflow-x-auto w-full">
        <table className="min-w-[1000px] w-full">
          <thead>
            <tr className="border-b border-[#e8e8e3]">
              <th className="table-header sticky left-0 z-[1] bg-[#f5f5f0] border-r border-[#e8e8e3] w-[35px] min-w-[35px]">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onChange={onSelectAll}
                />
              </th>
              <th className="table-header table-sticky-first-column min-w-[200px]">
                <button type="button" onClick={() => onSort("adset_name")} className="flex items-center gap-1">
                  Ad set name
                  {getSortIcon("adset_name", sortBy, sortOrder)}
                </button>
              </th>
              <th className="table-header min-w-[100px]">Status</th>
              <th className="table-header min-w-[100px]">Budget</th>
              <th className="table-header min-w-[80px]">Bid</th>
              <th className="table-header min-w-[100px]">Start</th>
              <th className="table-header min-w-[100px]">End</th>
              <th className="table-header min-w-[90px]">Impressions</th>
              <th className="table-header min-w-[90px]">Clicks</th>
              <th className="table-header min-w-[90px]">Spends</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="table-cell py-8">
                  <div className="flex justify-center">
                    <Loader size="md" message="Loading ad sets..." />
                  </div>
                </td>
              </tr>
            ) : adsets.length === 0 ? (
              <tr>
                <td colSpan={10} className="table-cell py-8 text-center text-[#556179]">
                  No ad sets found for this campaign.
                </td>
              </tr>
            ) : (
              adsets.map((row) => {
                const id = row.adset_id ?? row.id;
                const aid = String(id);
                const isSelected = selectedIds.has(id);
                const isBudgetEditing = inlineBudgetId === aid;
                const budgetDisplay = getRowBudgetDisplay(row);
                return (
                  <tr key={aid} className="table-row group">
                    <td className="table-cell sticky left-0 z-[120] bg-[#f5f5f0] group-hover:bg-gray-100 border-r border-[#e8e8e3]">
                      <Checkbox
                        checked={isSelected}
                        onChange={(checked) => onSelectOne(id, checked)}
                      />
                    </td>
                    <td className="table-cell table-sticky-first-column min-w-[200px] max-w-[400px] group-hover:bg-[#f9f9f6] table-text leading-[1.26]">
                      {onAdsetNameClick ? (
                        <button
                          type="button"
                          onClick={() => onAdsetNameClick(row)}
                          className="text-left text-[#136D6D] hover:underline cursor-pointer truncate block w-full"
                        >
                          {row.adset_name ?? "—"}
                        </button>
                      ) : (
                        row.adset_name ?? "—"
                      )}
                    </td>
                    <td className="table-cell min-w-[100px] table-text leading-[1.26]">
                      {onInlineStatusChange ? (
                        <select
                          value={getStatusOption(row.status)}
                          onChange={(e) => onInlineStatusChange(aid, e.target.value)}
                          className="text-[12px] border border-[#e8e8e3] rounded px-2 py-1 bg-gray-50 min-w-[90px]"
                          aria-label={`Status for ${row.adset_name ?? aid}`}
                        >
                          <option value="ACTIVE">Enabled</option>
                          <option value="PAUSED">Paused</option>
                          <option value="ARCHIVED">Archived</option>
                          <option value="DELETED">Deleted</option>
                        </select>
                      ) : (
                        normalizeStatusDisplay(row.status)
                      )}
                    </td>
                    <td className="table-cell min-w-[100px] table-text leading-[1.26]">
                      {onInlineBudgetBlur ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={isBudgetEditing ? inlineBudgetValue : budgetDisplay}
                          onFocus={() => {
                            setInlineBudgetId(aid);
                            setInlineBudgetValue(budgetDisplay);
                          }}
                          onChange={(e) => isBudgetEditing && setInlineBudgetValue(e.target.value)}
                          onBlur={() => {
                            if (!onInlineBudgetBlur) return;
                            setInlineBudgetId(null);
                            const num = parseFloat(inlineBudgetValue.replace(/,/g, ""));
                            if (!Number.isNaN(num) && num >= 0) {
                              const isDaily = rowUsesDailyBudget(row);
                              onInlineBudgetBlur(aid, num, isDaily);
                            }
                          }}
                          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                          className="w-full min-w-[80px] px-2 py-1 text-[12px] border border-[#e8e8e3] rounded"
                          aria-label={`Budget for ${row.adset_name ?? aid}`}
                        />
                      ) : (
                        (row.daily_budget != null && String(row.daily_budget).trim() !== "" && parseFloat(String(row.daily_budget)) > 0
                          ? formatCurrency2Decimals(parseFloat(String(row.daily_budget)))
                          : row.lifetime_budget != null && String(row.lifetime_budget).trim() !== "" && parseFloat(String(row.lifetime_budget)) > 0
                            ? formatCurrency2Decimals(parseFloat(String(row.lifetime_budget)))
                            : "—")
                      )}
                    </td>
                    <td className="table-cell min-w-[80px] table-text leading-[1.26]">
                      {row.bid_amount != null && String(row.bid_amount).trim() !== ""
                        ? String(row.bid_amount)
                        : "—"}
                    </td>
                    <td className="table-cell min-w-[100px] table-text leading-[1.26]">
                      {formatDate(row.start_time)}
                    </td>
                    <td className="table-cell min-w-[100px] table-text leading-[1.26]">
                      {formatDate(row.end_time)}
                    </td>
                    <td className="table-cell min-w-[90px] table-text leading-[1.26]">
                      {row.impressions != null ? Number(row.impressions).toLocaleString() : "—"}
                    </td>
                    <td className="table-cell min-w-[90px] table-text leading-[1.26]">
                      {row.clicks != null ? Number(row.clicks).toLocaleString() : "—"}
                    </td>
                    <td className="table-cell min-w-[90px] table-text leading-[1.26]">
                      {row.spends != null ? formatCurrency2Decimals(row.spends) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-[#556179]">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1 text-sm border border-[#e8e8e3] rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 text-sm border border-[#e8e8e3] rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
