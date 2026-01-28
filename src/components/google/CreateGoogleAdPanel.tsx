import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dropdown } from "../ui/Dropdown";
import { campaignsService } from "../../services/campaigns";
import { CreateGoogleSearchAdTypeForm, type AdFormData } from "./CreateGoogleSearchAdTypeForm";

export interface AdInput {
  adgroup_id: number; // Required: always use existing adgroup
  ad_type: "RESPONSIVE_SEARCH_AD" | "RESPONSIVE_DISPLAY_AD";
  ad: {
    // RSA fields
    headlines: string[];
    descriptions: string[];
    path1?: string;
    path2?: string;
    headline_pins?: string[]; // HEADLINE_1, HEADLINE_2, etc. (indexed: headline_pins[0] corresponds to headlines[0])
    description_pins?: string[]; // DESCRIPTION_1, etc. (indexed: description_pins[0] corresponds to descriptions[0])
    // Asset-based (optional)
    headline_asset_ids?: number[]; // For UI reference only
    headline_asset_resource_names?: string[]; // For API (format: "customers/{customer_id}/assets/{asset_id}")
    description_asset_ids?: number[]; // For UI reference only
    description_asset_resource_names?: string[]; // For API (format: "customers/{customer_id}/assets/{asset_id}")
    // RDA fields
    marketing_image_urls?: string[];
    square_marketing_image_urls?: string[];
    marketing_image_asset_ids?: number[];
    marketing_image_asset_resource_names?: string[];
    square_marketing_image_asset_ids?: number[];
    square_marketing_image_asset_resource_names?: string[];
    long_headline?: string;
    long_headline_asset_id?: number;
    long_headline_asset_resource_name?: string;
    business_name?: string;
    // Common
    final_url?: string;
  };
  keywords?: Array<{
    text: string;
    match_type: "EXACT" | "PHRASE" | "BROAD";
    cpc_bid?: number;
  }>;
}

interface CreateGoogleAdPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entity: AdInput) => void;
  campaignId: string;
  accountId: string;
  channelId?: string;
  profileId?: number | null;
  loading?: boolean;
  submitError?: string | null;
}

