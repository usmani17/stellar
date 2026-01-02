import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { Button } from "../../components/ui";

export const TikTokCreateCampaign: React.FC = () => {
    const { accountId } = useParams<{ accountId: string }>();
    const { sidebarWidth } = useSidebar();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white flex">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div
                className="flex-1 min-w-0 w-full"
                style={{ marginLeft: `${sidebarWidth}px` }}
            >
                {/* Header */}
                <DashboardHeader />

                {/* Main Content Area */}
                <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white">
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <h1 className="text-[20px] sm:text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                                Create TikTok Campaign
                            </h1>
                            <Button
                                onClick={() => {
                                    if (accountId) {
                                        navigate(`/accounts/${accountId}/tiktok/campaigns`);
                                    }
                                }}
                                variant="outline"
                            >
                                Back to Campaigns
                            </Button>
                        </div>

                        {/* Placeholder Content */}
                        <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-8 text-center">
                            <p className="text-[13.3px] text-[#556179] mb-4">
                                Create Campaign functionality coming soon
                            </p>
                            <p className="text-[13.3px] text-[#556179]">
                                This page will allow you to create new TikTok Ads campaigns.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
