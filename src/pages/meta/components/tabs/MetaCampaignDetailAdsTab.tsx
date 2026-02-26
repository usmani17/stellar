import React from "react";
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
  } = props;
  const allSelected = ads.length > 0 && ads.every((a) => selectedIds.has(a.ad_id ?? a.id));
  const someSelected = selectedIds.size > 0;

  return (
    <div className="relative">
      <div className="overflow-x-auto w-full">
        <table className="min-w-[1000px] w-full">
          <thead>
            <tr className="border-b border-[#e8e8e3]">
              <th className="table-header sticky left-0 z-[1] bg-[#f5f5f0] border-r border-[#e8e8e3] w-[35px] min-w-[35px]">
                <Checkbox checked={allSelected} indeterminate={someSelected && !allSelected} onCheckedChange={onSelectAll} />
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
                      <Checkbox checked={isSelected} onCheckedChange={(checked) => onSelectOne(id, !!checked)} />
                    </td>
                    <td className="table-cell table-sticky-first-column min-w-[200px] max-w-[400px] group-hover:bg-[#f9f9f6] table-text leading-[1.26]">
                      {row.ad_name ?? "—"}
                    </td>
                    <td className="table-cell min-w-[120px] table-text leading-[1.26]">{row.adset_name ?? "—"}</td>
                    <td className="table-cell min-w-[100px] table-text leading-[1.26]">
                      {normalizeStatusDisplay(row.status)}
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
