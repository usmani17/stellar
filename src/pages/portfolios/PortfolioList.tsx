import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  RefreshCw,
  MoreVertical,
  Trash2,
  Eye,
  Pencil,
} from "lucide-react";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { useSidebar } from "../../contexts/SidebarContext";
import { usePortfolios, usePortfolioSummary } from "../../hooks/queries/usePortfolios";
import { useDeletePortfolio } from "../../hooks/mutations/usePortfolioMutations";
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import {
  Banner,
  Button,
  KPICard,
  Loader,
  Tooltip,
  ConfirmationModal,
} from "../../components/ui";
import { cn } from "../../lib/cn";
import type { PortfolioListItem } from "../../services/portfolios";

const PAGE_SIZE = 25;

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  tiktok: "TikTok",
  amazon: "Amazon",
};

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return "—";
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(val: number | null | undefined): string {
  if (val == null) return "—";
  return val.toLocaleString();
}

function formatPacing(val: number | null | undefined): string {
  if (val == null) return "—";
  return `${val.toFixed(1)}%`;
}

function getPacingColor(pacing: number | null | undefined): string {
  if (pacing == null) return "text-forest-f30";
  if (pacing >= 80 && pacing <= 120) return "text-green-600";
  if (pacing >= 50 && pacing <= 150) return "text-yellow-600";
  return "text-red-r30";
}

