import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import { useSidebar } from "../contexts/SidebarContext";
import { useStrategies } from "../hooks/queries/useStrategies";
import { Sidebar } from "../components/layout/Sidebar";
import { AccountsHeader } from "../components/layout/AccountsHeader";
import { Button } from "../components/ui";
import type { Strategy } from "../services/strategies";

export const Strategies: React.FC = () => {
  const { strategies, isLoading, isError, error } = useStrategies();
  const { sidebarWidth } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setPageTitle("Strategies");
    return () => {
      resetPageTitle();
    };
  }, []);

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

  const filteredStrategies = Array.isArray(strategies)
    ? strategies.filter((s) =>
        (s.name || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

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
                    ) : filteredStrategies.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="table-cell text-center py-12"
                        >
                          <p className="text-[14px] text-[#556179] mb-4">
                            {searchQuery
                              ? "No strategies found"
                              : "No strategies yet"}
                          </p>
                          {!searchQuery && (
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
                      filteredStrategies.map((strategy: Strategy) => (
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
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/strategies/${strategy.id}`}
                                className="text-[13px] text-[#136D6D] hover:underline"
                              >
                                View
                              </Link>
                              <span className="text-[#e8e8e3]">|</span>
                              <button
                                type="button"
                                className="text-[13px] text-[#136D6D] hover:underline"
                              >
                                Duplicate
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
          </div>
        </div>
      </div>
    </div>
  );
};
