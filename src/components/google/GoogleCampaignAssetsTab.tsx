import React, { useState, useEffect } from "react";
import { googleAdwordsAssetsService, type CampaignAssets, type Asset } from "../../services/googleAdwords/googleAdwordsAssets";
import { Loader } from "../ui/Loader";
import { AssetSelectorModal } from "./AssetSelectorModal";
import { CreateTextAssetModal } from "./CreateTextAssetModal";
import { CreateImageAssetModal } from "./CreateImageAssetModal";

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
  const [assetSelectorOpen, setAssetSelectorOpen] = useState(false);
  const [assetSelectorType, setAssetSelectorType] = useState<"BUSINESS_NAME" | "LOGO" | null>(null);
  const [createTextAssetOpen, setCreateTextAssetOpen] = useState(false);
  const [createImageAssetOpen, setCreateImageAssetOpen] = useState(false);

  useEffect(() => {
    if (profileId && campaignId) {
      loadCampaignAssets();
    }
  }, [profileId, campaignId]);

  const loadCampaignAssets = async () => {
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
    }
  };

  const handleRemoveAsset = async (assetId: string, fieldType: "BUSINESS_NAME" | "LOGO") => {
    if (!confirm(`Are you sure you want to remove this ${fieldType === "BUSINESS_NAME" ? "business name" : "logo"} asset?`)) {
      return;
    }

    try {
      const response = await googleAdwordsAssetsService.removeAssetFromCampaign(
        profileId,
        campaignId,
        assetId,
        fieldType
      );
      if (response.success) {
        await loadCampaignAssets(); // Reload assets
      } else {
        alert("Failed to remove asset");
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Failed to remove asset");
    }
  };

  const handleSelectAsset = async (asset: Asset) => {
    if (!assetSelectorType) return;

    try {
      const fieldType = assetSelectorType === "BUSINESS_NAME" ? "BUSINESS_NAME" : "LOGO";
      const response = await googleAdwordsAssetsService.linkAssetToCampaign(
        profileId,
        campaignId,
        {
          asset_id: asset.id,
          field_type: fieldType,
        }
      );
      if (response.success) {
        await loadCampaignAssets(); // Reload assets
        setAssetSelectorOpen(false);
        setAssetSelectorType(null);
      } else {
        alert("Failed to link asset");
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Failed to link asset");
    }
  };

  const handleCreateAssetSuccess = async (asset: Asset, fieldType: "BUSINESS_NAME" | "LOGO") => {
    // Automatically link the newly created asset
    try {
      const response = await googleAdwordsAssetsService.linkAssetToCampaign(
        profileId,
        campaignId,
        {
          asset_id: asset.id,
          field_type: fieldType,
        }
      );
      if (response.success) {
        await loadCampaignAssets(); // Reload assets
      } else {
        alert("Asset created but failed to link. Please link it manually.");
      }
    } catch (err: any) {
      alert("Asset created but failed to link. Please link it manually.");
    }
  };

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
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAssetSelectorType("BUSINESS_NAME");
                setAssetSelectorOpen(true);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Link Existing
            </button>
            <button
              onClick={() => setCreateTextAssetOpen(true)}
              className="text-xs text-green-600 hover:text-green-800 font-medium"
            >
              Create New
            </button>
            {campaignAssets?.business_name && (
              <button
                onClick={() => handleRemoveAsset(campaignAssets.business_name!.id, "BUSINESS_NAME")}
                className="text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Remove
              </button>
            )}
          </div>
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAssetSelectorType("LOGO");
                setAssetSelectorOpen(true);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Link Existing
            </button>
            <button
              onClick={() => setCreateImageAssetOpen(true)}
              className="text-xs text-green-600 hover:text-green-800 font-medium"
            >
              Create New
            </button>
            {campaignAssets?.logo && (
              <button
                onClick={() => handleRemoveAsset(campaignAssets.logo!.id, "LOGO")}
                className="text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        {campaignAssets?.logo ? (
          <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
            <div className="text-sm">
              <p className="font-medium text-gray-900">{campaignAssets.logo.name}</p>
              {campaignAssets.logo.type === "IMAGE" && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">
                    {campaignAssets.logo.width && campaignAssets.logo.height
                      ? `${campaignAssets.logo.width}x${campaignAssets.logo.height}px`
                      : "Image asset"}
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">ID: {campaignAssets.logo.id}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No logo asset linked</p>
        )}
      </div>

      {/* Asset Selector Modal */}
      <AssetSelectorModal
        isOpen={assetSelectorOpen}
        onClose={() => {
          setAssetSelectorOpen(false);
          setAssetSelectorType(null);
        }}
        onSelect={handleSelectAsset}
        profileId={profileId}
        assetType={assetSelectorType === "BUSINESS_NAME" ? "TEXT" : assetSelectorType === "LOGO" ? "IMAGE" : undefined}
        title={
          assetSelectorType === "BUSINESS_NAME" ? "Select Business Name Asset" :
          assetSelectorType === "LOGO" ? "Select Logo Asset" :
          "Select Asset"
        }
      />

      {/* Create Text Asset Modal */}
      <CreateTextAssetModal
        isOpen={createTextAssetOpen}
        onClose={() => setCreateTextAssetOpen(false)}
        onSuccess={(asset) => handleCreateAssetSuccess(asset, "BUSINESS_NAME")}
        profileId={profileId}
        title="Create Business Name Asset"
        placeholder="Enter business name..."
      />

      {/* Create Image Asset Modal */}
      <CreateImageAssetModal
        isOpen={createImageAssetOpen}
        onClose={() => setCreateImageAssetOpen(false)}
        onSuccess={(asset) => handleCreateAssetSuccess(asset, "LOGO")}
        profileId={profileId}
        title="Create Logo Asset"
      />
    </div>
  );
};
