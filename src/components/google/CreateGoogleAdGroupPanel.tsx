import React, { useState, useEffect, useRef } from "react";

export interface AdGroupInput {
  adgroup: {
    name: string;
    cpc_bid?: number;
  };
}

interface CreateGoogleAdGroupPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entity: AdGroupInput) => void;
  campaignId: string;
  campaignName?: string;
  loading?: boolean;
  submitError?: string | null;
}

export const CreateGoogleAdGroupPanel: React.FC<
  CreateGoogleAdGroupPanelProps
> = ({
  isOpen,
  onClose,
  onSubmit,
  campaignId: _campaignId,
  campaignName,
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
    const dateTime = `${day}/${month}/${year} ${hours}:${minutes}`;
    
    if (campaignName) {
      return `${campaignName} -- Ad Group - ${dateTime}`;
    }
    return `Ad Group - ${dateTime}`;
  };

  const [adgroupName, setAdgroupName] = useState(generateDefaultAdGroupName());
  const [adgroupBid, setAdgroupBid] = useState<number | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when panel closes
  useEffect(() => {
    if (!isOpen) {
      setAdgroupName(generateDefaultAdGroupName());
      setAdgroupBid(undefined);
      setErrors({});
    }
  }, [isOpen]);

  // Reset form after successful submission (when loading goes from true to false while panel is open)
  const prevLoadingRef = useRef(loading);
  useEffect(() => {
    if (prevLoadingRef.current === true && loading === false && isOpen) {
      // Successful submission - reset form
      setAdgroupName(generateDefaultAdGroupName());
      setAdgroupBid(undefined);
      setErrors({});
    }
    prevLoadingRef.current = loading;
  }, [loading, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!adgroupName.trim()) {
      newErrors.adgroupName = "Ad Group name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    // Only send adgroup data - no ad or keywords
    const entity: AdGroupInput = {
      adgroup: {
        name: adgroupName.trim(),
        ...(adgroupBid !== undefined && adgroupBid > 0 && { cpc_bid: adgroupBid }),
      },
    };

    onSubmit(entity);
  };

  const handleCancel = () => {
    setAdgroupName(generateDefaultAdGroupName());
    setAdgroupBid(undefined);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      {/* Form */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
          Create Ad Group
        </h2>

        {/* Ad Group Section */}
        <div className="mb-6">
          <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
            Ad Group
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="form-label-small">
                Ad Group Name *
              </label>
              <input
                type="text"
                value={adgroupName}
                onChange={(e) => {
                  setAdgroupName(e.target.value);
                  if (errors.adgroupName) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.adgroupName;
                      return newErrors;
                    });
                  }
                }}
                placeholder="Enter ad group name"
                className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                  errors.adgroupName ? "border-red-500" : "border-gray-200"
                }`}
              />
              {errors.adgroupName && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.adgroupName}
                </p>
              )}
            </div>
            <div className="w-[140px]">
              <label className="form-label-small">
                CPC Bid (Optional)
              </label>
              <input
                type="number"
                value={adgroupBid || ""}
                onChange={(e) =>
                  setAdgroupBid(
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
          {loading ? "Creating..." : "Create Ad Group"}
        </button>
      </div>
    </div>
  );
};

