import React, { useState, useEffect } from "react";
import { Dropdown } from "../ui/Dropdown";
import { accountsService } from "../../services/accounts";

export interface AssetInput {
  // Required fields
  assetName: string;
  assetType: "IMAGE" | "VIDEO";
  assetSubTypeList: string[];
  brandEntityId: string; // Required for sellers
  file: File | null;

  // Optional fields
  asinList?: string[];
  tags?: string[];
  versionInfo?: {
    linkedAssetId: string;
    versionNotes?: string;
  };
  registrationContext?: {
    associatedPrograms: Array<{
      programName: string;
      metadata?: {
        dspAdvertiserId?: string;
      };
    }>;
  };
  skipAssetSubTypesDetection?: boolean;

  // Backward compatibility
  mediaType?: string; // Deprecated
  url?: string; // Pre-existing URL if upload handled upstream
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

const ASSET_TYPE_OPTIONS = [
  { value: "IMAGE", label: "Image" },
  { value: "VIDEO", label: "Video" },
];

const IMAGE_SUBTYPE_OPTIONS = [
  { value: "LOGO", label: "Logo" },
  { value: "PRODUCT_IMAGE", label: "Product Image" },
  { value: "AUTHOR_IMAGE", label: "Author Image" },
  { value: "LIFESTYLE_IMAGE", label: "Lifestyle Image" },
  { value: "OTHER_IMAGE", label: "Other Image" },
];

const VIDEO_SUBTYPE_OPTIONS = [
  { value: "BACKGROUND_VIDEO", label: "Background Video" },
];

const PROGRAM_OPTIONS = [{ value: "A_PLUS", label: "A+ Content" }];

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
    assetName: "",
    assetType: "IMAGE",
    assetSubTypeList: ["LOGO"],
    brandEntityId: initialBrandEntityId,
    file: null,
    skipAssetSubTypesDetection: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [brandEntities, setBrandEntities] = useState<BrandEntity[]>([]);
  const [loadingBrandEntities, setLoadingBrandEntities] = useState(false);
  const [asinInput, setAsinInput] = useState<string>("");
  const [asinList, setAsinList] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [enableVersioning, setEnableVersioning] = useState(false);
  const [showProgramAssociation, setShowProgramAssociation] = useState(false);

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
      const accountIdNum =
        typeof accountId === "string" ? parseInt(accountId, 10) : accountId;
      if (isNaN(accountIdNum)) return;

