import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { accountsService } from "../services/accounts";
import { useAccounts } from "../contexts/AccountsContext";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { Button } from "../components/ui";
import { useGoogleProfiles } from "../hooks/queries/useGoogleProfiles";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../hooks/queries/queryKeys";

interface GoogleAdsAccount {
  customer_id: string;
  customer_id_raw: string;
  resource_name: string;
  name: string;
  currency_code?: string;
  timezone?: string;
  is_manager?: boolean;
  manager_customer_id?: string | null;
  status?: string;
  is_selected?: boolean;
}

/** Node from backend hierarchy (account + children) */
interface GoogleAdsAccountWithChildren extends GoogleAdsAccount {
  children?: GoogleAdsAccountWithChildren[];
}

function flattenHierarchy(nodes: GoogleAdsAccountWithChildren[]): GoogleAdsAccount[] {
  return nodes.flatMap((n) => {
    const { children = [], ...rest } = n;
    return [{ ...rest }, ...flattenHierarchy(children)];
  });
}

/** Normalize customer ID for comparison (backend may send dashed or raw) */
function normId(id: string | null | undefined): string {
  return (id ?? "").replace(/-/g, "");
}

/** Keep nodes that are in allowedIds or have a kept descendant. Uses normalized IDs for matching. */
function filterHierarchy(
  nodes: GoogleAdsAccountWithChildren[],
  allowedIds: Set<string>
): GoogleAdsAccountWithChildren[] {
  const result: GoogleAdsAccountWithChildren[] = [];
  for (const n of nodes) {
    const childList = filterHierarchy(n.children || [], allowedIds);
    const kept = allowedIds.has(normId(n.customer_id)) || childList.length > 0;
    if (!kept) continue;
    result.push({ ...n, children: childList });
  }
  return result;
}

