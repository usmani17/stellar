import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { AccountsHeader } from "../components/layout/AccountsHeader";
import { Loader } from "../components/ui";
import { ChevronLeft } from "lucide-react";
import {
  strategiesService,
  type AutomationRunHistoryItem,
} from "../services/strategies";

export const StrategyRunHistory: React.FC = () => {
  const { strategyId } = useParams<{ strategyId: string }>();
  const id = strategyId ? parseInt(strategyId, 10) : undefined;
  const { sidebarWidth } = useSidebar();
  const [runs, setRuns] = useState<AutomationRunHistoryItem[]>([]);
  const [strategyName, setStrategyName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (id == null || Number.isNaN(id)) {
      setLoading(false);
      setError("Invalid strategy ID");
      return;
    }
    setLoading(true);
    setError(null);
    strategiesService
      .getStrategy(id)
      .then((strategy) => setStrategyName(strategy.name || "Strategy"))
      .catch(() => setStrategyName(""));
    strategiesService
      .getStrategyRuns(id, { page, page_size: pageSize })
      .then((data) => {
        setRuns(data.results);
        setTotalCount(data.count);
        setTotalPages(data.total_pages);
      })
      .catch(() => {
        setError("Failed to load run history.");
        setRuns([]);
        setTotalCount(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, [id, page]);

  useEffect(() => {
    const title = strategyName ? `Run history – ${strategyName}` : "Run history";
    setPageTitle(title);
    return () => resetPageTitle();
  }, [strategyName]);

  if (id == null || Number.isNaN(id)) {
    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar />
        <div
          className="flex-1 w-full"
          style={{ marginLeft: `${sidebarWidth}px` }}
        >
          <AccountsHeader />
          <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white">
            <p className="text-[14px] text-red-r30">Invalid strategy ID.</p>
            <Link
              to="/strategies"
              className="inline-flex items-center gap-1 text-[14px] text-forest-f40 hover:underline mt-2"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Strategies
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Link
                to={`/strategies/${id}`}
                className="inline-flex items-center gap-1 text-[14px] text-forest-f40 hover:underline"
              >
                <ChevronLeft className="w-4 h-4" /> Back to strategy
              </Link>
              <h1 className="text-[22px] sm:text-[24px] font-medium text-forest-f60">
                Run history{strategyName ? ` – ${strategyName}` : ""}
              </h1>
            </div>

            {error && (
              <p className="text-[14px] text-red-r30">{error}</p>
            )}

            <div className="bg-sandstorm-s5 border border-sandstorm-s40 rounded-[12px] overflow-x-auto overflow-y-visible relative">
              {loading && (
                <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-[12px]">
                  <Loader />
                </div>
              )}
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header">Automation Name</th>
                      <th className="table-header">Last Ran At</th>
                      <th className="table-header">Number of changes</th>
                      <th className="table-header">Amount Changed</th>
                      <th className="table-header">% Changed</th>
                      <th className="table-header">Execution Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <tr key={`skeleton-${index}`} className="table-row">
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-32" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-28" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-16" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-20" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-16" />
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-20" />
                          </td>
                        </tr>
                      ))
                    ) : runs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="table-cell text-center py-12"
                        >
                          <p className="text-[14px] text-forest-f30">
                            No runs yet for this strategy.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      runs.map((run) => {
                        const lastRanAt = run.execution_run_at
                          ? new Date(run.execution_run_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—";
                        const amount =
                          typeof run.total_change_amount === "number"
                            ? run.total_change_amount
                            : parseFloat(String(run.total_change_amount ?? 0));
                        const amountStr =
                          Number.isNaN(amount) || amount === 0
                            ? "—"
                            : amount > 0
                              ? `+$${amount.toFixed(2)}`
                              : `-$${Math.abs(amount).toFixed(2)}`;
                        const pct =
                          typeof run.total_change_amount_percentage === "number"
                            ? run.total_change_amount_percentage
                            : parseFloat(String(run.total_change_amount_percentage ?? ""));
                        const pctStr =
                          Number.isNaN(pct) ? "—" : `${pct.toFixed(2)}%`;
                        const timeMs = run.execution_time_ms;
                        const timeStr =
                          timeMs != null ? `${timeMs} ms` : "—";
                        return (
                          <tr
                            key={run.id}
                            className="table-row hover:bg-[#f3f4f6]"
                          >
                            <td className="table-cell text-[14px] text-forest-f60">
                              {run.automation_name ?? "—"}
                            </td>
                            <td className="table-cell text-[14px] text-forest-f30">
                              {lastRanAt}
                            </td>
                            <td className="table-cell text-[14px] text-forest-f30">
                              {run.number_of_changes ?? "—"}
                            </td>
                            <td className="table-cell text-[14px] text-forest-f30 font-medium">
                              {amountStr}
                            </td>
                            <td className="table-cell text-[14px] text-forest-f30">
                              {pctStr}
                            </td>
                            <td className="table-cell text-[14px] text-forest-f30">
                              {timeStr}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {totalCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <p className="text-[14px] text-forest-f30">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount} run
                  {totalCount !== 1 ? "s" : ""}
                  <span className="ml-2 text-forest-f40">
                    · Page {page} of {totalPages}
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                    className="px-3 py-1.5 text-[14px] font-medium text-forest-f60 bg-white border border-sandstorm-s40 rounded-lg hover:bg-sandstorm-s5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                    className="px-3 py-1.5 text-[14px] font-medium text-forest-f60 bg-white border border-sandstorm-s40 rounded-lg hover:bg-sandstorm-s5 disabled:opacity-50 disabled:cursor-not-allowed"
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
