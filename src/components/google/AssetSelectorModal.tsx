import React, { useState, useEffect } from "react";
import { googleAdwordsAssetsService, type Asset, type AssetType } from "../../services/googleAdwords/googleAdwordsAssets";
import { Loader } from "../ui/Loader";
import { CreateTextAssetModal } from "./CreateTextAssetModal";
import { CreateImageAssetModal } from "./CreateImageAssetModal";

interface AssetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: Asset) => void;
  profileId: number;
  assetType?: AssetType; // Filter by asset type (for selection restriction)
  title?: string;
  allowMultiple?: boolean; // For future multi-select support
}

export const AssetSelectorModal: React.FC<AssetSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  profileId,
  assetType, // This restricts what can be selected
  title = "Select Asset",
  allowMultiple = false,
}) => {
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("All");
  const [createTextAssetOpen, setCreateTextAssetOpen] = useState(false);
  const [createImageAssetOpen, setCreateImageAssetOpen] = useState(false);

  const tabs = ["All", "Text", "Image", "YouTube Video", "Sitelink", "Callout"];

  useEffect(() => {
    if (isOpen && profileId) {
      loadAssets();
    }
  }, [isOpen, profileId]);

  const loadAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load all assets (no filter) so we can show them in tabs
      const response = await googleAdwordsAssetsService.listAssets(profileId);
      if (response.success) {
        setAllAssets(response.assets);
      } else {
        setError("Failed to load assets");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to load assets");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssetSuccess = (asset: Asset) => {
    // Reload assets to include the new one
    loadAssets();
    // Optionally auto-select the newly created asset
    // onSelect(asset);
    // onClose();
  };

  const getAssetsForTab = (): Asset[] => {
    let filtered = allAssets;

    // Filter by active tab
    if (activeTab !== "All") {
      const tabTypeMap: Record<string, AssetType> = {
        "Text": "TEXT",
        "Image": "IMAGE",
        "YouTube Video": "YOUTUBE_VIDEO",
        "Sitelink": "SITELINK",
        "Callout": "TEXT", // Callouts are also TEXT type
      };
      const tabType = tabTypeMap[activeTab];
      if (tabType) {
        filtered = filtered.filter((asset) => asset.type === tabType);
      }
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((asset) => {
        return (
          asset.name.toLowerCase().includes(search) ||
          (asset.type === "TEXT" && "text" in asset && asset.text?.toLowerCase().includes(search)) ||
          (asset.type === "SITELINK" && "link_text" in asset && asset.link_text?.toLowerCase().includes(search))
        );
      });
    }

    return filtered;
  };

  const handleSelect = (asset: Asset) => {
    // Check if this asset type is allowed for selection
    if (assetType) {
      // Map assetType to actual asset types
      if (assetType === "TEXT" && asset.type !== "TEXT") {
        alert(`Only text assets can be selected for ${title}`);
        return;
      }
      if (assetType === "IMAGE" && asset.type !== "IMAGE") {
        alert(`Only image assets can be selected for ${title}`);
        return;
      }
      if (assetType === "YOUTUBE_VIDEO" && asset.type !== "YOUTUBE_VIDEO") {
        alert(`Only YouTube video assets can be selected for ${title}`);
        return;
      }
      if (assetType === "SITELINK" && asset.type !== "SITELINK") {
        alert(`Only sitelink assets can be selected for ${title}`);
        return;
      }
    }

    onSelect(asset);
    if (!allowMultiple) {
      onClose();
    }
  };

  const canSelectAsset = (asset: Asset): boolean => {
    if (!assetType) return true; // No restriction

    // Map assetType to actual asset types
    if (assetType === "TEXT") {
      return asset.type === "TEXT";
    }
    if (assetType === "IMAGE") {
      return asset.type === "IMAGE";
    }
    if (assetType === "YOUTUBE_VIDEO") {
      return asset.type === "YOUTUBE_VIDEO";
    }
    if (assetType === "SITELINK") {
      return asset.type === "SITELINK";
    }
    return true;
  };

  const getAssetTypeLabel = (asset: Asset): string => {
    if (asset.type === "TEXT") {
      // Check if it's a callout by checking if it's in callouts (we'd need to check context)
      // For now, just return TEXT
      return "Text";
    }
    return asset.type.replace("_", " ");
  };

  if (!isOpen) return null;

  const assets = getAssetsForTab();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search assets by name or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => {
              const tabAssets = tab === "All" 
                ? allAssets 
                : allAssets.filter((a) => {
                    if (tab === "Text") return a.type === "TEXT";
                    if (tab === "Image") return a.type === "IMAGE";
                    if (tab === "YouTube Video") return a.type === "YOUTUBE_VIDEO";
                    if (tab === "Sitelink") return a.type === "SITELINK";
                    if (tab === "Callout") return a.type === "TEXT"; // Callouts are TEXT type
                    return false;
                  });
              
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
                    activeTab === tab
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

        {/* Action Buttons */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-end gap-2">
          {(activeTab === "All" || activeTab === "Text" || activeTab === "Callout") && (
            <button
              onClick={() => setCreateTextAssetOpen(true)}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Create New Text Asset
            </button>
          )}
          {activeTab === "Image" && (
            <button
              onClick={() => setCreateImageAssetOpen(true)}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Create New Image Asset
            </button>
          )}
        </div>

        {/* Content - Table View */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadAssets}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {allAssets.length === 0
                  ? "No assets found. Create assets first."
                  : "No assets match your search or filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Content</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">ID</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => {
                    const selectable = canSelectAsset(asset);
                    return (
                      <tr
                        key={asset.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          !selectable ? "opacity-50" : "cursor-pointer"
                        }`}
                        onClick={() => selectable && handleSelect(asset)}
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{asset.name}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                            {getAssetTypeLabel(asset)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {asset.type === "TEXT" && "text" in asset && (
                            <div className="text-gray-700 max-w-md truncate">{asset.text}</div>
                          )}
                          {asset.type === "IMAGE" && (
                            <div className="text-gray-600 text-xs">
                              {asset.width && asset.height
                                ? `${asset.width}x${asset.height}px`
                                : "Image asset"}
                            </div>
                          )}
                          {asset.type === "YOUTUBE_VIDEO" && "youtube_video_id" in asset && (
                            <div className="text-gray-600 text-xs">YouTube: {asset.youtube_video_id}</div>
                          )}
                          {asset.type === "SITELINK" && "link_text" in asset && (
                            <div className="text-gray-700">
                              <div className="font-medium">{asset.link_text}</div>
                              {asset.description1 && (
                                <div className="text-xs text-gray-500">{asset.description1}</div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs text-gray-400 font-mono">{asset.id}</div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {selectable ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(asset);
                              }}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              Select
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">Not selectable</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Create Text Asset Modal */}
      <CreateTextAssetModal
        isOpen={createTextAssetOpen}
        onClose={() => setCreateTextAssetOpen(false)}
        onSuccess={handleCreateAssetSuccess}
        profileId={profileId}
        title="Create Text Asset"
        placeholder="Enter text..."
      />

      {/* Create Image Asset Modal */}
      <CreateImageAssetModal
        isOpen={createImageAssetOpen}
        onClose={() => setCreateImageAssetOpen(false)}
        onSuccess={handleCreateAssetSuccess}
        profileId={profileId}
        title="Create Image Asset"
      />
    </div>
  );
};
