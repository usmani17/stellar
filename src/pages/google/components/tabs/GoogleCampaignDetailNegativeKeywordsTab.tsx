import React, { useState } from "react";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { Dropdown } from "../../../../components/ui/Dropdown";
import { Banner } from "../../../../components/ui/Banner";
import { Button } from "../../../../components/ui";
import { FilterPanel, type FilterValues } from "../../../../components/filters/FilterPanel";
import type { GoogleNegativeKeyword } from "./types";

interface GoogleCampaignDetailNegativeKeywordsTabProps {
  negativeKeywords: GoogleNegativeKeyword[];
  loading: boolean;
  selectedNegativeKeywordIds: Set<number>;
  onSelectAll: (checked: boolean) => void;
  onSelectNegativeKeyword: (id: number, checked: boolean) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (column: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isFilterPanelOpen: boolean;
  onToggleFilterPanel: () => void;
  filters: FilterValues;
  onApplyFilters: (filters: FilterValues) => void;
  syncing: boolean;
  onSync: () => void;
  syncMessage: string | null;
  getSortIcon: (column: string, currentSortBy: string, currentSortOrder: "asc" | "desc") => React.ReactNode;
  onCreateClick?: () => void;
}

export const GoogleCampaignDetailNegativeKeywordsTab: React.FC<GoogleCampaignDetailNegativeKeywordsTabProps> = ({
  negativeKeywords,
  loading,
  selectedNegativeKeywordIds,
  onSelectAll,
  onSelectNegativeKeyword,
  sortBy,
  sortOrder,
  onSort,
  currentPage,
  totalPages,
  onPageChange,
  isFilterPanelOpen,
  onToggleFilterPanel,
  filters,
  onApplyFilters,
  syncing,
  onSync,
  syncMessage,
  getSortIcon,
  onCreateClick,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(selectedNegativeKeywordIds);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectAll(e.target.checked);
    if (e.target.checked) {
      setSelectedIds(new Set(negativeKeywords.map((nk) => nk.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectKeyword = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectNegativeKeyword(id, e.target.checked);
    const newSet = new Set(selectedIds);
    if (e.target.checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const getLevelBadgeColor = (level: string) => {
    if (level === "CAMPAIGN") return "bg-blue-100 text-blue-800";
    if (level === "ADGROUP") return "bg-purple-100 text-purple-800";
    return "bg-gray-100 text-gray-800";
  };

  const getMatchTypeBadgeColor = (matchType: string) => {
    if (matchType === "BROAD") return "bg-orange-100 text-orange-800";
    if (matchType === "PHRASE") return "bg-green-100 text-green-800";
    if (matchType === "EXACT") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-4 p-4">
      {syncMessage && (
        <Banner
          type={syncing ? "info" : "success"}
          message={syncMessage}
          onClose={() => {}}
        />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={onSync}
            disabled={syncing || loading}
            variant="secondary"
          >
            {syncing ? "Syncing..." : "Sync Negative Keywords"}
          </Button>
          {onCreateClick && (
            <Button
              onClick={onCreateClick}
              variant="primary"
            >
              Create Negative Keyword
            </Button>
          )}
        </div>
        <Button
          onClick={onToggleFilterPanel}
          variant="secondary"
        >
          {isFilterPanelOpen ? "Hide Filters" : "Show Filters"}
        </Button>
      </div>

      {isFilterPanelOpen && (
        <FilterPanel
          onApplyFilters={onApplyFilters}
          currentFilters={filters}
          filterOptions={[
            { label: "Keyword Text", value: "name", operators: ["contains", "not_contains", "equals"] },
            { label: "Match Type", value: "type", operators: ["equals"] },
            { label: "Level", value: "level", operators: ["equals"] },
            { label: "Status", value: "status", operators: ["equals"] },
          ]}
        />
      )}

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="w-12 px-4 py-2 text-left">
                <Checkbox
                  checked={selectedIds.size === negativeKeywords.length && negativeKeywords.length > 0}
                  onChange={handleSelectAll}
                  indeterminate={selectedIds.size > 0 && selectedIds.size < negativeKeywords.length}
                />
              </th>
              <th
                className="px-4 py-2 text-left font-semibold cursor-pointer hover:bg-gray-100"
                onClick={() => onSort("keyword_text")}
              >
                <div className="flex items-center gap-2">
                  Keyword Text
                  {getSortIcon("keyword_text", sortBy, sortOrder)}
                </div>
              </th>
              <th
                className="px-4 py-2 text-left font-semibold cursor-pointer hover:bg-gray-100"
                onClick={() => onSort("match_type")}
              >
                <div className="flex items-center gap-2">
                  Match Type
                  {getSortIcon("match_type", sortBy, sortOrder)}
                </div>
              </th>
              <th
                className="px-4 py-2 text-left font-semibold cursor-pointer hover:bg-gray-100"
                onClick={() => onSort("level")}
              >
                <div className="flex items-center gap-2">
                  Level
                  {getSortIcon("level", sortBy, sortOrder)}
                </div>
              </th>
              <th
                className="px-4 py-2 text-left font-semibold cursor-pointer hover:bg-gray-100"
                onClick={() => onSort("adgroup_name")}
              >
                <div className="flex items-center gap-2">
                  Ad Group
                  {getSortIcon("adgroup_name", sortBy, sortOrder)}
                </div>
              </th>
              <th className="px-4 py-2 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Loading negative keywords...
                </td>
              </tr>
            ) : negativeKeywords.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No negative keywords found
                </td>
              </tr>
            ) : (
              negativeKeywords.map((nk) => (
                <tr key={nk.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Checkbox
                      checked={selectedIds.has(nk.id)}
                      onChange={(e) => handleSelectKeyword(nk.id, e)}
                    />
                  </td>
                  <td className="px-4 py-2 font-medium">{nk.keyword_text}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getMatchTypeBadgeColor(nk.match_type || "BROAD")}`}>
                      {nk.match_type || "BROAD"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getLevelBadgeColor(nk.level || "CAMPAIGN")}`}>
                      {nk.level || "CAMPAIGN"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {nk.level === "ADGROUP" ? nk.adgroup_name || "-" : "-"}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={nk.status || "ENABLED"} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            variant="secondary"
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            variant="secondary"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
