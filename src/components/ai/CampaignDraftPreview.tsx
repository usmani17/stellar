import React, { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import type { CampaignSetupState } from "../../types/agent";
import { formatCampaignType } from "../../utils/formatDraftLabels";

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
  const draft = {
    ...(campaignState.campaign_draft ?? {}),
    ...(campaignState.draft_setup_json ?? {}),
    // Include campaign_type from top level if not already in draft (backend may send it separately)
    ...(campaignState.campaign_type != null &&
    campaignState.campaign_type !== "" &&
    !("campaign_type" in (campaignState.campaign_draft ?? {})) &&
    !("campaign_type" in (campaignState.draft_setup_json ?? {}))
      ? { campaign_type: campaignState.campaign_type }
      : {}),
  };
  const schema = campaignState.current_questions_schema as Array<{ key?: string; label?: string }> | undefined;
  const rows: { label: string; value: string }[] = [];
  for (const [key, raw] of Object.entries(draft)) {
    if (raw == null || raw === "") continue;
    const rawStr = typeof raw === "object" ? JSON.stringify(raw) : String(raw);
    const value = key === "campaign_type" ? formatCampaignType(rawStr) : rawStr;
    rows.push({ label: getLabelForKey(key, schema), value });
  }
  return rows;
}

export interface CampaignDraftPreviewProps {
  campaignState: CampaignSetupState | undefined;
  visible: boolean;
  onApplyDraft?: (draft: Record<string, unknown>) => void;
  /** accountId and channelId for building draft link (e.g. /brands/:accountId/:channelId/google/campaigns/:draftCampaignId) */
  accountId?: string;
  channelId?: string;
  className?: string;
  /** "dropdown" = floating panel on click; "expandable" = inline expand/collapse below the trigger */
  layout?: "dropdown" | "expandable";
}

function DraftContent({
  rows,
  validationErrors,
  canLinkToDraft,
  accountId,
  channelId,
  savedDraftId,
  onClose,
  compact,
}: {
  rows: { label: string; value: string }[];
  validationErrors: string[];
  canLinkToDraft: boolean;
  accountId?: string;
  channelId?: string;
  savedDraftId?: string;
  onClose?: () => void;
  compact?: boolean;
}) {
  const padding = compact ? "p-3" : "p-4";
  return (
    <div className={`overflow-y-auto flex-1 ${padding}`}>
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

      {(canLinkToDraft || (accountId && channelId)) && (
        <div className="mt-4 pt-3 border-t border-[#e8e8e3] space-y-2">
          {accountId && channelId && (
            <Link
              to={`/brands/${accountId}/${channelId}/google/campaigns`}
              className="block w-full px-3 py-2 text-xs font-medium text-[#136D6D] bg-[#136D6D]/10 rounded-lg hover:bg-[#136D6D]/20 transition-colors text-center"
              onClick={onClose}
            >
              View campaigns
            </Link>
          )}
          {canLinkToDraft && savedDraftId && (
            <Link
              to={`/brands/${accountId}/${channelId}/google/campaigns/${savedDraftId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-3 py-2 text-xs font-medium bg-[#136D6D] text-white rounded-lg hover:opacity-90 transition-opacity text-center"
              onClick={onClose}
            >
              View current draft
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export const CampaignDraftPreview: React.FC<CampaignDraftPreviewProps> = ({
  campaignState,
  visible,
  accountId,
  channelId,
  className = "",
  layout = "dropdown",
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const showButton = visible;
  const rows = useMemo(
    () => (campaignState ? getDraftPreviewRows(campaignState) : []),
    [campaignState]
  );
  const validationErrors = campaignState?.validation_errors ?? [];
  const savedDraftId = campaignState?.saved_draft_id;
  const canLinkToDraft = !!(savedDraftId && accountId && channelId);

  useEffect(() => {
    if (layout !== "dropdown" || !open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, layout]);

  if (!showButton) return null;

  const headerContent = (
    <>
      <h3 className="text-sm font-semibold text-[#072929]">Campaign draft</h3>
      <p className="text-xs text-[#556179] mt-0.5">Current values collected so far</p>
    </>
  );

  const panelContent = (
    <DraftContent
      rows={rows}
      validationErrors={validationErrors}
      canLinkToDraft={canLinkToDraft}
      accountId={accountId}
      channelId={channelId}
      savedDraftId={savedDraftId}
      onClose={() => setOpen(false)}
      compact={layout === "expandable"}
    />
  );

  if (layout === "expandable") {
    return (
      <div ref={wrapperRef} className={`mt-3 w-full ${className}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 p-2 rounded-md text-[#072929] hover:bg-[#f0f0f0] transition-colors border border-[#e8e8e3]"
          title="Current campaign draft"
          aria-label={open ? "Collapse draft" : "Expand draft"}
          aria-expanded={open}
        >
          <span className="flex items-center gap-1.5">
            <FileText className="w-5 h-5 shrink-0 text-[#136D6D]" />
            <span className="text-xs font-medium text-[#072929]">Draft</span>
          </span>
          {open ? (
            <ChevronUp className="w-4 h-4 text-[#556179] shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#556179] shrink-0" />
          )}
        </button>
        {open && (
          <div
            className="mt-1 w-full bg-[#f9f9f6] border border-[#e8e8e3] rounded-lg overflow-hidden flex flex-col max-h-[320px]"
            role="region"
            aria-label="Campaign draft preview"
          >
            <div className="px-4 py-2 border-b border-[#e8e8e3] bg-[#f9f9f6] shrink-0">
              {headerContent}
            </div>
            {panelContent}
          </div>
        )}
      </div>
    );
  }

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
            {headerContent}
          </div>
          {panelContent}
        </div>
      )}
    </div>
  );
};

export default CampaignDraftPreview;
