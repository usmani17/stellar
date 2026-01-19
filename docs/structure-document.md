# Stellar Frontend - Architecture & Structure Document

**Last Updated:** January 2026  
**Version:** 1.0

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Directory Structure](#directory-structure)
3. [Mandatory Rules for Each Module](#mandatory-rules-for-each-module)
4. [File Size Management](#file-size-management)
5. [Adding a New Platform](#adding-a-new-platform)
6. [API Integration](#api-integration)
7. [State Management](#state-management)
8. [Testing Strategy](#testing-strategy)
9. [Team Implementation Checklist](#team-implementation-checklist)

---

## System Overview

### Purpose

Stellar is a multi-platform advertising management dashboard that provides unified control over advertising campaigns across multiple channels:
- **Google Ads** - Search and display advertising
- **Amazon Ads** - Product advertising and sponsored ads
- **TikTok Ads** - Social media advertising

The frontend application enables:
- Campaign creation, editing, and management
- Real-time performance monitoring and analytics
- Account synchronization across platforms
- Batch operations and filtering capabilities
- User authentication and authorization

### Key Integrations with Backend API

The frontend communicates with a REST API backend providing:

| Module | Endpoints | Purpose |
|--------|-----------|---------|
| **Campaigns** | `/api/{platform}/{accountId}/campaigns/*` | CRUD operations for campaigns (platform: google, amazon, tiktok) |
| **Accounts** | `/api/accounts/*` | Account management and synchronization |
| **Channels** | `/api/channels/*` | Channel/platform configuration |
| **Keywords** | `/api/{platform}/{accountId}/keywords/*` | Keyword management for search advertising |
| **Targets** | `/api/{platform}/{accountId}/targets/*` | Audience targeting and refinement |
| **Logs** | `/api/logs/*` | Activity and change history logging |
| **Analytics** | `/api/{platform}/{accountId}/analytics/*` | Performance metrics and reporting |

### Technology Stack

- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS with custom CSS variables
- **State Management:** React Context API + React Query
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **UI Components:** Custom components + shadcn/ui patterns

---

## Directory Structure

### Mandatory Directory Layout

```
stellar-frontend/
├── src/
│   ├── assets/                # Static assets and global data
│   │   ├── fonts/             # Font files
│   │   ├── images/            # Images and SVGs
│   │   └── global.json        # Global constants and configuration
│   │
│   ├── components/            # Reusable UI components
│   │   ├── ui/                # Primitive UI components (Button, Input, etc.)
│   │   ├── layout/            # Layout components (Header, Sidebar, etc.)
│   │   ├── filters/           # Filter and search components
│   │   ├── charts/            # Chart and visualization components
│   │   ├── [platform]/        # Platform-specific components
│   │   │   ├── google/
│   │   │   ├── amazon/
│   │   │   └── tiktok/
│   │   └── [shared]/         # Shared feature components (not platform-specific)
│   │       ├── logs/
│   │       └── accounts/
│   │
│   ├── contexts/              # React Context for state management
│   │   ├── AuthContext.tsx
│   │   ├── AccountsContext.tsx
│   │   ├── GlobalStateContext.tsx
│   │   └── [FeatureContext].tsx
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── mutations/         # Mutation hooks (useCreateCampaign, etc.)
│   │   └── queries/           # Query hooks (useCampaigns, etc.)
│   │
│   ├── pages/                 # Page components (route destinations)
│   │   ├── [platform]/        # Platform-specific pages
│   │   │   ├── GoogleCampaigns.tsx
│   │   │   └── components/    # Page-specific components
│   │   └── [feature].tsx      # Feature pages
│   │
│   ├── services/              # API integration and business logic
│   │   ├── api.ts             # Base API client configuration
│   │   ├── auth.ts            # Authentication services
│   │   ├── campaigns.ts       # Campaign API calls
│   │   ├── accounts.ts        # Account API calls
│   │   └── [feature].ts       # Feature-specific services
│   │
│   ├── styles/                # Global styles and style utilities
│   │   ├── typography.css
│   │   ├── datepicker.css
│   │   └── auth-styles.json
│   │
│   ├── types/                 # TypeScript type definitions
│   │   ├── filters.ts
│   │   └── [domain].ts
│   │
│   ├── utils/                 # Utility functions
│   │   ├── dateHelpers.ts
│   │   ├── urlHelpers.ts
│   │   └── [utility].ts
│   │
│   ├── lib/                   # Library utilities and configs
│   │   ├── cn.ts              # Class name utility
│   │   └── queryClient.ts     # React Query configuration
│   │
│   ├── App.tsx                # Root component
│   ├── index.css              # Global styles
│   └── main.tsx               # Application entry point
│
├── public/                    # Static files served as-is
├── scripts/                   # Build and utility scripts
├── docs/                      # Documentation
└── [config files]             # tsconfig.json, vite.config.ts, etc.
```

### Directory Purpose Reference

| Directory | Purpose | Characteristics |
|-----------|---------|-----------------|
| `components/` | Reusable UI building blocks | Stateless or locally stateful, composable |
| `pages/` | Full-page route components | Connected to router, may use multiple components |
| `services/` | API communication layer | Pure functions, no React hooks |
| `hooks/` | Custom React hooks | Encapsulate logic, may use Context/Query |
| `contexts/` | Global state providers | Define contexts and consumption patterns |
| `utils/` | Helper functions | Pure utility functions, no side effects |
| `types/` | TypeScript definitions | Domain and API types |
| `assets/` | Static resources | Images, fonts, static data |

---

## Mandatory Rules for Each Module

### 1. React Components

#### Rules

1. **File Naming:** PascalCase for component files (e.g., `GoogleCampaignsTable.tsx`)
2. **Export Style:** Named exports preferred; default export for page components only
3. **Props Interface:** Define a `[ComponentName]Props` interface for all component props
4. **Memoization:** Use `React.memo()` for components receiving the same props frequently
5. **Custom Hooks:** Extract complex logic into custom hooks in `hooks/` directory
6. **Dependency Management:** Properly manage `useMemo` and `useCallback` dependencies
7. **File Size Limit:** Components should not exceed 500 lines; split if larger
8. **TypeScript:** Full type annotations required; no `any` types without justification

#### Example: Table Component with Inline Editing

```typescript
// src/components/campaigns/CampaignsTable.tsx
import React, { useMemo, useState } from "react";
import type { ColumnDefinition, Campaign } from "@/types";

interface CampaignsTableProps {
  campaigns: Campaign[];
  loading: boolean;
  onUpdateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>;
}

export const CampaignsTable: React.FC<CampaignsTableProps> = ({
  campaigns,
  loading,
  onUpdateCampaign,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Properly memoize columns with all dependencies
  const columns: ColumnDefinition[] = useMemo(() => [
    {
      key: "name",
      label: "Campaign Name",
      editable: false,
      render: (row: Campaign) => row.name,
    },
    {
      key: "status",
      label: "Status",
      editable: true,
      render: (row: Campaign) => row.status,
    },
    {
      key: "budget",
      label: "Daily Budget",
      editable: true,
      render: (row: Campaign) => `$${row.daily_budget}`,
    },
  ], []);

  const handleSaveEdit = async (id: string) => {
    try {
      await onUpdateCampaign(id, { budget: parseFloat(editValue) });
      setEditingId(null);
    } catch (error) {
      console.error("Failed to update campaign:", error);
    }
  };

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b bg-gray-50">
          {columns.map(col => (
            <th key={col.key} className="px-4 py-2 text-left text-sm font-medium text-gray-700">
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {campaigns.map(campaign => (
          <tr key={campaign.id} className="border-b hover:bg-gray-50">
            {columns.map(col => (
              <td key={col.key} className="px-4 py-2 text-sm">
                {editingId === campaign.id && col.editable ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleSaveEdit(campaign.id)}
                    className="border rounded px-2 py-1"
                    autoFocus
                  />
                ) : (
                  col.render(campaign)
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

---

### 2. Services (API Integration)

#### Rules

1. **File Naming:** camelCase (e.g., `campaigns.ts`, `googleAds.ts`)
2. **Pure Functions:** No React hooks; return promises or observables
3. **Error Handling:** Wrap API calls with try-catch; provide meaningful error messages
4. **Request/Response Types:** Define TypeScript interfaces for all API contracts
5. **Base URL Management:** Use centralized `api.ts` for configuration
6. **Retry Logic:** Implement exponential backoff for network failures
7. **Caching:** Leverage React Query for caching; don't duplicate in services

#### Example: Campaign Service

```typescript
// src/services/campaigns.ts
import { api } from "./api";
import type { Campaign, CreateCampaignPayload, UpdateCampaignPayload } from "@/types/campaign";

// API Response Types
interface CampaignListResponse {
  data: Campaign[];
  total: number;
  page: number;
  limit: number;
}

interface CampaignDetailResponse {
  data: Campaign;
  related_metrics: any;
}

// Error handling helper
class CampaignAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = "CampaignAPIError";
  }
}

// Service functions
export const campaignsService = {
  /**
   * Fetch campaigns with optional filtering
   * @param accountId - Account ID to fetch campaigns for
   * @param platform - Platform (google, amazon, tiktok)
   * @param params - Query parameters (page, limit, sort, filter)
   */
  async getCampaigns(
    accountId: string,
    platform: "google" | "amazon" | "tiktok",
    params?: {
      page?: number;
      limit?: number;
      sort?: string;
      filter?: string;
    }
  ): Promise<CampaignListResponse> {
    try {
      const response = await api.get<CampaignListResponse>(
        `/accounts/${accountId}/${platform}/campaigns`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw new CampaignAPIError(
        "Failed to fetch campaigns",
        (error as any).response?.status,
        error as Error
      );
    }
  },

  /**
   * Get single campaign details
   */
  async getCampaign(
    accountId: string,
    platform: "google" | "amazon" | "tiktok",
    campaignId: string
  ): Promise<Campaign> {
    try {
      const response = await api.get<CampaignDetailResponse>(
        `/accounts/${accountId}/${platform}/campaigns/${campaignId}`
      );
      return response.data.data;
    } catch (error) {
      throw new CampaignAPIError(
        `Failed to fetch campaign ${campaignId}`,
        (error as any).response?.status,
        error as Error
      );
    }
  },

  /**
   * Create new campaign
   */
  async createCampaign(
    accountId: string,
    platform: "google" | "amazon" | "tiktok",
    payload: CreateCampaignPayload
  ): Promise<Campaign> {
    try {
      const response = await api.post<Campaign>(
        `/accounts/${accountId}/${platform}/campaigns`,
        payload
      );
      return response.data;
    } catch (error) {
      const statusCode = (error as any).response?.status;
      const message = (error as any).response?.data?.message || "Failed to create campaign";
      throw new CampaignAPIError(message, statusCode, error as Error);
    }
  },

  /**
   * Update campaign
   */
  async updateCampaign(
    accountId: string,
    platform: "google" | "amazon" | "tiktok",
    campaignId: string,
    payload: UpdateCampaignPayload
  ): Promise<Campaign> {
    try {
      const response = await api.patch<Campaign>(
        `/accounts/${accountId}/${platform}/campaigns/${campaignId}`,
        payload
      );
      return response.data;
    } catch (error) {
      const statusCode = (error as any).response?.status;
      const message = (error as any).response?.data?.message || "Failed to update campaign";
      throw new CampaignAPIError(message, statusCode, error as Error);
    }
  },

  /**
   * Delete campaign
   */
  async deleteCampaign(
    accountId: string,
    platform: "google" | "amazon" | "tiktok",
    campaignId: string
  ): Promise<void> {
    try {
      await api.delete(`/accounts/${accountId}/${platform}/campaigns/${campaignId}`);
    } catch (error) {
      const statusCode = (error as any).response?.status;
      throw new CampaignAPIError(
        "Failed to delete campaign",
        statusCode,
        error as Error
      );
    }
  },

  /**
   * Bulk update campaigns
   */
  async bulkUpdateCampaigns(
    accountId: string,
    platform: "google" | "amazon" | "tiktok",
    campaignIds: string[],
    updates: Partial<Campaign>
  ): Promise<Campaign[]> {
    try {
      const response = await api.post<Campaign[]>(
        `/accounts/${accountId}/${platform}/campaigns/bulk-update`,
        {
          ids: campaignIds,
          updates,
        }
      );
      return response.data;
    } catch (error) {
      throw new CampaignAPIError(
        "Failed to bulk update campaigns",
        (error as any).response?.status,
        error as Error
      );
    }
  },
};
```

#### Example: Base API Configuration

```typescript
// src/services/api.ts
import axios, { AxiosInstance, AxiosError } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

class APIClient {
  private client: AxiosInstance;
  private retryCount: Map<string, number> = new Map();

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor for auth token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem("auth_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );
  }

  private async handleError(error: AxiosError): Promise<void> {
    const config = error.config;
    if (!config) throw error;

    // Retry on network errors or 5xx status codes
    const retryKey = `${config.method}-${config.url}`;
    const retries = this.retryCount.get(retryKey) || 0;

    if ((error.code === "ECONNABORTED" || error.response?.status! >= 500) && retries < MAX_RETRIES) {
      this.retryCount.set(retryKey, retries + 1);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries)));
      return this.client.request(config) as any;
    }

    // Clear retry count on success or final failure
    this.retryCount.delete(retryKey);

    // Handle 401 - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      window.location.href = "/login";
    }

    throw error;
  }

  get<T>(url: string, config?: any) {
    return this.client.get<T>(url, config);
  }

  post<T>(url: string, data?: any, config?: any) {
    return this.client.post<T>(url, data, config);
  }

  patch<T>(url: string, data?: any, config?: any) {
    return this.client.patch<T>(url, data, config);
  }

  delete<T>(url: string, config?: any) {
    return this.client.delete<T>(url, config);
  }
}

export const api = new APIClient();
```

---

### 3. Custom Hooks

#### Rules

1. **File Naming:** camelCase with `use` prefix (e.g., `useCampaigns.ts`)
2. **Directory Structure:** Organize by domain (queries/, mutations/)
3. **Return Type:** Define interface for hook return value
4. **Dependencies:** Manage hook dependencies properly
5. **Error Handling:** Propagate errors; let consuming component handle
6. **Loading State:** Always return loading and error states
7. **File Size Limit:** Single hook per file; max 200 lines

#### Example: Query Hook

```typescript
// src/hooks/queries/useCampaigns.ts
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { campaignsService } from "@/services/campaigns";
import type { Campaign } from "@/types/campaign";

export interface UseCampaignsParams {
  accountId: string;
  enabled?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
  filter?: string;
}

export interface UseCampaignsResult {
  campaigns: Campaign[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
}

export const useCampaigns = ({
  accountId,
  enabled = true,
  page = 1,
  limit = 20,
  sort,
  filter,
}: UseCampaignsParams): UseCampaignsResult => {
  const query: UseQueryResult<any, Error> = useQuery({
    queryKey: ["campaigns", accountId, page, limit, sort, filter],
    queryFn: () =>
      campaignsService.getCampaigns(accountId, {
        page,
        limit,
        sort,
        filter,
      }),
    enabled: enabled && !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    campaigns: query.data?.data || [],
    total: query.data?.total || 0,
    page: query.data?.page || page,
    limit: query.data?.limit || limit,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
```

#### Example: Mutation Hook

```typescript
// src/hooks/mutations/useUpdateCampaign.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campaignsService } from "@/services/campaigns";
import type { UpdateCampaignPayload } from "@/types/campaign";

export interface UseUpdateCampaignParams {
  accountId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useUpdateCampaign = ({
  accountId,
  onSuccess,
  onError,
}: UseUpdateCampaignParams) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      updates,
    }: {
      campaignId: string;
      updates: UpdateCampaignPayload;
    }) =>
      campaignsService.updateCampaign(accountId, campaignId, updates),

    onSuccess: () => {
      // Invalidate related queries to trigger refetch
      queryClient.invalidateQueries({
        queryKey: ["campaigns", accountId],
      });
      onSuccess?.();
    },

    onError: (error: Error) => {
      onError?.(error);
    },
  });
};
```

---

### 4. State Management (Contexts)

#### Rules

1. **File Naming:** PascalCase with `Context` suffix (e.g., `AccountsContext.tsx`)
2. **Separation:** One context per domain; don't mix concerns
3. **Provider Component:** Create wrapper provider component
4. **Custom Hook:** Provide `use[Context]` hook for consumption
5. **Type Safety:** Strongly type context value
6. **Performance:** Use `useMemo` for context value to prevent unnecessary renders
7. **File Size Limit:** Max 300 lines per context file

#### Example: Accounts Context

```typescript
// src/contexts/AccountsContext.tsx
import React, { createContext, useState, useMemo, useCallback, ReactNode } from "react";
import type { Account } from "@/types/account";

interface AccountsContextType {
  accounts: Account[];
  selectedAccountId: string | null;
  loading: boolean;
  error: Error | null;
  selectAccount: (accountId: string) => void;
  setAccounts: (accounts: Account[]) => void;
  addAccount: (account: Account) => void;
  removeAccount: (accountId: string) => void;
}

export const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

interface AccountsProviderProps {
  children: ReactNode;
}

export const AccountsProvider: React.FC<AccountsProviderProps> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const selectAccount = useCallback((accountId: string) => {
    setSelectedAccountId(accountId);
  }, []);

  const addAccount = useCallback((account: Account) => {
    setAccounts(prev => [...prev, account]);
  }, []);

  const removeAccount = useCallback((accountId: string) => {
    setAccounts(prev => prev.filter(a => a.id !== accountId));
    if (selectedAccountId === accountId) {
      setSelectedAccountId(null);
    }
  }, [selectedAccountId]);

  const value: AccountsContextType = useMemo(() => ({
    accounts,
    selectedAccountId,
    loading,
    error,
    selectAccount,
    setAccounts,
    addAccount,
    removeAccount,
  }), [accounts, selectedAccountId, loading, error, selectAccount, addAccount, removeAccount]);

  return (
    <AccountsContext.Provider value={value}>
      {children}
    </AccountsContext.Provider>
  );
};

// Custom hook for consuming context
export const useAccounts = (): AccountsContextType => {
  const context = React.useContext(AccountsContext);
  if (!context) {
    throw new Error("useAccounts must be used within AccountsProvider");
  }
  return context;
};
```

---

### 5. Type Definitions

#### Rules

1. **File Naming:** Domain-based (e.g., `campaign.ts`, `account.ts`)
2. **Export Types:** Use `export type` or `export interface`
3. **API Types:** Separate API response types from domain types
4. **Naming Convention:** Use descriptive names; avoid generic names like "Data"
5. **Documentation:** Add JSDoc comments for complex types

### 6. Utility Functions

#### Rules

1. **File Naming:** camelCase (e.g., `formatHelpers.ts`)
2. **Pure Functions:** No side effects; deterministic outputs
3. **Documentation:** JSDoc comments required
4. **Grouping:** Group related utilities in single file
5. **Export:** Named exports; one utility per function

#### Example: Format Utilities

```typescript
// src/utils/formatHelpers.ts

/**
 * Format number as currency
 */
export const formatCurrency = (value: number, currency = "USD"): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
};

/**
 * Format number as percentage
 */
export const formatPercentage = (value: number, decimals = 2): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

```

---

## File Size Management

### Guidelines

| Module Type | Max Size | Action |
|-------------|----------|--------|
| Component | 500 lines | Split into sub-components or extract logic |
| Service | 400 lines | Create multiple service files by domain |
| Hook | 200 lines | Simplify or extract to multiple hooks |
| Context | 300 lines | Consider splitting concerns |
| Page | 600 lines | Extract components and custom hooks |

### When to Split Files

#### Components

**Split when:**
- Component has multiple responsibilities
- Reusable sub-component can be extracted
- Component file exceeds 500 lines

**Example: Campaign Details Page**

```
Before (single 800-line file):
CampaignDetail.tsx (all logic, styling, forms)

After (split):
pages/CampaignDetail.tsx (container)
├── components/CampaignOverview.tsx
├── components/CampaignMetrics.tsx
├── components/CampaignSettingsForm.tsx
└── components/CampaignBudgetEditor.tsx
```

#### Services

**Split when:**
- Service file exceeds 400 lines
- Different API domains mixed in one file
- Platform-specific logic can be isolated

**Example: Campaign Services**

```
Before (single 600-line file):
services/campaigns.ts (Google + Amazon + TikTok)

After (split):
services/campaigns.ts (shared interface)
├── services/campaigns/google.ts
├── services/campaigns/amazon.ts
└── services/campaigns/tiktok.ts
```

---

## Adding a New Platform

### Step 1: Define Platform Types

```typescript
// src/types/platforms/newplatform.ts
export interface NewPlatformCampaign {
  platform_id: string;
  platform_name: string;
  // Platform-specific fields
  custom_field_1?: string;
  custom_field_2?: number;
}

export interface NewPlatformCreatePayload {
  name: string;
  // Platform-specific required fields
}
```

### Step 2: Create Platform Service

```typescript
// src/services/platforms/newplatform.ts
import { api } from "@/services/api";
import type { NewPlatformCampaign } from "@/types/platforms/newplatform";

export const newPlatformService = {
  async getCampaigns(accountId: string) {
    const response = await api.get(
      `/accounts/${accountId}/newplatform/campaigns`
    );
    return response.data;
  },

  async createCampaign(accountId: string, payload: NewPlatformCreatePayload) {
    const response = await api.post(
      `/accounts/${accountId}/newplatform/campaigns`,
      payload
    );
    return response.data;
  },

  // ... other methods
};
```

### Step 3: Create Platform Hooks

```typescript
// src/hooks/queries/useNewPlatformCampaigns.ts
import { useQuery } from "@tanstack/react-query";
import { newPlatformService } from "@/services/platforms/newplatform";

export const useNewPlatformCampaigns = (accountId: string) => {
  return useQuery({
    queryKey: ["newplatform-campaigns", accountId],
    queryFn: () => newPlatformService.getCampaigns(accountId),
    enabled: !!accountId,
  });
};
```

### Step 4: Create Platform Components

```typescript
// src/components/newplatform/NewPlatformCampaignsTable.tsx
import React from "react";
import { GoogleAdsTable } from "@/components/google/GoogleAdsTable"; // Reuse shared table
import type { ColumnDefinition } from "@/types";

export const NewPlatformCampaignsTable: React.FC<Props> = (props) => {
  // Map platform-specific data to shared table format
  const columns: ColumnDefinition[] = [
    // Platform-specific columns
  ];

  return <GoogleAdsTable {...commonProps} columns={columns} />;
};
```

### Step 5: Create Platform Page

```typescript
// src/pages/newplatform/NewPlatformCampaigns.tsx
import React from "react";
import { useNewPlatformCampaigns } from "@/hooks/queries/useNewPlatformCampaigns";
import { NewPlatformCampaignsTable } from "@/components/newplatform/NewPlatformCampaignsTable";

export const NewPlatformCampaigns: React.FC = () => {
  const { data, isLoading } = useNewPlatformCampaigns(accountId);

  return (
    <div className="p-6">
      <h1>New Platform Campaigns</h1>
      <NewPlatformCampaignsTable campaigns={data} loading={isLoading} />
    </div>
  );
};
```

### Step 6: Register Routes

```typescript
// src/App.tsx
import { NewPlatformCampaigns } from "@/pages/newplatform/NewPlatformCampaigns";

const routes = [
  // ... existing routes
  {
    path: "/accounts/:accountId/newplatform-campaigns",
    element: <NewPlatformCampaigns />,
  },
];
```

### Step 7: Update Navigation

```typescript
// src/components/layout/Sidebar.tsx
const platforms = [
  { name: "Google Ads", icon: GoogleIcon, path: "/accounts/:id/google-campaigns" },
  { name: "Amazon Ads", icon: AmazonIcon, path: "/accounts/:id/amazon-campaigns" },
  { name: "TikTok Ads", icon: TikTokIcon, path: "/accounts/:id/tiktok-campaigns" },
  { name: "New Platform", icon: NewIcon, path: "/accounts/:id/newplatform-campaigns" }, // Add here
];
```

### Checklist for New Platform

- [ ] Types defined in `src/types/platforms/[platform].ts`
- [ ] Service created in `src/services/platforms/[platform].ts`
- [ ] Query/mutation hooks in `src/hooks/`
- [ ] Components in `src/components/[platform]/`
- [ ] Page in `src/pages/[platform]/`
- [ ] Routes registered in `App.tsx`
- [ ] Navigation updated in sidebar/header
- [ ] Error handling implemented
- [ ] Tests written for service and components
- [ ] Documentation updated

---

## API Integration

### Base API Structure

#### Configuration

```typescript
// .env.local
VITE_API_BASE_URL=http://localhost:3001/api
VITE_API_TIMEOUT=30000
```

#### API Endpoint Pattern

All platform-specific endpoints follow a consistent RESTful structure:

```
/api/{platform}/{accountId}/{resource}/              # List/Create
/api/{platform}/{accountId}/{resource}/{id}/         # Retrieve/Update/Delete
/api/{platform}/{accountId}/{resource}/{id}/{action}/ # Custom actions
```

**Platforms:** `google`, `amazon`, `tiktok`  
**Resources:** `campaigns`, `keywords`, `targets`, `adgroups`, `assets`


#### Request/Response Pattern

```typescript
// All API responses follow this pattern
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}
```

### Error Handling Pattern

```typescript
// All services should handle errors consistently
try {
  const response = await api.get<Campaign>(`/campaigns/${id}`);
  return response.data;
} catch (error) {
  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.message || error.message;
    
    switch (statusCode) {
      case 400:
        throw new ValidationError(errorMessage);
      case 401:
        throw new AuthenticationError("Session expired");
      case 403:
        throw new AuthorizationError("Insufficient permissions");
      case 404:
        throw new NotFoundError("Resource not found");
      case 429:
        throw new RateLimitError("Too many requests");
      default:
        throw new APIError(errorMessage, statusCode);
    }
  }
  throw error;
}
```

### Pagination Pattern

```typescript
interface PaginationParams {
  page: number; // 1-indexed
  limit: number; // Items per page
  sort?: string; // Format: "field:asc" or "field:desc"
  filter?: string; // Backend-specific filter syntax
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Usage in hooks
export const usePaginatedCampaigns = (
  accountId: string,
  page: number = 1,
  limit: number = 20
) => {
  return useQuery({
    queryKey: ["campaigns", accountId, page, limit],
    queryFn: () =>
      campaignsService.getCampaigns(accountId, { page, limit }),
  });
};
```

### Optimistic Updates

```typescript
export const useUpdateCampaign = (accountId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: UpdatePayload) =>
      campaignsService.updateCampaign(accountId, updates),

