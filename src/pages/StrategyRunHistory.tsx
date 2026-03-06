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
  type StrategyRunHistoryItem,
} from "../services/strategies";

export const StrategyRunHistory: React.FC = () => {
  const { strategyId } = useParams<{ strategyId: string }>();
  const id = strategyId ? parseInt(strategyId, 10) : undefined;
  const { sidebarWidth } = useSidebar();
  const [runs, setRuns] = useState<StrategyRunHistoryItem[]>([]);
  const [strategyName, setStrategyName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id == null || Number.isNaN(id)) {
      setLoading(false);
      setError("Invalid strategy ID");
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      strategiesService.getStrategy(id),
      strategiesService.getStrategyRuns(id),
    ])
      .then(([strategy, runList]) => {
        setStrategyName(strategy.name || "Strategy");
        setRuns(runList);
      })
      .catch(() => {
        setError("Failed to load run history.");
        setRuns([]);
      })
      .finally(() => setLoading(false));
  }, [id]);

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
                      <th className="table-header">Run date</th>
                      <th className="table-header">Status</th>
                      <th className="table-header">Triggered by</th>
                      <th className="table-header">Automations</th>
                      <th className="table-header">Entities updated</th>
                      <th className="table-header">Total delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <tr key={`skeleton-${index}`} className="table-row">
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-28" />
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
                        const ranAt = run.ran_at
                          ? new Date(run.ran_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—";
                        const delta =
                          typeof run.total_delta === "number"
                            ? run.total_delta
                            : parseFloat(String(run.total_delta ?? 0));
                        const deltaStr =
                          Number.isNaN(delta) || delta === 0
                            ? "—"
                            : delta > 0
                              ? `+$${delta.toFixed(2)}`
                              : `-$${Math.abs(delta).toFixed(2)}`;
                        return (
                          <tr
                            key={run.id}
                            className="table-row hover:bg-[#f3f4f6]"
                          >
                            <td className="table-cell text-[14px] text-forest-f60">
                              {ranAt}
                            </td>
                            <td className="table-cell">
                              <span className="text-[14px] text-forest-f30 capitalize">
                                {run.status.replace("_", " ")}
                              </span>
                            </td>
                            <td className="table-cell text-[14px] text-forest-f30">
                              {run.triggered_by || "—"}
                            </td>
                            <td className="table-cell text-[14px] text-forest-f30">
                              {run.automation_count}
                            </td>
                            <td className="table-cell text-[14px] text-forest-f30">
                              {run.entity_count}
                            </td>
                            <td className="table-cell text-[14px] text-forest-f30 font-medium">
                              {deltaStr}
                            </td>
                          </tr>
                        );
                      })
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
