import React, { useState, useEffect } from "react";
import { Dropdown } from "../ui/Dropdown";
import { campaignsService } from "../../services/campaigns";
import type { Asset } from "../campaigns/AssetsTable";

export interface SBAdInput {
  name: string;
  state: "ENABLED" | "PAUSED";
  adGroupId: string;
  adType?: "IMAGE" | "VIDEO"; // New field for ad type
  videoAdType?: "PRODUCT" | "BRAND"; // For VIDEO ads: PRODUCT or BRAND
  landingPage?: {
    asins?: string[];
    pageType?: "PRODUCT_LIST";
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

const PAGE_TYPE_OPTIONS = [
  { value: "PRODUCT_LIST", label: "PRODUCT_LIST" },
];

const CREATIVE_PROPERTIES_OPTIONS = [
  { value: "HEADLINE", label: "HEADLINE" },
];

export const CreateSBAdPanel: React.FC<CreateSBAdPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  adgroups,
  accountId,
  profileId,
  loading = false,
  submitError = null,
  fieldErrors = {},
  createdAds = [],
  failedCount = 0,
  failedAds = [],
}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);

  // Fetch assets when component opens
  useEffect(() => {
    if (isOpen && accountId) {
      loadAssets();
    }
  }, [isOpen, accountId, profileId]);

  const loadAssets = async () => {
    if (!accountId) return;
    
    try {
      setAssetsLoading(true);
      const data = await campaignsService.getAssets(accountId, {
        page: 1,
        page_size: 100, // Get all assets for dropdown
        ...(profileId && { profileId }), // Include profileId if available to filter assets
      });
      setAssets(data.assets || []);
    } catch (error) {
      console.error("Failed to load assets:", error);
      setAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  };
  const [currentAd, setCurrentAd] = useState<SBAdInput>({
    name: "",
    state: "ENABLED",
    adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
    adType: undefined, // No default - form will be readonly until selected
    videoAdType: "PRODUCT", // Default to PRODUCT for video ads
    landingPage: {
      asins: [],
      pageType: "PRODUCT_LIST",
      url: "",
    },
    creative: {
      brandLogoCrop: {
        top: 0,
        left: 0,
        width: 100,
        height: 100,
      },
      asins: [],
      brandName: "",
      brandLogoAssetID: "",
      headline: "",
      consentToTranslate: false,
      creativePropertiesToOptimize: [],
      customImages: [],
      videoAssetIds: [], // For video ads
    },
  });

  const [addedAds, setAddedAds] = useState<SBAdInput[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showJsonPreview, setShowJsonPreview] = useState(false);

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
          (_, i) => i !== index
        ),
      };
      return updated;
    });
  };

  const handleCustomImageChange = (
    index: number,
    field: string,
    value: any
  ) => {
    setCurrentAd((prev) => {
      const updated = { ...prev };
      const images = [...(updated.creative?.customImages || [])];
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        images[index] = {
          ...images[index],
          [parent]: {
            ...(images[index] as any)[parent],
            [child]: value,
          },
        };
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

    // Validate video ads
    if (currentAd.adType === "VIDEO") {
      if (!currentAd.videoAdType) {
        newErrors.videoAdType = "Video ad type is required";
      }
      if (!currentAd.creative?.videoAssetIds || currentAd.creative.videoAssetIds.length === 0) {
        newErrors.videoAssetIds = "At least one video asset ID is required for video ads";
      }
      // Brand video ads require additional fields
      if (currentAd.videoAdType === "BRAND") {
        if (!currentAd.creative?.brandName) {
          newErrors.brandName = "Brand name is required for brand video ads";
        }
        if (!currentAd.creative?.brandLogoAssetID) {
          newErrors.brandLogoAssetID = "Brand logo asset ID is required for brand video ads";
        }
        if (!currentAd.creative?.headline) {
          newErrors.headline = "Headline is required for brand video ads";
        }
        if (!currentAd.landingPage?.url) {
          newErrors.landingPageUrl = "Landing page URL is required for brand video ads";
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

    // Add landingPage if it has any data
    // Note: url and asins are mutually exclusive - only include one
    if (currentAd.landingPage) {
      const hasAsins =
        currentAd.landingPage.asins &&
        currentAd.landingPage.asins.filter((a) => a.trim()).length > 0;
      const hasUrl = currentAd.landingPage.url && currentAd.landingPage.url.trim();

      if (hasAsins || hasUrl) {
        cleanedAd.landingPage = {
          pageType: currentAd.landingPage.pageType || "PRODUCT_LIST",
        };

        // Only include asins OR url, not both (mutually exclusive)
        if (hasAsins) {
          cleanedAd.landingPage.asins = currentAd.landingPage.asins.filter(
            (a) => a.trim()
          );
        } else if (hasUrl) {
          cleanedAd.landingPage.url = currentAd.landingPage.url.trim();
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
          (img) => img.assetId?.trim() || img.url?.trim()
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
        creative.videoAssetIds = currentAd.creative.videoAssetIds.filter(
          (id) => id.trim()
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
    setCurrentAd({
      name: "",
      state: "ENABLED",
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      adType: undefined, // Reset - form will be readonly until selected
      videoAdType: "PRODUCT", // Reset to default
      landingPage: {
        asins: [],
        pageType: "PRODUCT_LIST",
        url: "",
      },
      creative: {
        brandLogoCrop: {
          top: 0,
          left: 0,
          width: 100,
          height: 100,
        },
        asins: [],
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
  };

  const handleRemoveAd = (index: number) => {
    setAddedAds((prev) => prev.filter((_, i) => i !== index));
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
    setCurrentAd({
      name: "",
      state: "ENABLED",
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      landingPage: {
        asins: [],
        pageType: "PRODUCT_LIST",
        url: "",
      },
      creative: {
        brandLogoCrop: {
          top: 0,
          left: 0,
          width: 100,
          height: 100,
        },
        asins: [],
        brandName: "",
        brandLogoAssetID: "",
        headline: "",
        consentToTranslate: false,
        creativePropertiesToOptimize: [],
        customImages: [],
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
    const adGroupId = adgroups.find(
      (ag) => ag.adGroupId === testAdGroupId
    )
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
          videoAssetIds: ["amzn1.assetlibrary.asset1.ddbc2868d036a471a166bc5cce31b866"],
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
          brandLogoAssetID: "amzn1.assetlibrary.asset1.c5c3fd754ca1c4d389d9bbbd7348ac10",
          headline: "Shop Our Best Products",
          consentToTranslate: true,
          creativePropertiesToOptimize: ["HEADLINE"],
          customImages: [
            {
              assetId: "amzn1.assetlibrary.asset1.c5c3fd754ca1c4d389d9bbbd7348ac10",
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
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
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
        <div className="flex items-end gap-3 mb-4">
          {/* Ad Name */}
          <div className="flex-1 min-w-[200px]">
            <label className="form-label-small">
              Ad Name *
            </label>
            <input
              type="text"
              value={currentAd.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter ad name"
              disabled={!currentAd.adType}
              className={`w-full campaign-input px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                errors.name ? "border-red-500" : "border-gray-200"
              } ${!currentAd.adType ? "opacity-50 cursor-not-allowed" : ""}`}
            />
            {errors.name && (
              <p className="text-[10px] text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* State */}
          <div className="w-[140px]">
            <label className="form-label-small">
              State *
            </label>
            <Dropdown<string>
              options={STATE_OPTIONS}
              value={currentAd.state}
              onChange={(value) =>
                handleChange("state", value as "ENABLED" | "PAUSED")
              }
              placeholder="Select state"
              buttonClassName={`edit-button w-full ${!currentAd.adType ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={!currentAd.adType}
            />
          </div>

          {/* Ad Type */}
          <div className="w-[140px]">
            <label className="form-label-small">
              Ad Type *
            </label>
            <Dropdown<string>
              options={AD_TYPE_OPTIONS}
              value={currentAd.adType || ""}
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
          </div>

          {/* Ad Group */}
          <div className="flex-1 min-w-[180px] w-full">
            <label className="form-label-small">
              Ad Group *
            </label>
            <Dropdown<string>
              options={adgroups.map((ag) => ({
                value: ag.adGroupId,
                label: ag.name,
              }))}
              value={currentAd.adGroupId}
              onChange={(value) => handleChange("adGroupId", value)}
              placeholder="Select ad group"
              buttonClassName={`edit-button w-full ${!currentAd.adType ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={!currentAd.adType}
            />
            {errors.adGroupId && (
              <p className="text-[10px] text-red-500 mt-1">
                {errors.adGroupId}
              </p>
            )}
          </div>
        </div>

        {/* Video Ad Type Toggle - Only show when Video is selected */}
        {currentAd.adType === "VIDEO" && (
          <div className="mb-4">
            <label className="form-label-small">
              Video Type
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="videoAdType"
                  value="PRODUCT"
                  checked={currentAd.videoAdType === "PRODUCT"}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleChange("videoAdType", "PRODUCT");
                    }
                  }}
                  className="accent-forest-f40"
                />
                <span className="text-[11.2px] text-[#556179]">Product Video</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="videoAdType"
                  value="BRAND"
                  checked={currentAd.videoAdType === "BRAND"}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleChange("videoAdType", "BRAND");
                    }
                  }}
                  className="accent-forest-f40"
                />
                <span className="text-[11.2px] text-[#556179]">Brand Video</span>
              </label>
            </div>
          </div>
        )}

        {/* Landing Page Section */}
        <div className={`mb-4 p-3  border border-gray-200 rounded-lg ${!currentAd.adType ? "opacity-50 pointer-events-none" : ""}`}>
          <h3 className="text-[13px] font-semibold text-[#072929] mb-3">
            Landing Page {currentAd.adType === "VIDEO" && currentAd.videoAdType === "BRAND" ? "" : "(Optional)"}
          </h3>
          <div className="flex items-end gap-3">
            <div className="w-[180px]">
              <label className="form-label-small">
                Page Type
              </label>
              <Dropdown<string>
                options={PAGE_TYPE_OPTIONS}
                value={currentAd.landingPage?.pageType || "PRODUCT_LIST"}
                onChange={(value) =>
                  handleChange("landingPage.pageType", value)
                }
                placeholder="Select page type"
                buttonClassName="edit-button w-full"
                disabled={!currentAd.adType}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="form-label-small">
                URL {currentAd.adType === "VIDEO" && currentAd.videoAdType === "BRAND" ? "*" : ""}
              </label>
              <input
                type="text"
                value={currentAd.landingPage?.url || ""}
                onChange={(e) => handleChange("landingPage.url", e.target.value)}
                placeholder="https://www.amazon.com/s?me=TEST"
                disabled={!currentAd.adType}
                className={`w-full campaign-input px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                  !currentAd.adType ? "opacity-50 cursor-not-allowed border-gray-200" : 
                  (currentAd.adType === "VIDEO" && currentAd.videoAdType === "BRAND" && errors.landingPageUrl) ? "border-red-500" : "border-gray-200"
                }`}
              />
              {currentAd.adType === "VIDEO" && currentAd.videoAdType === "BRAND" && errors.landingPageUrl && (
                <p className="text-[10px] text-red-500 mt-1">{errors.landingPageUrl}</p>
              )}
            </div>
          </div>
          <div className="mt-3">
            <label className="form-label-small">
              ASINs (Optional)
            </label>
            {(currentAd.landingPage?.asins || []).map((asin, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={asin}
                  onChange={(e) =>
                    handleArrayChange("landingPage.asins", index, e.target.value)
                  }
                  placeholder="B01EXAMPLE"
                  className="flex-1 w-full campaign-input px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveArrayItem("landingPage.asins", index)}
                  className="px-3 py-2.5 text-red-500 hover:text-red-700 text-[11.2px]"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => handleAddArrayItem("landingPage.asins")}
              className="text-[11.2px] text-[#136D6D] hover:text-[#0e5a5a]"
            >
              + Add ASIN
            </button>
          </div>
        </div>

        {/* Creative Section */}
        <div className="mb-4 p-3  border border-gray-200 rounded-lg">
          <h3 className="text-[13px] font-semibold text-[#072929] mb-3">
            Creative (Optional)
          </h3>

          {/* Brand Logo Crop - For IMAGE ads and BRAND video ads */}
          {(currentAd.adType === "IMAGE" || (currentAd.adType === "VIDEO" && currentAd.videoAdType === "BRAND")) && (
            <div className="mb-4">
              <label className="form-label-small">
                Brand Logo Crop
              </label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-600 mb-1">Top</label>
                  <input
                    type="number"
                    value={currentAd.creative?.brandLogoCrop?.top || 0}
                    onChange={(e) =>
                      handleChange(
                        "creative.brandLogoCrop.top",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-full campaign-input px-3 py-2 border border-gray-200 rounded-lg text-[11.2px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-1">Left</label>
                  <input
                    type="number"
                    value={currentAd.creative?.brandLogoCrop?.left || 0}
                    onChange={(e) =>
                      handleChange(
                        "creative.brandLogoCrop.left",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-full campaign-input px-3 py-2 border border-gray-200 rounded-lg text-[11.2px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-1">Width</label>
                  <input
                    type="number"
                    value={currentAd.creative?.brandLogoCrop?.width || 100}
                    onChange={(e) =>
                      handleChange(
                        "creative.brandLogoCrop.width",
                        parseInt(e.target.value) || 100
                      )
                    }
                    className="w-full campaign-input px-3 py-2 border border-gray-200 rounded-lg text-[11.2px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-1">Height</label>
                  <input
                    type="number"
                    value={currentAd.creative?.brandLogoCrop?.height || 100}
                    onChange={(e) =>
                      handleChange(
                        "creative.brandLogoCrop.height",
                        parseInt(e.target.value) || 100
                      )
                    }
                    className="w-full campaign-input px-3 py-2 border border-gray-200 rounded-lg text-[11.2px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Creative Fields - Conditional based on ad type */}
          {currentAd.adType === "IMAGE" ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="form-label-small">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={currentAd.creative?.brandName || ""}
                    onChange={(e) => handleChange("creative.brandName", e.target.value)}
                    placeholder="My Brand"
                    className="w-full campaign-input px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                  />
                </div>
                <div>
                  <label className="form-label-small">
                    Brand Logo Asset ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={currentAd.creative?.brandLogoAssetID || ""}
                      onChange={(e) =>
                        handleChange("creative.brandLogoAssetID", e.target.value)
                      }
                      placeholder="amzn1.assetlibrary.asset1..."
                      className="flex-1 bg-white px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                    />
                    <Dropdown<string>
                      options={assets
                        .filter((asset) => {
                          if (!asset.assetId) return false;
                          // Check new schema: assetType === 'IMAGE' or fileMetadata.contentType
                          const isImageByAssetType = asset.assetType === 'IMAGE';
                          const isImageByContentType = asset.contentType?.toLowerCase().startsWith('image/');
                          const isImageByFileMetadata = asset.fileMetadata?.contentType?.toLowerCase().startsWith('image/');
                          // Fallback to old schema for backward compatibility
                          const isImageByMediaType = asset.mediaType?.toLowerCase() === 'image';
                          return isImageByAssetType || isImageByContentType || isImageByFileMetadata || isImageByMediaType;
                        }) // Only show image assets
                        .map((asset) => ({
                          value: asset.assetId || "",
                          label: asset.name || asset.fileName
                            ? `${asset.name || asset.fileName} (${asset.assetId})`
                            : asset.assetId || `Asset ${asset.id}`,
                        }))}
                      value={currentAd.creative?.brandLogoAssetID || ""}
                      onChange={(value) => {
                        // Update the text field when an option is selected
                        handleChange("creative.brandLogoAssetID", value);
                      }}
                      placeholder={assetsLoading ? "Loading..." : "Select Asset"}
                      buttonClassName="edit-button w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] bg-white hover:bg-gray-50 max-w-[300px] flex-shrink-0 truncate"
                      menuClassName="max-w-[300px]"
                      optionClassName="truncate"
                      renderOption={(option, isSelected) => (
                        <div className="flex items-center justify-between w-full min-w-0">
                          <span className="truncate flex-1 max-w-[300px]">{option.label}</span>
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
                <div className="md:col-span-2">
                  <label className="form-label-small">
                    Headline
                  </label>
                  <input
                    type="text"
                    value={currentAd.creative?.headline || ""}
                    onChange={(e) => handleChange("creative.headline", e.target.value)}
                    placeholder="Shop Our Best Products"
                    className="w-full campaign-input px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                  />
                </div>
              </div>
            </>
          ) : currentAd.adType === "VIDEO" && currentAd.videoAdType === "BRAND" ? (
            <>
              {/* Brand Video Ad Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="form-label-small">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    value={currentAd.creative?.brandName || ""}
                    onChange={(e) => handleChange("creative.brandName", e.target.value)}
                    placeholder="My Brand"
                    className={`w-full campaign-input px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                      errors.brandName ? "border-red-500" : "border-gray-200"
                    }`}
                  />
                  {errors.brandName && (
                    <p className="text-[10px] text-red-500 mt-1">{errors.brandName}</p>
                  )}
                </div>
                <div>
                  <label className="form-label-small">
                    Brand Logo Asset ID *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={currentAd.creative?.brandLogoAssetID || ""}
                      onChange={(e) =>
                        handleChange("creative.brandLogoAssetID", e.target.value)
                      }
                      placeholder="amzn1.assetlibrary.asset1..."
                      className={`flex-1 w-full campaign-input px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                        errors.brandLogoAssetID ? "border-red-500" : "border-gray-200"
                      }`}
                    />
                    <Dropdown<string>
                      options={assets
                        .filter((asset) => {
                          if (!asset.assetId) return false;
                          // Check new schema: assetType === 'IMAGE' or fileMetadata.contentType
                          const isImageByAssetType = asset.assetType === 'IMAGE';
                          const isImageByContentType = asset.contentType?.toLowerCase().startsWith('image/');
                          const isImageByFileMetadata = asset.fileMetadata?.contentType?.toLowerCase().startsWith('image/');
                          // Fallback to old schema for backward compatibility
                          const isImageByMediaType = asset.mediaType?.toLowerCase() === 'image';
                          return isImageByAssetType || isImageByContentType || isImageByFileMetadata || isImageByMediaType;
                        }) // Only show image assets
                        .map((asset) => ({
                          value: asset.assetId || "",
                          label: asset.name || asset.fileName
                            ? `${asset.name || asset.fileName} (${asset.assetId})`
                            : asset.assetId || `Asset ${asset.id}`,
                        }))}
                      value={currentAd.creative?.brandLogoAssetID || ""}
                      onChange={(value) => {
                        // Update the text field when an option is selected
                        handleChange("creative.brandLogoAssetID", value);
                      }}
                      placeholder={assetsLoading ? "Loading..." : "Select Asset"}
                      buttonClassName="edit-button w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] bg-white hover:bg-gray-50 max-w-[300px] flex-shrink-0 truncate"
                      menuClassName="max-w-[300px]"
                      optionClassName="truncate"
                      renderOption={(option, isSelected) => (
                        <div className="flex items-center justify-between w-full min-w-0">
                          <span className="truncate flex-1 max-w-[300px]">{option.label}</span>
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
                  {errors.brandLogoAssetID && (
                    <p className="text-[10px] text-red-500 mt-1">{errors.brandLogoAssetID}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="form-label-small">
                    Headline *
                  </label>
                  <input
                    type="text"
                    value={currentAd.creative?.headline || ""}
                    onChange={(e) => handleChange("creative.headline", e.target.value)}
                    placeholder="Shop Our Best Products"
                    className={`w-full campaign-input px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                      errors.headline ? "border-red-500" : "border-gray-200"
                    }`}
                  />
                  {errors.headline && (
                    <p className="text-[10px] text-red-500 mt-1">{errors.headline}</p>
                  )}
                </div>
              </div>

              {/* Video Asset IDs for Brand Video */}
              <div className="mb-4">
                <label className="form-label-small">
                  Video Asset IDs *
                </label>
                <div className="space-y-2">
                  {/* Text input to manually add video asset IDs */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="amzn1.assetlibrary.asset1..."
                      className="flex-1 w-full campaign-input px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const input = e.currentTarget as HTMLInputElement;
                          const value = input.value.trim();
                          if (value) {
                            const currentIds = currentAd.creative?.videoAssetIds || [];
                            if (!currentIds.includes(value)) {
                              handleChange("creative.videoAssetIds", [...currentIds, value]);
                              input.value = '';
                            }
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                        const value = input.value.trim();
                        if (value) {
                          const currentIds = currentAd.creative?.videoAssetIds || [];
                          if (!currentIds.includes(value)) {
                            handleChange("creative.videoAssetIds", [...currentIds, value]);
                            input.value = '';
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
                          const isVideoByMediaType = asset.mediaType?.toLowerCase() === 'video';
                          const isVideoByContentType = asset.contentType?.toLowerCase().startsWith('video/');
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
                          const currentIds = currentAd.creative?.videoAssetIds || [];
                          if (!currentIds.includes(value)) {
                            handleChange("creative.videoAssetIds", [...currentIds, value]);
                          }
                        }
                      }}
                      placeholder={assetsLoading ? "Loading..." : "Select Video Asset"}
                      buttonClassName="edit-button w-full flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] bg-white hover:bg-gray-50 min-w-[400px]"
                      menuClassName="min-w-[400px]"
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
                  </div>
                </div>
                
                {/* Display selected video asset IDs */}
                {currentAd.creative?.videoAssetIds && currentAd.creative.videoAssetIds.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] text-[#556179] mb-1">Selected ({currentAd.creative.videoAssetIds.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {currentAd.creative.videoAssetIds.map((assetId, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-[#136D6D] text-white text-[10px] rounded"
                        >
                          {assetId}
                          <button
                            type="button"
                            onClick={() => {
                              const currentIds = currentAd.creative?.videoAssetIds || [];
                              handleChange(
                                "creative.videoAssetIds",
                                currentIds.filter((id) => id !== assetId)
                              );
                            }}
                            className="hover:text-red-200"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {errors.videoAssetIds && (
                  <p className="text-[10px] text-red-500 mt-1">{errors.videoAssetIds}</p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Product Video Ad Fields - Only Video Asset IDs */}
              <div className="mb-4">
                <label className="form-label-small">
                  Video Asset IDs *
                </label>
                <div className="space-y-2">
                  {/* Text input to manually add video asset IDs */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="amzn1.assetlibrary.asset1..."
                      className="flex-1 w-full campaign-input px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const input = e.currentTarget as HTMLInputElement;
                          const value = input.value.trim();
                          if (value) {
                            const currentIds = currentAd.creative?.videoAssetIds || [];
                            if (!currentIds.includes(value)) {
                              handleChange("creative.videoAssetIds", [...currentIds, value]);
                              input.value = '';
                            }
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                        const value = input.value.trim();
                        if (value) {
                          const currentIds = currentAd.creative?.videoAssetIds || [];
                          if (!currentIds.includes(value)) {
                            handleChange("creative.videoAssetIds", [...currentIds, value]);
                            input.value = '';
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
                          const isVideoByMediaType = asset.mediaType?.toLowerCase() === 'video';
                          const isVideoByContentType = asset.contentType?.toLowerCase().startsWith('video/');
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
                          const currentIds = currentAd.creative?.videoAssetIds || [];
                          if (!currentIds.includes(value)) {
                            handleChange("creative.videoAssetIds", [...currentIds, value]);
                          }
                        }
                      }}
                      placeholder={assetsLoading ? "Loading..." : "Select Video Asset"}
                      buttonClassName="edit-button w-full flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] bg-white hover:bg-gray-50 min-w-[400px]"
                      menuClassName="min-w-[400px]"
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
                  </div>
                </div>
                
                {/* Display selected video asset IDs */}
                {currentAd.creative?.videoAssetIds && currentAd.creative.videoAssetIds.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] text-[#556179] mb-1">Selected ({currentAd.creative.videoAssetIds.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {currentAd.creative.videoAssetIds.map((assetId, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-[#136D6D] text-white text-[10px] rounded"
                        >
                          {assetId}
                          <button
                            type="button"
                            onClick={() => {
                              const currentIds = currentAd.creative?.videoAssetIds || [];
                              handleChange(
                                "creative.videoAssetIds",
                                currentIds.filter((id) => id !== assetId)
                              );
                            }}
                            className="hover:text-red-200"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Creative ASINs */}
          <div className="mb-4">
            <label className="form-label-small">
              Creative ASINs (Optional)
            </label>
            {(currentAd.creative?.asins || []).map((asin, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={asin}
                  onChange={(e) =>
                    handleArrayChange("creative.asins", index, e.target.value)
                  }
                  placeholder="B01EXAMPLE"
                  className="flex-1 w-full campaign-input px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveArrayItem("creative.asins", index)}
                  className="px-3 py-2.5 text-red-500 hover:text-red-700 text-[11.2px]"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => handleAddArrayItem("creative.asins")}
              className="text-[11.2px] text-[#136D6D] hover:text-[#0e5a5a]"
            >
              + Add ASIN
            </button>
          </div>

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
              </label>
              <div className="flex flex-wrap gap-2">
                {CREATIVE_PROPERTIES_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        currentAd.creative?.creativePropertiesToOptimize?.includes(
                          option.value
                        ) || false
                      }
                      onChange={(e) => {
                        const current =
                          currentAd.creative?.creativePropertiesToOptimize || [];
                        if (e.target.checked) {
                          handleChange("creative.creativePropertiesToOptimize", [
                            ...current,
                            option.value,
                          ]);
                        } else {
                          handleChange(
                            "creative.creativePropertiesToOptimize",
                            current.filter((v) => v !== option.value)
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
            </div>
          )}

          {/* Custom Images - Only for IMAGE ads */}
          {currentAd.adType === "IMAGE" && (
            <div>
              <label className="form-label-small">
                Custom Images (Optional)
              </label>
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
                    className="text-[11.2px] text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-1">
                      Asset ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={image.assetId || ""}
                        onChange={(e) =>
                          handleCustomImageChange(index, "assetId", e.target.value)
                        }
                        placeholder="amzn1.assetlibrary.asset1..."
                        className="flex-1 min-w-[200px] w-full campaign-input px-3 py-2 border border-gray-200 rounded-lg text-[11.2px]"
                      />
                      <Dropdown<string>
                        options={assets
                          .filter((asset) => {
                            if (!asset.assetId) return false;
                            // For custom images, show IMAGE type assets
                            const isImageByAssetType = asset.assetType === 'IMAGE';
                            const isImageByContentType = asset.contentType?.toLowerCase().startsWith('image/');
                            const isImageByFileMetadata = asset.fileMetadata?.contentType?.toLowerCase().startsWith('image/');
                            // Fallback to old schema for backward compatibility
                            const isImageByMediaType = asset.mediaType?.toLowerCase() === 'image';
                            return isImageByAssetType || isImageByContentType || isImageByFileMetadata || isImageByMediaType;
                          })
                          .map((asset) => ({
                            value: asset.assetId || "",
                            label: asset.name || asset.fileName
                              ? `${asset.name || asset.fileName} (${asset.assetId})`
                              : asset.assetId || `Asset ${asset.id}`,
                          }))}
                        value={image.assetId || ""}
                        onChange={(value) => {
                          handleCustomImageChange(index, "assetId", value || "");
                        }}
                        placeholder={assetsLoading ? "Loading..." : "Select Asset"}
                        buttonClassName="edit-button px-3 py-2 border border-gray-200 rounded-lg text-[11.2px] bg-white hover:bg-gray-50 max-w-[300px] truncate"
                        menuClassName="max-w-[300px]"
                        optionClassName="truncate"
                        renderOption={(option, isSelected) => (
                          <div className="flex items-center justify-between w-full min-w-0">
                            <span className="truncate flex-1 max-w-[300px]">{option.label}</span>
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
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-1">
                      URL
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
                <div>
                  <label className="block text-[10px] text-gray-600 mb-1">
                    Crop
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[9px] text-gray-500 mb-1">
                        Top
                      </label>
                      <input
                        type="number"
                        value={image.crop?.top || 0}
                        onChange={(e) =>
                          handleCustomImageChange(index, "crop.top", parseInt(e.target.value) || 0)
                        }
                        className="w-full campaign-input px-2 py-1.5 border border-gray-200 rounded text-[10px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 mb-1">
                        Left
                      </label>
                      <input
                        type="number"
                        value={image.crop?.left || 0}
                        onChange={(e) =>
                          handleCustomImageChange(index, "crop.left", parseInt(e.target.value) || 0)
                        }
                        className="w-full campaign-input px-2 py-1.5 border border-gray-200 rounded text-[10px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 mb-1">
                        Width
                      </label>
                      <input
                        type="number"
                        value={image.crop?.width || 100}
                        onChange={(e) =>
                          handleCustomImageChange(index, "crop.width", parseInt(e.target.value) || 100)
                        }
                        className="w-full campaign-input px-2 py-1.5 border border-gray-200 rounded text-[10px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 mb-1">
                        Height
                      </label>
                      <input
                        type="number"
                        value={image.crop?.height || 100}
                        onChange={(e) =>
                          handleCustomImageChange(index, "crop.height", parseInt(e.target.value) || 100)
                        }
                        className="w-full campaign-input px-2 py-1.5 border border-gray-200 rounded text-[10px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddCustomImage}
              className="text-[11.2px] text-[#136D6D] hover:text-[#0e5a5a]"
            >
              + Add Custom Image
            </button>
          </div>
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
            className="px-4 py-2.5 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors"
          >
            Add Ad
          </button>
        </div>
      </div>

      {/* Added Ads Table */}
      {addedAds.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
            Added Ads ({addedAds.length})
          </h3>
          <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[#e8e8e3]">
                    <th className="table-header">
                      Ad Name
                    </th>
                    <th className="table-header">
                      State
                    </th>
                    <th className="table-header">
                      Ad Group
                    </th>
                    <th className="table-header">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {addedAds.map((ad, index) => (
                    <tr
                      key={index}
                      className={`${
                        index !== addedAds.length - 1
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
                        <button
                          type="button"
                          onClick={() => handleRemoveAd(index)}
                          className="text-red-500 hover:text-red-700 text-[13.3px]"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
          disabled={addedAds.length === 0 || loading}
          className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create All Ads"}
        </button>
      </div>
    </div>
  );
};

