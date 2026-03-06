import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import { useSidebar } from "../contexts/SidebarContext";
import { useStrategiesPaginated } from "../hooks/queries/useStrategies";
import { useDuplicateStrategy } from "../hooks/mutations/useStrategyMutations";
import { useDebouncedSearch } from "../hooks/useDebouncedSearch";
import { Sidebar } from "../components/layout/Sidebar";
import { AccountsHeader } from "../components/layout/AccountsHeader";
import { Banner, Button } from "../components/ui";
import type { Strategy } from "../services/strategies";

const PAGE_SIZE = 10;

export const Strategies: React.FC = () => {
  const [searchQuery, setSearchQuery, debouncedSearchQuery] = useDebouncedSearch("", 400);
  const [currentPage, setCurrentPage] = useState(1);
  const {
    strategies,
    totalPages,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useStrategiesPaginated(currentPage, PAGE_SIZE, debouncedSearchQuery);
  const duplicateMutation = useDuplicateStrategy();
  const { sidebarWidth } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCreatedSuccess, setShowCreatedSuccess] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  const handleDuplicate = async (e: React.MouseEvent, strategy: Strategy) => {
    e.preventDefault();
    e.stopPropagation();
    setDuplicateError(null);
    setDuplicatingId(strategy.id);
    try {
      const created = await duplicateMutation.mutateAsync(strategy.id);
      navigate(`/strategies/${created.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string; name?: string[] } }; message?: string })
          ?.response?.data?.detail ??
        (err as { response?: { data?: { name?: string[] } } })?.response?.data?.name?.[0] ??
        (err as Error)?.message ??
        "Failed to duplicate strategy.";
      setDuplicateError(msg);
    } finally {
      setDuplicatingId(null);
    }
  };

  useEffect(() => {
    setPageTitle("Strategies");
    return () => {
      resetPageTitle();
    };
  }, []);

  // Show success banner and refetch list when redirected here after creating a strategy
  useEffect(() => {
    const state = location.state as { strategyCreated?: boolean } | null;
    if (state?.strategyCreated) {
      setShowCreatedSuccess(true);
      refetch();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate, refetch]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />

      <div
        className="flex-1 w-full"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <AccountsHeader />

        <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white">
          <div className="space-y-6">
            {showCreatedSuccess && (
              <Banner
                type="success"
                message="Strategy created successfully."
                dismissable
                onDismiss={() => setShowCreatedSuccess(false)}
              />
            )}
            {duplicateError && (
              <Banner
                type="error"
                message={duplicateError}
                dismissable
                onDismiss={() => setDuplicateError(null)}
              />
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-[22px] sm:text-[24px] font-medium text-[#072929] leading-[normal]">
                Strategies
              </h1>
              <div className="flex items-center gap-2">
                <div className="search-input-container h-[40px] w-full md:w-[272px] flex items-center gap-2 px-[10px]">
                  <svg
                    className="w-3 h-3 text-[#556179]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search strategies..."
                    className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#556179] placeholder:text-[#556179]"
                  />
                </div>
                <button
                  className="create-entity-button"
                  type="button"
                  onClick={() => navigate("/strategies/new")}
                >
                  Create strategy
                </button>
              </div>
            </div>

            <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-x-auto overflow-y-visible relative">
              {isFetching && !isLoading && (
                <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-[12px]" />
              )}
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header">Name</th>
                      <th className="table-header">Goal</th>
                      <th className="table-header">Status</th>
                      <th className="table-header">Platform</th>
                      <th className="table-header">Channels</th>
                      <th className="table-header">Last run</th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isError ? (
                      <tr>
                        <td colSpan={7} className="table-cell text-center py-12">
                          <p className="text-[14px] text-red-600 mb-2">
                            Failed to load strategies.
                          </p>
                          <p className="text-[13px] text-[#556179]">
                            {error?.message || (error as Error)?.toString?.()}
                          </p>
                        </td>
                      </tr>
                    ) : isLoading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <tr key={`skeleton-${index}`} className="table-row">
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-32" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-24" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-20" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-20" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-16" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-28" />
                          </td>
                          <td className="table-cell">
                            <div className="h-9 bg-gray-200 rounded animate-pulse w-24" />
                          </td>
                        </tr>
                      ))
                    ) : strategies.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="table-cell text-center py-12"
                        >
                          <p className="text-[14px] text-[#556179] mb-4">
                            {debouncedSearchQuery
                              ? "No strategies found"
                              : "No strategies yet"}
                          </p>
                          {!debouncedSearchQuery && (
                            <Button
                              className="rounded-lg bg-forest-f60 hover:bg-forest-f40 text-white"
                              onClick={() => navigate("/strategies/new")}
                            >
                              Create your first strategy
                            </Button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      strategies.map((strategy: Strategy) => (
                        <tr
                          key={strategy.id}
                          className="table-row group cursor-pointer hover:bg-[#f3f4f6]"
                          onClick={() => navigate(`/strategies/${strategy.id}`)}
                        >
                          <td className="table-cell">
                            <span className="text-[14px] font-medium text-[#313850]">
                              {strategy.name || "—"}
                            </span>
                          </td>
                          <td className="table-cell text-[14px] text-[#556179]">
                            {strategy.goal || "—"}
                          </td>
                          <td className="table-cell">
                            <span className="text-[14px] text-[#556179]">
                              {strategy.status || "—"}
                            </span>
                          </td>
                          <td className="table-cell text-[14px] text-[#556179]">
                            {strategy.platform || "—"}
                          </td>
                          <td className="table-cell text-[14px] text-[#556179]">
                            {strategy.channel_ids?.length ?? 0}
                          </td>
                          <td className="table-cell text-[14px] text-[#556179]">
                            {formatDate(strategy.last_run)}
                          </td>
                          <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                to={`/strategies/${strategy.id}/run-history`}
                                className="text-[13px] text-[#136D6D] hover:underline"
                              >
                                View
                              </Link>
                              <span className="text-[#e8e8e3]">|</span>
                              <Link
                                to={`/strategies/${strategy.id}`}
                                className="text-[13px] text-[#136D6D] hover:underline"
                              >
                                Edit
                              </Link>
                              <span className="text-[#e8e8e3]">|</span>
                              <button
                                type="button"
                                className="text-[13px] text-[#136D6D] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={(e) => handleDuplicate(e, strategy)}
                                disabled={duplicatingId !== null}
                              >
                                {duplicatingId === strategy.id ? "Duplicating…" : "Duplicate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-end mt-4">
                <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
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
                      setCurrentPage((prev) =>
                        Math.min(totalPages, prev + 1)
                      )
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
    </div>
  );
};
