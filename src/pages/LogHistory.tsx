import React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { LogsTable } from "../components/campaigns/LogsTable";

export const LogHistory: React.FC = () => {
  const { accountId, campaignId } = useParams<{
    accountId?: string;
    campaignId?: string;
  }>();
  const [searchParams] = useSearchParams();
  const { sidebarWidth } = useSidebar();

  // Get campaignId from URL params or searchParams
  const urlCampaignId =
    campaignId || searchParams.get("campaignId") || undefined;

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
          <LogsTable
            accountId={accountId}
            campaignId={urlCampaignId}
            showHeader={true}
            showExport={true}
          />
        </div>
      </div>
    </div>
  );
};
