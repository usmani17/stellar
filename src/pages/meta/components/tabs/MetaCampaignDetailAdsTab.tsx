import React, { useState } from "react";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { Loader } from "../../../../components/ui/Loader";
import { formatCurrency2Decimals, getSortIcon } from "../../../google/utils/campaignDetailHelpers";
import { normalizeStatusDisplay } from "../../../../utils/statusHelpers";
import type { MetaAdRow } from "../../../hooks/useMetaCampaignDetailAds";

interface MetaCampaignDetailAdsTabProps {
  ads: MetaAdRow[];
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
  onInlineStatusChange?: (adId: string, status: string) => void;
  onInlineNameBlur?: (adId: string, newName: string, row: MetaAdRow) => void;
  onBulkStatus?: (ids: (string | number)[], status: string) => void;
}

export const MetaCampaignDetailAdsTab: React.FC<MetaCampaignDetailAdsTabProps> = (props) => {
  const {
    ads,
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
    onInlineStatusChange,
    onInlineNameBlur,
    onBulkStatus,
  } = props;
  const allSelected = ads.length > 0 && ads.every((a) => selectedIds.has(a.ad_id ?? a.id));
  const someSelected = selectedIds.size > 0;

  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState<string>("");

  const [showBulkActions, setShowBulkActions] = useState(false);

  const getStatusOption = (status: string | undefined): string => {
    const u = (status ?? "").toUpperCase();
    if (u === "ACTIVE" || u === "PAUSED" || u === "ARCHIVED" || u === "DELETED") return u;
    return "PAUSED";
  };

  const getRestrictedStatusOptions = (status: string | undefined): Array<{ value: string; label: string }> => {
    const current = (status ?? "").toUpperCase();
    if (current === "DELETED") {
      // Deleted ads: status cannot be changed; handled by disabling dropdown.
      return [
        { value: "DELETED", label: "Deleted" },
      ];
    }
    if (current === "ARCHIVED") {
      // Archived ads: can only move to DELETED.
      return [
        { value: "ARCHIVED", label: "Archived" },
        { value: "DELETED", label: "Deleted" },
      ];
    }
    return [
      { value: "ACTIVE", label: "Enabled" },
      { value: "PAUSED", label: "Paused" },
      { value: "ARCHIVED", label: "Archived" },
      { value: "DELETED", label: "Deleted" },
    ];
  };

  return (
    <div className="relative">
      {(createButton != null || createPanel != null || onBulkStatus != null) && (
        <>
          <div className="flex items-center justify-end gap-2 mb-4">
            {typeof onBulkStatus === "function" && (
              <div className="relative inline-flex">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedIds.size === 0) return;
                    setShowBulkActions((prev) => !prev);
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
                  <div className="absolute top-[42px] right-0 w-56 bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                    <div className="overflow-y-auto">
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
                    </div>
                  </div>
                )}
              </div>
            )}
            {createButton}
          </div>
          {createPanel}
        </>
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
                <button type="button" onClick={() => onSort("ad_name")} className="flex items-center gap-1">
                  Ad name
                  {getSortIcon("ad_name", sortBy, sortOrder)}
                </button>
              </th>
              <th className="table-header min-w-[120px]">Ad set</th>
              <th className="table-header min-w-[100px]">Status</th>
              <th className="table-header min-w-[90px]">Impressions</th>
              <th className="table-header min-w-[90px]">Clicks</th>
              <th className="table-header min-w-[90px]">Spends</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="table-cell py-8">
                  <div className="flex justify-center">
                    <Loader size="md" message="Loading ads..." />
                  </div>
                </td>
              </tr>
            ) : ads.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-cell py-8 text-center text-[#556179]">
                  No ads found for this campaign.
                </td>
              </tr>
            ) : (
              ads.map((row) => {
                const id = row.ad_id ?? row.id;
                const isSelected = selectedIds.has(id);
                return (
                  <tr key={String(id)} className="table-row group">
                    <td className="table-cell sticky left-0 z-[120] bg-[#f5f5f0] group-hover:bg-gray-100 border-r border-[#e8e8e3]">
                      <Checkbox
                        checked={isSelected}
                        onChange={(checked) => onSelectOne(id, checked)}
                      />
                    </td>
                    <td className="table-cell table-sticky-first-column min-w-[200px] max-w-[400px] group-hover:bg-[#f9f9f6] table-text leading-[1.26]">
                      {onInlineNameBlur ? (
                        <div className="flex items-center gap-1">
                          {editingAdId === String(id) ? (
                            <input
                              type="text"
                              value={editedName}
                              onChange={(e) => setEditedName(e.target.value)}
                              autoFocus
                              onBlur={(e) => {
                                const newName = e.target.value.trim();
                                const originalName = row.ad_name ?? "";
                                setEditingAdId(null);
                                setEditedName("");
                                if (!newName || newName === originalName) {
                                  return;
                                }
                                onInlineNameBlur(String(id), newName, row);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  (e.currentTarget as HTMLInputElement).blur();
                                } else if (e.key === "Escape") {
                                  setEditingAdId(null);
                                  setEditedName("");
                                }
                              }}
                              className="w-full px-2 py-1 text-[12px] text-[#0b0f16] border border-[#136d6d] rounded focus:outline-none focus:ring-2 focus:ring-[#136d6d] bg-white"
                            />
                          ) : (
                            <>
                              <span className="truncate" title={row.ad_name ?? undefined}>
                                {row.ad_name ?? "—"}
                              </span>
                              <button
                                type="button"
                                className="table-edit-icon opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingAdId(String(id));
                                  setEditedName(row.ad_name ?? "");
                                }}
                                aria-label="Edit ad name"
                              >
                                <svg
                                  className="w-4 h-4 text-[#556179]"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        row.ad_name ?? "—"
                      )}
                    </td>
                    <td className="table-cell min-w-[120px] table-text leading-[1.26]">{row.adset_name ?? "—"}</td>
                    <td className="table-cell min-w-[100px] table-text leading-[1.26]">
                      {onInlineStatusChange ? (
                        (() => {
                          const currentStatus = (row.status ?? "").toUpperCase();
                          const options = getRestrictedStatusOptions(row.status);
                          const isDeleted = currentStatus === "DELETED";
                          return (
                            <select
                              value={getStatusOption(row.status)}
                              onChange={(e) => onInlineStatusChange(String(id), e.target.value)}
                              disabled={isDeleted}
                              className="text-[12px] border border-[#e8e8e3] rounded px-2 py-1 bg-gray-50 min-w-[90px]"
                              aria-label={`Status for ${row.ad_name ?? id}`}
                            >
                              {options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          );
                        })()
                      ) : (
                        normalizeStatusDisplay(row.status)
                      )}
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
