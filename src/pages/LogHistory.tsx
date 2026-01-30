import React, { useState } from "react";
import { useParams, useSearchParams, useLocation } from "react-router-dom";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { LogsTable } from "../components/campaigns/LogsTable";

const MARKETPLACES = [
  { id: "all", name: "All Marketplaces", label: "All Marketplaces" },
  { id: "amazon", name: "Amazon", label: "Amazon" },
  { id: "google", name: "Google", label: "Google" },
  { id: "tiktok", name: "TikTok", label: "TikTok" },
];

export const LogHistory: React.FC = () => {
  const { accountId, channelId, campaignId } = useParams<{
    accountId?: string;
    channelId?: string;
    campaignId?: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { sidebarWidth } = useSidebar();

  // Get campaignId from URL params or searchParams
  const urlCampaignId =
    campaignId || searchParams.get("campaignId") || undefined;

  // Extract marketplace from URL path (supports both /logs and /log-history patterns)
  let marketplaceFromUrl: string | undefined;
  const isMarketplaceSpecificRoute =
    location.pathname.includes("/amazon/logs") ||
    location.pathname.includes("/amazon/log-history") ||
    location.pathname.includes("/google/logs") ||
    location.pathname.includes("/google/log-history") ||
    location.pathname.includes("/tiktok/logs") ||
    location.pathname.includes("/tiktok/log-history");

  if (location.pathname.includes("/amazon/logs") || location.pathname.includes("/amazon/log-history")) {
    marketplaceFromUrl = "amazon";
  } else if (location.pathname.includes("/google/logs") || location.pathname.includes("/google/log-history")) {
    marketplaceFromUrl = "google";
  } else if (location.pathname.includes("/tiktok/logs") || location.pathname.includes("/tiktok/log-history")) {
    marketplaceFromUrl = "tiktok";
  }

  // Get marketplace from URL or search params, default to "all" for global route
  const marketplaceParam = searchParams.get("marketplace");
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>(
    marketplaceFromUrl || marketplaceParam || "all"
  );

  // Handle marketplace filter change (only for global route)
  const handleMarketplaceChange = (value: string) => {
    setSelectedMarketplace(value);
    const newSearchParams = new URLSearchParams(searchParams);
    if (value === "all") {
      newSearchParams.delete("marketplace");
    } else {
      newSearchParams.set("marketplace", value);
    }
    setSearchParams(newSearchParams);
  };

  // Determine which marketplace to pass to LogsTable
  // For marketplace-specific routes, use the marketplace from URL
  // For global route, use selected marketplace (undefined means all)
  const marketplaceForTable = isMarketplaceSpecificRoute
    ? marketplaceFromUrl
    : selectedMarketplace === "all"
    ? undefined
    : selectedMarketplace;

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        className="flex-1 bg-white"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {/* Main Content Area */}
        <div className="p-8 bg-white min-h-screen">
          <div className="space-y-4">
            {/* Header with Marketplace Filter */}
            <div className="flex justify-between items-center">
              <h2 className="text-[20px] font-semibold text-[#072929]">
                Logs
              </h2>
              {/* Only show marketplace dropdown on global logs route */}
              {!isMarketplaceSpecificRoute && (
                <select
                  id="marketplace-filter"
                  value={selectedMarketplace}
                  onChange={(e) => handleMarketplaceChange(e.target.value)}
                  className="px-3 py-2 border border-sandstorm-s40 rounded-lg bg-white text-[#072929] text-sm focus:outline-none focus:ring-2 focus:ring-sandstorm-s60 min-w-[180px]"
                >
                  {MARKETPLACES.map((marketplace) => (
                    <option key={marketplace.id} value={marketplace.id}>
                      {marketplace.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Single Logs Table */}
            <LogsTable
              accountId={accountId}
              channelId={marketplaceFromUrl === "google" ? channelId : undefined}
              campaignId={urlCampaignId}
              marketplace={marketplaceForTable}
              showHeader={false}
              showExport={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
