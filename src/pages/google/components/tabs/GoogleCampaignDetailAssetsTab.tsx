import React, { useState } from "react";
import { Plus, Upload, Image, Video, Type, Link } from "lucide-react";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { Button } from "../../../../components/ui";
import { AssetSelectorModal } from "../../../../components/google/AssetSelectorModal";
import { useAssets } from "../../../../hooks/queries/useAssets";
import type { Asset } from "../../../../services/googleAdwords/googleAdwordsAssets";

interface GoogleCampaignDetailAssetsTabProps {
  profileId?: number | null;
}

export const GoogleCampaignDetailAssetsTab: React.FC<GoogleCampaignDetailAssetsTabProps> = ({
  profileId,
}) => {
  // Fetch real assets from Google Ads API
  const { data: assets = [], isLoading, error, refetch } = useAssets(profileId || undefined);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [assetSelectorOpen, setAssetSelectorOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssetIds(new Set(assets.map(asset => asset.id)));
    } else {
      setSelectedAssetIds(new Set());
    }
  };

  const handleSelectAsset = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedAssetIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedAssetIds(newSelected);
  };

  const handleCreateAsset = () => {
    setAssetSelectorOpen(true);
  };

  const handleAssetSelected = (asset: Asset) => {
    // Handle asset selection (could be used for campaign assignment)
    console.log("Asset selected:", asset);
    setAssetSelectorOpen(false);
  };

  const getAssetIcon = (asset: Asset) => {
    switch (asset.type) {
      case "IMAGE":
        return <Image className="w-4 h-4 text-blue-600" />;
      case "YOUTUBE_VIDEO":
        return <Video className="w-4 h-4 text-red-600" />;
      case "TEXT":
        return <Type className="w-4 h-4 text-green-600" />;
      case "SITELINK":
        return <Link className="w-4 h-4 text-purple-600" />;
      default:
        return <Upload className="w-4 h-4 text-gray-600" />;
    }
  };

  const getAssetTypeName = (asset: Asset) => {
    if (asset.field_type) {
      // Return field_type for more specific categorization
      return asset.field_type.replace(/_/g, ' ');
    }
    return asset.type.replace(/_/g, ' ');
  };

  const getAssetDimensions = (asset: Asset) => {
    if (asset.type === "IMAGE" && "width" in asset && "height" in asset) {
      return `${asset.width}x${asset.height}`;
    }
    return "N/A";
  };

  const getAssetSize = (asset: Asset) => {
    if (asset.type === "IMAGE" && "file_size" in asset && asset.file_size) {
      return `${(asset.file_size / 1024 / 1024).toFixed(2)} MB`;
    }
    return "N/A";
  };

  const filterAssets = (assets: Asset[]) => {
    if (!searchTerm) return assets;
    const search = searchTerm.toLowerCase();
    return assets.filter(asset => 
      asset.name.toLowerCase().includes(search) ||
      asset.type.toLowerCase().includes(search) ||
      (asset.field_type && asset.field_type.toLowerCase().includes(search))
    );
  };

  const filteredAssets = filterAssets(assets);

  if (!profileId) {
    return (
      <div className="text-center py-12">
        <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Profile Selected</h3>
        <p className="text-gray-500 mb-4">
          Please select a Google Ads profile to manage assets.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Assets</h3>
        <p className="text-gray-500">
          Fetching your Google Ads assets...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Upload className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Assets</h3>
        <p className="text-red-500 mb-4">
          {error.message || "Failed to load assets. Please try again."}
        </p>
        <Button onClick={() => refetch()} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Demand Gen Assets</h3>
          <p className="text-sm text-gray-600">
            Create and manage assets for your Demand Gen campaign ({assets.length} total)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search assets..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <Button
            onClick={handleCreateAsset}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Asset
          </Button>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e8e8e3]">
              <th className="table-header w-[35px]">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={filteredAssets.length > 0 && filteredAssets.every(asset => selectedAssetIds.has(asset.id))}
                    onChange={(checked) => handleSelectAll(checked)}
                    size="small"
                  />
                </div>
              </th>
              <th className="table-header">Asset Name</th>
              <th className="table-header">Type</th>
              <th className="table-header hidden md:table-cell">Field Type</th>
              <th className="table-header hidden lg:table-cell">Dimensions</th>
              <th className="table-header hidden lg:table-cell">Size</th>
              <th className="table-header w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.map((asset) => (
              <tr key={asset.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="table-cell">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={selectedAssetIds.has(asset.id)}
                      onChange={(checked) => handleSelectAsset(asset.id, checked)}
                      size="small"
                    />
                  </div>
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    {getAssetIcon(asset)}
                    <div>
                      <span className="font-medium block">{asset.name}</span>
                      {asset.type === "TEXT" && "text" in asset && (
                        <span className="text-xs text-gray-500 truncate max-w-xs block">
                          {asset.text}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="table-cell">
                  <span className="text-sm text-gray-600">{asset.type.replace(/_/g, ' ')}</span>
                </td>
                <td className="table-cell hidden md:table-cell">
                  <span className="text-sm text-gray-600">{getAssetTypeName(asset)}</span>
                </td>
                <td className="table-cell hidden lg:table-cell">
                  <span className="text-sm text-gray-600">{getAssetDimensions(asset)}</span>
                </td>
                <td className="table-cell hidden lg:table-cell">
                  <span className="text-sm text-gray-600">{getAssetSize(asset)}</span>
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2"
                      onClick={() => handleAssetSelected(asset)}
                    >
                      Select
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-red-600 hover:text-red-700">
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredAssets.length === 0 && (
          <div className="text-center py-12">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? "No Assets Found" : "No Assets Available"}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm 
                ? "Try adjusting your search terms."
                : "Get started by creating your first asset."
              }
            </p>
            {!searchTerm && (
              <Button onClick={handleCreateAsset}>
                <Plus className="w-4 h-4 mr-2" />
                Create Asset
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Asset Selector Modal for browsing and creating assets */}
      {profileId && (
        <AssetSelectorModal
          isOpen={assetSelectorOpen}
          onClose={() => setAssetSelectorOpen(false)}
          onSelect={handleAssetSelected}
          profileId={profileId}
          title="Select or Create Asset"
          allowMultiple={false}
        />
      )}
    </div>
  );
};
