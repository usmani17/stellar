import React, { useState, useEffect } from "react";
import {
  type Asset,
  type AssetType,
} from "../../services/googleAdwords/googleAdwordsAssets";
import { Loader } from "../ui/Loader";
import { CreateTextAssetModal } from "./CreateTextAssetModal";
import { CreateImageAssetModal } from "./CreateImageAssetModal";
import { CreateYoutubeVideoAssetModal } from "./CreateYoutubeVideoAssetModal";
import { CreateSitelinkAssetModal } from "./CreateSitelinkAssetModal";
// import { CreateCalloutAssetModal } from "./CreateCalloutAssetModal";
import { useAssets } from "../../hooks/queries/useAssets";

interface AssetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: Asset) => void;
  profileId: number;
  assetType?: AssetType; // Filter by asset type (for selection restriction)
  title?: string;
  allowMultiple?: boolean; // For future multi-select support
  initialTab?: string; // Pre-select a specific tab when modal opens
  initialTextSubTab?: string; // Pre-select a specific text sub-tab when Text tab is active
}

export const AssetSelectorModal: React.FC<AssetSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  profileId,
  assetType, // This restricts what can be selected
  title = "Select Asset",
  allowMultiple = false,
  initialTab,
  initialTextSubTab,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("All");
  const [activeTextSubTab, setActiveTextSubTab] = useState<string>("All"); // Sub-tab for Text assets
  const [createTextAssetOpen, setCreateTextAssetOpen] = useState(false);
  const [createImageAssetOpen, setCreateImageAssetOpen] = useState(false);
  const [createYoutubeVideoAssetOpen, setCreateYoutubeVideoAssetOpen] =
    useState(false);
  const [createSitelinkAssetOpen, setCreateSitelinkAssetOpen] = useState(false);
  // const [createCalloutAssetOpen, setCreateCalloutAssetOpen] = useState(false);

  const tabs = [
    "All",
    "Business Name",
    "Logo",
    "Text",
    "Image",
    "YouTube Video",
    "Sitelink",
  ]; // "Callout" - commented out temporarily
  const textSubTabs = [
    "All",
    "Text",
    "Headline",
    "Description",
    "Long Headline",
  ];

  // Use React Query to fetch assets with caching
  const {
    data: allAssets = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useAssets(
    isOpen ? profileId : undefined, // Only fetch when modal is open
  );

  const error = queryError
    ? queryError.message || "Failed to load assets"
    : null;

  // Set initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
        if (initialTab === "Text" && initialTextSubTab) {
          setActiveTextSubTab(initialTextSubTab);
        } else if (initialTab !== "Text") {
          setActiveTextSubTab("All");
        }
      } else {
        setActiveTab("All");
        setActiveTextSubTab("All");
      }
    }
  }, [isOpen, initialTab, initialTextSubTab]);

  // No need for handleCreateAssetSuccess - React Query mutations handle cache invalidation
  // The cache will be automatically updated when assets are created via mutation hooks

  const getAssetsForTab = (): Asset[] => {
    let filtered = allAssets;

    // Filter by active tab
    if (activeTab !== "All") {
      if (activeTab === "Business Name") {
        // Business Name: TEXT assets with field_type BUSINESS_NAME from API
        filtered = filtered.filter((asset) => {
          if (asset.type !== "TEXT") return false;
          // Use field_type directly from API - exact match only, no fallback
          return asset.field_type === "BUSINESS_NAME";
        });
      } else if (activeTab === "Logo") {
        // Logo: IMAGE assets with field_type LOGO from API (campaign level)
        filtered = filtered.filter((asset) => {
          if (asset.type !== "IMAGE") return false;
          // Use field_type directly from API - exact match only, no fallback
          return asset.field_type === "LOGO";
        });
        // } else if (activeTab === "Callout") {
        //   // Callout: Show all TEXT assets (users can select any text asset to use as callout)
        //   filtered = filtered.filter((asset) => {
        //     return asset.type === "TEXT";
        //   });
      } else if (activeTab === "Text") {
        // Text (for Headlines/Descriptions): Filter by sub-tab
        filtered = filtered.filter((asset) => {
          if (asset.type !== "TEXT") return false;
          // Exclude BUSINESS_NAME as it has its own tab
          // CALLOUT commented out temporarily
          if (asset.field_type === "BUSINESS_NAME") {
            // || asset.field_type === "CALLOUT") {
            return false;
          }
          // Use field_type directly from API - exact match only, no fallback
          if (activeTextSubTab === "Text") {
            // Show text assets that are NOT yet categorized as heading, description, or long headline
            return (
              asset.field_type !== "HEADLINE" &&
              asset.field_type !== "DESCRIPTION" &&
              asset.field_type !== "LONG_HEADLINE"
            );
          } else if (activeTextSubTab === "Headline") {
            return asset.field_type === "HEADLINE";
          } else if (activeTextSubTab === "Description") {
            return asset.field_type === "DESCRIPTION";
          } else if (activeTextSubTab === "Long Headline") {
            return asset.field_type === "LONG_HEADLINE";
          } else {
            // "All" sub-tab - show all text assets (HEADLINE, DESCRIPTION, LONG_HEADLINE, and generic text)
            return true;
          }
        });
      } else if (activeTab === "Image") {
        // Image: IMAGE assets with field_type MARKETING_IMAGE or SQUARE_MARKETING_IMAGE from API (asset group level)
        filtered = filtered.filter((asset) => {
          if (asset.type !== "IMAGE") return false;
          // Use field_type directly from API - exact match only, no fallback
          return (
            asset.field_type === "MARKETING_IMAGE" ||
            asset.field_type === "SQUARE_MARKETING_IMAGE" ||
            asset.field_type === "AD_IMAGE" ||
            asset.field_type === "PORTRAIT_MARKETING_IMAGE" ||
            asset.field_type === "TALL_PORTRAIT_MARKETING_IMAGE"
          );
        });
      } else {
        const tabTypeMap: Record<string, AssetType> = {
          "YouTube Video": "YOUTUBE_VIDEO",
          Sitelink: "SITELINK",
        };
        const tabType = tabTypeMap[activeTab];
        if (tabType) {
          filtered = filtered.filter((asset) => asset.type === tabType);
        }
      }
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((asset) => {
        return (
          asset.name.toLowerCase().includes(search) ||
          (asset.type === "TEXT" &&
            "text" in asset &&
            asset.text?.toLowerCase().includes(search)) ||
          (asset.type === "SITELINK" &&
            "link_text" in asset &&
            asset.link_text?.toLowerCase().includes(search))
        );
      });
    }

    return filtered;
  };

  const handleSelect = (asset: Asset) => {
    // Check if this asset type is allowed for selection
    if (assetType) {
      // Map assetType to actual asset types
      if (assetType === "TEXT" && asset.type !== "TEXT") {
        alert(`Only text assets can be selected for ${title}`);
        return;
      }
      if (assetType === "IMAGE" && asset.type !== "IMAGE") {
        alert(`Only image assets can be selected for ${title}`);
        return;
      }
      if (assetType === "YOUTUBE_VIDEO" && asset.type !== "YOUTUBE_VIDEO") {
        alert(`Only YouTube video assets can be selected for ${title}`);
        return;
      }
      if (assetType === "SITELINK" && asset.type !== "SITELINK") {
        alert(`Only sitelink assets can be selected for ${title}`);
        return;
      }
    }

    // Additional field_type validation for specific asset selections
    if (title && title.includes("Business Name")) {
      if (asset.type === "TEXT" && asset.field_type !== "BUSINESS_NAME") {
        alert(
          `Only Business Name assets can be selected. Please select an asset from the Business Name tab.`,
        );
        return;
      }
    }
    if (title && title.includes("Logo")) {
      if (asset.type === "IMAGE" && asset.field_type !== "LOGO") {
        alert(
          `Only Logo assets can be selected. Please select an asset from the Logo tab.`,
        );
        return;
      }
    }
    // Headlines, Descriptions, and Long Headlines can use any text asset - no field_type restriction

    onSelect(asset);
    if (!allowMultiple) {
      onClose();
    }
  };

  const canSelectAsset = (asset: Asset): boolean => {
    if (!assetType) return true; // No restriction

    // Map assetType to actual asset types
    if (assetType === "TEXT") {
      if (asset.type !== "TEXT") return false;
      // Additional field_type validation for specific selections
      if (title && title.includes("Business Name")) {
        return asset.field_type === "BUSINESS_NAME";
      }
      if (title && title.includes("Logo")) {
        return false; // Logo should be IMAGE type, not TEXT
      }
      // Headlines, Descriptions, and Long Headlines can use any text asset - no field_type restriction
      // Just exclude BUSINESS_NAME (CALLOUT commented out temporarily)
      if (
        title &&
        (title.includes("Headline") ||
          title.includes("Description") ||
          title.includes("Long Headline"))
      ) {
        // Allow any text asset except BUSINESS_NAME (which has its own selection)
        return asset.field_type !== "BUSINESS_NAME"; // && asset.field_type !== "CALLOUT";
      }
      return true;
    }
    if (assetType === "IMAGE") {
      if (asset.type !== "IMAGE") return false;
      // Additional field_type validation for Logo
      if (title && title.includes("Logo")) {
        return asset.field_type === "LOGO";
      }
      return true;
    }
    if (assetType === "YOUTUBE_VIDEO") {
      return asset.type === "YOUTUBE_VIDEO";
    }
    if (assetType === "SITELINK") {
      return asset.type === "SITELINK";
    }
    return true;
  };

  const getAssetTypeLabel = (asset: Asset): string => {
    // Use field_type directly from API - exact values only, no fallback
    if (asset.field_type) {
      const fieldTypeMap: Record<string, string> = {
        BUSINESS_NAME: "Business Name",
        LOGO: "Logo",
        BUSINESS_LOGO: "Logo",
        // 'CALLOUT': 'Callout', // Commented out temporarily
        HEADLINE: "Headline",
        DESCRIPTION: "Description",
        LONG_HEADLINE: "Long Headline",
        SITELINK: "Sitelink",
        AD_IMAGE: "Ad Image",
        MARKETING_IMAGE: "Marketing Image",
        SQUARE_MARKETING_IMAGE: "Square Marketing Image",
        PORTRAIT_MARKETING_IMAGE: "Portrait Marketing Image",
        TALL_PORTRAIT_MARKETING_IMAGE: "Tall Portrait Marketing Image",
      };
      return (
        fieldTypeMap[asset.field_type] || asset.field_type.replace(/_/g, " ")
      );
    }

    // If no field_type from API, use asset type
    return asset.type.replace("_", " ");
  };

  if (!isOpen) return null;

  const assets = getAssetsForTab();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e8e8e3]">
          <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">
            {title}
          </h2>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="text-[#556179] hover:text-[#072929] transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-[#e8e8e3]">
          <input
            type="text"
            placeholder="Search assets by name or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-[#e8e8e3] rounded-lg bg-white focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] text-[13.3px] text-[#072929]"
          />
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-[#e8e8e3] px-6">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => {
              const tabAssets =
                tab === "All"
                  ? allAssets
                  : allAssets.filter((a) => {
                      if (tab === "Business Name") {
                        if (a.type !== "TEXT") return false;
                        // Use field_type directly from API - exact match only, no fallback
                        return a.field_type === "BUSINESS_NAME";
                      }
                      if (tab === "Logo") {
                        if (a.type !== "IMAGE") return false;
                        // Use field_type directly from API - exact match only, no fallback
                        return a.field_type === "LOGO";
                      }
                      if (tab === "Text") {
                        if (a.type !== "TEXT") return false;
                        // Exclude BUSINESS_NAME as it has its own tab
                        // CALLOUT commented out temporarily
                        if (a.field_type === "BUSINESS_NAME") return false; // || a.field_type === "CALLOUT") return false;
                        // Include HEADLINE, DESCRIPTION, LONG_HEADLINE, and generic text assets
                        return true;
                      }
                      if (tab === "Image") {
                        if (a.type !== "IMAGE") return false;
                        // Use field_type directly from API - exact match only, no fallback
                        return (
                          a.field_type === "MARKETING_IMAGE" ||
                          a.field_type === "SQUARE_MARKETING_IMAGE" ||
                          a.field_type === "AD_IMAGE" ||
                          a.field_type === "PORTRAIT_MARKETING_IMAGE" ||
                          a.field_type === "TALL_PORTRAIT_MARKETING_IMAGE"
                        );
                      }
                      if (tab === "YouTube Video")
                        return a.type === "YOUTUBE_VIDEO";
                      if (tab === "Sitelink") return a.type === "SITELINK";
                      // if (tab === "Callout") {
                      //   // Show all TEXT assets (users can select any text asset to use as callout)
                      //   return a.type === "TEXT";
                      // }
                      return false;
                    });

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveTab(tab);
                    if (tab !== "Text") {
                      setActiveTextSubTab("All"); // Reset sub-tab when switching away from Text
                    }
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
                    activeTab === tab
                      ? "border-[#136D6D] text-[#136D6D]"
                      : "border-transparent text-[#556179] hover:text-[#072929]"
                  }`}
                >
                  {tab} ({tabAssets.length})
                </button>
              );
            })}
          </div>

          {/* Text Sub-Tabs - Only show when Text tab is active */}
          {activeTab === "Text" && (
            <div className="flex space-x-1 overflow-x-auto mt-3 border-t border-[#e8e8e3] pt-3">
              {textSubTabs.map((subTab) => {
                const subTabAssets = allAssets.filter((a) => {
                  if (a.type !== "TEXT") return false;
                  // Exclude BUSINESS_NAME as it has its own tab
                  // CALLOUT commented out temporarily
                  if (a.field_type === "BUSINESS_NAME") return false; // || a.field_type === "CALLOUT") return false;

                  if (subTab === "Text") {
                    // Show text assets that are NOT yet categorized as heading, description, or long headline
                    return (
                      a.field_type !== "HEADLINE" &&
                      a.field_type !== "DESCRIPTION" &&
                      a.field_type !== "LONG_HEADLINE"
                    );
                  } else if (subTab === "All") {
                    // Show all text assets (HEADLINE, DESCRIPTION, LONG_HEADLINE, and generic text)
                    return true;
                  } else if (subTab === "Headline") {
                    return a.field_type === "HEADLINE";
                  } else if (subTab === "Description") {
                    return a.field_type === "DESCRIPTION";
                  } else if (subTab === "Long Headline") {
                    return a.field_type === "LONG_HEADLINE";
                  }
                  return false;
                });

                return (
                  <button
                    key={subTab}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveTextSubTab(subTab);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
                      activeTextSubTab === subTab
                        ? "border-[#136D6D] text-[#136D6D]"
                        : "border-transparent text-[#556179] hover:text-[#072929]"
                    }`}
                  >
                    {subTab} ({subTabAssets.length})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-b border-[#e8e8e3] flex items-center justify-end gap-2">
          {/* Text Asset Creation - for Business Name, Text tabs */}
          {(activeTab === "All" ||
            activeTab === "Business Name" ||
            activeTab === "Text") && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCreateTextAssetOpen(true);
              }}
              className="create-entity-button"
            >
              <span className="text-[10.64px] text-white font-normal">
                {activeTab === "Business Name"
                  ? "Create New Business Name"
                  : "Create New Text Asset"}
              </span>
            </button>
          )}
          {/* Image Asset Creation - for Logo, Image tabs */}
          {(activeTab === "Logo" || activeTab === "Image") && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCreateImageAssetOpen(true);
              }}
              className="create-entity-button"
            >
              <span className="text-[10.64px] text-white font-normal">
                Create New Image Asset
              </span>
            </button>
          )}
          {/* YouTube Video Asset Creation */}
          {activeTab === "YouTube Video" && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCreateYoutubeVideoAssetOpen(true);
              }}
              className="create-entity-button"
            >
              <span className="text-[10.64px] text-white font-normal">
                Create New YouTube Video Asset
              </span>
            </button>
          )}
          {/* Sitelink Asset Creation */}
          {activeTab === "Sitelink" && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCreateSitelinkAssetOpen(true);
              }}
              className="create-entity-button"
            >
              <span className="text-[10.64px] text-white font-normal">
                Create New Sitelink Asset
              </span>
            </button>
          )}
          {/* Callout Asset Creation - use text asset modal but with callout title */}
          {/* {activeTab === "Callout" && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCreateCalloutAssetOpen(true);
              }}
              className="create-entity-button"
            >
              <span className="text-[10.64px] text-white font-normal">Create New Callout Asset</span>
            </button>
          )} */}
        </div>

        {/* Content - Table View */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4 text-[13.3px]">{error}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  refetch();
                }}
                className="create-entity-button"
              >
                <span className="text-[10.64px] text-white font-normal">
                  Retry
                </span>
              </button>
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#556179] text-[13.3px]">
                {allAssets.length === 0
                  ? "No assets found. Create assets first."
                  : "No assets match your search or filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden">
                <table className="w-full text-[13.3px]">
                  <thead>
                    <tr className="border-b border-[#e8e8e3] bg-white">
                      <th className="text-left py-3 px-4 font-medium text-[#072929]">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-[#072929]">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-[#072929]">
                        Content
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-[#072929]">
                        ID
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-[#072929]">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset, index) => {
                      const selectable = canSelectAsset(asset);
                      const isLastRow = index === assets.length - 1;
                      return (
                        <tr
                          key={asset.id}
                          className={`border-b ${!isLastRow ? "border-[#e8e8e3]" : ""} hover:bg-gray-50 transition-colors ${
                            !selectable ? "opacity-50" : "cursor-pointer"
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (selectable) {
                              handleSelect(asset);
                            }
                          }}
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium text-[#072929] leading-[1.26]">
                              {asset.name}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs text-[#556179]">
                              {getAssetTypeLabel(asset)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {asset.type === "TEXT" && "text" in asset && (
                              <div className="text-[#072929] max-w-md truncate leading-[1.26]">
                                {asset.text}
                              </div>
                            )}
                            {asset.type === "IMAGE" && (
                              <div className="flex items-center gap-2">
                                {asset.image_url ? (
                                  <img
                                    src={asset.image_url}
                                    alt={asset.name}
                                    className="w-16 h-16 object-cover rounded border border-[#e8e8e3]"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                ) : null}
                                <div className="text-[#556179] text-xs">
                                  {asset.width && asset.height
                                    ? `${asset.width}x${asset.height}px`
                                    : "Image asset"}
                                </div>
                              </div>
                            )}
                            {asset.type === "YOUTUBE_VIDEO" &&
                              "youtube_video_id" in asset && (
                                <div className="flex items-center gap-2">
                                  <a
                                    href={`https://www.youtube.com/watch?v=${asset.youtube_video_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[#136D6D] hover:text-[#0f5a5a] text-xs underline flex items-center gap-1"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                    </svg>
                                    Watch on YouTube
                                  </a>
                                  <span className="text-[#556179] text-xs">
                                    ({asset.youtube_video_id})
                                  </span>
                                </div>
                              )}
                            {asset.type === "SITELINK" &&
                              "link_text" in asset && (
                                <div className="text-[#072929]">
                                  <div className="font-medium leading-[1.26]">
                                    {asset.link_text}
                                  </div>
                                  {asset.description1 && (
                                    <div className="text-xs text-[#556179] mt-1">
                                      {asset.description1}
                                    </div>
                                  )}
                                </div>
                              )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-xs text-[#556179] font-mono">
                              {asset.id}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {selectable ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSelect(asset);
                                }}
                                className="px-3 py-1 text-[10.64px] bg-[#136D6D] text-white rounded-lg hover:bg-[#0f5a5a] transition-colors font-normal"
                              >
                                Select
                              </button>
                            ) : (
                              <span className="text-xs text-[#556179]">
                                Not selectable
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[#e8e8e3]">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="px-4 py-2 text-[#072929] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-[13.3px]"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Create Text Asset Modal */}
      <CreateTextAssetModal
        isOpen={createTextAssetOpen}
        onClose={() => setCreateTextAssetOpen(false)}
        onSuccess={() => {}} // React Query mutations handle cache updates automatically
        profileId={profileId}
        title={
          activeTab === "Business Name"
            ? "Create New Business Name"
            : "Create Text Asset"
        }
        fieldType={activeTab === "Business Name" ? "BUSINESS_NAME" : undefined}
      />

      {/* Create Image Asset Modal */}
      <CreateImageAssetModal
        isOpen={createImageAssetOpen}
        onClose={() => setCreateImageAssetOpen(false)}
        onSuccess={() => {}} // React Query mutations handle cache updates automatically
        profileId={profileId}
        title="Create Image Asset"
      />

      {/* Create YouTube Video Asset Modal */}
      <CreateYoutubeVideoAssetModal
        isOpen={createYoutubeVideoAssetOpen}
        onClose={() => setCreateYoutubeVideoAssetOpen(false)}
        onSuccess={() => {}} // React Query mutations handle cache updates automatically
        profileId={profileId}
        title="Create YouTube Video Asset"
      />

      {/* Create Sitelink Asset Modal */}
      <CreateSitelinkAssetModal
        isOpen={createSitelinkAssetOpen}
        onClose={() => setCreateSitelinkAssetOpen(false)}
        onSuccess={() => {}} // React Query mutations handle cache updates automatically
        profileId={profileId}
        title="Create Sitelink Asset"
      />

      {/* Create Callout Asset Modal */}
      {/* <CreateCalloutAssetModal
        isOpen={createCalloutAssetOpen}
        onClose={() => setCreateCalloutAssetOpen(false)}
        onSuccess={() => {}} // React Query mutations handle cache updates automatically
        profileId={profileId}
        title="Create Callout Asset"
      /> */}
    </div>
  );
};
