import React, { useState, useEffect, useRef } from "react";
import { Dropdown } from "../ui/Dropdown";
import { Checkbox } from "../ui/Checkbox";
import { ImageCropModal, type CropCoordinates } from "../ui/ImageCropModal";
import { AssetPickerPopup } from "../ui/AssetPickerPopup";
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
  /** Single array of creatives (each with adGroupId). One API request for all. */
  onSubmit: (items: Array<{ adGroupId: number } & CreativeInput>) => void | Promise<void>;
  onUpdate?: (
    creative: CreativeInput,
    adGroupId: number,
    creativeId: number | string,
  ) => void;
  adgroups: Array<{
    adGroupId: string | number;
    name: string;
    creativeType?: string | null;
  }>;
  loading?: boolean;
  editCreative?: {
    id: number;
    creativeId: number | string; // Can be string to preserve precision
    adGroupId: number | string; // Can be string to preserve precision
    creativeType: "IMAGE" | "VIDEO";
    properties: any;
    consentToTranslate?: boolean;
  } | null;
  /** After create submit: results[i] matches submitted creatives[i]. Panel removes success from list and attaches errors to failed. */
  submitResult?:
    | {
        results: Array<{
          success: boolean;
          creativeId?: number;
          error?: { code?: string; description?: string; details?: string };
        }>;
      }
    | null;
  onConsumeSubmitResult?: () => void;
  accountId?: string;
  profileId?: string;
  channelId?: string | null;
}

const PROPERTY_TYPE_OPTIONS_IMAGE = [
  { value: "headline", label: "Headline" },
  { value: "brandLogo", label: "Brand Logo" },
  { value: "customImage", label: "Custom Image" },
  { value: "background", label: "Background" },
];

const PROPERTY_TYPE_OPTIONS_VIDEO = [{ value: "video", label: "Video" }];

// Brand Logo (SD Creatives) rules
const BRAND_LOGO_MIN_WIDTH = 600;
const BRAND_LOGO_MIN_HEIGHT = 100;
const BRAND_LOGO_ASPECT_RATIO = 6; // 600:100 = 6:1
const BRAND_LOGO_MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1MB
const BRAND_LOGO_ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
];

// Custom Image Rect (SD Creatives): min crop 1200×628, aspect ~1.91:1, max 5MB
const RECT_MIN_WIDTH = 1200;
const RECT_MIN_HEIGHT = 628;
const RECT_ASPECT_RATIO = 1200 / 628; // ~1.91:1
const CUSTOM_IMAGE_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Custom Image Square (SD Creatives): min crop 628×628, aspect 1:1, max 5MB
const SQUARE_MIN_WIDTH = 628;
const SQUARE_MIN_HEIGHT = 628;
const SQUARE_ASPECT_RATIO = 1;

// Custom Image Vertical (optional arrays): 9:16 portrait, min 353×628 px (628×1112 recommended)
const VERTICAL_MIN_WIDTH = 353;
const VERTICAL_MIN_HEIGHT = 628;
const VERTICAL_ASPECT_RATIO = 9 / 16; // width:height = 9:16 (portrait)

