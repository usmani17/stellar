import api from "../api";

export const googleAdwordsCampaignsService = {
  createGoogleCampaign: async (
    accountId: number,
    payload: {
      campaign_type: "PERFORMANCE_MAX" | "SHOPPING" | "SEARCH";
      customer_id?: string; // Optional - for selecting specific profile
      name: string;
      budget_amount: number; // In dollars, backend converts to micros
      budget_name?: string;
      start_date?: string; // YYYY-MM-DD format
      end_date?: string; // YYYY-MM-DD format
      status?: "ENABLED" | "PAUSED";
      bidding_strategy_type?: string;
      target_cpa_micros?: number; // Target CPA in micros (e.g., 1000000 = $1.00)
      target_roas?: number; // Target ROAS (e.g., 3.0 = 300%)
      target_impression_share_location?: string; // TOP_OF_PAGE, ABSOLUTE_TOP_OF_PAGE, ANYWHERE_ON_PAGE
      target_impression_share_location_fraction_micros?: number; // Target impression share in micros (e.g., 800000 = 80%)
      target_impression_share_cpc_bid_ceiling_micros?: number; // Maximum CPC bid ceiling in micros (e.g., 1000000 = $1.00)
      // Performance Max fields
      final_url?: string;
      asset_group_name?: string;
      headlines?: string[]; // Min 3, max 15
      descriptions?: string[]; // Min 2, max 4
      business_name?: string;
      logo_url?: string;
      marketing_image_url?: string;
      square_marketing_image_url?: string;
      long_headline?: string;
      // Shopping fields
      merchant_id?: string;
      sales_country?: string; // Default "US"
      campaign_priority?: number; // 0-2, default 0
      enable_local?: boolean;
      // Search fields
      adgroup_name?: string; // Default "Ad Group 1"
      keywords?: string[] | string; // Can be array or comma-separated string
      match_type?: "BROAD" | "PHRASE" | "EXACT"; // Default "BROAD"
    }
  ): Promise<{
    success: boolean;
    message: string;
    campaign_resource_name: string;
    customer_id: string;
    campaign_id?: string;
  }> => {
    const url = `/google-adwords/${accountId}/campaigns/create/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  createGoogleSearchEntities: async (
    accountId: number,
    campaignId: number,
    payload: {
      adgroup_id?: number; // Optional: use existing adgroup
      adgroup?: {
        name: string;
        cpc_bid?: number; // Optional, in dollars
      };
      ad?: {
        headlines: string[]; // Min 3, max 15
        descriptions: string[]; // Min 2, max 4
        final_url?: string; // Optional
      };
      keywords?: Array<{
        text: string;
        match_type: "EXACT" | "PHRASE" | "BROAD";
        cpc_bid?: number; // Optional, in dollars
      }>;
    }
  ): Promise<{
    adgroup?: {
      id: string;
      resource_name: string;
      name: string;
    };
    ad?: {
      id: string;
      resource_name: string;
      headlines: string[];
      descriptions: string[];
    };
    keywords?: Array<{
      id: string;
      resource_name: string;
      text: string;
      match_type: string;
    }>;
    errors?: string[];
    error_details?: Array<{
      entity?: string;
      type?: string;
      policy_name?: string;
      policy_description?: string;
      violating_text?: string;
      error_code?: string;
      message?: string;
      is_exemptible?: boolean;
      user_message?: string;
    }>;
  }> => {
    const url = `/google-adwords/${accountId}/campaigns/${campaignId}/search-entities/create/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  createGooglePmaxAssetGroup: async (
    accountId: number,
    campaignId: number,
    payload: {
      asset_group: {
        name: string;
        final_url?: string; // Optional
      };
      assets: {
        headlines: string[]; // Min 3, max 15
        descriptions: string[]; // Min 2, max 4
        long_headline: string; // Required
      };
    }
  ): Promise<{
    asset_group: {
      id: string;
      resource_name: string;
      name: string;
    };
    assets: {
      headlines: number;
      descriptions: number;
      long_headline: string;
    };
    error?: string;
  }> => {
    const url = `/google-adwords/${accountId}/campaigns/${campaignId}/pmax-asset-group/create/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  createGoogleShoppingEntities: async (
    accountId: number,
    campaignId: number,
    payload: {
      adgroup_id?: number; // Optional: use existing adgroup
      adgroup?: {
        name: string;
      };
      product_group: {
        cpc_bid?: number; // Optional, in dollars, default 0.01
      };
    }
  ): Promise<{
    adgroup?: {
      id: string;
      resource_name: string;
      name: string;
    };
    product_group?: {
      id: string;
      resource_name: string;
    };
    error?: string;
  }> => {
    const url = `/google-adwords/${accountId}/campaigns/${campaignId}/shopping-entities/create/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  // Google Campaigns
  syncGoogleCampaigns: async (
    accountId: number
  ): Promise<{ synced: number; errors?: string[]; message?: string }> => {
    const response = await api.post(
      `/google-adwords/${accountId}/campaigns/sync/`
    );
    return response.data;
  },

  syncGoogleCampaignAnalytics: async (
    accountId: number,
    startDate?: string,
    endDate?: string
  ): Promise<{
    synced: number;
    rows_inserted?: number;
    rows_updated?: number;
    rows_deleted?: number;
    errors?: string[];
    message?: string;
    customer_stats?: any;
    date_range?: any;
  }> => {
    const payload: any = {};
    if (startDate) payload.start_date = startDate;
    if (endDate) payload.end_date = endDate;
    const response = await api.post(
      `/google-adwords/${accountId}/campaigns/analytics-sync/`,
      payload
    );
    return response.data;
  },

  getGoogleCampaigns: async (
    accountId: number,
    params?: {
      filters?: Array<{ field: string; operator?: string; value: any }>; // Dynamic filters from DynamicFilterPanel
      sort_by?: string;
      order?: "asc" | "desc";
      page?: number;
      page_size?: number;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<{
    campaigns: any[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    chart_data?: Array<{
      date: string;
      spend: number;
      sales: number;
      impressions?: number;
      clicks?: number;
    }>;
    summary?: {
      total_campaigns: number;
      total_spends: number;
      total_sales: number;
      total_impressions: number;
      total_clicks: number;
      total_conversions?: number;
      total_interactions?: number;
      total_budget?: number;
      avg_acos: number;
      avg_roas: number;
      avg_conversion_rate?: number;
      avg_cost_per_conversion?: number;
      avg_interaction_rate?: number;
      avg_cost?: number;
      avg_cpc?: number;
    };
  }> => {
    // Send filters array and params directly to backend - let backend handle conversion
    // Ensure filters is always an array, not an object
    const filtersArray = Array.isArray(params?.filters) 
      ? params.filters 
      : params?.filters 
        ? [params.filters] // If it's an object, wrap it (shouldn't happen but safety check)
        : [];
    
    const payload: any = {
      filters: filtersArray,
      sort_by: params?.sort_by,
      order: params?.order,
      page: params?.page,
      page_size: params?.page_size,
      start_date: params?.start_date,
      end_date: params?.end_date,
    };

    console.log("🔍 [SERVICE DEBUG] Payload being sent to backend:", payload);

    const response = await api.post(
      `/google-adwords/${accountId}/campaigns/`,
      payload
    );
    return response.data;
  },

  bulkUpdateGoogleCampaigns: async (
    accountId: number,
    payload: {
      campaignIds: Array<string | number>;
      action: "name" | "status" | "budget" | "start_date" | "end_date" | "bidding_strategy";
      name?: string;
      status?: "ENABLED" | "PAUSED" | "REMOVED";
      budget?: number;
      start_date?: string;
      end_date?: string;
      bidding_strategy_type?: string;
      target_cpa_micros?: number;
      target_roas?: number;
      target_impression_share_location?: string;
      target_impression_share_location_fraction_micros?: number;
      target_impression_share_cpc_bid_ceiling_micros?: number;
      budgetAction?: "increase" | "decrease" | "set";
      unit?: "percent" | "amount";
      value?: number;
      upperLimit?: number;
      lowerLimit?: number;
    }
  ) => {
    const url = `/google-adwords/${accountId}/campaigns/bulk-update/`;
    const response = await api.post(url, payload);
    return response.data;
  },

  updateGooglePmaxAssetGroup: async (
    accountId: number,
    campaignId: string | number,
    assetData: {
      asset_group_name?: string;
      final_url?: string;
      headlines?: string[];
      descriptions?: string[];
      long_headline?: string;
      marketing_image_url?: string;
      square_marketing_image_url?: string;
      business_name?: string;
      logo_url?: string;
    }
  ) => {
    const url = `/google-adwords/${accountId}/campaigns/${campaignId}/update-asset-group/`;
    const response = await api.post(url, assetData);
    return response.data;
  },

  exportGoogleCampaigns: async (
    accountId: number,
    params?: {
      filters?: Array<{ field: string; operator?: string; value: any }>; // Dynamic filters from DynamicFilterPanel
      sort_by?: string;
      order?: "asc" | "desc";
      page?: number;
      page_size?: number;
      start_date?: string;
      end_date?: string;
    },
    exportType: "current_view" | "all_data" = "all_data"
  ): Promise<{ url: string; filename: string }> => {
    // Send filters array and params directly to backend - let backend handle conversion
    const payload: any = {
      filters: params?.filters || [],
      sort_by: params?.sort_by,
      order: params?.order,
      page: params?.page,
      page_size: params?.page_size,
      start_date: params?.start_date,
      end_date: params?.end_date,
      export_type: exportType,
    };

    const url = `/google-adwords/${accountId}/campaigns/export/`;
    const response = await api.post<{ url: string; filename: string }>(url, payload);
    return response.data;
  },

  // Google Campaign Detail
  getGoogleCampaignDetail: async (
    accountId: number,
    campaignId: string | number,
    startDate?: string,
    endDate?: string
  ): Promise<any> => {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    const queryString = params.toString();
    const url = `/google-adwords/${accountId}/campaigns/${campaignId}/${queryString ? `?${queryString}` : ""
      }`;
    const response = await api.get(url);
    return response.data;
  },

  // Refresh Google Campaign from API
  refreshGoogleCampaignFromAPI: async (
    accountId: number,
    campaignId: string | number
  ): Promise<{
    success: boolean;
    message: string;
    campaign: {
      campaign_id: string | number;
      name: string;
      status: string;
      campaign_type: string;
      budget_amount: number;
      daily_budget: number;
      start_date?: string;
      end_date?: string;
      extra_data: {
        headlines?: string[];
        descriptions?: string[];
        final_url?: string;
        business_name?: string;
        logo_url?: string;
        marketing_image_url?: string;
        square_marketing_image_url?: string;
        long_headline?: string;
        asset_group_name?: string;
        shopping_setting?: {
          merchant_id?: string;
          sales_country?: string;
          campaign_priority?: number;
          enable_local?: boolean;
        };
      };
      merchant_id?: string;
      sales_country?: string;
      campaign_priority?: number;
      enable_local?: boolean;
    };
  }> => {
    const url = `/google-adwords/${accountId}/campaigns/${campaignId}/refresh/`;
    const response = await api.post(url);
    return response.data;
  },
};
