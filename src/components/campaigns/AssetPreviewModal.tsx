import React from "react";
import { Loader } from "../ui/Loader";

interface AssetPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string | null;
  loading?: boolean;
  error?: string | null;
  contentType?: string | null;
}

export const AssetPreviewModal: React.FC<AssetPreviewModalProps> = ({
  isOpen,
  onClose,
  previewUrl,
  loading = false,
  error = null,
  contentType = null,
}) => {
  if (!isOpen) return null;

  // Determine if the asset is a video
  const isVideo = React.useMemo(() => {
    if (contentType) {
      return contentType.startsWith("video/");
    }
    if (previewUrl) {
      const urlLower = previewUrl.toLowerCase();
      return (
        urlLower.includes(".mp4") ||
        urlLower.includes(".mov") ||
        urlLower.includes(".avi") ||
        urlLower.includes(".webm") ||
        urlLower.includes("video")
      );
    }
    return false;
  }, [contentType, previewUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900 bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 border border-[#E8E8E3]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E8E8E3]">
          <h3 className="text-[18px] font-semibold text-[#072929]">
            Asset Preview
          </h3>
          <button
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

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader size="md" message="Loading preview..." />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-[14px] text-red-600 mb-2">{error}</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-[#136D6D] text-white rounded-lg hover:bg-[#0f5a5a] transition-colors text-[13.3px]"
                >
                  Close
                </button>
              </div>
            </div>
          ) : previewUrl ? (
            <div className="flex items-center justify-center">
              {isVideo ? (
                <video
                  src={previewUrl}
                  controls
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLVideoElement;
                    target.style.display = "none";
                    const errorDiv = document.createElement("div");
                    errorDiv.className = "text-center py-12";
                    errorDiv.innerHTML = `
                      <p class="text-[14px] text-red-600 mb-2">Failed to load video</p>
                      <a href="${previewUrl}" target="_blank" rel="noopener noreferrer" class="text-[13.3px] text-[#136D6D] hover:underline">
                        Open in new tab
                      </a>
                    `;
                    target.parentNode?.appendChild(errorDiv);
                  }}
                >
                  Your browser does not support the video tag.
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-[13.3px] text-[#136D6D] hover:underline">
                    Open video in new tab
                  </a>
                </video>
              ) : (
                <img
                  src={previewUrl}
                  alt="Asset preview"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const errorDiv = document.createElement("div");
                    errorDiv.className = "text-center py-12";
                    errorDiv.innerHTML = `
                      <p class="text-[14px] text-red-600 mb-2">Failed to load image</p>
                      <a href="${previewUrl}" target="_blank" rel="noopener noreferrer" class="text-[13.3px] text-[#136D6D] hover:underline">
                        Open in new tab
                      </a>
                    `;
                    target.parentNode?.appendChild(errorDiv);
                  }}
                />
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

