import React, { useState, useEffect } from "react";

export interface PmaxAssetGroupInput {
  asset_group: {
    name: string;
    final_url?: string;
  };
  assets: {
    headlines: string[];
    descriptions: string[];
    long_headline: string;
    marketing_image_url?: string;
    square_marketing_image_url?: string;
    business_name?: string;
    logo_url?: string;
  };
}

export interface AssetGroupInitialData {
  asset_group_name?: string;
  final_url?: string;
  headlines?: string[];
  descriptions?: string[];
  long_headline?: string;
  marketing_image_url?: string;
  square_marketing_image_url?: string;
  business_name?: string;
  logo_url?: string;
}

interface CreateGooglePmaxAssetGroupPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entity: PmaxAssetGroupInput) => void;
  campaignId: string;
  loading?: boolean;
  submitError?: string | null;
  editMode?: boolean;
  initialData?: AssetGroupInitialData | null;
  assetGroupId?: string | number;
  refreshMessage?: {
    type: "loading" | "success" | "error";
    message: string;
    details?: string;
  } | null;
}

export const CreateGooglePmaxAssetGroupPanel: React.FC<
  CreateGooglePmaxAssetGroupPanelProps
> = ({
  isOpen,
  onClose,
  onSubmit,
  campaignId: _campaignId,
  loading = false,
  submitError = null,
  editMode = false,
  initialData = null,
  assetGroupId: _assetGroupId,
  refreshMessage = null,
}) => {
    const generateDefaultAssetGroupName = React.useCallback((): string => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const milliseconds = String(now.getMilliseconds()).padStart(3, "0");
      const dateTime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}.${milliseconds}`;
      return `Performance Max Asset Group - ${dateTime}`;
    }, []);

    const [assetGroupName, setAssetGroupName] = useState(
      generateDefaultAssetGroupName()
    );
    const [finalUrl, setFinalUrl] = useState<string>("");
    const [headlines, setHeadlines] = useState<string[]>(["", "", ""]);
    const [descriptions, setDescriptions] = useState<string[]>(["", ""]);
    const [longHeadline, setLongHeadline] = useState<string>("");
    const [marketingImageUrl, setMarketingImageUrl] = useState<string>("");
    const [squareMarketingImageUrl, setSquareMarketingImageUrl] = useState<string>("");
    const [businessName, setBusinessName] = useState<string>("");
    const [logoUrl, setLogoUrl] = useState<string>("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Image previews
    const [marketingImagePreview, setMarketingImagePreview] = useState<string | null>(null);
    const [squareMarketingImagePreview, setSquareMarketingImagePreview] = useState<string | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    // Initialize form fields from initialData when in edit mode
    useEffect(() => {
      if (editMode && initialData) {
        setAssetGroupName(initialData.asset_group_name || "");
        setFinalUrl(initialData.final_url || "");

        // Ensure minimum arrays for headlines and descriptions
        if (Array.isArray(initialData.headlines) && initialData.headlines.length > 0) {
          setHeadlines(initialData.headlines);
        } else {
          setHeadlines(["", "", ""]);
        }

        if (Array.isArray(initialData.descriptions) && initialData.descriptions.length > 0) {
          setDescriptions(initialData.descriptions);
        } else {
          setDescriptions(["", ""]);
        }

        setLongHeadline(initialData.long_headline || "");
        setMarketingImageUrl(initialData.marketing_image_url || "");
        setSquareMarketingImageUrl(initialData.square_marketing_image_url || "");
        setBusinessName(initialData.business_name || "");
        setLogoUrl(initialData.logo_url || "");
      } else if (!editMode) {
        // Reset to defaults when not in edit mode
        setAssetGroupName(generateDefaultAssetGroupName());
        setFinalUrl("");
        setHeadlines(["", "", ""]);
        setDescriptions(["", ""]);
        setLongHeadline("");
        setMarketingImageUrl("");
        setSquareMarketingImageUrl("");
        setBusinessName("");
        setLogoUrl("");
      }
    }, [editMode, initialData, generateDefaultAssetGroupName]);

    // Update image previews when URLs change
    useEffect(() => {
      if (marketingImageUrl && marketingImageUrl.trim()) {
        setMarketingImagePreview(marketingImageUrl.trim());
      } else {
        setMarketingImagePreview(null);
      }
    }, [marketingImageUrl]);

    useEffect(() => {
      if (squareMarketingImageUrl && squareMarketingImageUrl.trim()) {
        setSquareMarketingImagePreview(squareMarketingImageUrl.trim());
      } else {
        setSquareMarketingImagePreview(null);
      }
    }, [squareMarketingImageUrl]);

    useEffect(() => {
      if (logoUrl && logoUrl.trim()) {
        setLogoPreview(logoUrl.trim());
      } else {
        setLogoPreview(null);
      }
    }, [logoUrl]);

    const validate = (): boolean => {
      const newErrors: Record<string, string> = {};

      if (!assetGroupName.trim()) {
        newErrors.assetGroupName = "Asset Group name is required";
      }

      const validHeadlines = headlines.filter((h) => h.trim()).length;
      if (validHeadlines < 3) {
        newErrors.headlines = "At least 3 headlines are required";
      }
      if (validHeadlines > 15) {
        newErrors.headlines = "Maximum 15 headlines allowed";
      }

      const validDescriptions = descriptions.filter((d) => d.trim()).length;
      if (validDescriptions < 2) {
        newErrors.descriptions = "At least 2 descriptions are required";
      }
      if (validDescriptions > 4) {
        newErrors.descriptions = "Maximum 4 descriptions allowed";
      }

      if (!longHeadline.trim()) {
        newErrors.longHeadline = "Long headline is required";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleAddHeadline = () => {
      if (headlines.length < 15) {
        setHeadlines([...headlines, ""]);
      }
    };

    const handleRemoveHeadline = (index: number) => {
      if (headlines.length > 3) {
        setHeadlines(headlines.filter((_, i) => i !== index));
      }
    };

    const handleAddDescription = () => {
      if (descriptions.length < 4) {
        setDescriptions([...descriptions, ""]);
      }
    };

    const handleRemoveDescription = (index: number) => {
      if (descriptions.length > 2) {
        setDescriptions(descriptions.filter((_, i) => i !== index));
      }
    };

    const handleSubmit = () => {
      if (!validate()) {
        return;
      }

      const entity: PmaxAssetGroupInput = {
        asset_group: {
          name: assetGroupName.trim(),
          ...(finalUrl.trim() && { final_url: finalUrl.trim() }),
        },
        assets: {
          headlines: headlines.filter((h) => h.trim()),
          descriptions: descriptions.filter((d) => d.trim()),
          long_headline: longHeadline.trim(),
          ...(marketingImageUrl.trim() && { marketing_image_url: marketingImageUrl.trim() }),
          ...(squareMarketingImageUrl.trim() && { square_marketing_image_url: squareMarketingImageUrl.trim() }),
          ...(businessName.trim() && { business_name: businessName.trim() }),
          ...(logoUrl.trim() && { logo_url: logoUrl.trim() }),
        },
      };

      onSubmit(entity);
    };

    const handleCancel = () => {
      if (editMode && initialData) {
        // Reset to initial data in edit mode
        setAssetGroupName(initialData.asset_group_name || "");
        setFinalUrl(initialData.final_url || "");
        setHeadlines(Array.isArray(initialData.headlines) && initialData.headlines.length > 0 ? initialData.headlines : ["", "", ""]);
        setDescriptions(Array.isArray(initialData.descriptions) && initialData.descriptions.length > 0 ? initialData.descriptions : ["", ""]);
        setLongHeadline(initialData.long_headline || "");
        setMarketingImageUrl(initialData.marketing_image_url || "");
        setSquareMarketingImageUrl(initialData.square_marketing_image_url || "");
        setBusinessName(initialData.business_name || "");
        setLogoUrl(initialData.logo_url || "");
      } else {
        // Reset to defaults in create mode
        setAssetGroupName(generateDefaultAssetGroupName());
        setFinalUrl("");
        setHeadlines(["", "", ""]);
        setDescriptions(["", ""]);
        setLongHeadline("");
        setMarketingImageUrl("");
        setSquareMarketingImageUrl("");
        setBusinessName("");
        setLogoUrl("");
      }
      setErrors({});
      onClose();
    };

    if (!isOpen) return null;

    return (
      <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
        {/* Loading Overlay */}
        {refreshMessage?.type === "loading" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg border border-gray-200 pointer-events-auto">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#136D6D] border-t-transparent"></div>
                <span className="text-sm font-medium text-[#072929]">
                  {refreshMessage.message}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
            {editMode ? "Edit Asset Group" : "Create Asset Group"}
          </h2>

          {/* Asset Group Section */}
          <div className="mb-6">
            <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
              Asset Group
            </h3>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="form-label-small">
                  Asset Group Name *
                </label>
                <input
                  type="text"
                  value={assetGroupName}
                  onChange={(e) => {
                    setAssetGroupName(e.target.value);
                    if (errors.assetGroupName) {
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.assetGroupName;
                        return newErrors;
                      });
                    }
                  }}
                  placeholder="Enter asset group name"
                  className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${errors.assetGroupName ? "border-red-500" : "border-gray-200"
                    }`}
                />
                {errors.assetGroupName && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.assetGroupName}
                  </p>
                )}
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="form-label-small">
                  Final URL (Optional)
                </label>
                <input
                  type="url"
                  value={finalUrl}
                  onChange={(e) => setFinalUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                />
              </div>
            </div>
          </div>

          {/* Assets Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold text-[#072929]">
                Assets
              </h3>
              <button
                type="button"
                onClick={() => {
                  // Fill dummy values for quick testing
                  setHeadlines([
                    "Best Products Online",
                    "Shop Now and Save",
                    "Quality You Can Trust",
                    "Free Shipping Available",
                    "Limited Time Offer"
                  ]);
                  setDescriptions([
                    "Discover amazing deals on our premium products. Shop now and enjoy fast delivery!",
                    "Get the best prices on quality items. Customer satisfaction guaranteed."
                  ]);
                  setLongHeadline("Unlock unparalleled value and exceptional quality with our diverse range of products.");
                  setFinalUrl("https://pixis.ai");
                  setMarketingImageUrl("");
                  setSquareMarketingImageUrl("");
                  // Clear any errors
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.headlines;
                    delete newErrors.descriptions;
                    delete newErrors.longHeadline;
                    return newErrors;
                  });
                }}
                className="text-[10px] text-[#136D6D] hover:text-[#0e5a5a] hover:underline px-2 py-1"
                title="Fill with dummy values for testing"
              >
                Fill Dummy Values
              </button>
            </div>
            <div className="mb-3">
              <label className="form-label-small">
                Headlines * (3-15 required)
              </label>
              <div className="space-y-2">
                {headlines.map((headline, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => {
                        const newHeadlines = [...headlines];
                        newHeadlines[index] = e.target.value;
                        setHeadlines(newHeadlines);
                        if (errors.headlines) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.headlines;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder={`Headline ${index + 1}`}
                      maxLength={30}
                      className={`flex-1 bg-white px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${errors.headlines ? "border-red-500" : "border-gray-200"
                        }`}
                    />
                    {headlines.length > 3 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveHeadline(index)}
                        className="text-red-500 hover:text-red-700 text-[11.2px] px-2"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {headlines.length < 15 && (
                <button
                  type="button"
                  onClick={handleAddHeadline}
                  className="mt-2 text-[11.2px] text-[#136D6D] hover:underline"
                >
                  + Add Headline
                </button>
              )}
              {errors.headlines && (
                <p className="text-[10px] text-red-500 mt-1">{errors.headlines}</p>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label-small">
                Descriptions * (2-4 required)
              </label>
              <div className="space-y-2">
                {descriptions.map((description, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <textarea
                      value={description}
                      onChange={(e) => {
                        const newDescriptions = [...descriptions];
                        newDescriptions[index] = e.target.value;
                        setDescriptions(newDescriptions);
                        if (errors.descriptions) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.descriptions;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder={`Description ${index + 1}`}
                      maxLength={90}
                      rows={2}
                      className={`flex-1 bg-white px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${errors.descriptions ? "border-red-500" : "border-gray-200"
                        }`}
                    />
                    {descriptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDescription(index)}
                        className="text-red-500 hover:text-red-700 text-[11.2px] px-2"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {descriptions.length < 4 && (
                <button
                  type="button"
                  onClick={handleAddDescription}
                  className="mt-2 text-[11.2px] text-[#136D6D] hover:underline"
                >
                  + Add Description
                </button>
              )}
              {errors.descriptions && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.descriptions}
                </p>
              )}
            </div>

            {/* Optional Performance Max Fields - 2 columns per row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Row 1: Long Headline and Business Name */}
              <div>
                <label className="form-label-small">
                  Long Headline * (Required)
                </label>
                <input
                  type="text"
                  value={longHeadline}
                  onChange={(e) => {
                    setLongHeadline(e.target.value);
                    if (errors.longHeadline) {
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.longHeadline;
                        return newErrors;
                      });
                    }
                  }}
                  placeholder="Enter long headline (max 90 characters)"
                  maxLength={90}
                  className={`bg-white w-full px-3 py-2 border rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${errors.longHeadline ? "border-red-500" : "border-gray-200"
                    }`}
                />
                {errors.longHeadline && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.longHeadline}
                  </p>
                )}
              </div>

              <div>
                <label className="form-label-small">
                  Business Name (Optional)
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Enter business name"
                  className="bg-white w-full px-3 py-2 border border-gray-200 rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                />
              </div>

              {/* Row 2: Marketing Image URLs */}
              <div>
                <label className="form-label-small">
                  Marketing Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={marketingImageUrl}
                  onChange={(e) => setMarketingImageUrl(e.target.value)}
                  placeholder="https://example.com/marketing-image.png"
                  className="bg-white w-full px-3 py-2 border border-gray-200 rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                />
                <p className="text-[10px] text-[#556179] mt-1">
                  Recommended: 1200x628 pixels. If not provided, a default image will be generated.
                </p>
                {/* Marketing Image Preview */}
                {marketingImagePreview && (
                  <div className="mt-2">
                    <p className="text-[10px] text-[#556179] mb-1 font-medium">Preview:</p>
                    <div className="inline-block border border-gray-200 rounded bg-white p-1">
                      <img
                        src={marketingImagePreview}
                        alt="Marketing image preview"
                        className="max-w-48 max-h-32 w-auto h-auto object-contain block rounded"
                        onError={(e) => {
                          // Hide preview on error (e.g., CORS issues, invalid URL)
                          const img = e.currentTarget;
                          img.style.display = "none";
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="form-label-small">
                  Square Marketing Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={squareMarketingImageUrl}
                  onChange={(e) => setSquareMarketingImageUrl(e.target.value)}
                  placeholder="https://example.com/square-image.png"
                  className="bg-white w-full px-3 py-2 border border-gray-200 rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                />
                <p className="text-[10px] text-[#556179] mt-1">
                  Recommended: 1200x1200 pixels. If not provided, a default image will be generated.
                </p>
                {/* Square Marketing Image Preview */}
                {squareMarketingImagePreview && (
                  <div className="mt-2">
                    <p className="text-[10px] text-[#556179] mb-1 font-medium">Preview:</p>
                    <div className="inline-block border border-gray-200 rounded bg-white p-1">
                      <img
                        src={squareMarketingImagePreview}
                        alt="Square marketing image preview"
                        className="w-32 h-32 object-contain rounded"
                        onError={(e) => {
                          // Hide preview on error (e.g., CORS issues, invalid URL)
                          const img = e.currentTarget;
                          img.style.display = "none";
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="form-label-small">
                  Logo URL (Optional)
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="bg-white w-full px-3 py-2 border border-gray-200 rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                />
                <p className="text-[10px] text-[#556179] mt-1">
                  Recommended: Square logo (1:1 aspect ratio). If not provided, a default logo will be used.
                </p>
                {/* Logo Preview */}
                {logoPreview && (
                  <div className="mt-2">
                    <p className="text-[10px] text-[#556179] mb-1 font-medium">Preview:</p>
                    <div className="inline-block border border-gray-200 rounded p-1 bg-white">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-32 h-32 object-contain rounded"
                        onError={(e) => {
                          // Hide preview on error (e.g., CORS issues, invalid URL)
                          const img = e.currentTarget;
                          img.style.display = "none";
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
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
            {loading
              ? editMode
                ? "Updating..."
                : "Creating..."
              : editMode
                ? "Update Asset Group"
                : "Create Asset Group"}
          </button>
        </div>
      </div>
    );
  };

