import React, { useState, useMemo, useEffect } from "react";
import { X, Plus, Trash2, FlaskConical } from "lucide-react";
import type { Asset } from "../../services/googleAdwords/googleAdwordsAssets";
import { AssetSelectorModal } from "./AssetSelectorModal";
import { Dropdown } from "../ui/Dropdown";

/** Selected asset stored for display; we send only resource_name to the API. */
export interface SelectedAssetEntry {
  resource_name: string;
  name: string;
}

export interface DemandGenAdGroupOption {
  adgroup_id?: number | string;
  id?: number;
  adgroup_name?: string;
  name?: string;
  status?: string;
}

interface CreateGoogleDemandGenAdPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, options?: { saveAsDraft?: boolean }) => void;
  loading?: boolean;
  submitError?: string | null;
  /** Required for asset selector (videos, logos, images). */
  profileId?: number | null;
  /** Ad groups for the campaign; when provided, user must select one. */
  adgroups?: DemandGenAdGroupOption[];
}

type DemandGenAdType = "DemandGenVideoResponsiveAdInfo" | "DemandGenMultiAssetAdInfo" | "DemandGenCarouselAdInfo";

interface FormData {
  ad_type: DemandGenAdType;
  final_urls: string[];
  business_name: string;
  /** Video assets selected via AssetSelectorModal (resource names sent to API). */
  videos: SelectedAssetEntry[];
  /** Logo image assets selected via AssetSelectorModal. */
  logo_images: SelectedAssetEntry[];
  headlines: string[];
  descriptions: string[];
  /** When set, backend uses asset at this index instead of text (same as Search Ads). */
  headline_asset_resource_names?: (string | undefined)[];
  description_asset_resource_names?: (string | undefined)[];
  long_headlines: string[];
  /** Image assets for Multi Asset ad, selected via AssetSelectorModal. */
  images: SelectedAssetEntry[];
  /** Carousel cards: only asset (image resource name) per card; API has no headline/description per card. */
  carousel_cards: Array<{
    asset: string;
    assetName?: string;
  }>;
}

