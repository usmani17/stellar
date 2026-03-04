import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { ChevronDown, Trash2 } from "lucide-react";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
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
import { CreateCustomAudiencePanel } from "../../components/meta/CreateCustomAudiencePanel";
import { CreateLookalikeAudiencePanel } from "../../components/meta/CreateLookalikeAudiencePanel";
import type { MetaAudienceRow } from "../../types/meta";

export const MetaAudiences: React.FC = () => {
  const { accountId, channelId } = useParams<{ accountId: string; channelId: string }>();
  const { sidebarWidth } = useSidebar();

  const [audiences, setAudiences] = useState<MetaAudienceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedAudiences, setSelectedAudiences] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterValues>([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [showCustomAudiencePanel, setShowCustomAudiencePanel] = useState(false);
  const [showLookalikeAudiencePanel, setShowLookalikeAudiencePanel] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [lastUsedCursor, setLastUsedCursor] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const createDropdownRef = useRef<HTMLDivElement>(null);

  const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;

  const loadAudiences = useCallback(async () => {
    if (!channelIdNum) return;
    setLoading(true);
    setDeleteError(null);
    const cursorToUse =
      currentPage > 1 ? (lastUsedCursor ?? nextCursor) : undefined;
    try {
      const data = await accountsService.getMetaAudiences(channelIdNum, {
        page: currentPage,
        page_size: itemsPerPage,
        sort_by: sortBy,
        order: sortOrder,
        filters: filters.map((f) => ({ field: f.field, operator: f.operator, value: f.value })),
        ...(cursorToUse ? { after: cursorToUse } : {}),
      });
      setAudiences(data.audiences || []);
      setTotalPages(data.total_pages ?? 0);
      setTotal(data.total ?? 0);
      setNextCursor(data.next_cursor ?? null);
      if (currentPage > 1 && cursorToUse) setLastUsedCursor(cursorToUse);
      else if (currentPage === 1) setLastUsedCursor(null);
    } catch (e) {
      setAudiences([]);
      setTotalPages(0);
      setTotal(0);
      setNextCursor(null);
      setLastUsedCursor(null);
    } finally {
      setLoading(false);
    }
  }, [
    channelIdNum,
    currentPage,
    itemsPerPage,
    sortBy,
    sortOrder,
    filters,
    nextCursor,
    lastUsedCursor,
  ]);

  useEffect(() => {
    setPageTitle("Meta Audiences");
    return () => resetPageTitle();
  }, []);

  useEffect(() => {
    loadAudiences();
  }, [loadAudiences]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (createDropdownRef.current && !createDropdownRef.current.contains(e.target as Node)) {
        setShowCreateDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
    setCurrentPage(1);
    setNextCursor(null);
    setLastUsedCursor(null);
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

  const allSelected = audiences.length > 0 && selectedAudiences.size === audiences.length;
  const someSelected = selectedAudiences.size > 0 && selectedAudiences.size < audiences.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedAudiences(new Set());
    } else {
      setSelectedAudiences(new Set(audiences.map((a) => String(a.audience_id ?? a.id))));
    }
  };

  const handleSelectAudience = (audienceId: string) => {
    setSelectedAudiences((prev) => {
      const next = new Set(prev);
      if (next.has(audienceId)) next.delete(audienceId);
      else next.add(audienceId);
      return next;
    });
  };

  const handleDeleteAudience = useCallback(
    async (audienceId: string) => {
      if (!channelIdNum || !window.confirm("Delete this audience? This cannot be undone.")) return;
      setDeletingId(audienceId);
      setDeleteError(null);
      try {
        await accountsService.deleteMetaAudience(channelIdNum, audienceId);
        await loadAudiences();
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } }; message?: string };
        const message =
          err?.response?.data?.error ?? err?.message ?? "Failed to delete audience";
        setDeleteError(message);
      } finally {
        setDeletingId(null);
      }
    },
    [channelIdNum, loadAudiences]
  );

  const openCustomPanel = () => {
    setShowCreateDropdown(false);
    setShowCustomAudiencePanel(true);
    setIsFilterPanelOpen(false);
  };

  const openLookalikePanel = () => {
    setShowCreateDropdown(false);
    setShowLookalikeAudiencePanel(true);
    setIsFilterPanelOpen(false);
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
                  Audiences
                </h1>
                <div className="flex items-center gap-2">
                  <div className="relative inline-flex justify-end" ref={createDropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateDropdown((prev) => !prev);
                        setIsFilterPanelOpen(false);
                      }}
                      className="create-entity-button btn-sm flex items-center gap-1"
                    >
                      <span className="text-[10.64px] text-white font-normal">Create</span>
                      <ChevronDown
                        className={`w-5 h-5 text-white transition-transform ${showCreateDropdown ? "rotate-180" : ""}`}
                      />
                    </button>
                    {showCreateDropdown && (
                      <div className="absolute top-[42px] left-0 w-56 bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                        <div className="overflow-y-auto">
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={openCustomPanel}
                          >
                            Custom Audiences
                          </button>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={openLookalikePanel}
                          >
                            Lookalike Audiences
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setIsFilterPanelOpen(!isFilterPanelOpen);
                      setShowCreateDropdown(false);
                    }}
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

              {showCustomAudiencePanel && channelIdNum !== undefined && (
                <CreateCustomAudiencePanel
                  channelId={channelIdNum}
                  accountId={accountId}
                  onSuccess={loadAudiences}
                  onClose={() => setShowCustomAudiencePanel(false)}
                />
              )}
              {showLookalikeAudiencePanel && channelIdNum !== undefined && (
                <CreateLookalikeAudiencePanel
                  channelId={channelIdNum}
                  accountId={accountId}
                  onSuccess={loadAudiences}
                  onClose={() => setShowLookalikeAudiencePanel(false)}
                />
              )}

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
                  entityType="audiences"
                />
              )}

              {deleteError && (
                <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-[10.64px] text-red-700">
                  {deleteError}
                </div>
              )}

              <div className="relative">
                <div
                  className="table-container"
                  style={{ position: "relative", minHeight: loading ? "400px" : "auto" }}
                >
                  <div className="overflow-x-auto w-full">
                    <table className="min-w-[1200px] w-full">
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
                            onClick={() => handleSort("name")}
                          >
                            <div className="flex items-center gap-1">
                              Audience Name
                              {getSortIcon("name")}
                            </div>
                          </th>
                          <th
                            className="table-header py-3 px-4 min-w-[100px] cursor-pointer hover:bg-[#f5f5f0]"
                            onClick={() => handleSort("type")}
                          >
                            <div className="flex items-center gap-1">
                              Type
                              {getSortIcon("type")}
                            </div>
                          </th>
                          <th
                            className="table-header py-3 px-4 min-w-[120px] cursor-pointer hover:bg-[#f5f5f0]"
                            onClick={() => handleSort("subtype")}
                          >
                            <div className="flex items-center gap-1">
                              Subtype
                              {getSortIcon("subtype")}
                            </div>
                          </th>
                          <th className="table-header py-3 px-4 min-w-[200px]">
                            Description
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
                          <th
                            className="table-header py-3 px-4 min-w-[120px] cursor-pointer hover:bg-[#f5f5f0]"
                            onClick={() => handleSort("created_time")}
                          >
                            <div className="flex items-center gap-1">
                              Created
                              {getSortIcon("created_time")}
                            </div>
                          </th>
                          <th className="table-header py-3 px-4 min-w-[80px]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {audiences.map((row) => {
                          const aid = String(row.audience_id ?? row.id);
                          return (
                            <tr
                              key={row.audience_id ?? row.id}
                              className="table-row border-b border-[#e8e8e3] last:border-b-0 group"
                            >
                              <td className="table-cell sticky left-0 z-[120] bg-[#f5f5f0] group-hover:bg-gray-100 border-r border-[#e8e8e3] py-3 px-4 w-[35px]">
                                <Checkbox
                                  checked={selectedAudiences.has(aid)}
                                  onChange={() => handleSelectAudience(aid)}
                                  aria-label={`Select ${row.name || aid}`}
                                />
                              </td>
                              <td className="table-cell table-sticky-first-column min-w-[300px] max-w-[400px] group-hover:bg-[#f9f9f6] py-3 px-4">
                                <span className="table-text leading-[1.26] text-[#072929]">
                                  {row.name || "—"}
                                </span>
                              </td>
                              <td className="table-cell py-3 px-4">
                                <span className="table-text leading-[1.26] text-[#556179]">
                                  {row.type ?? "—"}
                                </span>
                              </td>
                              <td className="table-cell py-3 px-4">
                                <span className="table-text leading-[1.26] text-[#556179]">
                                  {row.subtype ?? "—"}
                                </span>
                              </td>
                              <td className="table-cell py-3 px-4">
                                <span className="table-text leading-[1.26] text-[#556179] truncate block max-w-[200px]">
                                  {row.description ?? "—"}
                                </span>
                              </td>
                              <td className="table-cell py-3 px-4">
                                <span className="table-text leading-[1.26] text-[#556179]">
                                  {row.status ?? "—"}
                                </span>
                              </td>
                              <td className="table-cell py-3 px-4">
                                <span className="table-text leading-[1.26] text-[#556179]">
                                  {row.created_time ?? "—"}
                                </span>
                              </td>
                              <td className="table-cell py-3 px-4">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAudience(aid)}
                                  disabled={deletingId === aid}
                                  className="p-1.5 rounded hover:bg-red-50 text-[#556179] hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete audience"
                                  aria-label={`Delete ${row.name || aid}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
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
                        <Loader size="md" message="Loading audiences..." />
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