export const PortfolioList: React.FC = () => {
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();
  const [currentPage, setCurrentPage] = useState(1);
  const [inputValue, setInputValue, searchQuery] = useDebouncedSearch();
  const [deletingPortfolio, setDeletingPortfolio] = useState<PortfolioListItem | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  const accountId: number | undefined = undefined;

  const {
    portfolios,
    count,
    totalPages,
    isLoading,
    isFetching,
    refetch,
  } = usePortfolios(currentPage, PAGE_SIZE, searchQuery, accountId);

  const { data: summary } = usePortfolioSummary(accountId);
  const deleteMutation = useDeletePortfolio();

  useEffect(() => {
    setPageTitle("Portfolios");
    return () => resetPageTitle();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const [deleteBannerMsg, setDeleteBannerMsg] = useState("");
  const [deleteBannerType, setDeleteBannerType] = useState<"success" | "error">("success");

  const handleDelete = async () => {
    if (!deletingPortfolio) return;
    const portfolioName = deletingPortfolio.name;
    try {
      await deleteMutation.mutateAsync({
        accountId: deletingPortfolio.accountId,
        portfolioId: deletingPortfolio.id,
      });
      setDeletingPortfolio(null);
      setDeleteBannerType("success");
      setDeleteBannerMsg(`"${portfolioName}" has been deleted.`);
      setTimeout(() => setDeleteBannerMsg(""), 5000);
    } catch {
      setDeletingPortfolio(null);
      setDeleteBannerType("error");
      setDeleteBannerMsg(`Failed to delete "${portfolioName}". Please try again.`);
      setTimeout(() => setDeleteBannerMsg(""), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-sandstorm-s0 flex">
      <Sidebar />

      <div
        className="flex-1 w-full"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <DashboardHeader />

        <div className="px-4 pt-[104px] pb-6 sm:px-6 lg:px-8 lg:pt-[112px] lg:pb-8">
          <div className="space-y-6">
            {deleteBannerMsg && (
              <Banner
                type={deleteBannerType}
                message={deleteBannerMsg}
                dismissable
                onDismiss={() => setDeleteBannerMsg("")}
              />
            )}

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-[22px] sm:text-[24px] font-medium text-[#072929] leading-[normal]">
                Portfolios
              </h1>
              <div className="flex items-center gap-2">
                <div className="search-input-container h-[40px] w-full md:w-[272px] flex items-center gap-2 px-[10px]">
                  <Search className="w-4 h-4 text-forest-f30 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search portfolios..."
                    className="bg-transparent border-none outline-none text-[13px] text-forest-f60 w-full placeholder:text-forest-f30/60"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </div>
                <Tooltip description="Refresh">
                  <button
                    onClick={handleRefresh}
                    className="p-2 rounded-lg border border-sandstorm-s40 hover:bg-sandstorm-s10 transition-colors"
                    aria-label="Refresh"
                  >
                    <RefreshCw
                      className={cn(
                        "w-4 h-4 text-forest-f30",
                        isFetching && "animate-spin",
                      )}
                    />
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard
                label="Total Portfolios"
                value={summary?.totalPortfolios ?? 0}
              />
              <KPICard
                label="Live"
                value={summary?.livePortfolios ?? 0}
              />
              <KPICard
                label="Behind Pacing"
                value={summary?.behindPacing ?? 0}
              />
              <KPICard
                label="Need Attention"
                value={summary?.needAttention ?? 0}
              />
            </div>

            {/* Table */}
            <div
              className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-visible relative"
              style={{ minHeight: isLoading ? "400px" : undefined }}
            >
              {(isLoading || isFetching) && (
                <div className="loading-overlay">
                  <div className="loading-overlay-content">
                    <Loader
                      size="md"
                      message={
                        isLoading ? "Loading portfolios..." : "Updating..."
                      }
                    />
                  </div>
                </div>
              )}

              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Name</th>
                    <th className="table-header">Platform</th>
                    <th className="table-header">Campaigns</th>
                    <th className="table-header">Budget</th>
                    <th className="table-header">Spend</th>
                    <th className="table-header">Pacing</th>
                    <th className="table-header">Clicks</th>
                    <th className="table-header">Impressions</th>
                    <th className="table-header">CPC</th>
                    <th className="table-header">Status</th>
                    <th className="table-header w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`skeleton-${i}`} className="table-row">
                        {Array.from({ length: 11 }).map((_, j) => (
                          <td key={j} className="table-cell">
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : portfolios.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="table-cell text-center py-12">
                        <p className="text-[14px] text-forest-f30 mb-2">
                          {searchQuery
                            ? "No portfolios match your search."
                            : "No portfolios yet."}
                        </p>
                        {!searchQuery && (
                          <p className="text-[13px] text-forest-f30">
                            Go to a campaign page, select campaigns, and use
                            "Create Portfolio" from bulk actions.
                          </p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    portfolios.map((p, idx) => (
                      <PortfolioRow
                        key={p.id}
                        portfolio={p}
                        onView={() =>
                          navigate(
                            `/brands/${p.accountId}/portfolios/${p.id}`,
                          )
                        }
                        onEdit={() =>
                          navigate(
                            `/brands/${p.accountId}/portfolios/${p.id}?edit=true`,
                          )
                        }
                        onDelete={() => setDeletingPortfolio(p)}
                        menuOpen={menuOpenId === p.id}
                        onMenuToggle={() =>
                          setMenuOpenId(menuOpenId === p.id ? null : p.id)
                        }
                        isLastRows={idx >= portfolios.length - 2}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-forest-f30">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, count)} of {count}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="text-[12px] px-3 py-1.5"
                  >
                    Previous
                  </Button>
                  <span className="text-[13px] text-forest-f30">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="text-[12px] px-3 py-1.5"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deletingPortfolio !== null}
        onClose={() => !deleteMutation.isPending && setDeletingPortfolio(null)}
        onConfirm={handleDelete}
        title="Delete Portfolio"
        message={`Are you sure you want to delete "${deletingPortfolio?.name}"? This action cannot be undone.`}
        confirmButtonLabel="Delete"
        isDangerous
        isLoading={deleteMutation.isPending}
        loadingLabel="Deleting..."
      />
    </div>
  );
};

// ── Row component ──────────────────────────────────────────────────────────

interface PortfolioRowProps {
  portfolio: PortfolioListItem;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  menuOpen: boolean;
  onMenuToggle: () => void;
  isLastRows?: boolean;
}

const PortfolioRow: React.FC<PortfolioRowProps> = ({
  portfolio: p,
  onView,
  onEdit,
  onDelete,
  menuOpen,
  onMenuToggle,
  isLastRows = false,
}) => {
  const t = p.latestTracking;

  return (
    <tr
      className="table-row cursor-pointer hover:bg-sandstorm-s5/50"
      onClick={onView}
    >
      <td className="table-cell">
        <div className="flex flex-col">
          <span className="text-[13px] font-medium text-forest-f60">
            {p.name}
          </span>
          <span className="text-[11px] text-forest-f30">
            {p.accountName}
          </span>
        </div>
      </td>
      <td className="table-cell">
        <span className="text-[12px] text-forest-f30 capitalize">
          {PLATFORM_LABELS[p.platform] ?? p.platform}
        </span>
      </td>
      <td className="table-cell text-[13px] text-forest-f60">
        {p.campaignCount}
      </td>
      <td className="table-cell text-[13px] text-forest-f60">
        {formatCurrency(p.totalBudget)}
      </td>
      <td className="table-cell text-[13px] text-forest-f60">
        {t ? formatCurrency(t.totalSpend) : "—"}
      </td>
      <td className="table-cell">
        <span
          className={cn(
            "text-[13px] font-medium",
            getPacingColor(t?.pacingPercentage),
          )}
        >
          {t ? formatPacing(t.pacingPercentage) : "—"}
        </span>
      </td>
      <td className="table-cell text-[13px] text-forest-f60">
        {t ? formatNumber(t.clicks) : "—"}
      </td>
      <td className="table-cell text-[13px] text-forest-f60">
        {t ? formatNumber(t.impressions) : "—"}
      </td>
      <td className="table-cell text-[13px] text-forest-f60">
        {t ? formatCurrency(t.cpc) : "—"}
      </td>
      <td className="table-cell">
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium",
            p.status === "enabled"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600",
          )}
        >
          {p.status === "enabled" ? "Live" : "Disabled"}
        </span>
      </td>
      <td className="table-cell relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMenuToggle();
          }}
          className="p-1 rounded hover:bg-sandstorm-s20 transition-colors"
          aria-label="Actions"
        >
          <MoreVertical className="w-4 h-4 text-forest-f30" />
        </button>
        {menuOpen && (
          <div
            className={cn(
              "absolute right-4 bg-white border border-sandstorm-s40 rounded-lg shadow-lg z-50 py-1 min-w-[140px]",
              isLastRows ? "bottom-8" : "top-8",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                onView();
                onMenuToggle();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-forest-f60 hover:bg-sandstorm-s5 transition-colors"
            >
              <Eye className="w-4 h-4" />
              View
            </button>
            <button
              onClick={() => {
                onEdit();
                onMenuToggle();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-forest-f60 hover:bg-sandstorm-s5 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => {
                onDelete();
                onMenuToggle();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-red-r30 hover:bg-red-r0 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};
