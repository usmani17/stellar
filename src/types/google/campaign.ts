import { CAMPAIGN_STATUS_SAVED_DRAFT } from "../../constants/google";
import type { ICampaignDraft } from "./campaignDraft";

export type GoogleCampaignStatus = "ENABLED" | "PAUSED" | "REMOVED" | typeof CAMPAIGN_STATUS_SAVED_DRAFT;

export interface IGoogleCampaign {
    id: number;
    campaign_id: number | string;
    customer_id: string;
    campaign_name: string;
    account_name?: string;
    status: GoogleCampaignStatus;
    advertising_channel_type: string;
    advertising_channel_sub_type?: string;
    bidding_strategy_type?: string;
    start_date?: string;
    end_date?: string;
    daily_budget: number;
    budget_amount_micros?: number;
    budget_delivery_method?: string;
    serving_status?: string;
    last_sync?: string;
    // Performance metrics
    spends?: number;
    sales?: number;
    impressions?: number;
    clicks?: number;
    conversions?: number;
    interactions?: number;
    conversion_rate?: number;
    interaction_rate?: number;
    avg_cpc?: number;
    cost_per_conversion?: number;
    acos?: number;
    roas?: number;
    // Extra data (JSONB) - contains shopping_setting, network_settings, draft_state, etc.
    extra_data?: {
        shopping_setting?: {
            merchant_id?: string;
            sales_country?: string;
            campaign_priority?: number;
            enable_local?: boolean;
        };
        network_settings?: {
            target_google_search?: boolean;
            target_search_network?: boolean;
            target_content_network?: boolean;
            target_partner_search_network?: boolean;
        };
        /** Draft payload when campaign is a draft (agent-created or saved draft). */
        draft_state?: ICampaignDraft | null;
        [key: string]: any;
    };
}

export interface IGoogleCampaignsSummary {
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
}

export interface IGoogleCampaignsTableProps {
    campaigns: IGoogleCampaign[];
    loading: boolean;
    sorting: boolean;
    accountId: string;
    channelId?: string;
    selectedCampaigns: Set<string | number>;
    allSelected: boolean;
    someSelected: boolean;
    sortBy: string;
    sortOrder: "asc" | "desc";
    editingCell: {
        campaignId: string | number;
        field: "budget" | "status" | "start_date" | "end_date" | "bidding_strategy_type";
    } | null;
    editedValue: string;
    isCancelling: boolean;
    updatingField: {
        campaignId: string | number;
        field: "budget" | "status" | "start_date" | "end_date" | "bidding_strategy_type";
        newValue: string;
    } | null;
    summary: IGoogleCampaignsSummary | null;
    visibleColumns?: Set<string>;
    columnOrder?: string[];
    inlineEditSuccess?: {
        campaignId: string | number;
        field: string;
    } | null;
    inlineEditError?: {
        campaignId: string | number;
        field: string;
        message: string;
    } | null;
    onSelectAll: (checked: boolean) => void;
    onSelectCampaign: (campaignId: string | number, checked: boolean) => void;
    onSort: (column: string) => void;
    onStartInlineEdit: (campaign: IGoogleCampaign, field: "budget" | "status" | "start_date" | "end_date" | "bidding_strategy_type") => void;
    onCancelInlineEdit: () => void;
    onInlineEditChange: (value: string) => void;
    onConfirmInlineEdit: (value?: string, field?: string, campaignId?: string | number) => void;
    onConfirmInlineEditDirect?: (value: string, campaignId?: string | number, field?: string) => void;
    formatCurrency: (value: number) => string;
    formatPercentage: (value: number) => string;
    getStatusBadge: (status: string) => React.ReactElement;
    getChannelTypeLabel: (type?: string) => string;
    getSortIcon: (column: string) => React.ReactElement;
    onEditCampaign?: (campaign: IGoogleCampaign) => void;
    editLoadingCampaignId?: string | number | null;
    onPublishDraft?: (campaign: IGoogleCampaign) => void;
    publishLoadingCampaignId?: string | number | null;
    isPanelOpen?: boolean; // When true, editable fields become read-only
    /** Currency code for the currency column (e.g. USD, AUD, EUR). Shown before Impressions. */
    currencyCode?: string;
}