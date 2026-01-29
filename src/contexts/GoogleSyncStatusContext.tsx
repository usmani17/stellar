import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useParams, useLocation } from "react-router-dom";
import { googleAdwordsSyncStatusService, type SyncStatus } from "../services/googleAdwords/googleAdwordsSyncStatus";
import { getAccountIdFromUrl } from "../utils/urlHelpers";

interface GoogleSyncStatusContextType {
  syncStatus: {
    campaigns: SyncStatus | null;
    adgroups: SyncStatus | null;
    ads: SyncStatus | null;
    keywords: SyncStatus | null;
  };
  loading: boolean;
  checkSyncStatus: () => Promise<void>;
  isPolling: boolean;
}

const GoogleSyncStatusContext = createContext<GoogleSyncStatusContextType | undefined>(undefined);

export const GoogleSyncStatusProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Try to get accountId and channelId from params first, fallback to URL parsing
  const params = useParams<{ accountId: string; channelId: string }>();
  const location = useLocation();
  const accountId = params.accountId || getAccountIdFromUrl(location.pathname)?.toString() || undefined;
  const channelId = params.channelId;
  
  console.log(`[GoogleSyncStatus] Provider render - accountId from params:`, params.accountId, `channelId:`, channelId, `from URL:`, getAccountIdFromUrl(location.pathname), `final accountId:`, accountId);
  const [syncStatus, setSyncStatus] = useState<{
    campaigns: SyncStatus | null;
    adgroups: SyncStatus | null;
    ads: SyncStatus | null;
    keywords: SyncStatus | null;
  }>({
    campaigns: null,
    adgroups: null,
    ads: null,
    keywords: null,
  });
  const [loading, setLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRequestIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const requestAbortControllerRef = useRef<AbortController | null>(null);

  // Check sync status function
  const checkSyncStatus = useCallback(async () => {
    if (!accountId || !channelId) return;

    const accountIdNum = parseInt(accountId, 10);
    const channelIdNum = parseInt(channelId, 10);
    if (isNaN(accountIdNum) || isNaN(channelIdNum)) return;

    try {
      setLoading(true);
      const response = await googleAdwordsSyncStatusService.getGoogleSyncStatus(accountIdNum, channelIdNum);
      
      if (!isMountedRef.current) return;
      
      setSyncStatus({
        campaigns: response.campaigns,
        adgroups: response.adgroups,
        ads: response.ads,
        keywords: response.keywords,
      });

      // Check if any entity is syncing - if so, ensure polling is active
      const anySyncing = 
        response.campaigns?.status === "syncing" ||
        response.adgroups?.status === "syncing" ||
        response.ads?.status === "syncing" ||
        response.keywords?.status === "syncing";

      // If nothing is syncing and we have polling active, stop it
      if (!anySyncing && pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setIsPolling(false);
      }
    } catch (error) {
      console.error("Failed to check sync status:", error);
    } finally {
      setLoading(false);
    }
  }, [accountId, channelId]);

  // Initial load - fetch sync status once per accountId and channelId
  useEffect(() => {
    console.log(`[GoogleSyncStatus] Initial load effect - accountId:`, accountId, `channelId:`, channelId);
    
    if (!accountId || !channelId) {
      console.log(`[GoogleSyncStatus] No accountId or channelId, skipping fetch`);
      return;
    }

    const accountIdNum = parseInt(accountId, 10);
    const channelIdNum = parseInt(channelId, 10);
    if (isNaN(accountIdNum) || isNaN(channelIdNum)) {
      console.log(`[GoogleSyncStatus] Invalid accountId or channelId: accountId=${accountId}, channelId=${channelId}`);
      return;
    }

    // Create unique request ID to prevent duplicates (handles React StrictMode)
    const requestId = `sync-status-${accountId}-${channelId}`;
    
    // Skip if this is the same request as the last one
    if (lastRequestIdRef.current === requestId) {
      console.log(`[GoogleSyncStatus] Skipping duplicate request: ${requestId}`);
      return;
    }

    // Cancel any pending request
    if (requestAbortControllerRef.current) {
      requestAbortControllerRef.current.abort();
    }

    lastRequestIdRef.current = requestId;
    const abortController = new AbortController();
    requestAbortControllerRef.current = abortController;

    console.log(`[GoogleSyncStatus] Making initial sync status API call for account ${accountIdNum}, channel ${channelIdNum}`);

    googleAdwordsSyncStatusService
      .getGoogleSyncStatus(accountIdNum, channelIdNum)
      .then((response) => {
        if (abortController.signal.aborted || !isMountedRef.current) return;
        
        console.log(`[GoogleSyncStatus] Received sync status response:`, response);
        
        setSyncStatus({
          campaigns: response.campaigns,
          adgroups: response.adgroups,
          ads: response.ads,
          keywords: response.keywords,
        });
        
        console.log(`[GoogleSyncStatus] Set sync status - campaigns:`, response.campaigns?.status);

        // Check if any entity is syncing
        const anySyncing = 
          response.campaigns?.status === "syncing" ||
          response.adgroups?.status === "syncing" ||
          response.ads?.status === "syncing" ||
          response.keywords?.status === "syncing";

        if (anySyncing && !pollingIntervalRef.current) {
          // Start polling if something is syncing
          setIsPolling(true);
          const intervalId = setInterval(() => {
            checkSyncStatus();
          }, 15000); // Poll every 15 seconds
          pollingIntervalRef.current = intervalId;
        }
      })
      .catch((error) => {
        if (!abortController.signal.aborted) {
          console.error("Failed to check sync status on mount:", error);
        }
      });

    return () => {
      if (abortController && !abortController.signal.aborted) {
        abortController.abort();
      }
    };
  }, [accountId, location.pathname]);

  // Manage polling based on sync status
  useEffect(() => {
    if (!accountId) return;

    const anySyncing = 
      syncStatus.campaigns?.status === "syncing" ||
      syncStatus.adgroups?.status === "syncing" ||
      syncStatus.ads?.status === "syncing" ||
      syncStatus.keywords?.status === "syncing";

    // Start polling if something is syncing and we don't have an active interval
    if (anySyncing && !pollingIntervalRef.current) {
      console.log("[GoogleSyncStatus] Starting polling - entity is syncing");
      setIsPolling(true);
      const intervalId = setInterval(() => {
        checkSyncStatus();
      }, 15000);
      pollingIntervalRef.current = intervalId;
    }

    // Stop polling if nothing is syncing and we have an active interval
    if (!anySyncing && pollingIntervalRef.current) {
      console.log("[GoogleSyncStatus] Stopping polling - no entities syncing");
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setIsPolling(false);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setIsPolling(false);
      }
    };
  }, [accountId, channelId, syncStatus, checkSyncStatus]);

  // Global cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      console.log("[GoogleSyncStatus] Component unmounting - cleaning up");
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setIsPolling(false);
      }
      if (requestAbortControllerRef.current) {
        requestAbortControllerRef.current.abort();
        requestAbortControllerRef.current = null;
      }
      lastRequestIdRef.current = null;
    };
  }, []);

  const contextValue = useMemo<GoogleSyncStatusContextType>(
    () => ({
      syncStatus,
      loading,
      checkSyncStatus,
      isPolling,
    }),
    [syncStatus, loading, checkSyncStatus, isPolling]
  );

  return (
    <GoogleSyncStatusContext.Provider value={contextValue}>
      {children}
    </GoogleSyncStatusContext.Provider>
  );
};

export const useGoogleSyncStatusContext = (): GoogleSyncStatusContextType => {
  const context = useContext(GoogleSyncStatusContext);
  if (context === undefined) {
    throw new Error("useGoogleSyncStatusContext must be used within a GoogleSyncStatusProvider");
  }
  return context;
};
