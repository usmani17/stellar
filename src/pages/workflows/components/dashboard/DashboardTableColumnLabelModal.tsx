import React, { useState, useEffect } from "react";
import { BaseModal } from "../../../../components/ui";
import { useDashboardTheme } from "../../contexts/DashboardThemeContext";
import { cn } from "../../../../lib/cn";

interface DashboardTableColumnLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (columnKey: string, newLabel: string) => void;
  columnKey: string;
  currentLabel: string;
}

const LABEL_ALLOWED_PATTERN = /^[a-zA-Z0-9_\-\s]+$/;

export const DashboardTableColumnLabelModal: React.FC<DashboardTableColumnLabelModalProps> = ({
  isOpen,
  onClose,
  onSave,
  columnKey,
  currentLabel,
}) => {
  const { isDark } = useDashboardTheme();
  const [label, setLabel] = useState(currentLabel);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLabel(currentLabel);
      setError(null);
    }
  }, [isOpen, currentLabel]);

  const handleSave = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setError("Label is required");
      return;
    }
    if (!LABEL_ALLOWED_PATTERN.test(trimmed)) {
      setError("Use only letters, numbers, spaces, hyphens, and underscores");
      return;
    }
    if (trimmed === currentLabel) {
      onClose();
      return;
    }
    setError(null);
    onSave(columnKey, trimmed);
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="md" maxWidth="max-w-md">
      <div className={cn(isDark ? "text-neutral-100" : "text-forest-f60")}>
        <h2 className="text-lg font-semibold mb-4">Rename column</h2>
        <div className="flex flex-col gap-2">
          <label className="block text-sm font-medium">Column label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") onClose();
            }}
            placeholder="e.g. Cost per Click"
            className={cn(
              "w-full px-3 py-2 rounded border text-sm outline-none",
              isDark
                ? "bg-neutral-700 border-neutral-600 placeholder:text-neutral-500 focus:border-[#2DD4BF]/60"
                : "bg-sandstorm-s5 border-sandstorm-s40 placeholder:text-forest-f30 focus:border-forest-f40"
            )}
            aria-label="Column label"
          />
          {error && (
            <p className={cn("text-xs", isDark ? "text-red-400" : "text-red-r30")}>{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "px-4 py-2 rounded text-sm font-medium border transition-colors",
              isDark
                ? "border-neutral-600 hover:bg-neutral-700"
                : "border-sandstorm-s40 hover:bg-sandstorm-s20"
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={cn(
              "px-4 py-2 rounded text-sm font-medium border transition-colors",
              isDark
                ? "border-[#2DD4BF] bg-[#2DD4BF]/20 text-[#2DD4BF] hover:bg-[#2DD4BF]/30"
                : "border-forest-f40 bg-forest-f40 text-white hover:bg-forest-f50"
            )}
          >
            Save
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
