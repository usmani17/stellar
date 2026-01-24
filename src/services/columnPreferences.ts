import api from './api';

export interface ColumnPreference {
  id?: number;
  marketplace: string;
  entity_type: string;
  visible_columns: string[];
  column_order: string[];
  is_default?: boolean;
  preset_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const columnPreferencesService = {
  /**
   * Get column preferences for a specific marketplace and entity type
   * Returns null if no preferences are found (user should use defaults)
   */
  get: async (
    marketplace: string,
    entityType: string,
    presetName?: string
  ): Promise<ColumnPreference | null> => {
    try {
      const params = new URLSearchParams({
        marketplace,
        entity_type: entityType,
      });
      if (presetName) {
        params.append('preset_name', presetName);
      }

      const response = await api.get<ColumnPreference>(
        `/users/column-preferences/?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      // 404 means no preferences saved yet - return null to use defaults
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Save column preferences
   * Creates or updates the preference for the current user
   */
  save: async (preference: ColumnPreference): Promise<ColumnPreference> => {
    const response = await api.post<ColumnPreference>(
      '/users/column-preferences/',
      preference
    );
    return response.data;
  },

  /**
   * Delete column preferences (future - for multi-preset support)
   */
  delete: async (
    marketplace: string,
    entityType: string,
    presetName?: string
  ): Promise<void> => {
    const params = new URLSearchParams({
      marketplace,
      entity_type: entityType,
    });
    if (presetName) {
      params.append('preset_name', presetName);
    }

    await api.delete(`/users/column-preferences/?${params.toString()}`);
  },

  /**
   * List all presets for a marketplace and entity type (future - for multi-preset support)
   */
  list: async (
    marketplace: string,
    entityType: string
  ): Promise<ColumnPreference[]> => {
    const params = new URLSearchParams({
      marketplace,
      entity_type: entityType,
    });

    const response = await api.get<ColumnPreference[]>(
      `/users/column-preferences/list/?${params.toString()}`
    );
    return response.data;
  },
};
