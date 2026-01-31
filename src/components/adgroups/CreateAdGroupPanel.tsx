import React, { useState, useEffect } from "react";
import { Dropdown } from "../ui/Dropdown";

export interface AdGroupInput {
  name: string;
  defaultBid?: number; // Optional - not used for SB campaigns
  state: "ENABLED" | "PAUSED" | "enabled" | "paused" | "archived"; // SD uses lowercase
  bidOptimization?: "reach" | "clicks" | "conversions"; // SD only
  creativeType?: "IMAGE" | "VIDEO" | null; // SD only
}

interface AdGroupError {
  index: number;
  field: keyof AdGroupInput;
  message: string;
}

interface CreatedAdGroup {
  adGroupId?: string;
  name: string;
  defaultBid: number;
  state: "ENABLED" | "PAUSED";
  index?: number;
}

interface FailedAdGroup {
  index: number;
  adgroup: AdGroupInput;
  errors: Array<{ field?: string; message: string }>;
}

interface CreateAdGroupPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (adgroups: AdGroupInput[]) => void;
  campaignId: string;
  campaignType?: string; // SP, SB, or SD
  loading?: boolean;
  submitError?: string | null;
  fieldErrors?: Record<string, string>;
  createdAdGroups?: CreatedAdGroup[];
  failedCount?: number;
  failedAdGroups?: FailedAdGroup[];
}

const STATE_OPTIONS_SP_SB = [
  { value: "ENABLED", label: "ENABLED" },
  { value: "PAUSED", label: "PAUSED" },
];

const STATE_OPTIONS_SD = [
  { value: "enabled", label: "enabled" },
  { value: "paused", label: "paused" },
  { value: "archived", label: "archived" },
];

const BID_OPTIMIZATION_OPTIONS = [
  { value: "clicks", label: "clicks" },
  { value: "conversions", label: "conversions" },
];

const CREATIVE_TYPE_OPTIONS = [
  { value: "IMAGE", label: "IMAGE" },
  { value: "VIDEO", label: "VIDEO" },
];

