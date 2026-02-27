import React from "react";
import { formatCurrency2Decimals } from "../../google/utils/campaignDetailHelpers";
import { normalizeStatusDisplay } from "../../../utils/statusHelpers";
import type { MetaCampaignDetailData } from "../hooks/useMetaCampaignDetail";

interface MetaCampaignInformationProps {
  campaignDetail: MetaCampaignDetailData | null;
  loading?: boolean;
}

const formatDate = (d: string | undefined) => {
  if (!d) return "—";
  try {
    const date = new Date(d);
    return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
};

export const MetaCampaignInformation: React.FC<MetaCampaignInformationProps> = ({
  campaignDetail,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-6">
        <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%] mb-4">Campaign Information</h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#136D6D] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!campaignDetail) return null;

  const c = campaignDetail.campaign;
  const budget = c.daily_budget != null && c.daily_budget !== "" ? parseFloat(String(c.daily_budget)) : null;

  return (
    <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-6">
      <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%] mb-4">Campaign Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">Campaign Name</label>
          <div className="table-text leading-[1.26]">{c.campaign_name ?? "—"}</div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">Campaign ID</label>
          <div className="table-text leading-[1.26]">{c.campaign_id ?? "—"}</div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">State</label>
          <div className="table-text leading-[1.26]">{normalizeStatusDisplay(c.status)}</div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">Budget</label>
          <div className="table-text leading-[1.26]">
            {budget != null && !isNaN(budget) ? formatCurrency2Decimals(budget) : "—"}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">Start Date</label>
          <div className="table-text leading-[1.26]">{formatDate(c.start_time)}</div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">End Date</label>
          <div className="table-text leading-[1.26]">{formatDate(c.stop_time)}</div>
        </div>
      </div>
    </div>
  );
};
