import { useState, useCallback, useEffect } from "react";
import { accountsService } from "../../../services/accounts";
import { toLocalDateString } from "../../../utils/dateHelpers";

export interface MetaAdRow {
  id: number;
  ad_id: number | string;
  ad_name: string;
  campaign_id?: number | string;
  campaign_name?: string;
  adset_id?: number | string;
  adset_name?: string;
  status?: string;
  created_time?: string;
  impressions?: number;
  clicks?: number;
  spends?: number;
  sales?: number;
  acos?: number;
  roas?: number;
}

interface UseMetaCampaignDetailAdsParams {
  channelId: string | undefined;
  campaignId: string | undefined;
  startDate: Date | null;
  endDate: Date | null;
  activeTab: string;
}

export const useMetaCampaignDetailAds = ({
  channelId,
  campaignId,
  startDate,
  endDate,
  activeTab,
}: UseMetaCampaignDetailAdsParams) => {
  const [ads, setAds] = useState<MetaAdRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const loadAds = useCallback(async () => {
    if (!channelId || !campaignId) return;
    const channelIdNum = parseInt(channelId, 10);
    if (isNaN(channelIdNum)) return;
    try {
      setLoading(true);
      const data = await accountsService.getMetaAds(channelIdNum, {
        filters: [{ field: "campaign_id", value: campaignId }],
        page: currentPage,
        page_size: 10,
        sort_by: sortBy,
        order: sortOrder,
        start_date: startDate ? toLocalDateString(startDate) : undefined,
        end_date: endDate ? toLocalDateString(endDate) : undefined,
      });
      setAds(data.ads || []);
      setTotalPages(data.total_pages ?? 0);
    } catch (error) {
      console.error("Failed to load Meta ads:", error);
      setAds([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [channelId, campaignId, currentPage, sortBy, sortOrder, startDate, endDate]);

  useEffect(() => {
    if (activeTab === "Ads" && channelId && campaignId) {
      loadAds();
    }
  }, [activeTab, channelId, campaignId, loadAds]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(ads.map((a) => a.ad_id ?? a.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [ads]);

  const handleSelectOne = useCallback((id: string | number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSort = useCallback((column: string) => {
    setSortBy(column);
    setSortOrder((prev) => (sortBy === column ? (prev === "asc" ? "desc" : "asc") : "asc"));
  }, [sortBy]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return {
    ads,
    loading,
    selectedIds,
    setSelectedIds,
    currentPage,
    totalPages,
    sortBy,
    sortOrder,
    loadAds,
    handleSelectAll,
    handleSelectOne,
    handleSort,
    handlePageChange,
  };
};
