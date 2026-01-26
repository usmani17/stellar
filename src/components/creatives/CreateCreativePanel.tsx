import React, { useState, useEffect } from "react";
import { Dropdown } from "../ui/Dropdown";
import { Checkbox } from "../ui/Checkbox";
import { campaignsService } from "../../services/campaigns";
import type { Asset } from "../campaigns/AssetsTable";

export interface CreativeInput {
  creativeType: "IMAGE" | "VIDEO";
  properties: {
    headline?: {
      headline: string;
      hasTermsAndConditions?: boolean;
      originalHeadline?: string;
    };
    brandLogo?: {
      assetId: string;
      assetVersion: string;
      croppingCoordinates?: {
        top: number;
        left: number;
        width: number;
        height: number;
      };
    };
    customImage?: {
      rectCustomImage?: {
        assetId: string;
        assetVersion: string;
        croppingCoordinates?: {
          top: number;
          left: number;
          width: number;
          height: number;
        };
      };
      squareCustomImage?: {
        assetId: string;
        assetVersion: string;
        croppingCoordinates?: {
          top: number;
          left: number;
          width: number;
          height: number;
        };
      };
      squareImages?: Array<{
        assetId: string;
        assetVersion: string;
        croppingCoordinates?: {
          top: number;
          left: number;
          width: number;
          height: number;
        };
      }>;
      horizontalImages?: Array<{
        assetId: string;
        assetVersion: string;
        croppingCoordinates?: {
          top: number;
          left: number;
          width: number;
          height: number;
        };
      }>;
      verticalImages?: Array<{
        assetId: string;
        assetVersion: string;
        croppingCoordinates?: {
          top: number;
          left: number;
          width: number;
          height: number;
        };
      }>;
    };
    background?: {
      backgrounds: Array<{
        color: string;
      }>;
    };
    video?: {
      video?: {
        assetId: string;
        assetVersion: string;
        originalAssetId?: string;
        originalAssetVersion?: string;
      };
      squareVideos?: Array<{
        assetId: string;
        assetVersion: string;
        originalAssetId?: string;
        originalAssetVersion?: string;
      }>;
      horizontalVideos?: Array<{
        assetId: string;
        assetVersion: string;
        originalAssetId?: string;
        originalAssetVersion?: string;
      }>;
      verticalVideos?: Array<{
        assetId: string;
        assetVersion: string;
        originalAssetId?: string;
        originalAssetVersion?: string;
      }>;
    };
  };
  consentToTranslate?: boolean;
}

interface CreateCreativePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (creatives: CreativeInput[], adGroupId: number) => void;
  onUpdate?: (
    creative: CreativeInput,
    adGroupId: number,
    creativeId: number | string,
  ) => void;
  adgroups: Array<{ adGroupId: string | number; name: string }>;
  loading?: boolean;
  editCreative?: {
    id: number;
    creativeId: number | string; // Can be string to preserve precision
    adGroupId: number | string; // Can be string to preserve precision
    creativeType: "IMAGE" | "VIDEO";
    properties: any;
    consentToTranslate?: boolean;
  } | null;
  accountId?: string;
  profileId?: string;
}

const CREATIVE_TYPE_OPTIONS = [
  { value: "IMAGE", label: "IMAGE" },
  { value: "VIDEO", label: "VIDEO" },
];

const PROPERTY_TYPE_OPTIONS_IMAGE = [
  { value: "headline", label: "Headline" },
  { value: "brandLogo", label: "Brand Logo" },
  { value: "customImage", label: "Custom Image" },
  { value: "background", label: "Background" },
];

const PROPERTY_TYPE_OPTIONS_VIDEO = [{ value: "video", label: "Video" }];

