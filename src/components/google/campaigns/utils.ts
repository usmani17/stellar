// Shared utility functions and constants for Google Campaign components
// This file contains utilities extracted from CreateGoogleCampaignPanel.tsx
// Original file remains untouched - this is a copy for modular structure

import type { CreateGoogleCampaignData } from "./types";

// Constants
export const CAMPAIGN_TYPES = [
  { value: "PERFORMANCE_MAX", label: "Performance Max" },
  { value: "SHOPPING", label: "Shopping" },
  { value: "SEARCH", label: "Search" },
  { value: "DEMAND_GEN", label: "Demand Gen (YouTube video ads)" },
  // { value: "DISPLAY", label: "Display" },
  // { value: "VIDEO", label: "Video (Read-Only)", disabled: true },
];

export const STATUS_OPTIONS = [
  { value: "ENABLED", label: "Enabled" },
  { value: "PAUSED", label: "Paused" },
];

export const CAMPAIGN_PRIORITY_OPTIONS = [
  { value: 0, label: "Low (0)" },
  { value: 1, label: "Medium (1)" },
  { value: 2, label: "High (2)" },
];

export const SALES_COUNTRY_OPTIONS = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IT", label: "Italy" },
  { value: "ES", label: "Spain" },
  { value: "NL", label: "Netherlands" },
  { value: "BE", label: "Belgium" },
  { value: "SE", label: "Sweden" },
  { value: "NO", label: "Norway" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
  { value: "PL", label: "Poland" },
  { value: "JP", label: "Japan" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "IN", label: "India" },
  { value: "CN", label: "China" },
];

export const BIDDING_STRATEGIES = {
  SEARCH: [
    { value: "MANUAL_CPC", label: "Manual CPC" },
    { value: "MAXIMIZE_CONVERSIONS", label: "Maximize Conversions" },
    { value: "MAXIMIZE_CONVERSION_VALUE", label: "Maximize Conversion Value" },
    { value: "TARGET_IMPRESSION_SHARE", label: "Target Impression Share" },
    { value: "TARGET_SPEND", label: "Target Spend" },
  ],
  SHOPPING: [
    { value: "MANUAL_CPC", label: "Manual CPC" },
    // { value: "MAXIMIZE_CLICKS", label: "Maximize Clicks" },
    { value: "TARGET_ROAS", label: "Target ROAS" },
  ],
  PERFORMANCE_MAX: [
    { value: "MAXIMIZE_CONVERSIONS", label: "Maximize Conversions" },
    { value: "MAXIMIZE_CONVERSION_VALUE", label: "Maximize Conversion Value" },
  ],
  DEMAND_GEN: [
    { value: "MAXIMIZE_CONVERSIONS", label: "Maximize Conversions" },
    { value: "MAXIMIZE_CONVERSION_VALUE", label: "Maximize Conversion Value" },
    { value: "TARGET_CPA", label: "Target CPA" },
    { value: "TARGET_ROAS", label: "Target ROAS" },
  ],
  DISPLAY: [
    { value: "MANUAL_CPC", label: "Manual CPC" },
    { value: "MAXIMIZE_CONVERSIONS", label: "Maximize Conversions" },
    { value: "MAXIMIZE_CONVERSION_VALUE", label: "Maximize Conversion Value" },
    { value: "TARGET_CPA", label: "Target CPA" },
    { value: "TARGET_ROAS", label: "Target ROAS" },
    { value: "TARGET_IMPRESSION_SHARE", label: "Target Impression Share" },
    { value: "TARGET_SPEND", label: "Target Spend" },
  ],
  DEFAULT: [
    { value: "MANUAL_CPC", label: "Manual CPC" },
    { value: "MAXIMIZE_CONVERSIONS", label: "Maximize Conversions" },
    { value: "MAXIMIZE_CONVERSION_VALUE", label: "Maximize Conversion Value" },
    { value: "TARGET_CPA", label: "Target CPA" },
    { value: "TARGET_ROAS", label: "Target ROAS" },
    { value: "TARGET_IMPRESSION_SHARE", label: "Target Impression Share" },
    { value: "TARGET_SPEND", label: "Target Spend" },
  ],
};

export const DEVICE_OPTIONS = [
  { value: "MOBILE", label: "Mobile", icon: "📱" },
  { value: "DESKTOP", label: "Desktop", icon: "💻" },
  { value: "TABLET", label: "Tablet", icon: "📲" },
  { value: "CONNECTED_TV", label: "Connected TV", icon: "📺" },
];