export const CreateGoogleDemandGenAdPanel: React.FC<CreateGoogleDemandGenAdPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  submitError = null,
  profileId = null,
  adgroups = [],
}) => {
  const [selectedAdGroupId, setSelectedAdGroupId] = useState<string>("");
  const [formData, setFormData] = useState<FormData>({
    ad_type: "DemandGenMultiAssetAdInfo",
    final_urls: [""],
    business_name: "",
    videos: [],
    logo_images: [],
    headlines: ["", "", ""],
    descriptions: ["", ""],
    long_headlines: [""],
    images: [],
    carousel_cards: [{ asset: "" }, { asset: "" }],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [assetSelectorOpen, setAssetSelectorOpen] = useState(false);
  const [assetSelectorType, setAssetSelectorType] = useState<"VIDEO" | "LOGO" | "IMAGE" | "CAROUSEL_IMAGE" | "HEADLINE" | "DESCRIPTION">("VIDEO");
  const [assetSelectorTextIndex, setAssetSelectorTextIndex] = useState<number | null>(null);
  const [carouselAssetSelectorIndex, setCarouselAssetSelectorIndex] = useState<number | null>(null);

  const adGroupOptions = useMemo(() => {
    if (!adgroups || adgroups.length === 0) return [];
    const isDraft = (ag: DemandGenAdGroupOption) => {
      const s = (ag.status || "").toUpperCase();
      const id = ag.adgroup_id ?? ag.id;
      return s === "SAVED_DRAFT" || s === "DRAFT" || String(id ?? "").startsWith("draft-");
    };
    return adgroups
      .filter((ag) => ag.status !== "REMOVED" && ag.status !== "Removed")
      .map((ag) => {
        const baseLabel = ag.adgroup_name || ag.name || `Ad Group ${ag.adgroup_id ?? ag.id}`;
        const label = isDraft(ag) ? `DRAFT-${baseLabel}` : baseLabel;
        return {
          value: String(ag.adgroup_id ?? ag.id ?? ""),
          label,
        };
      });
  }, [adgroups]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedAdGroupId("");
      return;
    }
    if (adgroups?.length === 1) {
      const id = adgroups[0].adgroup_id ?? adgroups[0].id;
      setSelectedAdGroupId(id != null ? String(id) : "");
    } else {
      setSelectedAdGroupId("");
    }
  }, [isOpen, adgroups]);

  const handleSelectAsset = (asset: Asset) => {
    if (assetSelectorType === "HEADLINE" && asset.type === "TEXT" && "text" in asset && assetSelectorTextIndex !== null) {
      const newHeadlines = [...formData.headlines];
      while (newHeadlines.length <= assetSelectorTextIndex) newHeadlines.push("");
      newHeadlines[assetSelectorTextIndex] = asset.text;
      const names = [...(formData.headline_asset_resource_names || [])];
      while (names.length <= assetSelectorTextIndex) names.push(undefined);
      names[assetSelectorTextIndex] = asset.resource_name;
      updateField("headlines", newHeadlines);
      updateField("headline_asset_resource_names", names);
      setAssetSelectorTextIndex(null);
      setAssetSelectorOpen(false);
      return;
    }
    if (assetSelectorType === "DESCRIPTION" && asset.type === "TEXT" && "text" in asset && assetSelectorTextIndex !== null) {
      const newDescriptions = [...formData.descriptions];
      while (newDescriptions.length <= assetSelectorTextIndex) newDescriptions.push("");
      newDescriptions[assetSelectorTextIndex] = asset.text;
      const names = [...(formData.description_asset_resource_names || [])];
      while (names.length <= assetSelectorTextIndex) names.push(undefined);
      names[assetSelectorTextIndex] = asset.resource_name;
      updateField("descriptions", newDescriptions);
      updateField("description_asset_resource_names", names);
      setAssetSelectorTextIndex(null);
      setAssetSelectorOpen(false);
      return;
    }
    if (assetSelectorType === "CAROUSEL_IMAGE" && carouselAssetSelectorIndex !== null) {
      updateArrayItem("carousel_cards", carouselAssetSelectorIndex, {
        ...formData.carousel_cards[carouselAssetSelectorIndex],
        asset: asset.resource_name,
        assetName: asset.name || asset.resource_name,
      });
      setCarouselAssetSelectorIndex(null);
    } else {
      const entry: SelectedAssetEntry = { resource_name: asset.resource_name, name: asset.name || asset.resource_name };
      if (assetSelectorType === "VIDEO") {
        updateField("videos", [...formData.videos, entry]);
      } else if (assetSelectorType === "LOGO") {
        updateField("logo_images", [...formData.logo_images, entry]);
      } else {
        updateField("images", [...formData.images, entry]);
      }
    }
    setAssetSelectorOpen(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (adgroups && adgroups.length > 0 && !selectedAdGroupId.trim()) {
      newErrors.adgroup_id = "Ad group is required";
    }

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
        const fromAsset = formData.headline_asset_resource_names?.[index];
        if (!headline.trim() && !fromAsset) {
          newErrors[`headline_${index}`] = `Headline ${index + 1} is required (or select an asset)`;
        }
      });
    }

    if (formData.descriptions.length < 2) {
      newErrors.descriptions = "At least 2 descriptions are required";
    } else {
      formData.descriptions.forEach((description, index) => {
        const fromAsset = formData.description_asset_resource_names?.[index];
        if (!description.trim() && !fromAsset) {
          newErrors[`description_${index}`] = `Description ${index + 1} is required (or select an asset)`;
        }
      });
    }

    // Type-specific validations (videos/logo_images/images are selected assets only)
    if (formData.ad_type === "DemandGenVideoResponsiveAdInfo") {
      if (formData.videos.length === 0) {
        newErrors.videos = "Select at least one video asset";
      }
      if (formData.logo_images.length === 0) {
        newErrors.logo_images = "Select at least one logo asset";
      }
    }

    if (formData.ad_type === "DemandGenMultiAssetAdInfo") {
      if (formData.logo_images.length === 0) {
        newErrors.logo_images = "Select at least one logo asset (required for Multi Asset ad)";
      }
      if (formData.images.length === 0) {
        newErrors.images = "Select at least one image asset";
      }
    }

    if (formData.ad_type === "DemandGenCarouselAdInfo") {
      if (!formData.business_name.trim()) {
        newErrors.business_name = "Business name is required for Carousel ad";
      }
      if (formData.logo_images.length === 0) {
        newErrors.logo_images = "Select at least one logo asset (required for Carousel ad)";
      }
      if (!formData.headlines.some(h => h.trim())) {
        newErrors.headlines = "At least one headline is required for Carousel ad";
      }
      if (!formData.descriptions.some(d => d.trim())) {
        newErrors.descriptions = "At least one description is required for Carousel ad";
      }
      if (formData.carousel_cards.length < 2) {
        newErrors.carousel_cards = "At least 2 carousel cards are required";
      } else {
        formData.carousel_cards.forEach((card, index) => {
          if (!card.asset.trim()) {
            newErrors[`carousel_asset_${index}`] = `Card ${index + 1} image asset is required`;
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

    // Clean the data before submission (videos/logo_images/images are asset resource names only).
    // Send full headlines/descriptions arrays so indices align with headline_asset_resource_names/description_asset_resource_names.
    const cleanedData: any = {
      ...formData,
      final_urls: formData.final_urls.filter(url => url.trim()),
      videos: formData.videos.map(v => v.resource_name),
      logo_images: formData.logo_images.map(l => l.resource_name),
      headlines: formData.headlines,
      descriptions: formData.descriptions,
      long_headlines: formData.long_headlines.filter(lh => lh.trim()),
      images: formData.images.map(i => i.resource_name),
      carousel_cards: formData.carousel_cards
        .filter(card => card.asset.trim())
        .map(card => ({ asset: card.asset })),
    };
    if (formData.headline_asset_resource_names?.length) cleanedData.headline_asset_resource_names = formData.headline_asset_resource_names;
    if (formData.description_asset_resource_names?.length) cleanedData.description_asset_resource_names = formData.description_asset_resource_names;
    if (selectedAdGroupId) cleanedData.adgroup_id = selectedAdGroupId;

    onSubmit(cleanedData);
  };

  const handleSaveAsDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    const cleanedData: any = {
      ...formData,
      final_urls: formData.final_urls.filter(url => url.trim()),
      videos: formData.videos.map(v => v.resource_name),
      logo_images: formData.logo_images.map(l => l.resource_name),
      headlines: formData.headlines,
      descriptions: formData.descriptions,
      long_headlines: formData.long_headlines.filter(lh => lh.trim()),
      images: formData.images.map(i => i.resource_name),
      carousel_cards: formData.carousel_cards
        .filter(card => card.asset.trim())
        .map(card => ({ asset: card.asset })),
    };
    if (formData.headline_asset_resource_names?.length) cleanedData.headline_asset_resource_names = formData.headline_asset_resource_names;
    if (formData.description_asset_resource_names?.length) cleanedData.description_asset_resource_names = formData.description_asset_resource_names;
    if (selectedAdGroupId) cleanedData.adgroup_id = selectedAdGroupId;
    onSubmit(cleanedData, { saveAsDraft: true });
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

  /** Fill form with sample data for the currently selected ad type. Videos/logos/images must be selected via asset selector. */
  const fillWithTestData = () => {
    const common = {
      final_urls: ["https://www.example.com"],
      business_name: "Interplanetary Cruises",
      headlines: ["Interplanetary cruises", "Headline 2", "Headline 3"],
      descriptions: ["Book now for an extra discount", "Description 2"],
      long_headlines: ["Travel the World"],
    };
    setFormData(prev => {
      if (prev.ad_type === "DemandGenVideoResponsiveAdInfo") {
        return { ...prev, ...common, videos: prev.videos, logo_images: prev.logo_images };
      }
      if (prev.ad_type === "DemandGenMultiAssetAdInfo") {
        return { ...prev, ...common, images: prev.images };
      }
      if (prev.ad_type === "DemandGenCarouselAdInfo") {
        return {
          ...prev,
          ...common,
          carousel_cards: [
            { asset: "" },
            { asset: "" },
          ],
        };
      }
      return { ...prev, ...common };
    });
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      {/* Form */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-[16px] font-semibold text-[#072929]">
            Create Ad
          </h2>
          <button
            type="button"
            onClick={fillWithTestData}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11.2px] font-medium text-[#136D6D] border border-[#136D6D]/40 rounded-lg hover:bg-[#136D6D]/8 transition-colors"
            title="Fill form with sample data for the selected ad type"
          >
            <FlaskConical className="w-4 h-4" />
            Fill with test data
          </button>
        </div>

        {adgroups && adgroups.length === 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11.2px]">
            Create an ad group first.
          </div>
        )}

        {adgroups && adgroups.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
              Ad group *
            </h3>
            <Dropdown
              options={adGroupOptions}
              value={selectedAdGroupId}
              onChange={(val) => {
                setSelectedAdGroupId(val as string);
                if (errors.adgroup_id) setErrors((prev) => ({ ...prev, adgroup_id: "" }));
              }}
              placeholder="Select an ad group"
              buttonClassName="w-full"
            />
            {errors.adgroup_id && (
              <p className="text-[10px] text-red-500 mt-1">{errors.adgroup_id}</p>
            )}
          </div>
        )}

        {/* Ad Type Selection */}
        <div className="mb-6">
          <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
            Ad Type
          </h3>
          <div className="max-w-xs">
            <Dropdown
              options={[
                { value: "DemandGenMultiAssetAdInfo", label: "Multi Asset Ad" },
                { value: "DemandGenVideoResponsiveAdInfo", label: "Video Responsive Ad" },
                { value: "DemandGenCarouselAdInfo", label: "Carousel Ad" }
              ]}
              value={formData.ad_type}
              onChange={(val) => updateField("ad_type", val as DemandGenAdType)}
              buttonClassName="w-full"
            />
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
                ({formData.headlines.filter((h, i) => h.trim() || formData.headline_asset_resource_names?.[i]).length}/15)
              </span>
            </label>
          </div>
          <div className="space-y-2">
            {formData.headlines.map((headline, index) => {
              const headlineAssetRn = formData.headline_asset_resource_names?.[index];
              return (
                <div key={index} className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => {
                        if (headlineAssetRn) {
                          const names = [...(formData.headline_asset_resource_names || [])];
                          names[index] = undefined;
                          updateField("headline_asset_resource_names", names);
                        }
                        updateArrayItem("headlines", index, e.target.value);
                      }}
                      readOnly={!!headlineAssetRn}
                      className={`campaign-input w-full pr-28 ${
                        errors[`headline_${index}`] ? "border-red-500" : ""
                        } ${headlineAssetRn ? "bg-gray-50 border-gray-200 cursor-not-allowed" : ""}`}
                      placeholder={`Headline ${index + 1} (max 30 characters)`}
                      maxLength={30}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {headlineAssetRn && (
                        <span className="text-[10px] px-2 py-1 bg-[#136D6D]/10 text-[#136D6D] rounded font-medium whitespace-nowrap">
                          From Asset
                        </span>
                      )}
                      {profileId && !headlineAssetRn && (
                        <button
                          type="button"
                          onClick={() => {
                            setAssetSelectorType("HEADLINE");
                            setAssetSelectorTextIndex(index);
                            setAssetSelectorOpen(true);
                          }}
                          className="text-xs text-[#136D6D] hover:text-[#0f5a5a] font-medium whitespace-nowrap"
                        >
                          Select Asset
                        </button>
                      )}
                      {headlineAssetRn && (
                        <button
                          type="button"
                          onClick={() => {
                            const names = [...(formData.headline_asset_resource_names || [])];
                            names[index] = undefined;
                            updateField("headline_asset_resource_names", names);
                            updateArrayItem("headlines", index, "");
                          }}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                          title="Remove selected asset"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  {formData.headlines.length > 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        removeArrayItem("headlines", index);
                        const names = (formData.headline_asset_resource_names || []).filter((_, i) => i !== index);
                        updateField("headline_asset_resource_names", names.length ? names : undefined);
                      }}
                      className="p-2 hover:bg-red-50 rounded transition-colors"
                      title="Remove headline"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                </div>
              );
            })}
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
                ({formData.descriptions.filter((d, i) => d.trim() || formData.description_asset_resource_names?.[i]).length}/4)
              </span>
            </label>
          </div>
          <div className="space-y-2">
            {formData.descriptions.map((description, index) => {
              const descAssetRn = formData.description_asset_resource_names?.[index];
              return (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1 relative">
                    <textarea
                      value={description}
                      onChange={(e) => {
                        if (descAssetRn) {
                          const names = [...(formData.description_asset_resource_names || [])];
                          names[index] = undefined;
                          updateField("description_asset_resource_names", names);
                        }
                        updateArrayItem("descriptions", index, e.target.value);
                      }}
                      readOnly={!!descAssetRn}
                      className={`campaign-input w-full resize-none pr-28 ${
                        errors[`description_${index}`] ? "border-red-500" : ""
                        } ${descAssetRn ? "bg-gray-50 border-gray-200 cursor-not-allowed" : ""}`}
                      placeholder={`Description ${index + 1} (max 90 characters)`}
                      maxLength={90}
                      rows={2}
                    />
                    <div className="absolute right-2 top-2 flex items-center gap-2">
                      {descAssetRn && (
                        <span className="text-[10px] px-2 py-1 bg-[#136D6D]/10 text-[#136D6D] rounded font-medium whitespace-nowrap">
                          From Asset
                        </span>
                      )}
                      {profileId && !descAssetRn && (
                        <button
                          type="button"
                          onClick={() => {
                            setAssetSelectorType("DESCRIPTION");
                            setAssetSelectorTextIndex(index);
                            setAssetSelectorOpen(true);
                          }}
                          className="text-xs text-[#136D6D] hover:text-[#0f5a5a] font-medium whitespace-nowrap"
                        >
                          Select Asset
                        </button>
                      )}
                      {descAssetRn && (
                        <button
                          type="button"
                          onClick={() => {
                            const names = [...(formData.description_asset_resource_names || [])];
                            names[index] = undefined;
                            updateField("description_asset_resource_names", names);
                            updateArrayItem("descriptions", index, "");
                          }}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                          title="Remove selected asset"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  {formData.descriptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        removeArrayItem("descriptions", index);
                        const names = (formData.description_asset_resource_names || []).filter((_, i) => i !== index);
                        updateField("description_asset_resource_names", names.length ? names : undefined);
                      }}
                      className="p-2 hover:bg-red-50 rounded transition-colors mt-1"
                      title="Remove description"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                </div>
              );
            })}
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
            <p className="text-[11.2px] text-[#556179] mb-3">
              Select existing assets (created in Assets). Videos and logos are linked by resource name.
            </p>

            {/* Videos: asset selection only */}
            <div className="mb-3">
              <label className="form-label-small">Videos *</label>
              {formData.videos.length > 0 && (
                <ul className="space-y-2 mb-2">
                  {formData.videos.map((video, index) => (
                    <li key={index} className="flex items-center justify-between gap-2 py-2 px-3 bg-white border border-[#e8e8e3] rounded-lg">
                      <span className="text-[13px] text-[#072929] truncate" title={video.resource_name}>
                        {video.name || video.resource_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeArrayItem("videos", index)}
                        className="p-1.5 hover:bg-red-50 rounded transition-colors shrink-0"
                        title="Remove video"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => { setAssetSelectorType("VIDEO"); setAssetSelectorOpen(true); }}
                disabled={!profileId}
                className="px-3 py-2 text-[11.2px] font-medium text-[#136D6D] border border-[#136D6D]/40 rounded-lg hover:bg-[#136D6D]/8 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                + Select video asset
              </button>
              {!profileId && (
                <p className="text-[10px] text-[#556179] mt-1">Select a profile in the campaign to choose assets.</p>
              )}
              {errors.videos && <p className="text-[10px] text-red-500 mt-1">{errors.videos}</p>}
            </div>

            {/* Logo Images: asset selection only */}
            <div className="mb-3">
              <label className="form-label-small">Logo images *</label>
              {formData.logo_images.length > 0 && (
                <ul className="space-y-2 mb-2">
                  {formData.logo_images.map((logo, index) => (
                    <li key={index} className="flex items-center justify-between gap-2 py-2 px-3 bg-white border border-[#e8e8e3] rounded-lg">
                      <span className="text-[13px] text-[#072929] truncate" title={logo.resource_name}>
                        {logo.name || logo.resource_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeArrayItem("logo_images", index)}
                        className="p-1.5 hover:bg-red-50 rounded transition-colors shrink-0"
                        title="Remove logo"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => { setAssetSelectorType("LOGO"); setAssetSelectorOpen(true); }}
                disabled={!profileId}
                className="px-3 py-2 text-[11.2px] font-medium text-[#136D6D] border border-[#136D6D]/40 rounded-lg hover:bg-[#136D6D]/8 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                + Select logo asset
              </button>
              {errors.logo_images && <p className="text-[10px] text-red-500 mt-1">{errors.logo_images}</p>}
            </div>
          </div>
        )}

        {formData.ad_type === "DemandGenMultiAssetAdInfo" && (
          <div className="mb-6">
            <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
              Multi Asset Ad Fields
            </h3>
            <p className="text-[11.2px] text-[#556179] mb-3">
              Logo (1:1 square) is required. Add marketing images and optional videos for best performance.
            </p>

            {/* Logo images: required for Multi Asset */}
            <div className="mb-3">
              <label className="form-label-small">Logo images *</label>
              {formData.logo_images.length > 0 && (
                <ul className="space-y-2 mb-2">
                  {formData.logo_images.map((logo, index) => (
                    <li key={index} className="flex items-center justify-between gap-2 py-2 px-3 bg-white border border-[#e8e8e3] rounded-lg">
                      <span className="text-[13px] text-[#072929] truncate" title={logo.resource_name}>
                        {logo.name || logo.resource_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeArrayItem("logo_images", index)}
                        className="p-1.5 hover:bg-red-50 rounded transition-colors shrink-0"
                        title="Remove logo"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => { setAssetSelectorType("LOGO"); setAssetSelectorOpen(true); }}
                disabled={!profileId}
                className="px-3 py-2 text-[11.2px] font-medium text-[#136D6D] border border-[#136D6D]/40 rounded-lg hover:bg-[#136D6D]/8 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                + Select logo asset
              </button>
              {!profileId && (
                <p className="text-[10px] text-[#556179] mt-1">Select a profile in the campaign to choose assets.</p>
              )}
              {errors.logo_images && <p className="text-[10px] text-red-500 mt-1">{errors.logo_images}</p>}
            </div>

            {/* Images: asset selection only */}
            <div className="mb-3">
              <label className="form-label-small">Marketing images *</label>
              {formData.images.length > 0 && (
                <ul className="space-y-2 mb-2">
                  {formData.images.map((image, index) => (
                    <li key={index} className="flex items-center justify-between gap-2 py-2 px-3 bg-white border border-[#e8e8e3] rounded-lg">
                      <span className="text-[13px] text-[#072929] truncate" title={image.resource_name}>
                        {image.name || image.resource_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeArrayItem("images", index)}
                        className="p-1.5 hover:bg-red-50 rounded transition-colors shrink-0"
                        title="Remove image"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => { setAssetSelectorType("IMAGE"); setAssetSelectorOpen(true); }}
                disabled={!profileId}
                className="px-3 py-2 text-[11.2px] font-medium text-[#136D6D] border border-[#136D6D]/40 rounded-lg hover:bg-[#136D6D]/8 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                + Select image asset
              </button>
              {!profileId && (
                <p className="text-[10px] text-[#556179] mt-1">Select a profile in the campaign to choose assets.</p>
              )}
              {errors.images && <p className="text-[10px] text-red-500 mt-1">{errors.images}</p>}
            </div>
          </div>
        )}

        {formData.ad_type === "DemandGenCarouselAdInfo" && (
          <div className="mb-6">
            <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
              Carousel Ad Fields
            </h3>
            <p className="text-[11.2px] text-[#556179] mb-3">
              Logo (1:1 square) is required. Each card is one marketing image (2–10 cards). Use consistent aspect ratio. Headlines and descriptions come from the ad-level fields above.
            </p>

            {/* Logo image: required for Carousel (single logo used by API) */}
            <div className="mb-3">
              <label className="form-label-small">Logo image *</label>
              <p className="text-[10px] text-[#556179] mb-1">Square 1:1 logo for branding. One logo is used for the carousel ad.</p>
              {formData.logo_images.length > 0 && (
                <ul className="space-y-2 mb-2">
                  {formData.logo_images.map((logo, index) => (
                    <li key={index} className="flex items-center justify-between gap-2 py-2 px-3 bg-white border border-[#e8e8e3] rounded-lg">
                      <span className="text-[13px] text-[#072929] truncate" title={logo.resource_name}>
                        {logo.name || logo.resource_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeArrayItem("logo_images", index)}
                        className="p-1.5 hover:bg-red-50 rounded transition-colors shrink-0"
                        title="Remove logo"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => { setAssetSelectorType("LOGO"); setAssetSelectorOpen(true); }}
                disabled={!profileId}
                className="px-3 py-2 text-[11.2px] font-medium text-[#136D6D] border border-[#136D6D]/40 rounded-lg hover:bg-[#136D6D]/8 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                + Select logo asset
              </button>
              {!profileId && (
                <p className="text-[10px] text-[#556179] mt-1">Select a profile in the campaign to choose assets.</p>
              )}
              {errors.logo_images && <p className="text-[10px] text-red-500 mt-1">{errors.logo_images}</p>}
            </div>

            {/* Carousel Cards: only asset (image) per card; no per-card headline/description in API */}
            <div className="mb-3">
              <label className="form-label-small">
                Carousel Cards * (min 2)
              </label>
              {formData.carousel_cards.map((card, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 text-sm">Card {index + 1} — Image</h4>
                    {formData.carousel_cards.length > 2 && (
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
                  <div>
                    <p className="text-[11.2px] text-[#556179] mb-1">
                      Select a marketing image asset from the asset library.
                    </p>
                    {card.asset ? (
                      <div className="flex items-center justify-between gap-2 py-2 px-3 bg-white border border-[#e8e8e3] rounded-lg">
                        <span className="text-[13px] text-[#072929] truncate" title={card.asset}>
                          {card.assetName || card.asset}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateArrayItem("carousel_cards", index, { ...card, asset: "", assetName: undefined })}
                          className="p-1.5 hover:bg-red-50 rounded transition-colors shrink-0"
                          title="Clear asset"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setAssetSelectorType("CAROUSEL_IMAGE");
                        setCarouselAssetSelectorIndex(index);
                        setAssetSelectorOpen(true);
                      }}
                      disabled={!profileId}
                      className="mt-1 px-3 py-2 text-[11.2px] font-medium text-[#136D6D] border border-[#136D6D]/40 rounded-lg hover:bg-[#136D6D]/8 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {card.asset ? "Change asset" : "Select image asset"}
                    </button>
                    {!profileId && (
                      <p className="text-[10px] text-[#556179] mt-1">Select a profile in the campaign to choose assets.</p>
                    )}
                    {errors[`carousel_asset_${index}`] && (
                      <p className="text-[10px] text-red-500 mt-1">{errors[`carousel_asset_${index}`]}</p>
                    )}
                  </div>
                </div>
              ))}
              {formData.carousel_cards.length < 10 && (
                <button
                  type="button"
                  onClick={() => addArrayItem("carousel_cards", { asset: "" })}
                  className="mt-2 text-[11.2px] text-[#136D6D] hover:underline"
                >
                  + Add Card
                </button>
              )}
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
      {(() => {
        const noAdGroups = adgroups && adgroups.length === 0;
        const adGroupRequiredButMissing = adgroups && adgroups.length > 0 && !selectedAdGroupId.trim();
        const submitDisabled = loading || noAdGroups || adGroupRequiredButMissing;
        return (
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
              onClick={handleSaveAsDraft}
              disabled={submitDisabled}
              className="cancel-button font-semibold text-[11.2px] flex items-center gap-2 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitDisabled}
              className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Ad"}
            </button>
          </div>
        );
      })()}

      {profileId != null && (
        <AssetSelectorModal
          isOpen={assetSelectorOpen}
          onClose={() => {
            setAssetSelectorOpen(false);
            setCarouselAssetSelectorIndex(null);
            setAssetSelectorTextIndex(null);
          }}
          onSelect={handleSelectAsset}
          profileId={profileId}
          assetType={
            assetSelectorType === "HEADLINE" || assetSelectorType === "DESCRIPTION"
              ? "TEXT"
              : assetSelectorType === "VIDEO"
                ? "YOUTUBE_VIDEO"
                : "IMAGE"
          }
          hideTextTab={
            assetSelectorType === "LOGO" || assetSelectorType === "VIDEO" || assetSelectorType === "IMAGE"
          }
          title={
            assetSelectorType === "VIDEO"
              ? "Select video asset"
              : assetSelectorType === "LOGO"
                ? "Select Logo"
                : assetSelectorType === "HEADLINE"
                  ? "Select headline asset"
                  : assetSelectorType === "DESCRIPTION"
                    ? "Select description asset"
                    : "Select image asset"
          }
          initialTab={
            assetSelectorType === "HEADLINE" || assetSelectorType === "DESCRIPTION"
              ? "Text"
              : assetSelectorType === "VIDEO"
                ? "YouTube Video"
                : assetSelectorType === "LOGO"
                  ? "Logo"
                  : "Image"
          }
          initialTextSubTab={
            assetSelectorType === "HEADLINE"
              ? "Headline"
              : assetSelectorType === "DESCRIPTION"
                ? "Description"
                : undefined
          }
        />
      )}
    </div>
  );
};
