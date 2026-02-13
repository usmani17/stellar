import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { googleAdwordsCampaignsService } from "../../../services/googleAdwords/googleAdwordsCampaigns";
import { toLocalDateString } from "../../../utils/dateHelpers";

interface GoogleCampaignDetail {
  campaign: {
    id: number;
    campaign_id: number;
    name: string;
    status: string;
    advertising_channel_type: string;
    advertising_channel_sub_type?: string;
    start_date?: string;
    end_date?: string;
    daily_budget: number;
    account_name?: string;
    customer_id?: string;
    last_sync?: string;
  };
  description?: string;
  chart_data?: Array<{
    date: string;
    spend?: number;
    sales?: number;
    clicks?: number;
    impressions?: number;
  }>;
  kpi_cards?: Array<{
    label: string;
    value: string;
    change?: string;
    isPositive?: boolean;
  }>;
}

interface UseGoogleCampaignDetailParams {
  accountId: string | undefined;
  channelId: string | undefined;
  campaignId: string | undefined;
  startDate: Date | null;
  endDate: Date | null;
}

export const useGoogleCampaignDetail = ({
  accountId,
  channelId,
  campaignId,
  startDate,
  endDate,
}: UseGoogleCampaignDetailParams) => {
  const [loading, setLoading] = useState(true);
  const [campaignDetail, setCampaignDetail] =
    useState<GoogleCampaignDetail | null>(null);
  const isLoadingRef = useRef(false);

  // Chart toggle state
  const [chartToggles, setChartToggles] = useState({
    sales: true,
    spend: true,
    clicks: false,
    orders: false,
  });

  const loadCampaignDetail = useCallback(async () => {
    // Prevent duplicate concurrent calls
    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      // Clear previous data immediately
      setCampaignDetail(null);
      const accountIdNum = parseInt(accountId!, 10);
      const currentCampaignId = campaignId; // Capture current campaignId

      if (isNaN(accountIdNum) || !currentCampaignId) {
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }

      const channelIdNum = channelId ? parseInt(channelId, 10) : undefined;
      if (!channelIdNum || isNaN(channelIdNum)) {
        throw new Error("Channel ID is required");
      }

      // Support both numeric IDs and draft IDs (e.g. "draft-xxx")
      const campaignIdParam =
        String(currentCampaignId).startsWith("draft-")
          ? currentCampaignId
          : parseInt(currentCampaignId, 10);
      if (typeof campaignIdParam === "number" && isNaN(campaignIdParam)) {
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }

      const data = await googleAdwordsCampaignsService.getGoogleCampaignDetail(
        accountIdNum,
        channelIdNum,
        campaignIdParam,
        startDate ? toLocalDateString(startDate) : undefined,
        endDate ? toLocalDateString(endDate) : undefined
      );

      // Only set data if we're still on the same campaign (check for race conditions)
      if (currentCampaignId === campaignId) {
        setCampaignDetail(data);
      }
    } catch (error) {
      console.error("Failed to load Google campaign detail:", error);
      setCampaignDetail(null);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [accountId, channelId, campaignId, startDate, endDate]);

  // Load campaign detail when params change
  const startDateStr = startDate?.toISOString();
  const endDateStr = endDate?.toISOString();

  useEffect(() => {
    // Reset state when campaignId changes
    setCampaignDetail(null);

    if (accountId && campaignId) {
      loadCampaignDetail();
    }
  }, [accountId, campaignId, startDateStr, endDateStr, loadCampaignDetail]);

  // Chart data processing
  const chartData = useMemo(() => {
    if (campaignDetail?.chart_data && campaignDetail.chart_data.length > 0) {
      return campaignDetail.chart_data.map((item) => ({
        date: item.date,
        sales: item.sales || 0,
        spend: item.spend || 0,
        clicks: item.clicks || 0,
        orders: 0, // Google doesn't have orders, but chart expects it
      }));
    }
    return [];
  }, [campaignDetail]);

  // Toggle chart metric
  const toggleChartMetric = useCallback(
    (metric: "sales" | "spend" | "clicks" | "orders") => {
      setChartToggles((prev) => ({
        ...prev,
        [metric]: !prev[metric],
      }));
    },
    []
  );

  // Handler for updating campaign information
  const handleUpdateCampaign = useCallback(
    async (
      field: "budget" | "status" | "start_date" | "end_date",
      newValue: string
    ) => {
      if (!accountId || !channelId || !campaignDetail) return;

      try {
        const accountIdNum = parseInt(accountId, 10);
        const channelIdNum = parseInt(channelId, 10);
        if (isNaN(accountIdNum) || isNaN(channelIdNum)) {
          throw new Error("Invalid account ID or channel ID");
        }

        if (field === "status") {
          const statusMap: Record<string, "ENABLED" | "PAUSED" | "REMOVED"> = {
            ENABLED: "ENABLED",
            PAUSED: "PAUSED",
            REMOVED: "REMOVED",
            Enabled: "ENABLED",
            Paused: "PAUSED",
            Removed: "REMOVED",
          };
          const statusValue = statusMap[newValue] || "ENABLED";

          await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
            accountIdNum,
            channelIdNum,
            {
              campaignIds: [campaignDetail.campaign.campaign_id],
              action: "status",
              status: statusValue,
            }
          );
        } else if (field === "budget") {
          const budgetValue = parseFloat(newValue.replace(/[^0-9.]/g, ""));
          if (isNaN(budgetValue)) {
            throw new Error("Invalid budget value");
          }

          await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
            accountIdNum,
            channelIdNum,
            {
              campaignIds: [campaignDetail.campaign.campaign_id],
              action: "budget",
              budgetAction: "set",
              unit: "amount",
              value: budgetValue,
            }
          );
        } else if (field === "start_date") {
          await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
            accountIdNum,
            channelIdNum,
            {
              campaignIds: [campaignDetail.campaign.campaign_id],
              action: "start_date",
              start_date: newValue,
            }
          );
        } else if (field === "end_date") {
          await googleAdwordsCampaignsService.bulkUpdateGoogleCampaigns(
            accountIdNum,
            channelIdNum,
            {
              campaignIds: [campaignDetail.campaign.campaign_id],
              action: "end_date",
              end_date: newValue,
            }
          );
        }

        // Reload campaign detail after update
        await loadCampaignDetail();
      } catch (error) {
        console.error("Error updating campaign:", error);
        throw error; // Re-throw so component can handle it
      }
    },
    [accountId, channelId, campaignDetail, loadCampaignDetail]
  );

  return {
    campaignDetail,
    loading,
    chartData,
    chartToggles,
    toggleChartMetric,
    handleUpdateCampaign,
    loadCampaignDetail,
  };
};
