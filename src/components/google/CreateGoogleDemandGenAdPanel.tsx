import React, { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

interface CreateGoogleDemandGenAdPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  loading?: boolean;
  submitError?: string | null;
}

type DemandGenAdType = "DemandGenVideoResponsiveAdInfo" | "DemandGenMultiAssetAdInfo" | "DemandGenCarouselAdInfo";

interface FormData {
  ad_type: DemandGenAdType;
  final_urls: string[];
  business_name: string;
  videos: string[];
  logo_images: string[];
  headlines: string[];
  descriptions: string[];
  long_headlines: string[];
  images: string[];
  carousel_cards: Array<{
    asset: string;
    headline: string;
    description: string;
  }>;
}

export const CreateGoogleDemandGenAdPanel: React.FC<CreateGoogleDemandGenAdPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  submitError = null,
}) => {
  const [formData, setFormData] = useState<FormData>({
    ad_type: "DemandGenMultiAssetAdInfo",
    final_urls: [""],
    business_name: "",
    videos: [""],
    logo_images: [""],
    headlines: ["", "", ""],
    descriptions: ["", ""],
    long_headlines: [""],
    images: [""],
    carousel_cards: [{ asset: "", headline: "", description: "" }],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Common validations
    if (!formData.business_name.trim()) {
      newErrors.business_name = "Business name is required";
    }

    if (formData.final_urls.length === 0 || !formData.final_urls[0].trim()) {
      newErrors.final_urls = "At least one final URL is required";
    }

    if (formData.headlines.length < 3) {
      newErrors.headlines = "At least 3 headlines are required";
    } else {
      formData.headlines.forEach((headline, index) => {
        if (!headline.trim()) {
          newErrors[`headline_${index}`] = `Headline ${index + 1} is required`;
        }
      });
    }

    if (formData.descriptions.length < 2) {
      newErrors.descriptions = "At least 2 descriptions are required";
    } else {
      formData.descriptions.forEach((description, index) => {
        if (!description.trim()) {
          newErrors[`description_${index}`] = `Description ${index + 1} is required`;
        }
      });
    }

    // Type-specific validations
    if (formData.ad_type === "DemandGenVideoResponsiveAdInfo") {
      if (formData.videos.length === 0 || !formData.videos[0].trim()) {
        newErrors.videos = "At least one video is required for Video Responsive ads";
      }
      if (formData.logo_images.length === 0 || !formData.logo_images[0].trim()) {
        newErrors.logo_images = "At least one logo image is required for Video Responsive ads";
      }
    }

    if (formData.ad_type === "DemandGenMultiAssetAdInfo") {
      if (formData.images.length === 0 || !formData.images[0].trim()) {
        newErrors.images = "At least one image is required for Multi Asset ads";
      }
    }

    if (formData.ad_type === "DemandGenCarouselAdInfo") {
      if (formData.carousel_cards.length === 0) {
        newErrors.carousel_cards = "At least one carousel card is required";
      } else {
        formData.carousel_cards.forEach((card, index) => {
          if (!card.asset.trim()) {
            newErrors[`carousel_asset_${index}`] = `Card ${index + 1} asset is required`;
          }
          if (!card.headline.trim()) {
            newErrors[`carousel_headline_${index}`] = `Card ${index + 1} headline is required`;
          }
          if (!card.description.trim()) {
            newErrors[`carousel_description_${index}`] = `Card ${index + 1} description is required`;
          }
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Clean the data before submission
    const cleanedData = {
      ...formData,
      final_urls: formData.final_urls.filter(url => url.trim()),
      videos: formData.videos.filter(video => video.trim()),
      logo_images: formData.logo_images.filter(img => img.trim()),
      headlines: formData.headlines.filter(h => h.trim()),
      descriptions: formData.descriptions.filter(d => d.trim()),
      long_headlines: formData.long_headlines.filter(lh => lh.trim()),
      images: formData.images.filter(img => img.trim()),
      carousel_cards: formData.carousel_cards.filter(card => 
        card.asset.trim() && card.headline.trim() && card.description.trim()
      ),
    };

    onSubmit(cleanedData);
  };

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const addArrayItem = (field: keyof FormData, defaultValue: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] as any[]), defaultValue]
    }));
  };

  const removeArrayItem = (field: keyof FormData, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as any[]).filter((_, i) => i !== index)
    }));
  };

  const updateArrayItem = (field: keyof FormData, index: number, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as any[]).map((item, i) => i === index ? value : item)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      {/* Form */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-[#072929]">
            Create Ad
          </h2>
        </div>

        {/* Ad Type Selection */}
        <div className="mb-6">
          <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
            Ad Type
          </h3>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="ad_type"
                value="DemandGenMultiAssetAdInfo"
                checked={formData.ad_type === "DemandGenMultiAssetAdInfo"}
                onChange={(e) => updateField("ad_type", e.target.value as DemandGenAdType)}
                className="w-4 h-4 text-[#136D6D] focus:ring-[#136D6D]"
              />
              <span className="text-[13.3px] text-[#072929]">Multi Asset Ad</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="ad_type"
                value="DemandGenVideoResponsiveAdInfo"
                checked={formData.ad_type === "DemandGenVideoResponsiveAdInfo"}
                onChange={(e) => updateField("ad_type", e.target.value as DemandGenAdType)}
                className="w-4 h-4 text-[#136D6D] focus:ring-[#136D6D]"
              />
              <span className="text-[13.3px] text-[#072929]">Video Responsive Ad</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="ad_type"
                value="DemandGenCarouselAdInfo"
                checked={formData.ad_type === "DemandGenCarouselAdInfo"}
                onChange={(e) => updateField("ad_type", e.target.value as DemandGenAdType)}
                className="w-4 h-4 text-[#136D6D] focus:ring-[#136D6D]"
              />
              <span className="text-[13.3px] text-[#072929]">Carousel Ad</span>
            </label>
          </div>
        </div>

        {/* Common Fields */}
        <div className="mb-6">
          <div className="mb-3">
            <label className="form-label-small">
              Business Name *
            </label>
            <input
              type="text"
              value={formData.business_name}
              onChange={(e) => updateField("business_name", e.target.value)}
              className={`campaign-input w-full ${
                errors.business_name ? "border-red-500" : ""
              }`}
              placeholder="Enter business name"
            />
            {errors.business_name && (
              <p className="text-[10px] text-red-500 mt-1">{errors.business_name}</p>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label-small">
              Final URLs *
            </label>
            {formData.final_urls.map((url, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => updateArrayItem("final_urls", index, e.target.value)}
                  className={`campaign-input flex-1 ${
                    errors.final_urls && index === 0 ? "border-red-500" : ""
                  }`}
                  placeholder="https://example.com"
                />
                {formData.final_urls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem("final_urls", index)}
                    className="p-2 hover:bg-red-50 rounded transition-colors"
                    title="Remove URL"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem("final_urls", "")}
              className="mt-2 text-[11.2px] text-[#136D6D] hover:underline"
            >
              + Add URL
            </button>
            {errors.final_urls && (
              <p className="text-[10px] text-red-500 mt-1">{errors.final_urls}</p>
            )}
          </div>
        </div>

        {/* Headlines */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <label className="form-label-small mb-0">
              Headlines * (3-15 required)
              <span className="text-[10px] text-[#556179] font-normal ml-2">
                ({formData.headlines.filter((h) => h.trim()).length}/15)
              </span>
            </label>
          </div>
          <div className="space-y-2">
            {formData.headlines.map((headline, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => updateArrayItem("headlines", index, e.target.value)}
                  className={`campaign-input flex-1 ${
                    errors[`headline_${index}`] ? "border-red-500" : ""
                  }`}
                  placeholder={`Headline ${index + 1}`}
                  maxLength={30}
                />
                {formData.headlines.length > 3 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem("headlines", index)}
                    className="p-2 hover:bg-red-50 rounded transition-colors"
                    title="Remove headline"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {formData.headlines.length < 15 && (
            <button
              type="button"
              onClick={() => addArrayItem("headlines", "")}
              className="mt-2 text-[11.2px] text-[#136D6D] hover:underline"
            >
              + Add Headline
            </button>
          )}
          {errors.headlines && (
            <p className="text-[10px] text-red-500 mt-1">{errors.headlines}</p>
          )}
        </div>

        {/* Descriptions */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <label className="form-label-small mb-0">
              Descriptions * (2-4 required)
              <span className="text-[10px] text-[#556179] font-normal ml-2">
                ({formData.descriptions.filter((d) => d.trim()).length}/4)
              </span>
            </label>
          </div>
          <div className="space-y-2">
            {formData.descriptions.map((description, index) => (
              <div key={index} className="flex gap-2 items-start">
                <textarea
                  value={description}
                  onChange={(e) => updateArrayItem("descriptions", index, e.target.value)}
                  className={`campaign-input flex-1 resize-none ${
                    errors[`description_${index}`] ? "border-red-500" : ""
                  }`}
                  placeholder={`Description ${index + 1}`}
                  maxLength={90}
                  rows={2}
                />
                {formData.descriptions.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem("descriptions", index)}
                    className="p-2 hover:bg-red-50 rounded transition-colors mt-1"
                    title="Remove description"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {formData.descriptions.length < 4 && (
            <button
              type="button"
              onClick={() => addArrayItem("descriptions", "")}
              className="mt-2 text-[11.2px] text-[#136D6D] hover:underline"
            >
              + Add Description
            </button>
          )}
          {errors.descriptions && (
            <p className="text-[10px] text-red-500 mt-1">{errors.descriptions}</p>
          )}
        </div>

        {/* Long Headlines */}
        <div className="mb-6">
          <div className="mb-3">
            <label className="form-label-small">
              Long Headlines (Optional)
            </label>
            {formData.long_headlines.map((longHeadline, index) => (
              <div key={index} className="flex gap-2 items-center mb-2">
                <input
                  type="text"
                  value={longHeadline}
                  onChange={(e) => updateArrayItem("long_headlines", index, e.target.value)}
                  className="campaign-input flex-1"
                  placeholder={`Long Headline ${index + 1}`}
                  maxLength={90}
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem("long_headlines", index)}
                  className="p-2 hover:bg-red-50 rounded transition-colors"
                  title="Remove long headline"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem("long_headlines", "")}
              className="mt-2 text-[11.2px] text-[#136D6D] hover:underline"
            >
              + Add Long Headline
            </button>
          </div>
        </div>

        {/* Type-specific fields */}
        {formData.ad_type === "DemandGenVideoResponsiveAdInfo" && (
          <div className="mb-6">
            <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
              Video Responsive Ad Fields
            </h3>
            
            {/* Videos */}
            <div className="mb-3">
              <label className="form-label-small">
                Videos *
              </label>
              {formData.videos.map((video, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={video}
                    onChange={(e) => updateArrayItem("videos", index, e.target.value)}
                    className={`campaign-input flex-1 ${
                      errors.videos && index === 0 ? "border-red-500" : ""
                    }`}
                    placeholder="YouTube video ID or URL"
                  />
                  {formData.videos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem("videos", index)}
                      className="p-2 hover:bg-red-50 rounded transition-colors"
                      title="Remove video"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem("videos", "")}
                className="mt-2 text-[11.2px] text-[#136D6D] hover:underline"
              >
                + Add Video
              </button>
              {errors.videos && (
                <p className="text-[10px] text-red-500 mt-1">{errors.videos}</p>
              )}
            </div>

            {/* Logo Images */}
            <div className="mb-3">
              <label className="form-label-small">
                Logo Images *
              </label>
              {formData.logo_images.map((logo, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={logo}
                    onChange={(e) => updateArrayItem("logo_images", index, e.target.value)}
                    className={`campaign-input flex-1 ${
                      errors.logo_images && index === 0 ? "border-red-500" : ""
                    }`}
                    placeholder="Logo image URL"
                  />
                  {formData.logo_images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem("logo_images", index)}
                      className="p-2 hover:bg-red-50 rounded transition-colors"
                      title="Remove logo"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem("logo_images", "")}
                className="mt-2 text-[11.2px] text-[#136D6D] hover:underline"
              >
                + Add Logo
              </button>
              {errors.logo_images && (
                <p className="text-[10px] text-red-500 mt-1">{errors.logo_images}</p>
              )}
            </div>
          </div>
        )}

        {formData.ad_type === "DemandGenMultiAssetAdInfo" && (
          <div className="mb-6">
            <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
              Multi Asset Ad Fields
            </h3>
            
            {/* Images */}
            <div className="mb-3">
              <label className="form-label-small">
                Images *
              </label>
              {formData.images.map((image, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={image}
                    onChange={(e) => updateArrayItem("images", index, e.target.value)}
                    className={`campaign-input flex-1 ${
                      errors.images && index === 0 ? "border-red-500" : ""
                    }`}
                    placeholder="Image URL"
                  />
                  {formData.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem("images", index)}
                      className="p-2 hover:bg-red-50 rounded transition-colors"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem("images", "")}
                className="mt-2 text-[11.2px] text-[#136D6D] hover:underline"
              >
                + Add Image
              </button>
              {errors.images && (
                <p className="text-[10px] text-red-500 mt-1">{errors.images}</p>
              )}
            </div>
          </div>
        )}

        {formData.ad_type === "DemandGenCarouselAdInfo" && (
          <div className="mb-6">
            <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
              Carousel Ad Fields
            </h3>
            
            {/* Carousel Cards */}
            <div className="mb-3">
              <label className="form-label-small">
                Carousel Cards *
              </label>
              {formData.carousel_cards.map((card, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 text-sm">Card {index + 1}</h4>
                    {formData.carousel_cards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem("carousel_cards", index)}
                        className="p-2 hover:bg-red-50 rounded transition-colors"
                        title="Remove card"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="form-label-small">
                        Asset *
                      </label>
                      <input
                        type="text"
                        value={card.asset}
                        onChange={(e) => updateArrayItem("carousel_cards", index, { ...card, asset: e.target.value })}
                        className={`campaign-input w-full ${
                          errors[`carousel_asset_${index}`] ? "border-red-500" : ""
                        }`}
                        placeholder="Asset resource name or URL"
                      />
                      {errors[`carousel_asset_${index}`] && (
                        <p className="text-[10px] text-red-500 mt-1">{errors[`carousel_asset_${index}`]}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="form-label-small">
                        Headline *
                      </label>
                      <input
                        type="text"
                        value={card.headline}
                        onChange={(e) => updateArrayItem("carousel_cards", index, { ...card, headline: e.target.value })}
                        className={`campaign-input w-full ${
                          errors[`carousel_headline_${index}`] ? "border-red-500" : ""
                        }`}
                        placeholder="Card headline"
                        maxLength={30}
                      />
                      {errors[`carousel_headline_${index}`] && (
                        <p className="text-[10px] text-red-500 mt-1">{errors[`carousel_headline_${index}`]}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="form-label-small">
                        Description *
                      </label>
                      <textarea
                        value={card.description}
                        onChange={(e) => updateArrayItem("carousel_cards", index, { ...card, description: e.target.value })}
                        className={`campaign-input w-full resize-none ${
                          errors[`carousel_description_${index}`] ? "border-red-500" : ""
                        }`}
                        placeholder="Card description"
                        maxLength={90}
                        rows={2}
                      />
                      {errors[`carousel_description_${index}`] && (
                        <p className="text-[10px] text-red-500 mt-1">{errors[`carousel_description_${index}`]}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem("carousel_cards", { asset: "", headline: "", description: "" })}
                className="mt-2 text-[11.2px] text-[#136D6D] hover:underline"
              >
                + Add Card
              </button>
              {errors.carousel_cards && (
                <p className="text-[10px] text-red-500 mt-1">{errors.carousel_cards}</p>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {submitError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{submitError}</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
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
          {loading ? "Creating..." : "Create Ad"}
        </button>
      </div>
    </div>
  );
};