    onMutate: async (updates) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({
        queryKey: ["campaigns", accountId],
      });

      // Snapshot previous data
      const previousData = queryClient.getQueryData(["campaigns", accountId]);

      // Update cache optimistically
      queryClient.setQueryData(
        ["campaigns", accountId],
        (old: any) => ({
          ...old,
          data: old.data.map((c: Campaign) =>
            c.id === updates.id ? { ...c, ...updates } : c
          ),
        })
      );

      return { previousData };
    },

    onError: (error, updates, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["campaigns", accountId],
          context.previousData
        );
      }
    },

    onSuccess: () => {
      // Refetch to sync with server
      queryClient.invalidateQueries({
        queryKey: ["campaigns", accountId],
      });
    },
  });
};
```

---

## State Management

### Global State with Context API

#### Pattern

```typescript
// 1. Define context type
interface GlobalState {
  user: User | null;
  selectedAccount: Account | null;
  notifications: Notification[];
  // ...
}

// 2. Create context
const GlobalContext = createContext<GlobalState | undefined>(undefined);

// 3. Create provider with state management
export const GlobalProvider = ({ children }) => {
  const [state, dispatch] = useReducer(globalReducer, initialState);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};

// 4. Create custom hook
export const useGlobalState = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error("useGlobalState must be used within GlobalProvider");
  }
  return context;
};
```

#### Dispatch Actions Pattern

```typescript
type Action =
  | { type: "SET_USER"; payload: User }
  | { type: "SET_ACCOUNT"; payload: Account }
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "REMOVE_NOTIFICATION"; payload: string };

