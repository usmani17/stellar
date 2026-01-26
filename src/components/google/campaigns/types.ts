// Shared types and interfaces for Google Campaign components
// This file contains types extracted from CreateGoogleCampaignPanel.tsx
// Original file remains untouched - this is a copy for modular structure

export interface RefreshMessage {
  type: "loading" | "success" | "error";
  message: string;
  details?: string;
}

export interface CreateGoogleCampaignPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateGoogleCampaignData) => Promise<void>;
  accountId?: string;
  loading?: boolean;
  submitError?: string | null;
  mode?: "create" | "edit";
  initialData?: Partial<CreateGoogleCampaignData> | null;
  campaignId?: string | number;
  refreshMessage?: RefreshMessage | null;
}

export interface CreateGoogleCampaignData {
  campaign_type: "PERFORMANCE_MAX" | "SHOPPING" | "SEARCH" | "DEMAND_GEN" | "DISPLAY" | "VIDEO";
  customer_id?: string;
  name: string;
  budget_amount: number;
  budget_name?: string;
  start_date?: string; // YYYY-MM-DD format
  end_date?: string; // YYYY-MM-DD format
  status?: "ENABLED" | "PAUSED";
  bidding_strategy_type?: string;
  target_cpa_micros?: number; // Target CPA in micros (e.g., 1000000 = $1.00)
  target_roas?: number; // Target ROAS (e.g., 3.0 = 300%)
  target_spend_micros?: number; // Target Spend in micros (e.g., 1000000 = $1.00)
  target_impression_share_location?: string; // TOP_OF_PAGE, ABSOLUTE_TOP_OF_PAGE, ANYWHERE_ON_PAGE
  target_impression_share_location_fraction_micros?: number; // Target impression share in micros (e.g., 800000 = 80%)
  target_impression_share_cpc_bid_ceiling_micros?: number; // Maximum CPC bid ceiling in micros (e.g., 1000000 = $1.00)
  // Performance Max fields
  final_url?: string;
  asset_group_name?: string;
  headlines?: string[];
  descriptions?: string[];
  business_name?: string;
  logo_url?: string;
  marketing_image_url?: string;
  square_marketing_image_url?: string;
  long_headline?: string;
  // URL options
  tracking_url_template?: string;
  final_url_suffix?: string;
  url_custom_parameters?: Array<{ key: string; value: string }>;
  // Shopping fields
  merchant_id?: string;
  sales_country?: string;
  campaign_priority?: number;
  enable_local?: boolean;
  location_ids?: number[];  // Array of location criterion IDs to target
  excluded_location_ids?: string[];  // Array of location criterion IDs to exclude
  language_ids?: string[];  // Array of language constant IDs to target
  device_ids?: string[];  // Array of device type IDs to target (MOBILE, DESKTOP, TABLET, CONNECTED_TV)
  // Search fields
  adgroup_name?: string;
  keywords?: string[] | string; // Can be array or comma-separated string
  match_type?: "BROAD" | "PHRASE" | "EXACT";
  language_codes?: string[]; // Language codes for language targeting
  conversion_action_ids?: string[]; // Conversion action IDs for selective optimization
  // Demand Gen fields
  video_url?: string;
  video_id?: string;
  ad_group_name?: string;
  ad_name?: string;
  ad_type?: string;
  channel_controls?: {
    gmail?: boolean;
    discover?: boolean;
    display?: boolean;
    youtube_in_feed?: boolean;
    youtube_in_stream?: boolean;
    youtube_shorts?: boolean;
  };
  // Display fields
  network_settings?: {
    target_content_network?: boolean;
    target_google_search?: boolean;
    target_search_network?: boolean;
    target_partner_search_network?: boolean;
  };
}

// Props for campaign type-specific form components
export interface BaseCampaignFormProps {
  formData: CreateGoogleCampaignData;
  errors: Partial<Record<keyof CreateGoogleCampaignData, string>>;
  onChange: (field: keyof CreateGoogleCampaignData, value: any) => void;
  mode?: "create" | "edit";
}

// Props for components that need additional data
export interface ShoppingCampaignFormProps extends BaseCampaignFormProps {
  merchantAccountOptions: Array<{ value: string; label: string }>;
  loadingMerchantAccounts: boolean;
  merchantAccountsError: string | null;
  onFetchMerchantAccounts: () => void;
  // Language targeting props (optional for Shopping campaigns)
  languageOptions?: Array<{ value: string; label: string; id: string }>;
  loadingLanguages?: boolean;
}

export interface LocationTargetingProps extends BaseCampaignFormProps {
  locationOptions: Array<{ value: string; label: string; id: string; type: string; countryCode: string }>;
  loadingLocations: boolean;
}

export interface LanguageTargetingProps extends BaseCampaignFormProps {
  languageOptions: Array<{ value: string; label: string; id: string }>;
  loadingLanguages: boolean;
}
