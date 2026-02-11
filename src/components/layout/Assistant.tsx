import React, { useRef, useEffect, useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { useAssistant, ASSISTANT_PANEL_VIEW } from "../../contexts/AssistantContext";
import type { CurrentQuestionSchemaItem } from "../../types/agent";
import { validateAssistantSchemaForm } from "../../utils/assistantSchemaFormValidation";
import { GripVertical } from "lucide-react";
import { SingleDatePicker } from "../ui/SingleDatePicker";
import { AssetSelectorModal } from "../google/AssetSelectorModal";
import { CreateImageAssetModal } from "../google/CreateImageAssetModal";
import type { Asset } from "../../services/googleAdwords/googleAdwordsAssets";
import { AssistantPanel } from "../ai/AssistantPanel";



export interface SchemaFormBlockHandle {
  getValues(): Record<string, string>;
  clear(): void;
  validate(values: Record<string, string>): { valid: boolean; errors: Record<string, string> };
  setErrors(errors: Record<string, string>): void;
}

const inputBaseClass =
  "w-full px-3 py-2 text-sm text-[#072929] bg-white border border-[#E8E8E3] rounded-[8px] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#136D6D]/40 focus:border-[#136D6D]";
const labelClass = "text-xs font-medium text-[#072929]";
const fontStyle = { fontFamily: "'GT America Trial', sans-serif" as const };

/** Form block for current_questions_schema; keyed by schema so it remounts when schema changes. */
export const SchemaFormBlock = forwardRef<SchemaFormBlockHandle, {
  questionsSchema: CurrentQuestionSchemaItem[];
  campaignDraft: Record<string, unknown> | undefined;
  onSend: (message: string) => void;
  disabled: boolean;
  inputValue?: string;
  onInputClear?: () => void;
  profileId?: number;
}>(({ questionsSchema, campaignDraft, onSend, disabled, inputValue = "", onInputClear, profileId }, ref) => {
  const [assetSelectorKey, setAssetSelectorKey] = useState<string | null>(null);
  const [createImageKey, setCreateImageKey] = useState<string | null>(null);
  const profileIdNum = profileId;
  const hasValidProfileId = profileIdNum != null && Number.isFinite(profileIdNum);

  const initialValues = useMemo(() => {
    const next: Record<string, string> = {};
    questionsSchema.forEach((item) => {
      if (!item.key) return;
      const draftVal = campaignDraft?.[item.key];
      if (item.ui_hint === "list_string") {
        const arr = Array.isArray(draftVal) ? draftVal.map((x) => (x != null ? String(x) : "")) : [];
        next[item.key] = arr.filter(Boolean).join("\n");
      } else if (item.ui_hint === "channel_controls") {
        if (draftVal && typeof draftVal === "object" && !Array.isArray(draftVal)) {
          next[item.key] = JSON.stringify(draftVal as Record<string, boolean>);
        } else {
          next[item.key] = "{}";
        }
      } else {
        next[item.key] = draftVal != null ? String(draftVal) : "";
      }
    });
    return next;
  }, [questionsSchema, campaignDraft]);
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const getDefaultForClear = (item: CurrentQuestionSchemaItem): string => {
    if (item.ui_hint === "channel_controls") return "{}";
    return "";
  };

  useImperativeHandle(ref, () => ({
    getValues: () => ({ ...values }),
    clear: () => {
      setValues(
        questionsSchema.reduce<Record<string, string>>(
          (acc, item) => ({ ...acc, [item.key]: getDefaultForClear(item) }),
          {}
        )
      );
      setErrors({});
    },
    validate: (vals: Record<string, string>) => validateAssistantSchemaForm(questionsSchema, vals),
    setErrors: (errs: Record<string, string>) => setErrors(errs),
  }), [values, questionsSchema]);

  const buildFormParts = (vals: Record<string, string>) =>
    questionsSchema
      .map((item) => {
        const v = vals[item.key];
        if (v === undefined || v === "") return null;
        const label = item.label || item.key;
        if (item.ui_hint === "channel_controls") {
          try {
            const obj = JSON.parse(v) as Record<string, boolean>;
            const parts = Object.entries(obj).map(([k, val]) => `${k}:${val}`);
            if (parts.length === 0) return null;
            return `${label}: ${parts.join(", ")}`;
          } catch {
            return null;
          }
        }
        return `${label}: ${typeof v === "string" ? v.trim() : v}`;
      })
      .filter(Boolean) as string[];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    const result = validateAssistantSchemaForm(questionsSchema, values);
    setErrors(result.errors);
    if (!result.valid) return;
    const formParts = buildFormParts(values);
    const textPart = inputValue?.trim() ?? "";
    const combined = [formParts.length > 0 ? formParts.join("\n") : null, textPart].filter(Boolean).join("\n\n");
    if (combined) {
      onSend(combined);
      setValues(
        questionsSchema.reduce<Record<string, string>>(
          (acc, item) => ({ ...acc, [item.key]: getDefaultForClear(item) }),
          {}
        )
      );
      setErrors({});
      onInputClear?.();
    }
  };

  const renderField = (item: CurrentQuestionSchemaItem) => {
    const key = item.key;
    const label = item.label || key;
    const isRequired = item.required !== false;
    const value = values[key] ?? "";

    if (item.ui_hint === "list_string") {
      const min = item.min ?? 1;
      const max = item.max ?? 10;
      const maxLength = item.max_length;
      const items = value ? value.split("\n") : [];
      const rowCount = Math.min(max, Math.max(min, items.length || min));
      const listItems: string[] = items.slice(0, rowCount);
      while (listItems.length < rowCount) listItems.push("");
      const updateList = (next: string[]) => {
        handleChange(key, next.join("\n"));
      };
      return (
        <div key={key} className="flex flex-col gap-1">
          <label className={labelClass} style={fontStyle}>
            {label}
            {isRequired && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <div className="flex flex-col gap-2">
            {listItems.map((row, i) => (
              <div key={i} className="flex gap-2 items-center min-w-0">
                <input
                  type="text"
                  value={row}
                  onChange={(e) => {
                    const n = [...listItems];
                    n[i] = e.target.value;
                    updateList(n);
                  }}
                  maxLength={maxLength}
                  placeholder={maxLength ? `Max ${maxLength} chars` : ""}
                  className={inputBaseClass}
                  style={fontStyle}
                  disabled={disabled}
                />
                {maxLength != null && (
                  <span className="text-[10px] text-[#6b7280] shrink-0">
                    {row.length}/{maxLength}
                  </span>
                )}
                {listItems.length > min && (
                  <button
                    type="button"
                    onClick={() => {
                      const n = listItems.filter((_, j) => j !== i);
                      updateList(n);
                    }}
                    disabled={disabled}
                    className="shrink-0 text-xs text-red-600 hover:text-red-700 hover:underline font-medium px-1.5 py-1"
                    style={fontStyle}
                    title="Remove this row"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {listItems.length < max && (
              <button
                type="button"
                onClick={() => updateList([...listItems, ""])}
                disabled={disabled}
                className="text-xs text-[#136D6D] hover:underline font-medium self-start"
                style={fontStyle}
              >
                Add more
              </button>
            )}
          </div>
          {errors[key] && <p className="text-xs text-red-500 mt-0.5" style={fontStyle}>{errors[key]}</p>}
        </div>
      );
    }

    if (item.ui_hint === "date") {
      return (
        <div key={key} className="flex flex-col gap-1">
          <label className={labelClass} style={fontStyle}>
            {label}
            {isRequired && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <SingleDatePicker
            value={value}
            onChange={(v) => handleChange(key, v)}
            disabled={disabled}
            dateFormat="MM/dd/yyyy"
            placeholder="Select date"
            className={inputBaseClass}
            id={`schema-${key}`}
          />
          {errors[key] && <p className="text-xs text-red-500 mt-0.5" style={fontStyle}>{errors[key]}</p>}
        </div>
      );
    }

    if (item.ui_hint === "dropdown") {
      const opts = item.options ?? (item.allowed_values ?? []).map((v: string) => ({ value: v, label: v }));
      return (
        <div key={key} className="flex flex-col gap-1">
          <label htmlFor={`schema-${key}`} className={labelClass} style={fontStyle}>
            {label}
            {isRequired && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <select
            id={`schema-${key}`}
            value={value}
            onChange={(e) => handleChange(key, e.target.value)}
            className={inputBaseClass}
            style={fontStyle}
            disabled={disabled}
          >
            <option value="">Select...</option>
            {opts.map((o: { value: string; label?: string }) => (
              <option key={o.value} value={o.value}>
                {o.label ?? o.value}
              </option>
            ))}
          </select>
          {errors[key] && <p className="text-xs text-red-500 mt-0.5" style={fontStyle}>{errors[key]}</p>}
        </div>
      );
    }

    if (item.ui_hint === "channel_controls") {
      const opts = item.options ?? [];
      let obj: Record<string, boolean> = {};
      try {
        if (value) obj = JSON.parse(value) as Record<string, boolean>;
      } catch { }
      const toggle = (optValue: string, checked: boolean) => {
        const next = { ...obj, [optValue]: checked };
        handleChange(key, JSON.stringify(next));
      };
      return (
        <div key={key} className="flex flex-col gap-1">
          <span className={labelClass} style={fontStyle}>
            {label}
            {isRequired && <span className="text-red-500 ml-0.5">*</span>}
          </span>
          <div className="flex flex-wrap gap-3 pt-1">
            {opts.map((o: { value: string; label?: string }) => (
              <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={obj[o.value] === true}
                  onChange={(e) => toggle(o.value, e.target.checked)}
                  disabled={disabled}
                  className="rounded border-[#E8E8E3] text-[#136D6D] focus:ring-[#136D6D]/40"
                />
                <span className="text-sm text-[#072929]" style={fontStyle}>
                  {o.label ?? o.value}
                </span>
              </label>
            ))}
          </div>
          {errors[key] && <p className="text-xs text-red-500 mt-0.5" style={fontStyle}>{errors[key]}</p>}
        </div>
      );
    }

    if (item.ui_hint === "image_url" && hasValidProfileId && profileIdNum != null) {
      return (
        <div key={key} className="flex flex-col gap-1">
          <label htmlFor={`schema-${key}`} className={labelClass} style={fontStyle}>
            {label}
            {isRequired && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <div className="flex gap-2 items-center">
            <input
              id={`schema-${key}`}
              type="url"
              value={value}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder="https://..."
              className={`${inputBaseClass} flex-1 min-w-0`}
              style={fontStyle}
              disabled={disabled}
            />
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setAssetSelectorKey(key)}
                disabled={disabled}
                className="text-xs text-[#136D6D] hover:text-[#0f5a5a] font-medium whitespace-nowrap px-2 py-1.5 border border-[#136D6D] rounded"
              >
                Select asset
              </button>
              <button
                type="button"
                onClick={() => setCreateImageKey(key)}
                disabled={disabled}
                className="text-xs text-[#136D6D] hover:text-[#0f5a5a] font-medium whitespace-nowrap px-2 py-1.5 border border-[#136D6D] rounded"
              >
                Create / Upload
              </button>
            </div>
          </div>
          {assetSelectorKey === key && (
            <AssetSelectorModal
              isOpen={true}
              onClose={() => setAssetSelectorKey(null)}
              onSelect={(asset: Asset) => {
                if (asset.type === "IMAGE" && "image_url" in asset && asset.image_url) {
                  handleChange(key, asset.image_url);
                }
                setAssetSelectorKey(null);
              }}
              profileId={profileIdNum as number}
              assetType="IMAGE"
            />
          )}
          {createImageKey === key && (
            <CreateImageAssetModal
              isOpen={true}
              onClose={() => setCreateImageKey(null)}
              profileId={profileIdNum as number}
              onSuccess={(asset: { image_url?: string }) => {
                if (asset.image_url) handleChange(key, asset.image_url);
                setCreateImageKey(null);
              }}
            />
          )}
          {errors[key] && <p className="text-xs text-red-500 mt-0.5" style={fontStyle}>{errors[key]}</p>}
        </div>
      );
    }

    const inputType =
      item.ui_hint === "url" ? "url" : item.type === "number" ? "number" : "text";
    return (
      <div key={key} className="flex flex-col gap-1">
        <label htmlFor={`schema-${key}`} className={labelClass} style={fontStyle}>
          {label}
          {isRequired && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <input
          id={`schema-${key}`}
          type={inputType}
          value={value}
          onChange={(e) => handleChange(key, e.target.value)}
          placeholder={item.ui_hint === "url" ? "https://..." : ""}
          className={inputBaseClass}
          style={fontStyle}
          disabled={disabled}
        />
        {errors[key] && <p className="text-xs text-red-500 mt-0.5" style={fontStyle}>{errors[key]}</p>}
      </div>
    );
  };

  return (
    <div className="mt-2 p-4 bg-[#F9F9F6] border border-[#E8E8E3] rounded-[10px]">
      <p className="text-sm font-medium text-[#072929] mb-3" style={fontStyle}>
        Fill in the details
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {questionsSchema.map(renderField)}
        <button
          type="submit"
          disabled={disabled}
          className="self-start mt-1 px-4 py-2 text-sm font-medium bg-[#136D6D] text-white rounded-[8px] hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none transition-opacity"
          style={fontStyle}
        >
          Send answers
        </button>
      </form>
    </div>
  );
});

SchemaFormBlock.displayName = "SchemaFormBlock";

const DEFAULT_PANEL_WIDTH = 550;
const MIN_PANEL_WIDTH = 380;
const MAX_PANEL_WIDTH = 900;
const ASSISTANT_PANEL_WIDTH_KEY = "stellar-assistant-panel-width";

function getStoredPanelWidth(): number {
  try {
    const stored = localStorage.getItem(ASSISTANT_PANEL_WIDTH_KEY);
    if (stored != null) {
      const n = parseInt(stored, 10);
      if (!Number.isNaN(n)) return Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, n));
    }
  } catch {
    // ignore
  }
  return DEFAULT_PANEL_WIDTH;
}

function setStoredPanelWidth(width: number): void {
  try {
    localStorage.setItem(ASSISTANT_PANEL_WIDTH_KEY, String(width));
  } catch {
    // ignore
  }
}

// Wrapper component that renders the Assistant panel with slide-up/slide-down animation
export const Assistant: React.FC<React.PropsWithChildren<object>> = ({
  children,
}) => {
  const { isOpen } = useAssistant();
  const [panelWidth, setPanelWidth] = useState(getStoredPanelWidth);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    setStoredPanelWidth(panelWidth);
  }, [panelWidth]);

  const isFixed = ASSISTANT_PANEL_VIEW === "fixed";
  const widthCss = `${panelWidth}px`;

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: panelWidth };
    setIsResizing(true);
    const onMove = (ev: MouseEvent) => {
      const start = dragRef.current;
      if (!start) return;
      const delta = start.startX - ev.clientX;
      setPanelWidth(Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, start.startWidth + delta)));
    };
    const onUp = () => {
      dragRef.current = null;
      setIsResizing(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleResizeDoubleClick = () => {
    setPanelWidth(DEFAULT_PANEL_WIDTH);
    setStoredPanelWidth(DEFAULT_PANEL_WIDTH);
  };

  return (
    <div className={`bg-[var(--color-semantic-background-primary)] overflow-x-hidden min-w-0 flex ${isFixed ? "relative" : ""}`}>
      {/* Main Content */}
      <div
        style={isOpen && isFixed ? { marginRight: widthCss } : undefined}
        className={`flex-1 overflow-x-hidden transition-all duration-300 interactive-scrollbar`}
      >
        {children}
      </div>

      {/* Assistant Sidebar - show when open */}
      {isOpen && (
        <div
          className={`${isFixed ? "fixed" : "absolute"} right-0 top-0 bottom-0 z-[45] bg-[var(--color-semantic-background-primary)] transition-[width] duration-200 ease-out ${isFixed ? "border-l border-gray-200" : "rounded-l-2xl shadow-[-8px_0_24px_rgba(0,0,0,0.15)]"
            }`}
          style={{ width: widthCss }}
        >
          {/* Resize handle - left edge, vertically centered; thin strip with grip */}
          <div
            onMouseDown={handleResizeMouseDown}
            onDoubleClick={handleResizeDoubleClick}
            className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 w-2 h-16 flex items-center justify-center rounded-r cursor-col-resize transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#136D6D] focus-visible:ring-offset-1 ${isResizing
                ? "bg-[#136D6D] text-white"
                : "bg-[#e0e0dc] hover:bg-[#136D6D]/80 text-[#072929] hover:text-white border border-r-0 border-[#d0d0cc]"
              }`}
            title="Drag to resize · Double-click to reset"
            aria-label="Resize assistant panel"
            tabIndex={0}
          >
            <GripVertical className="w-3 h-3 opacity-70" strokeWidth={2} />
          </div>
          <AssistantPanel className={`h-full ${isFixed ? "" : "rounded-l-2xl overflow-hidden"}`} />
        </div>
      )}
    </div>
  );
};