function globalReducer(state: GlobalState, action: Action): GlobalState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload };
    case "SET_ACCOUNT":
      return { ...state, selectedAccount: action.payload };
    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };
    case "REMOVE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.filter(
          n => n.id !== action.payload
        ),
      };
    default:
      return state;
  }
}
```

### Local State with React Query

```typescript
// For shared data (campaigns, accounts, etc.), use React Query
const { data, isLoading, error } = useQuery({
  queryKey: ["campaigns", accountId],
  queryFn: () => campaignsService.getCampaigns(accountId),
});

// For local UI state (modals, forms, selection), use useState
const [selectedId, setSelectedId] = useState<string | null>(null);
const [isModalOpen, setIsModalOpen] = useState(false);
const [formData, setFormData] = useState<FormData>(initialData);
```

### Separating Complex State Logic

#### When to Separate

Extract state into separate contexts or custom hooks when:

- **Size Threshold**: Single context exceeds 300 lines
- **Multiple Concerns**: Context handles unrelated features (e.g., campaigns + notifications)
- **Reusability**: State logic needed across different features/pages
- **Reducer Complexity**: Action dispatcher has 5+ action types
- **Performance**: Frequent updates to one concern trigger re-renders of unrelated subscribers

#### Pattern 1: Feature-Specific Context

Create separate contexts for distinct features to avoid prop drilling while keeping concerns isolated:

```typescript
// Before: Monolithic Context
interface GlobalState {
  // User & Auth
  user: User | null;
  isAuthenticated: boolean;
  
