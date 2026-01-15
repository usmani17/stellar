import React, { useState, useEffect } from "react";
import { Dropdown } from "../ui/Dropdown";

interface RefreshMessage {
  type: "loading" | "success" | "error";
  message: string;
  details?: string;
}

interface CreateGoogleCampaignPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateGoogleCampaignData) => Promise<void>;
  accountId?: string;
  loading?: boolean;
  submitError?: string | null;
  mode?: "create" | "edit";
  initialData?: Partial<CreateGoogleCampaignData> | null;
  campaignId?: string | number;
  refreshMessage?: RefreshMessage | null;
}

export interface CreateGoogleCampaignData {
  campaign_type: "PERFORMANCE_MAX" | "SHOPPING" | "SEARCH";
  customer_id?: string;
  name: string;
  budget_amount: number;
  budget_name?: string;
  start_date?: string; // YYYY-MM-DD format
  end_date?: string; // YYYY-MM-DD format
  status?: "ENABLED" | "PAUSED";
  // Performance Max fields
  final_url?: string;
  asset_group_name?: string;
  headlines?: string[];
  descriptions?: string[];
  business_name?: string;
  logo_url?: string;
  marketing_image_url?: string;
  square_marketing_image_url?: string;
  long_headline?: string;
  // Shopping fields
  merchant_id?: string;
  sales_country?: string;
  campaign_priority?: number;
  enable_local?: boolean;
  // Search fields
  adgroup_name?: string;
  keywords?: string[] | string; // Can be array or comma-separated string
  match_type?: "BROAD" | "PHRASE" | "EXACT";
}

const CAMPAIGN_TYPES = [
  { value: "PERFORMANCE_MAX", label: "Performance Max" },
  { value: "SHOPPING", label: "Shopping" },
  { value: "SEARCH", label: "Search" },
];

const STATUS_OPTIONS = [
  { value: "ENABLED", label: "Enabled" },
  { value: "PAUSED", label: "Paused" },
];

const CAMPAIGN_PRIORITY_OPTIONS = [
  { value: 0, label: "Low (0)" },
  { value: 1, label: "Medium (1)" },
  { value: 2, label: "High (2)" },
];

const SALES_COUNTRY_OPTIONS = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IT", label: "Italy" },
  { value: "ES", label: "Spain" },
  { value: "NL", label: "Netherlands" },
  { value: "BE", label: "Belgium" },
  { value: "SE", label: "Sweden" },
  { value: "NO", label: "Norway" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
  { value: "PL", label: "Poland" },
  { value: "JP", label: "Japan" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "IN", label: "India" },
  { value: "CN", label: "China" },
];

