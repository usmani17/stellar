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
  
  @keyframes dotPulse {
    0%, 100% {
      opacity: 0.3;
      transform: scale(0.8);
    }
    50% {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes syncingDots {
    0%, 20% {
      opacity: 0.3;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.3;
    }
  }
  
  .syncing-dot {
    animation: syncingDots 1.4s ease-in-out infinite;
  }
  
  .syncing-dot:nth-child(1) {
    animation-delay: 0s;
  }
  
  .syncing-dot:nth-child(2) {
    animation-delay: 0.2s;
  }
  
  .syncing-dot:nth-child(3) {
    animation-delay: 0.4s;
  }
`;

interface SyncStatusIndicatorProps {
  entityType: "campaigns" | "adgroups" | "ads" | "keywords";
}

const getStatusBadge = (status: string, size: "sm" | "md" = "sm") => {
  const sizeClasses = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  
  switch (status) {
    case "syncing":
      return (
        <span className={`inline-flex items-center gap-1 ${sizeClasses} rounded-full font-medium bg-forest-f0 text-forest-f60 border border-forest-f20 animate-pulse`}>
          <div className="w-1.5 h-1.5 rounded-full bg-forest-f60"></div>
          Syncing
        </span>
      );
    case "completed":
      return (
        <span className={`inline-flex items-center gap-1 ${sizeClasses} rounded-full font-medium bg-forest-f0 text-forest-f60 border border-forest-f20`}>
          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Synced
        </span>
      );
    case "error":
      return (
        <span className={`inline-flex items-center gap-1 ${sizeClasses} rounded-full font-medium bg-red-r0 text-red-r30 border border-red-r30`}>
          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
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
        <span className={`inline-flex items-center ${sizeClasses} rounded-full font-medium text-forest-f30 border border-sandstorm-s40`}>
          —
        </span>
      );
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "syncing":
      return "text-forest-f60";
    case "completed":
      return "text-forest-f60";
    case "error":
      return "text-red-r30";
    default:
      return "text-forest-f30";
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
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const status = syncStatus[entityType];
  const profiles = status?.profiles || [];

  const PANEL_WIDTH = 320;
  const MARGIN = 16;

  // Calculate tooltip position when hovering and on scroll (viewport-aware)
  useEffect(() => {
    const updateTooltipPosition = () => {
      if (isHovered && indicatorRef.current && typeof window !== "undefined") {
        const rect = indicatorRef.current.getBoundingClientRect();
        const maxPanelHeight = Math.min(window.innerHeight * 0.7, 420);
        let left = rect.left;
        if (rect.left + PANEL_WIDTH + MARGIN > window.innerWidth) {
          left = window.innerWidth - PANEL_WIDTH - MARGIN;
        }
        let top = rect.bottom + 8;
        if (rect.bottom + maxPanelHeight + MARGIN > window.innerHeight) {
          top = Math.max(MARGIN, window.innerHeight - maxPanelHeight - MARGIN);
        }
        setTooltipPosition({ top, left });
      }
    };

    if (isHovered && indicatorRef.current) {
      updateTooltipPosition();
      
      // Use requestAnimationFrame for smooth updates
      let rafId: number;
      const handleScroll = () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
        rafId = requestAnimationFrame(updateTooltipPosition);
      };
      
      // Update position on scroll (capture phase to catch all scroll events)
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', updateTooltipPosition);
      
      // Also listen to scroll on document and body
      document.addEventListener('scroll', handleScroll, true);
      document.body.addEventListener('scroll', handleScroll, true);
      
      return () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', updateTooltipPosition);
        document.removeEventListener('scroll', handleScroll, true);
        document.body.removeEventListener('scroll', handleScroll, true);
      };
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  if (!status) {
    return null;
  }

  // Get status text with time
  const getStatusText = () => {
    if (status.status === "syncing") {
      return (
        <span className="inline-flex items-center gap-1">
          <span>syncing</span>
          <span className="flex items-center gap-0.5">
            <span className="syncing-dot w-1 h-1 rounded-full bg-forest-f60"></span>
            <span className="syncing-dot w-1 h-1 rounded-full bg-forest-f60"></span>
            <span className="syncing-dot w-1 h-1 rounded-full bg-forest-f60"></span>
          </span>
        </span>
      );
    }
    
    if (status.status === "completed" && status.last_synced_at) {
      const timeAgo = status.last_synced_before || formatTimeAgo(status.last_synced_at);
      return `synced ${timeAgo}`;
    }
    
    if (status.status === "error") {
      return "error";
    }
    
    return "—";
  };

  return (
    <>
      <style>{animationStyles}</style>
      <div
        ref={indicatorRef}
        onMouseEnter={() => {
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          // Add a small delay before closing to allow moving to tooltip
          hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(false);
          }, 100);
        }}
        className="flex items-center gap-1.5 cursor-pointer group px-2 py-1 border border-[#e5e7eb] rounded-md transition-all hover:border-forest-f40"
      >
        {/* Sync Icon */}
        <svg
          className={`w-3 h-3 flex-shrink-0 ${
            status.status === "syncing" 
              ? "text-forest-f60 animate-spin" 
              : "text-forest-f30"
          }`}
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
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] text-forest-f60 font-medium whitespace-nowrap">
            Status:
          </span>
          <span className={`text-[10px] font-medium whitespace-nowrap ${getStatusColor(status.status)}`}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {isHovered &&
        tooltipPosition &&
        createPortal(
          <div
            ref={tooltipRef}
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
              setIsHovered(true);
            }}
            onMouseLeave={() => {
              setIsHovered(false);
            }}
            className="fixed z-[100]"
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
              animation: "fadeInUp 0.2s ease-out",
            }}
          >
            <div className="bg-sandstorm-s0 rounded-lg shadow-xl border border-sandstorm-s40 overflow-hidden min-w-[320px] max-w-md flex flex-col max-h-[70vh]">
              {/* Header */}
              <div className="flex-shrink-0 px-3 py-1.5 border-b border-sandstorm-s40">
                <h3 className="text-xs font-semibold text-forest-f60">
                  Campaign Sync Status
                </h3>
              </div>

              {/* Profiles List */}
              {profiles.length > 0 ? (
                <div className="flex-1 min-h-0 flex flex-col px-3 py-2">
                  <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
                    <p className="text-[10px] font-medium text-forest-f60 uppercase tracking-wide">
                      Profiles ({profiles.length})
                    </p>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto pr-3 divide-y divide-sandstorm-s60">
                    {profiles.map((profile: ProfileSyncStatus) => (
                      <div
                        key={profile.id}
                        className={`flex items-start justify-between gap-2 py-3 pl-2.5 pr-0 first:pt-0 border-l-[3px] ${
                          profile.status === "syncing"
                            ? "border-l-forest-f40"
                            : profile.status === "completed"
                            ? "border-l-forest-f40"
                            : profile.status === "error"
                            ? "border-l-red-r30"
                            : "border-l-sandstorm-s40"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0">
                            <h4 className="text-xs font-semibold text-forest-f60 truncate">
                              {profile.name}
                            </h4>
                            {getStatusBadge(profile.status, "sm")}
                          </div>
                          <p className="text-[10px] text-forest-f30 font-mono truncate">
                            {profile.customer_id ||
                              profile.advertiser_id ||
                              profile.profileId}
                          </p>
                          {profile.last_synced_at && (
                            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-forest-f30">
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Last synced {profile.last_synced_before || formatTimeAgo(profile.last_synced_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-3 py-4 text-center">
                  <div className="text-forest-f30 mb-1.5">
                    <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <p className="text-xs text-forest-f30">No profiles connected</p>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
