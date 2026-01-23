import React, { useState } from "react";
import { Dropdown } from "../ui/Dropdown";

export interface ProductAdInput {
  adGroupId: string;
  asin?: string;
  sku?: string;
  customText?: string;
  catalogSourceCountryCode?: string;
  state: "ENABLED" | "PAUSED" | "enabled" | "paused" | "archived";
  // SD-specific fields
  landingPageURL?: string;
  landingPageType?: "STORE" | "MOMENT" | "OFF_AMAZON_LINK";
  adName?: string;
}

interface CreateProductAdPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (productAds: ProductAdInput[]) => void;
  adgroups: Array<{ adGroupId: string; name: string }>;
  campaignId: string;
  loading?: boolean;
  campaignType?: string; // SP, SB, or SD
}

const STATE_OPTIONS = [
  { value: "ENABLED", label: "ENABLED" },
  { value: "PAUSED", label: "PAUSED" },
];

const SD_STATE_OPTIONS = [
  { value: "enabled", label: "Enabled" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
];

export const CreateProductAdPanel: React.FC<CreateProductAdPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  adgroups,
  campaignId,
  loading = false,
  campaignType = "SP",
}) => {
  // For SD campaigns, track which type is selected (sku, asin, or off-amazon)
  const [sdProductType, setSdProductType] = useState<
    "sku" | "asin" | "off-amazon"
  >("sku");
  const [currentProductAd, setCurrentProductAd] = useState<ProductAdInput>({
    adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
    asin: "",
    sku: "",
    customText: "",
    catalogSourceCountryCode: "",
    state: campaignType === "SD" ? "enabled" : "ENABLED",
    landingPageURL: "",
    landingPageType: "OFF_AMAZON_LINK",
    adName: "",
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

    if (campaignType === "SD") {
      // For SD, validate that exactly one type is provided
      const hasSku = !!(currentProductAd.sku && currentProductAd.sku.trim());
      const hasAsin = !!(currentProductAd.asin && currentProductAd.asin.trim());
      const hasLandingPage = !!(
        currentProductAd.landingPageURL &&
        currentProductAd.landingPageURL.trim()
      );

      const typeCount = [hasSku, hasAsin, hasLandingPage].filter(
        Boolean
      ).length;

      if (typeCount === 0) {
        newErrors.sku = "Must provide either SKU, ASIN, or Landing Page URL";
        newErrors.asin = "Must provide either SKU, ASIN, or Landing Page URL";
        newErrors.landingPageURL =
          "Must provide either SKU, ASIN, or Landing Page URL";
      } else if (typeCount > 1) {
        newErrors.sku =
          "Can only provide one of SKU, ASIN, or Landing Page URL";
        newErrors.asin =
          "Can only provide one of SKU, ASIN, or Landing Page URL";
        newErrors.landingPageURL =
          "Can only provide one of SKU, ASIN, or Landing Page URL";
      } else {
        // Validate specific type requirements
        if (hasLandingPage && !currentProductAd.adName?.trim()) {
          newErrors.adName = "Ad Name is required when using Landing Page URL";
        }
      }
    } else {
      // For SP/SB, ASIN is required
      if (!currentProductAd.asin?.trim()) {
        newErrors.asin = "ASIN is required";
      }
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
      state: campaignType === "SD" ? "enabled" : "ENABLED",
      landingPageURL: "",
      landingPageType: "OFF_AMAZON_LINK",
      adName: "",
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
      state: campaignType === "SD" ? "enabled" : "ENABLED",
      landingPageURL: "",
      landingPageType: "OFF_AMAZON_LINK",
      adName: "",
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
      state: campaignType === "SD" ? "enabled" : "ENABLED",
      landingPageURL: "",
      landingPageType: "OFF_AMAZON_LINK",
      adName: "",
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="create-panel">
      {/* Form */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
          Create Product Ads
        </h2>

        <div className="space-y-4">
          {/* For SD campaigns, show type selector as dropdown */}
          {campaignType === "SD" && (
            <div>
              <label className="form-label-small">
                Product Type *
              </label>
              <Dropdown<string>
                options={[
                  { value: "sku", label: "SKU" },
                  { value: "asin", label: "ASIN" },
                  { value: "off-amazon", label: "Off-Amazon" },
                ]}
                value={sdProductType}
                onChange={(value) => {
                  setSdProductType(value as "sku" | "asin" | "off-amazon");
                  // Clear other fields when switching
                  if (value === "sku") {
                    setCurrentProductAd((prev) => ({
                      ...prev,
                      asin: "",
                      landingPageURL: "",
                      landingPageType: "OFF_AMAZON_LINK",
                      adName: "",
                    }));
                  } else if (value === "asin") {
                    setCurrentProductAd((prev) => ({
                      ...prev,
                      sku: "",
                      landingPageURL: "",
                      landingPageType: "OFF_AMAZON_LINK",
                      adName: "",
                    }));
                  } else if (value === "off-amazon") {
                    setCurrentProductAd((prev) => ({
                      ...prev,
                      sku: "",
                      asin: "",
                    }));
                  }
                }}
                placeholder="Select product type"
                buttonClassName="edit-button w-full"
              />
            </div>
          )}

          {/* Single line inputs */}
          <div className="flex items-end gap-3">
            {/* Ad Group Dropdown */}
            <div className="flex-1 min-w-[180px] w-full">
              <label className="form-label-small">
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
                buttonClassName="edit-button w-full"
              />
              {errors.adGroupId && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.adGroupId}
                </p>
              )}
            </div>

            {/* SKU Input - Show for SP or SD (when SKU type selected) */}
            {(campaignType !== "SD" || sdProductType === "sku") && (
              <div className="flex-1 min-w-[150px]">
                <label className="form-label-small">
                  {campaignType === "SD" ? "SKU *" : "SKU"}
                </label>
                <input
                  type="text"
                  value={currentProductAd.sku || ""}
                  onChange={(e) => handleChange("sku", e.target.value)}
                  className="w-full campaign-input px-3 py-2 border border-[#e8e8e3] rounded-lg table-text focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-transparent"
                  placeholder={
                    campaignType === "SD" ? "Enter SKU" : "Enter SKU (optional)"
                  }
                />
                {errors.sku && (
                  <p className="text-[10px] text-red-500 mt-1">{errors.sku}</p>
                )}
              </div>
            )}

            {/* ASIN Input - Show for SP/SB or SD (when ASIN type selected) */}
            {(campaignType !== "SD" || sdProductType === "asin") && (
              <div className="flex-1 min-w-[150px]">
                <label className="form-label-small">
                  ASIN {campaignType !== "SD" ? "*" : "*"}
                </label>
                <input
                  type="text"
                  value={currentProductAd.asin || ""}
                  onChange={(e) => handleChange("asin", e.target.value)}
                  className="w-full campaign-input px-3 py-2 border border-[#e8e8e3] rounded-lg table-text focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-transparent"
                  placeholder="Enter ASIN"
                />
                {errors.asin && (
                  <p className="text-[10px] text-red-500 mt-1">{errors.asin}</p>
                )}
              </div>
            )}

            {/* Off-Amazon fields - Show only for SD when off-amazon type selected */}
            {campaignType === "SD" && sdProductType === "off-amazon" && (
              <>
                <div className="flex-1 min-w-[200px]">
                  <label className="form-label-small">
                    Landing Page URL *
                  </label>
                  <input
                    type="url"
                    value={currentProductAd.landingPageURL || ""}
                    onChange={(e) =>
                      handleChange("landingPageURL", e.target.value)
                    }
                    className="w-full campaign-input px-3 py-2 border border-[#e8e8e3] rounded-lg table-text focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-transparent"
                    placeholder="https://example.com"
                  />
                  {errors.landingPageURL && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.landingPageURL}
                    </p>
                  )}
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="form-label-small">
                    Landing Page Type
                  </label>
                  <Dropdown<string>
                    options={[
                      { value: "STORE", label: "STORE" },
                      { value: "MOMENT", label: "MOMENT" },
                      { value: "OFF_AMAZON_LINK", label: "OFF_AMAZON_LINK" },
                    ]}
                    value={
                      currentProductAd.landingPageType || "OFF_AMAZON_LINK"
                    }
                    onChange={(value) => handleChange("landingPageType", value)}
                    placeholder="Select type"
                    buttonClassName="edit-button w-full"
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="form-label-small">
                    Ad Name *
                  </label>
                  <input
                    type="text"
                    value={currentProductAd.adName || ""}
                    onChange={(e) => handleChange("adName", e.target.value)}
                    className="w-full campaign-input px-3 py-2 border border-[#e8e8e3] rounded-lg table-text focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-transparent"
                    placeholder="Enter ad name"
                  />
                  {errors.adName && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.adName}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Custom Text Input - Only for SP/SB */}
            {campaignType !== "SD" && (
              <div className="flex-1 min-w-[200px]">
                <label className="form-label-small">
                  Custom Text
                </label>
                <input
                  type="text"
                  value={currentProductAd.customText || ""}
                  onChange={(e) => handleChange("customText", e.target.value)}
                  maxLength={150}
                  className="w-full campaign-input px-3 py-2 border border-[#e8e8e3] rounded-lg table-text focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-transparent"
                  placeholder="Enter custom text (optional, max 150 chars)"
                />
                {errors.customText && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.customText}
                  </p>
                )}
              </div>
            )}

            {/* Catalog Source Country Code - Only for SP/SB */}
            {campaignType !== "SD" && (
              <div className="flex-1 min-w-[150px]">
                <label className="form-label-small">
                  Country Code
                </label>
                <input
                  type="text"
                  value={currentProductAd.catalogSourceCountryCode || ""}
                  onChange={(e) =>
                    handleChange("catalogSourceCountryCode", e.target.value)
                  }
                  className="w-full campaign-input px-3 py-2 border border-[#e8e8e3] rounded-lg table-text focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-transparent"
                  placeholder="e.g., US (optional)"
                  maxLength={2}
                />
              </div>
            )}

            {/* State Dropdown */}
            <div className="flex-1 min-w-[120px] w-full">
              <label className="form-label-small">
                State *
              </label>
              <Dropdown<string>
                options={
                  campaignType === "SD" ? SD_STATE_OPTIONS : STATE_OPTIONS
                }
                value={currentProductAd.state}
                onChange={(value) => handleChange("state", value as any)}
                placeholder="Select state"
                buttonClassName="edit-button w-full"
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
                        <th className="table-header">Ad Group</th>
                        {campaignType === "SD" ? (
                          <>
                            <th className="table-header">SKU</th>
                            <th className="table-header">ASIN</th>
                            <th className="table-header">Landing Page URL</th>
                            <th className="table-header">Ad Name</th>
                          </>
                        ) : (
                          <>
                            <th className="table-header">ASIN</th>
                            <th className="table-header">SKU</th>
                            <th className="table-header">Custom Text</th>
                            <th className="table-header">Country Code</th>
                          </>
                        )}
                        <th className="table-header">State</th>
                        <th className="table-header">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {addedProductAds.map((productAd, index) => {
                        const adGroupName =
                          adgroups.find(
                            (ag) => ag.adGroupId === productAd.adGroupId
                          )?.name || productAd.adGroupId;
                        return (
                          <tr key={index} className="table-row group">
                            <td className="table-cell">
                              <span className="table-text leading-[1.26]">
                                {adGroupName}
                              </span>
                            </td>
                            {campaignType === "SD" ? (
                              <>
                                <td className="table-cell">
                                  <span className="table-text leading-[1.26]">
                                    {productAd.sku || "—"}
                                  </span>
                                </td>
                                <td className="table-cell">
                                  <span className="table-text leading-[1.26]">
                                    {productAd.asin || "—"}
                                  </span>
                                </td>
                                <td className="table-cell">
                                  <span className="table-text leading-[1.26]">
                                    {productAd.landingPageURL || "—"}
                                  </span>
                                </td>
                                <td className="table-cell">
                                  <span className="table-text leading-[1.26]">
                                    {productAd.adName || "—"}
                                  </span>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="table-cell">
                                  <span className="table-text leading-[1.26]">
                                    {productAd.asin || "—"}
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
                              </>
                            )}
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
          className="cancel-button"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={addedProductAds.length === 0 || loading}
          className="create-entity-button"
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
