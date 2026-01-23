export interface TikTokAdGroup {
    adgroup_id: string;
    adgroup_name: string;
    campaign_id?: string;
    campaign_name: string;
    operation_status: string;
    budget: number;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpc: number;
    sales: number;
}

export interface TikTokAd {
    ad_id: string;
    ad_name: string;
    adgroup_id: string;
    adgroup_name: string;
    campaign_id?: string;
    campaign_name: string;
    operation_status: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpc: number;
    sales: number;
}
