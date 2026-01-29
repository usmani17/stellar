import React from "react";
import { Loader } from "../../../components/ui/Loader";

export interface BulkUpdatePreviewRow {
  name: string;
  oldValue: string;
  newValue: string;
}

export interface BulkUpdateResults {
  updated: number;
  failed: number;
  errors: Array<string | Record<string, unknown>>;
}

export interface BulkUpdateActionDetails {
  type: "value";
  action: "increase" | "decrease" | "set";
  unit: "percent" | "amount";
  value: string;
  upperLimit?: string;
  lowerLimit?: string;
}

export interface BulkUpdateStatusDetails {
  type: "status";
  newStatus: string;
}

export type BulkUpdateActionDetailsUnion =
  | BulkUpdateActionDetails
  | BulkUpdateStatusDetails;

export interface BulkUpdateConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Entity label for copy: "campaign" | "ad group" | "keyword" etc. */
  entityLabel: string;
  /** Column header for name: "Campaign Name" | "Ad Group Name" etc. */
  entityNameColumn: string;
  selectedCount: number;
  /** Null = pre-confirm view, set = results view */
  bulkUpdateResults: BulkUpdateResults | null;
  /** True for budget/bid change, false for status change */
  isValueChange: boolean;
  /** "Budget" | "Bid" etc. */
  valueChangeLabel: string;
  /** Full list of rows to show (no slice - show entire list) */
  previewRows: BulkUpdatePreviewRow[];
  /** Action summary when pre-confirm (value change or new status) */
  actionDetails: BulkUpdateActionDetailsUnion | null;
  loading: boolean;
  loadingMessage: string;
  successMessage: string;
  onConfirm: () => void | Promise<void>;
  /** Optional: custom render for error items (e.g. object with campaign_id, error) */
  renderError?: (error: string | Record<string, unknown>, index: number) => React.ReactNode;
}

function defaultRenderError(error: string | Record<string, unknown>): React.ReactNode {
  if (typeof error === "string") return error;
  const obj = error as { campaign_id?: string; error?: string; updated_fields?: string[] };
  return (
    <>
      {obj.campaign_id != null && (
        <span className="font-semibold">Campaign {obj.campaign_id}: </span>
      )}
      <span>{obj.error ?? JSON.stringify(error)}</span>
      {obj.updated_fields && obj.updated_fields.length > 0 && (
        <div className="text-[10.4px] text-forest-f60 mt-1 ml-4">
          ✓ Successfully updated: {obj.updated_fields.join(", ")}
        </div>
      )}
    </>
  );
}

export const BulkUpdateConfirmationModal: React.FC<
  BulkUpdateConfirmationModalProps