export const CreateGoogleCampaignPanel: React.FC<CreateGoogleCampaignPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  submitError = null,
  mode = "create",
  initialData = null,
  campaignId,
  refreshMessage = null,
}) => {
  const [showRefreshDetails, setShowRefreshDetails] = useState(false);
  const [formData, setFormData] = useState<CreateGoogleCampaignData>({
    campaign_type: "PERFORMANCE_MAX",
    name: "",
    budget_amount: 0,
    budget_name: "",
    status: "PAUSED",
    // Performance Max defaults
    final_url: "",
    headlines: [""],
    descriptions: [""],
    // Shopping defaults
    sales_country: "US",
    campaign_priority: 0,
    enable_local: false,
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof CreateGoogleCampaignData, string>>
  >({});

  // Parse field errors from submitError
  useEffect(() => {
    if (submitError) {
      try {
        const parsed = JSON.parse(submitError);
        if (parsed.fieldErrors && typeof parsed.fieldErrors === "object") {
          setErrors(parsed.fieldErrors);
        }
      } catch (e) {
        setErrors({});
      }
    } else {
      setErrors({});
    }
  }, [submitError]);

  // Reset form when panel closes or load initial data when in edit mode
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    } else if (mode === "edit" && initialData) {
      // Load initial data for edit mode
      setFormData((prev) => ({
        ...prev,
        ...initialData,
      }));
    }
  }, [isOpen, mode, initialData]);

  const resetForm = () => {
    setFormData({
      campaign_type: "PERFORMANCE_MAX",
      name: "",
      budget_amount: 0,
      budget_name: "",
      status: "PAUSED",
      final_url: "",
      headlines: [""],
      descriptions: [""],
      sales_country: "US",
      campaign_priority: 0,
      enable_local: false,
    });
    setErrors({});
  };

  const handleChange = (
    field: keyof CreateGoogleCampaignData,
    value: any
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const addHeadline = () => {
    if (formData.headlines && formData.headlines.length < 15) {
      setFormData((prev) => ({
        ...prev,
        headlines: [...(prev.headlines || []), ""],
      }));
    }
  };

  const removeHeadline = (index: number) => {
    if (formData.headlines && formData.headlines.length > 1) {
      const newHeadlines = formData.headlines.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, headlines: newHeadlines }));
    }
  };

  const updateHeadline = (index: number, value: string) => {
    if (formData.headlines) {
      const newHeadlines = [...formData.headlines];
      newHeadlines[index] = value;
      setFormData((prev) => ({ ...prev, headlines: newHeadlines }));
    }
  };

  const addDescription = () => {
    if (formData.descriptions && formData.descriptions.length < 4) {
      setFormData((prev) => ({
        ...prev,
        descriptions: [...(prev.descriptions || []), ""],
      }));
    }
  };

  const removeDescription = (index: number) => {
    if (formData.descriptions && formData.descriptions.length > 1) {
      const newDescriptions = formData.descriptions.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, descriptions: newDescriptions }));
    }
  };

  const updateDescription = (index: number, value: string) => {
    if (formData.descriptions) {
      const newDescriptions = [...formData.descriptions];
      newDescriptions[index] = value;
      setFormData((prev) => ({ ...prev, descriptions: newDescriptions }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CreateGoogleCampaignData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Campaign name is required";
    }

    if (!formData.budget_amount || formData.budget_amount <= 0) {
      newErrors.budget_amount = "Budget must be greater than 0";
    }

    if (formData.campaign_type === "PERFORMANCE_MAX") {
      if (!formData.final_url?.trim()) {
        newErrors.final_url = "Final URL is required";
      } else if (!/^https?:\/\/.+/.test(formData.final_url)) {
        newErrors.final_url = "Final URL must be a valid URL (http:// or https://)";
      }

      if (!formData.business_name?.trim()) {
        newErrors.business_name = "Business name is required";
      }

      if (!formData.logo_url?.trim() || formData.logo_url === 'https://example.com') {
        newErrors.logo_url = "Logo URL is required. Please provide a logo URL or upload a logo.";
      } else if (!/^https?:\/\/.+/.test(formData.logo_url)) {
        newErrors.logo_url = "Logo URL must be a valid URL (http:// or https://)";
      }

      const validHeadlines = (formData.headlines || []).filter((h) => h.trim());
      if (validHeadlines.length < 3) {
        newErrors.headlines = "At least 3 headlines are required";
      } else if (validHeadlines.length > 15) {
        newErrors.headlines = "Maximum 15 headlines allowed";
      }

      const validDescriptions = (formData.descriptions || []).filter((d) => d.trim());
      if (validDescriptions.length < 2) {
        newErrors.descriptions = "At least 2 descriptions are required";
      } else if (validDescriptions.length > 4) {
        newErrors.descriptions = "Maximum 4 descriptions allowed";
      }
    } else if (formData.campaign_type === "SHOPPING") {
      if (!formData.merchant_id?.trim()) {
        newErrors.merchant_id = "Merchant ID is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Filter out empty headlines and descriptions
    const payload: CreateGoogleCampaignData = {
      ...formData,
      headlines: formData.campaign_type === "PERFORMANCE_MAX"
        ? (formData.headlines || []).filter((h) => h.trim())
        : undefined,
      descriptions: formData.campaign_type === "PERFORMANCE_MAX"
        ? (formData.descriptions || []).filter((d) => d.trim())
        : undefined,
      // Remove Search-specific fields - ad groups and keywords will be created separately
      adgroup_name: undefined,
      keywords: undefined,
      match_type: undefined,
    };

    try {
      await onSubmit(payload);
      resetForm();
      setErrors({});
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  // Helper function to format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to format date as "DD MMM YYYY" (e.g., "24 Dec 2025")
  const formatDateForName = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Quick fill functions for testing
  const quickFillPerformanceMax = () => {
    const today = new Date();
    const dateStr = formatDateForName(today);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 14); // 14 days from now
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1); // 1 day after start date
    
    setFormData({
      campaign_type: "PERFORMANCE_MAX",
      name: `PMAX Campaign Stellar FE - ${dateStr} - 1`,
      budget_amount: 10,
      budget_name: "Test PMax Budget",
      status: "PAUSED",
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      final_url: "https://techesthete.com",
      business_name: "Techesthete",
      logo_url: "https://placehold.co/128x128", // 128x128 PNG placeholder logo
      headlines: [
        "Great Software Solutions",
        "AI-Powered Development",
        "Expert Software Services",
        "Innovative Technology",
        "Professional Development Team"
      ],
      descriptions: [
        "We provide cutting-edge software solutions for your business needs",
        "Transform your business with our AI-powered development services"
      ],
      marketing_image_url: "",
      square_marketing_image_url: "",
      long_headline: "",
      asset_group_name: "",
      sales_country: "US",
      campaign_priority: 0,
      enable_local: false,
    });
    setErrors({});
  };

  const quickFillShopping = () => {
    const today = new Date();
    const dateStr = formatDateForName(today);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 14); // 14 days from now
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1); // 1 day after start date
    
    setFormData({
      campaign_type: "SHOPPING",
      name: `Shopping Campaign Stellar FE - ${dateStr} - 1`,
      budget_amount: 10,
      budget_name: "Test Shopping Budget",
      status: "PAUSED",
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      merchant_id: "109055893",
      sales_country: "US",
      campaign_priority: 1,
      enable_local: false,
      final_url: "",
      business_name: "",
      logo_url: "",
      headlines: [],
      descriptions: [],
    });
    setErrors({});
  };

  const quickFillSearch = () => {
    const today = new Date();
    const dateStr = formatDateForName(today);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 14); // 14 days from now
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1); // 1 day after start date
    
    setFormData({
      campaign_type: "SEARCH",
      name: `Search Campaign Stellar FE - ${dateStr} - 1`,
      budget_amount: 10,
      budget_name: "Test Search Budget",
      status: "PAUSED",
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      final_url: "",
      business_name: "",
      logo_url: "",
      headlines: [],
      descriptions: [],
      sales_country: "US",
      campaign_priority: 0,
      enable_local: false,
    });
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6]">
      <form onSubmit={handleSubmit}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
            {mode === "edit" ? "Edit Google Campaign" : "Create Google Campaign"}
          </h2>

          {/* Refresh Message */}
          {refreshMessage && mode === "edit" && (
            <div
              className={`mb-4 p-3 rounded-lg border cursor-pointer transition-all ${
                refreshMessage.type === "loading"
                  ? "bg-blue-50 border-blue-200 text-blue-800"
                  : refreshMessage.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-yellow-50 border-yellow-200 text-yellow-800"
              }`}
              onClick={() => setShowRefreshDetails(!showRefreshDetails)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {refreshMessage.type === "loading" && (
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                  {refreshMessage.type === "success" && (
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {refreshMessage.type === "error" && (
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  <span className="text-[12px] font-medium">
                    {refreshMessage.message}
                  </span>
                </div>
                {refreshMessage.details && (
                  <svg
                    className={`h-4 w-4 transition-transform ${
                      showRefreshDetails ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                )}
              </div>
              {showRefreshDetails && refreshMessage.details && (
                <div className="mt-2 text-[11px] opacity-80">
                  {refreshMessage.details}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campaign Type */}
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Campaign Type *
              </label>
              <div className="space-y-2">
                <Dropdown<string>
                  options={CAMPAIGN_TYPES}
                  value={formData.campaign_type}
                  onChange={(value) => handleChange("campaign_type", value)}
                  placeholder="Select campaign type"
                  buttonClassName="w-full"
                  disabled={mode === "edit"}
                />
                {/* Quick Fill Buttons for Testing */}
                {mode !== "edit" && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={quickFillPerformanceMax}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] hover:bg-blue-200 transition-colors"
                    title="Quick fill Performance Max campaign with test data"
                  >
                    Quick Fill PMax
                  </button>
                  <button
                    type="button"
                    onClick={quickFillShopping}
                    className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] hover:bg-green-200 transition-colors"
                    title="Quick fill Shopping campaign with test data"
                  >
                    Quick Fill Shopping
                  </button>
                  <button
                    type="button"
                    onClick={quickFillSearch}
                    className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-[10px] hover:bg-purple-200 transition-colors"
                    title="Quick fill Search campaign with test data"
                  >
                    Quick Fill Search
                  </button>
                </div>
                )}
              </div>
              {errors.campaign_type && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.campaign_type}
                </p>
              )}
            </div>

            {/* Campaign Name */}
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Campaign Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={`bg-white w-full px-3 py-2 border rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                  errors.name ? "border-red-500" : "border-gray-200"
                }`}
                placeholder="Enter campaign name"
              />
              {errors.name && (
                <p className="text-[10px] text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            {/* Budget Amount */}
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Budget Amount ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.budget_amount || ""}
                onChange={(e) =>
                  handleChange("budget_amount", parseFloat(e.target.value) || 0)
                }
                className={`bg-white w-full px-3 py-2 border rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                  errors.budget_amount ? "border-red-500" : "border-gray-200"
                }`}
                placeholder="0.00"
              />
              {errors.budget_amount && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.budget_amount}
                </p>
              )}
            </div>

            {/* Budget Name */}
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Budget Name
              </label>
              <input
                type="text"
                value={formData.budget_name || ""}
                onChange={(e) => handleChange("budget_name", e.target.value)}
                className="bg-white w-full px-3 py-2 border border-gray-200 rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                placeholder="Optional budget name"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Start Date
              </label>
              {(() => {
                // Check if start date is today or in the past (only in edit mode)
                const isReadonly = mode === "edit" && formData.start_date ? (() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const startDate = new Date(formData.start_date);
                  startDate.setHours(0, 0, 0, 0);
                  return startDate <= today;
                })() : false;
                
                return (
                  <input
                    type="date"
                    value={formData.start_date || ""}
                    onChange={(e) => handleChange("start_date", e.target.value)}
                    disabled={isReadonly}
                    className={`bg-white w-full px-3 py-2 border border-gray-200 rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                      isReadonly ? "bg-gray-100 cursor-not-allowed opacity-60" : ""
                    }`}
                    title={isReadonly ? "Start date cannot be changed if it's today or in the past" : ""}
                  />
                );
              })()}
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                End Date
              </label>
              <input
                type="date"
                value={formData.end_date || ""}
                onChange={(e) => handleChange("end_date", e.target.value)}
                className="bg-white w-full px-3 py-2 border border-gray-200 rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Status
              </label>
              <Dropdown<string>
                options={STATUS_OPTIONS}
                value={formData.status || "PAUSED"}
                onChange={(value) => handleChange("status", value)}
                buttonClassName="w-full"
              />
            </div>
          </div>

          {/* Performance Max Specific Fields */}
          {formData.campaign_type === "PERFORMANCE_MAX" && (
            <div className="mt-6 space-y-4">
              <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
                Performance Max Settings
              </h3>

              {/* Final URL */}
              <div>
                <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                  Final URL *
                </label>
                <input
                  type="url"
                  value={formData.final_url || ""}
                  onChange={(e) => handleChange("final_url", e.target.value)}
                  className={`bg-white w-full px-3 py-2 border rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                    errors.final_url ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="https://example.com"
                />
                {errors.final_url && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.final_url}
                  </p>
                )}
              </div>

              {/* Asset Group Name */}
              <div>
                <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                  Asset Group Name
                </label>
                <input
                  type="text"
                  value={formData.asset_group_name || ""}
                  onChange={(e) =>
                    handleChange("asset_group_name", e.target.value)
                  }
                  className="bg-white w-full px-3 py-2 border border-gray-200 rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                  placeholder="Optional asset group name"
                />
              </div>

              {/* Headlines */}
              <div>
                <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                  Headlines * (3-15 required)
                  <span className="text-[10px] text-[#556179] font-normal ml-2">
                    ({formData.headlines?.filter((h) => h.trim()).length || 0}/15)
                  </span>
                </label>
                <div className="space-y-2">
                  {formData.headlines?.map((headline, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={headline}
                        onChange={(e) =>
                          updateHeadline(index, e.target.value)
                        }
                        className="bg-white flex-1 px-3 py-2 border border-gray-200 rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                        placeholder={`Headline ${index + 1}`}
                      />
                      {formData.headlines && formData.headlines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeHeadline(index)}
                          className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-[12px]"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  {formData.headlines && formData.headlines.length < 15 && (
                    <button
                      type="button"
                      onClick={addHeadline}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-[12px]"
                    >
                      + Add Headline
                    </button>
                  )}
                </div>
                {errors.headlines && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.headlines}
                  </p>
                )}
              </div>

              {/* Descriptions */}
              <div>
                <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                  Descriptions * (2-4 required)
                  <span className="text-[10px] text-[#556179] font-normal ml-2">
                    ({formData.descriptions?.filter((d) => d.trim()).length || 0}/4)
                  </span>
                </label>
                <div className="space-y-2">
                  {formData.descriptions?.map((description, index) => (
                    <div key={index} className="flex gap-2">
                      <textarea
                        value={description}
                        onChange={(e) =>
                          updateDescription(index, e.target.value)
                        }
                        rows={2}
                        className="bg-white flex-1 px-3 py-2 border border-gray-200 rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                        placeholder={`Description ${index + 1}`}
                      />
                      {formData.descriptions &&
                        formData.descriptions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDescription(index)}
                            className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-[12px]"
                          >
                            Remove
                          </button>
                        )}
                    </div>
                  ))}
                  {formData.descriptions &&
                    formData.descriptions.length < 4 && (
                      <button
                        type="button"
                        onClick={addDescription}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-[12px]"
                      >
                        + Add Description
                      </button>
                    )}
                </div>
                {errors.descriptions && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.descriptions}
                  </p>
                )}
              </div>

              {/* Optional Performance Max Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={formData.business_name || ""}
                    onChange={(e) =>
                      handleChange("business_name", e.target.value)
                    }
                    className={`bg-white w-full px-3 py-2 border rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                      errors.business_name ? "border-red-300" : "border-gray-200"
                    }`}
                    placeholder="Required business name"
                  />
                  {errors.business_name && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.business_name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                    Long Headline
                  </label>
                  <input
                    type="text"
                    value={formData.long_headline || ""}
                    onChange={(e) =>
                      handleChange("long_headline", e.target.value)
                    }
                    className="bg-white w-full px-3 py-2 border border-gray-200 rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                    placeholder="Optional long headline"
                  />
                </div>

                <div>
                  <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                    Logo (URL or Upload) *
                  </label>
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={formData.logo_url || ""}
                      onChange={(e) => handleChange("logo_url", e.target.value)}
                      className="bg-white w-full px-3 py-2 border border-gray-200 rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                      placeholder="https://example.com/logo.png"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validate file size (max 5MB)
                            if (file.size > 5 * 1024 * 1024) {
                              setErrors({ ...errors, logo_url: "File size must be less than 5MB" });
                              return;
                            }
                            // Validate file type
                            if (!file.type.startsWith("image/")) {
                              setErrors({ ...errors, logo_url: "File must be an image" });
                              return;
                            }
                            
                            // Validate image dimensions (must be square, minimum 128x128)
                            try {
                              const img = new Image();
                              const objectUrl = URL.createObjectURL(file);
                              
                              await new Promise((resolve, reject) => {
                                img.onload = () => {
                                  URL.revokeObjectURL(objectUrl);
                                  const width = img.width;
                                  const height = img.height;
                                  
                                  // Check if square (1:1 aspect ratio)
                                  if (width !== height) {
                                    setErrors({ 
                                      ...errors, 
                                      logo_url: `Logo must be square (1:1 aspect ratio). Current dimensions: ${width}x${height}px. Please use a square image.` 
                                    });
                                    reject(new Error("Not square"));
                                    return;
                                  }
                                  
                                  // Check minimum size
                                  if (width < 128 || height < 128) {
                                    setErrors({ 
                                      ...errors, 
                                      logo_url: `Logo must be at least 128x128 pixels. Current dimensions: ${width}x${height}px. Recommended: 128x128px or larger.` 
                                    });
                                    reject(new Error("Too small"));
                                    return;
                                  }
                                  
                                  resolve(null);
                                };
                                
                                img.onerror = () => {
                                  URL.revokeObjectURL(objectUrl);
                                  setErrors({ ...errors, logo_url: "Failed to load image. Please try a different file." });
                                  reject(new Error("Image load failed"));
                                };
                                
                                img.src = objectUrl;
                              });
                              
                              // If dimension validation passed, proceed with upload
                              try {
                                // Upload file
                                const formData = new FormData();
                                formData.append("file", file);
                                
                                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"}/accounts/upload/logo/`, {
                                  method: "POST",
                                  headers: {
                                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                                  },
                                  body: formData,
                                });
                                
                                const responseData = await response.json();
                                
                                if (!response.ok) {
                                  const errorMessage = responseData.error || responseData.message || "Upload failed";
                                  setErrors({ ...errors, logo_url: errorMessage });
                                  return;
                                }
                                
                                if (responseData.url) {
                                  handleChange("logo_url", responseData.url);
                                  setErrors({ ...errors, logo_url: undefined });
                                } else {
                                  setErrors({ ...errors, logo_url: "Upload succeeded but no URL returned" });
                                }
                              } catch (error: any) {
                                setErrors({ ...errors, logo_url: error.message || "Failed to upload logo. Please try again or use a URL." });
                              }
                            } catch (error: any) {
                              // Dimension validation error already set
                              if (!error.message || (error.message !== "Not square" && error.message !== "Too small" && error.message !== "Image load failed")) {
                                setErrors({ ...errors, logo_url: "Failed to validate image dimensions. Please try a different file." });
                              }
                            }
                          }
                        }}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label
                        htmlFor="logo-upload"
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-[12px] cursor-pointer hover:bg-gray-200 transition-colors"
                      >
                        Upload Logo
                      </label>
                    </div>
                    {errors.logo_url && (
                      <p className="text-[10px] text-red-500 mt-1">
                        {errors.logo_url}
                      </p>
                    )}
                    <p className="text-[10px] text-[#556179] mt-1">
                      Logo must be square (1:1 aspect ratio) and at least 128x128 pixels. Recommended: 128x128px or larger.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                    Marketing Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.marketing_image_url || ""}
                    onChange={(e) =>
                      handleChange("marketing_image_url", e.target.value)
                    }
                    className="bg-white w-full px-3 py-2 border border-gray-200 rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                    placeholder="https://example.com/image.png"
                  />
                </div>

                <div>
                  <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                    Square Marketing Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.square_marketing_image_url || ""}
                    onChange={(e) =>
                      handleChange("square_marketing_image_url", e.target.value)
                    }
                    className="bg-white w-full px-3 py-2 border border-gray-200 rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
                    placeholder="https://example.com/square-image.png"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Shopping Specific Fields */}
          {formData.campaign_type === "SHOPPING" && (
            <div className="mt-6 space-y-4">
              <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
                Shopping Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Merchant ID */}
                <div>
                  <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                    Merchant ID *
                  </label>
                  <input
                    type="text"
                    value={formData.merchant_id || ""}
                    onChange={(e) => handleChange("merchant_id", e.target.value)}
                    className={`bg-white w-full px-3 py-2 border rounded text-[13px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                      errors.merchant_id ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="Enter merchant ID"
                  />
                  {errors.merchant_id && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.merchant_id}
                    </p>
                  )}
                </div>

                {/* Sales Country */}
                <div>
                  <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                    Sales Country
                  </label>
                  <Dropdown<string>
                    options={SALES_COUNTRY_OPTIONS}
                    value={formData.sales_country || "US"}
                    onChange={(value) => handleChange("sales_country", value)}
                    buttonClassName="w-full"
                  />
                </div>

                {/* Campaign Priority */}
                <div>
                  <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                    Campaign Priority
                  </label>
                  <Dropdown<number>
                    options={CAMPAIGN_PRIORITY_OPTIONS}
                    value={formData.campaign_priority || 0}
                    onChange={(value) => handleChange("campaign_priority", value)}
                    buttonClassName="w-full"
                  />
                  <p className="text-[10px] text-[#556179] mt-1">
                    Priority determines how your Shopping campaigns compete with each other. Low (0) = lowest priority, High (2) = highest priority.
                  </p>
                </div>

                {/* Enable Local */}
                <div className="pt-6">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.enable_local || false}
                      onChange={(e) =>
                        handleChange("enable_local", e.target.checked)
                      }
                      className="w-4 h-4 text-[#136D6D] focus:ring-[#136D6D] border-gray-300 rounded"
                    />
                    <label className="text-[13px] text-[#072929]">
                      Enable Local
                    </label>
                  </div>
                  <p className="text-[10px] text-[#556179] mt-1 ml-6">
                    Enable local inventory ads to show your products to nearby customers with local inventory available.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* General Error Message */}
          {submitError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-[13px] text-red-700">
              {(() => {
                try {
                  const parsed = JSON.parse(submitError);
                  return parsed.message || submitError;
                } catch {
                  return submitError;
                }
              })()}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 bg-background-field border border-gray-200 text-button-text text-text-primary rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-[#136D6D] text-white rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[13px]"
            disabled={loading}
          >
            {loading ? (mode === "edit" ? "Updating..." : "Creating...") : (mode === "edit" ? "Update Campaign" : "Create Campaign")}
          </button>
        </div>
      </form>
    </div>
  );
};