export const MATCH_TYPE_OPTIONS = [
  { value: "BROAD", label: "Broad" },
  { value: "PHRASE", label: "Phrase" },
  { value: "EXACT", label: "Exact" },
];

// Utility Functions

/**
 * Get available bidding strategies based on campaign type
 */
export const getAvailableBiddingStrategies = (campaignType: string) => {
  const typeKey = campaignType as keyof typeof BIDDING_STRATEGIES;
  return BIDDING_STRATEGIES[typeKey] || BIDDING_STRATEGIES.DEFAULT;
};

/**
 * Get default bidding strategy for campaign type
 */
export const getDefaultBiddingStrategy = (campaignType: string): string => {
  if (campaignType === "PERFORMANCE_MAX") {
    return "MAXIMIZE_CONVERSIONS";
  } else if (campaignType === "SHOPPING") {
    return "MANUAL_CPC";
  } else if (campaignType === "DEMAND_GEN") {
    return "MAXIMIZE_CONVERSIONS";
  } else if (campaignType === "DISPLAY") {
    return "MANUAL_CPC";
  } else {
    // SEARCH
    return "MANUAL_CPC";
  }
};

/**
 * Helper function to format date as YYYY-MM-DD
 */
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Helper function to format date as "DD MMM YYYY" (e.g., "24 Dec 2025")
 */
export const formatDateForName = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * Helper function to format date and time as "DD MMM YYYY HH:MM:SS" (e.g., "20 Feb 2026 14:30:45")
 * for use in campaign/asset group names when auto-filling.
 */
export const formatTimestampForName = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${day} ${month} ${year} ${h}:${m}:${s}`;
};

/**
 * Get minimum headlines required for campaign type
 */
export const getMinHeadlines = (campaignType: string): number => {
  return (campaignType === "PERFORMANCE_MAX" || campaignType === "DEMAND_GEN") ? 3 : 1;
};

/**
 * Get minimum descriptions required for campaign type
 */
export const getMinDescriptions = (campaignType: string): number => {
  return (campaignType === "PERFORMANCE_MAX" || campaignType === "DEMAND_GEN") ? 2 : 1;
};

/**
 * Get maximum headlines allowed
 */
export const getMaxHeadlines = (): number => {
  return 15;
};

/**
 * Get maximum descriptions allowed
 * Per Google Ads API: Performance Max requires 2-5 descriptions
 */
export const getMaxDescriptions = (): number => {
  return 5;
};

/**
 * Initialize default form data for a campaign type
 */
export const getDefaultFormData = (campaignType: string): Partial<CreateGoogleCampaignData> => {
  const base = {
    campaign_type: campaignType as CreateGoogleCampaignData["campaign_type"],
    name: "",
    budget_amount: undefined,
    budget_name: "",
    status: "PAUSED" as const,
    bidding_strategy_type: getDefaultBiddingStrategy(campaignType),
    tracking_url_template: "",
    final_url_suffix: "",
    url_custom_parameters: [],
  };

  if (campaignType === "PERFORMANCE_MAX" || campaignType === "DEMAND_GEN") {
    return {
      ...base,
      final_url: "",
      headlines: Array(3).fill(""),
      descriptions: Array(2).fill(""),
      business_name: "",
      logo_url: "",
      marketing_image_url: "",
      square_marketing_image_url: "",
      long_headline: "",
    };
  }

  if (campaignType === "SHOPPING") {
    return {
      ...base,
      sales_country: "US",
      campaign_priority: 0,
      enable_local: false,
    };
  }

  if (campaignType === "SEARCH") {
    return {
      ...base,
      network_settings: {
        target_google_search: true,
        target_search_network: true,
        target_content_network: false,
        target_partner_search_network: false,
      },
    };
  }

  if (campaignType === "DEMAND_GEN") {
    return {
      ...base,
      final_url: "",
      headlines: Array(3).fill(""),
      descriptions: Array(2).fill(""),
      business_name: "",
      logo_url: "",
      video_url: "",
      video_id: "",
      channel_controls: {
        gmail: true,
        discover: true,
        display: true,
        youtube_in_feed: true,
        youtube_in_stream: true,
        youtube_shorts: true,
      },
    };
  }

  if (campaignType === "DISPLAY") {
    return {
      ...base,
      network_settings: {
        target_content_network: true,
        target_google_search: false,
        target_search_network: false,
        target_partner_search_network: false,
      },
    };
  }

  return base;
};