function HierarchyNode({
  node,
  selectedCustomerIds,
  toggleSelection,
  collapsedManagers,
  toggleManagerCollapse,
  depth,
}: {
  node: GoogleAdsAccountWithChildren;
  selectedCustomerIds: Set<string>;
  toggleSelection: (id: string) => void;
  collapsedManagers: Set<string>;
  toggleManagerCollapse: (id: string) => void;
  depth: number;
}) {
  const children = node.children || [];
  const sortedChildren = useMemo(
    () =>
      [...children].sort((a, b) =>
        (a.name || a.customer_id || "").localeCompare(b.name || b.customer_id || "", undefined, { sensitivity: "base" })
      ),
    [children]
  );
  const isManager = node.is_manager;
  const isCollapsed = collapsedManagers.has(node.customer_id);
  const marginLeft = depth > 0 ? 24 : 0;
  const hasNoChildren = isManager && children.length === 0;

  if (isManager) {
    return (
      <div key={node.customer_id} className="space-y-2" style={marginLeft ? { marginLeft } : undefined}>
        <div
          className={`rounded-2xl p-4 border transition-colors ${
            hasNoChildren
              ? "bg-[#EEEEEE] border-[#E0E0E0] cursor-not-allowed opacity-75"
              : "bg-[#F5F5F5] border-[#D0D0C8] cursor-pointer hover:bg-[#EDEDED]"
          }`}
          onClick={() => !hasNoChildren && toggleManagerCollapse(node.customer_id)}
        >
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={false} disabled className="w-4 h-4 opacity-50 cursor-not-allowed" onClick={(e) => e.stopPropagation()} readOnly />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className={`text-[16px] font-semibold ${hasNoChildren ? "text-[#9E9E9E]" : "text-[#556179]"}`}>{node.name}</h3>
                <span className="px-2 py-0.5 text-[11px] font-medium bg-[#E8F4F8] text-[#0066CC] rounded-full border border-[#B3D9E6]">Manager Account</span>
                {node.status && node.status !== "ENABLED" && (
                  <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#EEEEEE] text-[#616161] border border-[#BDBDBD]">{node.status}</span>
                )}
                <span className={`text-[12px] ${hasNoChildren ? "text-[#9E9E9E]" : "text-[#556179]"}`}>
                  ({children.length} {children.length === 1 ? "account" : "accounts"})
                  {hasNoChildren && " — disabled (no child accounts)"}
                </span>
              </div>
              <div className="flex gap-4 text-[14px] text-[#556179] flex-wrap">
                <span>Customer ID: {node.customer_id}</span>
                {node.currency_code && <span>Currency: {node.currency_code}</span>}
                {node.timezone && <span>Timezone: {node.timezone}</span>}
              </div>
            </div>
            {!hasNoChildren && (
              <div className="flex items-center justify-center">
                <svg className={`w-5 h-5 text-[#556179] transition-transform ${isCollapsed ? "" : "rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        </div>
        {!hasNoChildren && !isCollapsed && sortedChildren.length > 0 && (
          <div className="space-y-2" style={{ marginLeft: 24 }}>
            {sortedChildren.map((child) => (
              <HierarchyNode
                key={child.customer_id}
                node={child}
                selectedCustomerIds={selectedCustomerIds}
                toggleSelection={toggleSelection}
                collapsedManagers={collapsedManagers}
                toggleManagerCollapse={toggleManagerCollapse}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isSelected = selectedCustomerIds.has(node.customer_id);
  const isDisabled = node.status === "CLOSED" || node.status === "CANCELED";
  return (
    <div
      key={node.customer_id}
      className={`bg-[#FEFEFB] border rounded-2xl p-4 transition-all ${
        isDisabled ? "opacity-70 border-[#E0E0E0] cursor-not-allowed" : isSelected ? "border-[#072929] bg-[#F0F0ED] cursor-pointer" : "border-[#E8E8E3] hover:border-[#D0D0C8] cursor-pointer"
      }`}
      style={marginLeft ? { marginLeft } : undefined}
      onClick={() => !isDisabled && toggleSelection(node.customer_id)}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          disabled={isDisabled}
          onChange={() => !isDisabled && toggleSelection(node.customer_id)}
          onClick={(e) => e.stopPropagation()}
          className={`mt-1 w-4 h-4 text-[#072929] border-[#E6E6E6] rounded focus:ring-[#072929] ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className={`text-[16px] font-medium ${isDisabled ? "text-[#9E9E9E]" : "text-[#072929]"}`}>{node.name}</h3>
            {node.status && node.status !== "ENABLED" && (
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#EEEEEE] text-[#616161] border border-[#BDBDBD]">{node.status}</span>
            )}
          </div>
          <div className="flex gap-4 text-[14px] text-[#556179] flex-wrap">
            <span>Customer ID: {node.customer_id}</span>
            {node.currency_code && <span>Currency: {node.currency_code}</span>}
            {node.timezone && <span>Timezone: {node.timezone}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export const SelectGoogleAdsAccounts: React.FC = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { accounts: brandAccounts, refreshAccounts } = useAccounts();
  const { sidebarWidth } = useSidebar();
  const queryClient = useQueryClient();
  
  // Use React Query hook - automatically handles deduplication, caching, and loading states
  const channelIdNum = channelId ? parseInt(channelId) : undefined;
  const { 
    data: profilesData, 
    isLoading: loading, 
    error: queryError,
    refetch: refetchProfiles 
  } = useGoogleProfiles(channelIdNum);

  const accounts = useMemo(() => profilesData?.profiles || [], [profilesData?.profiles]);

  const [fetchedProfiles, setFetchedProfiles] = useState<GoogleAdsAccount[] | null>(null);
  const [fetchedHierarchy, setFetchedHierarchy] = useState<GoogleAdsAccountWithChildren[] | null>(null);

  const displayAccounts = useMemo(() => {
    if (fetchedHierarchy?.length) return flattenHierarchy(fetchedHierarchy);
    return fetchedProfiles ?? accounts;
  }, [fetchedHierarchy, fetchedProfiles, accounts]);

  const accountIdForBack: string | number | undefined =
    (location.state as { accountId?: string })?.accountId ??
    brandAccounts?.find((a) => a.channels?.some((ch) => ch.id === channelIdNum))?.id;

  // Initialize selected customer IDs from DB profiles only when showing DB data (not API-only list)
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    if (fetchedProfiles === null && accounts.length > 0) {
      const selectedIds = new Set<string>();
      accounts.forEach((savedProfile) => {
        if (savedProfile.is_selected) {
          const customerId = savedProfile.customer_id;
          if (customerId) {
            selectedIds.add(String(customerId));
          }
        }
      });
      setSelectedCustomerIds(selectedIds);
    }
  }, [fetchedProfiles, accounts]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [collapsedManagers, setCollapsedManagers] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [fetchingFromAds, setFetchingFromAds] = useState(false);
  const hasAutoFetchedRef = useRef(false);

  // Update error state from query error
  useEffect(() => {
    if (queryError) {
      setError("Failed to load Google Ads accounts");
    }
  }, [queryError]);

  // Always fetch profiles from Google Ads API when page loads
  useEffect(() => {
    if (
      !loading &&
      !fetchingFromAds &&
      !hasAutoFetchedRef.current &&
      channelIdNum
    ) {
      handleAutoFetch();
    }
  }, [loading, channelIdNum, fetchingFromAds]);

  const handleAutoFetch = async () => {
    if (!channelIdNum || hasAutoFetchedRef.current) return; // Prevent duplicate calls
    
    hasAutoFetchedRef.current = true;
    setFetchingFromAds(true);
    setError(null);

    try {
      const { profiles, hierarchy } = await accountsService.fetchGoogleProfiles(channelIdNum);
      setFetchedProfiles(profiles ?? []);
      setFetchedHierarchy(hierarchy?.length ? hierarchy : null);

      // Preserve previous selection from DB when refreshing from API
      if (accounts.length > 0) {
        const selectedIds = new Set<string>();
        accounts.forEach((p) => {
          if (p.is_selected && p.customer_id) selectedIds.add(String(p.customer_id));
        });
        setSelectedCustomerIds(selectedIds);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to fetch profiles from Google Ads. Please try refreshing manually."
      );
      // Reset ref so user can retry
      hasAutoFetchedRef.current = false;
    } finally {
      setFetchingFromAds(false);
    }
  };

  const toggleSelection = (customerId: string) => {
    const account = displayAccounts.find((a) => a.customer_id === customerId);
    if (account?.is_manager) return;
    // Don't allow selection of CLOSED or CANCELED accounts
    if (account?.status === "CLOSED" || account?.status === "CANCELED") return;

    const newSelected = new Set(selectedCustomerIds);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomerIds(newSelected);
  };

  const handleSave = async () => {
    if (!channelId) return;

    try {
      setSaving(true);
      setError(null);

      const selectedIds = Array.from(selectedCustomerIds);
      
      if (selectedIds.length === 0) {
        setError("Please select at least one Google Ads account");
        setSaving(false);
        return;
      }

      // Filter to only selected profiles and their managers (if any)
      const allProfiles = displayAccounts;
      const selectedProfiles = allProfiles.filter((p) => selectedIds.includes(p.customer_id));
      
      // Find manager profiles for selected profiles
      const managerIds = new Set<string>();
      selectedProfiles.forEach((profile) => {
        if (profile.manager_customer_id) {
          managerIds.add(profile.manager_customer_id);
        }
      });
      
      // Include manager profiles if they exist
      const managerProfiles = allProfiles.filter(
        (p) => p.is_manager && managerIds.has(p.customer_id)
      );
      
      // Combine selected profiles and their managers
      const profilesToSave = [...selectedProfiles, ...managerProfiles];
      
      const response = await accountsService.saveGoogleProfiles(
        parseInt(channelId),
        selectedIds,
        profilesToSave
      );

      // Store success message for integrations page (same as Amazon/TikTok)
      const message =
        response.message ||
        response.setup_message ||
        `${selectedIds.length} Google Ads account${selectedIds.length !== 1 ? "s" : ""} saved successfully.`;
      localStorage.setItem(
        "profiles_saved_success",
        JSON.stringify({
          message,
          type: "success",
        })
      );

      // Redirect immediately after successful save
      navigate(
        accountIdForBack != null
          ? `/brands/${accountIdForBack}/integrations`
          : "/brands",
        { replace: true }
      );

      // Cleanup operations (run in background, don't block redirect)
      // Refresh accounts context to update channel counts on other pages
      // Note: No need to invalidate query cache since we navigate away immediately
      // and this page always fetches from API on load anyway
      refreshAccounts().catch(console.error);
    } catch (err: any) {
      console.error("Failed to save Google Ads accounts:", err);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to save Google Ads accounts"
      );
    } finally {
      setSaving(false);
    }
  };


  // Show all accounts (including CLOSED/CANCELED); filter by search only
  const filteredAccounts = displayAccounts.filter((account) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      account.name.toLowerCase().includes(query) ||
      account.customer_id.toLowerCase().includes(query) ||
      account.currency_code?.toLowerCase().includes(query) || false
    );
  });

  // Normalize customer ID for comparison (API may return dashed or raw)
  const normalizeCustomerId = (id: string | null | undefined) => (id ?? "").replace(/-/g, "");

  const managerAccounts = filteredAccounts.filter((a) => a.is_manager);
  const childAccounts = filteredAccounts.filter((a) => !a.is_manager);
  const standaloneAccounts = childAccounts.filter((a) => !a.manager_customer_id);

  /** Sort by name A–Z (case-insensitive) */
  const sortByName = (a: { name?: string; customer_id?: string }, b: { name?: string; customer_id?: string }) =>
    (a.name || a.customer_id || "").localeCompare(b.name || b.customer_id || "", undefined, { sensitivity: "base" });

  const childAccountsSorted = useMemo(
    () => [...childAccounts].sort(sortByName),
    [childAccounts]
  );

  // Group children by normalized manager_customer_id so we never drop children whose manager
  // ID format doesn't match; then resolve manager from displayAccounts or use a synthetic label.
  const childrenByManagerNorm = childAccountsSorted.reduce(
    (acc, child) => {
      const norm = normalizeCustomerId(child.manager_customer_id);
      if (!norm) return acc;
      if (!acc[norm]) acc[norm] = [];
      acc[norm].push(child);
      return acc;
    },
    {} as Record<string, GoogleAdsAccount[]>
  );

  const managerByNormId = managerAccounts.reduce(
    (acc, m) => {
      acc[normalizeCustomerId(m.customer_id)] = m;
      return acc;
    },
    {} as Record<string, GoogleAdsAccount>
  );

  const accountsByManager: Record<string, { manager: GoogleAdsAccount; children: GoogleAdsAccount[] }> = {};
  Object.keys(childrenByManagerNorm).forEach((managerIdNorm) => {
    const children = [...(childrenByManagerNorm[managerIdNorm] || [])].sort(sortByName);
    const manager = managerByNormId[managerIdNorm];
    const labelId = children[0]?.manager_customer_id ?? managerIdNorm;
    const resolvedManager: GoogleAdsAccount = manager ?? {
      customer_id: labelId.includes("-") ? labelId : (labelId.length >= 10 ? `${labelId.slice(0, 3)}-${labelId.slice(3, 6)}-${labelId.slice(6)}` : labelId),
      customer_id_raw: managerIdNorm,
      resource_name: "",
      name: `Accounts (${labelId})`,
      is_manager: true,
      manager_customer_id: null,
    };
    const key = manager?.customer_id ?? `manager-${managerIdNorm}`;
    accountsByManager[key] = { manager: resolvedManager, children };
  });

  /** Exclude from standalone list any account that is already shown as a manager (account can be manager OR ads, not both in list); sort A–Z by name */
  const standaloneOnly = useMemo(() => {
    const managerIds = new Set(Object.values(accountsByManager).map(({ manager }) => manager.customer_id));
    const list = standaloneAccounts.filter((a) => !managerIds.has(a.customer_id));
    return [...list].sort(sortByName);
  }, [standaloneAccounts, accountsByManager]);

  /** Manager groups sorted A–Z by manager name (for fallback list) */
  const accountsByManagerSorted = useMemo(
    () =>
      Object.values(accountsByManager).sort((a, b) =>
        (a.manager.name || a.manager.customer_id || "").localeCompare(
          b.manager.name || b.manager.customer_id || "",
          undefined,
          { sensitivity: "base" }
        )
      ),
    [accountsByManager]
  );

  // Only ENABLED (and optionally other non-closed) non-manager accounts are selectable
  const selectableAccounts = filteredAccounts.filter(
    (a) => !a.is_manager && a.status !== "CLOSED" && a.status !== "CANCELED"
  );
  // Total non-manager accounts (selectable + unselectable) – for "Select All" denominator
  const totalNonManagerAccounts = childAccounts.length;
  // Selected in current view (filtered by search) – for "Select All" checkbox and label
  const selectedInViewCount = selectableAccounts.filter((a) =>
    selectedCustomerIds.has(a.customer_id)
  ).length;
  // Total selected across all accounts – for Save button and summary (never misleading when searching)
  const totalSelectedCount = selectedCustomerIds.size;

  const filteredHierarchyRoots = useMemo(() => {
    if (!fetchedHierarchy?.length) return [];
    // Use normalized IDs so hierarchy nodes match even if backend uses dashed vs raw format
    const ids = new Set(filteredAccounts.map((a) => normId(a.customer_id)));
    return filterHierarchy(fetchedHierarchy, ids);
  }, [fetchedHierarchy, filteredAccounts]);

  /** Tree roots sorted A–Z by name */
  const filteredHierarchyRootsSorted = useMemo(
    () =>
      [...filteredHierarchyRoots].sort((a, b) =>
        (a.name || a.customer_id || "").localeCompare(b.name || b.customer_id || "", undefined, { sensitivity: "base" })
      ),
    [filteredHierarchyRoots]
  );

  /** Prefer flat list when many accounts so we just loop and show all; use tree only for small lists (expandable hierarchy) */
  const USE_TREE_ABOVE_COUNT = 80;
  const useTreeView = useMemo(() => {
    if (filteredAccounts.length > USE_TREE_ABOVE_COUNT) return false;
    if (filteredHierarchyRoots.length === 0) return false;
    const flatTreeCount = flattenHierarchy(filteredHierarchyRoots).length;
    return flatTreeCount >= filteredAccounts.length;
  }, [filteredHierarchyRoots, filteredAccounts.length]);

  const toggleAll = () => {
    if (selectedInViewCount === selectableAccounts.length) {
      // Deselect all selectable accounts
      const newSelected = new Set(selectedCustomerIds);
      selectableAccounts.forEach((a) => newSelected.delete(a.customer_id));
      setSelectedCustomerIds(newSelected);
    } else {
      // Select all selectable accounts
      const newSelected = new Set(selectedCustomerIds);
      selectableAccounts.forEach((a) => newSelected.add(a.customer_id));
      setSelectedCustomerIds(newSelected);
    }
  };

  const toggleManagerCollapse = (managerId: string) => {
    const newCollapsed = new Set(collapsedManagers);
    if (newCollapsed.has(managerId)) {
      newCollapsed.delete(managerId);
    } else {
      newCollapsed.add(managerId);
    }
    setCollapsedManagers(newCollapsed);
  };

  const handleRefresh = async () => {
    if (!channelId || !channelIdNum) return;

    try {
      setRefreshing(true);
      setError(null);

      const { profiles, hierarchy } = await accountsService.fetchGoogleProfiles(channelIdNum);
      setFetchedProfiles(profiles ?? []);
      setFetchedHierarchy(hierarchy?.length ? hierarchy : null);

      // Preserve previous selection when refreshing: reinit from DB if we had saved selection
      if (accounts.length > 0) {
        const selectedIds = new Set<string>();
        accounts.forEach((p) => {
          if (p.is_selected && p.customer_id) selectedIds.add(String(p.customer_id));
        });
        setSelectedCustomerIds(selectedIds);
      }
    } catch (err: any) {
      console.error("Failed to refresh Google profiles:", err);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to refresh Google Ads accounts. Please try again."
      );
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
        {/* Header */}
        <DashboardHeader />

        {/* Main Content Area */}
        <div className="p-8 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-[24px] font-medium text-[#072929] mb-2">
                  Select Google Ads Accounts
                </h1>
                <p className="text-[14px] text-[#556179]">
                  Choose which Google Ads accounts you want to connect.
                </p>
              </div>
              <Button
                onClick={handleRefresh}
                disabled={refreshing || loading || fetchingFromAds}
                variant="outline"
                size="sm"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-[14px]">
                {error}
              </div>
            )}

            {setupMessage && (
              <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-[14px] flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                <span>{setupMessage}</span>
              </div>
            )}

            {(loading || fetchingFromAds || refreshing) ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#072929] mx-auto mb-4"></div>
                <p className="text-[16px] text-[#072929]">
                  {refreshing 
                    ? "Refreshing profiles from Google Ads..." 
                    : fetchingFromAds 
                    ? "Fetching profiles from Google Ads..." 
                    : "Loading Google Ads accounts..."}
                </p>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="text-center py-12 bg-[#FEFEFB] border border-[#E8E8E3] rounded-2xl">
                <p className="text-[14px] text-[#556179] mb-4">
                  {searchQuery.trim()
                    ? "No accounts match your search. Try a different search term."
                    : "No accounts found. Please check your Google Ads account connection."}
                </p>
              </div>
            ) : (
              <>
                {/* Search Input */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search accounts by name or customer ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-[#E8E8E3] rounded-lg focus:ring-2 focus:ring-[#072929] focus:border-[#072929] text-[14px] outline-none"
                  />
                </div>

                {/* Select All + selected count + Save/Cancel in one compact bar */}
                <div className="mb-4 flex items-center justify-between flex-wrap gap-3 py-3 px-4 rounded-xl bg-[#F5F5F5] border border-[#E8E8E3]">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={
                          selectableAccounts.length > 0 &&
                          selectedInViewCount === selectableAccounts.length
                        }
                        onChange={toggleAll}
                        className="w-4 h-4 text-[#072929] border-[#E6E6E6] rounded focus:ring-[#072929]"
                      />
                      <label className="text-[14px] font-medium text-[#072929]">
                        {searchQuery.trim()
                          ? `Select all in results (${selectedInViewCount}/${totalNonManagerAccounts})`
                          : `Select All (${selectedInViewCount}/${totalNonManagerAccounts})`}
                      </label>
                    </div>
                    {totalSelectedCount > 0 ? (
                      <span className="text-[14px] font-semibold text-[#072929]">
                        {totalSelectedCount} selected in total
                      </span>
                    ) : (
                      <span className="text-[14px] text-[#556179]">
                        No accounts selected
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(
                          accountIdForBack != null
                            ? `/brands/${accountIdForBack}/integrations`
                            : "/brands"
                        )
                      }
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={saving || totalSelectedCount === 0}
                    >
                      {saving
                        ? "Saving..."
                        : `Save ${totalSelectedCount} Account${
                            totalSelectedCount !== 1 ? "s" : ""
                          }`}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {useTreeView ? (
                    filteredHierarchyRootsSorted.map((root) => (
                      <HierarchyNode
                        key={root.customer_id}
                        node={root}
                        selectedCustomerIds={selectedCustomerIds}
                        toggleSelection={toggleSelection}
                        collapsedManagers={collapsedManagers}
                        toggleManagerCollapse={toggleManagerCollapse}
                        depth={0}
                      />
                    ))
                  ) : (
                    <>
                  {/* Render manager accounts with their children (flat fallback) */}
                  {accountsByManagerSorted.map(({ manager, children }) => {
                    const isCollapsed = collapsedManagers.has(manager.customer_id);
                    return (
                      <div key={manager.customer_id} className="space-y-2">
                        {/* Manager Account - Disabled Header */}
                        <div 
                          className="bg-[#F5F5F5] border border-[#D0D0C8] rounded-2xl p-4 cursor-pointer hover:bg-[#EDEDED] transition-colors"
                          onClick={() => toggleManagerCollapse(manager.customer_id)}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={false}
                              disabled={true}
                              className="w-4 h-4 text-[#072929] border-[#E6E6E6] rounded opacity-50 cursor-not-allowed"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="text-[16px] font-semibold text-[#556179]">
                                  {manager.name}
                                </h3>
                                <span className="px-2 py-0.5 text-[11px] font-medium bg-[#E8F4F8] text-[#0066CC] rounded-full border border-[#B3D9E6]">
                                  Manager Account
                                </span>
                                {manager.status && manager.status !== "ENABLED" && (
                                  <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#EEEEEE] text-[#616161] border border-[#BDBDBD]">
                                    {manager.status}
                                  </span>
                                )}
                                <span className="text-[12px] text-[#556179]">
                                  ({children.length} {children.length === 1 ? "account" : "accounts"})
                                </span>
                              </div>
                              <div className="flex gap-4 text-[14px] text-[#556179] flex-wrap">
                                <span>Customer ID: {manager.customer_id}</span>
                                {manager.currency_code && (
                                  <span>Currency: {manager.currency_code}</span>
                                )}
                                {manager.timezone && (
                                  <span>Timezone: {manager.timezone}</span>
                                )}
                              </div>
                            </div>
                            {/* Collapse/Expand Arrow - Right side, center aligned */}
                            <div className="flex items-center justify-center">
                              <svg
                                className={`w-5 h-5 text-[#556179] transition-transform ${
                                  isCollapsed ? "" : "rotate-90"
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                        
                        {/* Child Accounts - Nested (only show if not collapsed) */}
                        {!isCollapsed && (
                          <div className="ml-6 space-y-2">
                            {children.map((child) => {
                            const isSelected = selectedCustomerIds.has(child.customer_id);
                            const isDisabled = child.status === "CLOSED" || child.status === "CANCELED";
                            return (
                              <div
                                key={child.customer_id}
                                className={`bg-[#FEFEFB] border rounded-2xl p-4 transition-all ${
                                  isDisabled
                                    ? "opacity-70 border-[#E0E0E0] cursor-not-allowed"
                                    : isSelected
                                    ? "border-[#072929] bg-[#F0F0ED] cursor-pointer"
                                    : "border-[#E8E8E3] hover:border-[#D0D0C8] cursor-pointer"
                                }`}
                                onClick={() => !isDisabled && toggleSelection(child.customer_id)}
                              >
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={isDisabled}
                                    onChange={() => !isDisabled && toggleSelection(child.customer_id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`mt-1 w-4 h-4 text-[#072929] border-[#E6E6E6] rounded focus:ring-[#072929] ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <h3 className={`text-[16px] font-medium ${isDisabled ? "text-[#9E9E9E]" : "text-[#072929]"}`}>
                                        {child.name}
                                      </h3>
                                      {child.status && child.status !== "ENABLED" && (
                                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#EEEEEE] text-[#616161] border border-[#BDBDBD]">
                                          {child.status}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex gap-4 text-[14px] text-[#556179] flex-wrap">
                                      <span>Customer ID: {child.customer_id}</span>
                                      {child.currency_code && (
                                        <span>Currency: {child.currency_code}</span>
                                      )}
                                      {child.timezone && (
                                        <span>Timezone: {child.timezone}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Standalone accounts (no manager) */}
                  {standaloneOnly.length > 0 && (
                    <div className="space-y-2">
                      {standaloneOnly.map((account) => {
                        const isSelected = selectedCustomerIds.has(account.customer_id);
                        const isDisabled = account.status === "CLOSED" || account.status === "CANCELED";
                        return (
                          <div
                            key={account.customer_id}
                            className={`bg-[#FEFEFB] border rounded-2xl p-4 transition-all ${
                              isDisabled
                                ? "opacity-70 border-[#E0E0E0] cursor-not-allowed"
                                : isSelected
                                ? "border-[#072929] bg-[#F0F0ED] cursor-pointer"
                                : "border-[#E8E8E3] hover:border-[#D0D0C8] cursor-pointer"
                            }`}
                            onClick={() => !isDisabled && toggleSelection(account.customer_id)}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isDisabled}
                                onChange={() => !isDisabled && toggleSelection(account.customer_id)}
                                onClick={(e) => e.stopPropagation()}
                                className={`mt-1 w-4 h-4 text-[#072929] border-[#E6E6E6] rounded focus:ring-[#072929] ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h3 className={`text-[16px] font-medium ${isDisabled ? "text-[#9E9E9E]" : "text-[#072929]"}`}>
                                    {account.name}
                                  </h3>
                                  {account.status && account.status !== "ENABLED" && (
                                    <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#EEEEEE] text-[#616161] border border-[#BDBDBD]">
                                      {account.status}
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-4 text-[14px] text-[#556179] flex-wrap">
                                  <span>Customer ID: {account.customer_id}</span>
                                  {account.currency_code && (
                                    <span>Currency: {account.currency_code}</span>
                                  )}
                                  {account.timezone && (
                                    <span>Timezone: {account.timezone}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                    </>
                  )}
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigate(
                        accountIdForBack != null
                          ? `/brands/${accountIdForBack}/integrations`
                          : "/brands"
                      )
                    }
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || totalSelectedCount === 0}
                  >
                    {saving
                      ? "Saving..."
                      : `Save ${totalSelectedCount} Account${
                          totalSelectedCount !== 1 ? "s" : ""
                        }`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
