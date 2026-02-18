import React, { useState } from "react";
import { type CreateSitelinkAssetPayload } from "../../services/googleAdwords/googleAdwordsAssets";
import { Loader } from "../ui/Loader";
import { useCreateSitelinkAsset } from "../../hooks/mutations/useAssetMutations";

interface CreateSitelinkAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (asset: any) => void;
  profileId: number;
  title?: string;
}

export const CreateSitelinkAssetModal: React.FC<CreateSitelinkAssetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  profileId,
  title = "Create Sitelink Asset",
}) => {
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [description1, setDescription1] = useState("");
  const [description2, setDescription2] = useState("");
  const [assetName, setAssetName] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const createSitelinkAssetMutation = useCreateSitelinkAsset(profileId);
  const loading = createSitelinkAssetMutation.isPending;

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement> | React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!linkText.trim()) {
      setError("Link text is required");
      return;
    }

    if (!linkUrl.trim()) {
      setError("Link URL is required");
      return;
    }

    // Basic URL validation
    if (!linkUrl.startsWith("http://") && !linkUrl.startsWith("https://")) {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    setError(null);

    try {
      const payload: CreateSitelinkAssetPayload = {
        link_text: linkText.trim(),
        link_url: linkUrl.trim(),
        description1: description1.trim() || undefined,
        description2: description2.trim() || undefined,
        asset_name: assetName.trim() || undefined,
      };

      const asset = await createSitelinkAssetMutation.mutateAsync(payload);
      onSuccess(asset);
      // Reset form
      setLinkText("");
      setLinkUrl("");
      setDescription1("");
      setDescription2("");
      setAssetName("");
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to create asset");
    }
  };

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setLinkText("");
    setLinkUrl("");
    setDescription1("");
    setDescription2("");
    setAssetName("");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e8e8e3]">
          <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">{title}</h2>
          <button
            type="button"
            onClick={handleCancel}
            className="text-[#556179] hover:text-[#072929] transition-colors"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#072929] mb-1">
              Link Text <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder="e.g., Shop Now"
              className="w-full px-3 py-2 border border-[#e8e8e3] rounded-lg focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] text-[13.3px] text-[#072929]"
              required
              disabled={loading}
              maxLength={25}
            />
            <p className="text-xs text-[#556179] mt-1">
              Maximum 25 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#072929] mb-1">
              Link URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com/page"
              className="w-full px-3 py-2 border border-[#e8e8e3] rounded-lg focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] text-[13.3px] text-[#072929]"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#072929] mb-1">
              Description 1 (Optional)
            </label>
            <input
              type="text"
              value={description1}
              onChange={(e) => setDescription1(e.target.value)}
              placeholder="First description line"
              className="w-full px-3 py-2 border border-[#e8e8e3] rounded-lg focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] text-[13.3px] text-[#072929]"
              disabled={loading}
              maxLength={35}
            />
            <p className="text-xs text-[#556179] mt-1">
              Maximum 35 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#072929] mb-1">
              Description 2 (Optional)
            </label>
            <input
              type="text"
              value={description2}
              onChange={(e) => setDescription2(e.target.value)}
              placeholder="Second description line"
              className="w-full px-3 py-2 border border-[#e8e8e3] rounded-lg focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] text-[13.3px] text-[#072929]"
              disabled={loading}
              maxLength={35}
            />
            <p className="text-xs text-[#556179] mt-1">
              Maximum 35 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#072929] mb-1">
              Asset Name (Optional)
            </label>
            <input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="e.g., Shop Sitelink"
              className="w-full px-3 py-2 border border-[#e8e8e3] rounded-lg focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] text-[13.3px] text-[#072929]"
              disabled={loading}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e8e8e3]">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 text-[#072929] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 text-[13.3px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !linkText.trim() || !linkUrl.trim()}
              className="create-entity-button disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader size="sm" showMessage={false} variant="white" />}
              <span className="text-[10.64px] text-white font-normal">Create Asset</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