      // Pass profileId to filter brand entities by the campaign's profile
      const entities = await accountsService.getBrandEntities(
        accountIdNum,
        profileId
      );
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
    setAssetData((prev) => {
      const updated = { ...prev, [field]: value };

      // When assetType changes, update assetSubTypeList to valid options
      if (field === "assetType") {
        if (value === "IMAGE") {
          updated.assetSubTypeList = ["LOGO"]; // Default to LOGO for IMAGE
        } else if (value === "VIDEO") {
          updated.assetSubTypeList = ["BACKGROUND_VIDEO"]; // Default for VIDEO
        }
      }

      return updated;
    });
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAssetSubTypeChange = (selectedValues: string[]) => {
    setAssetData((prev) => ({ ...prev, assetSubTypeList: selectedValues }));
    if (errors.assetSubTypeList) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.assetSubTypeList;
        return newErrors;
      });
    }
  };

  const handleAddAsin = () => {
    const asin = asinInput.trim().toUpperCase();
    if (asin && asin.match(/^[A-Z0-9]+$/) && !asinList.includes(asin)) {
      if (asinList.length >= 100) {
        setErrors((prev) => ({
          ...prev,
          asinList: "Maximum 100 ASINs allowed",
        }));
        return;
      }
      setAsinList([...asinList, asin]);
      setAsinInput("");
      if (errors.asinList) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.asinList;
          return newErrors;
        });
      }
    } else if (asin && !asin.match(/^[A-Z0-9]+$/)) {
      setErrors((prev) => ({
        ...prev,
        asinList: "ASIN must be uppercase alphanumeric",
      }));
    }
  };

  const handleRemoveAsin = (asin: string) => {
    setAsinList(asinList.filter((a) => a !== asin));
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleVersionInfoChange = (
    field: "linkedAssetId" | "versionNotes",
    value: string
  ) => {
    setAssetData((prev) => ({
      ...prev,
      versionInfo: {
        ...prev.versionInfo,
        [field]: value,
      } as AssetInput["versionInfo"],
    }));
    if (errors[`versionInfo.${field}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`versionInfo.${field}`];
        return newErrors;
      });
    }
  };

  const handleProgramChange = (programName: string) => {
    setAssetData((prev) => ({
      ...prev,
      registrationContext: {
        associatedPrograms: [
          {
            programName,
            metadata: {},
          },
        ],
      },
    }));
  };

  const handleDspAdvertiserIdChange = (dspAdvertiserId: string) => {
    setAssetData((prev) => ({
      ...prev,
      registrationContext: {
        associatedPrograms: [
          {
            programName:
              prev.registrationContext?.associatedPrograms?.[0]?.programName ||
              "A_PLUS",
            metadata: {
              dspAdvertiserId,
            },
          },
        ],
      },
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const allowedImageTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
    ];
    const allowedVideoTypes = [
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
    ];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

    // Different size limits for images vs videos
    const isImage = allowedImageTypes.includes(file.type);
    const isVideo = allowedVideoTypes.includes(file.type);
    const maxImageSize = 2 * 1024 * 1024; // 2MB for images
    const maxVideoSize = 10 * 1024 * 1024; // 10MB for videos

    if (isImage && file.size > maxImageSize) {
      setErrors((prev) => ({
        ...prev,
        file: "Image file size must be less than 2MB",
      }));
      return;
    }

    if (isVideo && file.size > maxVideoSize) {
      setErrors((prev) => ({
        ...prev,
        file: "Video file size must be less than 10MB",
      }));
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        file: "File must be PNG, JPEG, GIF, MP4, MOV, or AVI",
      }));
      return;
    }

    // Validate asset type matches file type
    if (
      assetData.assetType === "IMAGE" &&
      !allowedImageTypes.includes(file.type)
    ) {
      setErrors((prev) => ({
        ...prev,
        file: "Selected file is not an image. Please select IMAGE as asset type or choose an image file.",
      }));
      return;
    }

    if (
      assetData.assetType === "VIDEO" &&
      !allowedVideoTypes.includes(file.type)
    ) {
      setErrors((prev) => ({
        ...prev,
        file: "Selected file is not a video. Please select VIDEO as asset type or choose a video file.",
      }));
      return;
    }

    // Check image dimensions (only for images)
    if (allowedImageTypes.includes(file.type)) {
      const img = new Image();
      img.onload = () => {
        // if (img.width < 400 || img.height < 400) {
        //   setErrors((prev) => ({
        //     ...prev,
        //     file: "Image must be at least 400x400 pixels",
        //   }));
        //   return;
        // }

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
    } else {
      // For videos, just validate and set file
      handleChange("file", file);
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.file;
        return newErrors;
      });

      // Create video preview
      const videoUrl = URL.createObjectURL(file);
      setFilePreview(videoUrl);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!assetData.assetName.trim()) {
      newErrors.assetName = "Asset Name is required";
    }

    if (!assetData.assetType) {
      newErrors.assetType = "Asset Type is required";
    }

    if (
      !assetData.assetSubTypeList ||
      assetData.assetSubTypeList.length === 0
    ) {
      newErrors.assetSubTypeList = "At least one Asset Sub Type is required";
    } else if (assetData.assetSubTypeList.length > 10) {
      newErrors.assetSubTypeList = "Maximum 10 Asset Sub Types allowed";
    }

    // Validate assetType/assetSubTypeList combinations
    const validImageSubtypes = [
      "LOGO",
      "PRODUCT_IMAGE",
      "AUTHOR_IMAGE",
      "LIFESTYLE_IMAGE",
      "OTHER_IMAGE",
    ];
    const validVideoSubtypes = ["BACKGROUND_VIDEO"];

    if (assetData.assetType === "IMAGE") {
      const invalidSubtypes = assetData.assetSubTypeList.filter(
        (st) => !validImageSubtypes.includes(st)
      );
      if (invalidSubtypes.length > 0) {
        newErrors.assetSubTypeList = `For IMAGE type, valid sub-types are: ${validImageSubtypes.join(
          ", "
        )}`;
      }
    } else if (assetData.assetType === "VIDEO") {
      const invalidSubtypes = assetData.assetSubTypeList.filter(
        (st) => !validVideoSubtypes.includes(st)
      );
      if (invalidSubtypes.length > 0) {
        newErrors.assetSubTypeList = `For VIDEO type, valid sub-types are: ${validVideoSubtypes.join(
          ", "
        )}`;
      }
    }

    if (!assetData.brandEntityId.trim()) {
      newErrors.brandEntityId = "Brand Entity is required for sellers";
    }

    if (!assetData.file && !assetData.url) {
      newErrors.file = "Either file or URL is required";
    }

    // Validate optional fields if provided
    if (asinList.length > 100) {
      newErrors.asinList = "Maximum 100 ASINs allowed";
    }

    for (const asin of asinList) {
      if (!asin.match(/^[A-Z0-9]+$/)) {
        newErrors.asinList = "All ASINs must be uppercase alphanumeric";
        break;
      }
    }

    // Validate versioning fields if enabled
    if (enableVersioning) {
      if (!assetData.versionInfo?.linkedAssetId?.trim()) {
        newErrors["versionInfo.linkedAssetId"] =
          "Linked Asset ID is required when versioning";
      }
      if (
        assetData.versionInfo?.versionNotes &&
        assetData.versionInfo.versionNotes.length > 1000
      ) {
        newErrors["versionInfo.versionNotes"] =
          "Version Notes must be max 1000 characters";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    // Build final asset data with all fields
    const finalAssetData: AssetInput = {
      ...assetData,
      asinList: asinList.length > 0 ? asinList : undefined,
      tags: tags.length > 0 ? tags : undefined,
      versionInfo: enableVersioning ? assetData.versionInfo : undefined,
      registrationContext: showProgramAssociation
        ? assetData.registrationContext
        : undefined,
    };

    await onSubmit(finalAssetData);
  };

  const handleCancel = () => {
    setAssetData({
      assetName: "",
      assetType: "IMAGE",
      assetSubTypeList: ["LOGO"],
      brandEntityId: initialBrandEntityId,
      file: null,
      skipAssetSubTypesDetection: false,
    });
    setAsinList([]);
    setAsinInput("");
    setTags([]);
    setTagInput("");
    setShowAdvancedOptions(false);
    setEnableVersioning(false);
    setShowProgramAssociation(false);
    setErrors({});
    setFilePreview(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="create-panel">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
          Upload Asset
        </h2>

        <div className="space-y-4 grid grid-cols-4 gap-6">
          {/* Asset Name - Required */}
          <div>
            <label className="form-label-small">
              Asset Name *
            </label>
            <input
              type="text"
              value={assetData.assetName}
              onChange={(e) => handleChange("assetName", e.target.value)}
              placeholder="Enter asset display name"
              className={`w-full campaign-input px-4 py-2.5   ${
                errors.assetName ? "border-red-500" : "border-gray-200"
              }`}
            />
            {errors.assetName && (
              <p className="text-[10px] text-red-500 mt-1">
                {errors.assetName}
              </p>
            )}
            {fieldErrors.assetName && (
              <p className="text-[10px] text-red-500 mt-1">
                {fieldErrors.assetName}
              </p>
            )}
          </div>

          {/* Asset Type - Required */}
          <div>
            <label className="form-label-small">
              Asset Type *
            </label>
            <Dropdown<string>
              options={ASSET_TYPE_OPTIONS}
              value={assetData.assetType}
              onChange={(value) =>
                handleChange("assetType", value as "IMAGE" | "VIDEO")
              }
              placeholder="Select asset type"
              buttonClassName="edit-button w-full"
            />
            {errors.assetType && (
              <p className="text-[10px] text-red-500 mt-1">
                {errors.assetType}
              </p>
            )}
          </div>

          {/* Asset Sub Type - Required, Dynamic */}
          <div>
            <label className="form-label-small">
              Asset Sub Type * (1-10 items)
            </label>
            <div className="space-y-2">
              {(assetData.assetType === "IMAGE"
                ? IMAGE_SUBTYPE_OPTIONS
                : VIDEO_SUBTYPE_OPTIONS
              ).map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={assetData.assetSubTypeList.includes(option.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (assetData.assetSubTypeList.length < 10) {
                          handleAssetSubTypeChange([
                            ...assetData.assetSubTypeList,
                            option.value,
                          ]);
                        }
                      } else {
                        // Prevent unchecking if it's the only item remaining
                        if (assetData.assetSubTypeList.length > 1) {
                          handleAssetSubTypeChange(
                            assetData.assetSubTypeList.filter(
                              (v) => v !== option.value
                            )
                          );
                        }
                      }
                    }}
                    disabled={
                      (assetData.assetSubTypeList.includes(option.value) &&
                        assetData.assetSubTypeList.length === 1) ||
                      (!assetData.assetSubTypeList.includes(option.value) &&
                        assetData.assetSubTypeList.length >= 10)
                    }
                    className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                  />
                  <span className="text-[11.2px] text-[#0b0f16]">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
            {errors.assetSubTypeList && (
              <p className="text-[10px] text-red-500 mt-1">
                {errors.assetSubTypeList}
              </p>
            )}
            {fieldErrors.assetSubTypeList && (
              <p className="text-[10px] text-red-500 mt-1">
                {fieldErrors.assetSubTypeList}
              </p>
            )}
          </div>

          {/* Brand Entity - Required for Sellers */}
          <div>
            <label className="form-label-small">
              Brand Entity * (Required for Sellers)
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
                  buttonClassName="edit-button w-full"
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
</div>
<div className="grid grid-cols-4 gap-6">
          {/* ASIN List - Optional */}
          <div>
            <label className="form-label-small">
              ASIN List (Optional, Max 100)
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={asinInput}
                  onChange={(e) => setAsinInput(e.target.value.toUpperCase())}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddAsin();
                    }
                  }}
                  placeholder="Enter ASIN (uppercase alphanumeric)"
                  className="flex-1 w-full campaign-input px-4 py-2.5   "
                />
                <button
                  type="button"
                  onClick={handleAddAsin}
                  disabled={asinList.length >= 100}
                  className="create-entity-button text-[11.2px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
              {asinList.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {asinList.map((asin) => (
                    <span
                      key={asin}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-[10px] text-[#0b0f16]"
                    >
                      {asin}
                      <button
                        type="button"
                        onClick={() => handleRemoveAsin(asin)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-500">
                Used for asset discoverability and Sponsored Brand search. Max
                100 ASINs.
              </p>
              {errors.asinList && (
                <p className="text-[10px] text-red-500">{errors.asinList}</p>
              )}
            </div>
          </div>
      </div>
<div className="grid grid-cols-4 gap-6">
          {/* Tags - Optional */}
          <div>
            <label className="form-label-small">
              Tags (Optional)
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Enter tag"
                  className="flex-1 w-full campaign-input px-4 py-2.5   "
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="create-entity-button text-[11.2px]"
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-[10px] text-[#0b0f16]"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
</div>
    <div className="grid grid-cols-4 gap-6">
          {/* File Upload - Required (unless URL provided) */}
          <div>
            <label className="form-label-small">
              {assetData.assetType === "IMAGE" ? "Image" : "Video"} File *
            </label>
            <div className="space-y-2">
              <input
                type="file"
                accept={
                  assetData.assetType === "IMAGE"
                    ? "image/png,image/jpeg,image/jpg,image/gif"
                    : "video/mp4,video/quicktime,video/x-msvideo"
                }
                onChange={handleFileChange}
                className={`w-full campaign-input px-4 py-2.5   ${
                  errors.file ? "border-red-500" : "border-gray-200"
                }`}
              />
              <p className="text-[10px] text-gray-500">
                {assetData.assetType === "IMAGE"
                  ? "Requirements: PNG, JPEG, or GIF • Max 2MB • Min 400x400 pixels"
                  : "Requirements: MP4, MOV, or AVI • Max 10MB"}
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
                  {assetData.assetType === "IMAGE" ? (
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="max-w-full max-h-64 mx-auto"
                    />
                  ) : (
                    <video
                      src={filePreview}
                      controls
                      className="max-w-full max-h-64 mx-auto"
                    />
                  )}
                  {assetData.file && (
                    <p className="text-[10px] text-gray-500 mt-2 text-center">
                      {assetData.file.name} (
                      {(assetData.file.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
</div>
        <div className="grid grid-cols-4 gap-6">
          {/* Advanced Options - Expandable */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center justify-between w-full text-[11.2px] font-semibold text-[#556179] uppercase"
            >
              <span>Advanced Options</span>
              <svg
                className={`w-4 h-4 transition-transform ${
                  showAdvancedOptions ? "rotate-180" : ""
                }`}
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
            </button>

            {showAdvancedOptions && (
              <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-200">
                {/* Skip Asset Sub-Type Detection */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={assetData.skipAssetSubTypesDetection || false}
                    onChange={(e) =>
                      handleChange(
                        "skipAssetSubTypesDetection",
                        e.target.checked
                      )
                    }
                    className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                  />
                  <label className="text-[11.2px] text-[#0b0f16]">
                    Skip Asset Sub-Type Detection
                  </label>
                </div>

                {/* Version Existing Asset */}
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={enableVersioning}
                      onChange={(e) => {
                        setEnableVersioning(e.target.checked);
                        if (e.target.checked && !assetData.versionInfo) {
                          handleChange("versionInfo", {
                            linkedAssetId: "",
                            versionNotes: "",
                          });
                        }
                      }}
                      className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                    />
                    <label className="text-[11.2px] font-semibold text-[#556179] uppercase">
                      Version Existing Asset
                    </label>
                  </div>

                  {enableVersioning && (
                    <div className="ml-6 space-y-3">
                      <div>
                        <label className="block text-[10px] text-[#556179] mb-1">
                          Linked Asset ID *
                        </label>
                        <input
                          type="text"
                          value={assetData.versionInfo?.linkedAssetId || ""}
                          onChange={(e) =>
                            handleVersionInfoChange(
                              "linkedAssetId",
                              e.target.value
                            )
                          }
                          placeholder="Enter linked asset ID"
                          className={`w-full campaign-input px-3 py-2 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                            errors["versionInfo.linkedAssetId"]
                              ? "border-red-500"
                              : "border-gray-200"
                          }`}
                        />
                        {errors["versionInfo.linkedAssetId"] && (
                          <p className="text-[10px] text-red-500 mt-1">
                            {errors["versionInfo.linkedAssetId"]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#556179] mb-1">
                          Version Notes (Max 1000 chars)
                        </label>
                        <textarea
                          value={assetData.versionInfo?.versionNotes || ""}
                          onChange={(e) =>
                            handleVersionInfoChange(
                              "versionNotes",
                              e.target.value
                            )
                          }
                          placeholder="Enter version notes"
                          maxLength={1000}
                          rows={3}
                          className={`w-full campaign-input px-3 py-2 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                            errors["versionInfo.versionNotes"]
                              ? "border-red-500"
                              : "border-gray-200"
                          }`}
                        />
                        <p className="text-[9px] text-gray-500 mt-1">
                          {assetData.versionInfo?.versionNotes?.length || 0} /
                          1000 characters
                        </p>
                        {errors["versionInfo.versionNotes"] && (
                          <p className="text-[10px] text-red-500 mt-1">
                            {errors["versionInfo.versionNotes"]}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Program Association */}
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={showProgramAssociation}
                      onChange={(e) => {
                        setShowProgramAssociation(e.target.checked);
                        if (
                          e.target.checked &&
                          !assetData.registrationContext
                        ) {
                          handleChange("registrationContext", {
                            associatedPrograms: [
                              {
                                programName: "A_PLUS",
                                metadata: {},
                              },
                            ],
                          });
                        }
                      }}
                      className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                    />
                    <label className="text-[11.2px] font-semibold text-[#556179] uppercase">
                      Program Association (A+ Content)
                    </label>
                  </div>

                  {showProgramAssociation && (
                    <div className="ml-6 space-y-3">
                      <div>
                        <label className="block text-[10px] text-[#556179] mb-1">
                          Program Name
                        </label>
                        <Dropdown<string>
                          options={PROGRAM_OPTIONS}
                          value={
                            assetData.registrationContext
                              ?.associatedPrograms?.[0]?.programName || "A_PLUS"
                          }
                          onChange={(value) => handleProgramChange(value)}
                          placeholder="Select program"
                          buttonClassName="edit-button w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#556179] mb-1">
                          DSP Advertiser ID (Optional)
                        </label>
                        <input
                          type="text"
                          value={
                            assetData.registrationContext
                              ?.associatedPrograms?.[0]?.metadata
                              ?.dspAdvertiserId || ""
                          }
                          onChange={(e) =>
                            handleDspAdvertiserIdChange(e.target.value)
                          }
                          placeholder="Enter DSP advertiser ID"
                          className="w-full campaign-input px-3 py-2 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                        />
                      </div>
                    </div>
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

      {/* Upload Loading Spinner */}
      {loading && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#136D6D] border-t-transparent"></div>
            <span className="text-[11.2px] font-medium text-[#556179]">
              Uploading{assetData.assetType === "VIDEO" ? " video" : ""}...
            </span>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          )}
          {loading ? "Uploading..." : "Upload Asset"}
        </button>
      </div>
    </div>
  );
};
