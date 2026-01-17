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
 * @returns Promise resolving to array of filter field definitions
 */
export const getFilterFields = async (
  accountId: string | number,
  marketplace: string
): Promise<FilterField[]> => {
  try {
    const response = await api.get<FilterField[]>(
      `/accounts/${accountId}/filters/${marketplace}/`
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