export const CreateCreativePanel: React.FC<CreateCreativePanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onUpdate,
  adgroups,
  loading = false,
  editCreative,
  accountId,
  profileId,
}) => {
  const [selectedAdGroupId, setSelectedAdGroupId] = useState<string>(
    adgroups.length > 0 ? String(adgroups[0].adGroupId) : "",
  );
  const [currentCreative, setCurrentCreative] = useState<CreativeInput>({
    creativeType: "IMAGE",
    properties: {},
    consentToTranslate: false,
  });
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>("");
  const [addedPropertyTypes, setAddedPropertyTypes] = useState<Set<string>>(
    new Set(),
  );
  const [activePropertyTab, setActivePropertyTab] = useState<string>("");
  const [addedCreatives, setAddedCreatives] = useState<CreativeInput[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);

  // Fetch assets when component opens
  useEffect(() => {
    if (isOpen && accountId) {
      loadAssets();
    }
  }, [isOpen, accountId, profileId]);

  const loadAssets = async () => {
    if (!accountId) {
      console.log("[CreateCreativePanel] No accountId, skipping asset load");
      return;
    }

    try {
      setAssetsLoading(true);
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        console.error("[CreateCreativePanel] Invalid account ID:", accountId);
        setAssets([]);
        return;
      }
      console.log(
        "[CreateCreativePanel] Loading assets for accountId:",
        accountIdNum,
        "profileId:",
        profileId,
      );
      const data = await campaignsService.getAssets(accountIdNum, {
        page: 1,
        page_size: 100, // Get all assets for dropdown
        ...(profileId && { profileId }), // Include profileId if available to filter assets
      });
      console.log(
        "[CreateCreativePanel] Assets loaded:",
        data.assets?.length || 0,
        "assets",
      );
      setAssets(data.assets || []);
    } catch (error) {
      console.error("[CreateCreativePanel] Failed to load assets:", error);
      setAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  };

  // Populate form when editing
  useEffect(() => {
    if (editCreative) {
      // Set ad group
      setSelectedAdGroupId(String(editCreative.adGroupId));

      // Parse properties if it's a string
      let properties = editCreative.properties;
      if (typeof properties === "string") {
        try {
          properties = JSON.parse(properties);
        } catch (e) {
          console.error("Failed to parse properties:", e);
          properties = {};
        }
      }

      // Normalize properties structure to match form expectations
      const normalizedProperties: any = {};
      const propertyTypes = new Set<string>();

      // Check for headline - handle both nested and flat structures
      // Backend may return: { headline: {...} } (nested) OR { headline: 'text', originalHeadline: 'text', hasTermsAndConditions: false } (flat)
      if (properties && typeof properties === "object") {
        // Check for nested structure: properties.headline.headline
        if (
          properties.headline &&
          typeof properties.headline === "object" &&
          properties.headline.headline !== undefined
        ) {
          normalizedProperties.headline = {
            headline: properties.headline.headline || "",
            hasTermsAndConditions:
              properties.headline.hasTermsAndConditions || false,
            originalHeadline: properties.headline.originalHeadline || "",
          };
          propertyTypes.add("headline");
        }
        // Check for flat structure: properties.headline (string), properties.originalHeadline, properties.hasTermsAndConditions
        else if (
          properties.headline !== undefined ||
          properties.originalHeadline !== undefined ||
          properties.hasTermsAndConditions !== undefined
        ) {
          normalizedProperties.headline = {
            headline:
              typeof properties.headline === "string"
                ? properties.headline
                : properties.headline?.headline || "",
            hasTermsAndConditions: properties.hasTermsAndConditions || false,
            originalHeadline: properties.originalHeadline || "",
          };
          propertyTypes.add("headline");
        }
      }

      // Check for brandLogo
      if (properties.brandLogo) {
        normalizedProperties.brandLogo = {
          assetId: properties.brandLogo.assetId || "",
          assetVersion: properties.brandLogo.assetVersion || "",
          croppingCoordinates:
            properties.brandLogo.croppingCoordinates || undefined,
        };
        propertyTypes.add("brandLogo");
      }

      // Check for customImage (rectCustomImage and/or squareCustomImage at root level)
      // The database stores them at root level, but form expects them nested under customImage
      if (
        properties.rectCustomImage ||
        properties.squareCustomImage ||
        properties.customImage
      ) {
        // Handle both cases: root level or nested
        const rectImage =
          properties.rectCustomImage || properties.customImage?.rectCustomImage;
        const squareImage =
          properties.squareCustomImage ||
          properties.customImage?.squareCustomImage;

        normalizedProperties.customImage = {};

        if (rectImage) {
          normalizedProperties.customImage.rectCustomImage = {
            assetId: rectImage.assetId || "",
            assetVersion: rectImage.assetVersion || "",
            croppingCoordinates: rectImage.croppingCoordinates || undefined,
          };
        }

        if (squareImage) {
          normalizedProperties.customImage.squareCustomImage = {
            assetId: squareImage.assetId || "",
            assetVersion: squareImage.assetVersion || "",
            croppingCoordinates: squareImage.croppingCoordinates || undefined,
          };
        }

        propertyTypes.add("customImage");
      }

      // Check for background
      if (properties.background || properties.backgrounds) {
        normalizedProperties.background = {
          backgrounds:
            properties.background?.backgrounds || properties.backgrounds || [],
        };
        propertyTypes.add("background");
      }

      // Check for video
      if (properties.video) {
        normalizedProperties.video = {
          video: properties.video.video || undefined,
          squareVideos: properties.video.squareVideos || [],
          horizontalVideos: properties.video.horizontalVideos || [],
          verticalVideos: properties.video.verticalVideos || [],
        };
        propertyTypes.add("video");
      }

      // Set current creative with normalized data
      setCurrentCreative({
        creativeType: editCreative.creativeType,
        properties: normalizedProperties,
        consentToTranslate: editCreative.consentToTranslate || false,
      });

      // Set added property types
      setAddedPropertyTypes(propertyTypes);

      // Set active tab - if IMAGE type and headline exists, default to headline
      if (
        editCreative.creativeType === "IMAGE" &&
        propertyTypes.has("headline")
      ) {
        setActivePropertyTab("headline");
      } else if (
        editCreative.creativeType === "VIDEO" &&
        propertyTypes.has("video")
      ) {
        setActivePropertyTab("video");
      } else if (propertyTypes.size > 0) {
        // Set first available property type as active
        setActivePropertyTab(Array.from(propertyTypes)[0]);
      }

      // Clear added creatives (we're editing a single creative)
      setAddedCreatives([]);
    } else {
      // Reset form for create mode
      setCurrentCreative({
        creativeType: "IMAGE",
        properties: {
          headline: {
            headline: "",
            hasTermsAndConditions: false,
            originalHeadline: "",
          },
        },
        consentToTranslate: false,
      });
      setSelectedPropertyType("");
      // Set headline as default tab when creating
      setAddedPropertyTypes(new Set(["headline"]));
      setActivePropertyTab("headline");
      setAddedCreatives([]);
      setSelectedAdGroupId(
        adgroups.length > 0 ? String(adgroups[0].adGroupId) : "",
      );
    }
  }, [editCreative, adgroups]);

  // Ensure main video object is always present when video property type is selected
  useEffect(() => {
    if (addedPropertyTypes.has("video") && currentCreative.properties.video) {
      if (!currentCreative.properties.video.video) {
        setCurrentCreative((prev) => ({
          ...prev,
          properties: {
            ...prev.properties,
            video: {
              ...prev.properties.video,
              video: {
                assetId: "",
                assetVersion: "",
                originalAssetId: "",
                originalAssetVersion: "",
              },
            },
          },
        }));
      }
    }
  }, [addedPropertyTypes, currentCreative.properties.video]);

  const handleChange = (field: string, value: any) => {
    if (field === "creativeType") {
      setCurrentCreative({
        creativeType: value,
        properties: {},
        consentToTranslate: currentCreative.consentToTranslate,
      });
      setAddedPropertyTypes(new Set());
      setSelectedPropertyType("");
      setActivePropertyTab("");

      // For VIDEO type, automatically add video property and show form
      if (value === "VIDEO") {
        handleAddPropertyType("video");
        setActivePropertyTab("video");
      } else if (value === "IMAGE") {
        // For IMAGE type, automatically add headline property and show form
        handleAddPropertyType("headline");
        setActivePropertyTab("headline");
      }
    } else if (field.startsWith("properties.")) {
      const propPath = field.replace("properties.", "");
      setCurrentCreative((prev) => {
        const newProperties = { ...prev.properties };
        // Use a helper to set nested values
        const keys = propPath.split(".");
        let current: any = newProperties;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;

        // Ensure main video object is always present when video property type is selected
        if (addedPropertyTypes.has("video") && newProperties.video) {
          if (!newProperties.video.video) {
            newProperties.video = {
              ...newProperties.video,
              video: {
                assetId: "",
                assetVersion: "",
                originalAssetId: "",
                originalAssetVersion: "",
              },
            };
          }
        }

        return { ...prev, properties: newProperties };
      });
    } else {
      setCurrentCreative((prev) => ({ ...prev, [field]: value }));
    }
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAddPropertyType = (propertyType?: string) => {
    const typeToAdd = propertyType || selectedPropertyType;
    if (!typeToAdd) return;

    // Initialize the property based on type
    if (typeToAdd === "headline" && !currentCreative.properties.headline) {
      handleChange("properties.headline", {
        headline: "",
        hasTermsAndConditions: false,
        originalHeadline: "",
      });
    } else if (
      typeToAdd === "brandLogo" &&
      !currentCreative.properties.brandLogo
    ) {
      handleChange("properties.brandLogo", {
        assetId: "",
        assetVersion: "",
        croppingCoordinates: undefined,
      });
    } else if (
      typeToAdd === "customImage" &&
      !currentCreative.properties.customImage
    ) {
      // Initialize both required fields for customImage
      handleChange("properties.customImage", {
        rectCustomImage: { assetId: "", assetVersion: "" },
        squareCustomImage: { assetId: "", assetVersion: "" },
      });
    } else if (
      typeToAdd === "background" &&
      !currentCreative.properties.background
    ) {
      handleChange("properties.background", { backgrounds: [] });
    } else if (typeToAdd === "video" && !currentCreative.properties.video) {
      // Main video object is mandatory - always initialize it
      handleChange("properties.video", {
        video: {
          assetId: "",
          assetVersion: "",
          originalAssetId: "",
          originalAssetVersion: "",
        },
      });
    }

    setAddedPropertyTypes((prev) => new Set([...prev, typeToAdd]));
    if (!propertyType) {
      setSelectedPropertyType("");
    }
  };

  const handleRemovePropertyType = (propertyType: string) => {
    setAddedPropertyTypes((prev) => {
      const newSet = new Set(prev);
      newSet.delete(propertyType);
      return newSet;
    });

    // Remove the property from currentCreative
    const newProperties = { ...currentCreative.properties };
    if (propertyType === "headline") delete newProperties.headline;
    if (propertyType === "brandLogo") delete newProperties.brandLogo;
    if (propertyType === "customImage") delete newProperties.customImage;
    if (propertyType === "background") delete newProperties.background;
    if (propertyType === "video") delete newProperties.video;

    setCurrentCreative((prev) => ({
      ...prev,
      properties: newProperties,
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!currentCreative.creativeType) {
      newErrors.creativeType = "Creative type is required";
    }

    if (currentCreative.creativeType === "IMAGE") {
      if (addedPropertyTypes.size === 0) {
        newErrors.properties =
          "At least one property type must be added for IMAGE creatives";
      }

      if (addedPropertyTypes.has("headline")) {
        const headline = currentCreative.properties.headline;
        // Headline is optional, but if provided, it must be <= 50 characters
        if (headline && headline.headline && headline.headline.length > 50) {
          newErrors["properties.headline.headline"] =
            "Headline must be 50 characters or less";
        }
      }

      if (addedPropertyTypes.has("brandLogo")) {
        const brandLogo = currentCreative.properties.brandLogo;
        if (!brandLogo || !brandLogo.assetId || !brandLogo.assetVersion) {
          newErrors["properties.brandLogo"] =
            "Brand Logo assetId and assetVersion are required";
        }
        // Validate cropping coordinates if provided
        if (brandLogo?.croppingCoordinates) {
          const crop = brandLogo.croppingCoordinates;
          const cropFields = ["top", "left", "width", "height"];
          for (const field of cropFields) {
            const value = crop[field as keyof typeof crop];
            if (
              value !== undefined &&
              (typeof value !== "number" ||
                value < 0 ||
                !Number.isInteger(value))
            ) {
              newErrors[`properties.brandLogo.croppingCoordinates.${field}`] =
                `${field} must be an integer >= 0`;
            }
          }
        }
      }

      if (addedPropertyTypes.has("customImage")) {
        const customImage = currentCreative.properties.customImage;
        // Both rectCustomImage and squareCustomImage are REQUIRED
        if (
          !customImage ||
          !customImage.rectCustomImage ||
          !customImage.squareCustomImage
        ) {
          newErrors["properties.customImage"] =
            "Both Rectangular Custom Image and Square Custom Image are required";
        } else {
          // Validate rectCustomImage
          if (
            !customImage.rectCustomImage.assetId ||
            !customImage.rectCustomImage.assetVersion
          ) {
            newErrors["properties.customImage.rectCustomImage"] =
              "Rectangular Custom Image assetId and assetVersion are required";
          }
          // Validate squareCustomImage
          if (
            !customImage.squareCustomImage.assetId ||
            !customImage.squareCustomImage.assetVersion
          ) {
            newErrors["properties.customImage.squareCustomImage"] =
              "Square Custom Image assetId and assetVersion are required";
          }
        }
      }

      if (addedPropertyTypes.has("background")) {
        const background = currentCreative.properties.background;
        if (
          !background ||
          !background.backgrounds ||
          background.backgrounds.length === 0
        ) {
          newErrors["properties.background"] =
            "At least one background color is required";
        } else {
          background.backgrounds.forEach((bg, idx) => {
            if (!bg.color || !/^#[0-9A-Fa-f]{6}$/.test(bg.color)) {
              newErrors[`properties.background.backgrounds[${idx}].color`] =
                "Valid hex color (#RRGGBB) is required";
            }
          });
        }
      }
    } else if (currentCreative.creativeType === "VIDEO") {
      if (!addedPropertyTypes.has("video")) {
        newErrors["properties.video"] =
          "Video property is required for VIDEO creatives";
      } else {
        const video = currentCreative.properties.video;
        if (!video || !video.video) {
          newErrors["properties.video"] =
            "Main video object is required for VIDEO creatives";
        } else {
          // Validate main video
          if (!video.video.assetId || !video.video.assetVersion) {
            newErrors["properties.video.video"] =
              "Main video assetId and assetVersion are required";
          }

          // Validate optional video variants if present (arrays)
          const variants = [
            "squareVideos",
            "horizontalVideos",
            "verticalVideos",
          ] as const;
          for (const variant of variants) {
            if (video[variant] && Array.isArray(video[variant])) {
              video[variant].forEach((vid: any, idx: number) => {
                if (!vid.assetId || !vid.assetVersion) {
                  newErrors[`properties.video.${variant}[${idx}]`] =
                    `${variant}[${idx}] assetId and assetVersion are required`;
                }
              });
            }
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = () => {
    const isValid = validate();
    console.log("[handleAdd] Validation result:", isValid);
    console.log("[handleAdd] Current creative:", currentCreative);
    console.log("[handleAdd] Errors:", errors);

    if (isValid) {
      // Check if a creative with the same adGroupId already exists
      if (addedCreatives.length > 0) {
        setErrors({
          submit:
            "Only one creative can be added per ad group. Please submit the current creative or remove the existing one before adding another.",
        });
        return;
      }

      setAddedCreatives((prev) => [...prev, { ...currentCreative }]);
      setCurrentCreative({
        creativeType: "IMAGE",
        properties: {},
        consentToTranslate: false,
      });
      setSelectedPropertyType("");
      setAddedPropertyTypes(new Set());
      setErrors({});
    } else {
      console.log("[handleAdd] Validation failed, errors:", errors);
    }
  };

  const handleRemove = (index: number) => {
    setAddedCreatives((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (editCreative && onUpdate) {
      // Edit mode: use onUpdate callback with creativeId from editCreative object
      if (!selectedAdGroupId) {
        setErrors({ adGroupId: "Please select an ad group" });
        return;
      }
      // Validate that properties are not empty
      if (
        !currentCreative.properties ||
        Object.keys(currentCreative.properties).length === 0
      ) {
        setErrors({ properties: "Please add at least one property" });
        return;
      }
      console.log(editCreative);
      // Use creativeId from the stored editCreative object
      const creativeId = editCreative.creativeId;
      console.log(
        "[CreateCreativePanel] Updating creative with ID from stored object:",
        {
          creativeId: creativeId,
          creativeIdType: typeof creativeId,
          editCreative: editCreative,
        },
      );
      onUpdate(currentCreative, parseInt(selectedAdGroupId, 10), creativeId);
    } else {
      // Create mode: submit added creatives
      if (addedCreatives.length === 0) {
        setErrors({ submit: "Please add at least one creative" });
        return;
      }
      if (!selectedAdGroupId) {
        setErrors({ adGroupId: "Please select an ad group" });
        return;
      }
      onSubmit(addedCreatives, parseInt(selectedAdGroupId, 10));
    }
  };

  const handleClose = () => {
    setSelectedAdGroupId(
      adgroups.length > 0 ? String(adgroups[0].adGroupId) : "",
    );
    setCurrentCreative({
      creativeType: "IMAGE",
      properties: {},
      consentToTranslate: false,
    });
    setSelectedPropertyType("");
    setAddedPropertyTypes(new Set());
    setAddedCreatives([]);
    setErrors({});
    onClose();
  };

  const handleTestData = () => {
    if (adgroups.length === 0) {
      setErrors({ adGroupId: "No ad groups available for test data" });
      return;
    }

    // Set first ad group
    const firstAdGroupId = String(adgroups[0].adGroupId);
    setSelectedAdGroupId(firstAdGroupId);

    // Combine all test properties into one creative
    const testCreative: CreativeInput = {
      creativeType: "IMAGE",
      properties: {
        // Custom Image properties
        customImage: {
          rectCustomImage: {
            assetId:
              "amzn1.assetlibrary.asset1.ee6b9b75765dfae332cb9169593a2eae",
            assetVersion: "version_v1",
            croppingCoordinates: {
              top: 286,
              left: 0,
              width: 1200,
              height: 628,
            },
          },
          squareCustomImage: {
            assetId:
              "amzn1.assetlibrary.asset1.ee6b9b75765dfae332cb9169593a2eae",
            assetVersion: "version_v1",
            croppingCoordinates: {
              top: 0,
              left: 0,
              width: 1200,
              height: 1200,
            },
          },
        },
        // Background properties
        background: {
          backgrounds: [
            {
              color: "#000000",
            },
          ],
        },
        // Headline properties
        headline: {
          headline: "test",
          hasTermsAndConditions: true,
          originalHeadline: "test",
        },
        // Brand Logo properties
        brandLogo: {
          assetId: "amzn1.assetlibrary.asset1.ce57745d5d5a43a90f516e691b3c7671",
          assetVersion: "version_v1",
        },
      },
      consentToTranslate: false,
    };

    setCurrentCreative(testCreative);

    // Add all property types and set the first one as active
    const allPropertyTypes = new Set([
      "customImage",
      "background",
      "headline",
      "brandLogo",
    ]);
    setAddedPropertyTypes(allPropertyTypes);
    setActivePropertyTab("headline"); // Set first tab as active

    // Clear any errors
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="create-panel mb-4">
      {/* Form */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-[#072929]">
            {editCreative ? "Edit Creative" : "Create Creatives"}
          </h2>
          <div className="flex items-center gap-3">
            {!editCreative && (
              <button
                type="button"
                onClick={handleTestData}
                className="px-4 py-2 bg-gray-500 text-white text-[11.2px] rounded-lg hover:bg-gray-600 transition-colors"
              >
                Test
              </button>
            )}
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Close"
            >
              <svg
                className="w-5 h-5"
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
        </div>

        <div>
          {/* Ad Group and Creative Type - Inline */}
          <div className="mb-6 flex gap-4">
            {/* Ad Group Selection */}
            <div className="flex-1">
              <label className="form-label-small">Ad Group *</label>
              <Dropdown
                options={adgroups.map((ag) => ({
                  value: String(ag.adGroupId),
                  label: `${ag.name || "Ad Group"} (${ag.adGroupId})`,
                }))}
                value={selectedAdGroupId}
                onChange={(value) => {
                  setSelectedAdGroupId(value);
                  if (errors.adGroupId) {
                    setErrors((prev) => ({ ...prev, adGroupId: undefined }));
                  }
                }}
                placeholder={
                  adgroups.length === 0
                    ? "No ad groups available"
                    : "Select ad group"
                }
                emptyMessage="No ad groups available"
                buttonClassName="edit-button w-full"
              />
              {errors.adGroupId && (
                <p className="text-red-500 text-xs mt-1">{errors.adGroupId}</p>
              )}
            </div>

            {/* Creative Type */}
            <div className="flex-1">
              <label className="form-label-small">Creative Type *</label>
              <Dropdown
                options={CREATIVE_TYPE_OPTIONS}
                value={currentCreative.creativeType}
                onChange={(value) => {
                  handleChange("creativeType", value);
                }}
                buttonClassName="edit-button w-full"
              />
              {errors.creativeType && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.creativeType}
                </p>
              )}
            </div>
          </div>

          {/* Current Creative Form */}
          <div className="mb-6">
            <h3 className="text-[16px] font-semibold text-[#072929] mb-4">
              Creative Details
            </h3>

            {/* Property Type Selector - Tabs */}
            <div className="mb-4">
              <div className="flex bg-[#FEFEFB] border-b border-[#e8e8e3]">
                {/* Show IMAGE property tabs when creative type is IMAGE */}
                {currentCreative.creativeType === "IMAGE" &&
                  PROPERTY_TYPE_OPTIONS_IMAGE.map((option) => {
                    const isActive = activePropertyTab === option.value;
                    const isAdded = addedPropertyTypes.has(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setActivePropertyTab(option.value);
                          if (!isAdded) {
                            handleAddPropertyType(option.value);
                          }
                        }}
                        className={`px-4 py-2 text-[14px] transition-colors ${
                          isActive
                            ? "text-[#072929] bg-[#FEFEFB] border-b-2 border-[#136D6D]"
                            : "text-[#556179] hover:text-[#072929] hover:bg-[#f5f5f0]"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                {/* Show Video tab only when creative type is VIDEO */}
                {currentCreative.creativeType === "VIDEO" &&
                  PROPERTY_TYPE_OPTIONS_VIDEO.map((option) => {
                    const isActive = activePropertyTab === option.value;
                    const isAdded = addedPropertyTypes.has(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setActivePropertyTab(option.value);
                          if (!isAdded) {
                            handleAddPropertyType(option.value);
                          }
                        }}
                        className={`px-4 py-2 text-[14px] transition-colors ${
                          isActive
                            ? "text-[#072929] bg-[#FEFEFB] border-b-2 border-[#136D6D]"
                            : "text-[#556179] hover:text-[#072929] hover:bg-[#f5f5f0]"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
              </div>

              {/* Show form for active tab */}
              {activePropertyTab &&
                addedPropertyTypes.has(activePropertyTab) && (
                  <div className="mt-4">
                    {/* Forms will be shown based on activePropertyTab */}
                  </div>
                )}
            </div>

            {/* Property Forms - Show only active tab */}
            {activePropertyTab === "headline" &&
              addedPropertyTypes.has("headline") && (
                <div className="mb-4 p-4 border border-[#EBEBEB] rounded-lg ">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-[11.2px] font-semibold text-[#556179] uppercase">
                      Headline Creative Properties
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemovePropertyType("headline")}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Headline Field */}
                  <div className="mb-3">
                    <label className="block text-[11.2px] font-semibold text-[#556179] mb-1">
                      Headline{" "}
                      <span className="text-gray-400 font-normal">
                        (Optional, max 50 characters)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={
                        currentCreative.properties.headline?.headline || ""
                      }
                      onChange={(e) =>
                        handleChange("properties.headline", {
                          ...currentCreative.properties.headline,
                          headline: e.target.value,
                        })
                      }
                      maxLength={50}
                      className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px] bg-white"
                      placeholder="Enter marketing phrase (max 50 characters)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {currentCreative.properties.headline?.headline?.length ||
                        0}
                      /50 characters
                    </p>
                    {errors["properties.headline.headline"] && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors["properties.headline.headline"]}
                      </p>
                    )}
                  </div>

                  {/* Original Headline Field */}
                  <div className="mb-3">
                    <label className="block text-[11.2px] font-semibold text-[#556179] mb-1">
                      Original Headline{" "}
                      <span className="text-gray-400 font-normal">
                        (Optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={
                        currentCreative.properties.headline?.originalHeadline ||
                        ""
                      }
                      onChange={(e) =>
                        handleChange("properties.headline", {
                          ...currentCreative.properties.headline,
                          originalHeadline: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px] bg-white"
                      placeholder="Enter original headline (used when consentToTranslate is true)"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      The original headline before translation. If
                      consentToTranslate is true and translation succeeds,
                      headline will show the translated version and
                      originalHeadline will show this value.
                    </p>
                  </div>

                  {/* Has Terms and Conditions Checkbox */}
                  <div className="mb-2">
                    <div className="flex items-center">
                      <Checkbox
                        checked={
                          currentCreative.properties.headline
                            ?.hasTermsAndConditions || false
                        }
                        onChange={(checked) =>
                          handleChange("properties.headline", {
                            ...currentCreative.properties.headline,
                            hasTermsAndConditions: checked,
                          })
                        }
                        size="small"
                      />
                      <span className="text-[13.44px] text-[#222124] ml-2">
                        Has Terms and Conditions
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 ml-6">
                      Indicates the ad promotes a free product/service with
                      qualifying terms. Only supported for productAds with
                      landingPageType of OFF_AMAZON_LINK.
                    </p>
                  </div>
                </div>
              )}

            {activePropertyTab === "brandLogo" &&
              addedPropertyTypes.has("brandLogo") && (
                <div className="mb-4 p-4 border border-[#EBEBEB] rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-[11.2px] font-semibold text-[#556179] uppercase">
                      Brand Logo Creative Properties
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemovePropertyType("brandLogo")}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Asset ID and Version */}
                  <div className="mb-3">
                    <label className="block text-[11.2px] font-semibold text-[#556179] mb-1">
                      Logo Asset{" "}
                      <span className="text-gray-400 font-normal">
                        (Required)
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Dropdown<string>
                          options={assets
                            .filter((asset) => {
                              if (!asset.assetId) return false;
                              // Check new schema: assetType === 'IMAGE' or fileMetadata.contentType
                              const isImageByAssetType =
                                asset.assetType === "IMAGE";
                              const isImageByContentType = asset.contentType
                                ?.toLowerCase()
                                .startsWith("image/");
                              const isImageByFileMetadata =
                                asset.fileMetadata?.contentType
                                  ?.toLowerCase()
                                  .startsWith("image/");
                              // Fallback to old schema for backward compatibility
                              const isImageByMediaType =
                                asset.mediaType?.toLowerCase() === "image";
                              return (
                                isImageByAssetType ||
                                isImageByContentType ||
                                isImageByFileMetadata ||
                                isImageByMediaType
                              );
                            })
                            .map((asset) => ({
                              value: asset.assetId || "",
                              label:
                                asset.name || asset.fileName
                                  ? `${asset.name || asset.fileName} (${asset.assetId})`
                                  : asset.assetId || `Asset ${asset.id}`,
                            }))}
                          value={
                            currentCreative.properties.brandLogo?.assetId || ""
                          }
                          onChange={(value) => {
                            handleChange("properties.brandLogo", {
                              ...currentCreative.properties.brandLogo,
                              assetId: value || "",
                              assetVersion: value
                                ? "version_v1"
                                : currentCreative.properties.brandLogo
                                    ?.assetVersion || "",
                            });
                          }}
                          placeholder={
                            assetsLoading ? "Loading..." : "Select Asset ID"
                          }
                          buttonClassName="edit-button w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px] bg-white"
                          disabled={assetsLoading}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={
                            currentCreative.properties.brandLogo
                              ?.assetVersion || ""
                          }
                          onChange={(e) =>
                            handleChange("properties.brandLogo", {
                              ...currentCreative.properties.brandLogo,
                              assetVersion: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px] bg-white"
                          placeholder="Asset Version *"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Logo asset ID and version from Creative Asset Library
                    </p>
                    {errors["properties.brandLogo"] && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors["properties.brandLogo"]}
                      </p>
                    )}
                  </div>

                  {/* Cropping Coordinates */}
                  <div className="mb-2">
                    <label className="block text-[11.2px] font-semibold text-[#556179] mb-1">
                      Cropping Coordinates{" "}
                      <span className="text-gray-400 font-normal">
                        (Optional)
                      </span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">
                          Top
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={
                            currentCreative.properties.brandLogo
                              ?.croppingCoordinates?.top ?? ""
                          }
                          onChange={(e) => {
                            const value =
                              e.target.value === ""
                                ? undefined
                                : parseInt(e.target.value, 10);
                            const currentCrop =
                              currentCreative.properties.brandLogo
                                ?.croppingCoordinates || {};
                            const newCrop = { ...currentCrop };
                            if (value !== undefined && !isNaN(value)) {
                              newCrop.top = value;
                            } else {
                              delete newCrop.top;
                            }
                            handleChange("properties.brandLogo", {
                              ...currentCreative.properties.brandLogo,
                              croppingCoordinates:
                                Object.keys(newCrop).length > 0
                                  ? newCrop
                                  : undefined,
                            });
                          }}
                          className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px] bg-white"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">
                          Left
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={
                            currentCreative.properties.brandLogo
                              ?.croppingCoordinates?.left ?? ""
                          }
                          onChange={(e) => {
                            const value =
                              e.target.value === ""
                                ? undefined
                                : parseInt(e.target.value, 10);
                            const currentCrop =
                              currentCreative.properties.brandLogo
                                ?.croppingCoordinates || {};
                            const newCrop = { ...currentCrop };
                            if (value !== undefined && !isNaN(value)) {
                              newCrop.left = value;
                            } else {
                              delete newCrop.left;
                            }
                            handleChange("properties.brandLogo", {
                              ...currentCreative.properties.brandLogo,
                              croppingCoordinates:
                                Object.keys(newCrop).length > 0
                                  ? newCrop
                                  : undefined,
                            });
                          }}
                          className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px] bg-white"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">
                          Width
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={
                            currentCreative.properties.brandLogo
                              ?.croppingCoordinates?.width ?? ""
                          }
                          onChange={(e) => {
                            const value =
                              e.target.value === ""
                                ? undefined
                                : parseInt(e.target.value, 10);
                            const currentCrop =
                              currentCreative.properties.brandLogo
                                ?.croppingCoordinates || {};
                            const newCrop = { ...currentCrop };
                            if (value !== undefined && !isNaN(value)) {
                              newCrop.width = value;
                            } else {
                              delete newCrop.width;
                            }
                            handleChange("properties.brandLogo", {
                              ...currentCreative.properties.brandLogo,
                              croppingCoordinates:
                                Object.keys(newCrop).length > 0
                                  ? newCrop
                                  : undefined,
                            });
                          }}
                          className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px] bg-white"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">
                          Height
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={
                            currentCreative.properties.brandLogo
                              ?.croppingCoordinates?.height ?? ""
                          }
                          onChange={(e) => {
                            const value =
                              e.target.value === ""
                                ? undefined
                                : parseInt(e.target.value, 10);
                            const currentCrop =
                              currentCreative.properties.brandLogo
                                ?.croppingCoordinates || {};
                            const newCrop = { ...currentCrop };
                            if (value !== undefined && !isNaN(value)) {
                              newCrop.height = value;
                            } else {
                              delete newCrop.height;
                            }
                            handleChange("properties.brandLogo", {
                              ...currentCreative.properties.brandLogo,
                              croppingCoordinates:
                                Object.keys(newCrop).length > 0
                                  ? newCrop
                                  : undefined,
                            });
                          }}
                          className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px] bg-white"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Optional cropping coordinates. All values must be integers
                      &gt;= 0.
                    </p>
                    {errors["properties.brandLogo.croppingCoordinates.top"] && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors["properties.brandLogo.croppingCoordinates.top"]}
                      </p>
                    )}
                    {errors[
                      "properties.brandLogo.croppingCoordinates.left"
                    ] && (
                      <p className="text-red-500 text-xs mt-1">
                        {
                          errors[
                            "properties.brandLogo.croppingCoordinates.left"
                          ]
                        }
                      </p>
                    )}
                    {errors[
                      "properties.brandLogo.croppingCoordinates.width"
                    ] && (
                      <p className="text-red-500 text-xs mt-1">
                        {
                          errors[
                            "properties.brandLogo.croppingCoordinates.width"
                          ]
                        }
                      </p>
                    )}
                    {errors[
                      "properties.brandLogo.croppingCoordinates.height"
                    ] && (
                      <p className="text-red-500 text-xs mt-1">
                        {
                          errors[
                            "properties.brandLogo.croppingCoordinates.height"
                          ]
                        }
                      </p>
                    )}
                  </div>
                </div>
              )}

            {activePropertyTab === "customImage" &&
              addedPropertyTypes.has("customImage") && (
                <div className="mb-4 p-4 border border-[#EBEBEB] rounded-lg ">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-[11.2px] font-semibold text-[#556179] uppercase">
                      Custom Image Creative Properties
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemovePropertyType("customImage")}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Rect Custom Image */}
                    <div>
                      <label className="block text-[11.2px] font-semibold text-[#556179] mb-2">
                        Rectangular Custom Image{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <Dropdown<string>
                          options={assets
                            .filter((asset) => {
                              if (!asset.assetId) return false;
                              // Check new schema: assetType === 'IMAGE' or fileMetadata.contentType
                              const isImageByAssetType =
                                asset.assetType === "IMAGE";
                              const isImageByContentType = asset.contentType
                                ?.toLowerCase()
                                .startsWith("image/");
                              const isImageByFileMetadata =
                                asset.fileMetadata?.contentType
                                  ?.toLowerCase()
                                  .startsWith("image/");
                              // Fallback to old schema for backward compatibility
                              const isImageByMediaType =
                                asset.mediaType?.toLowerCase() === "image";
                              return (
                                isImageByAssetType ||
                                isImageByContentType ||
                                isImageByFileMetadata ||
                                isImageByMediaType
                              );
                            })
                            .map((asset) => ({
                              value: asset.assetId || "",
                              label:
                                asset.name || asset.fileName
                                  ? `${asset.name || asset.fileName} (${asset.assetId})`
                                  : asset.assetId || `Asset ${asset.id}`,
                            }))}
                          value={
                            currentCreative.properties.customImage
                              ?.rectCustomImage?.assetId || ""
                          }
                          onChange={(value) => {
                            setCurrentCreative((prev) => ({
                              ...prev,
                              properties: {
                                ...prev.properties,
                                customImage: {
                                  ...prev.properties.customImage,
                                  rectCustomImage: {
                                    ...prev.properties.customImage
                                      ?.rectCustomImage,
                                    assetId: value || "",
                                    assetVersion: value
                                      ? "version_v1"
                                      : prev.properties.customImage
                                          ?.rectCustomImage?.assetVersion || "",
                                  },
                                },
                              },
                            }));
                          }}
                          placeholder={
                            assetsLoading ? "Loading..." : "Select Asset ID"
                          }
                          buttonClassName="edit-button w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px] bg-white"
                          disabled={assetsLoading}
                        />
                        <input
                          type="text"
                          value={
                            currentCreative.properties.customImage
                              ?.rectCustomImage?.assetVersion || ""
                          }
                          onChange={(e) => {
                            setCurrentCreative((prev) => ({
                              ...prev,
                              properties: {
                                ...prev.properties,
                                customImage: {
                                  ...prev.properties.customImage,
                                  rectCustomImage: {
                                    ...prev.properties.customImage
                                      ?.rectCustomImage,
                                    assetVersion: e.target.value,
                                  },
                                },
                              },
                            }));
                          }}
                          className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px] bg-white"
                          placeholder="Asset Version *"
                        />
                      </div>
                      {/* Cropping Coordinates for Rect */}
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">
                            Top
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                              currentCreative.properties.customImage
                                ?.rectCustomImage?.croppingCoordinates?.top ??
                              ""
                            }
                            onChange={(e) => {
                              const value =
                                e.target.value === ""
                                  ? undefined
                                  : parseInt(e.target.value, 10);
                              const currentCrop =
                                currentCreative.properties.customImage
                                  ?.rectCustomImage?.croppingCoordinates || {};
                              const newCrop = { ...currentCrop };
                              if (value !== undefined && !isNaN(value)) {
                                newCrop.top = value;
                              } else {
                                delete newCrop.top;
                              }
                              handleChange("properties.customImage", {
                                ...currentCreative.properties.customImage,
                                rectCustomImage: {
                                  ...currentCreative.properties.customImage
                                    ?.rectCustomImage,
                                  croppingCoordinates:
                                    Object.keys(newCrop).length > 0
                                      ? newCrop
                                      : undefined,
                                },
                              });
                            }}
                            className="w-full px-2 py-1 border border-[#EBEBEB] rounded text-[12px] bg-white"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">
                            Left
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                              currentCreative.properties.customImage
                                ?.rectCustomImage?.croppingCoordinates?.left ??
                              ""
                            }
                            onChange={(e) => {
                              const value =
                                e.target.value === ""
                                  ? undefined
                                  : parseInt(e.target.value, 10);
                              const currentCrop =
                                currentCreative.properties.customImage
                                  ?.rectCustomImage?.croppingCoordinates || {};
                              const newCrop = { ...currentCrop };
                              if (value !== undefined && !isNaN(value)) {
                                newCrop.left = value;
                              } else {
                                delete newCrop.left;
                              }
                              handleChange("properties.customImage", {
                                ...currentCreative.properties.customImage,
                                rectCustomImage: {
                                  ...currentCreative.properties.customImage
                                    ?.rectCustomImage,
                                  croppingCoordinates:
                                    Object.keys(newCrop).length > 0
                                      ? newCrop
                                      : undefined,
                                },
                              });
                            }}
                            className="w-full px-2 py-1 border border-[#EBEBEB] rounded text-[12px] bg-white"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">
                            Width
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                              currentCreative.properties.customImage
                                ?.rectCustomImage?.croppingCoordinates?.width ??
                              ""
                            }
                            onChange={(e) => {
                              const value =
                                e.target.value === ""
                                  ? undefined
                                  : parseInt(e.target.value, 10);
                              const currentCrop =
                                currentCreative.properties.customImage
                                  ?.rectCustomImage?.croppingCoordinates || {};
                              const newCrop = { ...currentCrop };
                              if (value !== undefined && !isNaN(value)) {
                                newCrop.width = value;
                              } else {
                                delete newCrop.width;
                              }
                              handleChange("properties.customImage", {
                                ...currentCreative.properties.customImage,
                                rectCustomImage: {
                                  ...currentCreative.properties.customImage
                                    ?.rectCustomImage,
                                  croppingCoordinates:
                                    Object.keys(newCrop).length > 0
                                      ? newCrop
                                      : undefined,
                                },
                              });
                            }}
                            className="w-full px-2 py-1 border border-[#EBEBEB] rounded text-[12px] bg-white"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">
                            Height
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                              currentCreative.properties.customImage
                                ?.rectCustomImage?.croppingCoordinates
                                ?.height ?? ""
                            }
                            onChange={(e) => {
                              const value =
                                e.target.value === ""
                                  ? undefined
                                  : parseInt(e.target.value, 10);
                              const currentCrop =
                                currentCreative.properties.customImage
                                  ?.rectCustomImage?.croppingCoordinates || {};
                              const newCrop = { ...currentCrop };
                              if (value !== undefined && !isNaN(value)) {
                                newCrop.height = value;
                              } else {
                                delete newCrop.height;
                              }
                              handleChange("properties.customImage", {
                                ...currentCreative.properties.customImage,
                                rectCustomImage: {
                                  ...currentCreative.properties.customImage
                                    ?.rectCustomImage,
                                  croppingCoordinates:
                                    Object.keys(newCrop).length > 0
                                      ? newCrop
                                      : undefined,
                                },
                              });
                            }}
                            className="w-full px-2 py-1 border border-[#EBEBEB] rounded text-[12px] bg-white"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      {errors["properties.customImage.rectCustomImage"] && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors["properties.customImage.rectCustomImage"]}
                        </p>
                      )}
                    </div>

                    {/* Square Custom Image */}
                    <div>
                      <label className="block text-[11.2px] font-semibold text-[#556179] mb-2">
                        Square Custom Image{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <Dropdown<string>
                          options={assets
                            .filter((asset) => {
                              if (!asset.assetId) return false;
                              // Check new schema: assetType === 'IMAGE' or fileMetadata.contentType
                              const isImageByAssetType =
                                asset.assetType === "IMAGE";
                              const isImageByContentType = asset.contentType
                                ?.toLowerCase()
                                .startsWith("image/");
                              const isImageByFileMetadata =
                                asset.fileMetadata?.contentType
                                  ?.toLowerCase()
                                  .startsWith("image/");
                              // Fallback to old schema for backward compatibility
                              const isImageByMediaType =
                                asset.mediaType?.toLowerCase() === "image";
                              return (
                                isImageByAssetType ||
                                isImageByContentType ||
                                isImageByFileMetadata ||
                                isImageByMediaType
                              );
                            })
                            .map((asset) => ({
                              value: asset.assetId || "",
                              label:
                                asset.name || asset.fileName
                                  ? `${asset.name || asset.fileName} (${asset.assetId})`
                                  : asset.assetId || `Asset ${asset.id}`,
                            }))}
                          value={
                            currentCreative.properties.customImage
                              ?.squareCustomImage?.assetId || ""
                          }
                          onChange={(value) => {
                            setCurrentCreative((prev) => ({
                              ...prev,
                              properties: {
                                ...prev.properties,
                                customImage: {
                                  ...prev.properties.customImage,
                                  squareCustomImage: {
                                    ...prev.properties.customImage
                                      ?.squareCustomImage,
                                    assetId: value || "",
                                    assetVersion: value
                                      ? "version_v1"
                                      : prev.properties.customImage
                                          ?.squareCustomImage?.assetVersion ||
                                        "",
                                  },
                                },
                              },
                            }));
                          }}
                          placeholder={
                            assetsLoading ? "Loading..." : "Select Asset ID"
                          }
                          buttonClassName="edit-button w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px] bg-white"
                          disabled={assetsLoading}
                        />
                        <input
                          type="text"
                          value={
                            currentCreative.properties.customImage
                              ?.squareCustomImage?.assetVersion || ""
                          }
                          onChange={(e) => {
                            setCurrentCreative((prev) => ({
                              ...prev,
                              properties: {
                                ...prev.properties,
                                customImage: {
                                  ...prev.properties.customImage,
                                  squareCustomImage: {
                                    ...prev.properties.customImage
                                      ?.squareCustomImage,
                                    assetVersion: e.target.value,
                                  },
                                },
                              },
                            }));
                          }}
                          className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px] bg-white"
                          placeholder="Asset Version *"
                        />
                      </div>
                      {/* Cropping Coordinates for Square */}
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">
                            Top
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                              currentCreative.properties.customImage
                                ?.squareCustomImage?.croppingCoordinates?.top ??
                              ""
                            }
                            onChange={(e) => {
                              const value =
                                e.target.value === ""
                                  ? undefined
                                  : parseInt(e.target.value, 10);
                              const currentCrop =
                                currentCreative.properties.customImage
                                  ?.squareCustomImage?.croppingCoordinates ||
                                {};
                              const newCrop = { ...currentCrop };
                              if (value !== undefined && !isNaN(value)) {
                                newCrop.top = value;
                              } else {
                                delete newCrop.top;
                              }
                              handleChange("properties.customImage", {
                                ...currentCreative.properties.customImage,
                                squareCustomImage: {
                                  ...currentCreative.properties.customImage
                                    ?.squareCustomImage,
                                  croppingCoordinates:
                                    Object.keys(newCrop).length > 0
                                      ? newCrop
                                      : undefined,
                                },
                              });
                            }}
                            className="w-full px-2 py-1 border border-[#EBEBEB] rounded text-[12px] bg-white"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">
                            Left
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                              currentCreative.properties.customImage
                                ?.squareCustomImage?.croppingCoordinates
                                ?.left ?? ""
                            }
                            onChange={(e) => {
                              const value =
                                e.target.value === ""
                                  ? undefined
                                  : parseInt(e.target.value, 10);
                              const currentCrop =
                                currentCreative.properties.customImage
                                  ?.squareCustomImage?.croppingCoordinates ||
                                {};
                              const newCrop = { ...currentCrop };
                              if (value !== undefined && !isNaN(value)) {
                                newCrop.left = value;
                              } else {
                                delete newCrop.left;
                              }
                              handleChange("properties.customImage", {
                                ...currentCreative.properties.customImage,
                                squareCustomImage: {
                                  ...currentCreative.properties.customImage
                                    ?.squareCustomImage,
                                  croppingCoordinates:
                                    Object.keys(newCrop).length > 0
                                      ? newCrop
                                      : undefined,
                                },
                              });
                            }}
                            className="w-full px-2 py-1 border border-[#EBEBEB] rounded text-[12px] bg-white"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">
                            Width
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                              currentCreative.properties.customImage
                                ?.squareCustomImage?.croppingCoordinates
                                ?.width ?? ""
                            }
                            onChange={(e) => {
                              const value =
                                e.target.value === ""
                                  ? undefined
                                  : parseInt(e.target.value, 10);
                              const currentCrop =
                                currentCreative.properties.customImage
                                  ?.squareCustomImage?.croppingCoordinates ||
                                {};
                              const newCrop = { ...currentCrop };
                              if (value !== undefined && !isNaN(value)) {
                                newCrop.width = value;
                              } else {
                                delete newCrop.width;
                              }
                              handleChange("properties.customImage", {
                                ...currentCreative.properties.customImage,
                                squareCustomImage: {
                                  ...currentCreative.properties.customImage
                                    ?.squareCustomImage,
                                  croppingCoordinates:
                                    Object.keys(newCrop).length > 0
                                      ? newCrop
                                      : undefined,
                                },
                              });
                            }}
                            className="w-full px-2 py-1 border border-[#EBEBEB] rounded text-[12px] bg-white"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">
                            Height
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                              currentCreative.properties.customImage
                                ?.squareCustomImage?.croppingCoordinates
                                ?.height ?? ""
                            }
                            onChange={(e) => {
                              const value =
                                e.target.value === ""
                                  ? undefined
                                  : parseInt(e.target.value, 10);
                              const currentCrop =
                                currentCreative.properties.customImage
                                  ?.squareCustomImage?.croppingCoordinates ||
                                {};
                              const newCrop = { ...currentCrop };
                              if (value !== undefined && !isNaN(value)) {
                                newCrop.height = value;
                              } else {
                                delete newCrop.height;
                              }
                              handleChange("properties.customImage", {
                                ...currentCreative.properties.customImage,
                                squareCustomImage: {
                                  ...currentCreative.properties.customImage
                                    ?.squareCustomImage,
                                  croppingCoordinates:
                                    Object.keys(newCrop).length > 0
                                      ? newCrop
                                      : undefined,
                                },
                              });
                            }}
                            className="w-full px-2 py-1 border border-[#EBEBEB] rounded text-[12px] bg-white"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      {errors["properties.customImage.squareCustomImage"] && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors["properties.customImage.squareCustomImage"]}
                        </p>
                      )}
                    </div>
                    {errors["properties.customImage"] && (
                      <p className="text-red-500 text-xs mt-1 mb-2">
                        {errors["properties.customImage"]}
                      </p>
                    )}

                    {/* Helper function to render image array */}
                    {(() => {
                      const renderImageArray = (
                        arrayKey:
                          | "squareImages"
                          | "horizontalImages"
                          | "verticalImages",
                        label: string,
                        description: string,
                      ) => {
                        const images =
                          currentCreative.properties.customImage?.[arrayKey] ||
                          [];
                        return (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-[11.2px] font-semibold text-[#556179]">
                                {label}{" "}
                                <span className="text-gray-400 font-normal">
                                  (Optional)
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newImages = [
                                    ...images,
                                    { assetId: "", assetVersion: "" },
                                  ];
                                  handleChange("properties.customImage", {
                                    ...currentCreative.properties.customImage,
                                    [arrayKey]: newImages,
                                  });
                                }}
                                className="text-[#136D6D] hover:text-[#0f5555] text-[12px] font-medium"
                              >
                                + Add {label.slice(0, -1)}
                              </button>
                            </div>
                            <p className="text-xs text-gray-400 mb-2">
                              {description}
                            </p>
                            {images.map((img, idx) => (
                              <div
                                key={idx}
                                className="mb-3 p-3 border border-[#EBEBEB] rounded-lg bg-white"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[12px] font-medium text-[#222124]">
                                    {label.slice(0, -1)} #{idx + 1}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newImages = images.filter(
                                        (_, i) => i !== idx,
                                      );
                                      handleChange("properties.customImage", {
                                        ...currentCreative.properties
                                          .customImage,
                                        [arrayKey]:
                                          newImages.length > 0
                                            ? newImages
                                            : undefined,
                                      });
                                    }}
                                    className="text-red-500 hover:text-red-700 text-sm"
                                  >
                                    Remove
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  <input
                                    type="text"
                                    value={img.assetId || ""}
                                    onChange={(e) => {
                                      const newImages = [...images];
                                      newImages[idx] = {
                                        ...img,
                                        assetId: e.target.value,
                                      };
                                      handleChange("properties.customImage", {
                                        ...currentCreative.properties
                                          .customImage,
                                        [arrayKey]: newImages,
                                      });
                                    }}
                                    className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px]"
                                    placeholder="Asset ID *"
                                  />
                                  <input
                                    type="text"
                                    value={img.assetVersion || ""}
                                    onChange={(e) => {
                                      const newImages = [...images];
                                      newImages[idx] = {
                                        ...img,
                                        assetVersion: e.target.value,
                                      };
                                      handleChange("properties.customImage", {
                                        ...currentCreative.properties
                                          .customImage,
                                        [arrayKey]: newImages,
                                      });
                                    }}
                                    className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px]"
                                    placeholder="Asset Version *"
                                  />
                                </div>
                                {/* Cropping Coordinates */}
                                <div className="grid grid-cols-4 gap-2">
                                  <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">
                                      Top
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={img.croppingCoordinates?.top ?? ""}
                                      onChange={(e) => {
                                        const value =
                                          e.target.value === ""
                                            ? undefined
                                            : parseInt(e.target.value, 10);
                                        const currentCrop =
                                          img.croppingCoordinates || {};
                                        const newCrop = { ...currentCrop };
                                        if (
                                          value !== undefined &&
                                          !isNaN(value)
                                        ) {
                                          newCrop.top = value;
                                        } else {
                                          delete newCrop.top;
                                        }
                                        const newImages = [...images];
                                        newImages[idx] = {
                                          ...img,
                                          croppingCoordinates:
                                            Object.keys(newCrop).length > 0
                                              ? newCrop
                                              : undefined,
                                        };
                                        handleChange("properties.customImage", {
                                          ...currentCreative.properties
                                            .customImage,
                                          [arrayKey]: newImages,
                                        });
                                      }}
                                      className="w-full px-2 py-1 border border-[#EBEBEB] rounded text-[12px]"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">
                                      Left
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={
                                        img.croppingCoordinates?.left ?? ""
                                      }
                                      onChange={(e) => {
                                        const value =
                                          e.target.value === ""
                                            ? undefined
                                            : parseInt(e.target.value, 10);
                                        const currentCrop =
                                          img.croppingCoordinates || {};
                                        const newCrop = { ...currentCrop };
                                        if (
                                          value !== undefined &&
                                          !isNaN(value)
                                        ) {
                                          newCrop.left = value;
                                        } else {
                                          delete newCrop.left;
                                        }
                                        const newImages = [...images];
                                        newImages[idx] = {
                                          ...img,
                                          croppingCoordinates:
                                            Object.keys(newCrop).length > 0
                                              ? newCrop
                                              : undefined,
                                        };
                                        handleChange("properties.customImage", {
                                          ...currentCreative.properties
                                            .customImage,
                                          [arrayKey]: newImages,
                                        });
                                      }}
                                      className="w-full px-2 py-1 border border-[#EBEBEB] rounded text-[12px]"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">
                                      Width
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={
                                        img.croppingCoordinates?.width ?? ""
                                      }
                                      onChange={(e) => {
                                        const value =
                                          e.target.value === ""
                                            ? undefined
                                            : parseInt(e.target.value, 10);
                                        const currentCrop =
                                          img.croppingCoordinates || {};
                                        const newCrop = { ...currentCrop };
                                        if (
                                          value !== undefined &&
                                          !isNaN(value)
                                        ) {
                                          newCrop.width = value;
                                        } else {
                                          delete newCrop.width;
                                        }
                                        const newImages = [...images];
                                        newImages[idx] = {
                                          ...img,
                                          croppingCoordinates:
                                            Object.keys(newCrop).length > 0
                                              ? newCrop
                                              : undefined,
                                        };
                                        handleChange("properties.customImage", {
                                          ...currentCreative.properties
                                            .customImage,
                                          [arrayKey]: newImages,
                                        });
                                      }}
                                      className="w-full px-2 py-1 border border-[#EBEBEB] rounded text-[12px]"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">
                                      Height
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={
                                        img.croppingCoordinates?.height ?? ""
                                      }
                                      onChange={(e) => {
                                        const value =
                                          e.target.value === ""
                                            ? undefined
                                            : parseInt(e.target.value, 10);
                                        const currentCrop =
                                          img.croppingCoordinates || {};
                                        const newCrop = { ...currentCrop };
                                        if (
                                          value !== undefined &&
                                          !isNaN(value)
                                        ) {
                                          newCrop.height = value;
                                        } else {
                                          delete newCrop.height;
                                        }
                                        const newImages = [...images];
                                        newImages[idx] = {
                                          ...img,
                                          croppingCoordinates:
                                            Object.keys(newCrop).length > 0
                                              ? newCrop
                                              : undefined,
                                        };
                                        handleChange("properties.customImage", {
                                          ...currentCreative.properties
                                            .customImage,
                                          [arrayKey]: newImages,
                                        });
                                      }}
                                      className="w-full px-2 py-1 border border-[#EBEBEB] rounded text-[12px]"
                                      placeholder="0"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      };

                      return (
                        <>
                          {renderImageArray(
                            "squareImages",
                            "Square Images",
                            "Multiple square images (1:1 ratio)",
                          )}
                          {renderImageArray(
                            "horizontalImages",
                            "Horizontal Images",
                            "Multiple horizontal images (1.91:1 ratio)",
                          )}
                          {renderImageArray(
                            "verticalImages",
                            "Vertical Images",
                            "Multiple vertical images (9:16 ratio)",
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

            {activePropertyTab === "background" &&
              addedPropertyTypes.has("background") && (
                <div className="mb-4 p-4 border border-[#EBEBEB] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[11.2px] font-semibold text-[#556179] uppercase">
                      Background Colors
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemovePropertyType("background")}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(
                      currentCreative.properties.background?.backgrounds || []
                    ).map((bg, idx) => {
                      const errorKey = `properties.background.backgrounds[${idx}].color`;
                      const hasError = !!errors[errorKey];
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={bg.color || "#000000"}
                              onChange={(e) => {
                                setCurrentCreative((prev) => {
                                  const currentBackgrounds =
                                    prev.properties.background?.backgrounds ||
                                    [];
                                  const newBackgrounds = [
                                    ...currentBackgrounds,
                                  ];
                                  newBackgrounds[idx] = {
                                    color: e.target.value,
                                  };
                                  return {
                                    ...prev,
                                    properties: {
                                      ...prev.properties,
                                      background: {
                                        backgrounds: newBackgrounds,
                                      },
                                    },
                                  };
                                });
                                // Clear error when user types
                                if (errors[errorKey]) {
                                  setErrors((prev) => {
                                    const newErrors = { ...prev };
                                    delete newErrors[errorKey];
                                    return newErrors;
                                  });
                                }
                              }}
                              className="w-12 h-10 border border-[#EBEBEB] rounded bg-white"
                            />
                            <input
                              type="text"
                              value={bg.color || ""}
                              onChange={(e) => {
                                setCurrentCreative((prev) => {
                                  const currentBackgrounds =
                                    prev.properties.background?.backgrounds ||
                                    [];
                                  const newBackgrounds = [
                                    ...currentBackgrounds,
                                  ];
                                  newBackgrounds[idx] = {
                                    color: e.target.value,
                                  };
                                  return {
                                    ...prev,
                                    properties: {
                                      ...prev.properties,
                                      background: {
                                        backgrounds: newBackgrounds,
                                      },
                                    },
                                  };
                                });
                                // Clear error when user types
                                if (errors[errorKey]) {
                                  setErrors((prev) => {
                                    const newErrors = { ...prev };
                                    delete newErrors[errorKey];
                                    return newErrors;
                                  });
                                }
                              }}
                              className={`flex-1 px-3 py-2 border rounded-lg text-[13.44px] bg-white ${
                                hasError ? "border-red-500" : "border-[#EBEBEB]"
                              }`}
                              placeholder="#RRGGBB"
                              pattern="^#[0-9A-Fa-f]{6}$"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentCreative((prev) => {
                                  const currentBackgrounds =
                                    prev.properties.background?.backgrounds ||
                                    [];
                                  const newBackgrounds =
                                    currentBackgrounds.filter(
                                      (_, i) => i !== idx,
                                    );
                                  return {
                                    ...prev,
                                    properties: {
                                      ...prev.properties,
                                      background: {
                                        backgrounds: newBackgrounds,
                                      },
                                    },
                                  };
                                });
                                // Clear error when removing
                                if (errors[errorKey]) {
                                  setErrors((prev) => {
                                    const newErrors = { ...prev };
                                    delete newErrors[errorKey];
                                    return newErrors;
                                  });
                                }
                              }}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                          {hasError && (
                            <p className="text-red-500 text-xs ml-14">
                              {errors[errorKey]}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentCreative((prev) => {
                          const currentBackgrounds =
                            prev.properties.background?.backgrounds || [];
                          const newBackgrounds = [
                            ...currentBackgrounds,
                            { color: "#000000" },
                          ];
                          return {
                            ...prev,
                            properties: {
                              ...prev.properties,
                              background: {
                                backgrounds: newBackgrounds,
                              },
                            },
                          };
                        });
                      }}
                      className="text-[#136D6D] hover:text-[#0f5555] text-[13.44px]"
                    >
                      + Add Background Color
                    </button>
                  </div>
                  {errors["properties.background"] && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors["properties.background"]}
                    </p>
                  )}
                </div>
              )}

            {activePropertyTab === "video" &&
              addedPropertyTypes.has("video") && (
                <div className="mb-4 p-4 border border-[#EBEBEB] rounded-lg ">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-[11.2px] font-semibold text-[#556179] uppercase">
                      Video Creative Properties
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemovePropertyType("video")}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Main Video (single object - mandatory, cannot be removed) */}
                    <div>
                      <label className="block text-[11.2px] font-semibold text-[#556179] mb-2">
                        Main Video <span className="text-red-500">*</span>
                      </label>
                      <p className="text-xs text-gray-400 mb-2">
                        Primary video asset (required - main video object is
                        mandatory)
                      </p>
                      <div className="space-y-3 p-3 border border-[#EBEBEB] rounded-lg bg-white">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-1">
                              Asset ID *
                            </label>
                            <Dropdown<string>
                              options={assets
                                .filter((asset) => {
                                  if (!asset.assetId) return false;
                                  // Check both mediaType and contentType for video assets
                                  const isVideoByMediaType =
                                    asset.mediaType?.toLowerCase() === "video";
                                  const isVideoByContentType = asset.contentType
                                    ?.toLowerCase()
                                    .startsWith("video/");
                                  const isVideoByFileMetadata =
                                    asset.fileMetadata?.contentType
                                      ?.toLowerCase()
                                      .startsWith("video/");
                                  const isVideoByAssetType =
                                    asset.assetType === "VIDEO";
                                  return (
                                    isVideoByMediaType ||
                                    isVideoByContentType ||
                                    isVideoByFileMetadata ||
                                    isVideoByAssetType
                                  );
                                })
                                .map((asset) => ({
                                  value: asset.assetId || "",
                                  label:
                                    asset.name || asset.fileName
                                      ? `${asset.name || asset.fileName} (${asset.assetId})`
                                      : asset.assetId || `Asset ${asset.id}`,
                                }))}
                              value={
                                currentCreative.properties.video?.video
                                  ?.assetId || ""
                              }
                              onChange={(value) => {
                                handleChange("properties.video", {
                                  ...currentCreative.properties.video,
                                  video: {
                                    ...(currentCreative.properties.video
                                      ?.video || {}),
                                    assetId: value || "",
                                    assetVersion: value
                                      ? "version_v1"
                                      : currentCreative.properties.video?.video
                                          ?.assetVersion || "",
                                  },
                                });
                              }}
                              placeholder={
                                assetsLoading ? "Loading..." : "Select Asset ID"
                              }
                              buttonClassName="edit-button w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px] bg-white"
                              disabled={assetsLoading}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-1">
                              Asset Version *
                            </label>
                            <input
                              type="text"
                              value={
                                currentCreative.properties.video?.video
                                  ?.assetVersion || ""
                              }
                              onChange={(e) =>
                                handleChange("properties.video", {
                                  ...currentCreative.properties.video,
                                  video: {
                                    ...(currentCreative.properties.video
                                      ?.video || {}),
                                    assetVersion: e.target.value,
                                  },
                                })
                              }
                              className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px]"
                              placeholder="Asset Version *"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-1">
                              Original Asset ID{" "}
                              <span className="text-gray-400">(Optional)</span>
                            </label>
                            <input
                              type="text"
                              value={
                                currentCreative.properties.video?.video
                                  ?.originalAssetId || ""
                              }
                              onChange={(e) =>
                                handleChange("properties.video", {
                                  ...currentCreative.properties.video,
                                  video: {
                                    ...(currentCreative.properties.video
                                      ?.video || {}),
                                    originalAssetId:
                                      e.target.value || undefined,
                                  },
                                })
                              }
                              className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px]"
                              placeholder="Original Asset ID"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              Original asset ID before translation
                            </p>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-1">
                              Original Asset Version{" "}
                              <span className="text-gray-400">(Optional)</span>
                            </label>
                            <input
                              type="text"
                              value={
                                currentCreative.properties.video?.video
                                  ?.originalAssetVersion || ""
                              }
                              onChange={(e) =>
                                handleChange("properties.video", {
                                  ...currentCreative.properties.video,
                                  video: {
                                    ...(currentCreative.properties.video
                                      ?.video || {}),
                                    originalAssetVersion:
                                      e.target.value || undefined,
                                  },
                                })
                              }
                              className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px]"
                              placeholder="Original Asset Version"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              Original asset version before translation
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Helper function to render video array */}
                    {(() => {
                      const renderVideoArray = (
                        arrayKey:
                          | "squareVideos"
                          | "horizontalVideos"
                          | "verticalVideos",
                        label: string,
                        description: string,
                      ) => {
                        const videos =
                          currentCreative.properties.video?.[arrayKey] || [];
                        return (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-[11.2px] font-semibold text-[#556179]">
                                {label}{" "}
                                <span className="text-gray-400 font-normal">
                                  (Optional)
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newVideos = [
                                    ...videos,
                                    { assetId: "", assetVersion: "" },
                                  ];
                                  handleChange("properties.video", {
                                    ...currentCreative.properties.video,
                                    [arrayKey]: newVideos,
                                  });
                                }}
                                className="text-[#136D6D] hover:text-[#0f5555] text-[12px] font-medium"
                              >
                                + Add {label.slice(0, -1)}
                              </button>
                            </div>
                            {description && (
                              <p className="text-xs text-gray-400 mb-2">
                                {description}
                              </p>
                            )}
                            {videos.map((vid, idx) => (
                              <div
                                key={idx}
                                className="mb-3 p-3 border border-[#EBEBEB] rounded-lg bg-white"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[12px] font-medium text-[#222124]">
                                    {label.slice(0, -1)} #{idx + 1}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newVideos = videos.filter(
                                        (_, i) => i !== idx,
                                      );
                                      handleChange("properties.video", {
                                        ...currentCreative.properties.video,
                                        [arrayKey]:
                                          newVideos.length > 0
                                            ? newVideos
                                            : undefined,
                                      });
                                    }}
                                    className="text-red-500 hover:text-red-700 text-sm"
                                  >
                                    Remove
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">
                                      Asset ID *
                                    </label>
                                    <input
                                      type="text"
                                      value={vid.assetId || ""}
                                      onChange={(e) => {
                                        const newVideos = [...videos];
                                        newVideos[idx] = {
                                          ...vid,
                                          assetId: e.target.value,
                                        };
                                        handleChange("properties.video", {
                                          ...currentCreative.properties.video,
                                          [arrayKey]: newVideos,
                                        });
                                      }}
                                      className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px]"
                                      placeholder="Asset ID *"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">
                                      Asset Version *
                                    </label>
                                    <input
                                      type="text"
                                      value={vid.assetVersion || ""}
                                      onChange={(e) => {
                                        const newVideos = [...videos];
                                        newVideos[idx] = {
                                          ...vid,
                                          assetVersion: e.target.value,
                                        };
                                        handleChange("properties.video", {
                                          ...currentCreative.properties.video,
                                          [arrayKey]: newVideos,
                                        });
                                      }}
                                      className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px]"
                                      placeholder="Asset Version *"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">
                                      Original Asset ID{" "}
                                      <span className="text-gray-400">
                                        (Optional)
                                      </span>
                                    </label>
                                    <input
                                      type="text"
                                      value={vid.originalAssetId || ""}
                                      onChange={(e) => {
                                        const newVideos = [...videos];
                                        newVideos[idx] = {
                                          ...vid,
                                          originalAssetId:
                                            e.target.value || undefined,
                                        };
                                        handleChange("properties.video", {
                                          ...currentCreative.properties.video,
                                          [arrayKey]: newVideos,
                                        });
                                      }}
                                      className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px]"
                                      placeholder="Original Asset ID"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">
                                      Original Asset Version{" "}
                                      <span className="text-gray-400">
                                        (Optional)
                                      </span>
                                    </label>
                                    <input
                                      type="text"
                                      value={vid.originalAssetVersion || ""}
                                      onChange={(e) => {
                                        const newVideos = [...videos];
                                        newVideos[idx] = {
                                          ...vid,
                                          originalAssetVersion:
                                            e.target.value || undefined,
                                        };
                                        handleChange("properties.video", {
                                          ...currentCreative.properties.video,
                                          [arrayKey]: newVideos,
                                        });
                                      }}
                                      className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px]"
                                      placeholder="Original Asset Version"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      };

                      return (
                        <>
                          {renderVideoArray(
                            "squareVideos",
                            "Square Videos",
                            "Multiple square video variants (1:1 ratio)",
                          )}
                          {renderVideoArray(
                            "horizontalVideos",
                            "Horizontal Videos",
                            "Multiple horizontal video variants (1.91:1 ratio)",
                          )}
                          {renderVideoArray(
                            "verticalVideos",
                            "Vertical Videos",
                            "Multiple vertical video variants (9:16 ratio)",
                          )}
                        </>
                      );
                    })()}
                  </div>
                  {errors["properties.video"] && (
                    <p className="text-red-500 text-xs mt-2">
                      {errors["properties.video"]}
                    </p>
                  )}
                  {errors["properties.video.video"] && (
                    <p className="text-red-500 text-xs mt-2">
                      {errors["properties.video.video"]}
                    </p>
                  )}
                </div>
              )}

            {/* Consent to Translate */}
            <div className="mb-4">
              <div className="flex items-center">
                <Checkbox
                  checked={currentCreative.consentToTranslate || false}
                  onChange={(checked) =>
                    handleChange("consentToTranslate", checked)
                  }
                  size="small"
                />
                <span className="text-[13.44px] text-[#222124] ml-2">
                  Consent to Translate
                </span>
              </div>
            </div>

            {errors.properties && (
              <p className="text-red-500 text-xs mb-4">{errors.properties}</p>
            )}

            {errors.submit && (
              <p className="text-red-500 text-xs mb-4">{errors.submit}</p>
            )}

            {!editCreative && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={addedCreatives.length > 0}
                  className="max-w-[300px] py-2 px-4 bg-[#136D6D] text-white rounded-lg hover:bg-[#0f5555] disabled:opacity-50 disabled:cursor-not-allowed text-[13.44px] font-medium"
                >
                  Add Creative
                </button>
              </div>
            )}
          </div>

          {/* Added Creatives List - Only show in create mode */}
          {!editCreative && addedCreatives.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[16px] font-semibold text-[#072929] mb-4">
                Added Creatives ({addedCreatives.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {addedCreatives.map((creative, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3  rounded-lg border border-[#EBEBEB]"
                  >
                    <div>
                      <span className="text-[13.44px] font-medium text-[#222124]">
                        {creative.creativeType} -{" "}
                        {Object.keys(creative.properties).join(", ")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="text-red-500 hover:text-red-700 text-[13.44px]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errors.submit && (
            <p className="text-red-500 text-xs mb-4">{errors.submit}</p>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="cancel-button"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                loading || (editCreative ? false : addedCreatives.length === 0)
              }
              className="apply-button"
            >
              {loading
                ? editCreative
                  ? "Updating..."
                  : "Creating..."
                : editCreative
                  ? "Update Creative"
                  : `Create ${addedCreatives.length} Creative(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
