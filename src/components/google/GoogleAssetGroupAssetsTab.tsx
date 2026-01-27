import React, { useState, useEffect } from "react";
import { googleAdwordsAssetsService, type AssetGroupAssets, type Asset } from "../../services/googleAdwords/googleAdwordsAssets";
import { Loader } from "../ui/Loader";
import { AssetSelectorModal } from "./AssetSelectorModal";
import { CreateTextAssetModal } from "./CreateTextAssetModal";
import { CreateImageAssetModal } from "./CreateImageAssetModal";

interface GoogleAssetGroupAssetsTabProps {
  profileId: number;
  assetGroupId: string;
  campaignId?: string;
}

export const GoogleAssetGroupAssetsTab: React.FC<GoogleAssetGroupAssetsTabProps> = ({
  profileId,
  assetGroupId,
  campaignId,
}) => {
  const [assetGroupAssets, setAssetGroupAssets] = useState<AssetGroupAssets | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<string>("Headlines");
  const [assetSelectorOpen, setAssetSelectorOpen] = useState(false);
  const [assetSelectorFieldType, setAssetSelectorFieldType] = useState<string | null>(null);
  const [createTextAssetOpen, setCreateTextAssetOpen] = useState(false);
  const [createImageAssetOpen, setCreateImageAssetOpen] = useState(false);

  const subTabs = [
    "Headlines",
    "Descriptions",
    "Images",
    "Videos",
    "Sitelinks",
    "Callouts",
  ];

  useEffect(() => {
    if (profileId && assetGroupId) {
      loadAssetGroupAssets();
    }
  }, [profileId, assetGroupId, campaignId]);

  const loadAssetGroupAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await googleAdwordsAssetsService.getAssetGroupAssets(
        profileId,
        assetGroupId,
        campaignId
      );
      if (response.success) {
        setAssetGroupAssets(response.asset_group_assets);
      } else {
        setError("Failed to load asset group assets");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to load asset group assets");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAsset = async (assetId: string) => {
    if (!confirm("Are you sure you want to remove this asset from the asset group?")) {
      return;
    }

    try {
      const response = await googleAdwordsAssetsService.removeAssetFromAssetGroup(
        profileId,
        assetGroupId,
        assetId
      );
      if (response.success) {
        await loadAssetGroupAssets(); // Reload assets
      } else {
        alert("Failed to remove asset");
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Failed to remove asset");
    }
  };

  const handleSelectAsset = async (asset: Asset) => {
    if (!assetSelectorFieldType) return;

    try {
      const response = await googleAdwordsAssetsService.linkAssetToAssetGroup(
        profileId,
        assetGroupId,
        {
          asset_id: asset.id,
          field_type: assetSelectorFieldType,
        }
      );
      if (response.success) {
        await loadAssetGroupAssets(); // Reload assets
        setAssetSelectorOpen(false);
        setAssetSelectorFieldType(null);
      } else {
        alert("Failed to link asset");
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Failed to link asset");
    }
  };

  const handleCreateAssetSuccess = async (asset: Asset, fieldType: string) => {
    // Automatically link the newly created asset
    try {
      const response = await googleAdwordsAssetsService.linkAssetToAssetGroup(
        profileId,
        assetGroupId,
        {
          asset_id: asset.id,
          field_type: fieldType,
        }
      );
      if (response.success) {
        await loadAssetGroupAssets(); // Reload assets
      } else {
        alert("Asset created but failed to link. Please link it manually.");
      }
    } catch (err: any) {
      alert("Asset created but failed to link. Please link it manually.");
    }
  };

  const getFieldTypeForSubTab = (): string => {
    switch (activeSubTab) {
      case "Headlines":
        return "HEADLINE";
      case "Descriptions":
        return "DESCRIPTION";
      case "Images":
        return "MARKETING_IMAGE"; // Default to marketing image, user can specify square if needed
      case "Videos":
        return "VIDEO";
      case "Sitelinks":
        return "SITELINK";
      case "Callouts":
        return "CALLOUT";
      default:
        return "HEADLINE";
    }
  };

  const getAssetTypeForSubTab = (): "TEXT" | "IMAGE" | "YOUTUBE_VIDEO" | "SITELINK" | undefined => {
    switch (activeSubTab) {
      case "Headlines":
      case "Descriptions":
      case "Callouts":
        return "TEXT";
      case "Images":
        return "IMAGE";
      case "Videos":
        return "YOUTUBE_VIDEO";
      case "Sitelinks":
        return "SITELINK";
      default:
        return undefined;
    }
  };

  const getAssetsForSubTab = (): Asset[] => {
    if (!assetGroupAssets) return [];
    
    switch (activeSubTab) {
      case "Headlines":
        return assetGroupAssets.headlines || [];
      case "Descriptions":
        return assetGroupAssets.descriptions || [];
      case "Images":
        return [...(assetGroupAssets.marketing_images || []), ...(assetGroupAssets.square_marketing_images || [])];
      case "Videos":
        return assetGroupAssets.videos || [];
      case "Sitelinks":
        return assetGroupAssets.sitelinks || [];
      case "Callouts":
        return assetGroupAssets.callouts || [];
      default:
        return [];
    }
  };

  const renderAsset = (asset: Asset) => {
    return (
      <div key={asset.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h5 className="font-medium text-gray-900">{asset.name}</h5>
              <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                {asset.type}
              </span>
            </div>
            
            {asset.type === "TEXT" && "text" in asset && (
              <p className="text-sm text-gray-700 mt-2">{asset.text}</p>
            )}
            
            {asset.type === "IMAGE" && (
              <div className="mt-2 text-sm text-gray-600">
                {asset.width && asset.height ? (
                  <span>{asset.width}x{asset.height}px</span>
                ) : (
                  <span>Image asset</span>
                )}
                {asset.file_size && (
                  <span className="ml-2">({(asset.file_size / 1024).toFixed(1)} KB)</span>
                )}
              </div>
            )}
            
            {asset.type === "YOUTUBE_VIDEO" && "youtube_video_id" in asset && (
              <div className="mt-2 text-sm text-gray-600">
                YouTube ID: {asset.youtube_video_id}
              </div>
            )}
            
            {asset.type === "SITELINK" && "link_text" in asset && (
              <div className="mt-2 text-sm">
                <p className="font-medium text-gray-900">{asset.link_text}</p>
                {asset.description1 && (
                  <p className="text-gray-600 mt-1">{asset.description1}</p>
                )}
                {asset.description2 && (
                  <p className="text-gray-600">{asset.description2}</p>
                )}
              </div>
            )}
            
            <p className="text-xs text-gray-400 mt-2">ID: {asset.id}</p>
          </div>
          
          <button
            onClick={() => handleRemoveAsset(asset.id)}
            className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Remove
          </button>
        </div>
      </div>
    );
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
          onClick={loadAssetGroupAssets}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const assets = getAssetsForSubTab();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Asset Group Assets</h3>
        <p className="text-sm text-gray-600 mb-4">
          Manage assets linked to this asset group. Assets are organized by field type.
        </p>
      </div>

      {/* Sub-tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-1 overflow-x-auto">
          {subTabs.map((tab) => {
            const tabAssets = 
              tab === "Headlines" ? assetGroupAssets?.headlines || [] :
              tab === "Descriptions" ? assetGroupAssets?.descriptions || [] :
              tab === "Images" ? [...(assetGroupAssets?.marketing_images || []), ...(assetGroupAssets?.square_marketing_images || [])] :
              tab === "Videos" ? assetGroupAssets?.videos || [] :
              tab === "Sitelinks" ? assetGroupAssets?.sitelinks || [] :
              assetGroupAssets?.callouts || [];
            
            return (
              <button
                key={tab}
                onClick={() => setActiveSubTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
                  activeSubTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab} ({tabAssets.length})
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-tab Content */}
      <div className="mt-4">
        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 mb-4">
          <button
            onClick={() => {
              setAssetSelectorFieldType(getFieldTypeForSubTab());
              setAssetSelectorOpen(true);
            }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Link Existing Asset
          </button>
          {(activeSubTab === "Headlines" || activeSubTab === "Descriptions" || activeSubTab === "Callouts") && (
            <button
              onClick={() => setCreateTextAssetOpen(true)}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Create New Text Asset
            </button>
          )}
          {activeSubTab === "Images" && (
            <button
              onClick={() => setCreateImageAssetOpen(true)}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Create New Image Asset
            </button>
          )}
        </div>

        {assets.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500 mb-2">
              No {activeSubTab.toLowerCase()} assets linked to this asset group.
            </p>
            <p className="text-sm text-gray-400">
              Use the buttons above to link existing assets or create new ones.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assets.map((asset) => renderAsset(asset))}
          </div>
        )}
      </div>

      {/* Asset Selector Modal */}
      <AssetSelectorModal
        isOpen={assetSelectorOpen}
        onClose={() => {
          setAssetSelectorOpen(false);
          setAssetSelectorFieldType(null);
        }}
        onSelect={handleSelectAsset}
        profileId={profileId}
        assetType={getAssetTypeForSubTab()}
        title={`Select ${activeSubTab} Asset`}
      />

      {/* Create Text Asset Modal */}
      <CreateTextAssetModal
        isOpen={createTextAssetOpen}
        onClose={() => setCreateTextAssetOpen(false)}
        onSuccess={(asset) => handleCreateAssetSuccess(asset, getFieldTypeForSubTab())}
        profileId={profileId}
        title={`Create ${activeSubTab} Asset`}
        placeholder={`Enter ${activeSubTab.toLowerCase()} text...`}
      />

      {/* Create Image Asset Modal */}
      <CreateImageAssetModal
        isOpen={createImageAssetOpen}
        onClose={() => setCreateImageAssetOpen(false)}
        onSuccess={(asset) => handleCreateAssetSuccess(asset, getFieldTypeForSubTab())}
        profileId={profileId}
        title={`Create ${activeSubTab} Asset`}
      />
    </div>
  );
};
