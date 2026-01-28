/**
 * Dynamic filter service for fetching filter metadata from backend API
 * This service will eventually be used by all marketplaces (Amazon, Google AdWords, TikTok, etc.)
 */
import api from './api';

export interface FilterField {
  field_name: string;
  label: string;
  type: 'string' | 'number' | 'static_dropdown' | 'dynamic_dropdown' | 'multi_select';
  operators: string[];
  default_operator: string | null;
  options: Array<{ value: string; label: string }> | null;
  required?: boolean;
}

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * Get filter field definitions for a marketplace
 * 
 * @param accountId - Account ID
 * @param marketplace - Marketplace identifier (e.g., "google_adwords", "amazon", "tiktok")
 * @param entityType - Optional entity type (e.g., "campaigns", "adgroups", "ads", "keywords")
 * @param channelId - Optional channel ID (required for Google AdWords)
 * @returns Promise resolving to array of filter field definitions
 */
export const getFilterFields = async (
  accountId: string | number,
  marketplace: string,
  entityType?: string,
  channelId?: string | number
): Promise<FilterField[]> => {
  try {
    const params: Record<string, string> = {};
    if (entityType) {
      params.entity_type = entityType;
    }
    // For Google AdWords, include channelId in the URL path
    if (marketplace === "google_adwords" && channelId) {
      const channelIdNum = typeof channelId === "number" ? channelId : parseInt(channelId, 10);
      if (!isNaN(channelIdNum)) {
        const response = await api.get<FilterField[]>(
          `/accounts/${accountId}/channels/${channelIdNum}/filters/${marketplace}/`,
          { params }
        );
        return response.data;
      }
    }
    // For other marketplaces or when channelId is not provided, use the original URL
    const response = await api.get<FilterField[]>(
      `/accounts/${accountId}/filters/${marketplace}/`,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching filter fields:', error);
    throw error;
  }
};

/**
 * Get dynamic options for a filter field
 * 
 * @param accountId - Account ID
 * @param marketplace - Marketplace identifier (e.g., "google_adwords", "amazon", "tiktok")
 * @param fieldName - Name of the field to get options for
 * @returns Promise resolving to array of filter options
 */
export const getFilterOptions = async (
  accountId: string | number,
  marketplace: string,
  fieldName: string
): Promise<FilterOption[]> => {
  try {
    const response = await api.get<FilterOption[]>(
      `/accounts/${accountId}/filters/${marketplace}/${fieldName}/options/`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching filter options:', error);
    throw error;
  }
};
