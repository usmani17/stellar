import React, { useState, useEffect } from "react";
import { Dropdown } from "../ui/Dropdown";
import { accountsService } from "../../services/accounts";

export interface AssetInput {
  brandEntityId: string;
  mediaType: "brandLogo";
  file: File | null;
}

interface BrandEntity {
  id: string;
  name: string;
  brandEntityId: string;
}

interface CreateAssetPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (asset: AssetInput) => Promise<void>;
  accountId?: string | number;
  profileId?: string;
  brandEntityId?: string;
  loading?: boolean;
  submitError?: string | null;
  fieldErrors?: Record<string, string>;
}

const MEDIA_TYPE_OPTIONS = [
  { value: "brandLogo", label: "Brand Logo" },
];

export const CreateAssetPanel: React.FC<CreateAssetPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  accountId,
  profileId,
  brandEntityId: initialBrandEntityId = "",
  loading = false,
  submitError = null,
  fieldErrors = {},
}) => {
  const [assetData, setAssetData] = useState<AssetInput>({
    brandEntityId: initialBrandEntityId,
    mediaType: "brandLogo",
    file: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [brandEntities, setBrandEntities] = useState<BrandEntity[]>([]);
  const [loadingBrandEntities, setLoadingBrandEntities] = useState(false);

  // Fetch brand entities when panel opens
  useEffect(() => {
    if (isOpen && accountId) {
      loadBrandEntities();
    }
  }, [isOpen, accountId, profileId]);

  const loadBrandEntities = async () => {
    if (!accountId) return;
    
    try {
      setLoadingBrandEntities(true);
      const accountIdNum = typeof accountId === 'string' ? parseInt(accountId, 10) : accountId;
      if (isNaN(accountIdNum)) return;
      
      // Pass profileId to filter brand entities by the campaign's profile
      const entities = await accountsService.getBrandEntities(accountIdNum, profileId);
      // Transform to match BrandEntity interface
      const transformedEntities = entities.map((entity) => ({
        id: entity.brandEntityId,
        name: entity.brandRegistryName || entity.brandEntityId,
        brandEntityId: entity.brandEntityId,
      }));
      setBrandEntities(transformedEntities);
    } catch (error) {
      console.error("Failed to load brand entities:", error);
      setBrandEntities([]);
    } finally {
      setLoadingBrandEntities(false);
    }
  };

  const handleChange = (field: keyof AssetInput, value: any) => {
    setAssetData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 1024 * 1024; // 1MB
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif"];

    if (file.size > maxSize) {
      setErrors((prev) => ({
        ...prev,
        file: "File size must be less than 1MB",
      }));
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        file: "File must be PNG, JPEG, or GIF",
      }));
      return;
    }

    // Check image dimensions
    const img = new Image();
    img.onload = () => {
      if (img.width < 400 || img.height < 400) {
        setErrors((prev) => ({
          ...prev,
          file: "Image must be at least 400x400 pixels",
        }));
        return;
      }

      // File is valid
      handleChange("file", file);
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.file;
        return newErrors;
      });

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    };
    img.onerror = () => {
      setErrors((prev) => ({
        ...prev,
        file: "Invalid image file",
      }));
    };
    img.src = URL.createObjectURL(file);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!assetData.brandEntityId.trim()) {
      newErrors.brandEntityId = "Brand Entity ID is required";
    }

    if (!assetData.file) {
      newErrors.file = "File is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    await onSubmit(assetData);
  };

  const handleCancel = () => {
    setAssetData({
      brandEntityId: initialBrandEntityId,
      mediaType: "brandLogo",
      file: null,
    });
    setErrors({});
    setFilePreview(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
          Upload Asset
        </h2>

        <div className="space-y-4">
          {/* Brand Entity ID */}
          <div>
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Brand Entity *
            </label>
            {loadingBrandEntities ? (
              <div className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-gray-500">
                Loading brand entities...
              </div>
            ) : (
              <>
                <Dropdown<string>
                  options={brandEntities.map((entity) => ({
                    value: entity.brandEntityId,
                    label: entity.name,
                  }))}
                  value={assetData.brandEntityId}
                  onChange={(value) => handleChange("brandEntityId", value)}
                  placeholder="Select brand entity"
                  buttonClassName="w-full"
                />
                {errors.brandEntityId && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.brandEntityId}
                  </p>
                )}
                {fieldErrors.brandEntityId && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {fieldErrors.brandEntityId}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Media Type */}
          <div>
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Media Type *
            </label>
            <Dropdown<string>
              options={MEDIA_TYPE_OPTIONS}
              value={assetData.mediaType}
              onChange={(value) =>
                handleChange("mediaType", value as "brandLogo")
              }
              placeholder="Select media type"
              buttonClassName="w-full"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Image File *
            </label>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif"
                onChange={handleFileChange}
                className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                  errors.file ? "border-red-500" : "border-gray-200"
                }`}
              />
              <p className="text-[10px] text-gray-500">
                Requirements: PNG, JPEG, or GIF • Max 1MB • Min 400x400 pixels
              </p>
              {errors.file && (
                <p className="text-[10px] text-red-500">{errors.file}</p>
              )}
              {fieldErrors.file && (
                <p className="text-[10px] text-red-500">{fieldErrors.file}</p>
              )}
            </div>

            {/* File Preview */}
            {filePreview && (
              <div className="mt-4">
                <p className="text-[11.2px] font-semibold text-[#556179] mb-2">
                  Preview:
                </p>
                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="max-w-full max-h-64 mx-auto"
                  />
                  {assetData.file && (
                    <p className="text-[10px] text-gray-500 mt-2 text-center">
                      {assetData.file.name} ({(assetData.file.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-200">
          <p className="text-[12px] text-red-600">{submitError}</p>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Uploading..." : "Upload Asset"}
        </button>
      </div>
    </div>
  );
};

