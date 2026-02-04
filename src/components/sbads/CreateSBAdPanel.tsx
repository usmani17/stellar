import React, { useState, useEffect } from "react";
import { Dropdown } from "../ui/Dropdown";
import { Checkbox } from "../ui/Checkbox";
import { Loader } from "../ui/Loader";
import { ImageCropModal, type CropCoordinates } from "../ui/ImageCropModal";
import { AssetPickerPopup } from "../ui/AssetPickerPopup";
import { campaignsService } from "../../services/campaigns";
import type { Asset } from "../campaigns/AssetsTable";

export interface SBAdInput {
  name: string;
  state: "ENABLED" | "PAUSED";
  adGroupId: string;
  adType?: "IMAGE" | "VIDEO"; // New field for ad type
  videoAdType?: "PRODUCT" | "BRAND"; // For VIDEO ads: PRODUCT or BRAND
  /** Landing page: either url (simple/Store/custom page) or asins (product list). Mutually exclusive. Brand video ads only support Store page (url). */
  landingPage?: {
    asins?: string[];
    pageType?: "PRODUCT_LIST" | "STORE" | "CUSTOM_URL" | "DETAIL_PAGE";
    url?: string;
  };
  creative?: {
    brandLogoCrop?: {
      top: number;
      left: number;
      width: number;
      height: number;
    };
    asins?: string[];
    brandName?: string;
    brandLogoAssetID?: string;
    headline?: string;
    consentToTranslate?: boolean;
    creativePropertiesToOptimize?: string[];
    customImages?: Array<{
      assetId?: string;
      url?: string;
      crop?: {
        top: number;
        left: number;
        width: number;
        height: number;
      };
    }>;
    // Video ad fields
    videoAssetIds?: string[];
  };
}

interface CreateSBAdPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ads: SBAdInput[]) => void;
  adgroups: Array<{ adGroupId: string; name: string }>;
  campaignId: string;
  accountId?: number;
  profileId?: string; // Profile ID to filter assets
  channelId?: string | number | null;
  loading?: boolean;
  submitError?: string | null;
  fieldErrors?: Record<string, string>;
  createdAds?: Array<SBAdInput & { adId?: string; index?: number }>;
  failedCount?: number;
  failedAds?: Array<{
    index: number;
    ad: SBAdInput;
    errors: Array<{ field?: string; message: string }>;
  }>;
}

const STATE_OPTIONS = [
  { value: "ENABLED", label: "ENABLED" },
  { value: "PAUSED", label: "PAUSED" },
];

const AD_TYPE_OPTIONS = [
  { value: "IMAGE", label: "Image" },
  { value: "VIDEO", label: "Video" },
];

const VIDEO_AD_TYPE_OPTIONS = [
  { value: "PRODUCT", label: "Product Video" },
  { value: "BRAND", label: "Brand Video" },
];

const LANDING_PAGE_TYPE_OPTIONS = [
  { value: "STORE", label: "Store (URL)" },
  { value: "CUSTOM_URL", label: "Custom URL" },
  { value: "PRODUCT_LIST", label: "Product list (ASINs)" },
  { value: "DETAIL_PAGE", label: "Detail page (ASINs)" },
];

const CREATIVE_PROPERTIES_OPTIONS = [{ value: "HEADLINE", label: "HEADLINE" }];