  // Accounts
  accounts: Account[];
  selectedAccount: Account | null;
  
  // Campaigns (should be in its own context)
  campaigns: Campaign[];
  campaignFilters: FilterState;
  selectedCampaign: Campaign | null;
  
  // Notifications (separate concern)
  notifications: Notification[];
}

// After: Separated Contexts
├── AuthContext.tsx          // user + isAuthenticated
├── AccountsContext.tsx      // accounts + selectedAccount
├── CampaignDetailContext.tsx // campaigns + filters + selection
└── NotificationContext.tsx   // notifications only
```

**Usage:**
```typescript
// Only wrap components that need campaign state
<CampaignDetailProvider>
  <CampaignDetail />
  <CampaignFilters />
  <CampaignsList />
</CampaignDetailProvider>
```

#### Pattern 2: Complex State with useReducer

When state logic becomes complex (multiple related fields, complex updates), extract to a custom hook with `useReducer`:

```typescript
// Instead of multiple useState calls in a component
interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isDirty: boolean;
  isSubmitting: boolean;
}

type FormAction =
  | { type: "SET_FIELD"; field: string; value: any }
  | { type: "SET_ERROR"; field: string; error: string }
  | { type: "SET_TOUCHED"; field: string }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_END" }
  | { type: "RESET" };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_FIELD":
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        isDirty: true,
      };
    case "SET_ERROR":
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.error },
      };
    // ... other cases
    default:
      return state;
  }
}