> = ({
  isOpen,
  onClose,
  entityLabel,
  entityNameColumn,
  selectedCount,
  bulkUpdateResults,
  isValueChange,
  valueChangeLabel,
  previewRows,
  actionDetails,
  loading,
  loadingMessage,
  successMessage,
  onConfirm,
  renderError,
}) => {
  if (!isOpen) return null;

  const pluralEntity = `${entityLabel}s`;
  const isResultsView = bulkUpdateResults !== null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto relative">
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-xl">
            <Loader size="md" message={loadingMessage} />
          </div>
        )}
        <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
          {isResultsView
            ? "Update Results"
            : isValueChange
            ? `Confirm ${valueChangeLabel} Changes`
            : "Confirm Status Changes"}
        </h3>

        {/* Results Summary */}
        {isResultsView ? (
          <div className="mb-6">
            <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12.16px] text-[#556179]">
                  Update Summary:
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-forest-f40" />
                  <span className="text-[12.16px] text-[#556179]">
                    Successfully updated:
                  </span>
                  <span className="text-[12.16px] font-semibold text-forest-f40">
                    {bulkUpdateResults.updated}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-r40" />
                  <span className="text-[12.16px] text-[#556179]">Failed:</span>
                  <span className="text-[12.16px] font-semibold text-red-r40">
                    {bulkUpdateResults.failed}
                  </span>
                </div>
              </div>
            </div>

            {bulkUpdateResults.errors.length > 0 && (
              <div className="bg-red-r0 border border-red-r20 rounded-lg p-4 mb-4">
                <div className="text-[12.16px] font-semibold text-red-r40 mb-2">
                  Errors ({bulkUpdateResults.errors.length}):
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <ul className="list-disc list-inside space-y-1">
                    {bulkUpdateResults.errors.map((error, index) => (
                      <li
                        key={index}
                        className="text-[11.2px] text-red-r40 mb-2"
                      >
                        {renderError
                          ? renderError(error, index)
                          : defaultRenderError(
                              typeof error === "string" ? error : (error as Record<string, unknown>)
                            )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {bulkUpdateResults.failed === 0 &&
              bulkUpdateResults.updated > 0 && (
                <div className="bg-forest-f0 border border-forest-f40 rounded-lg p-4 mb-4">
                  <div className="text-[12.16px] font-semibold text-forest-f60">
                    ✓ {successMessage}
                  </div>
                </div>
              )}
          </div>
        ) : (
          /* Pre-confirm: summary + full table + action details */
          <>
            <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[12.16px] text-[#556179]">
                  {selectedCount} {selectedCount !== 1 ? pluralEntity : entityLabel}{" "}
                  will be updated:
                </span>
                <span className="text-[12.16px] font-semibold text-[#072929]">
                  {isValueChange ? valueChangeLabel : "Status"} change
                </span>
              </div>
            </div>

            {/* Full preview table - entire list, scrollable */}
            <div className="mb-6">
              <div className="mb-2">
                <span className="text-[10.64px] text-[#556179]">
                  {previewRows.length} {previewRows.length !== 1 ? pluralEntity : entityLabel} selected
                </span>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[280px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-sandstorm-s20 sticky top-0 z-[1]">
                    <tr>
                      <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                        {entityNameColumn}
                      </th>
                      <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                        Old Value
                      </th>
                      <th className="text-left px-4 py-2 text-[10.64px] font-semibold text-[#556179] uppercase">
                        New Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-gray-200 last:border-b-0"
                      >
                        <td className="px-4 py-2 text-[10.64px] text-[#072929]">
                          {row.name}
                        </td>
                        <td className="px-4 py-2 text-[10.64px] text-[#556179]">
                          {row.oldValue}
                        </td>
                        <td className="px-4 py-2 text-[10.64px] font-semibold text-[#072929]">
                          {row.newValue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Details */}
            {actionDetails && (
              <div className="space-y-3 mb-6">
                {actionDetails.type === "value" ? (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-[12.16px] text-[#556179]">
                        Action:
                      </span>
                      <span className="text-[12.16px] font-semibold text-[#072929]">
                        {actionDetails.action === "increase"
                          ? "Increase By"
                          : actionDetails.action === "decrease"
                          ? "Decrease By"
                          : "Set To"}
                      </span>
                    </div>
                    {(actionDetails.action === "increase" ||
                      actionDetails.action === "decrease") && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-[12.16px] text-[#556179]">
                          Unit:
                        </span>
                        <span className="text-[12.16px] font-semibold text-[#072929]">
                          {actionDetails.unit === "percent"
                            ? "Percentage (%)"
                            : "Amount ($)"}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-[12.16px] text-[#556179]">
                        Value:
                      </span>
                      <span className="text-[12.16px] font-semibold text-[#072929]">
                        {actionDetails.value}{" "}
                        {actionDetails.unit === "percent" ? "%" : "$"}
                      </span>
                    </div>
                    {actionDetails.action === "increase" &&
                      actionDetails.upperLimit && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-[12.16px] text-[#556179]">
                            Upper Limit:
                          </span>
                          <span className="text-[12.16px] font-semibold text-[#072929]">
                            ${actionDetails.upperLimit}
                          </span>
                        </div>
                      )}
                    {actionDetails.action === "decrease" &&
                      actionDetails.lowerLimit && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-[12.16px] text-[#556179]">
                            Lower Limit:
                          </span>
                          <span className="text-[12.16px] font-semibold text-[#072929]">
                            ${actionDetails.lowerLimit}
                          </span>
                        </div>
                      )}
                  </>
                ) : (
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-[12.16px] text-[#556179]">
                      New Status:
                    </span>
                    <span className="text-[12.16px] font-semibold text-[#072929]">
                      {actionDetails.newStatus
                        ? actionDetails.newStatus.charAt(0) +
                          actionDetails.newStatus.slice(1).toLowerCase()
                        : ""}
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-3">
          {isResultsView ? (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors"
            >
              Close
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="cancel-button"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="create-entity-button btn-sm"
              >
                {loading ? "Updating..." : "Confirm"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
