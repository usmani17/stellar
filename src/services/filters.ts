import api from './api';
import type { FilterDefinition, FilterDefinitionsResponse, Filter } from '../types/filters';

export const filtersService = {
  /**
   * Fetch filter definitions for a specific page type
   */
  getFilterDefinitions: async (pageType: string): Promise<FilterDefinition[]> => {
    const response = await api.get<FilterDefinitionsResponse>(`/accounts/filters/${pageType}/`);
    return response.data.filters || [];
  },

  /**
   * Apply filters to an endpoint via POST request
   * @param endpoint - The endpoint URL (e.g., '/accounts/1/campaigns/')
   * @param filters - Array of filters to apply
   * @param additionalParams - Additional parameters like sort_by, order, page, page_size, start_date, end_date
   */
  applyFilters: async <T>(
    endpoint: string,
    filters: Filter[],
    additionalParams?: {
      sort_by?: string;
      order?: 'asc' | 'desc';
      page?: number;
      page_size?: number;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<T> => {
    const payload = {
      filters,
      ...additionalParams,
    };
    const response = await api.post<T>(endpoint, payload);
    return response.data;
  },
};

