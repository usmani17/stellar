import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { accountsService } from "../../../services/accounts";
import { toLocalDateString } from "../../../utils/dateHelpers";

export interface MetaCampaignDetailData {
  campaign: {
    id: number;
    campaign_id: string;
    campaign_name: string;
    /** Ad account (profile) ID for this campaign; used when creating ad sets. */
    profile_id?: number;
    status?: string;
    objective?: string;
    start_time?: string;
    stop_time?: string;
    daily_budget?: string;
    impressions?: number;
    clicks?: number;
    spends?: number;
    sales?: number;
    acos?: number;
    roas?: number;
  };
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
    change?: string | null;
    isPositive?: boolean | null;
  }>;
}

interface UseMetaCampaignDetailParams {
  accountId: string | undefined;
  channelId: string | undefined;
  campaignId: string | undefined;
  startDate: Date | null;
  endDate: Date | null;
}

export const useMetaCampaignDetail = ({
  accountId,
  channelId,
  campaignId,
  startDate,
  endDate,
}: UseMetaCampaignDetailParams) => {
  const [loading, setLoading] = useState(true);
  const [campaignDetail, setCampaignDetail] =
    useState<MetaCampaignDetailData | null>(null);
  const isLoadingRef = useRef(false);

  console.log(`campaignId ${campaignId}`);
  const [chartToggles, setChartToggles] = useState({
    sales: true,
    spend: true,
    clicks: false,
    orders: false,
  });

  const loadCampaignDetail = useCallback(async () => {
    if (isLoadingRef.current) return;
    try {
      isLoadingRef.current = true;
      setLoading(true);
      setCampaignDetail(null);
      const currentCampaignId = campaignId;
      if (!currentCampaignId || !channelId) {
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }
      const channelIdNum = parseInt(channelId, 10);
      if (isNaN(channelIdNum)) {
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }
      const data = await accountsService.getMetaCampaignDetail(
        channelIdNum,
        currentCampaignId,
        {
          start_date: startDate ? toLocalDateString(startDate) : undefined,
          end_date: endDate ? toLocalDateString(endDate) : undefined,
        },
      );
      if (currentCampaignId === campaignId) {
        setCampaignDetail(data);
      }
    } catch (error) {
      console.error("Failed to load Meta campaign detail:", error);
      setCampaignDetail(null);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [accountId, channelId, campaignId, startDate, endDate]);

  const startDateStr = startDate?.toISOString();
  const endDateStr = endDate?.toISOString();

  useEffect(() => {
    setCampaignDetail(null);
    if (accountId && campaignId && channelId) {
      loadCampaignDetail();
    } else {
      setLoading(false);
    }
  }, [
    accountId,
    campaignId,
    channelId,
    startDateStr,
    endDateStr,
    loadCampaignDetail,
  ]);

  const chartData = useMemo(() => {
    if (campaignDetail?.chart_data && campaignDetail.chart_data.length > 0) {
      return campaignDetail.chart_data.map((item) => ({
        date: item.date,
        sales: item.sales ?? 0,
        spend: item.spend ?? 0,
        clicks: item.clicks ?? 0,
        orders: 0,
      }));
    }
    return [];
  }, [campaignDetail]);

  const toggleChartMetric = useCallback(
    (metric: "sales" | "spend" | "clicks" | "orders") => {
      setChartToggles((prev) => ({ ...prev, [metric]: !prev[metric] }));
    },
    [],
  );

  const handleUpdateCampaign = useCallback(
    async (
      _field: "budget" | "status" | "start_date" | "end_date",
      _newValue: string,
    ) => {
      if (!campaignDetail) return;
      await loadCampaignDetail();
    },
    [campaignDetail, loadCampaignDetail],
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