// Custom hook encapsulates complexity
export const useForm = (initialValues: any) => {
  const [state, dispatch] = useReducer(formReducer, {
    values: initialValues,
    errors: {},
    touched: {},
    isDirty: false,
    isSubmitting: false,
  });

  return {
    state,
    setField: (field: string, value: any) =>
      dispatch({ type: "SET_FIELD", field, value }),
    setError: (field: string, error: string) =>
      dispatch({ type: "SET_ERROR", field, error }),
    // ... other methods
  };
};

// Clean component usage
const MyForm = () => {
  const form = useForm({ email: "", password: "" });
  // form.state, form.setField, form.setError, etc.
};
```

#### Pattern 3: Custom Hooks for Encapsulation

When state is only used by one component or a small component tree, use a custom hook instead of Context to avoid Provider overhead:

```typescript
// Modal state hook - used by one or two components
export const useModalState = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<any>(null);

  return {
    isOpen,
    open: (payload?: any) => {
      setData(payload);
      setIsOpen(true);
    },
    close: () => {
      setIsOpen(false);
      setData(null);
    },
    data,
  };
};

// Usage in component
const DeleteConfirmModal = () => {
  const modal = useModalState();

  return (
    <>
      <button onClick={() => modal.open({ itemId: 123 })}>
        Delete Item
      </button>
      {modal.isOpen && (
        <Modal
          onConfirm={() => deleteItem(modal.data.itemId)}
          onCancel={modal.close}
        />
      )}
    </>
  );
};
```

#### Decision Tree

```
Is state used by multiple components?
├─ Yes: Is it a distinct feature/concern?
│  ├─ Yes: Create feature-specific Context (Campaign, Notification, Filter)
│  └─ No: Add to existing Global Context
└─ No: Is the logic complex (5+ state variables)?
   ├─ Yes: Create custom hook with useReducer
   └─ No: Use useState in the component
```

---