import React, { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { BaseModal } from "../../../../components/ui";
import { DashboardTableFormulaBuilder } from "./DashboardTableFormulaBuilder";
import { useDashboardTheme } from "../../contexts/DashboardThemeContext";
import { cn } from "../../../../lib/cn";

/** Column name/label: letters, numbers, spaces, hyphens, underscores only */
const LABEL_ALLOWED_PATTERN = /^[a-zA-Z0-9_\-\s]+$/;

export interface CustomColumnEdit {
  key: string;
  label: string;
  formula: string;
}

interface DashboardTableCustomColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (column: CustomColumnEdit) => void;
  onDelete?: (columnKey: string) => void;
  editExisting?: CustomColumnEdit | null;
  availableColumnKeys: string[];
  existingCustomKeys: string[];
}

const CUSTOM_KEY_PREFIX = "custom_";

export const DashboardTableCustomColumnModal: React.FC<DashboardTableCustomColumnModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editExisting,
  availableColumnKeys,
  existingCustomKeys,
}) => {
  const { isDark } = useDashboardTheme();
  const isEdit = !!editExisting;

  const [label, setLabel] = useState(editExisting?.label ?? "");
  const [formula, setFormula] = useState(editExisting?.formula ?? "");
  const [labelError, setLabelError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLabel(editExisting?.label ?? "");
      setFormula(editExisting?.formula ?? "");
      setLabelError(null);
    }
  }, [isOpen, editExisting]);

  const generateKey = (baseLabel: string): string => {
    const safe = baseLabel
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "column";
    let key = `${CUSTOM_KEY_PREFIX}${safe}`;
    let i = 1;
    while (existingCustomKeys.includes(key) && (!isEdit || key !== editExisting?.key)) {
      key = `${CUSTOM_KEY_PREFIX}${safe}_${i}`;
      i++;
    }
    return key;
  };

  const handleSave = () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setLabelError("Column name is required");
      return;
    }
    if (!LABEL_ALLOWED_PATTERN.test(trimmedLabel)) {
      setLabelError("Use only letters, numbers, spaces, hyphens, and underscores");
      return;
    }
    const key = isEdit ? editExisting!.key : generateKey(trimmedLabel);
    if (!isEdit && availableColumnKeys.includes(key)) {
      setLabelError("Column name conflicts with existing column");
      return;
    }
    setLabelError(null);
    onSave({ key, label: trimmedLabel, formula: formula.trim() });
    onClose();
  };

  const handleDelete = () => {
    if (isEdit && onDelete) {
      onDelete(editExisting!.key);
      onClose();
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      maxWidth="max-w-lg"
    >
      <div className={cn(isDark ? "text-neutral-100" : "text-forest-f60")}>
        <h2 className="text-lg font-semibold mb-4">
          {isEdit ? "Edit custom column" : "Add custom column"}
        </h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Column name
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setLabelError(null);
              }}
              placeholder="e.g. Cost per Click"
              className={cn(
                "w-full px-3 py-2 rounded border text-sm outline-none",
                isDark
                  ? "bg-neutral-700 border-neutral-600 placeholder:text-neutral-500 focus:border-[#2DD4BF]/60"
                  : "bg-sandstorm-s5 border-sandstorm-s40 placeholder:text-forest-f30 focus:border-forest-f40"
              )}
              aria-label="Column name"
            />
            {labelError && (
              <p className={cn("text-xs mt-1", isDark ? "text-red-400" : "text-red-r30")}>
                {labelError}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Formula
            </label>
            <DashboardTableFormulaBuilder
              value={formula}
              onChange={setFormula}
              availableColumnKeys={availableColumnKeys}
              isDark={isDark}
            />
          </div>
        </div>
        <div className="flex justify-between items-center mt-6">
          <div>
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium transition-colors",
                  isDark
                    ? "text-red-400 hover:bg-red-900/30"
                    : "text-red-r30 hover:bg-red-r0"
                )}
                aria-label="Delete column"
              >
                <Trash2 className="w-4 h-4" />
                Delete column
              </button>
            )}
          </div>
          <div className="flex gap-2">
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
              {isEdit ? "Save" : "Add column"}
            </button>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
