import React, { useState } from "react";
import { googleAdwordsAssetsService, type CreateImageAssetPayload } from "../../services/googleAdwords/googleAdwordsAssets";
import { Loader } from "../ui/Loader";

interface CreateImageAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (asset: any) => void;
  profileId: number;
  title?: string;
}

export const CreateImageAssetModal: React.FC<CreateImageAssetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  profileId,
  title = "Create Image Asset",
}) => {
  const [imageUrl, setImageUrl] = useState("");
  const [assetName, setAssetName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      setError("Image URL is required");
      return;
    }

    // Basic URL validation
    if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: CreateImageAssetPayload = {
        image_url: imageUrl.trim(),
        asset_name: assetName.trim() || undefined,
      };

      const response = await googleAdwordsAssetsService.createImageAsset(profileId, payload);
      if (response.success) {
        onSuccess(response.asset);
        // Reset form
        setImageUrl("");
        setAssetName("");
        onClose();
      } else {
        setError("Failed to create asset");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to create asset");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.png"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter a publicly accessible image URL
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asset Name (Optional)
            </label>
            <input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="e.g., Logo Asset"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !imageUrl.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader size="sm" showMessage={false} />}
              Create Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
