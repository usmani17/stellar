import React from "react";
import { Checkbox } from "../ui/Checkbox";

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

  return (
    <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
      <div className="overflow-x-auto w-full">
        {loading ? (
          <div className="text-center py-8 text-[#556179] text-[13.3px]">
            Loading assets...
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[13.3px] text-[#556179] mb-4">No assets found</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f5f5f0] border-b border-[#e8e8e3]">
                {onSelectAll && (
                  <th className="py-[10px] px-[10px] text-left">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th
                  className="py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] text-left cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("assetId")}
                >
                  <div className="flex items-center">
                    Asset ID
                    {getSortIcon("assetId")}
                  </div>
                </th>
                <th
                  className="py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] text-left cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("fileName")}
                >
                  <div className="flex items-center">
                    File Name
                    {getSortIcon("fileName")}
                  </div>
                </th>
                <th
                  className="py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] text-left cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("mediaType")}
                >
                  <div className="flex items-center">
                    Media Type
                    {getSortIcon("mediaType")}
                  </div>
                </th>
                <th
                  className="py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] text-left cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("fileSize")}
                >
                  <div className="flex items-center">
                    File Size
                    {getSortIcon("fileSize")}
                  </div>
                </th>
                <th
                  className="py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] text-left cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("contentType")}
                >
                  <div className="flex items-center">
                    Content Type
                    {getSortIcon("contentType")}
                  </div>
                </th>
                <th className="py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] text-left">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr
                  key={asset.id}
                  className="border-b border-[#e8e8e3] hover:bg-gray-50 transition-colors"
                >
                  {onSelect && (
                    <td className="py-[10px] px-[10px]">
                      <Checkbox
                        checked={selectedIds.has(asset.id)}
                        onChange={(checked) => handleSelect(asset.id, checked)}
                      />
                    </td>
                  )}
                  <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                    <div className="flex items-center gap-2">
                      {asset.assetId && onPreview && (
                        <button
                          onClick={() => onPreview(asset.assetId!)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Preview asset"
                        >
                          <svg
                            className="w-4 h-4 text-[#136D6D]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>
                      )}
                      <span>{asset.assetId || "—"}</span>
                    </div>
                  </td>
                  <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                    {asset.fileName || "—"}
                  </td>
                  <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                    {asset.mediaType || "—"}
                  </td>
                  <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                    {formatFileSize(asset.fileSize)}
                  </td>
                  <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                    {asset.contentType || "—"}
                  </td>
                  <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                    {asset.createdAt
                      ? new Date(asset.createdAt).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};



