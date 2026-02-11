import React, { useState, useRef, useEffect, useMemo } from "react";
import { FileText } from "lucide-react";
import type { CampaignSetupState } from "../../types/agent";

const MAX_VALUE_LENGTH = 48;

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getLabelForKey(
  key: string,
  schema: Array<{ key?: string; label?: string }> | undefined
): string {
  if (schema?.length) {
    const item = schema.find((s) => (s.key ?? "") === key);
    if (item?.label) return item.label;
  }
  return humanizeKey(key);
}

function getDraftPreviewRows(campaignState: CampaignSetupState): { label: string; value: string }[] {
  const draft = { ...(campaignState.campaign_draft ?? {}), ...(campaignState.draft_setup_json ?? {}) };
  const schema = campaignState.current_questions_schema as Array<{ key?: string; label?: string }> | undefined;
  const rows: { label: string; value: string }[] = [];
  for (const [key, raw] of Object.entries(draft)) {
    if (raw == null || raw === "") continue;
    const value = typeof raw === "object" ? JSON.stringify(raw) : String(raw);
    rows.push({ label: getLabelForKey(key, schema), value });
  }
  return rows;
}

function hasDraftData(campaignState: CampaignSetupState | undefined): boolean {
  if (!campaignState) return false;
  const a = campaignState.campaign_draft && Object.keys(campaignState.campaign_draft).length > 0;
  const b = campaignState.draft_setup_json && Object.keys(campaignState.draft_setup_json).length > 0;
  return Boolean(a || b);
}

export interface CampaignDraftPreviewProps {
  campaignState: CampaignSetupState | undefined;
  visible: boolean;
  onApplyDraft?: (draft: Record<string, unknown>) => void;
  className?: string;
}

export const CampaignDraftPreview: React.FC<CampaignDraftPreviewProps> = ({
  campaignState,
  visible,
  onApplyDraft,
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const showButton = visible;
  const rows = useMemo(
    () => (campaignState ? getDraftPreviewRows(campaignState) : []),
    [campaignState]
  );
  const validationErrors = campaignState?.validation_errors ?? [];
  const canApplyDraft =
    onApplyDraft &&
    campaignState?.draft_setup_json &&
    Object.keys(campaignState.draft_setup_json).length > 0;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!showButton) return null;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-md text-[#072929] hover:bg-[#f0f0f0] transition-colors flex items-center gap-1.5"
        title="Current campaign draft"
        aria-label="View campaign draft"
        aria-expanded={open}
      >
        <FileText className="w-5 h-5 shrink-0 text-[#136D6D]" />
        <span className="text-xs font-medium text-[#072929] hidden sm:inline">Draft</span>
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1 min-w-[280px] max-w-[360px] w-max bg-white rounded-xl shadow-xl border border-[#e8e8e3] z-50 max-h-[400px] overflow-hidden flex flex-col"
          role="dialog"
          aria-label="Campaign draft preview"
        >
          <div className="sticky top-0 px-4 py-3 border-b border-[#e8e8e3] bg-[#f9f9f6] rounded-t-xl">
            <h3 className="text-sm font-semibold text-[#072929]">Campaign draft</h3>
            <p className="text-xs text-[#556179] mt-0.5">Current values collected so far</p>
          </div>

          <div className="overflow-y-auto flex-1 p-4">
            {rows.length === 0 ? (
              <p className="text-sm text-[#6b7280]">No draft fields yet.</p>
            ) : (
              <dl className="space-y-3">
                {rows.map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#556179]">
                      {label}
                    </dt>
                    <dd
                      className="text-sm text-[#072929] break-words"
                      title={value.length > MAX_VALUE_LENGTH ? value : undefined}
                    >
                      {value.length > MAX_VALUE_LENGTH ? `${value.slice(0, MAX_VALUE_LENGTH)}…` : value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {validationErrors.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#e8e8e3]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#556179] mb-1.5">
                  Validation
                </p>
                <ul className="space-y-1 text-xs text-red-600">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {canApplyDraft && (
              <div className="mt-4 pt-3 border-t border-[#e8e8e3]">
                <button
                  type="button"
                  onClick={() => {
                    onApplyDraft?.(campaignState!.draft_setup_json!);
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium bg-[#136D6D] text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Apply draft to form
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDraftPreview;
