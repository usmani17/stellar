import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dropdown } from "../ui/Dropdown";
import { campaignsService } from "../../services/campaigns";

export interface AdInput {
  adgroup_id?: number; // Optional: use existing adgroup
  adgroup?: {
    name: string;
    cpc_bid?: number;
  };
  ad: {
    headlines: string[];
    descriptions: string[];
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
  loading?: boolean;
  submitError?: string | null;
}

export const CreateGoogleAdPanel: React.FC<CreateGoogleAdPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  campaignId,
  accountId,
  loading = false,
  submitError = null,
}) => {
  const generateDefaultAdGroupName = (): string => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const milliseconds = String(now.getMilliseconds()).padStart(3, "0");
    const dateTime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}.${milliseconds}`;
    return `Ad Group - ${dateTime}`;
  };

  const [useExistingAdGroup, setUseExistingAdGroup] = useState(true);
  const [selectedAdGroupId, setSelectedAdGroupId] = useState<string>("");
  const [newAdGroupName, setNewAdGroupName] = useState(generateDefaultAdGroupName());
  const [adGroupBid, setAdGroupBid] = useState<number | undefined>(undefined);
  const [headlines, setHeadlines] = useState<string[]>(["", "", ""]);
  const [descriptions, setDescriptions] = useState<string[]>(["", ""]);
  const [finalUrl, setFinalUrl] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Adgroup search state
  const [adgroupSearchQuery, setAdgroupSearchQuery] = useState("");
  const [adgroupOptions, setAdgroupOptions] = useState<Array<{ value: string; label: string; adgroup_id: number }>>([]);
  const [loadingAdgroups, setLoadingAdgroups] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch adgroups from API with debounced search
  const fetchAdgroups = useCallback(async (searchQuery: string = "") => {
    if (!accountId || !campaignId) return;
    
    setLoadingAdgroups(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      const campaignIdNum = parseInt(campaignId, 10);
      
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
      
      // Pass campaignId as second parameter to ensure proper filtering
      const response = await campaignsService.getGoogleAdGroups(accountIdNum, campaignIdNum, {
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
  }, [accountId, campaignId]);

  // Debounced search effect
  useEffect(() => {
    if (!useExistingAdGroup || !isOpen) return;
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Fetch initial adgroups when dropdown opens
    if (adgroupSearchQuery === "") {
      fetchAdgroups("");
      return;
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
  }, [adgroupSearchQuery, useExistingAdGroup, isOpen, fetchAdgroups]);

  // Fetch adgroups when switching to existing adgroup mode
  useEffect(() => {
    if (useExistingAdGroup && isOpen) {
      fetchAdgroups("");
    }
  }, [useExistingAdGroup, isOpen, fetchAdgroups]);

  // Reset form when panel closes
  useEffect(() => {
    if (!isOpen) {
      setUseExistingAdGroup(true);
      setSelectedAdGroupId("");
      setNewAdGroupName(generateDefaultAdGroupName());
      setAdGroupBid(undefined);
      setHeadlines(["", "", ""]);
      setDescriptions(["", ""]);
      setFinalUrl("");
      setErrors({});
      setAdgroupSearchQuery("");
      setAdgroupOptions([]);
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
      setUseExistingAdGroup(true);
      setSelectedAdGroupId("");
      setNewAdGroupName(generateDefaultAdGroupName());
      setAdGroupBid(undefined);
      setHeadlines(["", "", ""]);
      setDescriptions(["", ""]);
      setFinalUrl("");
      setErrors({});
      setAdgroupSearchQuery("");
      setAdgroupOptions([]);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    }
    prevLoadingRef.current = loading;
  }, [loading, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (useExistingAdGroup) {
      if (!selectedAdGroupId) {
        newErrors.adGroup = "Please select an ad group";
      }
    } else {
      if (!newAdGroupName.trim()) {
        newErrors.adGroupName = "Ad Group name is required";
      }
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

    const entity: AdInput = {
      ad: {
        headlines: headlines.filter((h) => h.trim()),
        descriptions: descriptions.filter((d) => d.trim()),
        ...(finalUrl.trim() && { final_url: finalUrl.trim() }),
      },
    };

    if (useExistingAdGroup && selectedAdGroupId) {
      // Use existing adgroup - send adgroup_id
      entity.adgroup_id = parseInt(selectedAdGroupId, 10);
    } else {
      // Create new adgroup - send adgroup data
      entity.adgroup = {
        name: newAdGroupName.trim(),
        ...(adGroupBid !== undefined && adGroupBid > 0 && { cpc_bid: adGroupBid }),
      };
    }

    onSubmit(entity);
  };

  const handleCancel = () => {
    setUseExistingAdGroup(true);
    setSelectedAdGroupId("");
    setNewAdGroupName(generateDefaultAdGroupName());
    setAdGroupBid(undefined);
    setHeadlines(["", "", ""]);
    setDescriptions(["", ""]);
    setFinalUrl("");
    setErrors({});
    setAdgroupSearchQuery("");
    setAdgroupOptions([]);
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
        <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
          Create Ad
        </h2>

        {/* Ad Group Selection */}
        <div className="mb-6">
          <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
            Ad Group
          </h3>
          <div className="mb-3">
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!useExistingAdGroup}
                  onChange={() => {
                    setUseExistingAdGroup(false);
                    setSelectedAdGroupId("");
                    if (errors.adGroup) {
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.adGroup;
                        return newErrors;
                      });
                    }
                  }}
                  className="text-[#136D6D]"
                />
                <span className="text-[11.2px] text-[#556179]">
                  Create New Ad Group
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={useExistingAdGroup}
                  onChange={() => {
                    setUseExistingAdGroup(true);
                    setNewAdGroupName(generateDefaultAdGroupName());
                    if (errors.adGroupName) {
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.adGroupName;
                        return newErrors;
                      });
                    }
                  }}
                  className="text-[#136D6D]"
                />
                <span className="text-[11.2px] text-[#556179]">
                  Use Existing Ad Group
                </span>
              </label>
            </div>

            {!useExistingAdGroup ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="form-label-small">
                    Ad Group Name *
                  </label>
                  <input
                    type="text"
                    value={newAdGroupName}
                    onChange={(e) => {
                      setNewAdGroupName(e.target.value);
                      if (errors.adGroupName) {
                        setErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.adGroupName;
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="Enter ad group name"
                    className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                      errors.adGroupName ? "border-red-500" : "border-gray-200"
                    }`}
                  />
                  {errors.adGroupName && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.adGroupName}
                    </p>
                  )}
                </div>
                <div className="w-[140px]">
                  <label className="form-label-small">
                    CPC Bid (Optional)
                  </label>
                  <input
                    type="number"
                    value={adGroupBid || ""}
                    onChange={(e) =>
                      setAdGroupBid(
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="0.10"
                    min="0"
                    step="0.01"
                    className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                  />
                </div>
              </div>
            ) : (
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
                    No ad groups available. Please create a new ad group.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ad Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold text-[#072929]">
              Responsive Search Ad
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
                setFinalUrl("https://pixis.ai");
                // Clear any headline/description errors
                setErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors.headlines;
                  delete newErrors.descriptions;
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
                    className={`flex-1 bg-white px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                      errors.headlines ? "border-red-500" : "border-gray-200"
                    }`}
                  />
                  {headlines.length > 3 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveHeadline(index)}
                      className="text-red-500 hover:text-red-700 transition-colors px-2"
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
                    className={`flex-1 bg-white px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                      errors.descriptions ? "border-red-500" : "border-gray-200"
                    }`}
                  />
                  {descriptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDescription(index)}
                      className="text-red-500 hover:text-red-700 transition-colors px-2"
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

