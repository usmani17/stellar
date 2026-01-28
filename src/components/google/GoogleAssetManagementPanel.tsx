import React, { useState, useMemo } from "react";
import { GoogleCampaignAssetsTab } from "./GoogleCampaignAssetsTab";
import { GoogleAssetGroupAssetsTab } from "./GoogleAssetGroupAssetsTab";

interface GoogleAssetManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: number;
  campaignId?: string; // Optional - for campaign-level asset management
  assetGroupId?: string; // Optional - for asset group-level asset management
  mode?: "campaign" | "asset-group" | "both"; // Which tabs to show
}

export const GoogleAssetManagementPanel: React.FC<GoogleAssetManagementPanelProps> = ({
  isOpen,
  onClose,
  profileId,
  campaignId,
  assetGroupId,
  mode = "both",
}) => {
  const [activeTab, setActiveTab] = useState<string>("Campaign Assets");

  // Determine which tabs to show based on mode
  const tabs = useMemo(() => {
    const availableTabs: string[] = [];
    if (mode === "campaign" || mode === "both") {
      availableTabs.push("Campaign Assets");
    }
    if (mode === "asset-group" || mode === "both") {
      availableTabs.push("Asset Group Assets");
    }
    return availableTabs;
  }, [mode]);

  // Reset to first tab when panel opens
  React.useEffect(() => {
    if (isOpen && tabs.length > 0) {
      setActiveTab(tabs[0]);
    }
  }, [isOpen, tabs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] mx-4 border border-[#E8E8E3] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E8E8E3]">
          <h2 className="text-[20px] font-semibold text-[#072929]">Manage Assets</h2>
          <button
            onClick={onClose}
            className="text-[#556179] hover:text-[#072929] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        {tabs.length > 1 && (
          <div className="border-b border-[#E8E8E3] px-6">
            <div className="flex space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-[14px] font-medium transition-colors border-b-2 cursor-pointer ${
                    activeTab === tab
                      ? "border-[#136D6D] text-[#136D6D]"
                      : "border-transparent text-[#556179] hover:text-[#072929]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "Campaign Assets" && campaignId && (
            <GoogleCampaignAssetsTab
              profileId={profileId}
              campaignId={campaignId}
            />
          )}
          {activeTab === "Asset Group Assets" && assetGroupId && (
            <GoogleAssetGroupAssetsTab
              profileId={profileId}
              assetGroupId={assetGroupId}
              campaignId={campaignId}
            />
          )}
        </div>
      </div>
    </div>
  );
};
