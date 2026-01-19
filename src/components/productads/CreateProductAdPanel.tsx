import React, { useState } from "react";
import { Dropdown } from "../ui/Dropdown";

export interface ProductAdInput {
  adGroupId: string;
  asin: string;
  sku?: string;
  customText?: string;
  catalogSourceCountryCode?: string;
  state: "ENABLED" | "PAUSED";
}

interface CreateProductAdPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (productAds: ProductAdInput[]) => void;
  adgroups: Array<{ adGroupId: string; name: string }>;
  campaignId: string;
  loading?: boolean;
}

const STATE_OPTIONS = [
  { value: "ENABLED", label: "ENABLED" },
  { value: "PAUSED", label: "PAUSED" },
];

export const CreateProductAdPanel: React.FC<CreateProductAdPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  adgroups,
  campaignId,
  loading = false,
}) => {
  const [currentProductAd, setCurrentProductAd] = useState<ProductAdInput>({
    adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
    asin: "",
    sku: "",
    customText: "",
    catalogSourceCountryCode: "",
    state: "ENABLED",
  });
  const [addedProductAds, setAddedProductAds] = useState<ProductAdInput[]>([]);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProductAdInput, string>>
  >({});

  const handleChange = (field: keyof ProductAdInput, value: string) => {
    setCurrentProductAd((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ProductAdInput, string>> = {};

    if (!currentProductAd.adGroupId) {
      newErrors.adGroupId = "Ad Group is required";
    }

    if (!currentProductAd.asin.trim()) {
      newErrors.asin = "ASIN is required";
    }

    if (
      currentProductAd.customText &&
      currentProductAd.customText.length > 150
    ) {
      newErrors.customText = "Custom text must be 150 characters or less";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddProductAd = () => {
    if (!validate()) {
      return;
    }

    // Add product ad to the list
    setAddedProductAds((prev) => [...prev, { ...currentProductAd }]);

    // Reset form for next product ad
    setCurrentProductAd({
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      asin: "",
      sku: "",
      customText: "",
      catalogSourceCountryCode: "",
      state: "ENABLED",
    });
    setErrors({});
  };

  const handleRemoveProductAd = (index: number) => {
    setAddedProductAds((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditProductAd = (index: number) => {
    const productAdToEdit = addedProductAds[index];
    if (productAdToEdit) {
      // Populate form with the product ad data
      setCurrentProductAd(productAdToEdit);
      // Remove from added list
      setAddedProductAds((prev) => prev.filter((_, i) => i !== index));
      // Clear any errors
      setErrors({});
    }
  };

  const handleSubmit = () => {
    if (addedProductAds.length === 0) {
      alert("Please add at least one product ad before submitting.");
      return;
    }

    onSubmit(addedProductAds);
    // Reset state after submission
    setAddedProductAds([]);
    setCurrentProductAd({
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      asin: "",
      sku: "",
      customText: "",
      catalogSourceCountryCode: "",
      state: "ENABLED",
    });
    setErrors({});
  };

  const handleCancel = () => {
    // Reset state
    setAddedProductAds([]);
    setCurrentProductAd({
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      asin: "",
      sku: "",
      customText: "",
      catalogSourceCountryCode: "",
      state: "ENABLED",
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      {/* Form */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
          Create Product Ads
        </h2>

        <div className="space-y-4">
          {/* Single line inputs */}
          <div className="flex flex-wrap items-end gap-3">
            {/* Ad Group Dropdown */}
            <div className="flex-1 min-w-[180px] w-full">
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Ad Group *
              </label>
              <Dropdown<string>
                options={adgroups.map((ag) => ({
                  value: ag.adGroupId,
                  label: ag.name,
                }))}
                value={currentProductAd.adGroupId}
                onChange={(value) => handleChange("adGroupId", value)}
                placeholder="Select ad group"
                buttonClassName="w-full"
              />
              {errors.adGroupId && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.adGroupId}
                </p>
              )}
            </div>

            {/* ASIN Input */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                ASIN *
              </label>
              <input
                type="text"
                value={currentProductAd.asin}
                onChange={(e) => handleChange("asin", e.target.value)}
                className="campaign-input w-full px-3 py-2 border border-[#e8e8e3] rounded-lg table-text focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-transparent"
                placeholder="Enter ASIN"
              />
              {errors.asin && (
                <p className="text-[10px] text-red-500 mt-1">{errors.asin}</p>
              )}
            </div>

            {/* SKU Input */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                SKU
              </label>
              <input
                type="text"
                value={currentProductAd.sku || ""}
                onChange={(e) => handleChange("sku", e.target.value)}
                className="campaign-input w-full px-3 py-2 border border-[#e8e8e3] rounded-lg table-text focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-transparent"
                placeholder="Enter SKU (optional)"
              />
            </div>

            {/* Custom Text Input */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Custom Text
              </label>
              <input
                type="text"
                value={currentProductAd.customText || ""}
                onChange={(e) => handleChange("customText", e.target.value)}
                maxLength={150}
                className="campaign-input w-full px-3 py-2 border border-[#e8e8e3] rounded-lg table-text focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-transparent"
                placeholder="Enter custom text (optional, max 150 chars)"
              />
              {errors.customText && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.customText}
                </p>
              )}
            </div>

            {/* Catalog Source Country Code */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                Country Code
              </label>
              <input
                type="text"
                value={currentProductAd.catalogSourceCountryCode || ""}
                onChange={(e) =>
                  handleChange("catalogSourceCountryCode", e.target.value)
                }
                className="campaign-input w-full px-3 py-2 border border-[#e8e8e3] rounded-lg table-text focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-transparent"
                placeholder="e.g., US (optional)"
                maxLength={2}
              />
            </div>

            {/* State Dropdown */}
            <div className="flex-1 min-w-[120px] w-full">
              <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
                State *
              </label>
              <Dropdown<string>
                options={STATE_OPTIONS}
                value={currentProductAd.state}
                onChange={(value) =>
                  handleChange("state", value as "ENABLED" | "PAUSED")
                }
                placeholder="Select state"
                buttonClassName="w-full"
              />
            </div>

            {/* Add Button */}
            <div className="flex-shrink-0">
              <button
                onClick={handleAddProductAd}
                className="px-4 py-2 bg-[#136D6D] text-white border border-[#136D6D] rounded-lg hover:bg-[#0e5a5a] transition-colors text-[11.2px] whitespace-nowrap"
              >
                Add
              </button>
            </div>
          </div>

          {/* Preview Table */}
          {addedProductAds.length > 0 && (
            <div className="mt-6">
              <h4 className="text-[13.3px] font-semibold text-[#072929] mb-3">
                Added Product Ads ({addedProductAds.length})
              </h4>
              <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden">
                <div className="max-h-[400px] overflow-auto w-full overflow-x-auto overflow-y-auto">
                  <table className="w-full min-w-max">
                    <thead className="sticky top-0 bg-[#fefefb] z-10">
                      <tr className="border-b border-[#e8e8e3]">
                        <th className="table-header">
                          Ad Group
                        </th>
                        <th className="table-header">
                          ASIN
                        </th>
                        <th className="table-header">
                          SKU
                        </th>
                        <th className="table-header">
                          Custom Text
                        </th>
                        <th className="table-header">
                          Country Code
                        </th>
                        <th className="table-header">
                          State
                        </th>
                        <th className="table-header">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {addedProductAds.map((productAd, index) => {
                        const adGroupName =
                          adgroups.find(
                            (ag) => ag.adGroupId === productAd.adGroupId
                          )?.name || productAd.adGroupId;
                        return (
                          <tr
                            key={index}
                            className="table-row group"
                          >
                            <td className="table-cell">
                              <span className="table-text leading-[1.26]">
                                {adGroupName}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="table-text leading-[1.26]">
                                {productAd.asin}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="table-text leading-[1.26]">
                                {productAd.sku || "—"}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="table-text leading-[1.26]">
                                {productAd.customText || "—"}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="table-text leading-[1.26]">
                                {productAd.catalogSourceCountryCode || "—"}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="table-text leading-[1.26]">
                                {productAd.state}
                              </span>
                            </td>
                            <td className="table-cell">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditProductAd(index)}
                                  className="edit-button"
                                  title="Edit"
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
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleRemoveProductAd(index)}
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
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
          disabled={addedProductAds.length === 0 || loading}
          className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Creating..."
            : `Add All Product Ads${
                addedProductAds.length > 0 ? ` (${addedProductAds.length})` : ""
              }`}
        </button>
      </div>
    </div>
  );
};
