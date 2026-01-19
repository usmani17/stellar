import React, { useState, useEffect, useRef, useCallback } from "react";
import { useGoogleSyncStatusContext } from "../contexts/GoogleSyncStatusContext";
import { Banner } from "../components/ui/Banner";
import type { SyncStatus } from "../services/googleAdwords/googleAdwordsSyncStatus";

type EntityType = "campaigns" | "adgroups" | "ads" | "keywords";

interface UseGoogleSyncStatusOptions {
  accountId: string | undefined;
  entityType: EntityType;
  currentData: any[]; // Array to check if empty for auto-reload
  loadFunction: (accountId: number) => Promise<void>;
}

interface UseGoogleSyncStatusReturn {
  syncStatus: SyncStatus | null;
  showRefreshButton: boolean;
  checkSyncStatus: () => Promise<void>; // Function to manually check sync status
  SyncStatusBanner: React.FC;
}

export const useGoogleSyncStatus = ({
  accountId,
  entityType,
  currentData,
  loadFunction,
}: UseGoogleSyncStatusOptions): UseGoogleSyncStatusReturn => {
  // Get sync status from context (shared across all pages - single API call)
  const { syncStatus: contextSyncStatus, checkSyncStatus: contextCheckSyncStatus } = useGoogleSyncStatusContext();
  
  // Get status for this specific entity type
  const syncStatus = contextSyncStatus[entityType];
  
  // Debug logging
  console.log(`[${entityType}] Hook - contextSyncStatus:`, contextSyncStatus, `syncStatus for ${entityType}:`, syncStatus);
  
  const [showRefreshButton, setShowRefreshButton] = useState(false);
  const [showCompletedBanner, setShowCompletedBanner] = useState(false); // Only show if transitioned from syncing
  const previousStatusRef = useRef<string | null>(null); // Use ref to track previous status
  const loadFunctionRef = useRef(loadFunction); // Store loadFunction in a ref
  const isInitialLoadRef = useRef(true); // Track if this is the initial page load

  // Update ref when loadFunction changes
  useEffect(() => {
    loadFunctionRef.current = loadFunction;
  }, [loadFunction]);

  // Check sync status function - delegates to context (which handles polling centrally)
  const checkSyncStatus = useCallback(async () => {
    await contextCheckSyncStatus();
  }, [contextCheckSyncStatus]);

  // Track status changes and handle UI updates
  useEffect(() => {
    if (!syncStatus) {
      // Reset on initial load
      isInitialLoadRef.current = true;
      previousStatusRef.current = null;
      return;
    }

    const previousStatus = previousStatusRef.current;
    const currentStatus = syncStatus.status;

    // Show completed banner if we transitioned from syncing to completed (not on initial load)
    if (previousStatus === "syncing" && currentStatus === "completed" && !isInitialLoadRef.current) {
      console.log(`[${entityType}] Transition from syncing to completed - showing success banner`);
      setShowCompletedBanner(true);
    } else if (currentStatus !== "completed") {
      // Hide banner if status changes away from completed
      setShowCompletedBanner(false);
    }

    // Auto-reload if sync completed and table is empty
    if (
      previousStatus === "syncing" &&
      currentStatus === "completed" &&
      currentData.length === 0 &&
      accountId
    ) {
      const accountIdNum = parseInt(accountId, 10);
      if (!isNaN(accountIdNum)) {
        loadFunctionRef.current(accountIdNum);
      }
    }

    // Show refresh button if sync completed and data exists
    if (currentStatus === "completed" && currentData.length > 0) {
      setShowRefreshButton(true);
    } else {
      setShowRefreshButton(false);
    }

    // Update previous status for next check
    previousStatusRef.current = currentStatus;
    isInitialLoadRef.current = false;
  }, [syncStatus, entityType, currentData.length, accountId]);

  // Sync Status Banner Component
  const SyncStatusBanner: React.FC = () => {
    // Debug: log sync status
    console.log(`[${entityType}] SyncStatusBanner render - syncStatus:`, syncStatus, `contextSyncStatus:`, contextSyncStatus);
    
    // If syncStatus is null, it means the context hasn't loaded yet or there's no status
    // We should still try to show something if we know the context is loading
    if (!syncStatus) {
      console.log(`[${entityType}] SyncStatusBanner - no syncStatus yet, returning null`);
      return null;
    }

    const entityNameMap: Record<EntityType, string> = {
      campaigns: "campaigns",
      adgroups: "ad groups",
      ads: "ads",
      keywords: "keywords",
    };

    const entityName = entityNameMap[entityType];

    // Always show syncing banner when status is syncing (even on initial load)
    if (syncStatus.status === "syncing") {
      return (
        <div className="mb-4">
          <div className="relative bg-sandstorm-s40 text-forest-f60 min-h-[52px] px-4 py-3 rounded-lg flex items-center gap-3">
            {/* Loading Spinner */}
            <div className="flex items-center justify-center shrink-0">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-forest-f60 border-t-transparent"></div>
            </div>
            {/* Message */}
            <div className="flex-1 text-[14px] leading-5 font-medium text-forest-f60">
              Syncing {entityName}...
            </div>
          </div>
        </div>
      );
    }

    if (syncStatus.status === "completed" && showCompletedBanner) {
      return (
        <div className="mb-4">
          <Banner
            type="success"
            message={`${entityName.charAt(0).toUpperCase() + entityName.slice(1)} sync completed`}
            dismissable={true}
            onDismiss={() => {
              setShowCompletedBanner(false);
              setShowRefreshButton(false);
            }}
            cta={showRefreshButton}
            ctaText="Refresh"
            onCtaClick={async () => {
              if (accountId) {
                const accountIdNum = parseInt(accountId, 10);
                if (!isNaN(accountIdNum)) {
                  await loadFunctionRef.current(accountIdNum);
                  setShowRefreshButton(false);
                  setShowCompletedBanner(false);
                }
              }
            }}
          />
        </div>
      );
    }

    if (syncStatus.status === "error") {
      return (
        <div className="mb-4">
          <Banner
            type="error"
            message={`${entityName.charAt(0).toUpperCase() + entityName.slice(1)} sync encountered an error`}
            dismissable={true}
            onDismiss={() => {
              // Don't clear syncStatus from context, just hide the banner
            }}
          />
        </div>
      );
    }

    return null;
  };

  return {
    syncStatus,
    showRefreshButton,
    checkSyncStatus,
    SyncStatusBanner,
  };
};
