import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dropdown } from "../ui/Dropdown";
import { campaignsService } from "../../services/campaigns";

export interface ShoppingAdInput {
  adgroup_id: number; // Required: use existing adgroup
}

interface CreateGoogleShoppingAdPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entity: ShoppingAdInput) => void;
  campaignId: string;
  accountId: string;
  loading?: boolean;
  submitError?: string | null;
}

export const CreateGoogleShoppingAdPanel: React.FC<
  CreateGoogleShoppingAdPanelProps
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
      
      const response = await campaignsService.getGoogleAdGroups(accountIdNum, campaignIdNum, params);
      
      // Map adgroups to options format
      const options = response.adgroups.map((ag: any) => {
        const adgroupId = ag.adgroup_id || ag.id;
        return {
          value: adgroupId?.toString() || "",
          label: ag.name || ag.adgroup_name || `Ad Group ${adgroupId}`,
          adgroup_id: adgroupId,
        };
      }).filter((opt: any) => opt.value && opt.adgroup_id);
      
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

  // Debounced search effect
  useEffect(() => {
    if (!isOpen) return;
    
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
  }, [adgroupSearchQuery, isOpen, fetchAdgroups]);

  // Fetch adgroups when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchAdgroups("");
    }
  }, [isOpen, fetchAdgroups]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Ad group is required
    if (!selectedAdGroupId) {
      newErrors.adGroup = "Please select an ad group";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    const entity: ShoppingAdInput = {
      adgroup_id: parseInt(selectedAdGroupId, 10),
    };

    onSubmit(entity);
  };

  const handleCancel = () => {
    setSelectedAdGroupId("");
    setErrors({});
    onClose();
  };

  // Reset form when panel closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedAdGroupId("");
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      {/* Form */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
          Create Shopping Ad
        </h2>

        {/* Ad Group Section */}
        <div className="mb-6">
          <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
            Ad Group *
          </h3>
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
              emptyMessage={loadingAdgroups ? "Loading..." : "No adgroups found. Please create an ad group first."}
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
                No ad groups available. Please create an ad group first in the Ad Groups tab.
              </p>
            )}
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
          {loading ? "Creating..." : "Create Shopping Ad"}
        </button>
      </div>
    </div>
  );
};
