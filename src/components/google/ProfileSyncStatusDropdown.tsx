import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";
import { formatTimeAgo } from "../../utils/dateHelpers";
import type { SyncStatus } from "../../services/googleAdwords/googleAdwordsSyncStatus";

interface ProfileSyncStatusDropdownProps {
  syncStatus: SyncStatus;
  entityType: "campaigns" | "adgroups" | "ads" | "keywords";
  className?: string;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "syncing":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-sandstorm-s10 text-forest-f60 border border-sandstorm-s40">
          <div className="w-2 h-2 rounded-full bg-forest-f60 animate-pulse"></div>
          Syncing
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-forest-f0 text-forest-f60 border border-forest-f20">
          <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
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
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-red-r0 text-red-r30 border border-red-r30">
          <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
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
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-sandstorm-s10 text-forest-f30 border border-sandstorm-s40">
          Idle
        </span>
      );
  }
};

export const ProfileSyncStatusDropdown: React.FC<ProfileSyncStatusDropdownProps> = ({
  syncStatus,
  entityType,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    width?: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const profiles = syncStatus.profiles || [];

  // Calculate menu position when dropdown opens
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: Math.max(rect.width, 400),
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isOpen]);

  if (profiles.length === 0) {
    // If no profiles, just show the aggregated status
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        <span className="text-sm text-forest-f60">
          {syncStatus.last_synced_at
            ? `Last synced: ${formatTimeAgo(syncStatus.last_synced_at)}`
            : "Never synced"}
        </span>
        {getStatusBadge(syncStatus.status)}
      </div>
    );
  }

  const entityNameMap: Record<typeof entityType, string> = {
    campaigns: "Campaigns",
    adgroups: "Ad Groups",
    ads: "Ads",
    keywords: "Keywords",
  };

  return (
    <>
      <div ref={dropdownRef} className={cn("inline-flex", className)}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-forest-f60 hover:bg-sandstorm-s30 border border-sandstorm-s40 transition-colors"
        >
          <span>
            {syncStatus.last_synced_at
              ? `Last synced: ${formatTimeAgo(syncStatus.last_synced_at)}`
              : "Never synced"}
          </span>
          {getStatusBadge(syncStatus.status)}
          <svg
            className={cn(
              "w-4 h-4 transition-transform",
              isOpen && "rotate-180"
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {isOpen &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 bg-sandstorm-s0 rounded-lg shadow-lg border border-sandstorm-s40 overflow-hidden"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              width: `${menuPosition.width}px`,
              maxHeight: "500px",
              overflowY: "auto",
            }}
          >
            <div className="p-4 border-b border-sandstorm-s40 bg-sandstorm-s10">
              <h3 className="text-sm font-semibold text-forest-f60">
                {entityNameMap[entityType]} Sync Status
              </h3>
              <p className="text-xs text-forest-f30 mt-1">
                {profiles.length} profile{profiles.length !== 1 ? "s" : ""} connected
              </p>
            </div>

            <div className="divide-y divide-sandstorm-s40">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="p-4 hover:bg-sandstorm-s10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-medium text-forest-f60 truncate">
                          {profile.name}
                        </h4>
                        {getStatusBadge(profile.status)}
                      </div>
                      <p className="text-xs text-forest-f30 mb-2">
                        {profile.customer_id ||
                          profile.advertiser_id ||
                          profile.profileId}
                      </p>
                      <p className="text-xs text-forest-f60">
                        {profile.last_synced_at
                          ? `Last synced: ${formatTimeAgo(profile.last_synced_at)}`
                          : "Never synced"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
