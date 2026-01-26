// Video Campaign Form Component
// This component displays a read-only message for VIDEO campaigns
// since they cannot be created via the Google Ads API

import React from "react";

export const GoogleVideoCampaignForm: React.FC = () => {
  return (
    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <div>
          <h4 className="text-[13px] font-semibold text-yellow-800 mb-1">
            Video Campaigns Cannot Be Created via API
          </h4>
          <p className="text-[12px] text-yellow-700">
            VIDEO campaigns cannot be created or modified via the Google Ads API. Please use the Google Ads UI to create Video campaigns, or use Demand Gen or Performance Max campaigns for video placements.
          </p>
        </div>
      </div>
    </div>
  );
};
