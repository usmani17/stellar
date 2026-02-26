import { useState, useCallback, useEffect } from "react";
import { accountsService } from "../../../services/accounts";
import { toLocalDateString } from "../../../utils/dateHelpers";

export interface MetaCreativeRow {
  id: number;
  creative_id: string | number;
  creative_name: string;
  campaign_id?: string | number;
  campaign_name?: string;
  ad_id?: string | number;
  ad_name?: string;
  status?: string;
  impressions?: number;
  clicks?: number;
  spends?: number;
  sales?: number;
  acos?: number;
  roas?: number;
}

interface UseMetaCampaignDetailCreativesParams {
  channelId: string | undefined;
  campaignId: string | undefined;
  startDate: Date | null;
  endDate: Date | null;
  activeTab: string;
}

export const useMetaCampaignDetailCreatives = ({
  channelId,
  campaignId,
  startDate,
  endDate,
  activeTab,
}: UseMetaCampaignDetailCreativesParams) => {
  const [creatives, setCreatives] = useState<MetaCreativeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const loadCreatives = useCallback(async () => {
    if (!channelId || !campaignId) return;
    const channelIdNum = parseInt(channelId, 10);
    if (isNaN(channelIdNum)) return;
    try {
      setLoading(true);
      const data = await accountsService.getMetaCreatives(channelIdNum, {
        filters: [{ field: "campaign_id", operator: "equals", value: campaignId }],
        page: currentPage,
        page_size: 10,
        sort_by: sortBy,
        order: sortOrder,
        start_date: startDate ? toLocalDateString(startDate) : undefined,
        end_date: endDate ? toLocalDateString(endDate) : undefined,
      });
      setCreatives(data.creatives || []);
      setTotalPages(data.total_pages ?? 0);
    } catch (error) {
      console.error("Failed to load Meta creatives:", error);
      setCreatives([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [channelId, campaignId, currentPage, sortBy, sortOrder, startDate, endDate]);

  useEffect(() => {
    if (activeTab === "Creatives" && channelId && campaignId) {
      loadCreatives();
    }
  }, [activeTab, channelId, campaignId, loadCreatives]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(creatives.map((c) => c.creative_id ?? c.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [creatives]);

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
    creatives,
    loading,
    selectedIds,
    setSelectedIds,
    currentPage,
    totalPages,
    sortBy,
    sortOrder,
    loadCreatives,
    handleSelectAll,
    handleSelectOne,
    handleSort,
    handlePageChange,
  };
};
