import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { useDateRange } from "../../contexts/DateRangeContext";
import { campaignsService } from "../../services/campaigns";
import {
  TikTokCampaignsTable,
  type TikTokCampaign,
} from "./components/TikTokCampaignsTable";
import {
  CreateTikTokCampaignPanel,
  type CreateTikTokCampaignData,
} from "../../components/campaigns/CreateTikTokCampaignPanel";
import { PerformanceChart } from "../../components/charts/PerformanceChart";
import { Button } from "../../components/ui";
import { ErrorModal } from "../../components/ui/ErrorModal";
import {
  FilterSection,
  FilterSectionPanel,
} from "../../components/filters/FilterSection";
import { type FilterValues } from "../../components/filters/FilterPanel";
// import { selectXAxisSize } from "recharts/types/state/selectors/axisSelectors";

// TikTok Campaign Filter Fields
const TIKTOK_CAMPAIGN_FILTER_FIELDS = [
  { value: "campaign_name", label: "Campaign Name" },
  { value: "state", label: "Status" },
  { value: "type", label: "Objective Type" },
  { value: "budget", label: "Budget" },
];

export const TikTokCampaigns: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const { sidebarWidth } = useSidebar();
  const { startDate, endDate } = useDateRange();

  // State
  const [campaigns, setCampaigns] = useState<TikTokCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortColumn, setSortColumn] = useState<string>("campaign_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState<string>(""); // For input field and client-side filtering
  const [apiSearchQuery, setApiSearchQuery] = useState<string>(""); // For backend API calls

  // Create/Edit Campaign state
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [campaignFormMode, setCampaignFormMode] = useState<"create" | "edit">(
    "create"
  );
  const [editingCampaign, setEditingCampaign] = useState<TikTokCampaign | null>(
    null
  );

  // Filter state - using FilterPanel compatible state
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>([]);

  // Error modal state
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
    title?: string;
    isSuccess?: boolean;
  }>({ isOpen: false, message: "" });

  // Status update state
  const [selectedCampaigns, setSelectedCampaigns] = useState<
    Set<string | number>
  >(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingStatusAction, setPendingStatusAction] = useState<
    "ENABLE" | "DISABLE" | "DELETE" | null
  >(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowBulkActions(false);
      }
    };

    if (showBulkActions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showBulkActions]);

  // Chart toggles
  const [chartToggles, setChartToggles] = useState({
    spend: true,
    conversions: true,
    impressions: false,
    clicks: false,
    ctr: false,
    cpc: false,
  });

  // Toggle chart metric
  const toggleChartMetric = (metric: string) => {
    setChartToggles((prev) => ({
      ...prev,
      [metric]: !prev[metric as keyof typeof prev],
    }));
  };

  const [campaignsResponse, setCampaignsResponse] = useState<any>(null);

  const fetchCampaigns = useCallback(async () => {
    if (!accountId) return;

    setLoading(true);
    try {
      // Format dates for API (YYYY-MM-DD)
      const startDateStr = startDate?.toISOString().split("T")[0];
      const endDateStr = endDate?.toISOString().split("T")[0];

      const response = await campaignsService.getTikTokCampaigns(
        parseInt(accountId),
        {
          page,
          page_size: pageSize,
          start_date: startDateStr,
          end_date: endDateStr,
        }
      );

      if (response && response.campaigns) {
        setCampaigns(response.campaigns);
        setTotal(response.total);
        setCampaignsResponse(response);
      }
    } catch (error) {
      console.error("Failed to fetch TikTok campaigns:", error);
      setErrorModal({
        isOpen: true,
        title: "Error",
        message: "Failed to fetch campaigns. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [accountId, page, pageSize, startDate, endDate]);

  useEffect(() => {
    setPageTitle("TikTok Campaigns");
    return () => resetPageTitle();
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleCreateCampaign = async (data: CreateTikTokCampaignData) => {
    if (!accountId) return;

    setCreateLoading(true);
    try {
      if (campaignFormMode === "edit" && editingCampaign) {
        // Update campaign
        await campaignsService.updateTikTokCampaign(
          parseInt(accountId),
          editingCampaign.campaign_id,
          {
            campaign_name: data.campaign_name,
            budget: data.budget,
          }
        );
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: "Campaign updated successfully!",
          isSuccess: true,
        });
      } else {
        // Create campaign
        await campaignsService.createTikTokCampaign(parseInt(accountId), data);
        setErrorModal({
          isOpen: true,
          title: "Success",
          message: "Campaign created successfully!",
          isSuccess: true,
        });
      }
      setIsCreatePanelOpen(false);
      setCampaignFormMode("create");
      setEditingCampaign(null);
      // Refresh campaigns list
      await fetchCampaigns();
    } catch (error) {
      console.error(
        `Failed to ${
          campaignFormMode === "edit" ? "update" : "create"
        } TikTok campaign:`,
        error
      );
      setErrorModal({
        isOpen: true,
        title: "Error",
        message: `Failed to ${
          campaignFormMode === "edit" ? "update" : "create"
        } campaign. Please check the console for details.`,
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditCampaign = async (campaign: TikTokCampaign) => {
    if (!accountId) return;

    setCreateLoading(true);
    try {
      // Fetch full campaign details to get all fields including extra_data
      const detail = await campaignsService.getTikTokCampaignDetail(
        parseInt(accountId),
        campaign.campaign_id
      );

      // Merge table data with detail data
      const fullCampaignData: TikTokCampaign = {
        ...campaign,
        ...detail.campaign,
      };

      setEditingCampaign(fullCampaignData);
      setCampaignFormMode("edit");
      setIsCreatePanelOpen(true);
    } catch (error) {
      console.error("Failed to fetch campaign details:", error);
      // Fallback to using table data if detail fetch fails
      setEditingCampaign(campaign);
      setCampaignFormMode("edit");
      setIsCreatePanelOpen(true);
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle status update confirmation
  const handleStatusUpdateConfirm = async () => {
    if (!accountId || !pendingStatusAction || selectedCampaigns.size === 0)
      return;

    setStatusUpdateLoading(true);
    try {
      const campaignIds = Array.from(selectedCampaigns);

      await campaignsService.updateTikTokCampaignStatus(parseInt(accountId), {
        campaign_ids: campaignIds,
        operation_status: pendingStatusAction,
      });

      setErrorModal({
        isOpen: true,
        title: "Success",
        message: `Campaign${campaignIds.length > 1 ? "s" : ""} ${
          pendingStatusAction === "ENABLE"
            ? "enabled"
            : pendingStatusAction === "DISABLE"
            ? "paused"
            : "deleted"
        } successfully!`,
        isSuccess: true,
      });

      // Clear selection and refresh campaigns
      setSelectedCampaigns(new Set());
      setShowConfirmationModal(false);
      setPendingStatusAction(null);
      await fetchCampaigns();
    } catch (error: any) {
      console.error("Failed to update campaign status:", error);
      setErrorModal({
        isOpen: true,
        title: "Error",
        message:
          error?.response?.data?.error ||
          error?.message ||
          "Failed to update campaign status. Please try again.",
      });
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  // Get chart data from API response
  const chartDataFromApi = useMemo(() => {
    return campaignsResponse?.chart_data || [];
  }, [campaignsResponse]);

  // Format chart data with proper date formatting (matching Amazon)
  const chartData = useMemo(() => {
    // Use chart data from API if available
    if (chartDataFromApi.length > 0) {
      return chartDataFromApi.map((item: any) => {
        // Format date from backend (YYYY-MM-DD or date string) to match Amazon format
        let formattedDate = item.date;
        if (item.date) {
          try {
            const dateObj = new Date(item.date);
            if (!isNaN(dateObj.getTime())) {
              // Format to match Amazon: "Jan 01" (zero-padded day)
              const month = dateObj.toLocaleDateString("en-US", {
                month: "short",
              });
              const day = dateObj.getDate().toString().padStart(2, "0");
              formattedDate = `${month} ${day}`;
            }
          } catch (e) {
            // Keep original date if parsing fails
            formattedDate = item.date;
          }
        }

        return {
          date: formattedDate,
          spend: item.spend || 0,
          conversions: item.conversions || 0,
          impressions: item.impressions || 0,
          clicks: item.clicks || 0,
          ctr:
            item.impressions > 0
              ? parseFloat(((item.clicks / item.impressions) * 100).toFixed(2))
              : 0,
          cpc:
            item.clicks > 0
              ? parseFloat((item.spend / item.clicks).toFixed(2))
              : 0,
        };
      });
    }

        // Return empty array if no data (matching Amazon behavior)
        return [];
    }, [chartDataFromApi]);

  // Filter campaigns based on FilterPanel filters and search query
  const filteredCampaignsItems = useMemo(() => {
    return campaigns.filter((campaign) => {
      // Apply filters from FilterPanel
      for (const filter of filters) {
        if (filter.field === "campaign_name") {
          const nameMatch = campaign.campaign_name
            .toLowerCase()
            .includes(String(filter.value).toLowerCase());
          if (filter.operator === "contains" && !nameMatch) return false;
          if (filter.operator === "not_contains" && nameMatch) return false;
          if (
            filter.operator === "equals" &&
            campaign.campaign_name.toLowerCase() !==
              String(filter.value).toLowerCase()
          )
            return false;
        }
        if (filter.field === "state") {
          const statusNormalized =
            campaign.operation_status?.toLowerCase() === "enable"
              ? "ENABLED"
              : campaign.operation_status?.toLowerCase() === "disable"
              ? "PAUSED"
              : campaign.operation_status;
          if (statusNormalized !== filter.value) return false;
        }
        if (filter.field === "type") {
          if (campaign.objective_type !== filter.value) return false;
        }
        if (filter.field === "budget") {
          const budgetValue = campaign.budget || 0;
          const filterValue = Number(filter.value);
          if (filter.operator === "gt" && budgetValue <= filterValue)
            return false;
          if (filter.operator === "lt" && budgetValue >= filterValue)
            return false;
          if (filter.operator === "eq" && budgetValue !== filterValue)
            return false;
          if (filter.operator === "gte" && budgetValue < filterValue)
            return false;
          if (filter.operator === "lte" && budgetValue > filterValue)
            return false;
        }
      }

      // Apply client-side filtering if searchQuery is different from apiSearchQuery
      if (searchQuery && searchQuery !== apiSearchQuery) {
        const query = searchQuery.toLowerCase().trim();
        const campaignName = (campaign.campaign_name || "").toLowerCase();
        const accountIdStr = accountId ? accountId.toString() : "";
        if (!campaignName.includes(query) && !accountIdStr.includes(query))
          return false;
      }

      return true;
    });
  }, [campaigns, filters, searchQuery, apiSearchQuery, accountId]);

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        className="flex-1 min-w-0 w-full"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {/* Header */}
        <DashboardHeader />

        {/* Main Content Area */}
        <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white overflow-x-hidden min-w-0">
          <div className="space-y-6">
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-[24px] font-medium text-[#072929] leading-[normal]">
                Campaign Overview
              </h1>
              <div className="flex items-center gap-2">
                {/* Create Campaign Button */}
                <button
                  onClick={() => setIsCreatePanelOpen(!isCreatePanelOpen)}
                  className="px-3 py-2 bg-[#136D6D] text-white border border-[#136D6D] rounded-lg flex items-center gap-2 h-10 hover:bg-[#0e5a5a] transition-colors"
                >
                  <span className="text-[10.64px] text-white font-normal">
                    Create Campaign
                  </span>
                  <svg
                    className={`w-5 h-5 text-white transition-transform ${
                      isCreatePanelOpen ? "rotate-180" : ""
                    }`}
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
                {/* Add Filter Button - Using FilterSection component */}
                <FilterSection
                  isOpen={isFilterPanelOpen}
                  onToggle={() => {
                    setIsFilterPanelOpen(!isFilterPanelOpen);
                    if (!isFilterPanelOpen) setIsCreatePanelOpen(false);
                  }}
                  filters={filters}
                  onApply={() => {}} // Handled by FilterSectionPanel
                  filterFields={TIKTOK_CAMPAIGN_FILTER_FIELDS}
                  initialFilters={filters}
                />
              </div>
            </div>

                        {/* Create Campaign Panel */}
                        {isCreatePanelOpen && (
                            <div className="relative z-30">
                                <CreateTikTokCampaignPanel
                                    isOpen={isCreatePanelOpen}
                                    onClose={() => {
                                        setIsCreatePanelOpen(false);
                                        setCampaignFormMode("create");
                                        setEditingCampaign(null);
                                    }}
                                    onSubmit={handleCreateCampaign}
                                    loading={createLoading}
                                    mode={campaignFormMode}
                                    initialData={editingCampaign ? {
                                        campaign_name: editingCampaign.campaign_name,
                                        objective_type: editingCampaign.objective_type,
                                        advertiser_id: editingCampaign.advertiser_id,
                                        budget: editingCampaign.budget,
                                        budget_mode: editingCampaign.budget_mode,
                                        budget_optimize_on: (editingCampaign as any).budget_optimize_on,
                                        operation_status: editingCampaign.operation_status,
                                        start_date: (editingCampaign as any).start_date,
                                        end_date: (editingCampaign as any).end_date,
                                    } : null}
                                    campaignId={editingCampaign?.campaign_id}
                                />
                            </div>
                        )}

            {/* Filter Panel - Using FilterSectionPanel component */}
            <FilterSectionPanel
              isOpen={isFilterPanelOpen}
              onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              filters={filters}
              onApply={(newFilters) => {
                setFilters(newFilters);
                setPage(1); // Reset to first page when applying filters
              }}
              filterFields={TIKTOK_CAMPAIGN_FILTER_FIELDS}
              initialFilters={filters}
              accountId={accountId}
              channelType="tiktok"
            />

            {/* Performance Trends Chart */}
            <div className="relative">
              <PerformanceChart
                data={chartData}
                toggles={chartToggles}
                onToggle={toggleChartMetric}
                title="Performance Trends"
                metrics={[
                  { key: "spend", label: "Spend", color: "#506766" },
                  {
                    key: "conversions",
                    label: "Conversions",
                    color: "#136D6D",
                  },
                  {
                    key: "impressions",
                    label: "Impressions",
                    color: "#7C3AED",
                  },
                  { key: "clicks", label: "Clicks", color: "#169aa3" },
                  { key: "ctr", label: "CTR", color: "#8B5CF6" },
                  { key: "cpc", label: "CPC", color: "#F59E0B" },
                ]}
              />
              {isCreatePanelOpen && (
                <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] z-40 rounded-[12px] cursor-not-allowed" />
              )}
            </div>

            {/* Search, Edit and Export Buttons - Above Table */}
            <div className="flex items-center justify-end gap-2 mb-4">
              {/* Search Box */}
              <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[8px] flex gap-[8px] h-[40px] items-center p-[10px] w-[272px]">
                <div className="relative shrink-0 size-[12px]">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5.5 9.5C7.70914 9.5 9.5 7.70914 9.5 5.5C9.5 3.29086 7.70914 1.5 5.5 1.5C3.29086 1.5 1.5 3.29086 1.5 5.5C1.5 7.70914 3.29086 9.5 5.5 9.5Z"
                      stroke="#556179"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10.5 10.5L8.5 8.5"
                      stroke="#556179"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    // Don't reset page or call API while typing - only filter client-side
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      // Call backend API when Enter is pressed
                      setApiSearchQuery(searchQuery);
                      setPage(1); // Reset to first page when searching
                    }
                  }}
                  placeholder="Search by Name or Account ID"
                  className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#556179] placeholder:text-[#556179] font-['GT_America_Trial'] font-normal"
                />
              </div>
              <div className="flex items-center gap-2">
                {/* Edit Button with Dropdown */}
                <div
                  className="relative inline-flex justify-end"
                  ref={dropdownRef}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[10.64px] text-[#072929] font-normal"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBulkActions((prev) => !prev);
                    }}
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 3.5a2.121 2.121 0 113 3L12 16l-4 1 1-4 9.5-9.5z"
                      />
                    </svg>
                    <span className="text-[10.64px] text-[#072929] font-normal">
                      Edit
                    </span>
                  </Button>
                  {showBulkActions && (
                    <div className="absolute top-[42px] right-0 w-56 bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg z-[100] pointer-events-auto overflow-hidden">
                      <div className="overflow-y-auto">
                        {[
                          { value: "ENABLE", label: "Enable" },
                          { value: "DISABLE", label: "Pause" },
                          { value: "DELETE", label: "Delete" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className="w-full text-left px-3 py-2 text-[10.64px] text-[#313850] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            disabled={selectedCampaigns.size === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectedCampaigns.size === 0) return;
                              setPendingStatusAction(
                                opt.value as "ENABLE" | "DISABLE" | "DELETE"
                              );
                              setShowConfirmationModal(true);
                              setShowBulkActions(false);
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Export Button */}
                <Button
                  variant="ghost"
                  className="px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-lg flex items-center gap-2 h-10 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[10.64px] text-[#072929] font-normal"
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
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-[10.64px] text-[#072929] font-normal">
                    Export
                  </span>
                </Button>
              </div>
            </div>

            <TikTokCampaignsTable
              campaigns={filteredCampaignsItems}
              loading={loading}
              onSort={handleSort}
              sortBy={sortColumn}
              sortOrder={sortDirection}
              onEditCampaign={handleEditCampaign}
              selectedCampaigns={selectedCampaigns}
              onSelectionChange={setSelectedCampaigns}
            />

            {/* Pagination */}
            {!loading && campaigns.length > 0 && (
              <div className="flex items-center justify-end mt-4">
                <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
                  <button
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${
                          page === pageNum
                            ? "bg-white text-[#136D6D] font-semibold"
                            : "text-black hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && page < totalPages - 2 && (
                    <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                      ...
                    </span>
                  )}
                  {totalPages > 5 && (
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${
                        page === totalPages
                          ? "bg-white text-[#136D6D] font-semibold"
                          : "text-black hover:bg-gray-50"
                      }`}
                    >
                      {totalPages}
                    </button>
                  )}
                  <button
                    onClick={() =>
                      handlePageChange(Math.min(totalPages, page + 1))
                    }
                    disabled={page === totalPages}
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

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: "" })}
        title={errorModal.title}
        message={errorModal.message}
        isSuccess={errorModal.isSuccess}
      />

      {/* Confirmation Modal */}
      {showConfirmationModal && pendingStatusAction && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowConfirmationModal(false);
              setPendingStatusAction(null);
            }
          }}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[#072929] mb-4">
              Confirm{" "}
              {pendingStatusAction === "ENABLE"
                ? "Enable"
                : pendingStatusAction === "DISABLE"
                ? "Pause"
                : "Delete"}{" "}
              Campaign{pendingStatusAction === "DELETE" ? "s" : ""}
            </h3>
            <p className="text-[14px] text-[#556179] mb-6">
              Are you sure you want to{" "}
              {pendingStatusAction === "ENABLE"
                ? "enable"
                : pendingStatusAction === "DISABLE"
                ? "pause"
                : "delete"}{" "}
              {selectedCampaigns.size} campaign
              {selectedCampaigns.size > 1 ? "s" : ""}?
              {pendingStatusAction === "DELETE" && (
                <span className="block mt-2 text-red-600 font-semibold">
                  This action cannot be undone.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmationModal(false);
                  setPendingStatusAction(null);
                }}
                className="px-4 py-2 text-[#556179] bg-[#FEFEFB] border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-[14px]"
                disabled={statusUpdateLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusUpdateConfirm}
                disabled={statusUpdateLoading}
                className={`px-4 py-2 text-white rounded-lg transition-colors text-[14px] ${
                  pendingStatusAction === "DELETE"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#136D6D] hover:bg-[#0e5a5a]"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {statusUpdateLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {pendingStatusAction === "ENABLE"
                      ? "Enabling..."
                      : pendingStatusAction === "DISABLE"
                      ? "Pausing..."
                      : "Deleting..."}
                  </span>
                ) : pendingStatusAction === "ENABLE" ? (
                  "Enable"
                ) : pendingStatusAction === "DISABLE" ? (
                  "Pause"
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
