import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dropdown } from "../ui/Dropdown";
import { campaignsService } from "../../services/campaigns";

export interface KeywordInput {
  adgroup_id: number; // Required: always use existing adgroup
  keywords: Array<{
    text: string;
    match_type: "EXACT" | "PHRASE" | "BROAD";
    cpc_bid?: number;
  }>;
}

interface CreateGoogleKeywordPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entity: KeywordInput) => void;
  campaignId: string;
  accountId: string;
  loading?: boolean;
  submitError?: string | null;
}

const MATCH_TYPE_OPTIONS = [
  { value: "BROAD", label: "BROAD" },
  { value: "PHRASE", label: "PHRASE" },
  { value: "EXACT", label: "EXACT" },
];

export const CreateGoogleKeywordPanel: React.FC<
  CreateGoogleKeywordPanelProps
> = ({
  isOpen,
  onClose,
  onSubmit,
  campaignId,
  accountId,
  loading = false,
  submitError = null,
}) => {
  const [selectedAdGroupId, setSelectedAdGroupId] = useState<string>("");
  const [keywords, setKeywords] = useState<
    Array<{ text: string; match_type: "EXACT" | "PHRASE" | "BROAD"; cpc_bid?: number }>
  >([]);
  const [currentKeyword, setCurrentKeyword] = useState({
    text: "",
    match_type: "BROAD" as "EXACT" | "PHRASE" | "BROAD",
    cpc_bid: undefined as number | undefined,
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
  }, [accountId, campaignId, selectedAdGroupId]);

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
      setKeywords([]);
      setCurrentKeyword({ text: "", match_type: "BROAD", cpc_bid: undefined });
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
      setKeywords([]);
      setCurrentKeyword({ text: "", match_type: "BROAD", cpc_bid: undefined });
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

    if (keywords.length === 0) {
      newErrors.keywords = "At least one keyword is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddKeyword = () => {
    if (!currentKeyword.text.trim()) {
      setErrors((prev) => ({ ...prev, keywordText: "Keyword text is required" }));
      return;
    }

    setKeywords([...keywords, { ...currentKeyword }]);
    setCurrentKeyword({ text: "", match_type: "BROAD", cpc_bid: undefined });
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.keywordText;
      delete newErrors.keywords;
      return newErrors;
    });
  };

  const handleRemoveKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const handleFillDummyValues = () => {
    setKeywords([
      { text: "best products online", match_type: "BROAD", cpc_bid: 0.50 },
      { text: "shop now and save", match_type: "PHRASE", cpc_bid: 0.75 },
      { text: "quality products", match_type: "EXACT", cpc_bid: 1.00 },
      { text: "free shipping", match_type: "BROAD", cpc_bid: 0.60 },
      { text: "limited time offer", match_type: "PHRASE", cpc_bid: 0.85 },
    ]);
    setErrors({}); // Clear any existing errors
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    const entity: KeywordInput = {
      keywords: keywords,
      adgroup_id: parseInt(selectedAdGroupId, 10),
    };

    onSubmit(entity);
  };

  const handleCancel = () => {
    setSelectedAdGroupId("");
    setKeywords([]);
    setCurrentKeyword({ text: "", match_type: "BROAD", cpc_bid: undefined });
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
        <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
          Create Keywords
        </h2>

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

        {/* Keywords Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold text-[#072929]">
              Keywords
            </h3>
            <button
              type="button"
              onClick={handleFillDummyValues}
              className="ml-auto px-3 py-1 text-[10px] text-[#136D6D] bg-[#e6f2f2] rounded-md hover:bg-[#d9ecec] transition-colors"
            >
              Fill Dummy Values
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <div className="flex-1 min-w-[200px]">
              <label className="form-label-small">
                Keyword Text *
              </label>
              <input
                type="text"
                value={currentKeyword.text}
                onChange={(e) => {
                  setCurrentKeyword({ ...currentKeyword, text: e.target.value });
                  if (errors.keywordText) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.keywordText;
                      return newErrors;
                    });
                  }
                }}
                placeholder="Enter keyword"
                className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                  errors.keywordText ? "border-red-500" : "border-gray-200"
                }`}
              />
              {errors.keywordText && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.keywordText}
                </p>
              )}
            </div>
            <div className="w-[140px]">
              <label className="form-label-small">
                Match Type
              </label>
              <Dropdown<string>
                options={MATCH_TYPE_OPTIONS}
                value={currentKeyword.match_type}
                onChange={(value) =>
                  setCurrentKeyword({
                    ...currentKeyword,
                    match_type: value as "EXACT" | "PHRASE" | "BROAD",
                  })
                }
                placeholder="Select match type"
                buttonClassName="w-full"
              />
            </div>
            <div className="w-[120px]">
              <label className="form-label-small">
                CPC Bid (Optional)
              </label>
              <input
                type="number"
                value={currentKeyword.cpc_bid || ""}
                onChange={(e) =>
                  setCurrentKeyword({
                    ...currentKeyword,
                    cpc_bid: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
                placeholder="0.10"
                min="0"
                step="0.01"
                className="bg-white w-full px-4 py-2.5 border border-gray-200 rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
              />
            </div>
            <div className="w-[120px]">
              <button
                type="button"
                onClick={handleAddKeyword}
                className="w-full px-4 py-2.5 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors"
              >
                Add Keyword
              </button>
            </div>
          </div>

          {errors.keywords && (
            <p className="text-[10px] text-red-500 mb-3">{errors.keywords}</p>
          )}

          {/* Keywords Table */}
          {keywords.length > 0 && (
            <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-[#e8e8e3]">
                      <th className="table-header">
                        Keyword Text
                      </th>
                      <th className="table-header">
                        Match Type
                      </th>
                      <th className="table-header">
                        CPC Bid
                      </th>
                      <th className="table-header">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((keyword, index) => (
                      <tr
                        key={index}
                        className={`${
                          index !== keywords.length - 1
                            ? "border-b border-[#e8e8e3]"
                            : ""
                        } hover:bg-gray-50 transition-colors`}
                      >
                        <td className="table-cell table-text">
                          {keyword.text}
                        </td>
                        <td className="table-cell table-text">
                          {keyword.match_type}
                        </td>
                        <td className="table-cell table-text">
                          {keyword.cpc_bid
                            ? `$${keyword.cpc_bid.toFixed(2)}`
                            : "—"}
                        </td>
                        <td className="table-cell">
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(index)}
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
          className="cancel-button"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create Keywords"}
        </button>
      </div>
    </div>
  );
};

