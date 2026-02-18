import React, { useState } from "react";
import type { CreateYoutubeVideoAssetPayload } from "../../../services/googleAdwords/googleAdwordsAssets";
import { googleAdwordsAssetsService } from "../../../services/googleAdwords/googleAdwordsAssets";

interface CreateVideoAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (asset: any) => void;
  profileId: number;
}

export const CreateVideoAssetModal: React.FC<CreateVideoAssetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  profileId,
}) => {
  const [formData, setFormData] = useState<CreateYoutubeVideoAssetPayload>({
    youtube_video_id: "",
    asset_name: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.youtube_video_id?.trim()) {
      setError("YouTube Video ID is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await googleAdwordsAssetsService.createYoutubeVideoAsset(
        profileId,
        formData
      );

      if (response.success) {
        onSuccess(response.asset);
        onClose();
        // Reset form
        setFormData({ youtube_video_id: "", asset_name: "" });
      } else {
        setError("Failed to create video asset");
      }
    } catch (err) {
      console.error("Error creating video asset:", err);
      setError(err instanceof Error ? err.message : "Failed to create video asset");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateYoutubeVideoAssetPayload, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const extractVideoId = (url: string): string => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : url;
  };

  const handleVideoUrlChange = (value: string) => {
    // Extract video ID if URL is provided
    const videoId = extractVideoId(value);
    handleInputChange("youtube_video_id", videoId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Create Video Asset</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asset Name
            </label>
            <input
              type="text"
              value={formData.asset_name}
              onChange={(e) => handleInputChange("asset_name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter asset name (optional)"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              YouTube Video URL or ID *
            </label>
            <input
              type="text"
              value={formData.youtube_video_id}
              onChange={(e) => handleVideoUrlChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://youtube.com/watch?v=... or dQw4w9WgXcQ"
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter a YouTube video URL or video ID
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
