import React from "react";
import { Checkbox } from "../ui/Checkbox";
import { Loader } from "../ui/Loader";

export interface Asset {
  id: number;
  assetId?: string;
  brandEntityId?: string;
  mediaType?: string;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  storageLocationUrls?: {
    defaultUrl?: string;
    processedUrls?: {
      IMAGE_THUMBNAIL_500?: string;
      MODERATION?: string;
    };
  };
  assetType?: string;
  name?: string;
  creationTime?: string;
  fileMetadata?: {
    sizeInBytes?: number;
    contentType?: string;
    width?: number;
    height?: number;
    aspectRatio?: string;
  };
}

interface AssetsTableProps {
  assets: Asset[];
  loading?: boolean;
  onSelectAll?: (checked: boolean) => void;
  onSelect?: (id: number, checked: boolean) => void;
  selectedIds?: Set<number>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
  onPreview?: (assetId: string) => void;
}

export const AssetsTable: React.FC<AssetsTableProps> = ({
  assets,
  loading = false,
  onSelectAll,
  onSelect,
  selectedIds = new Set(),
  sortBy = "id",
  sortOrder = "asc",
  onSort,
  onPreview,
}) => {
  const getSortIcon = (column: string) => {
    if (sortBy !== column || !onSort) {
      return (
        <svg
          className="w-4 h-4 ml-1 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    return sortOrder === "asc" ? (
      <svg
        className="w-4 h-4 ml-1 text-[#136D6D]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 ml-1 text-[#136D6D]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  const allSelected =
    assets.length > 0 && assets.every((asset) => selectedIds.has(asset.id));
  const someSelected = assets.some((asset) => selectedIds.has(asset.id));

  const handleSelectAll = (checked: boolean) => {
    onSelectAll?.(checked);
  };

  const handleSelect = (id: number, checked: boolean) => {
    onSelect?.(id, checked);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getThumbnailUrl = (asset: Asset): string | null => {
    if (!asset.storageLocationUrls) return null;

    // Prefer thumbnail if available, otherwise use default URL
    const thumbnail =
      asset.storageLocationUrls.processedUrls?.IMAGE_THUMBNAIL_500;
    const defaultUrl = asset.storageLocationUrls.defaultUrl;

    return thumbnail || defaultUrl || null;
  };

  return (
    <div className="table-container" style={{ position: 'relative', minHeight: loading ? '400px' : 'auto' }}>

      <div className="overflow-x-auto w-full">
        {assets.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-[400px] w-full py-12 px-6">
            <div className="flex flex-col items-center justify-center max-w-md">
              {/* Icon */}
              <div className="mb-6 w-20 h-20 rounded-full bg-[#F5F5F0] flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-[#556179]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              {/* Title */}
              <h3 className="text-lg font-medium text-teal-950 mb-2">
                No Assets Found
              </h3>
              {/* Description */}
              <p className="text-sm text-[#556179] text-center leading-relaxed">
                There are no assets for this campaign yet. Assets will appear here when they are created.
              </p>
            </div>
          </div>
        ) : (
          <table className="w-full min-w-max">
            <thead>
              <tr className="sticky top-0 bg-[#fefefb] z-10">
                {onSelectAll && (
                  <th className="table-header w-[35px]">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th className="table-header w-[100px]">
                  Preview
                </th>
                <th
                  className={`table-header ${onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                  onClick={() => onSort?.("assetId")}
                >
                  <div className="flex items-center">
                    Asset ID
                    {getSortIcon("assetId")}
                  </div>
                </th>
                <th
                  className={`table-header ${onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                  onClick={() => onSort?.("fileName")}
                >
                  <div className="flex items-center">
                    File Name
                    {getSortIcon("fileName")}
                  </div>
                </th>
                <th
                  className={`table-header ${onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                  onClick={() => onSort?.("mediaType")}
                >
                  <div className="flex items-center">
                    Media Type
                    {getSortIcon("mediaType")}
                  </div>
                </th>
                <th
                  className={`table-header ${onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                  onClick={() => onSort?.("fileSize")}
                >
                  <div className="flex items-center">
                    File Size
                    {getSortIcon("fileSize")}
                  </div>
                </th>
                <th
                  className={`table-header ${onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                  onClick={() => onSort?.("contentType")}
                >
                  <div className="flex items-center">
                    Content Type
                    {getSortIcon("contentType")}
                  </div>
                </th>
                <th className={`table-header ${onSort ? "cursor-pointer hover:bg-gray-50" : ""
                  }`}
                  onClick={() => onSort?.("createdAt")}
                >
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => {
                const thumbnailUrl = getThumbnailUrl(asset);
                const isImage =
                  asset.assetType === "IMAGE" ||
                  asset.contentType?.startsWith("image/");

                return (
                  <tr
                    key={asset.id}
                    className="table-row group"
                  >
                    {onSelect && (
                      <td className="table-cell">
                        <Checkbox
                          checked={selectedIds.has(asset.id)}
                          onChange={(checked) =>
                            handleSelect(asset.id, checked)
                          }
                        />
                      </td>
                    )}
                    <td className="table-cell">
                      {thumbnailUrl && isImage ? (
                        <div className="flex items-center justify-center relative">
                          <img
                            src={thumbnailUrl}
                            alt={
                              asset.name || asset.fileName || "Asset preview"
                            }
                            className="w-12 h-12 object-cover rounded border border-[#e8e8e3] cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => onPreview?.(asset.assetId!)}
                            onError={(e) => {
                              // Hide image and show placeholder on error
                              const img = e.currentTarget;
                              img.style.display = "none";
                              const placeholder =
                                img.parentElement?.querySelector(
                                  ".thumbnail-placeholder"
                                );
                              if (placeholder) {
                                placeholder.classList.remove("hidden");
                              }
                            }}
                          />
                          <div className="hidden thumbnail-placeholder w-12 h-12 bg-gray-100 border border-[#e8e8e3] rounded flex items-center justify-center absolute inset-0">
                            <svg
                              className="w-6 h-6 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        </div>
                      ) : thumbnailUrl && asset.assetType === "VIDEO" ? (
                        <div className="flex items-center justify-center">
                          <div className="w-12 h-12 bg-gray-100 border border-[#e8e8e3] rounded flex items-center justify-center relative group">
                            <svg
                              className="w-6 h-6 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                            <button
                              onClick={() => onPreview?.(asset.assetId!)}
                              className="absolute inset-0 flex items-center justify-center hover:bg-black hover:bg-opacity-20 rounded transition-colors"
                              title="Preview video"
                            >
                              <svg
                                className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <div className="w-12 h-12 bg-gray-100 border border-[#e8e8e3] rounded flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="table-cell table-text leading-[1.26]">
                      <div className="flex items-center gap-2">
                        <span>{asset.assetId || "—"}</span>
                      </div>
                    </td>
                    <td className="table-cell table-text leading-[1.26]">
                      {asset.name || asset.fileName || "—"}
                    </td>
                    <td className="table-cell table-text leading-[1.26]">
                      {asset.assetType || asset.mediaType || "—"}
                    </td>
                    <td className="table-cell table-text leading-[1.26]">
                      {formatFileSize(
                        asset.fileSize || asset.fileMetadata?.sizeInBytes
                      )}
                    </td>
                    <td className="table-cell table-text leading-[1.26]">
                      {asset.contentType ||
                        asset.fileMetadata?.contentType ||
                        "—"}
                    </td>
                    <td className="table-cell table-text leading-[1.26]">
                      {asset.createdAt || asset.creationTime
                        ? new Date(
                          asset.createdAt || asset.creationTime!
                        ).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {/* Loading overlay for table */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-overlay-content">
            <Loader size="md" message="Loading assets..." />
          </div>
        </div>
      )}
    </div>
  );
};