export const CreateGoogleAdPanel: React.FC<CreateGoogleAdPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  campaignId,
  accountId,
  channelId,
  profileId = null,
  loading = false,
  submitError = null,
}) => {
  const [selectedAdGroupId, setSelectedAdGroupId] = useState<string>("");
  const [formData, setFormData] = useState<AdFormData>({
    ad_type: "RESPONSIVE_SEARCH_AD",
    headlines: ["", "", ""],
    descriptions: ["", ""],
    marketing_image_urls: [""],
    square_marketing_image_urls: [""],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Adgroup search state
  const [adgroupSearchQuery, setAdgroupSearchQuery] = useState("");
  const [adgroupOptions, setAdgroupOptions] = useState<Array<{ value: string; label: string; adgroup_id: number }>>([]);
  const [loadingAdgroups, setLoadingAdgroups] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFetchedAdgroupsRef = useRef(false);

  // Fetch adgroups from API with debounced search
  const fetchAdgroups = useCallback(async (searchQuery: string = "") => {
    if (!accountId || !channelId || !campaignId) return;
    
    setLoadingAdgroups(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = parseInt(channelId, 10);
      const campaignIdNum = parseInt(campaignId, 10);
      
      if (isNaN(accountIdNum) || isNaN(channelIdNum) || isNaN(campaignIdNum)) {
        throw new Error("Invalid account ID, channel ID, or campaign ID");
      }
      
      const params: any = {
        page: 1,
        page_size: 100, // Fetch up to 100 adgroups
        sort_by: "name",
        order: "asc",
        campaign_id: campaignIdNum,
      };
      
      // Add search filter if query provided
      if (searchQuery.trim()) {
        params.adgroup_name__icontains = searchQuery.trim();
      }
      
      // Pass channelId as second parameter, campaignId as third
      const response = await campaignsService.getGoogleAdGroups(accountIdNum, channelIdNum, campaignIdNum, {
        ...params,
        campaign_id: campaignIdNum, // Explicitly set in params as well
      });
      
      // Map adgroups to options format
      // Use adgroup_id from the response (this is the Google Ads adgroup ID)
      const options = response.adgroups.map((ag: any) => {
        const adgroupId = ag.adgroup_id || ag.id;
        return {
          value: adgroupId?.toString() || "",
          label: ag.name || ag.adgroup_name || `Ad Group ${adgroupId}`,
          adgroup_id: adgroupId,
        };
      }).filter((opt: any) => opt.value && opt.adgroup_id); // Filter out invalid options
      
      setAdgroupOptions(options);
      
      // Auto-select first adgroup if none selected and options available
      if (options.length > 0 && !selectedAdGroupId) {
        setSelectedAdGroupId(options[0].value);
      }
    } catch (error) {
      console.error("Error fetching adgroups:", error);
      setAdgroupOptions([]);
    } finally {
      setLoadingAdgroups(false);
    }
  }, [accountId, channelId, campaignId, selectedAdGroupId]);

  // Fetch adgroups once when panel opens
  useEffect(() => {
    if (!isOpen) {
      hasFetchedAdgroupsRef.current = false;
      return;
    }
    
    // Only fetch once when panel opens
    if (!hasFetchedAdgroupsRef.current) {
      hasFetchedAdgroupsRef.current = true;
      fetchAdgroups("");
    }
  }, [isOpen, fetchAdgroups]);

  // Debounced search effect - only for search queries
  useEffect(() => {
    if (!isOpen || adgroupSearchQuery === "") return;
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search query
    searchTimeoutRef.current = setTimeout(() => {
      fetchAdgroups(adgroupSearchQuery);
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [adgroupSearchQuery, isOpen, fetchAdgroups]);

  // Reset form when panel closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedAdGroupId("");
      setFormData({
        ad_type: "RESPONSIVE_SEARCH_AD",
        headlines: ["", "", ""],
        descriptions: ["", ""],
        marketing_image_urls: [""],
        square_marketing_image_urls: [""],
      });
      setErrors({});
      setAdgroupSearchQuery("");
      setAdgroupOptions([]);
      hasFetchedAdgroupsRef.current = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    }
  }, [isOpen]);

  // Reset form after successful submission (when loading goes from true to false while panel is open)
  const prevLoadingRef = useRef(loading);
  useEffect(() => {
    if (prevLoadingRef.current === true && loading === false && isOpen) {
      // Successful submission - reset form
      setSelectedAdGroupId("");
      setFormData({
        ad_type: "RESPONSIVE_SEARCH_AD",
        headlines: ["", "", ""],
        descriptions: ["", ""],
        marketing_image_urls: [""],
        square_marketing_image_urls: [""],
      });
      setErrors({});
      setAdgroupSearchQuery("");
      setAdgroupOptions([]);
      hasFetchedAdgroupsRef.current = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    }
    prevLoadingRef.current = loading;
  }, [loading, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedAdGroupId) {
      newErrors.adGroup = "Please select an ad group";
    }

    if (formData.ad_type === "RESPONSIVE_SEARCH_AD") {
      const validHeadlines = formData.headlines?.filter((h) => h.trim()).length || 0;
      if (validHeadlines < 3) {
        newErrors.headlines = "At least 3 headlines are required";
      }
      if (validHeadlines > 15) {
        newErrors.headlines = "Maximum 15 headlines allowed";
      }

      const validDescriptions = formData.descriptions?.filter((d) => d.trim()).length || 0;
      if (validDescriptions < 2) {
        newErrors.descriptions = "At least 2 descriptions are required";
      }
      if (validDescriptions > 4) {
        newErrors.descriptions = "Maximum 4 descriptions allowed";
      }

      // Validate path lengths
      if (formData.path1 && formData.path1.length > 15) {
        newErrors.path1 = "Path 1 must be 15 characters or less";
      }
      if (formData.path2 && formData.path2.length > 15) {
        newErrors.path2 = "Path 2 must be 15 characters or less";
      }
    } else if (formData.ad_type === "RESPONSIVE_DISPLAY_AD") {
      const validMarketingImages = formData.marketing_image_urls?.filter((url) => url.trim()).length || 0;
      if (validMarketingImages < 1) {
        newErrors.marketing_images = "At least 1 marketing image is required";
      }
      if (validMarketingImages > 15) {
        newErrors.marketing_images = "Maximum 15 marketing images allowed";
      }

      const validSquareImages = formData.square_marketing_image_urls?.filter((url) => url.trim()).length || 0;
      if (validSquareImages < 1) {
        newErrors.square_marketing_images = "At least 1 square marketing image is required";
      }
      if (validSquareImages > 15) {
        newErrors.square_marketing_images = "Maximum 15 square marketing images allowed";
      }

      const validHeadlines = formData.headlines?.filter((h) => h.trim()).length || 0;
      if (validHeadlines < 3) {
        newErrors.headlines = "At least 3 headlines are required";
      }
      if (validHeadlines > 15) {
        newErrors.headlines = "Maximum 15 headlines allowed";
      }

      if (!formData.long_headline || !formData.long_headline.trim()) {
        newErrors.long_headline = "Long headline is required";
      } else if (formData.long_headline.length > 90) {
        newErrors.long_headline = "Long headline must be 90 characters or less";
      }

      const validDescriptions = formData.descriptions?.filter((d) => d.trim()).length || 0;
      if (validDescriptions < 2) {
        newErrors.descriptions = "At least 2 descriptions are required";
      }
      if (validDescriptions > 4) {
        newErrors.descriptions = "Maximum 4 descriptions allowed";
      }

      if (!formData.business_name || !formData.business_name.trim()) {
        newErrors.business_name = "Business name is required";
      } else if (formData.business_name.length > 25) {
        newErrors.business_name = "Business name must be 25 characters or less";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddHeadline = () => {
    setFormData((prev) => {
      if ((prev.headlines?.length || 0) >= 15) return prev;
      return { ...prev, headlines: [...(prev.headlines || []), ""] };
    });
  };

  const handleRemoveHeadline = (index: number) => {
    setFormData((prev) => {
      if ((prev.headlines?.length || 0) <= 3) return prev;
      const newHeadlines = [...(prev.headlines || [])];
      newHeadlines.splice(index, 1);
      const newHeadlineAssetIds = [...(prev.headline_asset_ids || [])];
      const newHeadlineAssetResourceNames = [...(prev.headline_asset_resource_names || [])];
      newHeadlineAssetIds.splice(index, 1);
      newHeadlineAssetResourceNames.splice(index, 1);
      const newHeadlinePins = [...(prev.headline_pins || [])];
      newHeadlinePins.splice(index, 1);
      return {
        ...prev,
        headlines: newHeadlines,
        headline_asset_ids: newHeadlineAssetIds,
        headline_asset_resource_names: newHeadlineAssetResourceNames,
        headline_pins: newHeadlinePins,
      };
    });
  };

  const handleUpdateHeadline = (index: number, value: string) => {
    setFormData((prev) => {
      const newHeadlines = [...(prev.headlines || [])];
      while (newHeadlines.length <= index) {
        newHeadlines.push("");
      }
      newHeadlines[index] = value;
      return { ...prev, headlines: newHeadlines };
    });
  };

  const handleAddDescription = () => {
    setFormData((prev) => {
      if ((prev.descriptions?.length || 0) >= 4) return prev;
      return { ...prev, descriptions: [...(prev.descriptions || []), ""] };
    });
  };

  const handleRemoveDescription = (index: number) => {
    setFormData((prev) => {
      if ((prev.descriptions?.length || 0) <= 2) return prev;
      const newDescriptions = [...(prev.descriptions || [])];
      newDescriptions.splice(index, 1);
      const newDescriptionAssetIds = [...(prev.description_asset_ids || [])];
      const newDescriptionAssetResourceNames = [...(prev.description_asset_resource_names || [])];
      newDescriptionAssetIds.splice(index, 1);
      newDescriptionAssetResourceNames.splice(index, 1);
      const newDescriptionPins = [...(prev.description_pins || [])];
      newDescriptionPins.splice(index, 1);
      return {
        ...prev,
        descriptions: newDescriptions,
        description_asset_ids: newDescriptionAssetIds,
        description_asset_resource_names: newDescriptionAssetResourceNames,
        description_pins: newDescriptionPins,
      };
    });
  };

  const handleUpdateDescription = (index: number, value: string) => {
    setFormData((prev) => {
      const newDescriptions = [...(prev.descriptions || [])];
      while (newDescriptions.length <= index) {
        newDescriptions.push("");
      }
      newDescriptions[index] = value;
      return { ...prev, descriptions: newDescriptions };
    });
  };

  const handleAddMarketingImage = () => {
    setFormData((prev) => {
      if ((prev.marketing_image_urls?.length || 0) >= 15) return prev;
      return { ...prev, marketing_image_urls: [...(prev.marketing_image_urls || []), ""] };
    });
  };

  const handleRemoveMarketingImage = (index: number) => {
    setFormData((prev) => {
      if ((prev.marketing_image_urls?.length || 0) <= 1) return prev;
      const newUrls = [...(prev.marketing_image_urls || [])];
      newUrls.splice(index, 1);
      const newAssetIds = [...(prev.marketing_image_asset_ids || [])];
      const newAssetResourceNames = [...(prev.marketing_image_asset_resource_names || [])];
      newAssetIds.splice(index, 1);
      newAssetResourceNames.splice(index, 1);
      return {
        ...prev,
        marketing_image_urls: newUrls,
        marketing_image_asset_ids: newAssetIds,
        marketing_image_asset_resource_names: newAssetResourceNames,
      };
    });
  };

  const handleUpdateMarketingImage = (index: number, value: string) => {
    setFormData((prev) => {
      const newUrls = [...(prev.marketing_image_urls || [])];
      while (newUrls.length <= index) {
        newUrls.push("");
      }
      newUrls[index] = value;
      return { ...prev, marketing_image_urls: newUrls };
    });
  };

  const handleAddSquareMarketingImage = () => {
    setFormData((prev) => {
      if ((prev.square_marketing_image_urls?.length || 0) >= 15) return prev;
      return { ...prev, square_marketing_image_urls: [...(prev.square_marketing_image_urls || []), ""] };
    });
  };

  const handleRemoveSquareMarketingImage = (index: number) => {
    setFormData((prev) => {
      if ((prev.square_marketing_image_urls?.length || 0) <= 1) return prev;
      const newUrls = [...(prev.square_marketing_image_urls || [])];
      newUrls.splice(index, 1);
      const newAssetIds = [...(prev.square_marketing_image_asset_ids || [])];
      const newAssetResourceNames = [...(prev.square_marketing_image_asset_resource_names || [])];
      newAssetIds.splice(index, 1);
      newAssetResourceNames.splice(index, 1);
      return {
        ...prev,
        square_marketing_image_urls: newUrls,
        square_marketing_image_asset_ids: newAssetIds,
        square_marketing_image_asset_resource_names: newAssetResourceNames,
      };
    });
  };

  const handleUpdateSquareMarketingImage = (index: number, value: string) => {
    setFormData((prev) => {
      const newUrls = [...(prev.square_marketing_image_urls || [])];
      while (newUrls.length <= index) {
        newUrls.push("");
      }
      newUrls[index] = value;
      return { ...prev, square_marketing_image_urls: newUrls };
    });
  };

  const handleFormChange = (field: keyof AdFormData, value: any) => {
    // When ad_type changes, reset form data appropriately
    if (field === 'ad_type' && value !== formData.ad_type) {
      if (value === 'RESPONSIVE_SEARCH_AD') {
        setFormData({
          ad_type: value,
          headlines: ["", "", ""],
          descriptions: ["", ""],
          marketing_image_urls: undefined,
          square_marketing_image_urls: undefined,
        });
      } else if (value === 'RESPONSIVE_DISPLAY_AD') {
        setFormData({
          ad_type: value,
          headlines: ["", "", ""],
          descriptions: ["", ""],
          marketing_image_urls: [""],
          square_marketing_image_urls: [""],
        });
      }
    } else {
      // Use functional update to avoid stale state issues
      setFormData((prevFormData) => {
        const updated = { ...prevFormData, [field]: value };
        return updated;
      });
    }
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    const entity: AdInput = {
      adgroup_id: parseInt(selectedAdGroupId, 10),
      ad_type: formData.ad_type,
      ad: {
        headlines: formData.headlines?.filter((h) => h.trim()) || [],
        descriptions: formData.descriptions?.filter((d) => d.trim()) || [],
        ...(formData.final_url?.trim() && { final_url: formData.final_url.trim() }),
        ...(formData.ad_type === "RESPONSIVE_SEARCH_AD" && {
          ...(formData.path1 && { path1: formData.path1 }),
          ...(formData.path2 && { path2: formData.path2 }),
          ...(formData.headline_pins && formData.headline_pins.some(p => p) && { headline_pins: formData.headline_pins }),
          ...(formData.description_pins && formData.description_pins.some(p => p) && { description_pins: formData.description_pins }),
          ...(formData.headline_asset_resource_names && formData.headline_asset_resource_names.some(r => r) && {
            headline_asset_resource_names: formData.headline_asset_resource_names.filter(r => r) as string[],
          }),
          ...(formData.description_asset_resource_names && formData.description_asset_resource_names.some(r => r) && {
            description_asset_resource_names: formData.description_asset_resource_names.filter(r => r) as string[],
          }),
        }),
        ...(formData.ad_type === "RESPONSIVE_DISPLAY_AD" && {
          marketing_image_urls: formData.marketing_image_urls?.filter((url) => url.trim()) || [],
          square_marketing_image_urls: formData.square_marketing_image_urls?.filter((url) => url.trim()) || [],
          ...(formData.marketing_image_asset_resource_names && formData.marketing_image_asset_resource_names.some(r => r) && {
            marketing_image_asset_resource_names: formData.marketing_image_asset_resource_names.filter(r => r) as string[],
          }),
          ...(formData.square_marketing_image_asset_resource_names && formData.square_marketing_image_asset_resource_names.some(r => r) && {
            square_marketing_image_asset_resource_names: formData.square_marketing_image_asset_resource_names.filter(r => r) as string[],
          }),
          ...(formData.long_headline && { long_headline: formData.long_headline }),
          ...(formData.long_headline_asset_resource_name && { long_headline_asset_resource_name: formData.long_headline_asset_resource_name }),
          ...(formData.business_name && { business_name: formData.business_name }),
        }),
      },
    };

    onSubmit(entity);
  };

  const handleFillDummyValues = () => {
    if (formData.ad_type === "RESPONSIVE_SEARCH_AD") {
      setFormData({
        ad_type: "RESPONSIVE_SEARCH_AD",
        headlines: [
          "Best Products Online",
          "Shop Now & Save",
          "Quality Guaranteed",
          "Free Shipping Today",
          "Limited Time Offer"
        ],
        descriptions: [
          "Discover amazing products at unbeatable prices. Shop now and enjoy fast shipping!",
          "Get the best deals on quality products. Satisfaction guaranteed or your money back."
        ],
        path1: "Shop",
        path2: "Now",
        headline_pins: ["", "", "", "", ""],
        description_pins: ["", ""],
        final_url: "https://example.com",
      });
    } else {
      // RESPONSIVE_DISPLAY_AD
      setFormData({
        ad_type: "RESPONSIVE_DISPLAY_AD",
        headlines: [
          "Best Products Online",
          "Shop Now & Save",
          "Quality Guaranteed"
        ],
        descriptions: [
          "Discover amazing products at unbeatable prices. Shop now and enjoy fast shipping!",
          "Get the best deals on quality products. Satisfaction guaranteed or your money back."
        ],
        marketing_image_urls: [
          "https://picsum.photos/1200/627?random=1",
          "https://picsum.photos/1200/627?random=2"
        ],
        square_marketing_image_urls: [
          "https://picsum.photos/1200/1200?random=3",
          "https://picsum.photos/1200/1200?random=4"
        ],
        long_headline: "Discover Amazing Products at Unbeatable Prices - Shop Now and Enjoy Fast Shipping!",
        business_name: "Best Products Co",
        final_url: "https://example.com",
      });
    }
    setErrors({}); // Clear any existing errors
  };

  const handleCancel = () => {
    setSelectedAdGroupId("");
    setFormData({
      ad_type: "RESPONSIVE_SEARCH_AD",
      headlines: ["", "", ""],
      descriptions: ["", ""],
    });
    setErrors({});
    setAdgroupSearchQuery("");
    setAdgroupOptions([]);
    hasFetchedAdgroupsRef.current = false;
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    onClose();
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
          <button
            type="button"
            onClick={handleFillDummyValues}
            className="text-[10px] text-[#136D6D] hover:text-[#0e5a5a] hover:underline px-2 py-1"
            title="Fill with dummy values for testing"
          >
            Fill Dummy Values
          </button>
        </div>

        {/* Ad Group Selection */}
        <div className="mb-6">
          <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
            Ad Group
          </h3>
          <div className="mb-3">
            <div>
              <label className="form-label-small">
                Select Ad Group *
              </label>
              <Dropdown<string>
                options={adgroupOptions}
                value={selectedAdGroupId}
                onChange={(value) => {
                  setSelectedAdGroupId(value);
                  if (errors.adGroup) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.adGroup;
                      return newErrors;
                    });
                  }
                }}
                placeholder={loadingAdgroups ? "Loading adgroups..." : "Search and select an ad group"}
                buttonClassName="w-full"
                searchable={true}
                searchPlaceholder="Search adgroups..."
                emptyMessage={loadingAdgroups ? "Loading..." : "No adgroups found. Try a different search."}
                onSearchChange={(query: string) => {
                  setAdgroupSearchQuery(query);
                }}
              />
              {errors.adGroup && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.adGroup}
                </p>
              )}
              {!loadingAdgroups && adgroupOptions.length === 0 && adgroupSearchQuery === "" && (
                <p className="text-[10px] text-gray-500 mt-1">
                  No ad groups available. Please create an ad group first.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Ad Form */}
        <CreateGoogleSearchAdTypeForm
          formData={formData}
          errors={errors}
          onChange={handleFormChange}
          profileId={profileId}
          onAddHeadline={handleAddHeadline}
          onRemoveHeadline={handleRemoveHeadline}
          onUpdateHeadline={handleUpdateHeadline}
          onAddDescription={handleAddDescription}
          onRemoveDescription={handleRemoveDescription}
          onUpdateDescription={handleUpdateDescription}
          onAddMarketingImage={handleAddMarketingImage}
          onRemoveMarketingImage={handleRemoveMarketingImage}
          onUpdateMarketingImage={handleUpdateMarketingImage}
          onAddSquareMarketingImage={handleAddSquareMarketingImage}
          onRemoveSquareMarketingImage={handleRemoveSquareMarketingImage}
          onUpdateSquareMarketingImage={handleUpdateSquareMarketingImage}
        />
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
          {loading ? "Creating..." : "Create Ad"}
        </button>
      </div>
    </div>
  );
};