export const CreateAdGroupPanel: React.FC<CreateAdGroupPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  campaignId,
  campaignType = "SP",
  loading = false,
  submitError = null,
  fieldErrors = {},
  createdAdGroups = [],
  failedCount = 0,
  failedAdGroups = [],
}) => {
  // Generate default ad group name
  const generateDefaultAdGroupName = (type: string): string => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const milliseconds = String(now.getMilliseconds()).padStart(3, "0");

    const dateTime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}.${milliseconds}`;

    const typePrefix =
      type === "SP" ? "SP" : type === "SB" ? "SB" : type === "SD" ? "SD" : "SP";
    return `${typePrefix} Ad group - ${dateTime}`;
  };

  const [currentAdGroup, setCurrentAdGroup] = useState<AdGroupInput>({
    name: generateDefaultAdGroupName(campaignType),
    defaultBid: 0.1,
    state: campaignType === "SD" ? "enabled" : "ENABLED",
    ...(campaignType === "SD" && {
      bidOptimization: "clicks" as const,
      creativeType: "IMAGE" as const,
    }),
  });
  const [addedAdGroups, setAddedAdGroups] = useState<AdGroupInput[]>([]);
  const [errors, setErrors] = useState<
    Partial<Record<keyof AdGroupInput, string>>
  >({});
  const [adGroupErrors, setAdGroupErrors] = useState<AdGroupError[]>([]);

  // Update default name when panel opens or campaign type changes
  useEffect(() => {
    if (isOpen) {
      setCurrentAdGroup((prev) => ({
        ...prev,
        name: generateDefaultAdGroupName(campaignType),
        state: campaignType === "SD" ? "enabled" : "ENABLED",
        ...(campaignType === "SD" && {
          bidOptimization: prev.bidOptimization || "clicks",
          creativeType: prev.creativeType || "IMAGE",
        }),
        ...(campaignType !== "SD" && {
          bidOptimization: undefined,
          creativeType: undefined,
        }),
      }));
    }
  }, [isOpen, campaignType]);

  const handleChange = (field: keyof AdGroupInput, value: string | number) => {
    setCurrentAdGroup((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AdGroupInput, string>> = {};

    if (!currentAdGroup.name.trim()) {
      newErrors.name = "Ad Group name is required";
    }

    // Only validate defaultBid for SP and SD campaigns (not SB)
    if (
      campaignType !== "SB" &&
      (currentAdGroup.defaultBid === undefined ||
        currentAdGroup.defaultBid <= 0)
    ) {
      newErrors.defaultBid = "Default bid must be greater than 0";
    }

    // Validate bidOptimization for SD campaigns
    if (campaignType === "SD" && !currentAdGroup.bidOptimization) {
      newErrors.bidOptimization =
        "Bid optimization is required for SD campaigns";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddAdGroup = () => {
    if (!validate()) {
      return;
    }

    // Add adgroup to the list
    setAddedAdGroups((prev) => [...prev, { ...currentAdGroup }]);

    // Reset form for next adgroup
    setCurrentAdGroup({
      name: generateDefaultAdGroupName(campaignType),
      defaultBid: 0.1,
      state: campaignType === "SD" ? "enabled" : "ENABLED",
      ...(campaignType === "SD" && {
        bidOptimization: "clicks" as const,
        creativeType: "IMAGE" as const,
      }),
    });
    setErrors({});
  };

  const handleRemoveAdGroup = (index: number) => {
    setAddedAdGroups((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (addedAdGroups.length === 0) {
      alert("Please add at least one ad group before submitting.");
      return;
    }

    // Clear previous errors
    setAdGroupErrors([]);
    onSubmit(addedAdGroups);
    // Don't reset adgroups here - let parent handle success/error
  };

  // Compute adjusted error indices based on created adgroups
  // This needs to be computed synchronously for rendering
  const getAdjustedErrorIndex = (originalIndex: number): number => {
    if (createdAdGroups.length === 0) return originalIndex;
    const createdIndices = new Set(
      createdAdGroups
        .map((cag) => cag.index)
        .filter((idx) => idx !== undefined && idx !== null)
    );
    const removedBefore = Array.from(createdIndices).filter(
      (idx) => idx < originalIndex
    ).length;
    return originalIndex - removedBefore;
  };

  // Process failed adgroups and field errors - adjust indices immediately
  useEffect(() => {
    const newAdGroupErrors: AdGroupError[] = [];

    // Process failed adgroups - use index from backend response and adjust immediately
    if (failedAdGroups && failedAdGroups.length > 0) {
      failedAdGroups.forEach((failedAdGroup) => {
        // Use the index from the backend response directly
        const originalIndex = failedAdGroup.index;

        // Only process if index is valid
        if (originalIndex !== undefined && originalIndex !== null) {
          // Adjust the index based on created adgroups
          const adjustedIndex = getAdjustedErrorIndex(originalIndex);

          // Map errors to the adgroup at this adjusted index
          if (failedAdGroup.errors && failedAdGroup.errors.length > 0) {
            failedAdGroup.errors.forEach((error) => {
              // Map error field to AdGroupInput field
              let field: keyof AdGroupInput = "name"; // Default
              if (error.field) {
                // Map Amazon API field names to frontend field names
                const fieldMap: Record<string, keyof AdGroupInput> = {
                  name: "name",
                  defaultBid: "defaultBid",
                  state: "state",
                };
                field =
                  fieldMap[error.field] || (error.field as keyof AdGroupInput);
              }

              // Check if error already exists for this index+field to avoid duplicates
              const exists = newAdGroupErrors.some(
                (e) => e.index === adjustedIndex && e.field === field
              );
              if (!exists) {
                newAdGroupErrors.push({
                  index: adjustedIndex,
                  field,
                  message: error.message,
                });
              }
            });
          } else {
            // If no specific errors, add a generic error to ensure the row is marked
            const exists = newAdGroupErrors.some(
              (e) => e.index === adjustedIndex && e.field === "name"
            );
            if (!exists) {
              newAdGroupErrors.push({
                index: adjustedIndex,
                field: "name",
                message: "Failed to create ad group",
              });
            }
          }
        }
      });
    }

    // Process field errors (format: "field_$index") - adjust indices immediately
    Object.entries(fieldErrors).forEach(([key, message]) => {
      const match = key.match(/^(.+)_\$(\d+)$/);
      if (match) {
        const [, fieldName, indexStr] = match;
        const originalIndex = parseInt(indexStr, 10);
        if (!isNaN(originalIndex)) {
          // Adjust the index based on created adgroups
          const adjustedIndex = getAdjustedErrorIndex(originalIndex);

          // Map field name to AdGroupInput field
          const fieldMap: Record<string, keyof AdGroupInput> = {
            name: "name",
            defaultBid: "defaultBid",
            state: "state",
          };
          const field =
            fieldMap[fieldName] || (fieldName as keyof AdGroupInput);

          // Check if error already exists for this index+field
          const exists = newAdGroupErrors.some(
            (e) => e.index === adjustedIndex && e.field === field
          );
          if (!exists) {
            newAdGroupErrors.push({
              index: adjustedIndex,
              field,
              message,
            });
          }
        }
      }
    });

    setAdGroupErrors(newAdGroupErrors);
  }, [failedAdGroups, fieldErrors, createdAdGroups]);

  // Handle successful adgroups - remove them from the list using index
  useEffect(() => {
    if (createdAdGroups && createdAdGroups.length > 0) {
      const createdIndices = new Set(
        createdAdGroups
          .map((cag) => cag.index)
          .filter((idx) => idx !== undefined && idx !== null)
      );

      // Remove adgroups at the indices that were successfully created
      setAddedAdGroups((prev) => {
        return prev.filter((_, index) => !createdIndices.has(index));
      });
    }
  }, [createdAdGroups]);

  const handleCancel = () => {
    setAddedAdGroups([]);
    setCurrentAdGroup({
      name: generateDefaultAdGroupName(campaignType),
      defaultBid: 0.1,
      state: campaignType === "SD" ? "enabled" : "ENABLED",
      ...(campaignType === "SD" && {
        bidOptimization: "clicks" as const,
        creativeType: "IMAGE" as const,
      }),
    });
    setErrors({});
    setAdGroupErrors([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="create-panel">
      {/* Form */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
          Create Ad Groups
        </h2>

        {/* Single line inputs - all fields inline */}
        <div className="flex items-end gap-3">
          {/* Ad Group Name */}
          <div className="flex-1 min-w-[200px]">
            <label className="form-label-small">
              Ad Group Name *
            </label>
            <input
              type="text"
              value={currentAdGroup.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter ad group name"
              className={`campaign-input bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                errors.name ? "border-red-500" : "border-gray-200"
              }`}
            />
            {errors.name && (
              <p className="text-[10px] text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Default Bid - Only show for SP and SD campaigns */}
          {campaignType !== "SB" && (
            <div className="flex-1 min-w-[140px]">
              <label className="form-label-small">
                Default Bid *
              </label>
              <input
                type="number"
                value={currentAdGroup.defaultBid || ""}
                onChange={(e) =>
                  handleChange("defaultBid", parseFloat(e.target.value) || 0)
                }
                placeholder="0.10"
                min="0"
                step="0.01"
                className={`campaign-input bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                  errors.defaultBid ? "border-red-500" : "border-gray-200"
                }`}
              />
              {errors.defaultBid && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.defaultBid}
                </p>
              )}
            </div>
          )}

          {/* State */}
          <div className="flex-1 min-w-[140px]">
            <label className="form-label-small">
              State *
            </label>
            <Dropdown<string>
              options={
                campaignType === "SD" ? STATE_OPTIONS_SD : STATE_OPTIONS_SP_SB
              }
              value={currentAdGroup.state}
              onChange={(value) =>
                handleChange("state", value as AdGroupInput["state"])
              }
              placeholder="Select state"
              buttonClassName="edit-button w-full"
            />
          </div>

          {/* Bid Optimization - Only for SD campaigns */}
          {campaignType === "SD" && (
            <div className="flex-1 min-w-[160px]">
              <label className="form-label-small">
                Bid Optimization *
              </label>
              <Dropdown<string>
                options={BID_OPTIMIZATION_OPTIONS}
                value={currentAdGroup.bidOptimization || "clicks"}
                onChange={(value) =>
                  handleChange(
                    "bidOptimization",
                    value as "reach" | "clicks" | "conversions"
                  )
                }
                placeholder="Select bid optimization"
                buttonClassName="edit-button w-full"
              />
              {errors.bidOptimization && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.bidOptimization}
                </p>
              )}
            </div>
          )}

          {/* Creative Type - Only for SD campaigns */}
          {campaignType === "SD" && (
            <div className="flex-1 min-w-[140px]">
              <label className="form-label-small">
                Creative Type
              </label>
              <Dropdown<string>
                options={CREATIVE_TYPE_OPTIONS}
                value={currentAdGroup.creativeType || "IMAGE"}
                onChange={(value) => {
                  handleChange("creativeType", value as "IMAGE" | "VIDEO");
                }}
                placeholder="Select creative type"
                buttonClassName="w-full edit-button"
              />
            </div>
          )}

          {/* Add Ad Group Button - Inline for all campaign types */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAddAdGroup}
              className="create-entity-button"
            >
              Add 
            </button>
          </div>
        </div>
      </div>

      {/* Ad Groups Table */}
      {addedAdGroups.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
            Added Ad Groups ({addedAdGroups.length})
          </h3>
          <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[#e8e8e3]">
                    <th className="table-header">Ad Group Name</th>
                    {campaignType !== "SB" && (
                      <th className="table-header">Default Bid</th>
                    )}
                    <th className="table-header">State</th>
                    {campaignType === "SD" && (
                      <>
                        <th className="table-header">Bid Optimization</th>
                        <th className="table-header">Creative Type</th>
                      </>
                    )}
                    <th className="table-header">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {addedAdGroups.map((adgroup, index) => {
                    const isLastRow = index === addedAdGroups.length - 1;
                    // Check if this adgroup has errors
                    const adGroupRowErrors = adGroupErrors.filter(
                      (e) => e.index === index
                    );
                    const hasErrors = adGroupRowErrors.length > 0;

                    // Check if this adgroup failed by comparing with adjusted indices
                    const isFailedAdGroup = failedAdGroups.some((fag) => {
                      if (fag.index === undefined || fag.index === null)
                        return false;
                      // Get the adjusted index for this failed adgroup
                      const adjustedFailedIndex = getAdjustedErrorIndex(
                        fag.index
                      );
                      return adjustedFailedIndex === index;
                    });

                    // If an adgroup failed but has no specific errors, we should still mark it
                    // This handles cases where the backend reports a failure but no specific error message
                    const shouldHighlight = hasErrors || isFailedAdGroup;

                    return (
                      <tr
                        key={index}
                        className={`${
                          !isLastRow ? "border-b border-[#e8e8e3]" : ""
                        } ${
                          shouldHighlight ? "bg-red-50" : ""
                        } hover:bg-gray-50 transition-colors`}
                      >
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="table-text leading-[1.26]">
                              {adgroup.name}
                            </span>
                            {adGroupRowErrors
                              .filter((e) => e.field === "name")
                              .map((e, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] text-red-500 mt-1"
                                >
                                  {e.message}
                                </span>
                              ))}
                          </div>
                        </td>
                        {campaignType !== "SB" && (
                          <td className="table-cell">
                            <div className="flex flex-col">
                              <span className="table-text leading-[1.26]">
                                ${(adgroup.defaultBid || 0).toFixed(2)}
                              </span>
                              {adGroupRowErrors
                                .filter((e) => e.field === "defaultBid")
                                .map((e, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] text-red-500 mt-1"
                                  >
                                    {e.message}
                                  </span>
                                ))}
                            </div>
                          </td>
                        )}
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="table-text leading-[1.26]">
                              {adgroup.state}
                            </span>
                            {adGroupRowErrors
                              .filter((e) => e.field === "state")
                              .map((e, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] text-red-500 mt-1"
                                >
                                  {e.message}
                                </span>
                              ))}
                          </div>
                        </td>
                        {campaignType === "SD" && (
                          <>
                            <td className="table-cell">
                              <span className="table-text leading-[1.26]">
                                {adgroup.bidOptimization || "clicks"}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="table-text leading-[1.26]">
                                {adgroup.creativeType || "IMAGE (default)"}
                              </span>
                            </td>
                          </>
                        )}
                        <td className="table-cell">
                          <button
                            type="button"
                            onClick={() => handleRemoveAdGroup(index)}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Error Summary */}
      {submitError && (
        <div className="p-4 border-b border-gray-200 bg-red-50">
          <p className="text-[13.3px] text-red-600">{submitError}</p>
          {createdAdGroups.length > 0 && failedCount > 0 && (
            <p className="text-[12px] text-red-600 mt-1">
              {createdAdGroups.length} ad group(s) created successfully.{" "}
              {failedCount} ad group(s) failed.
            </p>
          )}
        </div>
      )}

      {/* Success Summary */}
      {createdAdGroups.length > 0 && failedCount === 0 && (
        <div className="p-4 border-b border-gray-200 bg-green-50">
          <p className="text-[13.3px] text-green-600">
            {createdAdGroups.length} ad group(s) created successfully!
          </p>
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
          disabled={addedAdGroups.length === 0 || loading}
          className="create-entity-button"
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
              Creating...
            </>
          ) : (
            "Create AdGroups"
          )}
        </button>
      </div>
    </div>
  );
};
