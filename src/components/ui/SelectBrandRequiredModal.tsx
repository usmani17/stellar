import React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

interface SelectBrandRequiredModalProps {
  isOpen: boolean;
  onClose?: () => void;
  returnUrl?: string;
}

/**
 * Modal shown when user tries to access Integrations, Profiles, or Users
 * without selecting a brand. Forces user to go to Brands page first.
 * Cannot be dismissed by clicking outside - user must click "Go to Brands".
 */
export const SelectBrandRequiredModal: React.FC<SelectBrandRequiredModalProps> = ({
  isOpen,
  onClose,
  returnUrl,
}) => {
  const navigate = useNavigate();

  const handleGoToBrands = () => {
    const url = returnUrl
      ? `/brands?returnUrl=${encodeURIComponent(returnUrl)}`
      : "/brands";
    navigate(url);
    onClose?.();
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
      onClick={(e) => {
        // Do not close on overlay click - force user to select a brand
        e.stopPropagation();
      }}
    >
      <div
        className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#136D6D]/10 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-[#136D6D]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-[17.1px] font-semibold text-[#072929]">
              Select a brand first
            </h3>
            <p className="text-[14px] text-[#556179] mt-1">
              Please select a brand before accessing Integrations, Profiles, or Users.
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleGoToBrands}
            className="px-4 py-2 text-[12.16px] text-white rounded-lg bg-[#136D6D] hover:bg-[#0f5a5a] transition-colors"
          >
            Go to Brands
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
