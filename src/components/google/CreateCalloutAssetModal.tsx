import React, { useState } from "react";
import { type CreateCalloutAssetPayload } from "../../services/googleAdwords/googleAdwordsAssets";
import { Loader } from "../ui/Loader";
import { useCreateCalloutAsset } from "../../hooks/mutations/useAssetMutations";

interface CreateCalloutAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (asset: any) => void;
  profileId: number;
  title?: string;
}

export const CreateCalloutAssetModal: React.FC<CreateCalloutAssetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  profileId,
  title = "Create Callout Asset",
}) => {
  const [text, setText] = useState("");
  const [assetName, setAssetName] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const createCalloutAssetMutation = useCreateCalloutAsset(profileId);
  const loading = createCalloutAssetMutation.isPending;

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement> | React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!text.trim()) {
      setError("Callout text is required");
      return;
    }

    // Validate callout text length (max 25 characters)
    if (text.trim().length > 25) {
      setError("Callout text must be 25 characters or less");
      return;
    }

    setError(null);

    try {
      const payload: CreateCalloutAssetPayload = {
        text: text.trim(),
        asset_name: assetName.trim() || undefined,
      };

      const asset = await createCalloutAssetMutation.mutateAsync(payload);
      onSuccess(asset);
      // Reset form
      setText("");
      setAssetName("");
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to create asset");
    }
  };

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setText("");
    setAssetName("");
    setError(null);
    onClose();
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
              Callout Text <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g., Free Shipping"
              className="w-full px-3 py-2 border border-[#e8e8e3] rounded-lg focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] text-[13.3px] text-[#072929]"
              required
              disabled={loading}
              maxLength={25}
            />
            <p className="text-xs text-[#556179] mt-1">
              Maximum 25 characters ({text.length}/25)
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
              placeholder="e.g., Free Shipping Callout"
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
              disabled={loading || !text.trim()}
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
