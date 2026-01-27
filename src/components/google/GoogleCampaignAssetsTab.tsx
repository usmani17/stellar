import React, { useState, useEffect, useCallback, useRef } from "react";
import { googleAdwordsAssetsService, type CampaignAssets } from "../../services/googleAdwords/googleAdwordsAssets";
import { Loader } from "../ui/Loader";

interface GoogleCampaignAssetsTabProps {
  profileId: number;
  campaignId: string;
}

export const GoogleCampaignAssetsTab: React.FC<GoogleCampaignAssetsTabProps> = ({
  profileId,
  campaignId,
}) => {
  const [campaignAssets, setCampaignAssets] = useState<CampaignAssets | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const loadCampaignAssets = useCallback(async () => {
    // Prevent duplicate calls
    if (loadingRef.current) {
      return;
    }

    if (!profileId || !campaignId) {
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const response = await googleAdwordsAssetsService.getCampaignAssets(profileId, campaignId);
      if (response.success) {
        setCampaignAssets(response.campaign_assets);
      } else {
        setError("Failed to load campaign assets");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to load campaign assets");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [profileId, campaignId]);

  useEffect(() => {
    loadCampaignAssets();
  }, [loadCampaignAssets]);


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadCampaignAssets}
          className="px-4 py-2 bg-forest-f40 text-white rounded-lg hover:bg-forest-f50 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign-Level Assets</h3>
        <p className="text-sm text-gray-600 mb-4">
          These assets are linked at the campaign level (Business Name and Logo).
        </p>
      </div>

      {/* Business Name */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-900">Business Name</h4>
        </div>
        {campaignAssets?.business_name ? (
          <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
            <div className="text-sm">
              <p className="font-medium text-gray-900">{campaignAssets.business_name.name}</p>
              {campaignAssets.business_name.type === "TEXT" && "text" in campaignAssets.business_name && (
                <p className="text-gray-600 mt-1">{campaignAssets.business_name.text}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">ID: {campaignAssets.business_name.id}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No business name asset linked</p>
        )}
      </div>

      {/* Logo */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-900">Logo</h4>
        </div>
        {campaignAssets?.logo ? (
          <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
            <div className="text-sm">
              <p className="font-medium text-gray-900">{campaignAssets.logo.name}</p>
              {campaignAssets.logo.type === "IMAGE" && (
                <div className="mt-2">
                  {"image_url" in campaignAssets.logo && campaignAssets.logo.image_url ? (
                    <img
                      src={campaignAssets.logo.image_url}
                      alt={campaignAssets.logo.name}
                      className="max-w-full h-auto max-h-32 rounded border border-gray-200"
                      onError={(e) => {
                        // Fallback to text if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = document.createElement('p');
                          fallback.className = 'text-xs text-gray-500';
                          fallback.textContent = campaignAssets.logo.width && campaignAssets.logo.height
                            ? `${campaignAssets.logo.width}x${campaignAssets.logo.height}px`
                            : "Image asset";
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  ) : (
                    <p className="text-xs text-gray-500">
                      {campaignAssets.logo.width && campaignAssets.logo.height
                        ? `${campaignAssets.logo.width}x${campaignAssets.logo.height}px`
                        : "Image asset"}
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">ID: {campaignAssets.logo.id}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No logo asset linked</p>
        )}
      </div>

    </div>
  );
};
