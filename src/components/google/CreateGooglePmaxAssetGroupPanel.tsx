import React, { useState } from "react";

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
  };
}

interface CreateGooglePmaxAssetGroupPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entity: PmaxAssetGroupInput) => void;
  campaignId: string;
  loading?: boolean;
  submitError?: string | null;
}

export const CreateGooglePmaxAssetGroupPanel: React.FC<
  CreateGooglePmaxAssetGroupPanelProps
> = ({
  isOpen,
  onClose,
  onSubmit,
  campaignId,
  loading = false,
  submitError = null,
}) => {
  const generateDefaultAssetGroupName = (): string => {
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
  };

  const [assetGroupName, setAssetGroupName] = useState(
    generateDefaultAssetGroupName()
  );
  const [finalUrl, setFinalUrl] = useState<string>("");
  const [headlines, setHeadlines] = useState<string[]>(["", "", ""]);
  const [descriptions, setDescriptions] = useState<string[]>(["", ""]);
  const [longHeadline, setLongHeadline] = useState<string>("");
  const [marketingImageUrl, setMarketingImageUrl] = useState<string>("");
  const [squareMarketingImageUrl, setSquareMarketingImageUrl] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      },
    };

    onSubmit(entity);
  };

  const handleCancel = () => {
    setAssetGroupName(generateDefaultAssetGroupName());
    setFinalUrl("");
    setHeadlines(["", "", ""]);
    setDescriptions(["", ""]);
    setLongHeadline("");
    setMarketingImageUrl("");
    setSquareMarketingImageUrl("");
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      {/* Form */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
          Create Asset Group
        </h2>

        {/* Asset Group Section */}
        <div className="mb-6">
          <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
            Asset Group
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
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
                className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                  errors.assetGroupName ? "border-red-500" : "border-gray-200"
                }`}
              />
              {errors.assetGroupName && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.assetGroupName}
                </p>
              )}
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
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
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
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
                    className={`flex-1 bg-white px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                      errors.headlines ? "border-red-500" : "border-gray-200"
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
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
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
                    className={`flex-1 bg-white px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                      errors.descriptions ? "border-red-500" : "border-gray-200"
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

          <div className="w-full">
            <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
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
              className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                errors.longHeadline ? "border-red-500" : "border-gray-200"
              }`}
            />
            {errors.longHeadline && (
              <p className="text-[10px] text-red-500 mt-1">
                {errors.longHeadline}
              </p>
            )}
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Marketing Image URL (Optional)
              </label>
              <input
                type="url"
                value={marketingImageUrl}
                onChange={(e) => setMarketingImageUrl(e.target.value)}
                placeholder="https://example.com/marketing-image.png"
                className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
              />
              <p className="text-[10px] text-[#556179] mt-1">
                Recommended: 1200x628 pixels. If not provided, a default image will be generated.
              </p>
            </div>

            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Square Marketing Image URL (Optional)
              </label>
              <input
                type="url"
                value={squareMarketingImageUrl}
                onChange={(e) => setSquareMarketingImageUrl(e.target.value)}
                placeholder="https://example.com/square-image.png"
                className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
              />
              <p className="text-[10px] text-[#556179] mt-1">
                Recommended: 1200x1200 pixels. If not provided, a default image will be generated.
              </p>
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
          {loading ? "Creating..." : "Create Asset Group"}
        </button>
      </div>
    </div>
  );
};

