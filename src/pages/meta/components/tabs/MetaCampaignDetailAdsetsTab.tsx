import React from "react";
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
}) => {
  const allSelected = adsets.length > 0 && adsets.every((a) => selectedIds.has(a.adset_id ?? a.id));
  const someSelected = selectedIds.size > 0;

  return (
    <div className="relative">
      {(createButton != null || createPanel != null) && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div />
            <div className="flex items-center gap-2">
              {createButton}
            </div>
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
                  onCheckedChange={onSelectAll}
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
                <td colSpan={9} className="table-cell py-8">
                  <div className="flex justify-center">
                    <Loader size="md" message="Loading ad sets..." />
                  </div>
                </td>
              </tr>
            ) : adsets.length === 0 ? (
              <tr>
                <td colSpan={9} className="table-cell py-8 text-center text-[#556179]">
                  No ad sets found for this campaign.
                </td>
              </tr>
            ) : (
              adsets.map((row) => {
                const id = row.adset_id ?? row.id;
                const isSelected = selectedIds.has(id);
                return (
                  <tr key={String(id)} className="table-row group">
                    <td className="table-cell sticky left-0 z-[120] bg-[#f5f5f0] group-hover:bg-gray-100 border-r border-[#e8e8e3]">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelectOne(id, !!checked)}
                      />
                    </td>
                    <td className="table-cell table-sticky-first-column min-w-[200px] max-w-[400px] group-hover:bg-[#f9f9f6] table-text leading-[1.26]">
                      {row.adset_name ?? "—"}
                    </td>
                    <td className="table-cell min-w-[100px] table-text leading-[1.26]">
                      {normalizeStatusDisplay(row.status)}
                    </td>
                    <td className="table-cell min-w-[100px] table-text leading-[1.26]">
                      {row.daily_budget != null && row.daily_budget !== ""
                        ? formatCurrency2Decimals(parseFloat(String(row.daily_budget)))
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
