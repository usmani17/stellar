import React, { useState, useMemo } from "react";
import { Plus, Upload, Image, Video, Type, Link, Eye } from "lucide-react";
import { Button } from "../../../../components/ui";
import { Loader } from "../../../../components/ui/Loader";
import { AssetSelectorModal } from "../../../../components/google/AssetSelectorModal";
import { AssetDetailModal } from "../../../../components/google/AssetDetailModal";
import {
  FilterPanel,
  type FilterValues,
} from "../../../../components/filters/FilterPanel";
import { useAssets } from "../../../../hooks/queries/useAssets";
import type { Asset } from "../../../../services/googleAdwords/googleAdwordsAssets";

const ASSETS_PAGE_SIZE = 10;

const ASSET_TYPE_FILTER_FIELDS = [
  { value: "assetType", label: "Asset Type" },
];

interface GoogleCampaignDetailAssetsTabProps {
  profileId?: number | null;
  accountId?: string;
  channelId?: string;
}

export const GoogleCampaignDetailAssetsTab: React.FC<GoogleCampaignDetailAssetsTabProps> = ({
  profileId,
  accountId,
  channelId,
}) => {
  const { data: assets = [], isLoading, error, refetch } = useAssets(profileId || undefined);
  const [assetSelectorOpen, setAssetSelectorOpen] = useState(false);
  const [viewAsset, setViewAsset] = useState<Asset | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>([]);

  const filterAssets = (list: Asset[]) => {
    let result = list;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (asset) =>
          asset.name.toLowerCase().includes(search) ||
          asset.type.toLowerCase().includes(search) ||
          (asset.field_type && asset.field_type.toLowerCase().includes(search))
      );
    }
    const assetTypeFilter = filters.find((f) => f.field === "assetType");
    if (assetTypeFilter && typeof assetTypeFilter.value === "string") {
      result = result.filter((asset) => asset.type === assetTypeFilter.value);
    }
    return result;
  };

  const filteredAssets = useMemo(
    () => filterAssets(assets),
    [assets, searchTerm, filters]
  );
  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / ASSETS_PAGE_SIZE));
  const paginatedAssets = useMemo(
    () =>
      filteredAssets.slice(
        (currentPage - 1) * ASSETS_PAGE_SIZE,
        currentPage * ASSETS_PAGE_SIZE
      ),
    [filteredAssets, currentPage]
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
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
      <div className="flex justify-center py-12">
        <Loader size="lg" message="Fetching your Google Ads assets..." />
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
      {/* Toolbar: search, Add Filter, Create Asset (right-aligned) */}
      <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search assets..."
            className="pl-10 pr-4 py-2 border border-[#e8e8e3] rounded-lg bg-[#FEFEFB] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] w-64 text-[13.3px] text-[#072929]"
          />
          <svg className="w-5 h-5 text-[#556179] absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          type="button"
          onClick={() => setIsFilterPanelOpen((prev) => !prev)}
          className="edit-button"
        >
          <svg
            className="w-5 h-5 text-[#072929]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span className="text-[10.64px] text-[#072929] font-normal">
            Add Filter
          </span>
          <svg
            className={`w-5 h-5 text-[#E3E3E3] transition-transform ${isFilterPanelOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleCreateAsset}
          className="create-entity-button flex items-center gap-2"
        >
          <Plus className="w-4 h-4 !text-white" />
          <span className="text-[10.64px] text-white font-normal">Create Asset</span>
        </button>
      </div>

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <div className="mb-4">
          <FilterPanel
            isOpen
            onClose={() => setIsFilterPanelOpen(false)}
            onApply={(newFilters) => {
              setFilters(newFilters);
              setCurrentPage(1);
            }}
            initialFilters={filters}
            filterFields={ASSET_TYPE_FILTER_FIELDS}
            channelType="google"
            accountId={accountId}
          />
        </div>
      )}

      {/* Assets Table */}
      <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e8e8e3]">
                <th className="table-header">Asset Name</th>
                <th className="table-header">Type</th>
                <th className="table-header hidden md:table-cell">Field Type</th>
                <th className="table-header hidden lg:table-cell">Dimensions</th>
                <th className="table-header hidden lg:table-cell">Size</th>
                <th className="table-header w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAssets.map((asset) => (
                <tr key={asset.id} className="border-b border-[#e8e8e3] hover:bg-gray-50 transition-colors">
                  <td className="table-cell min-w-[200px]">
                    <div className="flex items-center gap-2">
                      {getAssetIcon(asset)}
                      <div>
                        <span className="table-text leading-[1.26] font-medium block">{asset.name}</span>
                        {asset.type === "TEXT" && "text" in asset && (
                          <span className="text-[11.2px] text-[#556179] truncate max-w-xs block">
                            {asset.text}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="table-text leading-[1.26]">{asset.type.replace(/_/g, " ")}</span>
                  </td>
                  <td className="table-cell hidden md:table-cell">
                    <span className="table-text leading-[1.26]">{getAssetTypeName(asset)}</span>
                  </td>
                  <td className="table-cell hidden lg:table-cell">
                    <span className="table-text leading-[1.26]">{getAssetDimensions(asset)}</span>
                  </td>
                  <td className="table-cell hidden lg:table-cell">
                    <span className="table-text leading-[1.26]">{getAssetSize(asset)}</span>
                  </td>
                  <td className="table-cell">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 flex items-center gap-1"
                      onClick={() => setViewAsset(asset)}
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {paginatedAssets.length === 0 && (
          <div className="text-center py-8">
            <Upload className="w-12 h-12 text-[#556179] mx-auto mb-4" />
            <p className="text-[13.3px] text-[#556179] mb-4">
              {searchTerm ? "No assets match your search." : "No assets yet. Create your first asset."}
            </p>
            {!searchTerm && (
              <button
                type="button"
                onClick={handleCreateAsset}
                className="create-entity-button inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4 !text-white" />
                <span className="text-[10.64px] text-white font-normal">Create Asset</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination - same pattern as Ad Groups tab */}
      {!isLoading && filteredAssets.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-end mt-4">
          <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${currentPage === pageNum
                    ? "bg-white text-[#136D6D] font-semibold"
                    : "text-black hover:bg-gray-50"
                    }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                ...
              </span>
            )}
            {totalPages > 5 && (
              <button
                onClick={() => handlePageChange(totalPages)}
                className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${currentPage === totalPages
                  ? "bg-white text-[#136D6D] font-semibold"
                  : "text-black hover:bg-gray-50"
                  }`}
              >
                {totalPages}
              </button>
            )}
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Asset Detail Modal - view asset in popup */}
      <AssetDetailModal
        isOpen={!!viewAsset}
        onClose={() => setViewAsset(null)}
        asset={viewAsset}
      />

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
