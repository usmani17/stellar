import React, { useState, useEffect, useCallback } from "react";
import { GooglePerformanceMaxAssetGroupForm } from "./campaigns/GooglePerformanceMaxAssetGroupForm";
import type { CreateGoogleCampaignData } from "./campaigns/types";

// Feature flag: Controls whether asset groups are automatically created when creating a PMAX campaign
// When false, asset group fields are filtered out from the campaign creation payload
// This prevents the backend from automatically creating an asset group during campaign creation
export const SHOULD_CREATE_ASSET_GROUP_ON_PMAX_CREATION = false;

export interface PmaxAssetGroupInput {
  asset_group: {
    name: string;
    final_url?: string;
  };
  assets: {
    headlines: string[];
    descriptions: string[];
    long_headline: string; // Required field
    marketing_image_url?: string;
    square_marketing_image_url?: string;
    business_name?: string;
    logo_url?: string;
    video_asset_resource_names?: string[];
    sitelink_asset_resource_names?: string[];
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
  onSubmit: (entity: PmaxAssetGroupInput, options?: { saveAsDraft?: boolean }) => void;
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
  profileId?: number | null; // Profile ID for asset selector
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
  profileId = null,
}) => {
  // Suppress unused variable warnings - these props are part of the interface but not used in this component
  void _campaignId;
  void _assetGroupId;
    // Form data state (using CreateGoogleCampaignData format for compatibility)
    const [formData, setFormData] = useState<CreateGoogleCampaignData>({
      campaign_type: "PERFORMANCE_MAX",
      name: "",
      budget_amount: 0,
      asset_group_name: "",
      final_url: "",
      headlines: ["", "", ""], // Minimum 3 for validation
      descriptions: ["", ""], // Minimum 2 for validation
      long_headlines: [""], // Minimum 1 for validation (required)
    });

    const [errors, setErrors] = useState<Partial<Record<keyof CreateGoogleCampaignData, string>>>({});

    // Image previews - state needed because form component calls setters directly
    const [marketingImagePreview, setMarketingImagePreview] = useState<string | null>(null);
    const [squareMarketingImagePreview, setSquareMarketingImagePreview] = useState<string | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    // Track previous editMode and initialData to detect meaningful changes
    const prevEditModeRef = React.useRef(editMode);
    const prevInitialDataRef = React.useRef(initialData);
    
    // Sync form data when editMode or initialData changes (legitimate prop-to-state sync pattern)
    useEffect(() => {
      /* eslint-disable react-hooks/set-state-in-effect */
      const editModeChanged = prevEditModeRef.current !== editMode;
      const initialDataChanged = prevInitialDataRef.current !== initialData;
      
      if (editModeChanged || initialDataChanged) {
        if (editMode && initialData) {
          const newFormData: CreateGoogleCampaignData = {
            campaign_type: "PERFORMANCE_MAX",
            name: "",
            budget_amount: 0,
            asset_group_name: initialData.asset_group_name || "",
            final_url: initialData.final_url || "",
            headlines: Array.isArray(initialData.headlines) && initialData.headlines.length > 0 ? initialData.headlines : ["", "", ""],
            descriptions: Array.isArray(initialData.descriptions) && initialData.descriptions.length > 0 ? initialData.descriptions : ["", ""],
            long_headlines: initialData.long_headline ? [initialData.long_headline] : [""], // Minimum 1 required
            marketing_image_url: initialData.marketing_image_url || "",
            square_marketing_image_url: initialData.square_marketing_image_url || "",
            business_name: initialData.business_name || "",
            logo_url: initialData.logo_url || "",
          };
          setFormData(newFormData);
          // Update previews synchronously with form data
          setMarketingImagePreview(newFormData.marketing_image_url?.trim() || null);
          setSquareMarketingImagePreview(newFormData.square_marketing_image_url?.trim() || null);
          setLogoPreview(newFormData.logo_url?.trim() || null);
        } else if (!editMode) {
          // Reset to defaults when not in edit mode
          const newFormData: CreateGoogleCampaignData = {
            campaign_type: "PERFORMANCE_MAX",
            name: "",
            budget_amount: 0,
            asset_group_name: "",
            final_url: "",
            headlines: ["", "", ""], // Minimum 3 for validation
            descriptions: ["", ""], // Minimum 2 for validation
            long_headlines: [""], // Minimum 1 for validation (required)
          };
          setFormData(newFormData);
          // Reset previews
          setMarketingImagePreview(null);
          setSquareMarketingImagePreview(null);
          setLogoPreview(null);
        }
        
        prevEditModeRef.current = editMode;
        prevInitialDataRef.current = initialData;
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    }, [editMode, initialData]);

    const handleChange = useCallback((field: keyof CreateGoogleCampaignData, value: any) => {
      setFormData((prev) => {
        const newFormData = {
          ...prev,
          [field]: value,
        };
        // Update previews when URL fields change
        if (field === "marketing_image_url") {
          setMarketingImagePreview(typeof value === "string" && value.trim() ? value.trim() : null);
        } else if (field === "square_marketing_image_url") {
          setSquareMarketingImagePreview(typeof value === "string" && value.trim() ? value.trim() : null);
        } else if (field === "logo_url") {
          setLogoPreview(typeof value === "string" && value.trim() ? value.trim() : null);
        }
        return newFormData;
      });
      // Clear error for this field when user starts typing
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    }, [errors]);

    const validate = (): boolean => {
      const newErrors: Partial<Record<keyof CreateGoogleCampaignData, string>> = {};

      if (!formData.asset_group_name?.trim()) {
        newErrors.asset_group_name = "Asset Group name is required";
      }

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

      // Long headline is required - at least 1 is needed
      const validLongHeadlines = formData.long_headlines?.filter((h) => h.trim()).length || 0;
      if (validLongHeadlines < 1) {
        newErrors.long_headlines = "At least 1 long headline is required";
      }

      // Marketing image URLs are required for Performance Max asset groups
      if (!formData.marketing_image_url?.trim()) {
        newErrors.marketing_image_url = "Marketing Image URL is required for Performance Max asset groups";
      }

      if (!formData.square_marketing_image_url?.trim()) {
        newErrors.square_marketing_image_url = "Square Marketing Image URL is required for Performance Max asset groups";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleAddHeadline = useCallback(() => {
      const currentHeadlines = formData.headlines || [""];
      if (currentHeadlines.length < 15) {
        handleChange("headlines", [...currentHeadlines, ""]);
      }
    }, [formData.headlines, handleChange]);

    const handleRemoveHeadline = useCallback((index: number) => {
      const currentHeadlines = formData.headlines || [""];
      if (currentHeadlines.length > 3) {
        const newHeadlines = currentHeadlines.filter((_, i) => i !== index);
        // Also remove corresponding asset IDs if they exist
        const newHeadlineAssetIds = formData.headline_asset_ids?.filter((_, i) => i !== index);
        const newHeadlineAssetResourceNames = formData.headline_asset_resource_names?.filter((_, i) => i !== index);
        handleChange("headlines", newHeadlines);
        if (newHeadlineAssetIds) handleChange("headline_asset_ids", newHeadlineAssetIds);
        if (newHeadlineAssetResourceNames) handleChange("headline_asset_resource_names", newHeadlineAssetResourceNames);
      }
    }, [formData.headlines, formData.headline_asset_ids, formData.headline_asset_resource_names, handleChange]);

    const handleUpdateHeadline = useCallback((index: number, value: string) => {
      const currentHeadlines = formData.headlines || [""];
      const newHeadlines = [...currentHeadlines];
      while (newHeadlines.length <= index) {
        newHeadlines.push("");
      }
      newHeadlines[index] = value;
      handleChange("headlines", newHeadlines);
    }, [formData.headlines, handleChange]);

    const handleAddDescription = useCallback(() => {
      const currentDescriptions = formData.descriptions || [""];
      if (currentDescriptions.length < 4) {
        handleChange("descriptions", [...currentDescriptions, ""]);
      }
    }, [formData.descriptions, handleChange]);

    const handleRemoveDescription = useCallback((index: number) => {
      const currentDescriptions = formData.descriptions || [""];
      if (currentDescriptions.length > 2) {
        const newDescriptions = currentDescriptions.filter((_, i) => i !== index);
        // Also remove corresponding asset IDs if they exist
        const newDescriptionAssetIds = formData.description_asset_ids?.filter((_, i) => i !== index);
        const newDescriptionAssetResourceNames = formData.description_asset_resource_names?.filter((_, i) => i !== index);
        handleChange("descriptions", newDescriptions);
        if (newDescriptionAssetIds) handleChange("description_asset_ids", newDescriptionAssetIds);
        if (newDescriptionAssetResourceNames) handleChange("description_asset_resource_names", newDescriptionAssetResourceNames);
      }
    }, [formData.descriptions, formData.description_asset_ids, formData.description_asset_resource_names, handleChange]);

    const handleUpdateDescription = useCallback((index: number, value: string) => {
      const currentDescriptions = formData.descriptions || [""];
      const newDescriptions = [...currentDescriptions];
      while (newDescriptions.length <= index) {
        newDescriptions.push("");
      }
      newDescriptions[index] = value;
      handleChange("descriptions", newDescriptions);
    }, [formData.descriptions, handleChange]);

    const handleSubmit = () => {
      if (!validate()) {
        return;
      }

      const longHeadline = formData.long_headlines && formData.long_headlines.length > 0 ? formData.long_headlines[0]?.trim() : "";

      const entity: PmaxAssetGroupInput = {
        asset_group: {
          name: formData.asset_group_name?.trim() || "",
          ...(formData.final_url?.trim() && { final_url: formData.final_url.trim() }),
        },
        assets: {
          headlines: formData.headlines?.filter((h) => h.trim()) || [],
          descriptions: formData.descriptions?.filter((d) => d.trim()) || [],
          long_headline: longHeadline, // Required field
          ...(formData.marketing_image_url?.trim() && { marketing_image_url: formData.marketing_image_url.trim() }),
          ...(formData.square_marketing_image_url?.trim() && { square_marketing_image_url: formData.square_marketing_image_url.trim() }),
          ...(formData.business_name?.trim() && { business_name: formData.business_name.trim() }),
          ...(formData.logo_url?.trim() && { logo_url: formData.logo_url.trim() }),
          ...(formData.video_asset_resource_names && formData.video_asset_resource_names.length > 0 && { 
            video_asset_resource_names: formData.video_asset_resource_names 
          }),
          ...(formData.sitelink_asset_resource_names && formData.sitelink_asset_resource_names.length > 0 && { 
            sitelink_asset_resource_names: formData.sitelink_asset_resource_names 
          }),
        },
      };

      onSubmit(entity);
    };

    const handleSaveAsDraft = () => {
      if (!validate()) return;
      const longHeadline = formData.long_headlines && formData.long_headlines.length > 0 ? formData.long_headlines[0]?.trim() : "";
      const entity: PmaxAssetGroupInput = {
        asset_group: {
          name: formData.asset_group_name?.trim() || "",
          ...(formData.final_url?.trim() && { final_url: formData.final_url.trim() }),
        },
        assets: {
          headlines: formData.headlines?.filter((h) => h.trim()) || [],
          descriptions: formData.descriptions?.filter((d) => d.trim()) || [],
          long_headline: longHeadline,
          ...(formData.marketing_image_url?.trim() && { marketing_image_url: formData.marketing_image_url.trim() }),
          ...(formData.square_marketing_image_url?.trim() && { square_marketing_image_url: formData.square_marketing_image_url.trim() }),
          ...(formData.business_name?.trim() && { business_name: formData.business_name.trim() }),
          ...(formData.logo_url?.trim() && { logo_url: formData.logo_url.trim() }),
          ...(formData.video_asset_resource_names && formData.video_asset_resource_names.length > 0 && {
            video_asset_resource_names: formData.video_asset_resource_names,
          }),
          ...(formData.sitelink_asset_resource_names && formData.sitelink_asset_resource_names.length > 0 && {
            sitelink_asset_resource_names: formData.sitelink_asset_resource_names,
          }),
        },
      };
      onSubmit(entity, { saveAsDraft: true });
    };

    const handleCancel = () => {
      if (editMode && initialData) {
        // Reset to initial data in edit mode
        setFormData({
          campaign_type: "PERFORMANCE_MAX",
          name: "",
          budget_amount: 0,
          asset_group_name: initialData.asset_group_name || "",
          final_url: initialData.final_url || "",
          headlines: Array.isArray(initialData.headlines) && initialData.headlines.length > 0 ? initialData.headlines : ["", "", ""],
          descriptions: Array.isArray(initialData.descriptions) && initialData.descriptions.length > 0 ? initialData.descriptions : ["", ""],
          long_headlines: initialData.long_headline ? [initialData.long_headline] : [""], // Minimum 1 required
          marketing_image_url: initialData.marketing_image_url || "",
          square_marketing_image_url: initialData.square_marketing_image_url || "",
          business_name: initialData.business_name || "",
          logo_url: initialData.logo_url || "",
        });
      } else {
        // Reset to defaults in create mode
        setFormData({
          campaign_type: "PERFORMANCE_MAX",
          name: "",
          budget_amount: 0,
          asset_group_name: "",
          final_url: "",
          headlines: ["", "", ""], // Minimum 3 for validation
          descriptions: ["", ""], // Minimum 2 for validation
          long_headlines: [""], // Minimum 1 for validation (required)
        });
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

          {/* Use Reusable Asset Group Form */}
          <GooglePerformanceMaxAssetGroupForm
            formData={formData}
            errors={errors}
            onChange={handleChange}
            mode={editMode ? "edit" : "create"}
            onAddHeadline={handleAddHeadline}
            onRemoveHeadline={handleRemoveHeadline}
            onUpdateHeadline={handleUpdateHeadline}
            onAddDescription={handleAddDescription}
            onRemoveDescription={handleRemoveDescription}
            onUpdateDescription={handleUpdateDescription}
            logoPreview={logoPreview}
            setLogoPreview={setLogoPreview}
            marketingImagePreview={marketingImagePreview}
            setMarketingImagePreview={setMarketingImagePreview}
            squareMarketingImagePreview={squareMarketingImagePreview}
            setSquareMarketingImagePreview={setSquareMarketingImagePreview}
            setErrors={setErrors}
            profileId={profileId}
            campaignType="PERFORMANCE_MAX"
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
          {!editMode && (
            <button
              type="button"
              onClick={handleSaveAsDraft}
              disabled={loading}
              className="cancel-button font-semibold text-[11.2px] flex items-center gap-2 px-4 py-2"
            >
              Save as Draft
            </button>
          )}
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

