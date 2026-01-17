export interface GoogleAdGroup {
  id: number;
  adgroup_id: number;
  name?: string;
  adgroup_name?: string;
  status: string;
  cpc_bid_dollars?: number;
  ctr?: number | string;
  spends?: number | string;
  sales?: number | string;
  campaign_id?: number;
  campaign_name?: string;
  headlines?: any[];
  final_urls?: string[];
}

export interface GoogleAd {
  id: number;
  ad_id: number;
  ad_type?: string;
  status?: string;
  headlines?: any[];
  descriptions?: any[];
  final_urls?: string[];
  campaign_id?: number;
  campaign_name?: string;
  adgroup_id?: number;
  adgroup_name?: string;
}

export interface GoogleKeyword {
  id: number;
  keyword_id: number;
  keyword_text?: string;
  match_type?: string;
  status?: string;
  cpc_bid_dollars?: number;
  campaign_id?: number;
  campaign_name?: string;
  adgroup_id?: number;
  adgroup_name?: string;
}

export interface GoogleNegativeKeyword {
  id: number;
  criterion_id: string;
  keyword_text?: string;
  match_type?: string;
  status?: string;
  level?: "campaign" | "adgroup";
  campaign_id?: string;
  campaign_name?: string;
  adgroup_id?: string;
  adgroup_name?: string;
}

export type FilterValues = Array<{
  field: string;
  operator: string;
  value: string;
}>;
