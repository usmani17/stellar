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

export const BIDDING_STRATEGY_OPTIONS = [
  { value: "MAXIMIZE_CONVERSIONS", label: "Maximize Conversions" },
  { value: "MAXIMIZE_CONVERSION_VALUE", label: "Maximize Conversion Value" },
  { value: "TARGET_CPA", label: "Target CPA" },
  { value: "TARGET_ROAS", label: "Target ROAS" },
  { value: "TARGET_IMPRESSION_SHARE", label: "Target Impression Share" },
  { value: "TARGET_SPEND", label: "Target Spend" },
  { value: "MANUAL_CPC", label: "Manual CPC" },
];

export const DEVICE_OPTIONS = [
  { value: "MOBILE", label: "Mobile", icon: "📱" },
  { value: "DESKTOP", label: "Desktop", icon: "💻" },
  { value: "TABLET", label: "Tablet", icon: "📲" },
  { value: "CONNECTED_TV", label: "Connected TV", icon: "📺" },
];

// Utility Functions

/**
 * Get available bidding strategies based on campaign type
 * Note: TARGET_CPA and TARGET_ROAS are not allowed during creation for SEARCH campaigns
 * per Google Ads API restrictions. They can only be set after campaign creation.
 */
export const getAvailableBiddingStrategies = (campaignType: string) => {
  if (campaignType === "PERFORMANCE_MAX") {
    // Performance Max campaigns only support: MAXIMIZE_CONVERSIONS, MAXIMIZE_CONVERSION_VALUE
    return BIDDING_STRATEGY_OPTIONS.filter(
      (opt) =>
        opt.value === "MAXIMIZE_CONVERSIONS" ||
        opt.value === "MAXIMIZE_CONVERSION_VALUE"
    );
  } else if (campaignType === "SHOPPING") {
    // Shopping campaigns: keep creation UI conservative to avoid API rejections.
    // We only allow MANUAL_CPC here (matches our inline edit restrictions and avoids conversion-value strategy errors).
    return BIDDING_STRATEGY_OPTIONS.filter(
      (opt) => opt.value === "MANUAL_CPC"
    );
  } else if (campaignType === "DEMAND_GEN") {
    // Demand Gen campaigns support: MAXIMIZE_CONVERSIONS, MAXIMIZE_CONVERSION_VALUE, TARGET_CPA, TARGET_ROAS
    return BIDDING_STRATEGY_OPTIONS.filter(
      (opt) =>
        opt.value === "MAXIMIZE_CONVERSIONS" ||
        opt.value === "MAXIMIZE_CONVERSION_VALUE" ||
        opt.value === "TARGET_CPA" ||
        opt.value === "TARGET_ROAS"
    );
  } else if (campaignType === "DISPLAY") {
    // Display campaigns support all bidding strategies
    return BIDDING_STRATEGY_OPTIONS;
  } else {
    // SEARCH - TARGET_CPA and TARGET_ROAS are not supported
    // They require conversion tracking setup and historical conversion data
    return BIDDING_STRATEGY_OPTIONS.filter(
      (opt) =>
        opt.value === "MANUAL_CPC" ||
        opt.value === "MAXIMIZE_CONVERSIONS" ||
        opt.value === "MAXIMIZE_CONVERSION_VALUE" ||
        opt.value === "TARGET_IMPRESSION_SHARE" ||
        opt.value === "TARGET_SPEND"
    );
  }
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
