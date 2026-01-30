import { useState, useCallback } from "react";
import { buildEditSummary, type EditSummaryOptions, type EditSummaryResult } from "../utils/editSummary";
import { EditSummaryModal } from "../components/ui/EditSummaryModal";

export interface UseEditSummaryModalReturn {
  showEditSummary: (options: EditSummaryOptions) => void;
  EditSummaryModal: React.FC;
}

/**
 * Reusable hook for showing a confirmation popup with summary
 * after inline or bulk edits on Amazon pages.
 */
export function useEditSummaryModal(): UseEditSummaryModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<EditSummaryResult | null>(null);

  const showEditSummary = useCallback((options: EditSummaryOptions) => {
    setResult(buildEditSummary(options));
    setIsOpen(true);
  }, []);

  const Modal = useCallback(
    () => (
      <EditSummaryModal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setResult(null);
        }}
        result={result}
      />
    ),
    [isOpen, result]
  );

  return { showEditSummary, EditSummaryModal: Modal };
}