export const CreateCreativePanel: React.FC<CreateCreativePanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onUpdate,
  adgroups,
  loading = false,
  editCreative,
  submitResult,
  onConsumeSubmitResult,
  accountId,
  profileId,
  channelId,
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
  const prevIsOpenForCreate = useRef(false);

  // Cropping Coordinates sections hidden (JSX only); crop modals still available
  const SHOW_CROPPING_COORDS_SECTIONS = false;
  // Accordion state for Cropping Coordinates (Optional) only - icon next to title, closed by default
  const [brandLogoCroppingOpen, setBrandLogoCroppingOpen] = useState(false);
  const [customImageRectCroppingOpen, setCustomImageRectCroppingOpen] =
    useState(false);
  const [customImageSquareCroppingOpen, setCustomImageSquareCroppingOpen] =
    useState(false);
  const [customImageArrayCroppingOpen, setCustomImageArrayCroppingOpen] =
    useState<Set<string>>(new Set());

  const [brandLogoCropModalOpen, setBrandLogoCropModalOpen] = useState(false);
  const [brandLogoCropImageUrl, setBrandLogoCropImageUrl] = useState("");
  const [rectCropModalOpen, setRectCropModalOpen] = useState(false);
  const [rectCropImageUrl, setRectCropImageUrl] = useState("");
  const [squareCropModalOpen, setSquareCropModalOpen] = useState(false);
  const [squareCropImageUrl, setSquareCropImageUrl] = useState("");
  /** Which asset picker is open: brandLogo, rect, square, or array (arrayKey + index) */
  const [sdAssetPickerContext, setSdAssetPickerContext] = useState<
    | null
    | "brandLogo"
    | "rectCustomImage"
    | "squareCustomImage"
    | { arrayKey: "squareImages" | "horizontalImages" | "verticalImages"; index: number }
  >(null);
  const [arrayCropModal, setArrayCropModal] = useState<{
    arrayKey: "squareImages" | "horizontalImages" | "verticalImages";
    index: number;
    imageUrl: string;
  } | null>(null);

  // Brand Logo: selected asset and derived validation messages (SD Creatives rules: min 600×100, max 1MB, JPEG/JPG/PNG)
  const brandLogoAsset = (() => {
    const assetId = currentCreative.properties.brandLogo?.assetId?.trim();
    if (!assetId) return null;
    return assets.find((a) => a.assetId === assetId) ?? null;
  })();
  const brandLogoDimensionError = (() => {
    if (!brandLogoAsset) return null;
    const w = brandLogoAsset.fileMetadata?.width;
    const h = brandLogoAsset.fileMetadata?.height;
    if (w == null || h == null) return null;
    if (w < BRAND_LOGO_MIN_WIDTH || h < BRAND_LOGO_MIN_HEIGHT) {
      return `Brand logo must be at least ${BRAND_LOGO_MIN_WIDTH}×${BRAND_LOGO_MIN_HEIGHT} px. Current: ${w}×${h}. Please select a larger image.`;
    }
    return null;
  })();
  const brandLogoOptionalCropHint = (() => {
    if (!brandLogoAsset || brandLogoDimensionError) return null;
    const w = brandLogoAsset.fileMetadata?.width ?? 0;
    const h = brandLogoAsset.fileMetadata?.height ?? 0;
    return `Image (${w}×${h}) meets minimum ${BRAND_LOGO_MIN_WIDTH}×${BRAND_LOGO_MIN_HEIGHT}. Optionally crop for best results (min crop 600×100, aspect ratio 6:1).`;
  })();

  // Rect Custom Image: selected asset and derived validation (min crop 1200×628, aspect ~1.91:1, max 5MB)
  const rectCustomImageAsset = (() => {
    const assetId = currentCreative.properties.customImage?.rectCustomImage?.assetId?.trim();
    if (!assetId) return null;
    return assets.find((a) => a.assetId === assetId) ?? null;
  })();
  const rectDimensionError = (() => {
    if (!rectCustomImageAsset) return null;
    const w = rectCustomImageAsset.fileMetadata?.width;
    const h = rectCustomImageAsset.fileMetadata?.height;
    if (w == null || h == null) return null;
    if (w < RECT_MIN_WIDTH || h < RECT_MIN_HEIGHT) {
      return `Rect image must be at least ${RECT_MIN_WIDTH}×${RECT_MIN_HEIGHT} px (min crop). Current: ${w}×${h}.`;
    }
    return null;
  })();
  const rectOptionalCropHint = (() => {
    if (!rectCustomImageAsset || rectDimensionError) return null;
    const w = rectCustomImageAsset.fileMetadata?.width ?? 0;
    const h = rectCustomImageAsset.fileMetadata?.height ?? 0;
    return `Image (${w}×${h}) meets min crop ${RECT_MIN_WIDTH}×${RECT_MIN_HEIGHT}. Optionally crop (aspect ~1.91:1).`;
  })();

  // Square Custom Image: selected asset and derived validation (min crop 628×628, 1:1, max 5MB)
  const squareCustomImageAsset = (() => {
    const assetId = currentCreative.properties.customImage?.squareCustomImage?.assetId?.trim();
    if (!assetId) return null;
    return assets.find((a) => a.assetId === assetId) ?? null;
  })();
  const squareDimensionError = (() => {
    if (!squareCustomImageAsset) return null;
    const w = squareCustomImageAsset.fileMetadata?.width;
    const h = squareCustomImageAsset.fileMetadata?.height;
    if (w == null || h == null) return null;
    if (w < SQUARE_MIN_WIDTH || h < SQUARE_MIN_HEIGHT) {
      return `Square image must be at least ${SQUARE_MIN_WIDTH}×${SQUARE_MIN_HEIGHT} px (min crop). Current: ${w}×${h}.`;
    }
    return null;
  })();
  const squareOptionalCropHint = (() => {
    if (!squareCustomImageAsset || squareDimensionError) return null;
    const w = squareCustomImageAsset.fileMetadata?.width ?? 0;
    const h = squareCustomImageAsset.fileMetadata?.height ?? 0;
    return `Image (${w}×${h}) meets min crop ${SQUARE_MIN_WIDTH}×${SQUARE_MIN_HEIGHT}. Optionally crop (1:1).`;
  })();

  // Brand Logo: do not auto-fill cropping coordinates; only set when user crops via modal

  // Auto-fill Rect Custom Image crop when asset has valid dimensions (min 1200×628)
  useEffect(() => {
    const rect = currentCreative.properties.customImage?.rectCustomImage;
    const assetId = rect?.assetId?.trim();
    if (!assetId || !rect) return;
    const asset = assets.find((a) => a.assetId === assetId);
    const w = asset?.fileMetadata?.width;
    const h = asset?.fileMetadata?.height;
    if (w == null || h == null) return;
    if (w < RECT_MIN_WIDTH || h < RECT_MIN_HEIGHT) return;
    if (rect.croppingCoordinates) return;
    const defaultCrop = { top: 0, left: 0, width: w, height: h };
    setCurrentCreative((prev) => ({
      ...prev,
      properties: {
        ...prev.properties,
        customImage: {
          ...prev.properties.customImage,
          rectCustomImage: {
            ...(prev.properties.customImage?.rectCustomImage ?? {}),
            croppingCoordinates: defaultCrop,
          },
        },
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentCreative.properties.customImage?.rectCustomImage?.assetId,
    currentCreative.properties.customImage?.rectCustomImage?.croppingCoordinates,
    assets,
  ]);

  // Auto-fill Square Custom Image crop when asset has valid dimensions (min 628×628)
  useEffect(() => {
    const square = currentCreative.properties.customImage?.squareCustomImage;
    const assetId = square?.assetId?.trim();
    if (!assetId || !square) return;
    const asset = assets.find((a) => a.assetId === assetId);
    const w = asset?.fileMetadata?.width;
    const h = asset?.fileMetadata?.height;
    if (w == null || h == null) return;
    if (w < SQUARE_MIN_WIDTH || h < SQUARE_MIN_HEIGHT) return;
    if (square.croppingCoordinates) return;
    const defaultCrop = { top: 0, left: 0, width: w, height: h };
    setCurrentCreative((prev) => ({
      ...prev,
      properties: {
        ...prev.properties,
        customImage: {
          ...prev.properties.customImage,
          squareCustomImage: {
            ...(prev.properties.customImage?.squareCustomImage ?? {}),
            croppingCoordinates: defaultCrop,
          },
        },
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentCreative.properties.customImage?.squareCustomImage?.assetId,
    currentCreative.properties.customImage?.squareCustomImage?.croppingCoordinates,
    assets,
  ]);

  // Fetch assets when component opens
  useEffect(() => {
    if (isOpen && accountId) {
      loadAssets();
    }
  }, [isOpen, accountId, profileId, channelId]);

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
      const data = await campaignsService.getAssets(
        accountIdNum,
        {
          page: 1,
          page_size: 100, // Get all assets for dropdown
          ...(profileId && { profileId }), // Include profileId if available to filter assets
        },
        channelId ?? null
      );
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
      prevIsOpenForCreate.current = isOpen;
    } else {
      // Create mode: only reset when panel just opened for create (isOpen became true).
      // Do not reset when create fails — keep user's entered data so they can fix and resubmit.
      const justOpenedForCreate = isOpen && !prevIsOpenForCreate.current;
      prevIsOpenForCreate.current = isOpen;

      if (justOpenedForCreate) {
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
        setAddedPropertyTypes(new Set(["headline"])); // IMAGE default: Headline tab open with content
        setActivePropertyTab("headline");
        setAddedCreatives([]);
        const firstAdGroupId =
          adgroups.length > 0 ? String(adgroups[0].adGroupId) : "";
        setSelectedAdGroupId(firstAdGroupId);
        // Set creativeType based on first adgroup's creativeType
        if (firstAdGroupId && adgroups.length > 0) {
          const firstAdGroup = adgroups[0];
          const adgroupCreativeType = (firstAdGroup.creativeType || "IMAGE") as
            | "IMAGE"
            | "VIDEO";
          setCurrentCreative((prev) => ({
            ...prev,
            creativeType: adgroupCreativeType,
          }));
        }
      }
    }
  }, [editCreative, adgroups, isOpen]);

  // Sync creativeType when selectedAdGroupId changes programmatically (e.g., when adgroups list updates)
  // Note: User selection is handled by onChange handler which calls handleChange
  useEffect(() => {
    if (selectedAdGroupId && adgroups.length > 0 && !editCreative) {
      const selectedAdGroup = adgroups.find(
        (ag) => String(ag.adGroupId) === selectedAdGroupId,
      );
      if (selectedAdGroup) {
        const adgroupCreativeType = (selectedAdGroup.creativeType ||
          "IMAGE") as "IMAGE" | "VIDEO";
        // Only update if creativeType doesn't match - use handleChange to ensure proper initialization
        if (currentCreative.creativeType !== adgroupCreativeType) {
          handleChange("creativeType", adgroupCreativeType);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAdGroupId, adgroups, editCreative]);

  // Consume submit result: results[i] matches submitted creatives[i]; remove successes, attach errors to failed
  useEffect(() => {
    if (!submitResult?.results || !onConsumeSubmitResult) return;
    const results = submitResult.results;
    setAddedCreatives((prev) => {
      if (results.length !== prev.length) return prev;
      return prev
        .map((c, i) => {
          const r = results[i];
          if (!r) return { ...c, _submitError: "No result" } as CreativeInput & { adGroupId?: string; _submitError?: string };
          if (r.success) return null;
          const msg =
            r.error?.details ?? r.error?.description ?? r.error?.code ?? "Unknown error";
          return {
            ...c,
            _submitError: msg,
          } as CreativeInput & { adGroupId?: string; _submitError?: string };
        })
        .filter((x): x is CreativeInput & { adGroupId?: string; _submitError?: string } => x !== null);
    });
    onConsumeSubmitResult();
  }, [submitResult, onConsumeSubmitResult]);

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
      if (value === "IMAGE") {
        setCurrentCreative({
          creativeType: "IMAGE",
          properties: {
            headline: {
              headline: "",
              hasTermsAndConditions: false,
              originalHeadline: "",
            },
          },
          consentToTranslate: currentCreative.consentToTranslate,
        });
        setAddedPropertyTypes(new Set(["headline"]));
        setActivePropertyTab("headline");
      } else {
        setCurrentCreative({
          creativeType: value,
          properties: {},
          consentToTranslate: currentCreative.consentToTranslate,
        });
        setAddedPropertyTypes(new Set());
        setActivePropertyTab("");
      }
      setSelectedPropertyType("");

      // For VIDEO type, automatically add video property and show form
      if (value === "VIDEO") {
        handleAddPropertyType("video");
        setActivePropertyTab("video");
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

  // Reset handler for Brand Logo tab
  const handleResetBrandLogo = () => {
    setCurrentCreative((prev) => {
      const newProperties = { ...prev.properties };
      delete newProperties.brandLogo;
      return {
        ...prev,
        properties: newProperties,
      };
    });
    // Clear any brandLogo-related errors
    setErrors((prev) => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith("properties.brandLogo")) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });
  };

  // Reset handler for Custom Image tab
  const handleResetCustomImage = () => {
    setCurrentCreative((prev) => {
      const newProperties = { ...prev.properties };
      delete newProperties.customImage;
      return {
        ...prev,
        properties: newProperties,
      };
    });
    // Clear any customImage-related errors
    setErrors((prev) => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith("properties.customImage")) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });
  };

  /** Keep only properties the user added; omit others so backend is not sent empty/required fields (e.g. headline). */
  const pickAddedProperties = (
    props: Record<string, unknown> | undefined,
    added: Set<string>,
  ): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    if (!props) return out;
    added.forEach((k) => {
      if (k in props && props[k] != null) {
        // Exclude headline if it's empty (no actual content)
        if (k === "headline") {
          const headline = props[k] as
            | {
                headline?: string;
                hasTermsAndConditions?: boolean;
                originalHeadline?: string;
              }
            | undefined;
          // Only include headline if it has actual content
          if (headline && headline.headline && headline.headline.trim()) {
            out[k] = props[k];
          }
          // If headline is empty, don't include it in the output
        } else {
          out[k] = props[k];
        }
      }
    });
    return out;
  };

  // Helper function to check if a tab has filled data (based on mandatory fields)
  const isTabFilled = (tabType: string): boolean => {
    if (currentCreative.creativeType === "IMAGE") {
      switch (tabType) {
        case "headline":
          // Headline is optional, so it's considered filled if it exists and has content
          return !!currentCreative.properties.headline?.headline?.trim();
        case "brandLogo":
          return !!(
            currentCreative.properties.brandLogo?.assetId &&
            currentCreative.properties.brandLogo?.assetVersion
          );
        case "customImage": {
          // Tab is filled if user has any custom image data (primary or multi-image path, or partial)
          const ci = currentCreative.properties.customImage;
          const hasRect = !!ci?.rectCustomImage?.assetId?.trim();
          const hasSquare = !!ci?.squareCustomImage?.assetId?.trim();
          const hasH = (ci?.horizontalImages || []).some((img: { assetId?: string }) => !!img?.assetId?.trim());
          const hasS = (ci?.squareImages || []).some((img: { assetId?: string }) => !!img?.assetId?.trim());
          const hasV = (ci?.verticalImages || []).some((img: { assetId?: string }) => !!img?.assetId?.trim());
          return hasRect || hasSquare || hasH || hasS || hasV;
        }
        case "background":
          return !!(
            currentCreative.properties.background?.backgrounds &&
            currentCreative.properties.background.backgrounds.length > 0 &&
            currentCreative.properties.background.backgrounds.some(
              (bg) => bg.color && /^#[0-9A-Fa-f]{6}$/.test(bg.color),
            )
          );
        default:
          return false;
      }
    } else if (currentCreative.creativeType === "VIDEO") {
      if (tabType === "video") {
        return !!(
          currentCreative.properties.video?.video?.assetId &&
          currentCreative.properties.video?.video?.assetVersion
        );
      }
    }
    return false;
  };

  // Helper function to check if a tab has errors
  const hasTabErrors = (tabType: string): boolean => {
    const errorKeys = Object.keys(errors);
    return errorKeys.some((key) => {
      if (tabType === "headline") {
        return key.startsWith("properties.headline");
      } else if (tabType === "brandLogo") {
        return key.startsWith("properties.brandLogo");
      } else if (tabType === "customImage") {
        return key.startsWith("properties.customImage");
      } else if (tabType === "background") {
        return key.startsWith("properties.background");
      } else if (tabType === "video") {
        return key.startsWith("properties.video");
      }
      return false;
    });
  };

  // Helper function to check if at least one tab has filled data
  const hasAtLeastOneFilledTab = (): boolean => {
    if (currentCreative.creativeType === "IMAGE") {
      return (
        isTabFilled("headline") ||
        isTabFilled("brandLogo") ||
        isTabFilled("customImage") ||
        isTabFilled("background")
      );
    } else if (currentCreative.creativeType === "VIDEO") {
      return isTabFilled("video");
    }
    return false;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!currentCreative.creativeType) {
      newErrors.creativeType = "Creative type is required";
    }

    if (currentCreative.creativeType === "IMAGE") {
      // Check if at least one tab has filled data
      if (!hasAtLeastOneFilledTab()) {
        newErrors.properties =
          "Fill at least one property: Headline, Brand Logo, Custom Image, or Background.";
      }

      // Only validate tabs that have been filled (have data)
      // Don't validate tabs that are added but empty

      // Validate headline only if it has been filled
      if (isTabFilled("headline")) {
        const headline = currentCreative.properties.headline;
        // Headline is optional, but if provided, it must be <= 50 characters
        if (headline && headline.headline && headline.headline.length > 50) {
          newErrors["properties.headline.headline"] =
            "Headline must be 50 characters or less";
        }
      }

      // Validate brandLogo only if it has been filled (SD Creatives: min 600×100, max 1MB, JPEG/JPG/PNG)
      if (isTabFilled("brandLogo")) {
        const brandLogo = currentCreative.properties.brandLogo;
        if (!brandLogo || !brandLogo.assetId || !brandLogo.assetVersion) {
          newErrors["properties.brandLogo"] =
            "Brand Logo assetId and assetVersion are required";
        } else if (brandLogoDimensionError) {
          newErrors["properties.brandLogo"] = brandLogoDimensionError;
        } else if (brandLogoAsset) {
          const sizeBytes =
            brandLogoAsset.fileSize ??
            brandLogoAsset.fileMetadata?.sizeInBytes;
          if (
            sizeBytes != null &&
            sizeBytes > BRAND_LOGO_MAX_FILE_SIZE_BYTES
          ) {
            newErrors["properties.brandLogo"] =
              "Brand logo max file size is 1MB. Please select a smaller image.";
          } else {
            const contentType = (
              brandLogoAsset.contentType ??
              brandLogoAsset.fileMetadata?.contentType ??
              ""
            ).toLowerCase();
            const isAllowed =
              contentType &&
              BRAND_LOGO_ALLOWED_CONTENT_TYPES.some((t) => contentType === t);
            if (contentType && !isAllowed) {
              newErrors["properties.brandLogo"] =
                "Brand logo must be JPEG, JPG, or PNG.";
            }
          }
        }
        // Validate cropping coordinates if provided (min 600×100, aspect ratio 6:1 when cropped; full-image crop is allowed)
        if (brandLogo?.croppingCoordinates && !newErrors["properties.brandLogo"]) {
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
          const { top = 0, left = 0, width = 0, height = 0 } = crop;
          const imgW = brandLogoAsset?.fileMetadata?.width;
          const imgH = brandLogoAsset?.fileMetadata?.height;
          const isFullImageCrop =
            imgW != null &&
            imgH != null &&
            top === 0 &&
            left === 0 &&
            width === imgW &&
            height === imgH;
          if (isFullImageCrop) {
            // Using full image as crop – no aspect/min size requirement
          } else {
            if (width < BRAND_LOGO_MIN_WIDTH || height < BRAND_LOGO_MIN_HEIGHT) {
              newErrors["properties.brandLogo.croppingCoordinates.width"] =
                `Crop must be at least ${BRAND_LOGO_MIN_WIDTH}×${BRAND_LOGO_MIN_HEIGHT} px.`;
            } else if (
              Math.abs(width / height - BRAND_LOGO_ASPECT_RATIO) > 0.01
            ) {
              newErrors["properties.brandLogo.croppingCoordinates.width"] =
                `Crop must have aspect ratio 6:1 (600×100).`;
            } else if (imgW != null && imgH != null) {
              if (left + width > imgW || top + height > imgH) {
                newErrors["properties.brandLogo.croppingCoordinates.top"] =
                  "Crop coordinates exceed image boundaries.";
              }
            }
          }
        }
      }

      // Validate customImage: either primary (rectCustomImage + squareCustomImage) OR multi-image (horizontalImages + squareImages + verticalImages, all three). Not both rect + horizontal; not both square + squareImages.
      if (isTabFilled("customImage")) {
        const customImage = currentCreative.properties.customImage;
        const hasRectPrimary = !!customImage?.rectCustomImage?.assetId?.trim();
        const hasSquarePrimary = !!customImage?.squareCustomImage?.assetId?.trim();
        const horizontalArr = customImage?.horizontalImages || [];
        const squareArr = customImage?.squareImages || [];
        const verticalArr = customImage?.verticalImages || [];
        const hasHorizontal = horizontalArr.some((img: { assetId?: string }) => !!img?.assetId?.trim());
        const hasSquareArr = squareArr.some((img: { assetId?: string }) => !!img?.assetId?.trim());
        const hasVertical = verticalArr.some((img: { assetId?: string }) => !!img?.assetId?.trim());
        const multiImagePathValid = hasHorizontal && hasSquareArr && hasVertical;

        // Enforce mutual exclusivity: rectCustomImage vs horizontalImages, squareCustomImage vs squareImages (always)
        const bothRectAndHorizontal = hasRectPrimary && hasHorizontal;
        const bothSquareAndSquareArr = hasSquarePrimary && hasSquareArr;
        if (bothRectAndHorizontal || bothSquareAndSquareArr) {
          const parts: string[] = [];
          if (bothRectAndHorizontal) parts.push("set either rectCustomImage or horizontalImages not both");
          if (bothSquareAndSquareArr) parts.push("set either squareCustomImage or squareImages not both");
          newErrors["properties.customImage"] = parts.join(", ");
        }

        if (!newErrors["properties.customImage"]) {
          const primaryPathValid = hasRectPrimary && hasSquarePrimary;

          if (!primaryPathValid && !multiImagePathValid) {
            if (hasHorizontal || hasSquareArr || hasVertical) {
              newErrors["properties.customImage"] =
                "For multi-image creative, Square Images, Horizontal Images, and Vertical Images are all required.";
            } else {
              newErrors["properties.customImage"] =
                "Set either Rectangular + Square Custom Image (primary) or Square Images + Horizontal Images + Vertical Images (multi-image).";
            }
          }
        }

        if (!newErrors["properties.customImage"]) {
          // Primary path: validate rectCustomImage and squareCustomImage when used
          if (hasRectPrimary && hasSquarePrimary) {
          // Validate rectCustomImage
          if (
            !customImage?.rectCustomImage?.assetId ||
            !customImage?.rectCustomImage?.assetVersion
          ) {
            newErrors["properties.customImage.rectCustomImage"] =
              "Rectangular Custom Image assetId and assetVersion are required";
          } else if (rectDimensionError) {
            newErrors["properties.customImage.rectCustomImage"] =
              rectDimensionError;
          } else if (rectCustomImageAsset) {
            const sizeBytes =
              rectCustomImageAsset.fileSize ??
              rectCustomImageAsset.fileMetadata?.sizeInBytes;
            if (
              sizeBytes != null &&
              sizeBytes > CUSTOM_IMAGE_MAX_FILE_SIZE_BYTES
            ) {
              newErrors["properties.customImage.rectCustomImage"] =
                "Rect image max file size is 5MB.";
            }
          }
          if (customImage?.rectCustomImage?.croppingCoordinates && !newErrors["properties.customImage.rectCustomImage"]) {
            const crop = customImage?.rectCustomImage?.croppingCoordinates;
            if (crop) {
            const { top = 0, left = 0, width = 0, height = 0 } = crop;
            const imgW = rectCustomImageAsset?.fileMetadata?.width;
            const imgH = rectCustomImageAsset?.fileMetadata?.height;
            const isFullImageCrop =
              imgW != null &&
              imgH != null &&
              top === 0 &&
              left === 0 &&
              width === imgW &&
              height === imgH;
            if (isFullImageCrop) {
              // Using full image as crop – no aspect/min size requirement
            } else {
              if (width < RECT_MIN_WIDTH || height < RECT_MIN_HEIGHT) {
                newErrors["properties.customImage.rectCustomImage"] =
                  `Rect crop must be at least ${RECT_MIN_WIDTH}×${RECT_MIN_HEIGHT} px.`;
              } else if (Math.abs(width / height - RECT_ASPECT_RATIO) > 0.02) {
                newErrors["properties.customImage.rectCustomImage"] =
                  "Rect crop must have aspect ratio ~1.91:1 (1200×628).";
              } else if (imgW != null && imgH != null) {
                if (left + width > imgW || top + height > imgH) {
                  newErrors["properties.customImage.rectCustomImage"] =
                    "Rect crop exceeds image boundaries.";
                }
              }
            }
            }
          }

          // Validate squareCustomImage
          if (
            !customImage?.squareCustomImage?.assetId ||
            !customImage?.squareCustomImage?.assetVersion
          ) {
            newErrors["properties.customImage.squareCustomImage"] =
              "Square Custom Image assetId and assetVersion are required";
          } else if (squareDimensionError) {
            newErrors["properties.customImage.squareCustomImage"] =
              squareDimensionError;
          } else if (squareCustomImageAsset) {
            const sizeBytes =
              squareCustomImageAsset.fileSize ??
              squareCustomImageAsset.fileMetadata?.sizeInBytes;
            if (
              sizeBytes != null &&
              sizeBytes > CUSTOM_IMAGE_MAX_FILE_SIZE_BYTES
            ) {
              newErrors["properties.customImage.squareCustomImage"] =
                "Square image max file size is 5MB.";
            }
          }
          if (customImage?.squareCustomImage?.croppingCoordinates && !newErrors["properties.customImage.squareCustomImage"]) {
            const crop = customImage?.squareCustomImage?.croppingCoordinates;
            if (crop) {
              const { top = 0, left = 0, width = 0, height = 0 } = crop;
              const imgW = squareCustomImageAsset?.fileMetadata?.width;
              const imgH = squareCustomImageAsset?.fileMetadata?.height;
              const isFullImageCrop =
                imgW != null &&
                imgH != null &&
                top === 0 &&
                left === 0 &&
                width === imgW &&
                height === imgH;
              if (isFullImageCrop) {
                // Using full image as crop – no aspect/min size requirement
              } else {
                if (width < SQUARE_MIN_WIDTH || height < SQUARE_MIN_HEIGHT) {
                  newErrors["properties.customImage.squareCustomImage"] =
                    `Square crop must be at least ${SQUARE_MIN_WIDTH}×${SQUARE_MIN_HEIGHT} px.`;
                } else if (Math.abs(width / height - SQUARE_ASPECT_RATIO) > 0.02) {
                  newErrors["properties.customImage.squareCustomImage"] =
                    "Square crop must have 1:1 aspect ratio (min 628×628 px).";
                } else if (imgW != null && imgH != null) {
                  if (left + width > imgW || top + height > imgH) {
                    newErrors["properties.customImage.squareCustomImage"] =
                      "Square crop exceeds image boundaries.";
                  }
                }
              }
            }
          }
          }
        }

        // Validate optional image arrays (squareImages, horizontalImages, verticalImages) – same rules as primary
        const optionalArrayKeys = [
          { key: "squareImages" as const, minW: SQUARE_MIN_WIDTH, minH: SQUARE_MIN_HEIGHT, aspect: SQUARE_ASPECT_RATIO },
          { key: "horizontalImages" as const, minW: RECT_MIN_WIDTH, minH: RECT_MIN_HEIGHT, aspect: RECT_ASPECT_RATIO },
          { key: "verticalImages" as const, minW: VERTICAL_MIN_WIDTH, minH: VERTICAL_MIN_HEIGHT, aspect: VERTICAL_ASPECT_RATIO },
        ] as const;
        for (const { key, minW, minH, aspect } of optionalArrayKeys) {
          const arr = customImage?.[key] || [];
          for (let i = 0; i < arr.length; i++) {
            const img = arr[i];
            if (!img?.assetId || !img?.assetVersion) continue;
            const asset = assets.find((a) => a.assetId === img.assetId);
            const errKey = `properties.customImage.${key}[${i}]`;
            if (asset) {
              const w = asset.fileMetadata?.width;
              const h = asset.fileMetadata?.height;
              const meetsMin =
                w != null &&
                h != null &&
                (key === "verticalImages"
                  ? Math.max(w, h) >= minH && Math.min(w, h) >= minW
                  : w >= minW && h >= minH);
              if (w != null && h != null && !meetsMin) {
                newErrors[errKey] = `Min crop ${minW}×${minH} px. Current: ${w}×${h}.`;
              } else {
                const sizeBytes = asset.fileSize ?? asset.fileMetadata?.sizeInBytes;
                if (sizeBytes != null && sizeBytes > CUSTOM_IMAGE_MAX_FILE_SIZE_BYTES) {
                  newErrors[errKey] = "Max file size is 5MB.";
                }
              }
            }
            if (img.croppingCoordinates && !newErrors[errKey] && asset?.fileMetadata?.width != null && asset?.fileMetadata?.height != null) {
              const crop = img.croppingCoordinates;
              const top = crop.top ?? 0;
              const left = crop.left ?? 0;
              const width = crop.width ?? 0;
              const height = crop.height ?? 0;
              const imgW = asset.fileMetadata.width;
              const imgH = asset.fileMetadata.height;
              const isFullImageCrop = top === 0 && left === 0 && width === imgW && height === imgH;
              if (!isFullImageCrop) {
                if (width < minW || height < minH) {
                  newErrors[errKey] = `Crop must be at least ${minW}×${minH} px.`;
                } else if (key === "verticalImages" && width > height) {
                  newErrors[errKey] = "Vertical image must be portrait (9:16, height > width).";
                } else if (Math.abs(width / height - aspect) > 0.02) {
                  newErrors[errKey] = key === "horizontalImages" ? "Crop must have aspect ratio ~1.91:1 (1200×628)." : key === "squareImages" ? "Square crop must have 1:1 aspect ratio (min 628×628 px)." : "Crop must be 9:16 portrait (min 353×628 px, e.g. 628×1112).";
                } else {
                  // Boundary check: crop must fit in image. For vertical images, asset metadata may be width×height or height×width.
                  const inBounds = left + width <= imgW && top + height <= imgH;
                  const inBoundsSwapped =
                    key === "verticalImages" &&
                    left + width <= imgH &&
                    top + height <= imgW;
                  if (!inBounds && !inBoundsSwapped) {
                    newErrors[errKey] = "Crop exceeds image boundaries.";
                  }
                }
              }
            }
          }
        }
      }

      // Validate background only if it has been filled
      if (isTabFilled("background")) {
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
      const existingCreativeForAdGroup = addedCreatives.find(
        (creative) =>
          (creative as CreativeInput & { adGroupId?: string }).adGroupId ===
          selectedAdGroupId,
      );

      if (existingCreativeForAdGroup) {
        setErrors({
          submit:
            "Only one creative can be added per ad group. Please submit the current creative or remove the existing one before adding another.",
        });
        return;
      }

      setAddedCreatives((prev) => [
        ...prev,
        {
          ...currentCreative,
          properties: pickAddedProperties(
            currentCreative.properties as Record<string, unknown>,
            addedPropertyTypes,
          ),
          // Store adGroupId with the creative to track which ad group it belongs to
          adGroupId: selectedAdGroupId,
        } as CreativeInput & { adGroupId: string },
      ]);
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
      setAddedPropertyTypes(new Set(["headline"]));
      setActivePropertyTab("headline");
      setErrors({});
    } else {
      console.log("[handleAdd] Validation failed, errors:", errors);
    }
  };

  const handleRemove = (index: number) => {
    setAddedCreatives((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditFromList = (index: number) => {
    const creative = addedCreatives[index] as (CreativeInput & { adGroupId?: string; _submitError?: string }) | undefined;
    if (!creative) return;
    const adGroupId = creative.adGroupId ?? selectedAdGroupId;
    setSelectedAdGroupId(String(adGroupId));
    setCurrentCreative({
      creativeType: creative.creativeType,
      properties: creative.properties ?? {},
      consentToTranslate: creative.consentToTranslate ?? false,
    });
    const validTypes = new Set(["headline", "brandLogo", "customImage", "background", "video"]);
    const keys = Object.keys(creative.properties ?? {}).filter((k) => validTypes.has(k));
    const newTypes = keys.length > 0 ? new Set(keys) : new Set(["headline"]);
    setAddedPropertyTypes(newTypes);
    setActivePropertyTab(keys[0] ?? "headline");
    setAddedCreatives((prev) => prev.filter((_, i) => i !== index));
    setErrors({});
  };

  const handleSubmit = async () => {
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
      onUpdate(
        {
          ...currentCreative,
          properties: pickAddedProperties(
            currentCreative.properties as Record<string, unknown>,
            addedPropertyTypes,
          ),
        },
        parseInt(selectedAdGroupId, 10),
        creativeId,
      );
    } else {
      // Create mode: submit all added creatives, grouped by ad group
      if (!selectedAdGroupId) {
        setErrors({ adGroupId: "Please select an ad group" });
        return;
      }

      // If list is empty but form has data, add current creative first
      let listToSubmit = addedCreatives;
      if (listToSubmit.length === 0 && hasAtLeastOneFilledTab()) {
        const isValid = validate();
        if (!isValid) return;
        const newCreative = {
          ...currentCreative,
          properties: pickAddedProperties(
            currentCreative.properties as Record<string, unknown>,
            addedPropertyTypes,
          ),
        } as CreativeInput & { adGroupId?: string };
        newCreative.adGroupId = selectedAdGroupId;
        setAddedCreatives((prev) => [...prev, newCreative]);
        listToSubmit = [newCreative];
      }

      if (listToSubmit.length === 0) {
        setErrors({ submit: "Please add at least one creative" });
        return;
      }

      // Build single array: each item has adGroupId, creativeType, properties, consentToTranslate (one API request for all)
      const payload = (listToSubmit as (CreativeInput & { adGroupId?: string })[]).map((c) => ({
        adGroupId: parseInt(c.adGroupId ?? selectedAdGroupId, 10),
        creativeType: c.creativeType,
        properties: c.properties,
        consentToTranslate: c.consentToTranslate ?? false,
      }));
      await (onSubmit as (items: Array<{ adGroupId: number } & CreativeInput>) => void | Promise<void>)(payload);
      // Do not clear addedCreatives or reset form here; parent will pass submitResult and we remove success / attach errors in useEffect
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
          {/* Ad Group Selection */}
          <div className="mb-6">
            <div className="flex-1">
              <label className="form-label-small">Ad Group *</label>
              <Dropdown
                options={adgroups.map((ag) => {
                  const creativeType = ag.creativeType || "IMAGE";
                  return {
                    value: String(ag.adGroupId),
                    label: `${ag.name || "Ad Group"} - ${creativeType} (${ag.adGroupId})`,
                  };
                })}
                value={selectedAdGroupId}
                onChange={(value) => {
                  setSelectedAdGroupId(value);
                  // Clear errors when ad group changes
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    // Clear adGroupId error if it exists
                    if (newErrors.adGroupId) {
                      delete newErrors.adGroupId;
                    }
                    // Clear submit error when ad group changes (e.g., "Only one creative per ad group")
                    if (newErrors.submit) {
                      delete newErrors.submit;
                    }
                    return newErrors;
                  });
                  // Auto-set creativeType based on selected adgroup (only if different)
                  const selectedAdGroup = adgroups.find(
                    (ag) => String(ag.adGroupId) === value,
                  );
                  if (selectedAdGroup) {
                    const adgroupCreativeType = (selectedAdGroup.creativeType ||
                      "IMAGE") as "IMAGE" | "VIDEO";
                    // Only update creativeType if it's different from current
                    // If same, preserve all form data - just update the adGroupId (which is already done above)
                    if (currentCreative.creativeType !== adgroupCreativeType) {
                      // Update creativeType but preserve existing properties
                      setCurrentCreative((prev) => ({
                        ...prev,
                        creativeType: adgroupCreativeType,
                        // Preserve all existing properties
                        properties: prev.properties,
                      }));

                      // If switching to VIDEO and video property doesn't exist, add it
                      if (
                        adgroupCreativeType === "VIDEO" &&
                        !addedPropertyTypes.has("video")
                      ) {
                        handleAddPropertyType("video");
                        setActivePropertyTab("video");
                      }
                      // If switching to IMAGE and no properties exist, add headline tab
                      else if (
                        adgroupCreativeType === "IMAGE" &&
                        addedPropertyTypes.size === 0
                      ) {
                        setAddedPropertyTypes(new Set(["headline"]));
                        setActivePropertyTab("headline");
                      }
                    }
                    // If creativeType is the same, don't reset anything - just keep the form as is
                    // The adGroupId is already updated above, so we're done
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
          </div>

          {/* Current Creative Form */}
          <div className="mb-6">
            <h3 className="text-[16px] font-semibold text-[#072929] mb-4">
              Creative Details
            </h3>

            {/* Property Type Selector - Tabs (styled like SB Audience/Placements) */}
            <div className="tabs-container mb-4 border border-[#e8e8e3] rounded-lg overflow-hidden">
              <div className=" tabs-nav flex bg-[#FEFEFB] border-b border-[#e8e8e3]">
                {/* Show IMAGE property tabs when creative type is IMAGE */}
                {currentCreative.creativeType === "IMAGE" &&
                  PROPERTY_TYPE_OPTIONS_IMAGE.map((option) => {
                    const isActive = activePropertyTab === option.value;
                    const isAdded = addedPropertyTypes.has(option.value);
                    const isFilled = isTabFilled(option.value);
                    const hasErrors = hasTabErrors(option.value);
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
                        className={`px-4 py-2 text-[14px] transition-colors flex items-center gap-2 ${
                          hasErrors
                            ? "border-b-2 border-red-500"
                            : isActive
                              ? "text-[#072929] bg-[#FEFEFB] border-b-2 border-[#136D6D]"
                              : "text-[#556179] hover:text-[#072929] hover:bg-[#f5f5f0]"
                        }`}
                      >
                        <span>{option.label}</span>
                        {isFilled && !hasErrors && (
                          <svg
                            className="w-4 h-4 text-[#136D6D]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                {/* Show Video tab only when creative type is VIDEO */}
                {currentCreative.creativeType === "VIDEO" &&
                  PROPERTY_TYPE_OPTIONS_VIDEO.map((option) => {
                    const isActive = activePropertyTab === option.value;
                    const isAdded = addedPropertyTypes.has(option.value);
                    const isFilled = isTabFilled(option.value);
                    const hasErrors = hasTabErrors(option.value);
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
                        className={`px-4 py-2 text-[14px] transition-colors flex items-center gap-2 ${
                          hasErrors
                            ? "border-b-2 border-red-500"
                            : isActive
                              ? "text-[#072929] bg-[#FEFEFB] border-b-2 border-[#136D6D]"
                              : "text-[#556179] hover:text-[#072929] hover:bg-[#f5f5f0]"
                        }`}
                      >
                        <span>{option.label}</span>
                        {isFilled && !hasErrors && (
                          <svg
                            className="w-4 h-4 text-[#136D6D]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  })}
              </div>

              {/* Property Forms - Show only active tab */}
              {activePropertyTab === "headline" &&
                addedPropertyTypes.has("headline") && (
                  <div className="bg-[#FEFEFB] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-[11.2px] font-semibold text-[#556179] uppercase">
                        Headline Creative Properties
                      </label>
                      {/* Remove button hidden per requirements */}
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
                        {currentCreative.properties.headline?.headline
                          ?.length || 0}
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
                          currentCreative.properties.headline
                            ?.originalHeadline || ""
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
                  <div className="bg-[#FEFEFB] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-[11.2px] font-semibold text-[#556179] uppercase">
                        Brand Logo Creative Properties
                      </label>
                      <button
                        type="button"
                        onClick={handleResetBrandLogo}
                        className="text-[#136D6D] hover:text-[#0f5555] text-sm font-medium"
                        title="Reset Brand Logo form"
                      >
                        Reset
                      </button>
                    </div>

                    {/* Asset ID and Version */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-[11.2px] font-semibold text-[#556179]">
                          Logo Asset{" "}
                          <span className="text-gray-400 font-normal">
                            (Required)
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setSdAssetPickerContext("brandLogo")}
                          disabled={!accountId}
                          className="text-[11px] font-medium text-[#136D6D] hover:text-[#0e5a5a] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Browse assets
                        </button>
                      </div>
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
                              currentCreative.properties.brandLogo?.assetId ||
                              ""
                            }
                            onChange={(value) => {
                              handleChange("properties.brandLogo", {
                                ...currentCreative.properties.brandLogo,
                                assetId: value || "",
                                assetVersion: value
                                  ? "version_v1"
                                  : currentCreative.properties.brandLogo
                                      ?.assetVersion || "",
                                croppingCoordinates: undefined,
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
                        Max file size: 1MB. Min dimensions: 600×100 px.
                        Formats: JPEG, JPG, PNG.
                      </p>
                      {(errors["properties.brandLogo"] ||
                        brandLogoDimensionError) && (
                        <p className="text-red-500 text-xs mt-1 font-medium">
                          {errors["properties.brandLogo"] ||
                            brandLogoDimensionError}
                        </p>
                      )}
                      {brandLogoOptionalCropHint &&
                        !brandLogoDimensionError &&
                        !errors["properties.brandLogo"] && (
                          <p className="text-[10px] text-yellow-600 mt-1">
                            {brandLogoOptionalCropHint}
                          </p>
                        )}
                      {currentCreative.properties.brandLogo?.assetId &&
                        currentCreative.properties.brandLogo?.assetVersion &&
                        !brandLogoDimensionError &&
                        !errors["properties.brandLogo"] && (
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={async () => {
                                const assetId =
                                  currentCreative.properties.brandLogo
                                    ?.assetId || "";
                                const selectedAsset = assets.find(
                                  (a) => a.assetId === assetId,
                                );
                                let imageUrl =
                                  selectedAsset?.storageLocationUrls
                                    ?.defaultUrl;
                                if (
                                  !imageUrl &&
                                  accountId &&
                                  profileId &&
                                  assetId
                                ) {
                                  try {
                                    const accountIdNum = parseInt(
                                      accountId,
                                      10,
                                    );
                                    if (!Number.isNaN(accountIdNum)) {
                                      const preview =
                                        await campaignsService.getAssetPreview(
                                          accountIdNum,
                                          assetId,
                                          String(profileId),
                                          channelId ?? null,
                                        );
                                      imageUrl = preview?.previewUrl || "";
                                    }
                                  } catch {
                                    imageUrl = "";
                                  }
                                }
                                if (!imageUrl) {
                                  setErrors((prev) => ({
                                    ...prev,
                                    "properties.brandLogo":
                                      "Could not load image for cropping. Ensure the asset has a preview.",
                                  }));
                                  return;
                                }
                                setBrandLogoCropImageUrl(imageUrl);
                                setBrandLogoCropModalOpen(true);
                              }}
                              className="text-[10px] text-[#136D6D] hover:text-[#0e5a5a] font-medium underline"
                            >
                              {currentCreative.properties.brandLogo?.croppingCoordinates
                                ? "Crop image again"
                                : "Crop image"}
                            </button>
                          </div>
                        )}
                    </div>

                    {/* Cropping Coordinates - hidden */}
                    {SHOW_CROPPING_COORDS_SECTIONS && (
                      <div className="mt-2">
                        <button type="button" className="hidden">Cropping Coordinates</button>
                      </div>
                    )}
                    {accountId && sdAssetPickerContext === "brandLogo" && (
                      <AssetPickerPopup
                        isOpen={true}
                        onClose={() => setSdAssetPickerContext(null)}
                        onSelect={(asset) => {
                          setSdAssetPickerContext(null);
                          const value = asset.assetId || "";
                          handleChange("properties.brandLogo", {
                            ...currentCreative.properties.brandLogo,
                            assetId: value,
                            assetVersion: value ? "version_v1" : currentCreative.properties.brandLogo?.assetVersion || "",
                            croppingCoordinates: undefined,
                          });
                          if (!assets.some((a) => a.assetId === value)) {
                            setAssets((prev) => [asset, ...prev]);
                          }
                        }}
                        accountId={parseInt(accountId, 10)}
                        channelId={channelId ?? null}
                        profileId={profileId ?? null}
                        imageOnly
                        title="Browse brand logo assets"
                      />
                    )}
                  </div>
                )}

              {activePropertyTab === "customImage" &&
                addedPropertyTypes.has("customImage") && (
                  <div className="bg-[#FEFEFB] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-[11.2px] font-semibold text-[#556179] uppercase">
                        Custom Image Creative Properties
                      </label>
                      <button
                        type="button"
                        onClick={handleResetCustomImage}
                        className="text-[#136D6D] hover:text-[#0f5555] text-sm font-medium"
                        title="Reset Custom Image form"
                      >
                        Reset
                      </button>
                    </div>
                    {errors["properties.customImage"] && (
                      <p className="text-red-500 text-xs mt-1 mb-3 font-medium">
                        {errors["properties.customImage"]}
                      </p>
                    )}

                    {(() => {
                      const ci = currentCreative.properties.customImage;
                      const hasHorizontal = (ci?.horizontalImages || []).some((img: { assetId?: string }) => !!img?.assetId?.trim());
                      const hasSquareArr = (ci?.squareImages || []).some((img: { assetId?: string }) => !!img?.assetId?.trim());
                      const rectRequired = !hasHorizontal;
                      const squareRequired = !hasSquareArr;
                      return (
                    <div className="space-y-6">
                      {/* Rect Custom Image (Main Image) - required only when not using horizontalImages */}
                      {currentCreative.properties.customImage
                        ?.rectCustomImage ? (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <label className="block text-[11.2px] font-semibold text-[#556179]">
                              Rectangular Custom Image{" "}
                              {rectRequired && <span className="text-red-500">*</span>}
                            </label>
                            <button
                              type="button"
                              onClick={() => setSdAssetPickerContext("rectCustomImage")}
                              disabled={!accountId}
                              className="text-[11px] font-medium text-[#136D6D] hover:text-[#0e5a5a] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Browse assets
                            </button>
                          </div>
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
                                const selectedAsset = value
                                  ? assets.find((a) => a.assetId === value)
                                  : null;
                                const w = selectedAsset?.fileMetadata?.width;
                                const h = selectedAsset?.fileMetadata?.height;
                                const meetsMin =
                                  w != null &&
                                  h != null &&
                                  w >= RECT_MIN_WIDTH &&
                                  h >= RECT_MIN_HEIGHT;
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
                                              ?.rectCustomImage?.assetVersion ||
                                            "",
                                        croppingCoordinates:
                                          meetsMin && w != null && h != null
                                            ? { top: 0, left: 0, width: w, height: h }
                                            : undefined,
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
                          <p className="text-xs text-gray-400 mt-1 mb-1">
                            Max 5MB. Min crop: 1200×628 px (aspect ~1.91:1).
                          </p>
                          {(errors["properties.customImage.rectCustomImage"] ||
                            rectDimensionError) && (
                            <p className="text-red-500 text-xs mt-1 font-medium">
                              {errors["properties.customImage.rectCustomImage"] ||
                                rectDimensionError}
                            </p>
                          )}
                          {rectOptionalCropHint &&
                            !rectDimensionError &&
                            !errors["properties.customImage.rectCustomImage"] && (
                              <p className="text-[10px] text-yellow-600 mt-1">
                                {rectOptionalCropHint}
                              </p>
                            )}
                          {currentCreative.properties.customImage?.rectCustomImage?.assetId &&
                            currentCreative.properties.customImage?.rectCustomImage?.assetVersion &&
                            !rectDimensionError &&
                            !errors["properties.customImage.rectCustomImage"] && (
                              <div className="mt-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const assetId =
                                      currentCreative.properties.customImage
                                        ?.rectCustomImage?.assetId || "";
                                    const selectedAsset = assets.find(
                                      (a) => a.assetId === assetId,
                                    );
                                    let imageUrl =
                                      selectedAsset?.storageLocationUrls
                                        ?.defaultUrl;
                                    if (
                                      !imageUrl &&
                                      accountId &&
                                      profileId &&
                                      assetId
                                    ) {
                                      try {
                                        const accountIdNum = parseInt(
                                          accountId,
                                          10,
                                        );
                                        if (!Number.isNaN(accountIdNum)) {
                                          const preview =
                                            await campaignsService.getAssetPreview(
                                              accountIdNum,
                                              assetId,
                                              String(profileId),
                                              channelId ?? null,
                                            );
                                          imageUrl = preview?.previewUrl || "";
                                        }
                                      } catch {
                                        imageUrl = "";
                                      }
                                    }
                                    if (!imageUrl) {
                                      setErrors((prev) => ({
                                        ...prev,
                                        "properties.customImage.rectCustomImage":
                                          "Could not load image for cropping.",
                                      }));
                                      return;
                                    }
                                    setRectCropImageUrl(imageUrl);
                                    setRectCropModalOpen(true);
                                  }}
                                  className="text-[10px] text-[#136D6D] hover:text-[#0e5a5a] font-medium underline"
                                >
                                  {currentCreative.properties.customImage?.rectCustomImage?.croppingCoordinates
                                    ? "Crop image again"
                                    : "Crop image"}
                                </button>
                              </div>
                            )}
                          {/* Cropping Coordinates - hidden */}
                          {SHOW_CROPPING_COORDS_SECTIONS && <div className="mt-2" />}
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[11.2px] font-semibold text-[#556179] mb-2">
                            Rectangular Custom Image{" "}
                            {rectRequired && <span className="text-red-500">*</span>}
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              // Ensure customImage property type is added
                              if (!addedPropertyTypes.has("customImage")) {
                                handleAddPropertyType("customImage");
                              }
                              // Initialize customImage if it doesn't exist, then set rectCustomImage
                              setCurrentCreative((prev) => ({
                                ...prev,
                                properties: {
                                  ...prev.properties,
                                  customImage: {
                                    ...prev.properties.customImage,
                                    rectCustomImage: {
                                      assetId: "",
                                      assetVersion: "",
                                    },
                                  },
                                },
                              }));
                            }}
                            className="text-[#136D6D] hover:text-[#0f5555] text-[12px] font-medium"
                          >
                            + Add Main Image
                          </button>
                        </div>
                      )}

                      {/* Square Custom Image - required only when not using squareImages */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <label className="block text-[11.2px] font-semibold text-[#556179]">
                            Square Custom Image{" "}
                            {squareRequired && <span className="text-red-500">*</span>}
                          </label>
                          <button
                            type="button"
                            onClick={() => setSdAssetPickerContext("squareCustomImage")}
                            disabled={!accountId}
                            className="text-[11px] font-medium text-[#136D6D] hover:text-[#0e5a5a] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Browse assets
                          </button>
                        </div>
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
                              const selectedAsset = value
                                ? assets.find((a) => a.assetId === value)
                                : null;
                              const w = selectedAsset?.fileMetadata?.width;
                              const h = selectedAsset?.fileMetadata?.height;
                              const meetsMin =
                                w != null &&
                                h != null &&
                                w >= SQUARE_MIN_WIDTH &&
                                h >= SQUARE_MIN_HEIGHT;
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
                                      croppingCoordinates:
                                        meetsMin && w != null && h != null
                                          ? { top: 0, left: 0, width: w, height: h }
                                          : undefined,
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
                        <p className="text-xs text-gray-400 mt-1 mb-1">
                          Max 5MB. Min crop: 628×628 px (1:1 square).
                        </p>
                        {(errors["properties.customImage.squareCustomImage"] ||
                          squareDimensionError) && (
                          <p className="text-red-500 text-xs mt-1 font-medium">
                            {errors["properties.customImage.squareCustomImage"] ||
                              squareDimensionError}
                          </p>
                        )}
                        {squareOptionalCropHint &&
                          !squareDimensionError &&
                          !errors["properties.customImage.squareCustomImage"] && (
                            <p className="text-[10px] text-yellow-600 mt-1">
                              {squareOptionalCropHint}
                            </p>
                          )}
                        {currentCreative.properties.customImage?.squareCustomImage?.assetId &&
                          currentCreative.properties.customImage?.squareCustomImage?.assetVersion &&
                          !squareDimensionError &&
                          !errors["properties.customImage.squareCustomImage"] && (
                            <div className="mt-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  const assetId =
                                    currentCreative.properties.customImage
                                      ?.squareCustomImage?.assetId || "";
                                  const selectedAsset = assets.find(
                                    (a) => a.assetId === assetId,
                                  );
                                  let imageUrl =
                                    selectedAsset?.storageLocationUrls
                                      ?.defaultUrl;
                                  if (
                                    !imageUrl &&
                                    accountId &&
                                    profileId &&
                                    assetId
                                  ) {
                                    try {
                                      const accountIdNum = parseInt(
                                        accountId,
                                        10,
                                      );
                                      if (!Number.isNaN(accountIdNum)) {
                                        const preview =
                                          await campaignsService.getAssetPreview(
                                            accountIdNum,
                                            assetId,
                                            String(profileId),
                                            channelId ?? null,
                                          );
                                        imageUrl = preview?.previewUrl || "";
                                      }
                                    } catch {
                                      imageUrl = "";
                                    }
                                  }
                                  if (!imageUrl) {
                                    setErrors((prev) => ({
                                      ...prev,
                                      "properties.customImage.squareCustomImage":
                                        "Could not load image for cropping.",
                                    }));
                                    return;
                                  }
                                  setSquareCropImageUrl(imageUrl);
                                  setSquareCropModalOpen(true);
                                }}
                                className="text-[10px] text-[#136D6D] hover:text-[#0e5a5a] font-medium underline"
                              >
                                {currentCreative.properties.customImage?.squareCustomImage?.croppingCoordinates
                                  ? "Crop image again"
                                  : "Crop image"}
                              </button>
                            </div>
                          )}
                        {/* Cropping Coordinates - hidden */}
                        {SHOW_CROPPING_COORDS_SECTIONS && <div className="mt-2" />}
                      </div>

                      {/* Asset picker popup for rect / square / array */}
                      {accountId &&
                        (sdAssetPickerContext === "rectCustomImage" ||
                          sdAssetPickerContext === "squareCustomImage" ||
                          (typeof sdAssetPickerContext === "object" &&
                            sdAssetPickerContext !== null)) && (
                        <AssetPickerPopup
                          isOpen={true}
                          onClose={() => setSdAssetPickerContext(null)}
                          onSelect={(asset) => {
                            const value = asset.assetId || "";
                            const ctx = sdAssetPickerContext;
                            setSdAssetPickerContext(null);
                            if (!assets.some((a) => a.assetId === value)) {
                              setAssets((prev) => [asset, ...prev]);
                            }
                            if (ctx === "rectCustomImage") {
                              const w = asset.fileMetadata?.width;
                              const h = asset.fileMetadata?.height;
                              const meetsMin =
                                w != null &&
                                h != null &&
                                w >= RECT_MIN_WIDTH &&
                                h >= RECT_MIN_HEIGHT;
                              setCurrentCreative((prev) => ({
                                ...prev,
                                properties: {
                                  ...prev.properties,
                                  customImage: {
                                    ...prev.properties.customImage,
                                    rectCustomImage: {
                                      assetId: value,
                                      assetVersion: value ? "version_v1" : prev.properties.customImage?.rectCustomImage?.assetVersion || "",
                                      croppingCoordinates:
                                        meetsMin && w != null && h != null
                                          ? { top: 0, left: 0, width: w, height: h }
                                          : undefined,
                                    },
                                  },
                                },
                              }));
                            } else if (ctx === "squareCustomImage") {
                              const w = asset.fileMetadata?.width;
                              const h = asset.fileMetadata?.height;
                              const meetsMin =
                                w != null &&
                                h != null &&
                                w >= SQUARE_MIN_WIDTH &&
                                h >= SQUARE_MIN_HEIGHT;
                              setCurrentCreative((prev) => ({
                                ...prev,
                                properties: {
                                  ...prev.properties,
                                  customImage: {
                                    ...prev.properties.customImage,
                                    squareCustomImage: {
                                      assetId: value,
                                      assetVersion: value ? "version_v1" : prev.properties.customImage?.squareCustomImage?.assetVersion || "",
                                      croppingCoordinates:
                                        meetsMin && w != null && h != null
                                          ? { top: 0, left: 0, width: w, height: h }
                                          : undefined,
                                    },
                                  },
                                },
                              }));
                            } else if (
                              typeof ctx === "object" &&
                              ctx !== null &&
                              "arrayKey" in ctx &&
                              "index" in ctx
                            ) {
                              const { arrayKey, index } = ctx;
                              const rules =
                                arrayKey === "horizontalImages"
                                  ? { minW: RECT_MIN_WIDTH, minH: RECT_MIN_HEIGHT }
                                  : arrayKey === "squareImages"
                                    ? { minW: SQUARE_MIN_WIDTH, minH: SQUARE_MIN_HEIGHT }
                                    : { minW: VERTICAL_MIN_WIDTH, minH: VERTICAL_MIN_HEIGHT };
                              const sw = asset.fileMetadata?.width;
                              const sh = asset.fileMetadata?.height;
                              const meetsMin =
                                sw != null &&
                                sh != null &&
                                (arrayKey === "verticalImages"
                                  ? Math.max(sw, sh) >= rules.minH && Math.min(sw, sh) >= rules.minW
                                  : sw >= rules.minW && sh >= rules.minH);
                              setCurrentCreative((prev) => {
                                const images =
                                  prev.properties.customImage?.[arrayKey] || [];
                                const newImages = [...images];
                                if (!newImages[index]) {
                                  newImages[index] = { assetId: "", assetVersion: "" };
                                }
                                newImages[index] = {
                                  ...newImages[index],
                                  assetId: value,
                                  assetVersion: value ? "version_v1" : newImages[index].assetVersion || "",
                                  croppingCoordinates:
                                    meetsMin && sw != null && sh != null
                                      ? { top: 0, left: 0, width: sw, height: sh }
                                      : undefined,
                                };
                                return {
                                  ...prev,
                                  properties: {
                                    ...prev.properties,
                                    customImage: {
                                      ...prev.properties.customImage,
                                      [arrayKey]: newImages,
                                    },
                                  },
                                };
                              });
                            }
                          }}
                          accountId={parseInt(accountId, 10)}
                          channelId={channelId ?? null}
                          profileId={profileId ?? null}
                          imageOnly
                          title={
                            sdAssetPickerContext === "rectCustomImage"
                              ? "Browse rectangular image assets"
                              : sdAssetPickerContext === "squareCustomImage"
                                ? "Browse square image assets"
                                : "Browse image assets"
                          }
                        />
                      )}

                      {/* Helper function to render image array */}
                      {(() => {
                        const getArrayImageRules = (key: "squareImages" | "horizontalImages" | "verticalImages") => {
                          if (key === "horizontalImages")
                            return { minW: RECT_MIN_WIDTH, minH: RECT_MIN_HEIGHT, aspect: RECT_ASPECT_RATIO, desc: "1200×628 (~1.91:1)" };
                          if (key === "squareImages")
                            return { minW: SQUARE_MIN_WIDTH, minH: SQUARE_MIN_HEIGHT, aspect: SQUARE_ASPECT_RATIO, desc: "628×628 (1:1)" };
                          return { minW: VERTICAL_MIN_WIDTH, minH: VERTICAL_MIN_HEIGHT, aspect: VERTICAL_ASPECT_RATIO, desc: "353×628 min, 9:16 (628×1112 recommended)" };
                        };

                        const renderImageArray = (
                          arrayKey:
                            | "squareImages"
                            | "horizontalImages"
                            | "verticalImages",
                          label: string,
                          description: string,
                        ) => {
                          const images =
                            currentCreative.properties.customImage?.[
                              arrayKey
                            ] || [];
                          const rules = getArrayImageRules(arrayKey);
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
                              {images.map((img, idx) => {
                                const arrayItemErrorKey = `properties.customImage.${arrayKey}[${idx}]`;
                                const arrayItemError = errors[arrayItemErrorKey];
                                const asset = img.assetId ? assets.find((a) => a.assetId === img.assetId) : null;
                                const w = asset?.fileMetadata?.width;
                                const h = asset?.fileMetadata?.height;
                                const meetsMin =
                                  asset &&
                                  w != null &&
                                  h != null &&
                                  (arrayKey === "verticalImages"
                                    ? Math.max(w, h) >= rules.minH && Math.min(w, h) >= rules.minW
                                    : w >= rules.minW && h >= rules.minH);
                                const dimensionError =
                                  asset && w != null && h != null && !meetsMin
                                    ? `Min crop ${rules.minW}×${rules.minH} px. Current: ${w}×${h}.`
                                    : null;
                                const optionalCropHint =
                                  asset && !dimensionError && w != null && h != null
                                    ? `Image (${w}×${h}) meets min crop ${rules.minW}×${rules.minH}. Optionally crop.`
                                    : null;
                                return (
                                <div
                                  key={idx}
                                  className="mb-3 p-3 border border-[#EBEBEB] rounded-lg bg-white"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[12px] font-medium text-[#222124]">
                                        {label.slice(0, -1)} #{idx + 1}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSdAssetPickerContext({
                                            arrayKey,
                                            index: idx,
                                          })
                                        }
                                        disabled={!accountId}
                                        className="text-[11px] font-medium text-[#136D6D] hover:text-[#0e5a5a] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Browse assets
                                      </button>
                                    </div>
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
                                    <Dropdown<string>
                                      options={assets
                                        .filter((asset) => {
                                          if (!asset.assetId) return false;
                                          const isImageByAssetType =
                                            asset.assetType === "IMAGE";
                                          const isImageByContentType =
                                            asset.contentType
                                              ?.toLowerCase()
                                              .startsWith("image/");
                                          const isImageByFileMetadata =
                                            asset.fileMetadata?.contentType
                                              ?.toLowerCase()
                                              .startsWith("image/");
                                          const isImageByMediaType =
                                            asset.mediaType?.toLowerCase() ===
                                            "image";
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
                                              : asset.assetId ||
                                                `Asset ${asset.id}`,
                                        }))}
                                      value={img.assetId || ""}
                                      onChange={(value) => {
                                        const selectedAsset = value ? assets.find((a) => a.assetId === value) : null;
                                        const sw = selectedAsset?.fileMetadata?.width;
                                        const sh = selectedAsset?.fileMetadata?.height;
                                        const meetsMin =
                                          sw != null &&
                                          sh != null &&
                                          (arrayKey === "verticalImages"
                                            ? Math.max(sw, sh) >= rules.minH && Math.min(sw, sh) >= rules.minW
                                            : sw >= rules.minW && sh >= rules.minH);
                                        const newImages = [...images];
                                        newImages[idx] = {
                                          ...img,
                                          assetId: value || "",
                                          assetVersion: value ? "version_v1" : img.assetVersion || "",
                                          croppingCoordinates:
                                            meetsMin && sw != null && sh != null
                                              ? { top: 0, left: 0, width: sw, height: sh }
                                              : undefined,
                                        };
                                        handleChange("properties.customImage", {
                                          ...currentCreative.properties.customImage,
                                          [arrayKey]: newImages,
                                        });
                                      }}
                                      placeholder={
                                        assetsLoading
                                          ? "Loading..."
                                          : "Select Asset ID"
                                      }
                                      buttonClassName="edit-button w-full px-3 py-2 border border-[#EBEBEB] rounded-lg text-[13.44px] bg-white"
                                      disabled={assetsLoading}
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
                                  <p className="text-xs text-gray-400 mt-1 mb-1">
                                    Max 5MB. Min crop: {rules.desc}.
                                  </p>
                                  {dimensionError && (
                                    <p className="text-red-500 text-xs mt-1 font-medium">
                                      {dimensionError}
                                    </p>
                                  )}
                                  {arrayItemError && (
                                    <p className="text-red-500 text-xs mt-1 font-medium">
                                      {arrayItemError}
                                    </p>
                                  )}
                                  {optionalCropHint && !dimensionError && (
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                      <p className="text-[10px] text-yellow-600">
                                        {optionalCropHint}
                                      </p>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const assetId = img.assetId || "";
                                          const sel = assets.find((a) => a.assetId === assetId);
                                          let imageUrl = sel?.storageLocationUrls?.defaultUrl;
                                          if (!imageUrl && accountId && profileId && assetId) {
                                            try {
                                              const accountIdNum = parseInt(accountId, 10);
                                              if (!Number.isNaN(accountIdNum)) {
                                                const preview = await campaignsService.getAssetPreview(
                                                  accountIdNum,
                                                  assetId,
                                                  String(profileId),
                                                  channelId ?? null,
                                                );
                                                imageUrl = preview?.previewUrl || "";
                                              }
                                            } catch {
                                              imageUrl = "";
                                            }
                                          }
                                          if (!imageUrl) {
                                            setErrors((prev) => ({
                                              ...prev,
                                              [`properties.customImage.${arrayKey}[${idx}]`]: "Could not load image for cropping.",
                                            }));
                                            return;
                                          }
                                          setArrayCropModal({ arrayKey, index: idx, imageUrl });
                                        }}
                                        className="text-[10px] text-[#136D6D] hover:text-[#0e5a5a] font-medium underline"
                                      >
                                        Crop image
                                      </button>
                                    </div>
                                  )}
                                  {/* Cropping Coordinates - hidden */}
                                  {SHOW_CROPPING_COORDS_SECTIONS && <div className="mt-2" />}
                                </div>
                              );
                              })}
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
                              "Multiple vertical images (9:16 portrait, min 353×628 px)",
                            )}
                          </>
                        );
                      })()}
                    </div>
                  );
                    })()}
                  </div>
                )}

              {activePropertyTab === "background" &&
                addedPropertyTypes.has("background") && (
                  <div className="bg-[#FEFEFB] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[11.2px] font-semibold text-[#556179] uppercase">
                        Background Colors
                      </label>
                      {/* Remove button hidden per requirements */}
                    </div>
                    <div className="space-y-2">
                      {(
                        currentCreative.properties.background?.backgrounds || []
                      ).length > 0 ? (
                        (
                          currentCreative.properties.background?.backgrounds ||
                          []
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
                                        prev.properties.background
                                          ?.backgrounds || [];
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
                                        prev.properties.background
                                          ?.backgrounds || [];
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
                                    hasError
                                      ? "border-red-500"
                                      : "border-[#EBEBEB]"
                                  }`}
                                  placeholder="#RRGGBB"
                                  pattern="^#[0-9A-Fa-f]{6}$"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCurrentCreative((prev) => {
                                      const currentBackgrounds =
                                        prev.properties.background
                                          ?.backgrounds || [];
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
                        })
                      ) : (
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentCreative((prev) => ({
                                ...prev,
                                properties: {
                                  ...prev.properties,
                                  background: {
                                    backgrounds: [{ color: "#000000" }],
                                  },
                                },
                              }));
                            }}
                            className="text-[#136D6D] hover:text-[#0f5555] text-[12px] font-medium"
                          >
                            + Add Background Color
                          </button>
                        </div>
                      )}
                      {(
                        currentCreative.properties.background?.backgrounds || []
                      ).length > 0 && (
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
                      )}
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
                  <div className="bg-[#FEFEFB] p-4">
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
                                      asset.mediaType?.toLowerCase() ===
                                      "video";
                                    const isVideoByContentType =
                                      asset.contentType
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
                                        : currentCreative.properties.video
                                            ?.video?.assetVersion || "",
                                    },
                                  });
                                }}
                                placeholder={
                                  assetsLoading
                                    ? "Loading..."
                                    : "Select Asset ID"
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
                                <span className="text-gray-400">
                                  (Optional)
                                </span>
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
                                <span className="text-gray-400">
                                  (Optional)
                                </span>
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
            </div>

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

            {!editCreative && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAdd}
                  // disabled={addedCreatives.length > 0}
                  className="max-w-[300px] py-2 px-4 bg-[#136D6D] text-white rounded-lg hover:bg-[#0f5555] disabled:opacity-50 disabled:cursor-not-allowed text-[13.44px] font-medium"
                >
                  Add Creative
                </button>
              </div>
            )}
          </div>

          {/* Added Creatives Table - Only show in create mode */}
          {!editCreative && addedCreatives.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[16px] font-semibold text-[#072929] mb-4">
                Added Creatives ({addedCreatives.length})
              </h3>
              <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
                <div className="overflow-x-auto w-full max-h-60 overflow-y-auto">
                  <table className="min-w-full">
                    <thead className="sticky top-0 bg-[#fefefb] z-10">
                      <tr className="border-b border-[#e8e8e3]">
                        <th className="table-header">#</th>
                        <th className="table-header">Creative Type</th>
                        <th className="table-header">Properties</th>
                        <th className="table-header">Ad Group</th>
                        <th className="table-header">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {addedCreatives.map((creative, idx) => {
                        const creativeWithMeta = creative as CreativeInput & {
                          adGroupId?: string;
                          _submitError?: string;
                        };
                        const creativeAdGroupId = creativeWithMeta.adGroupId;
                        const adGroupName =
                          adgroups.find(
                            (ag) => String(ag.adGroupId) === creativeAdGroupId,
                          )?.name || creativeAdGroupId;
                        const rowError = creativeWithMeta._submitError;
                        const hasErrors = !!rowError;
                        return (
                          <React.Fragment key={idx}>
                            <tr
                              className={`${
                                idx !== addedCreatives.length - 1
                                  ? "border-b border-[#e8e8e3]"
                                  : ""
                              } ${hasErrors ? "bg-red-50" : ""} hover:bg-gray-50 transition-colors`}
                            >
                              <td className="table-cell table-text leading-[1.26]">
                                {idx + 1}
                              </td>
                              <td className="table-cell table-text leading-[1.26]">
                                {creative.creativeType}
                              </td>
                              <td className="table-cell table-text leading-[1.26]">
                                {Object.keys(creative.properties ?? {}).join(", ") || "—"}
                              </td>
                              <td className="table-cell table-text leading-[1.26]">
                                {creativeAdGroupId ? adGroupName : "—"}
                              </td>
                              <td className="table-cell">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditFromList(idx)}
                                    className="text-[#136D6D] hover:text-[#0e5a5a] transition-colors"
                                    title="Edit this creative"
                                  >
                                    <svg
                                      className="w-4 h-4 shrink-0"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                      />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemove(idx)}
                                    className="text-red-500 hover:text-red-700 transition-colors"
                                    title="Remove"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {hasErrors && (
                              <tr
                                className={
                                  idx !== addedCreatives.length - 1
                                    ? "border-b border-[#e8e8e3]"
                                    : ""
                                }
                              >
                                <td
                                  colSpan={5}
                                  className="px-4 py-2 bg-red-50"
                                >
                                  <p className="text-[11px] text-red-600 whitespace-pre-wrap">
                                    {rowError}
                                  </p>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
                loading ||
                (editCreative
                  ? false
                  : addedCreatives.length === 0 && !hasAtLeastOneFilledTab())
              }
              className="apply-button"
            >
              {loading
                ? editCreative
                  ? "Updating..."
                  : "Creating..."
                : editCreative
                  ? "Update"
                  : `Create ${addedCreatives.length} Creative(s)`}
            </button>
          </div>
        </div>
      </div>

      {/* Brand Logo Crop Modal (SD Creatives: min 600×100, aspect 6:1) */}
      <ImageCropModal
        isOpen={brandLogoCropModalOpen}
        onClose={() => {
          setBrandLogoCropModalOpen(false);
          setBrandLogoCropImageUrl("");
        }}
        imageUrl={brandLogoCropImageUrl}
        requiredWidth={BRAND_LOGO_MIN_WIDTH}
        requiredHeight={BRAND_LOGO_MIN_HEIGHT}
        title="Crop Brand Logo"
        onConfirm={(crop: CropCoordinates) => {
          handleChange("properties.brandLogo", {
            ...currentCreative.properties.brandLogo,
            croppingCoordinates: crop,
          });
          setBrandLogoCropModalOpen(false);
          setBrandLogoCropImageUrl("");
        }}
      />

      {/* Rect Custom Image Crop Modal (min 1200×628, aspect ~1.91:1) */}
      <ImageCropModal
        isOpen={rectCropModalOpen}
        onClose={() => {
          setRectCropModalOpen(false);
          setRectCropImageUrl("");
        }}
        imageUrl={rectCropImageUrl}
        requiredWidth={RECT_MIN_WIDTH}
        requiredHeight={RECT_MIN_HEIGHT}
        title="Crop Rectangular Custom Image"
        onConfirm={(crop: CropCoordinates) => {
          handleChange("properties.customImage", {
            ...currentCreative.properties.customImage,
            rectCustomImage: {
              ...currentCreative.properties.customImage?.rectCustomImage,
              croppingCoordinates: crop,
            },
          });
          setRectCropModalOpen(false);
          setRectCropImageUrl("");
        }}
      />

      {/* Square Custom Image Crop Modal (628×628, 1:1) */}
      <ImageCropModal
        isOpen={squareCropModalOpen}
        onClose={() => {
          setSquareCropModalOpen(false);
          setSquareCropImageUrl("");
        }}
        imageUrl={squareCropImageUrl}
        requiredWidth={SQUARE_MIN_WIDTH}
        requiredHeight={SQUARE_MIN_HEIGHT}
        title="Crop Square Custom Image"
        onConfirm={(crop: CropCoordinates) => {
          handleChange("properties.customImage", {
            ...currentCreative.properties.customImage,
            squareCustomImage: {
              ...currentCreative.properties.customImage?.squareCustomImage,
              croppingCoordinates: crop,
            },
          });
          setSquareCropModalOpen(false);
          setSquareCropImageUrl("");
        }}
      />

      {/* Optional array crop modal (squareImages / horizontalImages / verticalImages) */}
      {arrayCropModal && (
        <ImageCropModal
          isOpen={true}
          onClose={() => setArrayCropModal(null)}
          imageUrl={arrayCropModal.imageUrl}
          requiredWidth={
            arrayCropModal.arrayKey === "horizontalImages"
              ? RECT_MIN_WIDTH
              : arrayCropModal.arrayKey === "squareImages"
                ? SQUARE_MIN_WIDTH
                : VERTICAL_MIN_WIDTH
          }
          requiredHeight={
            arrayCropModal.arrayKey === "horizontalImages"
              ? RECT_MIN_HEIGHT
              : arrayCropModal.arrayKey === "squareImages"
                ? SQUARE_MIN_HEIGHT
                : VERTICAL_MIN_HEIGHT
          }
          title={
            arrayCropModal.arrayKey === "horizontalImages"
              ? "Crop Horizontal Image"
              : arrayCropModal.arrayKey === "squareImages"
                ? "Crop Square Image"
                : "Crop Vertical Image"
          }
          onConfirm={(crop: CropCoordinates) => {
            const { arrayKey, index } = arrayCropModal;
            const images = currentCreative.properties.customImage?.[arrayKey] || [];
            const newImages = [...images];
            if (newImages[index]) {
              // Round to integers so API receives whole pixels (avoids e.g. 352 from truncation)
              const rounded: CropCoordinates = {
                top: Math.round(Number(crop.top) || 0),
                left: Math.round(Number(crop.left) || 0),
                width: Math.round(Number(crop.width) || 0),
                height: Math.round(Number(crop.height) || 0),
              };
              newImages[index] = { ...newImages[index], croppingCoordinates: rounded };
            }
            handleChange("properties.customImage", {
              ...currentCreative.properties.customImage,
              [arrayKey]: newImages,
            });
            setArrayCropModal(null);
          }}
        />
      )}
    </div>
  );
};
