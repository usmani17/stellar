import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useGoogleSyncStatusContext } from "../../contexts/GoogleSyncStatusContext";
import { formatTimeAgo } from "../../utils/dateHelpers";
import type { ProfileSyncStatus } from "../../services/googleAdwords/googleAdwordsSyncStatus";

// Add animation styles
const animationStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

interface SyncStatusIndicatorProps {
  entityType: "campaigns" | "adgroups" | "ads" | "keywords";
}

const getStatusBadge = (status: string, size: "sm" | "md" = "sm") => {
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";
  
  switch (status) {
    case "syncing":
      return (
        <span className={`inline-flex items-center gap-1.5 ${sizeClasses} rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200`}>
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
          Syncing
        </span>
      );
    case "completed":
      return (
        <span className={`inline-flex items-center gap-1.5 ${sizeClasses} rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200`}>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Completed
        </span>
      );
    case "error":
      return (
        <span className={`inline-flex items-center gap-1.5 ${sizeClasses} rounded-full font-medium bg-red-50 text-red-700 border border-red-200`}>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          Error
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 ${sizeClasses} rounded-full font-medium bg-gray-50 text-gray-600 border border-gray-200`}>
          <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
          Idle
        </span>
      );
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "syncing":
      return "text-amber-600";
    case "completed":
      return "text-emerald-600";
    case "error":
      return "text-red-600";
    default:
      return "text-gray-500";
  }
};

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  entityType,
}) => {
  const { syncStatus } = useGoogleSyncStatusContext();
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const status = syncStatus[entityType];
  const profiles = status?.profiles || [];

  // Calculate tooltip position when hovering
  useEffect(() => {
    if (isHovered && indicatorRef.current) {
      const rect = indicatorRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  }, [isHovered]);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        indicatorRef.current &&
        !indicatorRef.current.contains(event.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setIsHovered(false);
      }
    };

    if (isHovered) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isHovered]);

  if (!status) {
    return null;
  }

  const entityNameMap: Record<typeof entityType, string> = {
    campaigns: "Campaigns",
    adgroups: "Ad Groups",
    ads: "Ads",
    keywords: "Keywords",
  };

  return (
    <>
      <style>{animationStyles}</style>
      <div
        ref={indicatorRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex items-center gap-2 cursor-default group px-2 py-1 rounded transition-colors hover:bg-gray-50"
      >
        {/* Sync Icon */}
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-600 font-medium">Sync Status:</span>
          {getStatusBadge(status.status, "sm")}
          {status.last_synced_at && (
            <span className={`text-xs font-normal ${getStatusColor(status.status)} transition-opacity group-hover:opacity-70`}>
              {formatTimeAgo(status.last_synced_at)}
            </span>
          )}
        </div>
      </div>

      {isHovered &&
        tooltipPosition &&
        createPortal(
          <div
            ref={tooltipRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="fixed z-50"
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
              animation: "fadeInUp 0.2s ease-out",
            }}
          >
            <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden min-w-[380px] max-w-md">
              {/* Header */}
              <div className="bg-gradient-to-r from-gray-50 to-white px-5 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {entityNameMap[entityType]} Sync Status
                  </h3>
                  {getStatusBadge(status.status, "sm")}
                </div>
                {status.last_synced_at && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Last synced {formatTimeAgo(status.last_synced_at)}</span>
                  </div>
                )}
              </div>

              {/* Profiles List */}
              {profiles.length > 0 ? (
                <div className="px-5 py-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                      Profiles ({profiles.length})
                    </p>
                  </div>
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {profiles.map((profile: ProfileSyncStatus, index: number) => (
                      <div
                        key={profile.id}
                        className={`p-3 rounded-lg border transition-all hover:shadow-sm ${
                          index === profiles.length - 1 ? "" : "border-b-0"
                        } ${
                          profile.status === "syncing"
                            ? "bg-amber-50/50 border-amber-100"
                            : profile.status === "completed"
                            ? "bg-emerald-50/30 border-emerald-100"
                            : profile.status === "error"
                            ? "bg-red-50/50 border-red-100"
                            : "bg-gray-50/50 border-gray-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-semibold text-gray-900 truncate">
                                {profile.name}
                              </h4>
                              {getStatusBadge(profile.status, "sm")}
                            </div>
                            <p className="text-xs text-gray-500 font-mono truncate">
                              {profile.customer_id ||
                                profile.advertiser_id ||
                                profile.profileId}
                            </p>
                            {profile.last_synced_at && (
                              <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{formatTimeAgo(profile.last_synced_at)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-5 py-8 text-center">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">No profiles connected</p>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
