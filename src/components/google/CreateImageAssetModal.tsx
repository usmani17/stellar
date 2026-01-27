import React, { useState } from "react";
import { type CreateImageAssetPayload } from "../../services/googleAdwords/googleAdwordsAssets";
import { Loader } from "../ui/Loader";
import { useCreateImageAsset } from "../../hooks/mutations/useAssetMutations";

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<"url" | "upload">("url");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const createImageAssetMutation = useCreateImageAsset(profileId);
  const loading = createImageAssetMutation.isPending;

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      // Validate file size (max 25MB)
      if (file.size > 25 * 1024 * 1024) {
        setError("File size must be less than 25MB");
        setUploading(false);
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("File must be an image");
        setUploading(false);
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to S3
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"}/accounts/upload/logo/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.error || responseData.message || "Upload failed";
        setError(errorMessage);
        setUploading(false);
        return;
      }

      if (responseData.url) {
        setImageUrl(responseData.url);
        setError(null);
      } else {
        setError("Upload succeeded but no URL returned");
      }
    } catch (err: any) {
      setError(err.message || "Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Clear form state
    setImageUrl("");
    setAssetName("");
    setImagePreview(null);
    setUploadMethod("url");
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imageUrl.trim()) {
      setError("Image URL is required");
      return;
    }

    // Basic URL validation
    if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    setError(null);

    try {
      const payload: CreateImageAssetPayload = {
        image_url: imageUrl.trim(),
        asset_name: assetName.trim() || undefined,
      };

      const asset = await createImageAssetMutation.mutateAsync(payload);
      onSuccess(asset);
      // Reset form
      setImageUrl("");
      setAssetName("");
      setImagePreview(null);
      setUploadMethod("url");
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to create asset");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e8e8e3]">
          <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">{title}</h2>
          <button
            type="button"
            onClick={handleCancel}
            className="text-[#556179] hover:text-[#072929] transition-colors"
            disabled={loading || uploading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Upload Method Toggle */}
          <div>
            <label className="block text-sm font-medium text-[#072929] mb-2">
              Upload Method
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="url"
                  checked={uploadMethod === "url"}
                  onChange={(e) => {
                    setUploadMethod(e.target.value as "url" | "upload");
                    setImageUrl("");
                    setImagePreview(null);
                  }}
                  className="w-4 h-4 accent-[#136D6D]"
                />
                <span className="text-sm text-[#072929]">Image URL</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="upload"
                  checked={uploadMethod === "upload"}
                  onChange={(e) => {
                    setUploadMethod(e.target.value as "url" | "upload");
                    setImageUrl("");
                    setImagePreview(null);
                  }}
                  className="w-4 h-4 accent-[#136D6D]"
                />
                <span className="text-sm text-[#072929]">Upload Image</span>
              </label>
            </div>
          </div>

          {uploadMethod === "url" ? (
            <div>
              <label className="block text-sm font-medium text-[#072929] mb-1">
                Image URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.png"
                className="w-full px-3 py-2 border border-[#e8e8e3] rounded-lg focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] text-[13.3px] text-[#072929]"
                required
                disabled={loading}
              />
              <p className="text-xs text-[#556179] mt-1">
                Enter a publicly accessible image URL
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-[#072929] mb-1">
                Upload Image <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                }}
                className="w-full px-3 py-2 border border-[#e8e8e3] rounded-lg text-[13.3px] text-[#072929]"
                disabled={uploading || loading}
              />
              {uploading && (
                <div className="mt-2 flex items-center gap-2">
                  <Loader size="sm" showMessage={false} />
                  <span className="text-xs text-[#556179]">Uploading...</span>
                </div>
              )}
              {imagePreview && (
                <div className="mt-2">
                  <p className="text-xs text-[#556179] mb-1">Preview:</p>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-48 max-h-32 rounded border border-[#e8e8e3]"
                    onError={() => setImagePreview(null)}
                  />
                </div>
              )}
              <p className="text-xs text-[#556179] mt-1">
                Upload image. Max file size: 25MB.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#072929] mb-1">
              Asset Name (Optional)
            </label>
            <input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="e.g., Logo Asset"
              className="w-full px-3 py-2 border border-[#e8e8e3] rounded-lg focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] text-[13.3px] text-[#072929]"
              disabled={loading || uploading}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e8e8e3]">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading || uploading}
              className="px-4 py-2 text-[#072929] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 text-[13.3px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || uploading || !imageUrl.trim()}
              className="create-entity-button disabled:opacity-50 flex items-center gap-2"
            >
              {(loading || uploading) && <Loader size="sm" showMessage={false} variant="white" />}
              <span className="text-[10.64px] text-white font-normal">
                {uploading ? "Uploading..." : "Create Asset"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
