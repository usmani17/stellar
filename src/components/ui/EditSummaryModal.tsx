import React from "react";
import { Button } from "./Button";
import type { EditSummaryResult } from "../../utils/editSummary";

export interface EditSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Result from buildEditSummary (title, summary, details, variant). */
  result: EditSummaryResult | null;
}

/**
 * Generic confirmation popup showing a summary of what was done
 * after an inline or bulk edit on Amazon pages. Reusable across
 * Campaigns, AdGroups, Keywords, Targets, CampaignDetail.
 */
export const EditSummaryModal: React.FC<EditSummaryModalProps> = ({
  isOpen,
  onClose,
  result,
}) => {
  if (!isOpen || !result) return null;

  const { title, summary, details, variant } = result;
  const isPartial = variant === "partial";

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-[#E8E8E3]">
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isPartial ? "bg-amber-50" : "bg-green-50"
              }`}
            >
              {isPartial ? (
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
          </div>
          <h3 className="text-[20px] font-semibold text-[#072929] mb-3 text-center">
            {title}
          </h3>
          <p className="text-[14px] text-[#556179] whitespace-pre-wrap break-words text-center mb-4">
            {summary}
          </p>
          {details.length > 0 && (
            <div className="mb-4 border border-[#e8e8e3] rounded-lg bg-[#f9f9f6] overflow-hidden">
              <table className="w-full text-left">
                <tbody>
                  {details.map((d, i) => (
                    <tr
                      key={i}
                      className={
                        i !== details.length - 1
                          ? "border-b border-[#e8e8e3]"
                          : ""
                      }
                    >
                      <td className="py-2 px-3 text-[13px] font-medium text-[#0b0f16] w-1/3">
                        {d.label}
                      </td>
                      <td className="py-2 px-3 text-[13px] text-[#0b0f16]">
                        {d.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-center">
            <Button
              onClick={onClose}
              variant="primary"
              size="md"
              className="min-w-[120px] rounded-lg justify-center"
            >
              OK
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
