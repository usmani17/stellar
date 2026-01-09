import React, { useState, useEffect } from "react";
import { Dropdown } from "../ui/Dropdown";
import { campaignsService } from "../../services/campaigns";
import type { Asset } from "../campaigns/AssetsTable";

export interface SBAdInput {
  name: string;
  state: "ENABLED" | "PAUSED";
  adGroupId: string;
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
  };
}

interface CreateSBAdPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ads: SBAdInput[]) => void;
  adgroups: Array<{ adGroupId: string; name: string }>;
  campaignId: string;
  accountId?: number;
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
  }, [isOpen, accountId]);

  const loadAssets = async () => {
    if (!accountId) return;
    
    try {
      setAssetsLoading(true);
      const data = await campaignsService.getAssets(accountId, {
        page: 1,
        page_size: 100, // Get all assets for dropdown
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
    const testData = {
      name: "Test SB Ad - 1/6/2026, 3:54:53 PM",
      state: "ENABLED" as const,
      adGroupId: "345267636818439",
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
    };

    // Use provided adGroupId if it exists in the list, otherwise use first available
    const adGroupId = adgroups.find(
      (ag) => ag.adGroupId === testData.adGroupId
    )
      ? testData.adGroupId
      : adgroups[0]?.adGroupId || "";

    setCurrentAd({
      ...testData,
      adGroupId,
    });

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Ad Name */}
          <div>
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Ad Name *
            </label>
            <input
              type="text"
              value={currentAd.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter ad name"
              className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                errors.name ? "border-red-500" : "border-gray-200"
              }`}
            />
            {errors.name && (
              <p className="text-[10px] text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* State */}
          <div>
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              State *
            </label>
            <Dropdown<string>
              options={STATE_OPTIONS}
              value={currentAd.state}
              onChange={(value) =>
                handleChange("state", value as "ENABLED" | "PAUSED")
              }
              placeholder="Select state"
              buttonClassName="w-full"
            />
          </div>

          {/* Ad Group */}
          <div>
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
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
              buttonClassName="w-full"
            />
            {errors.adGroupId && (
              <p className="text-[10px] text-red-500 mt-1">
                {errors.adGroupId}
              </p>
            )}
          </div>
        </div>

        {/* Landing Page Section */}
        <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-[13px] font-semibold text-[#072929] mb-3">
            Landing Page (Optional)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Page Type
              </label>
              <Dropdown<string>
                options={PAGE_TYPE_OPTIONS}
                value={currentAd.landingPage?.pageType || "PRODUCT_LIST"}
                onChange={(value) =>
                  handleChange("landingPage.pageType", value)
                }
                placeholder="Select page type"
                buttonClassName="w-full"
              />
            </div>
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                URL
              </label>
              <input
                type="text"
                value={currentAd.landingPage?.url || ""}
                onChange={(e) => handleChange("landingPage.url", e.target.value)}
                placeholder="https://www.amazon.com/s?me=TEST"
                className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
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
                  className="flex-1 bg-white px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
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
        <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-[13px] font-semibold text-[#072929] mb-3">
            Creative (Optional)
          </h3>

          {/* Brand Logo Crop */}
          <div className="mb-4">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11.2px]"
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11.2px]"
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11.2px]"
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11.2px]"
                />
              </div>
            </div>
          </div>

          {/* Creative Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Brand Name
              </label>
              <input
                type="text"
                value={currentAd.creative?.brandName || ""}
                onChange={(e) => handleChange("creative.brandName", e.target.value)}
                placeholder="My Brand"
                className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
              />
            </div>
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
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
                    .filter((asset) => asset.assetId) // Only show assets with assetId
                    .map((asset) => ({
                      value: asset.assetId || "",
                      label: asset.fileName
                        ? `${asset.fileName} (${asset.assetId})`
                        : asset.assetId || `Asset ${asset.id}`,
                    }))}
                  value={currentAd.creative?.brandLogoAssetID || ""}
                  onChange={(value) =>
                    handleChange("creative.brandLogoAssetID", value)
                  }
                  placeholder={assetsLoading ? "Loading..." : "Select Asset"}
                  buttonClassName="px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] bg-white hover:bg-gray-50 whitespace-nowrap min-w-[140px]"
                  disabled={assetsLoading || assets.length === 0}
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Headline
              </label>
              <input
                type="text"
                value={currentAd.creative?.headline || ""}
                onChange={(e) => handleChange("creative.headline", e.target.value)}
                placeholder="Shop Our Best Products"
                className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
              />
            </div>
          </div>

          {/* Creative ASINs */}
          <div className="mb-4">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
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
                  className="flex-1 bg-white px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
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

          {/* Consent to Translate */}
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

          {/* Creative Properties to Optimize */}
          <div className="mb-4">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
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

          {/* Custom Images */}
          <div>
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
              Custom Images (Optional)
            </label>
            {(currentAd.creative?.customImages || []).map((image, index) => (
              <div
                key={index}
                className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg"
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
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-[11.2px]"
                      />
                      <Dropdown<string>
                        options={assets
                          .filter((asset) => asset.assetId) // Only show assets with assetId
                          .map((asset) => ({
                            value: asset.assetId || "",
                            label: asset.fileName
                              ? `${asset.fileName} (${asset.assetId})`
                              : asset.assetId || `Asset ${asset.id}`,
                          }))}
                        value={image.assetId || ""}
                        onChange={(value) =>
                          handleCustomImageChange(index, "assetId", value)
                        }
                        placeholder={assetsLoading ? "Loading..." : "Select Asset"}
                        buttonClassName="px-3 py-2 border border-gray-200 rounded-lg text-[11.2px] bg-white hover:bg-gray-50 whitespace-nowrap min-w-[140px]"
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
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11.2px]"
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
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-[10px]"
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
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-[10px]"
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
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-[10px]"
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
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-[10px]"
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
                    <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Ad Name
                    </th>
                    <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      State
                    </th>
                    <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                      Ad Group
                    </th>
                    <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
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
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {ad.name}
                        </span>
                      </td>
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {ad.state}
                        </span>
                      </td>
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {getAdGroupName(ad.adGroupId)}
                        </span>
                      </td>
                      <td className="py-[10px] px-[10px]">
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

