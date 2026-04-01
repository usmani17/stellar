import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { useDateRange } from "../../contexts/DateRangeContext";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { accountsService } from "../../services/accounts";
import { Loader } from "../../components/ui/Loader";
import { Checkbox } from "../../components/ui/Checkbox";
import { Assistant } from "../../components/layout/Assistant";
import {
  DynamicFilterPanel,
  type FilterValues,
} from "../../components/filters/DynamicFilterPanel";

export interface MetaCreativeRow {
  id: number;
  creative_id: string | number;
  creative_name: string;
  campaign_id?: string | number;
  campaign_name?: string;
  ad_id?: string | number;
  ad_name?: string;
  status?: string;
  impressions?: number;
  clicks?: number;
  spends?: number;
  sales?: number;
  acos?: number;
  roas?: number;
}

export const MetaCreatives: React.FC = () => {
  const { accountId, channelId } = useParams<{ accountId: string; channelId: string }>();
  const { sidebarWidth } = useSidebar();
  const { startDateStr, endDateStr } = useDateRange();

  const [creatives, setCreatives] = useState<MetaCreativeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<string>("id");
  // Default: newest creatives first.
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedCreatives, setSelectedCreatives] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterValues>([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;

  const loadCreatives = useCallback(async () => {
    if (!channelIdNum) return;
    setLoading(true);
    try {
      const data = await accountsService.getMetaCreatives(channelIdNum, {
        page: currentPage,
        page_size: itemsPerPage,
        sort_by: sortBy,
        order: sortOrder,
        start_date: startDateStr,
        end_date: endDateStr,
        filters: filters.map((f) => ({ field: f.field, operator: f.operator, value: f.value })),
      });
      setCreatives(data.creatives || []);
      setTotalPages(data.total_pages || 0);
      setTotal(data.total || 0);
    } catch (e) {
      setCreatives([]);
      setTotalPages(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [channelIdNum, currentPage, itemsPerPage, sortBy, sortOrder, startDateStr, endDateStr, filters]);

  useEffect(() => {
    setPageTitle("Meta Creatives");
    return () => resetPageTitle();
  }, []);

  useEffect(() => {
    loadCreatives();
  }, [loadCreatives]);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      // Default sort for a new column: newest-first.
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return (
        <svg
          className="w-4 h-4 ml-1 text-gray-400 inline-block"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
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
        className="w-4 h-4 ml-1 text-[#556179] inline-block"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 ml-1 text-[#556179] inline-block"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const allSelected = creatives.length > 0 && selectedCreatives.size === creatives.length;
  const someSelected = selectedCreatives.size > 0 && selectedCreatives.size < creatives.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedCreatives(new Set());
    } else {
      setSelectedCreatives(new Set(creatives.map((c) => String(c.creative_id ?? c.id))));
    }
  };

  const handleSelectCreative = (creativeId: string) => {
    setSelectedCreatives((prev) => {
      const next = new Set(prev);
      if (next.has(creativeId)) next.delete(creativeId);
      else next.add(creativeId);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <div
        className="flex-1 min-w-0 w-full h-screen flex flex-col"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <DashboardHeader />
        <Assistant>
          <div className="px-4 pt-[104px] pb-6 sm:px-6 lg:px-8 lg:pt-[112px] lg:pb-8 bg-white overflow-x-hidden min-w-0">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-[20px] sm:text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                  Creatives
                </h1>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                    className="edit-button"
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
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    </svg>
                    <span className="text-[10.64px] text-[#072929] font-normal">Add Filter</span>
                    <svg
                      className={`w-5 h-5 text-[#E3E3E3] transition-transform ${isFilterPanelOpen ? "rotate-180" : ""}`}
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
                  </button>
                </div>
              </div>

              {isFilterPanelOpen && accountId && (
                <DynamicFilterPanel
                  isOpen={true}
                  onClose={() => setIsFilterPanelOpen(false)}
                  onApply={(newFilters) => {
                    setFilters(newFilters);
                    setCurrentPage(1);
                  }}
                  initialFilters={filters}
                  accountId={accountId}
                  marketplace="meta"
                  entityType="creatives"
                />
              )}

              <div className="relative">
                <div
                  className="table-container"
                  style={{ position: "relative", minHeight: loading ? "400px" : "auto" }}
                >
                  <div className="overflow-x-auto w-full">
                    <table className="min-w-[500px] w-full">
                      <thead>
                        <tr className="border-b border-[#e8e8e3]">
                          <th
                            className="table-header w-[35px] sticky left-0 z-[120] bg-[#f5f5f0] border-r border-[#e8e8e3] py-3 px-4"
                            style={{ minWidth: "35px" }}
                          >
                            <Checkbox
                              checked={allSelected}
                              indeterminate={someSelected}
                              onChange={handleSelectAll}
                              aria-label="Select all"
                            />
                          </th>
                          <th
                            className="table-header table-sticky-first-column py-3 px-4 min-w-[300px] max-w-[400px] cursor-pointer hover:bg-[#f5f5f0]"
                            onClick={() => handleSort("creative_name")}
                          >
                            <div className="flex items-center gap-1">
                              Creative Name
                              {getSortIcon("creative_name")}
                            </div>
                          </th>
                          <th
                            className="table-header py-3 px-4 min-w-[115px] cursor-pointer hover:bg-[#f5f5f0]"
                            onClick={() => handleSort("status")}
                          >
                            <div className="flex items-center gap-1">
                              State
                              {getSortIcon("status")}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {creatives.map((row) => {
                          const cid = String(row.creative_id ?? row.id);
                          return (
                            <tr
                              key={row.id ?? row.creative_id}
                              className="table-row border-b border-[#e8e8e3] last:border-b-0 group"
                            >
                              <td className="table-cell sticky left-0 z-[120] bg-[#f5f5f0] group-hover:bg-gray-100 border-r border-[#e8e8e3] py-3 px-4 w-[35px]">
                                <Checkbox
                                  checked={selectedCreatives.has(cid)}
                                  onChange={() => handleSelectCreative(cid)}
                                  aria-label={`Select ${row.creative_name || cid}`}
                                />
                              </td>
                              <td className="table-cell table-sticky-first-column min-w-[300px] max-w-[400px] group-hover:bg-[#f9f9f6] py-3 px-4">
                                <span className="table-text leading-[1.26] text-[#072929]">
                                  {row.creative_name || "—"}
                                </span>
                              </td>
                              <td className="table-cell py-3 px-4">
                                <span className="table-text leading-[1.26] text-[#556179]">
                                  {row.status ?? "—"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {loading && (
                    <div className="loading-overlay">
                      <div className="loading-overlay-content">
                        <Loader size="md" message="Loading creatives..." />
                      </div>
                    </div>
                  )}
                </div>

                {(totalPages > 1 || total > 0) && (
                  <div className="flex items-center justify-end mt-4">
                    <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                      >
                        Previous
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        pageNum = Math.max(1, Math.min(pageNum, totalPages));
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${
                              currentPage === pageNum
                                ? "bg-white text-[#136D6D] font-semibold"
                                : "text-black hover:bg-gray-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                          ...
                        </span>
                      )}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${
                            currentPage === totalPages
                              ? "bg-white text-[#136D6D] font-semibold"
                              : "text-black hover:bg-gray-50"
                          }`}
                        >
                          {totalPages}
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Assistant>
      </div>
    </div>
  );
};
