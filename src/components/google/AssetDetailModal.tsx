import React from "react";
import type { Asset } from "../../services/googleAdwords/googleAdwordsAssets";

interface AssetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  isOpen,
  onClose,
  asset,
}) => {
  if (!isOpen || !asset) return null;

  const getAssetTypeLabel = (a: Asset) => {
    if (a.field_type) return a.field_type.replace(/_/g, " ");
    return a.type.replace(/_/g, " ");
  };

  const getDimensions = (a: Asset) => {
    if (a.type === "IMAGE" && "width" in a && "height" in a) {
      return `${a.width}x${a.height}`;
    }
    return null;
  };

  const getSize = (a: Asset) => {
    if (a.type === "IMAGE" && "file_size" in a && a.file_size) {
      return `${(a.file_size / 1024 / 1024).toFixed(2)} MB`;
    }
    return null;
  };

  const previewUrl =
    asset.type === "IMAGE" && "image_url" in asset && asset.image_url
      ? asset.image_url
      : null;
  const youtubeId =
    asset.type === "YOUTUBE_VIDEO" &&
    "youtube_video_id" in asset &&
    asset.youtube_video_id
      ? asset.youtube_video_id
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-gray-900 bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 border border-[#E8E8E3] max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-detail-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-[#E8E8E3] shrink-0">
          <h2
            id="asset-detail-title"
            className="text-[18px] font-semibold text-[#072929]"
          >
            Asset Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5 text-[#556179]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <dl className="grid grid-cols-1 gap-3 text-[13.3px]">
            <div>
              <dt className="font-semibold text-[#556179] uppercase tracking-wide mb-0.5">
                Name
              </dt>
              <dd className="text-[#072929]">{asset.name}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#556179] uppercase tracking-wide mb-0.5">
                Type
              </dt>
              <dd className="text-[#072929]">{asset.type.replace(/_/g, " ")}</dd>
            </div>
            {asset.field_type && (
              <div>
                <dt className="font-semibold text-[#556179] uppercase tracking-wide mb-0.5">
                  Field Type
                </dt>
                <dd className="text-[#072929]">
                  {getAssetTypeLabel(asset)}
                </dd>
              </div>
            )}
            {getDimensions(asset) && (
              <div>
                <dt className="font-semibold text-[#556179] uppercase tracking-wide mb-0.5">
                  Dimensions
                </dt>
                <dd className="text-[#072929]">{getDimensions(asset)}</dd>
              </div>
            )}
            {getSize(asset) && (
              <div>
                <dt className="font-semibold text-[#556179] uppercase tracking-wide mb-0.5">
                  Size
                </dt>
                <dd className="text-[#072929]">{getSize(asset)}</dd>
              </div>
            )}
            {asset.type === "TEXT" && "text" in asset && asset.text && (
              <div>
                <dt className="font-semibold text-[#556179] uppercase tracking-wide mb-0.5">
                  Text
                </dt>
                <dd className="text-[#072929] whitespace-pre-wrap break-words">
                  {asset.text}
                </dd>
              </div>
            )}
            {asset.type === "SITELINK" &&
              "link_text" in asset &&
              (asset.link_text || asset.link_url) && (
                <>
                  {asset.link_text && (
                    <div>
                      <dt className="font-semibold text-[#556179] uppercase tracking-wide mb-0.5">
                        Link Text
                      </dt>
                      <dd className="text-[#072929]">{asset.link_text}</dd>
                    </div>
                  )}
                  {asset.link_url && (
                    <div>
                      <dt className="font-semibold text-[#556179] uppercase tracking-wide mb-0.5">
                        Link URL
                      </dt>
                      <dd className="text-[#072929]">
                        <a
                          href={asset.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#136D6D] hover:underline break-all"
                        >
                          {asset.link_url}
                        </a>
                      </dd>
                    </div>
                  )}
                </>
              )}
          </dl>

          {/* Preview */}
          {(previewUrl || youtubeId) && (
            <div className="mt-6 pt-4 border-t border-[#E8E8E3]">
              <h3 className="text-[13.3px] font-semibold text-[#556179] uppercase tracking-wide mb-3">
                Preview
              </h3>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt={asset.name}
                  className="max-w-full max-h-[280px] object-contain rounded-lg border border-[#e8e8e3]"
                />
              )}
              {youtubeId && (
                <div className="rounded-lg overflow-hidden border border-[#e8e8e3] bg-black">
                  <iframe
                    title={`YouTube ${asset.name}`}
                    width="100%"
                    height="315"
                    src={`https://www.youtube.com/embed/${youtubeId}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="max-h-[280px]"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