export const CreateSBAdPanel: React.FC<CreateSBAdPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  adgroups,
  accountId,
  profileId,
  channelId,
  loading = false,
  submitError = null,
  fieldErrors = {},
  createdAds = [],
  failedCount = 0,
  failedAds = [],
}) => {
  // Generate default ad name
  const generateDefaultAdName = (): string => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const milliseconds = String(now.getMilliseconds()).padStart(3, "0");

    const dateTime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}.${milliseconds}`;
    return `SB Ad - ${dateTime}`;
  };

  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);

  const [currentAd, setCurrentAd] = useState<SBAdInput>({
    name: generateDefaultAdName(),
    state: "ENABLED",
    adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
    adType: "IMAGE",
    videoAdType: "PRODUCT",
    landingPage: {
      asins: [],
      pageType: "CUSTOM_URL",
      url: "",
    },
    creative: {
      brandLogoCrop: { top: 0, left: 0, width: 100, height: 100 },
      asins: ["", "", ""],
      brandName: "",
      brandLogoAssetID: "",
      headline: "",
      consentToTranslate: false,
      creativePropertiesToOptimize: [],
      customImages: [],
      videoAssetIds: [],
    },
  });

  // Fetch assets when component opens
  useEffect(() => {
    if (isOpen && accountId) {
      loadAssets();
    }
  }, [isOpen, accountId, profileId, channelId]);

  // Update adGroupId when adgroups are loaded
  useEffect(() => {
    if (adgroups.length > 0 && !currentAd.adGroupId) {
      setCurrentAd((prev) => ({
        ...prev,
        adGroupId: adgroups[0].adGroupId || "",
      }));
    }
  }, [adgroups]);

  const loadAssets = async () => {
    if (!accountId) return;

    try {
      setAssetsLoading(true);
      const data = await campaignsService.getAssets(
        accountId,
        {
          page: 1,
          page_size: 100, // Get all assets for dropdown
          ...(profileId && { profileId }), // Include profileId if available to filter assets
        },
        channelId ?? null,
      );
      setAssets(data.assets || []);
    } catch (error) {
      console.error("Failed to load assets:", error);
      setAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  };

  const [addedAds, setAddedAds] = useState<SBAdInput[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [videoAssetSearch, setVideoAssetSearch] = useState<string>("");
  /** Brand Logo Crop accordion: closed by default. Crop is optional; if not supplied, defaults to whole image. */
  const [isBrandLogoCropExpanded, setIsBrandLogoCropExpanded] =
    useState<boolean>(false);
  /** Custom image crop accordions: per-image index, closed by default. */
  const [customImageCropExpandedIndices, setCustomImageCropExpandedIndices] =
    useState<Set<number>>(new Set());
  /** True when the form holds an ad that was loaded for re-editing (so we put it back when editing another ad). */
  const [formHasReEditedAd, setFormHasReEditedAd] = useState(false);
  /** Track custom image dimension warnings: index -> warning message */
  const [customImageWarnings, setCustomImageWarnings] = useState<
    Record<number, string>
  >({});
  /** Crop modal: which image index and URL */
  const [cropModalState, setCropModalState] = useState<{
    isOpen: boolean;
    imageIndex: number;
    imageUrl: string;
  }>({ isOpen: false, imageIndex: 0, imageUrl: "" });
  /** Brand logo crop modal */
  const [brandLogoCropModalOpen, setBrandLogoCropModalOpen] = useState(false);
  const [brandLogoCropImageUrl, setBrandLogoCropImageUrl] = useState("");
  /** Brand logo dimension error when < 400x400 */
  const [brandLogoDimensionError, setBrandLogoDimensionError] = useState<
    string | null
  >(null);
  /** Brand logo optional crop hint when > 400x400 */
  const [brandLogoOptionalCropHint, setBrandLogoOptionalCropHint] = useState<
    string | null
  >(null);
  /** Brand logo asset picker popup (browse assets) */
  const [brandLogoAssetPickerOpen, setBrandLogoAssetPickerOpen] =
    useState(false);
  /** Custom image asset picker: index of the custom image row being browsed, or null if closed */
  const [customImageAssetPickerIndex, setCustomImageAssetPickerIndex] =
    useState<number | null>(null);

  // Re-check brand logo dimensions when brand logo asset or assets list changes (e.g. when loading ad for edit)
  useEffect(() => {
    const assetId = currentAd.creative?.brandLogoAssetID?.trim();
    if (!assetId) {
      setBrandLogoDimensionError(null);
      setBrandLogoOptionalCropHint(null);
      return;
    }
    const selectedAsset = assets.find((a) => a.assetId === assetId);
    if (
      selectedAsset?.fileMetadata?.width != null &&
      selectedAsset?.fileMetadata?.height != null
    ) {
      const width = selectedAsset.fileMetadata.width;
      const height = selectedAsset.fileMetadata.height;
      const BRAND_LOGO_MIN = 400;
      if (width < BRAND_LOGO_MIN || height < BRAND_LOGO_MIN) {
        setBrandLogoDimensionError(
          `Brand logo must be at least 400×400 pixels. Current: ${width}×${height}. Please select a larger image.`,
        );
        setBrandLogoOptionalCropHint(null);
      } else {
        setBrandLogoDimensionError(null);
        setBrandLogoOptionalCropHint(
          `Image (${width}×${height}) is larger than 400×400. Optionally crop for best results.`,
        );
      }
    } else {
      setBrandLogoDimensionError(null);
      setBrandLogoOptionalCropHint(null);
    }
  }, [currentAd.creative?.brandLogoAssetID, assets]);

  // On partial success (some ads created, some failed), remove successfully created ads from the list
  useEffect(() => {
    if (failedAds.length > 0 && createdAds.length > 0) {
      const sortedFailed = [...failedAds].sort(
        (a, b) => Number(a.index) - Number(b.index),
      );
      const failedOnly = sortedFailed.map((f) => f.ad);
      setAddedAds(failedOnly);
    }
  }, [failedAds, createdAds]);

  const handleChange = (field: string, value: any) => {
    if (field.includes(".")) {
      // Handle nested fields
      const [parent, child, grandchild] = field.split(".");
      setCurrentAd((prev) => {
        const updated = { ...prev };
        if (grandchild) {
          // Three levels deep (e.g., creative.brandLogoCrop.top)
          updated[parent as keyof SBAdInput] = {
            ...(updated[parent as keyof SBAdInput] as any),
            [child]: {
              ...((updated[parent as keyof SBAdInput] as any)?.[child] || {}),
              [grandchild]: value,
            },
          };
        } else {
          // Two levels deep (e.g., landingPage.url)
          updated[parent as keyof SBAdInput] = {
            ...(updated[parent as keyof SBAdInput] as any),
            [child]: value,
          };
        }
        return updated;
      });
    } else {
      setCurrentAd((prev) => ({ ...prev, [field]: value }));
    }
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleArrayChange = (field: string, index: number, value: string) => {
    setCurrentAd((prev) => {
      const updated = { ...prev };
      const [parent, child] = field.split(".");
      const array = (updated[parent as keyof SBAdInput] as any)?.[child] || [];
      const newArray = [...array];
      newArray[index] = value;
      (updated[parent as keyof SBAdInput] as any) = {
        ...(updated[parent as keyof SBAdInput] as any),
        [child]: newArray,
      };
      return updated;
    });
  };

  const handleAddArrayItem = (field: string) => {
    setCurrentAd((prev) => {
      const updated = { ...prev };
      const [parent, child] = field.split(".");
      const array = (updated[parent as keyof SBAdInput] as any)?.[child] || [];
      // Limit creative.asins to 3 items
      if (field === "creative.asins" && array.length >= 3) {
        return updated;
      }
      (updated[parent as keyof SBAdInput] as any) = {
        ...(updated[parent as keyof SBAdInput] as any),
        [child]: [...array, ""],
      };
      return updated;
    });
  };

  const handleRemoveArrayItem = (field: string, index: number) => {
    setCurrentAd((prev) => {
      const updated = { ...prev };
      const [parent, child] = field.split(".");
      const array = (updated[parent as keyof SBAdInput] as any)?.[child] || [];
      const newArray = array.filter((_: any, i: number) => i !== index);
      (updated[parent as keyof SBAdInput] as any) = {
        ...(updated[parent as keyof SBAdInput] as any),
        [child]: newArray,
      };
      return updated;
    });
  };

  const handleAddCustomImage = () => {
    setCurrentAd((prev) => {
      const updated = { ...prev };
      updated.creative = {
        ...updated.creative,
        customImages: [
          ...(updated.creative?.customImages || []),
          {
            assetId: "",
            url: "",
            crop: {
              top: 0,
              left: 0,
              width: 100,
              height: 100,
            },
          },
        ],
      };
      return updated;
    });
  };

  const handleRemoveCustomImage = (index: number) => {
    setCurrentAd((prev) => {
      const updated = { ...prev };
      updated.creative = {
        ...updated.creative,
        customImages: (updated.creative?.customImages || []).filter(
          (_, i) => i !== index,
        ),
      };
      return updated;
    });
    setCustomImageCropExpandedIndices((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i < index) next.add(i);
        if (i > index) next.add(i - 1);
      });
      return next;
    });
  };

  const handleCustomImageChange = (
    index: number,
    field: string,
    value: any,
  ) => {
    setCurrentAd((prev) => {
      const updated = { ...prev };
      const images = [...(updated.creative?.customImages || [])];
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        if (parent === "crop") {
          // Merge with existing crop and defaults so we don't lose other fields; allow 0 for any coordinate
          const existing = (images[index] as any)?.crop;
          const defaults = { top: 0, left: 0, width: 100, height: 100 };
          images[index] = {
            ...images[index],
            crop: {
              ...defaults,
              ...existing,
              [child]: value,
            },
          };
        } else {
          images[index] = {
            ...images[index],
            [parent]: {
              ...(images[index] as any)[parent],
              [child]: value,
            },
          };
        }
      } else {
        images[index] = {
          ...images[index],
          [field]: value,
        };
      }
      updated.creative = {
        ...updated.creative,
        customImages: images,
      };
      return updated;
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!currentAd.name.trim()) {
      newErrors.name = "Ad name is required";
    }

    if (!currentAd.adGroupId) {
      newErrors.adGroupId = "Ad Group is required";
    }

    // Validate Brand Name - required for all ad types
    if (
      !currentAd.creative?.brandName ||
      !currentAd.creative.brandName.trim()
    ) {
      newErrors.brandName = "Brand name is required";
    }

    // Validate Brand Logo Asset ID and Headline - required for all ad types
    if (
      !currentAd.creative?.brandLogoAssetID ||
      !currentAd.creative.brandLogoAssetID.trim()
    ) {
      newErrors.brandLogoAssetID = "Brand logo asset ID is required";
    } else if (brandLogoDimensionError) {
      newErrors.brandLogoAssetID = brandLogoDimensionError;
    }

    if (!currentAd.creative?.headline || !currentAd.creative.headline.trim()) {
      newErrors.headline = "Headline is required";
    }

    // Check for custom image dimension warnings (undersized images)
    const hasUndersizedImages = Object.values(customImageWarnings).some(
      (warning) => warning.includes("below"),
    );
    if (hasUndersizedImages) {
      newErrors.customImages =
        "One or more custom images have dimensions below the minimum required (1200x628). Please select larger images.";
    }

    // Validate custom image crop coordinates for images that need cropping
    const customImages = currentAd.creative?.customImages || [];
    customImages.forEach((image, index) => {
      if (image.assetId) {
        const asset = assets.find((a) => a.assetId === image.assetId);
        if (
          asset?.fileMetadata?.width != null &&
          asset?.fileMetadata?.height != null
        ) {
          const imgWidth = asset.fileMetadata.width;
          const imgHeight = asset.fileMetadata.height;
          // If image is larger than 1200x628, validate crop coordinates
          if (imgWidth > 1200 || imgHeight > 628) {
            const crop = image.crop;
            const requiredAspect = 1200 / 628;
            const cropAspect = crop ? crop.width / crop.height : 0;
            const aspectMatches =
              crop && Math.abs(cropAspect - requiredAspect) < 0.01;
            if (!crop || !aspectMatches) {
              if (!newErrors.customImages) {
                newErrors.customImages = `Image ${index + 1} requires crop coordinates with 1200×628 aspect ratio. Use "Crop Image" to set.`;
              }
            }
            // Validate crop doesn't exceed image bounds
            if (crop) {
              if (
                crop.left < 0 ||
                crop.top < 0 ||
                crop.left + crop.width > imgWidth ||
                crop.top + crop.height > imgHeight
              ) {
                if (!newErrors.customImages) {
                  newErrors.customImages = `Image ${index + 1} crop coordinates exceed image boundaries.`;
                }
              }
            }
          }
        }
      }
    });

    // Validate Creative ASINs - at least one required, max 3
    const creativeAsins = currentAd.creative?.asins || [];
    const validAsins = creativeAsins.filter((a) => a && a.trim());
    if (validAsins.length === 0) {
      newErrors.creativeAsins = "At least one ASIN is required";
    }
    if (creativeAsins.length > 3) {
      newErrors.creativeAsins = "Maximum 3 ASINs allowed";
    }

    // Validate video ads
    if (currentAd.adType === "VIDEO") {
      if (!currentAd.videoAdType) {
        newErrors.videoAdType = "Video ad type is required";
      }
      if (
        !currentAd.creative?.videoAssetIds ||
        currentAd.creative.videoAssetIds.length === 0
      ) {
        newErrors.videoAssetIds =
          "At least one video asset ID is required for video ads";
      }
      // Brand video ads only support Store page (url); asins not allowed
      if (currentAd.videoAdType === "BRAND") {
        if (!currentAd.landingPage?.url?.trim()) {
          newErrors.landingPageUrl =
            "Landing page URL is required for brand video ads (Store page only)";
        }
      }
    }

    // Landing page: pageType required. url and asins mutually exclusive per pageType. At least one (url or asins) required.
    if (currentAd.adType !== "VIDEO" || currentAd.videoAdType !== "BRAND") {
      const pageType = currentAd.landingPage?.pageType;
      const hasUrl = Boolean(currentAd.landingPage?.url?.trim());
      const asinsList = (currentAd.landingPage?.asins || []).filter((a) =>
        a.trim(),
      );
      const hasAsins = asinsList.length > 0;

      if (!pageType) {
        newErrors.landingPage = "Landing page type is required";
      } else if (pageType === "STORE" || pageType === "CUSTOM_URL") {
        if (hasAsins) {
          newErrors.landingPage =
            "ASINs not allowed for this landing page type. Use URL only.";
        }
        if (!hasUrl) {
          newErrors.landingPage =
            newErrors.landingPage ||
            "Landing page URL is required for Store or Custom URL";
        }
      } else if (pageType === "PRODUCT_LIST" || pageType === "DETAIL_PAGE") {
        if (hasUrl) {
          newErrors.landingPage =
            "Invalid landing page configuration for " +
            pageType +
            ". Use ASINs only, not URL.";
        }
        if (!hasAsins) {
          newErrors.landingPageAsins =
            "At least one ASIN is required for " + pageType;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddAd = () => {
    if (!validate()) {
      return;
    }

    // Clean up empty arrays and optional fields
    const cleanedAd: SBAdInput = {
      name: currentAd.name,
      state: currentAd.state,
      adGroupId: currentAd.adGroupId,
      adType: currentAd.adType,
      videoAdType: currentAd.videoAdType,
    };

    // Add landingPage per API: pageType required. Only url OR only asins — never both. Mutual exclusivity by pageType.
    if (currentAd.landingPage?.pageType) {
      const pageType = currentAd.landingPage.pageType;
      if (pageType === "STORE" || pageType === "CUSTOM_URL") {
        const url = currentAd.landingPage.url?.trim();
        if (url) {
          cleanedAd.landingPage = { pageType, url };
          // Do not include asins
        }
      } else if (pageType === "PRODUCT_LIST" || pageType === "DETAIL_PAGE") {
        const asins = (currentAd.landingPage.asins || []).filter((a) =>
          a.trim(),
        );
        if (asins.length > 0) {
          cleanedAd.landingPage = { pageType, asins };
          // Do not include url
        }
      }
    }

    // Add creative if it has any data
    if (currentAd.creative) {
      const creative: any = {};
      let hasCreativeData = false;

      if (
        currentAd.creative.brandLogoCrop &&
        (currentAd.creative.brandLogoCrop.top !== 0 ||
          currentAd.creative.brandLogoCrop.left !== 0 ||
          currentAd.creative.brandLogoCrop.width !== 100 ||
          currentAd.creative.brandLogoCrop.height !== 100)
      ) {
        creative.brandLogoCrop = currentAd.creative.brandLogoCrop;
        hasCreativeData = true;
      }

      if (
        currentAd.creative.asins &&
        currentAd.creative.asins.filter((a) => a.trim()).length > 0
      ) {
        creative.asins = currentAd.creative.asins.filter((a) => a.trim());
        hasCreativeData = true;
      }

      if (currentAd.creative.brandName?.trim()) {
        creative.brandName = currentAd.creative.brandName;
        hasCreativeData = true;
      }

      if (currentAd.creative.brandLogoAssetID?.trim()) {
        creative.brandLogoAssetID = currentAd.creative.brandLogoAssetID;
        hasCreativeData = true;
      }

      if (currentAd.creative.headline?.trim()) {
        creative.headline = currentAd.creative.headline;
        hasCreativeData = true;
      }

      if (currentAd.creative.consentToTranslate !== undefined) {
        creative.consentToTranslate = currentAd.creative.consentToTranslate;
        hasCreativeData = true;
      }

      if (
        currentAd.creative.creativePropertiesToOptimize &&
        currentAd.creative.creativePropertiesToOptimize.length > 0
      ) {
        creative.creativePropertiesToOptimize =
          currentAd.creative.creativePropertiesToOptimize;
        hasCreativeData = true;
      }

      if (
        currentAd.creative.customImages &&
        currentAd.creative.customImages.length > 0
      ) {
        const validImages = currentAd.creative.customImages.filter(
          (img) => img.assetId?.trim() || img.url?.trim(),
        );
        if (validImages.length > 0) {
          creative.customImages = validImages.map((img) => {
            const imageObj: any = {};
            if (img.assetId?.trim()) imageObj.assetId = img.assetId.trim();
            if (img.url?.trim()) imageObj.url = img.url.trim();
            if (img.crop) {
              imageObj.crop = img.crop;
            }
            return imageObj;
          });
          hasCreativeData = true;
        }
      }

      // Handle video ads
      if (
        currentAd.creative.videoAssetIds &&
        currentAd.creative.videoAssetIds.length > 0
      ) {
        creative.videoAssetIds = currentAd.creative.videoAssetIds.filter((id) =>
          id.trim(),
        );
        hasCreativeData = true;
      }

      if (hasCreativeData) {
        cleanedAd.creative = creative;
      }
    }

    // Add ad to the list
    setAddedAds((prev) => [...prev, cleanedAd]);

    // Reset form for next ad
    setIsBrandLogoCropExpanded(false);
    setCustomImageCropExpandedIndices(new Set());
    setCustomImageWarnings({});
    setCurrentAd({
      name: generateDefaultAdName(),
      state: "ENABLED",
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      adType: "IMAGE", // Reset to IMAGE - form is editable by default
      videoAdType: "PRODUCT", // Reset to default
      landingPage: {
        asins: [],
        pageType: "CUSTOM_URL",
        url: "",
      },
      creative: {
        brandLogoCrop: {
          top: 0,
          left: 0,
          width: 100,
          height: 100,
        },
        asins: ["", "", ""], // Initialize with 3 empty strings for 3 ASIN fields
        brandName: "",
        brandLogoAssetID: "",
        headline: "",
        consentToTranslate: false,
        creativePropertiesToOptimize: [],
        customImages: [],
        videoAssetIds: [],
      },
    });
    setErrors({});
    setFormHasReEditedAd(false);
  };

  const handleRemoveAd = (index: number) => {
    setAddedAds((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditAd = (index: number) => {
    const adToEdit = addedAds[index];
    if (formHasReEditedAd) {
      // Put current form (previously edited ad with updates) back into the list, then remove the clicked ad
      setAddedAds((prev) => {
        const withoutClicked = prev.filter((_, i) => i !== index);
        return [...withoutClicked, currentAd];
      });
    } else {
      setAddedAds((prev) => prev.filter((_, i) => i !== index));
    }
    setCurrentAd(adToEdit);
    setFormHasReEditedAd(true);
    setErrors({});
    setTimeout(() => {
      const panel = document.querySelector('[data-panel="create-sb-ad"]');
      if (panel) {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const handleSubmit = () => {
    if (addedAds.length === 0) {
      alert("Please add at least one ad before submitting.");
      return;
    }

    onSubmit(addedAds);
  };

  const handleCancel = () => {
    setAddedAds([]);
    setFormHasReEditedAd(false);
    setIsBrandLogoCropExpanded(false);
    setCustomImageCropExpandedIndices(new Set());
    setCustomImageWarnings({});
    setBrandLogoDimensionError(null);
    setBrandLogoOptionalCropHint(null);
    setCurrentAd({
      name: "",
      state: "ENABLED",
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      adType: "IMAGE", // Default to IMAGE
      videoAdType: "PRODUCT",
      landingPage: {
        asins: [],
        pageType: "CUSTOM_URL",
        url: "",
      },
      creative: {
        brandLogoCrop: {
          top: 0,
          left: 0,
          width: 100,
          height: 100,
        },
        asins: ["", "", ""], // Initialize with 3 empty strings for 3 ASIN fields
        brandName: "",
        brandLogoAssetID: "",
        headline: "",
        consentToTranslate: false,
        creativePropertiesToOptimize: [],
        customImages: [],
        videoAssetIds: [],
      },
    });
    setErrors({});
    onClose();
  };

  const handleFillTestData = () => {
    // Use exact test data as provided (matches Postman working request)
    // Support both image and video ads based on current ad type
    const isVideo = currentAd.adType === "VIDEO";

    // Use provided adGroupId if it exists in the list, otherwise use first available
    const testAdGroupId = "345267636818439";
    const adGroupId = adgroups.find((ag) => ag.adGroupId === testAdGroupId)
      ? testAdGroupId
      : adgroups[0]?.adGroupId || "";

    if (isVideo) {
      // Video ad test data
      setCurrentAd({
        name: `Test Video SB Ad - ${new Date().toLocaleString()}`,
        state: "ENABLED" as const,
        adGroupId,
        adType: "VIDEO" as const,
        landingPage: {
          pageType: "PRODUCT_LIST" as const,
          asins: ["B09PVMBNT4"],
        },
        creative: {
          asins: ["B09PVMBNT4"],
          consentToTranslate: true,
          videoAssetIds: [
            "amzn1.assetlibrary.asset1.ddbc2868d036a471a166bc5cce31b866",
          ],
        },
      });
    } else {
      // Image ad test data
      setCurrentAd({
        name: `Test Image SB Ad - ${new Date().toLocaleString()}`,
        state: "ENABLED" as const,
        adGroupId,
        adType: "IMAGE" as const,
        landingPage: {
          pageType: "PRODUCT_LIST" as const,
          asins: ["B09PVMBNT4", "B09PVMBNT4", "B09PVMBNT4"],
        },
        creative: {
          brandLogoCrop: {
            top: 0,
            left: 0,
            width: 401,
            height: 401,
          },
          asins: ["B09PVMBNT4"],
          brandName: "Test Brand",
          brandLogoAssetID:
            "amzn1.assetlibrary.asset1.c5c3fd754ca1c4d389d9bbbd7348ac10",
          headline: "Shop Our Best Products",
          consentToTranslate: true,
          creativePropertiesToOptimize: ["HEADLINE"],
          customImages: [
            {
              assetId:
                "amzn1.assetlibrary.asset1.c5c3fd754ca1c4d389d9bbbd7348ac10",
              url: "https://example.com/test-image.png",
              crop: {
                top: 5,
                left: 5,
                width: 90,
                height: 90,
              },
            },
          ],
        },
      });
    }

    // Clear any errors
    setErrors({});
  };

  const getJsonPreview = () => {
    return JSON.stringify({ ads: addedAds }, null, 2);
  };

  const getAdGroupName = (adGroupId: string) => {
    const adgroup = adgroups.find((ag) => ag.adGroupId === adGroupId);
    return adgroup?.name || adGroupId;
  };

  if (!isOpen) return null;

  return (
    <div className="create-panel relative" data-panel="create-sb-ad">
      {/* Loading overlay when creating SB ads */}
      {loading && (
        <div className="loading-overlay rounded-xl z-10">
          <div className="loading-overlay-content">
            <Loader size="md" message="Creating ads..." />
          </div>
        </div>
      )}
      {/* Form */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-[#072929]">
            Create SB Extended Product Collection Ads
          </h2>
          <button
            type="button"
            onClick={() => setShowJsonPreview(!showJsonPreview)}
            className="text-[11.2px] text-[#136D6D] hover:text-[#0e5a5a]"
          >
            {showJsonPreview ? "Hide" : "Show"} JSON Preview
          </button>
        </div>

        {/* JSON Preview */}
        {showJsonPreview && addedAds.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <pre className="text-[10px] text-gray-700 overflow-auto max-h-64">
              {getJsonPreview()}
            </pre>
          </div>
        )}

        {/* Basic Fields */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {/* Ad Name */}
          <div>
            <label className="form-label-small">Ad Name *</label>
            <input
              type="text"
              value={currentAd.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter ad name"
              className={`w-full campaign-input px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                errors.name ? "border-red-500" : "border-gray-200"
              }`}
            />
            {errors.name && (
              <p className="text-[10px] text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Ad Group */}
          <div>
            <label className="form-label-small">Ad Group *</label>
            <Dropdown<string>
              options={adgroups.map((ag) => ({
                value: ag.adGroupId,
                label: ag.name || ag.adGroupId || "Unnamed Ad Group",
              }))}
              value={currentAd.adGroupId}
              onChange={(value) => handleChange("adGroupId", value)}
              placeholder={
                adgroups.length === 0
                  ? "No ad groups available"
                  : "Select ad group"
              }
              buttonClassName="edit-button w-full"
              disabled={adgroups.length === 0}
              emptyMessage={
                adgroups.length === 0
                  ? "No ad groups available. Please create an ad group first."
                  : "No options available"
              }
            />
            {errors.adGroupId && (
              <p className="text-[10px] text-red-500 mt-1">
                {errors.adGroupId}
              </p>
            )}
          </div>

          {/* State */}
          <div>
            <label className="form-label-small">State *</label>
            <Dropdown<string>
              options={STATE_OPTIONS}
              value={currentAd.state}
              onChange={(value) =>
                handleChange("state", value as "ENABLED" | "PAUSED")
              }
              placeholder="Select state"
              buttonClassName="edit-button w-full"
            />
          </div>

          {/* Ad Type */}
          <div>
            <label className="form-label-small">Ad Type *</label>
            <Dropdown<string>
              options={AD_TYPE_OPTIONS}
              value={currentAd.adType || "IMAGE"}
              onChange={(value) => {
                handleChange("adType", value as "IMAGE" | "VIDEO");
                // Reset creative fields when switching types
                if (value === "VIDEO") {
                  setCurrentAd((prev) => ({
                    ...prev,
                    adType: "VIDEO",
                    creative: {
                      ...prev.creative,
                      videoAssetIds: [],
                      customImages: undefined,
                    },
                  }));
                } else {
                  setCurrentAd((prev) => ({
                    ...prev,
                    adType: "IMAGE",
                    creative: {
                      ...prev.creative,
                      videoAssetIds: undefined,
                      customImages: prev.creative?.customImages || [],
                    },
                  }));
                }
              }}
              placeholder="Select ad type"
              buttonClassName="edit-button w-full"
            />
          </div>
          {/* Ad Type - Hidden */}
          {/* <div>
            <label className="form-label-small">
              Ad Type *
            </label>
            <Dropdown<string>
              options={AD_TYPE_OPTIONS}
              value={currentAd.adType || "IMAGE"}
              onChange={(value) => {
                handleChange("adType", value as "IMAGE" | "VIDEO");
                // Reset creative fields when switching types
                if (value === "VIDEO") {
                  setCurrentAd((prev) => ({
                    ...prev,
                    adType: "VIDEO",
                    videoAdType: "PRODUCT", // Reset to PRODUCT when switching to video
                    creative: {
                      ...prev.creative,
                      videoAssetIds: [],
                      asins: prev.creative?.asins || [],
                      consentToTranslate: prev.creative?.consentToTranslate || false,
                    },
                  }));
                } else {
                  setCurrentAd((prev) => ({
                    ...prev,
                    adType: "IMAGE",
                    creative: {
                      ...prev.creative,
                      videoAssetIds: undefined,
                    },
                  }));
                }
              }}
              placeholder="Select ad type"
              buttonClassName="edit-button w-full"
            />
          </div> */}
        </div>

        {/* Creative Section */}
        <div className="mb-4 pt-4 border-t border-gray-200">
          <h3 className="section-title mb-4">Creative *</h3>

          {/* Prioritized Fields at the beginning */}
          <div className="mb-6 grid grid-cols-3 gap-6">
            {/* Brand Name */}
            <div>
              <label className="form-label-small">Brand Name *</label>
              <input
                type="text"
                value={currentAd.creative?.brandName || ""}
                onChange={(e) =>
                  handleChange("creative.brandName", e.target.value)
                }
                placeholder="My Brand"
                className={`w-full campaign-input px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                  errors.brandName ? "border-red-500" : "border-gray-200"
                }`}
              />
              {errors.brandName && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.brandName}
                </p>
              )}
            </div>

            {/* Brand Logo Asset ID */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="form-label-small">Brand Logo Asset ID *</label>
                <button
                  type="button"
                  onClick={() => setBrandLogoAssetPickerOpen(true)}
                  disabled={!accountId}
                  className="text-[11px] font-medium text-[#136D6D] hover:text-[#0e5a5a] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Browse assets
                </button>
              </div>
              <Dropdown<string>
                options={assets
                  .filter((asset) => {
                    if (!asset.assetId) return false;
                    // Check new schema: assetType === 'IMAGE' or fileMetadata.contentType
                    const isImageByAssetType = asset.assetType === "IMAGE";
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
                  }) // Only show image assets
                  .map((asset) => ({
                    value: asset.assetId || "",
                    label:
                      asset.name || asset.fileName
                        ? `${asset.name || asset.fileName} (${asset.assetId})`
                        : asset.assetId || `Asset ${asset.id}`,
                  }))}
                value={currentAd.creative?.brandLogoAssetID || ""}
                onChange={(value) => {
                  handleChange("creative.brandLogoAssetID", value);
                  setBrandLogoDimensionError(null);
                  setBrandLogoOptionalCropHint(null);

                  const selectedAsset = assets.find((a) => a.assetId === value);
                  if (
                    selectedAsset?.fileMetadata?.width != null &&
                    selectedAsset?.fileMetadata?.height != null
                  ) {
                    const width = selectedAsset.fileMetadata.width;
                    const height = selectedAsset.fileMetadata.height;
                    const BRAND_LOGO_MIN = 400;

                    if (width < BRAND_LOGO_MIN || height < BRAND_LOGO_MIN) {
                      setBrandLogoDimensionError(
                        `Brand logo must be at least 400×400 pixels. Current: ${width}×${height}. Please select a larger image.`,
                      );
                    } else {
                      setBrandLogoOptionalCropHint(
                        `Image (${width}×${height}) is larger than 400×400. Optionally crop for best results.`,
                      );
                    }

                    setCurrentAd((prev) => ({
                      ...prev,
                      creative: {
                        ...prev.creative,
                        brandLogoCrop: {
                          top: prev.creative?.brandLogoCrop?.top ?? 0,
                          left: prev.creative?.brandLogoCrop?.left ?? 0,
                          width,
                          height,
                        },
                      },
                    }));
                  } else if (!value) {
                    setBrandLogoDimensionError(null);
                    setBrandLogoOptionalCropHint(null);
                  }
                }}
                placeholder={assetsLoading ? "Loading..." : "Select Asset"}
                buttonClassName={`edit-button w-full px-4 py-2.5 ${
                  errors.brandLogoAssetID ? "border-red-500" : "border-gray-200"
                }`}
                menuClassName="max-w-full"
                optionClassName="truncate"
                renderOption={(option, isSelected) => (
                  <div className="flex items-center justify-between w-full min-w-0">
                    <span className="truncate flex-1">{option.label}</span>
                    {isSelected && (
                      <svg
                        className="w-4 h-4 text-[#136D6D] flex-shrink-0 ml-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                )}
                disabled={assetsLoading || assets.length === 0}
              />
              {accountId && (
                <AssetPickerPopup
                  isOpen={brandLogoAssetPickerOpen}
                  onClose={() => setBrandLogoAssetPickerOpen(false)}
                  onSelect={(asset) => {
                    const value = asset.assetId || "";
                    handleChange("creative.brandLogoAssetID", value);
                    setBrandLogoDimensionError(null);
                    setBrandLogoOptionalCropHint(null);
                    if (!assets.some((a) => a.assetId === value)) {
                      setAssets((prev) => [asset, ...prev]);
                    }
                    if (
                      asset.fileMetadata?.width != null &&
                      asset.fileMetadata?.height != null
                    ) {
                      const width = asset.fileMetadata.width;
                      const height = asset.fileMetadata.height;
                      const BRAND_LOGO_MIN = 400;
                      if (width < BRAND_LOGO_MIN || height < BRAND_LOGO_MIN) {
                        setBrandLogoDimensionError(
                          `Brand logo must be at least 400×400 pixels. Current: ${width}×${height}. Please select a larger image.`,
                        );
                      } else {
                        setBrandLogoOptionalCropHint(
                          `Image (${width}×${height}) is larger than 400×400. Optionally crop for best results.`,
                        );
                      }
                      setCurrentAd((prev) => ({
                        ...prev,
                        creative: {
                          ...prev.creative,
                          brandLogoCrop: {
                            top: prev.creative?.brandLogoCrop?.top ?? 0,
                            left: prev.creative?.brandLogoCrop?.left ?? 0,
                            width,
                            height,
                          },
                        },
                      }));
                    }
                  }}
                  accountId={accountId}
                  channelId={channelId}
                  profileId={profileId}
                  imageOnly
                  title="Browse brand logo assets"
                />
              )}
              {errors.brandLogoAssetID && (
                <p className="text-[10px] text-red-500 mt-1 font-semibold">
                  {errors.brandLogoAssetID}
                </p>
              )}
              {brandLogoOptionalCropHint && !brandLogoDimensionError && (
                <p className="text-[10px] text-yellow-600 mt-1">
                  {brandLogoOptionalCropHint}
                </p>
              )}
              {currentAd.creative?.brandLogoAssetID?.trim() &&
                !brandLogoDimensionError && (
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        const assetId =
                          currentAd.creative?.brandLogoAssetID || "";
                        const selectedAsset = assets.find(
                          (a) => a.assetId === assetId,
                        );
                        let imageUrl =
                          selectedAsset?.storageLocationUrls?.defaultUrl;

                        if (!imageUrl && accountId && profileId && assetId) {
                          try {
                            const preview =
                              await campaignsService.getAssetPreview(
                                accountId,
                                assetId,
                                String(profileId),
                                channelId ?? null,
                              );
                            imageUrl = preview?.previewUrl || "";
                          } catch {
                            imageUrl = "";
                          }
                        }

                        if (!imageUrl) {
                          setBrandLogoOptionalCropHint(
                            "Could not load image for cropping. Please ensure the asset has a preview.",
                          );
                          return;
                        }

                        setBrandLogoCropImageUrl(imageUrl);
                        setBrandLogoCropModalOpen(true);
                      }}
                      className="text-[10px] text-[#136D6D] hover:text-[#0e5a5a] font-medium"
                    >
                      {"Crop"}
                    </button>
                  </div>
                )}
            </div>

            {/* Headline */}
            <div>
              <label className="form-label-small">Headline *</label>
              <input
                type="text"
                value={currentAd.creative?.headline || ""}
                onChange={(e) =>
                  handleChange("creative.headline", e.target.value)
                }
                placeholder="Shop Our Best Products"
                className={`w-full campaign-input px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                  errors.headline ? "border-red-500" : "border-gray-200"
                }`}
              />
              {errors.headline && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.headline}
                </p>
              )}
            </div>
          </div>

          {/* ASINs - Show exactly 3 text fields (max 3 ASINs) */}
          <div className="mb-6">
            <label className="form-label-small">ASINs * (Maximum 3)</label>
            <div className="grid grid-cols-3 gap-6">
              {[0, 1, 2].map((index) => {
                const asins = currentAd.creative?.asins || [];
                return (
                  <div key={index} className="space-y-2">
                    <input
                      type="text"
                      value={asins[index] || ""}
                      onChange={(e) => {
                        const newAsins = [...asins];
                        newAsins[index] = e.target.value;
                        // Ensure array has exactly 3 elements
                        while (newAsins.length < 3) {
                          newAsins.push("");
                        }
                        handleChange("creative.asins", newAsins.slice(0, 3));
                      }}
                      placeholder={`ASIN ${index + 1} (e.g., B01EXAMPLE)`}
                      className={`w-full campaign-input px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                        errors.creativeAsins
                          ? "border-red-500"
                          : "border-gray-200"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
            {errors.creativeAsins && (
              <p className="text-[10px] text-red-500 mt-1">
                {errors.creativeAsins}
              </p>
            )}
          </div>

          {/* Video Asset IDs - For VIDEO ads */}
          {currentAd.adType === "VIDEO" && (
            <div className="mb-6">
              <label className="form-label-small">Video Asset IDs *</label>
              {/* Search Field */}
              <div className="mb-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={videoAssetSearch}
                    onChange={(e) => setVideoAssetSearch(e.target.value)}
                    placeholder="Search video assets..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-1 focus:ring-[#136D6D] focus:border-[#136D6D] bg-white"
                  />
                </div>
              </div>
              {/* Video Assets Multi-Select */}
              <div className="border border-gray-200 rounded-lg p-3 max-h-[300px] overflow-y-auto">
                {assets
                  .filter((asset) => {
                    if (!asset.assetId) return false;
                    // Filter for video assets
                    const isVideoByAssetType = asset.assetType === "VIDEO";
                    const isVideoByContentType = asset.contentType
                      ?.toLowerCase()
                      .startsWith("video/");
                    const isVideoByFileMetadata =
                      asset.fileMetadata?.contentType
                        ?.toLowerCase()
                        .startsWith("video/");
                    // Fallback to old schema for backward compatibility
                    const isVideoByMediaType =
                      asset.mediaType?.toLowerCase() === "video";
                    const isVideo =
                      isVideoByAssetType ||
                      isVideoByContentType ||
                      isVideoByFileMetadata ||
                      isVideoByMediaType;
                    if (!isVideo) return false;
                    // Apply search filter
                    if (!videoAssetSearch.trim()) return true;
                    const searchLower = videoAssetSearch.toLowerCase();
                    const assetLabel = (
                      asset.name ||
                      asset.fileName ||
                      asset.assetId ||
                      ""
                    ).toLowerCase();
                    return assetLabel.includes(searchLower);
                  })
                  .map((asset) => {
                    const assetId = asset.assetId || "";
                    const isSelected = (
                      currentAd.creative?.videoAssetIds || []
                    ).includes(assetId);
                    return (
                      <div key={assetId} className="mb-2 last:mb-0">
                        <Checkbox
                          checked={isSelected}
                          onChange={(checked) => {
                            const currentIds =
                              currentAd.creative?.videoAssetIds || [];
                            if (checked) {
                              if (!currentIds.includes(assetId)) {
                                handleChange("creative.videoAssetIds", [
                                  ...currentIds,
                                  assetId,
                                ]);
                              }
                            } else {
                              handleChange(
                                "creative.videoAssetIds",
                                currentIds.filter((id) => id !== assetId),
                              );
                            }
                          }}
                          label={
                            asset.name || asset.fileName
                              ? `${asset.name || asset.fileName} (${assetId})`
                              : assetId || `Asset ${asset.id}`
                          }
                          size="small"
                          className="w-full [&_label]:text-[11.2px]"
                        />
                      </div>
                    );
                  })}
                {assets.filter((asset) => {
                  if (!asset.assetId) return false;
                  const isVideoByAssetType = asset.assetType === "VIDEO";
                  const isVideoByContentType = asset.contentType
                    ?.toLowerCase()
                    .startsWith("video/");
                  const isVideoByFileMetadata = asset.fileMetadata?.contentType
                    ?.toLowerCase()
                    .startsWith("video/");
                  const isVideoByMediaType =
                    asset.mediaType?.toLowerCase() === "video";
                  return (
                    isVideoByAssetType ||
                    isVideoByContentType ||
                    isVideoByFileMetadata ||
                    isVideoByMediaType
                  );
                }).length === 0 && (
                  <p className="text-[11.2px] text-gray-500 text-center py-4">
                    No video assets available
                  </p>
                )}
              </div>
              {/* Display selected video asset IDs */}
              {currentAd.creative?.videoAssetIds &&
                currentAd.creative.videoAssetIds.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] text-[#556179] mb-2">
                      Selected ({currentAd.creative.videoAssetIds.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {currentAd.creative.videoAssetIds.map((assetId) => {
                        const asset = assets.find((a) => a.assetId === assetId);
                        return (
                          <span
                            key={assetId}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[#136D6D] text-white text-[10px] rounded"
                          >
                            {asset?.name || asset?.fileName || assetId}
                            <button
                              type="button"
                              onClick={() => {
                                const currentIds =
                                  currentAd.creative?.videoAssetIds || [];
                                handleChange(
                                  "creative.videoAssetIds",
                                  currentIds.filter((id) => id !== assetId),
                                );
                              }}
                              className="hover:text-red-200 ml-1"
                              title="Remove"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              {errors.videoAssetIds && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.videoAssetIds}
                </p>
              )}
            </div>
          )}

          {/* Custom Images - Prioritized field */}
          {currentAd.adType === "IMAGE" && (
            <div className="mb-6">
              <label className="form-label-small">
                Custom Images (Optional)
              </label>
              {errors.customImages && (
                <p className="text-[10px] text-red-500 mb-2 font-semibold">
                  {errors.customImages}
                </p>
              )}
              {(currentAd.creative?.customImages || []).map((image, index) => (
                <div
                  key={index}
                  className="mb-4 p-3  border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11.2px] font-semibold text-[#072929]">
                      Image {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomImage(index)}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-[10px] text-gray-600">
                          Asset ID
                        </label>
                        <button
                          type="button"
                          onClick={() => setCustomImageAssetPickerIndex(index)}
                          disabled={!accountId}
                          className="text-[10px] font-medium text-[#136D6D] hover:text-[#0e5a5a] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Browse assets
                        </button>
                      </div>
                      <Dropdown<string>
                        options={assets
                          .filter((asset) => {
                            if (!asset.assetId) return false;
                            // For custom images, show IMAGE type assets
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
                        value={image.assetId || ""}
                        onChange={(value) => {
                          handleCustomImageChange(
                            index,
                            "assetId",
                            value || "",
                          );
                          // Auto-populate crop coordinates based on asset dimensions
                          const selectedAsset = assets.find(
                            (a) => a.assetId === value,
                          );
                          if (
                            selectedAsset?.fileMetadata?.width != null &&
                            selectedAsset?.fileMetadata?.height != null
                          ) {
                            const width = selectedAsset.fileMetadata.width;
                            const height = selectedAsset.fileMetadata.height;
                            const REQUIRED_WIDTH = 1200;
                            const REQUIRED_HEIGHT = 628;

                            // Clear any previous warning for this index
                            setCustomImageWarnings((prev) => {
                              const updated = { ...prev };
                              delete updated[index];
                              return updated;
                            });

                            // Case 1: Dimensions less than required minimum
                            if (
                              width < REQUIRED_WIDTH ||
                              height < REQUIRED_HEIGHT
                            ) {
                              setCustomImageWarnings((prev) => ({
                                ...prev,
                                [index]: `Image dimensions (${width}x${height}) are below the minimum required (${REQUIRED_WIDTH}x${REQUIRED_HEIGHT}). Please select a larger image.`,
                              }));
                              // Don't set crop coordinates for undersized images
                              return;
                            }

                            // Case 2: Dimensions exactly match required
                            if (
                              width === REQUIRED_WIDTH &&
                              height === REQUIRED_HEIGHT
                            ) {
                              setCurrentAd((prev) => {
                                const updatedCustomImages = [
                                  ...(prev.creative?.customImages || []),
                                ];
                                if (updatedCustomImages[index]) {
                                  updatedCustomImages[index] = {
                                    ...updatedCustomImages[index],
                                    crop: {
                                      top: 0,
                                      left: 0,
                                      width: REQUIRED_WIDTH,
                                      height: REQUIRED_HEIGHT,
                                    },
                                  };
                                }
                                return {
                                  ...prev,
                                  creative: {
                                    ...prev.creative,
                                    customImages: updatedCustomImages,
                                  },
                                };
                              });
                              return;
                            }

                            // Case 3: Dimensions larger than required - user must crop
                            // Set warning to inform user they need to crop
                            setCustomImageWarnings((prev) => ({
                              ...prev,
                              [index]: `Image dimensions (${width}x${height}) are larger than required (${REQUIRED_WIDTH}x${REQUIRED_HEIGHT}). Please set crop coordinates with 1200x628 aspect ratio.`,
                            }));
                            // Initialize crop with full image dimensions for user to adjust
                            setCurrentAd((prev) => {
                              const updatedCustomImages = [
                                ...(prev.creative?.customImages || []),
                              ];
                              if (updatedCustomImages[index]) {
                                updatedCustomImages[index] = {
                                  ...updatedCustomImages[index],
                                  crop: {
                                    top: 0,
                                    left: 0,
                                    width: REQUIRED_WIDTH,
                                    height: REQUIRED_HEIGHT,
                                  },
                                };
                              }
                              return {
                                ...prev,
                                creative: {
                                  ...prev.creative,
                                  customImages: updatedCustomImages,
                                },
                              };
                            });
                          }
                        }}
                        placeholder={
                          assetsLoading ? "Loading..." : "Select Asset"
                        }
                        buttonClassName="edit-button px-3 py-2 border border-gray-200 rounded-lg text-[11.2px] bg-white hover:bg-gray-50 w-full truncate"
                        menuClassName="w-full"
                        optionClassName="truncate"
                        renderOption={(option, isSelected) => (
                          <div className="flex items-center justify-between w-full min-w-0">
                            <span className="truncate flex-1 w-full">
                              {option.label}
                            </span>
                            {isSelected && (
                              <svg
                                className="w-4 h-4 text-[#136D6D] flex-shrink-0 ml-2"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                        )}
                        disabled={assetsLoading || assets.length === 0}
                      />
                      {customImageWarnings[index] && (
                        <div className="mt-1">
                          <p
                            className={`text-[10px] ${
                              customImageWarnings[index].includes("below")
                                ? "text-red-600 font-semibold"
                                : "text-yellow-600"
                            }`}
                          >
                            {customImageWarnings[index]}
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-600 mb-1">
                        URL (Optional)
                      </label>
                      <input
                        type="text"
                        value={image.url || ""}
                        onChange={(e) =>
                          handleCustomImageChange(index, "url", e.target.value)
                        }
                        placeholder="https://example.com/image.png"
                        className="w-full campaign-input px-3 py-2 border border-gray-200 rounded-lg text-[11.2px]"
                      />
                    </div>
                  </div>
                  {/* Crop coordinates – hidden; use "Crop image" button to crop / re-crop any number of times */}
                  {false && (
                    <div className="mt-2">
                      <button type="button" className="hidden">
                        Crop (Optional)
                      </button>
                    </div>
                  )}
                  {/* Always show Crop image button when asset is selected so user can crop or re-crop */}
                  {image.assetId && (
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          const selectedAsset = assets.find(
                            (a) => a.assetId === image.assetId,
                          );
                          let imageUrl =
                            image.url ||
                            selectedAsset?.storageLocationUrls?.defaultUrl;

                          if (
                            !imageUrl &&
                            accountId &&
                            profileId &&
                            image.assetId
                          ) {
                            try {
                              const preview =
                                await campaignsService.getAssetPreview(
                                  accountId,
                                  image.assetId,
                                  String(profileId),
                                  channelId ?? null,
                                );
                              imageUrl = preview?.previewUrl || "";
                            } catch {
                              imageUrl = "";
                            }
                          }

                          if (!imageUrl) {
                            setCustomImageWarnings((prev) => ({
                              ...prev,
                              [index]:
                                "Could not load image for cropping. Please provide a URL or ensure the asset has a preview.",
                            }));
                            return;
                          }

                          setCropModalState({
                            isOpen: true,
                            imageIndex: index,
                            imageUrl,
                          });
                        }}
                        className="text-[10px] text-[#136D6D] hover:text-[#0e5a5a] font-medium"
                      >
                        {"Crop image"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {accountId && customImageAssetPickerIndex !== null && (
                <AssetPickerPopup
                  isOpen={true}
                  onClose={() => setCustomImageAssetPickerIndex(null)}
                  onSelect={(asset) => {
                    const index = customImageAssetPickerIndex;
                    setCustomImageAssetPickerIndex(null);
                    const value = asset.assetId || "";
                    handleCustomImageChange(index, "assetId", value);
                    if (!assets.some((a) => a.assetId === value)) {
                      setAssets((prev) => [asset, ...prev]);
                    }
                    const REQUIRED_WIDTH = 1200;
                    const REQUIRED_HEIGHT = 628;
                    setCustomImageWarnings((prev) => {
                      const updated = { ...prev };
                      delete updated[index];
                      return updated;
                    });
                    if (
                      asset.fileMetadata?.width != null &&
                      asset.fileMetadata?.height != null
                    ) {
                      const width = asset.fileMetadata.width;
                      const height = asset.fileMetadata.height;
                      if (width < REQUIRED_WIDTH || height < REQUIRED_HEIGHT) {
                        setCustomImageWarnings((prev) => ({
                          ...prev,
                          [index]: `Image dimensions (${width}x${height}) are below the minimum required (${REQUIRED_WIDTH}x${REQUIRED_HEIGHT}). Please select a larger image.`,
                        }));
                        return;
                      }
                      if (
                        width === REQUIRED_WIDTH &&
                        height === REQUIRED_HEIGHT
                      ) {
                        setCurrentAd((prev) => {
                          const updatedCustomImages = [
                            ...(prev.creative?.customImages || []),
                          ];
                          if (updatedCustomImages[index]) {
                            updatedCustomImages[index] = {
                              ...updatedCustomImages[index],
                              crop: {
                                top: 0,
                                left: 0,
                                width: REQUIRED_WIDTH,
                                height: REQUIRED_HEIGHT,
                              },
                            };
                          }
                          return {
                            ...prev,
                            creative: {
                              ...prev.creative,
                              customImages: updatedCustomImages,
                            },
                          };
                        });
                        return;
                      }
                      setCustomImageWarnings((prev) => ({
                        ...prev,
                        [index]: `Image dimensions (${width}x${height}) are larger than required (${REQUIRED_WIDTH}x${REQUIRED_HEIGHT}). Please set crop coordinates with 1200x628 aspect ratio.`,
                      }));
                      setCurrentAd((prev) => {
                        const updatedCustomImages = [
                          ...(prev.creative?.customImages || []),
                        ];
                        if (updatedCustomImages[index]) {
                          updatedCustomImages[index] = {
                            ...updatedCustomImages[index],
                            crop: {
                              top: 0,
                              left: 0,
                              width: REQUIRED_WIDTH,
                              height: REQUIRED_HEIGHT,
                            },
                          };
                        }
                        return {
                          ...prev,
                          creative: {
                            ...prev.creative,
                            customImages: updatedCustomImages,
                          },
                        };
                      });
                    }
                  }}
                  accountId={accountId}
                  channelId={channelId}
                  profileId={profileId}
                  imageOnly
                  title="Browse custom image assets"
                />
              )}
              <button
                type="button"
                onClick={handleAddCustomImage}
                className="text-[11.2px] text-[#136D6D] hover:text-[#0e5a5a]"
              >
                + Add Custom Image
              </button>
            </div>
          )}

          {/* Brand Logo Crop - Hidden from SB Ads collection */}
          {false &&
            (currentAd.adType === "IMAGE" ||
              (currentAd.adType === "VIDEO" &&
                currentAd.videoAdType === "BRAND")) && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() =>
                    setIsBrandLogoCropExpanded(!isBrandLogoCropExpanded)
                  }
                  className="flex items-center gap-2 w-full mb-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
                >
                  <h3 className="text-[14px] font-semibold text-[#072929] flex items-center gap-2">
                    Brand Logo Crop
                    <svg
                      className={`w-5 h-5 text-[#072929] shrink-0 transition-transform ${
                        isBrandLogoCropExpanded ? "rotate-180" : ""
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
                  </h3>
                  <span className="text-[#556179] font-normal text-[14px]">
                    (Optional – defaults to whole image; min 400×400)
                  </span>
                </button>

                {isBrandLogoCropExpanded && (
                  <div className="pt-2">
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-600 mb-1">
                          Top
                        </label>
                        <input
                          type="number"
                          value={currentAd.creative?.brandLogoCrop?.top || 0}
                          onChange={(e) =>
                            handleChange(
                              "creative.brandLogoCrop.top",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-full campaign-input px-3 py-2 border border-gray-200 rounded-lg text-[11.2px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-600 mb-1">
                          Left
                        </label>
                        <input
                          type="number"
                          value={currentAd.creative?.brandLogoCrop?.left || 0}
                          onChange={(e) =>
                            handleChange(
                              "creative.brandLogoCrop.left",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-full campaign-input px-3 py-2 border border-gray-200 rounded-lg text-[11.2px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-600 mb-1">
                          Width
                        </label>
                        <input
                          type="number"
                          value={
                            currentAd.creative?.brandLogoCrop?.width || 100
                          }
                          onChange={(e) =>
                            handleChange(
                              "creative.brandLogoCrop.width",
                              parseInt(e.target.value) || 100,
                            )
                          }
                          className="w-full campaign-input px-3 py-2 border border-gray-200 rounded-lg text-[11.2px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-600 mb-1">
                          Height
                        </label>
                        <input
                          type="number"
                          value={
                            currentAd.creative?.brandLogoCrop?.height || 100
                          }
                          onChange={(e) =>
                            handleChange(
                              "creative.brandLogoCrop.height",
                              parseInt(e.target.value) || 100,
                            )
                          }
                          className="w-full campaign-input px-3 py-2 border border-gray-200 rounded-lg text-[11.2px]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Creative Fields - Conditional based on ad type */}
          {currentAd.adType === "IMAGE" ? (
            <>
              {/* Image ads don't need additional fields here - all fields are above */}
            </>
          ) : currentAd.adType === "VIDEO" &&
            currentAd.videoAdType === "BRAND" ? (
            <>
              {/* Video Asset IDs for Brand Video */}
              <div className="mb-4">
                <label className="form-label-small">Video Asset IDs *</label>
                <div className="space-y-2">
                  {/* Text input to manually add video asset IDs */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="amzn1.assetlibrary.asset1..."
                      className="flex-1 w-full campaign-input px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const input = e.currentTarget as HTMLInputElement;
                          const value = input.value.trim();
                          if (value) {
                            const currentIds =
                              currentAd.creative?.videoAssetIds || [];
                            if (!currentIds.includes(value)) {
                              handleChange("creative.videoAssetIds", [
                                ...currentIds,
                                value,
                              ]);
                              input.value = "";
                            }
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        const input = e.currentTarget
                          .previousElementSibling as HTMLInputElement;
                        const value = input.value.trim();
                        if (value) {
                          const currentIds =
                            currentAd.creative?.videoAssetIds || [];
                          if (!currentIds.includes(value)) {
                            handleChange("creative.videoAssetIds", [
                              ...currentIds,
                              value,
                            ]);
                            input.value = "";
                          }
                        }
                      }}
                      className="px-4 py-2.5 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors"
                    >
                      Add
                    </button>
                  </div>

                  {/* Dropdown to select from available video assets */}
                  <div className="flex gap-2">
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
                          return isVideoByMediaType || isVideoByContentType;
                        })
                        .map((asset) => ({
                          value: asset.assetId || "",
                          label: asset.fileName
                            ? `${asset.fileName} (${asset.assetId})`
                            : asset.assetId || `Asset ${asset.id}`,
                        }))}
                      value=""
                      onChange={(value) => {
                        if (value) {
                          const currentIds =
                            currentAd.creative?.videoAssetIds || [];
                          if (!currentIds.includes(value)) {
                            handleChange("creative.videoAssetIds", [
                              ...currentIds,
                              value,
                            ]);
                          }
                        }
                      }}
                      placeholder={
                        assetsLoading ? "Loading..." : "Select Video Asset"
                      }
                      buttonClassName="edit-button w-full flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] bg-white hover:bg-gray-50 min-w-[400px]"
                      menuClassName="min-w-[400px]"
                      optionClassName="truncate"
                      renderOption={(option, isSelected) => (
                        <div className="flex items-center justify-between w-full min-w-0">
                          <span className="truncate flex-1">
                            {option.label}
                          </span>
                          {isSelected && (
                            <svg
                              className="w-4 h-4 text-[#136D6D] flex-shrink-0 ml-2"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      )}
                      disabled={assetsLoading || assets.length === 0}
                    />
                  </div>
                </div>

                {/* Display selected video asset IDs */}
                {currentAd.creative?.videoAssetIds &&
                  currentAd.creative.videoAssetIds.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] text-[#556179] mb-1">
                        Selected ({currentAd.creative.videoAssetIds.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {currentAd.creative.videoAssetIds.map(
                          (assetId, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-[#136D6D] text-white text-[10px] rounded"
                            >
                              {assetId}
                              <button
                                type="button"
                                onClick={() => {
                                  const currentIds =
                                    currentAd.creative?.videoAssetIds || [];
                                  handleChange(
                                    "creative.videoAssetIds",
                                    currentIds.filter((id) => id !== assetId),
                                  );
                                }}
                                className="hover:text-red-200"
                              >
                                ×
                              </button>
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                {errors.videoAssetIds && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.videoAssetIds}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>{/* Product Video Ad Fields - Only Video Asset IDs */}</>
          )}

          {/* Consent to Translate - Show for both image and video */}
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={currentAd.creative?.consentToTranslate || false}
                onChange={(e) =>
                  handleChange("creative.consentToTranslate", e.target.checked)
                }
                className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
              />
              <span className="text-[11.2px] text-[#556179]">
                Consent to Translate
              </span>
            </label>
          </div>

          {/* Error message for video asset IDs */}
          {currentAd.adType === "VIDEO" && errors.videoAssetIds && (
            <div className="mb-4">
              <p className="text-[10px] text-red-500">{errors.videoAssetIds}</p>
            </div>
          )}

          {/* Creative Properties to Optimize - Only for IMAGE ads */}
          {currentAd.adType === "IMAGE" && (
            <div className="mb-4">
              <label className="form-label-small">
                Creative Properties to Optimize (Optional)
                {currentAd.creative?.creativePropertiesToOptimize &&
                  currentAd.creative.creativePropertiesToOptimize.length >
                    0 && (
                    <span className="ml-2 text-[10px] text-[#556179] font-normal">
                      ({currentAd.creative.creativePropertiesToOptimize.length}{" "}
                      selected)
                    </span>
                  )}
              </label>
              <div className="flex flex-wrap gap-3">
                {CREATIVE_PROPERTIES_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={
                        currentAd.creative?.creativePropertiesToOptimize?.includes(
                          option.value,
                        ) || false
                      }
                      onChange={(e) => {
                        const current =
                          currentAd.creative?.creativePropertiesToOptimize ||
                          [];
                        if (e.target.checked) {
                          // Add to array if not already present
                          if (!current.includes(option.value)) {
                            handleChange(
                              "creative.creativePropertiesToOptimize",
                              [...current, option.value],
                            );
                          }
                        } else {
                          // Remove from array
                          handleChange(
                            "creative.creativePropertiesToOptimize",
                            current.filter((v) => v !== option.value),
                          );
                        }
                      }}
                      className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                    />
                    <span className="text-[11.2px] text-[#556179]">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
              {/* Display selected properties as tags */}
              {currentAd.creative?.creativePropertiesToOptimize &&
                currentAd.creative.creativePropertiesToOptimize.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] text-[#556179] mb-1">
                      Selected properties:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {currentAd.creative.creativePropertiesToOptimize.map(
                        (property, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[#136D6D] text-white text-[10px] rounded"
                          >
                            {property}
                            <button
                              type="button"
                              onClick={() => {
                                const current =
                                  currentAd.creative
                                    ?.creativePropertiesToOptimize || [];
                                handleChange(
                                  "creative.creativePropertiesToOptimize",
                                  current.filter((v) => v !== property),
                                );
                              }}
                              className="hover:text-red-200 ml-1"
                              title="Remove"
                            >
                              ×
                            </button>
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Landing Page Section - url and asins are mutually exclusive. Brand video only supports Store page (url). */}
        <div className="mb-4 pt-4 border-t border-gray-200">
          <h3 className="section-title mb-4">Landing Page</h3>

          {currentAd.adType === "VIDEO" && currentAd.videoAdType === "BRAND" ? (
            <>
              <p className="text-[11.2px] text-[#556179] mb-3">
                Brand video ads only support Store page as landing page. Do not
                use Product ASINs.
              </p>
              <div className="flex-1 min-w-[200px]">
                <label className="form-label-small">URL *</label>
                <input
                  type="text"
                  value={currentAd.landingPage?.url || ""}
                  onChange={(e) =>
                    handleChange("landingPage.url", e.target.value)
                  }
                  placeholder="https://www.amazon.com/stores/..."
                  className={`w-full campaign-input px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                    errors.landingPageUrl ? "border-red-500" : "border-gray-200"
                  }`}
                />
                {errors.landingPageUrl && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.landingPageUrl}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <label className="form-label-small">
                    Landing page type *
                  </label>
                  <Dropdown
                    options={LANDING_PAGE_TYPE_OPTIONS}
                    value={currentAd.landingPage?.pageType || "CUSTOM_URL"}
                    onChange={(value) => {
                      const newPageType = value as
                        | "PRODUCT_LIST"
                        | "STORE"
                        | "CUSTOM_URL"
                        | "DETAIL_PAGE";
                      const isUrlType =
                        newPageType === "STORE" || newPageType === "CUSTOM_URL";

                      setCurrentAd((prev) => ({
                        ...prev,
                        landingPage: {
                          ...prev.landingPage,
                          pageType: newPageType,
                          // Clear the opposite field when switching
                          ...(isUrlType ? { asins: [] } : { url: "" }),
                          // Initialize asins with 3 empty fields when switching to PRODUCT_LIST/DETAIL_PAGE
                          ...(!isUrlType &&
                          (!prev.landingPage?.asins ||
                            prev.landingPage.asins.length === 0)
                            ? { asins: ["", "", ""] }
                            : {}),
                        },
                      }));
                    }}
                    placeholder="Select landing page type"
                    buttonClassName="edit-button w-full"
                  />
                  <p className="text-[10.64px] text-[#556179] mt-1.5">
                    Choose Store or Custom URL to provide a landing page URL, or
                    Product list/Detail page to provide ASINs. One is required.
                  </p>
                </div>

                {/* Show URL field for STORE or CUSTOM_URL */}
                {(currentAd.landingPage?.pageType === "STORE" ||
                  currentAd.landingPage?.pageType === "CUSTOM_URL") && (
                  <div>
                    <label className="form-label-small">
                      Landing page URL *
                    </label>
                    <input
                      type="text"
                      value={currentAd.landingPage?.url || ""}
                      onChange={(e) =>
                        handleChange("landingPage.url", e.target.value)
                      }
                      placeholder={
                        currentAd.landingPage?.pageType === "STORE"
                          ? "https://www.amazon.com/stores/..."
                          : "https://www.amazon.com/s?me=TEST or custom landing page URL"
                      }
                      className={`w-full campaign-input px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                        errors.landingPage
                          ? "border-red-500"
                          : "border-gray-200"
                      }`}
                    />
                    <p className="text-[10.64px] text-[#556179] mt-1.5">
                      {currentAd.landingPage?.pageType === "STORE"
                        ? "URL of an existing Amazon Store page."
                        : "URL of a custom landing page. The page must include the ASINs of at least three products advertised in the campaign."}
                    </p>
                    {errors.landingPage && (
                      <p className="text-[10px] text-red-500 mt-1">
                        {errors.landingPage}
                      </p>
                    )}
                  </div>
                )}

                {/* Show exactly 3 ASIN fields for PRODUCT_LIST or DETAIL_PAGE */}
                {(currentAd.landingPage?.pageType === "PRODUCT_LIST" ||
                  currentAd.landingPage?.pageType === "DETAIL_PAGE") && (
                  <div>
                    <label className="form-label-small">
                      Product ASINs * (3 fields)
                    </label>
                    {[0, 1, 2].map((index) => {
                      const asins = currentAd.landingPage?.asins || [];
                      const padded = [...asins, "", "", ""].slice(0, 3);
                      return (
                        <div key={index} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={padded[index] || ""}
                            onChange={(e) => {
                              const newAsins = [...padded];
                              newAsins[index] = e.target.value;
                              handleChange("landingPage.asins", newAsins);
                            }}
                            placeholder={`ASIN ${index + 1} (e.g. B01EXAMPLE)`}
                            className={`flex-1 w-full campaign-input px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                              errors.landingPageAsins
                                ? "border-red-500"
                                : "border-gray-200"
                            }`}
                          />
                        </div>
                      );
                    })}
                    <p className="text-[10.64px] text-[#556179] mt-1.5">
                      {currentAd.landingPage?.pageType === "PRODUCT_LIST"
                        ? "Product list landing page with multiple products."
                        : "Detail page for a specific product."}
                    </p>
                    {errors.landingPageAsins && (
                      <p className="text-[10px] text-red-500 mt-1">
                        {errors.landingPageAsins}
                      </p>
                    )}
                    {errors.landingPage && (
                      <p className="text-[10px] text-red-500 mt-1">
                        {errors.landingPage}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Add Ad Button and Test Button */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleFillTestData}
            className="px-4 py-2.5 bg-gray-500 text-white text-[11.2px] rounded-lg hover:bg-gray-600 transition-colors"
          >
            Test
          </button>
          <button
            type="button"
            onClick={handleAddAd}
            className="create-entity-button text-[12px]"
          >
            {formHasReEditedAd ? "Update" : "Add Ad"}
          </button>
        </div>
      </div>

      {/* Added Ads Table */}
      {addedAds.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="section-title">Added Ads ({addedAds.length})</h3>
          <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[#e8e8e3]">
                    <th className="table-header">Ad Name</th>
                    <th className="table-header">State</th>
                    <th className="table-header">Ad Group</th>
                    <th className="table-header">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {addedAds.map((ad, index) => {
                    // Find errors for this ad by matching index (backend may send index as number or string)
                    const adErrors = failedAds.find(
                      (failed) => Number(failed.index) === index,
                    );
                    const hasErrors =
                      adErrors &&
                      Array.isArray(adErrors.errors) &&
                      adErrors.errors.length > 0;

                    return (
                      <React.Fragment key={index}>
                        <tr
                          className={`${
                            !hasErrors && index !== addedAds.length - 1
                              ? "border-b border-[#e8e8e3]"
                              : ""
                          } hover:bg-gray-50 transition-colors`}
                        >
                          <td className="table-cell">
                            <span className="table-text leading-[1.26]">
                              {ad.name}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className="table-text leading-[1.26]">
                              {ad.state}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className="table-text leading-[1.26]">
                              {getAdGroupName(ad.adGroupId)}
                            </span>
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditAd(index)}
                                className="text-[#136D6D] hover:text-[#0e5a5a] transition-colors"
                                title="Edit this ad"
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
                                onClick={() => handleRemoveAd(index)}
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
                            className={`${index !== addedAds.length - 1 ? "border-b border-[#e8e8e3]" : ""}`}
                          >
                            <td colSpan={4} className="px-4 py-2 bg-red-50">
                              <div className="space-y-1">
                                {adErrors.errors.map(
                                  (error: any, errorIndex: number) => {
                                    const msg =
                                      typeof error.message === "string"
                                        ? error.message
                                        : String(error?.message ?? "");
                                    return (
                                      <p
                                        key={errorIndex}
                                        className="text-[11px] text-red-600 whitespace-pre-wrap"
                                      >
                                        {msg}
                                        {error.field && (
                                          <span className="text-red-500 font-medium ml-1">
                                            : {error.field}
                                          </span>
                                        )}
                                      </p>
                                    );
                                  },
                                )}
                              </div>
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

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={cropModalState.isOpen}
        onClose={() =>
          setCropModalState({ isOpen: false, imageIndex: 0, imageUrl: "" })
        }
        imageUrl={cropModalState.imageUrl}
        onConfirm={(crop: CropCoordinates) => {
          const idx = cropModalState.imageIndex;
          handleCustomImageChange(idx, "crop", crop);
          setCustomImageWarnings((prev) => {
            const updated = { ...prev };
            delete updated[idx];
            return updated;
          });
          setCropModalState({ isOpen: false, imageIndex: 0, imageUrl: "" });
        }}
      />

      {/* Brand Logo Crop Modal */}
      <ImageCropModal
        isOpen={brandLogoCropModalOpen}
        onClose={() => {
          setBrandLogoCropModalOpen(false);
          setBrandLogoCropImageUrl("");
        }}
        imageUrl={brandLogoCropImageUrl}
        requiredWidth={400}
        requiredHeight={400}
        title="Crop Brand Logo"
        onConfirm={(crop: CropCoordinates) => {
          handleChange("creative.brandLogoCrop", crop);
          setBrandLogoOptionalCropHint(null);
          setBrandLogoCropModalOpen(false);
          setBrandLogoCropImageUrl("");
        }}
      />

      {/* Footer Actions */}
      <div className="p-4 flex items-center justify-end gap-3">
        <button type="button" onClick={handleCancel} className="cancel-button">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            addedAds.length === 0 || loading || !!brandLogoDimensionError
          }
          className="apply-button"
        >
          {loading ? "Creating..." : "Create All Ads"}
        </button>
      </div>
    </div>
  );
};
