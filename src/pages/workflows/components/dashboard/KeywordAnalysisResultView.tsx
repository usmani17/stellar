import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Hash, Layers, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "../../../../lib/cn";
import { patchKeywordAnalysis } from "../../../../services/dashboardActions";
import { Dropdown } from "../../../../components/ui";

/** Shape persisted by the agent / returned in ```keyword-analysis``` blocks. */
export interface KeywordAnalysisKeywordItem {
  keyword: string;
  match_type: string;
  stagger_interval_seconds?: number | string;
}

export interface KeywordAnalysisEntityItem {
  id: string;
  name?: string;
  keywords?: KeywordAnalysisKeywordItem[];
  negatives?: KeywordAnalysisKeywordItem[];
  rationale?: string;
}

export interface KeywordAnalysisStoredPayload {
  schema_version?: number;
  analysis_kind?: string;
  platform?: string;
  entity_type?: string;
  entities?: KeywordAnalysisEntityItem[];
}

export interface KeywordAnalysisPersistContext {
  accountId: number;
  dashboardId: number;
  componentId: string;
  actionId: number;
}

const MATCH_TYPES = ["EXACT", "PHRASE", "BROAD"] as const;
const STAGGER_INTERVAL_OPTIONS = [
  { value: "3600", label: "1 hour" },
  { value: "7200", label: "2 hours" },
  { value: "14400", label: "4 hours" },
  { value: "28800", label: "8 hours" },
  { value: "86400", label: "1 day" },
  { value: "172800", label: "2 days" },
  { value: "259200", label: "3 days" },
];

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/** Best-effort parse for DB JSON or parsed stream output. */
export function parseKeywordAnalysisPayload(raw: unknown): KeywordAnalysisStoredPayload | null {
  if (!isRecord(raw)) return null;
  const entitiesRaw = raw.entities;
  if (!Array.isArray(entitiesRaw)) return null;
  const entities: KeywordAnalysisEntityItem[] = [];
  for (const ent of entitiesRaw) {
    if (!isRecord(ent) || typeof ent.id !== "string") continue;
    const keywords = Array.isArray(ent.keywords)
      ? ent.keywords.filter(
          (k): k is KeywordAnalysisKeywordItem =>
            isRecord(k) &&
            typeof k.keyword === "string" &&
            typeof k.match_type === "string"
        ).map((k) => ({
          keyword: k.keyword,
          match_type: k.match_type,
          stagger_interval_seconds:
            typeof k.stagger_interval_seconds === "number" ||
            typeof k.stagger_interval_seconds === "string"
              ? k.stagger_interval_seconds
              : undefined,
        }))
      : [];
    const negatives = Array.isArray(ent.negatives)
      ? ent.negatives.filter(
          (k): k is KeywordAnalysisKeywordItem =>
            isRecord(k) &&
            typeof k.keyword === "string" &&
            typeof k.match_type === "string"
        ).map((k) => ({
          keyword: k.keyword,
          match_type: k.match_type,
          stagger_interval_seconds:
            typeof k.stagger_interval_seconds === "number" ||
            typeof k.stagger_interval_seconds === "string"
              ? k.stagger_interval_seconds
              : undefined,
        }))
      : [];
    entities.push({
      id: ent.id,
      name: typeof ent.name === "string" ? ent.name : undefined,
      keywords,
      negatives,
      rationale: typeof ent.rationale === "string" ? ent.rationale : undefined,
    });
  }
  return {
    schema_version: typeof raw.schema_version === "number" ? raw.schema_version : undefined,
    analysis_kind: typeof raw.analysis_kind === "string" ? raw.analysis_kind : undefined,
    platform: typeof raw.platform === "string" ? raw.platform : undefined,
    entity_type: typeof raw.entity_type === "string" ? raw.entity_type : undefined,
    entities,
  };
}

export function cloneKeywordAnalysisPayload(d: KeywordAnalysisStoredPayload): KeywordAnalysisStoredPayload {
  return JSON.parse(JSON.stringify(d)) as KeywordAnalysisStoredPayload;
}

function withDefaultStaggerIntervals(payload: KeywordAnalysisStoredPayload): KeywordAnalysisStoredPayload {
  const cloned = cloneKeywordAnalysisPayload(payload);
  cloned.entities = cloned.entities?.map((entity) => ({
    ...entity,
    keywords: entity.keywords?.map((kw) => ({
      ...kw,
      stagger_interval_seconds: kw.stagger_interval_seconds || "86400",
    })),
    negatives: entity.negatives?.map((neg) => ({
      ...neg,
      stagger_interval_seconds: neg.stagger_interval_seconds || "86400",
    })),
  }));
  return cloned;
}

function normalizeMatchType(mt: string): string {
  const u = mt.trim().toUpperCase();
  return MATCH_TYPES.includes(u as (typeof MATCH_TYPES)[number]) ? u : "PHRASE";
}

function getStaggerIntervalValue(entity: KeywordAnalysisEntityItem): string {
  const firstKw = entity.keywords?.[0];
  const raw = firstKw?.stagger_interval_seconds;
  const parsed = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
  const normalized = Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "86400";
  return STAGGER_INTERVAL_OPTIONS.some((o) => o.value === normalized) ? normalized : "86400";
}

// ── Inline text edit (same pattern as DashboardWidgetActions InlineEdit) ───

interface InlineEditTextProps {
  value: string;
  onSave: (val: string) => void;
  isDark: boolean;
  disabled?: boolean;
}

const InlineEditText: React.FC<InlineEditTextProps> = ({ value, onSave, isDark, disabled }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  if (disabled) {
    return (
      <span className={cn("text-[10px] max-w-[180px] truncate", isDark ? "text-neutral-200" : "text-forest-f60")}>
        {value}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] cursor-pointer transition-colors max-w-[200px]",
          isDark ? "text-neutral-200 hover:bg-neutral-600/50" : "text-forest-f60 hover:bg-sandstorm-s20"
        )}
        aria-label="Edit keyword text"
      >
        <span className="truncate">{value}</span>
        <Pencil className="w-3 h-3 opacity-50 shrink-0" />
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 flex-1 min-w-0">
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSave(draft.trim());
            setEditing(false);
          }
          if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
        className={cn(
          "px-1.5 py-0.5 rounded text-[10px] border outline-none flex-1 min-w-0",
          isDark
            ? "bg-neutral-700 border-neutral-500 text-neutral-100 focus:border-[#2DD4BF]"
            : "bg-white border-sandstorm-s40 text-forest-f60 focus:border-forest-f40"
        )}
      />
      <button
        type="button"
        onClick={() => {
          onSave(draft.trim());
          setEditing(false);
        }}
        className="p-0.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 shrink-0"
        aria-label="Confirm"
      >
        <Check className="w-3 h-3 text-emerald-600" />
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 shrink-0"
        aria-label="Cancel"
      >
        <X className="w-3 h-3 text-red-500" />
      </button>
    </span>
  );
};

// ── Match type with confirm ─────────────────────────────────────────────────

interface InlineMatchTypeProps {
  value: string;
  onSave: (mt: string) => void;
  isDark: boolean;
  disabled?: boolean;
}

const InlineMatchType: React.FC<InlineMatchTypeProps> = ({ value, onSave, isDark, disabled }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(normalizeMatchType(value));

  useEffect(() => {
    if (!editing) setDraft(normalizeMatchType(value));
  }, [value, editing]);

  const v = normalizeMatchType(value);

  if (disabled) {
    return (
      <span
        className={cn(
          "shrink-0 rounded px-1 py-px text-[9px] font-semibold uppercase",
          isDark ? "bg-neutral-800 text-neutral-400" : "bg-sandstorm-s0 text-forest-f30"
        )}
      >
        {v}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(v);
          setEditing(true);
        }}
        className={cn(
          "shrink-0 inline-flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-semibold uppercase",
          isDark ? "bg-neutral-800 text-neutral-400 hover:bg-neutral-700" : "bg-sandstorm-s0 text-forest-f30 hover:bg-sandstorm-s20"
        )}
        aria-label="Edit match type"
      >
        {v}
        <Pencil className="w-2.5 h-2.5 opacity-60" />
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      <select
        value={draft}
        onChange={(e) => setDraft(normalizeMatchType(e.target.value))}
        className={cn(
          "rounded px-1 py-0.5 text-[9px] font-semibold uppercase border outline-none",
          isDark
            ? "bg-neutral-700 border-neutral-500 text-neutral-100"
            : "bg-white border-sandstorm-s40 text-forest-f60"
        )}
        aria-label="Match type"
      >
        {MATCH_TYPES.map((mt) => (
          <option key={mt} value={mt}>
            {mt}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => {
          onSave(draft);
          setEditing(false);
        }}
        className="p-0.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
        aria-label="Confirm match type"
      >
        <Check className="w-3 h-3 text-emerald-600" />
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
        aria-label="Cancel"
      >
        <X className="w-3 h-3 text-red-500" />
      </button>
    </span>
  );
};

// ── Delete confirm ─────────────────────────────────────────────────────────

interface InlineConfirmProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDark: boolean;
}

const InlineConfirm: React.FC<InlineConfirmProps> = ({ message, onConfirm, onCancel, isDark }) => (
  <div
    className={cn(
      "flex flex-wrap items-center gap-2 px-2 py-1 rounded-lg text-[10px]",
      isDark ? "bg-neutral-700 border border-neutral-600" : "bg-white border border-sandstorm-s40 shadow-sm"
    )}
  >
    <span className={cn("font-medium", isDark ? "text-neutral-200" : "text-forest-f60")}>{message}</span>
    <button
      type="button"
      onClick={onConfirm}
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-semibold",
        isDark ? "bg-red-900/50 text-red-300 hover:bg-red-900/70" : "bg-red-50 text-red-600 hover:bg-red-100"
      )}
    >
      Yes
    </button>
    <button
      type="button"
      onClick={onCancel}
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-medium",
        isDark ? "text-neutral-400 hover:bg-neutral-600" : "text-forest-f30 hover:bg-sandstorm-s10"
      )}
    >
      No
    </button>
  </div>
);

const KIND_LABELS: Record<string, string> = {
  add_keyword: "Add keywords",
  add_negative_keyword: "Add negative keywords",
};

type KeywordListKind = "keywords" | "negatives";

interface KeywordAnalysisResultViewProps {
  data: KeywordAnalysisStoredPayload;
  isDark: boolean;
  className?: string;
  /** When set with a valid action id, keywords can be edited and saved via API. */
  persistContext?: KeywordAnalysisPersistContext | null;
  /** Called after a successful PATCH (for parent to merge into UI state). */
  onPersisted?: (payload: KeywordAnalysisStoredPayload) => void;
}

export const KeywordAnalysisResultView: React.FC<KeywordAnalysisResultViewProps> = ({
  data,
  isDark,
  className,
  persistContext,
  onPersisted,
}) => {
  const editable = Boolean(persistContext?.actionId);
  const [localData, setLocalData] = useState(() => withDefaultStaggerIntervals(data));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    entityId: string;
    kind: KeywordListKind;
    index: number;
  } | null>(null);
  const [addingFor, setAddingFor] = useState<{
    entityId: string;
    kind: KeywordListKind;
  } | null>(null);
  const [addDraftText, setAddDraftText] = useState("");
  const [addDraftMt, setAddDraftMt] = useState<string>("PHRASE");
  const localRef = useRef(localData);
  useEffect(() => {
    localRef.current = localData;
  }, [localData]);

  const dataKey = JSON.stringify(data);
  useEffect(() => {
    if (!editable) return;
    const next = cloneKeywordAnalysisPayload(data);
    setLocalData(next);
    localRef.current = next;
  }, [dataKey, editable]);

  const view = editable ? localData : data;
  const entities = view.entities ?? [];

  const persistAnalysis = useCallback(
    async (analysisWithInterval: KeywordAnalysisStoredPayload) => {
      if (!persistContext?.actionId) return;
      setSaving(true);
      setError(null);
      try {
        const res = await patchKeywordAnalysis(persistContext.accountId, persistContext.dashboardId, {
          component_id: persistContext.componentId,
          action_id: persistContext.actionId,
          keyword_analysis: analysisWithInterval as unknown as Record<string, unknown>,
        });
        const parsed = parseKeywordAnalysisPayload(res.keyword_analysis);
        const merged = parsed ?? analysisWithInterval;
        setLocalData(merged);
        localRef.current = merged;
        onPersisted?.(merged);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [persistContext, onPersisted]
  );

  const applyUpdate = useCallback(
    (mutator: (draft: KeywordAnalysisStoredPayload) => void) => {
      const next = cloneKeywordAnalysisPayload(localRef.current);
      mutator(next);
      setLocalData(next);
      localRef.current = next;
      void persistAnalysis(next);
    },
    [persistAnalysis]
  );

  const kindLabel =
    (view.analysis_kind && KIND_LABELS[view.analysis_kind]) || view.analysis_kind || "Keyword analysis";
  const metaParts = [view.platform, view.entity_type].filter(Boolean).join(" · ");

  const renderKeywordList = (ent: KeywordAnalysisEntityItem, kind: KeywordListKind) => {
    const list = kind === "keywords" ? ent.keywords ?? [] : ent.negatives ?? [];
    if (!editable && list.length === 0) return null;
    const label = kind === "keywords" ? "Keywords" : "Negative keywords";
    const chipDark =
      kind === "keywords"
        ? "bg-forest-f50/25 text-neutral-100 border-forest-f40/35"
        : "bg-neutral-800/80 text-neutral-200 border-neutral-600";
    const chipLight =
      kind === "keywords"
        ? "bg-forest-f40/10 text-forest-f60 border-forest-f40/25"
        : "bg-sandstorm-s20 text-forest-f60 border-sandstorm-s40";

    return (
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wide",
              isDark ? "text-neutral-400" : "text-forest-f30"
            )}
          >
            {label}
          </p>
          {editable && !saving ? (
            <button
              type="button"
              onClick={() => {
                setAddingFor({ entityId: ent.id, kind });
                setAddDraftText("");
                setAddDraftMt("PHRASE");
              }}
              className={cn(
                "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium",
                isDark ? "text-[#2DD4BF] hover:bg-neutral-700" : "text-forest-f40 hover:bg-sandstorm-s20"
              )}
              aria-label={`Add ${kind === "keywords" ? "keyword" : "negative keyword"}`}
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          ) : null}
        </div>

        {addingFor?.entityId === ent.id && addingFor.kind === kind ? (
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 mb-2 p-2 rounded-lg border",
              isDark ? "border-neutral-600 bg-neutral-900/40" : "border-sandstorm-s40 bg-sandstorm-s5"
            )}
          >
            <input
              type="text"
              value={addDraftText}
              onChange={(e) => setAddDraftText(e.target.value)}
              placeholder="Keyword text"
              className={cn(
                "flex-1 min-w-[120px] px-2 py-1 rounded text-[10px] border outline-none",
                isDark
                  ? "bg-neutral-700 border-neutral-500 text-neutral-100"
                  : "bg-white border-sandstorm-s40 text-forest-f60"
              )}
            />
            <select
              value={addDraftMt}
              onChange={(e) => setAddDraftMt(normalizeMatchType(e.target.value))}
              className={cn(
                "rounded px-1 py-1 text-[9px] font-semibold uppercase border",
                isDark ? "bg-neutral-700 border-neutral-500 text-neutral-100" : "bg-white border-sandstorm-s40"
              )}
            >
              {MATCH_TYPES.map((mt) => (
                <option key={mt} value={mt}>
                  {mt}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                const t = addDraftText.trim();
                if (!t) return;
                applyUpdate((d) => {
                  const e = d.entities?.find((x) => x.id === ent.id);
                  if (!e) return;
                  const key = kind === "keywords" ? "keywords" : "negatives";
                  if (!e[key]) e[key] = [];
                  e[key]!.push({
                    keyword: t,
                    match_type: normalizeMatchType(addDraftMt),
                    stagger_interval_seconds: getStaggerIntervalValue(e),
                  });
                });
                setAddingFor(null);
              }}
              className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
              aria-label="Confirm add"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            </button>
            <button
              type="button"
              onClick={() => setAddingFor(null)}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
              aria-label="Cancel add"
            >
              <X className="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>
        ) : null}

        {list.length === 0 && !addingFor ? (
          <p className={cn("text-[10px] italic", isDark ? "text-neutral-500" : "text-forest-f30")}>None</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {list.map((k, i) => (
              <div
                key={`${ent.id}-${kind}-${i}-${k.keyword}`}
                className={cn(
                  "inline-flex flex-wrap items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] border max-w-full",
                  isDark ? chipDark : chipLight
                )}
              >
                <InlineEditText
                  value={k.keyword}
                  onSave={(text) => {
                    if (!text) return;
                    applyUpdate((d) => {
                      const e = d.entities?.find((x) => x.id === ent.id);
                      const arr = kind === "keywords" ? e?.keywords : e?.negatives;
                      if (arr?.[i]) arr[i] = { ...arr[i], keyword: text };
                    });
                  }}
                  isDark={isDark}
                  disabled={!editable || saving}
                />
                <InlineMatchType
                  value={k.match_type}
                  onSave={(mt) => {
                    applyUpdate((d) => {
                      const e = d.entities?.find((x) => x.id === ent.id);
                      const arr = kind === "keywords" ? e?.keywords : e?.negatives;
                      if (arr?.[i]) arr[i] = { ...arr[i], match_type: normalizeMatchType(mt) };
                    });
                  }}
                  isDark={isDark}
                  disabled={!editable || saving}
                />
                {editable && !saving ? (
                  confirmDelete?.entityId === ent.id && confirmDelete.kind === kind && confirmDelete.index === i ? (
                    <InlineConfirm
                      message="Remove?"
                      onConfirm={() => {
                        applyUpdate((d) => {
                          const e = d.entities?.find((x) => x.id === ent.id);
                          const arr = kind === "keywords" ? e?.keywords : e?.negatives;
                          if (arr) arr.splice(i, 1);
                        });
                        setConfirmDelete(null);
                      }}
                      onCancel={() => setConfirmDelete(null)}
                      isDark={isDark}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete({ entityId: ent.id, kind, index: i })}
                      className={cn(
                        "p-0.5 rounded shrink-0",
                        isDark ? "hover:bg-red-900/40 text-red-300" : "hover:bg-red-50 text-red-r30"
                      )}
                      aria-label="Delete keyword"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn("relative space-y-3", className)}
      aria-busy={editable && saving ? true : undefined}
    >
      {editable && saving ? (
        <div
          className={cn(
            "absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] min-h-[100px]",
            isDark ? "bg-neutral-900/55" : "bg-sandstorm-s0/75"
          )}
          role="status"
          aria-live="polite"
          aria-label="Saving keyword analysis"
        >
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-4 py-3 shadow-md border",
              isDark ? "bg-neutral-800 border-neutral-600 text-neutral-100" : "bg-white border-sandstorm-s40 text-forest-f60"
            )}
          >
            <Loader2
              className={cn("w-5 h-5 animate-spin shrink-0", isDark ? "text-[#2DD4BF]" : "text-forest-f40")}
              aria-hidden
            />
            <span className="text-xs font-medium">Saving changes…</span>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "flex flex-wrap items-center gap-2 text-[11px]",
          isDark ? "text-neutral-300" : "text-forest-f60"
        )}
      >
        <span className="font-semibold">{kindLabel}</span>
        {metaParts ? (
          <span className={cn(isDark ? "text-neutral-500" : "text-forest-f30")}>{metaParts}</span>
        ) : null}
        {editable ? (
          <span className={cn("text-[10px]", isDark ? "text-neutral-500" : "text-forest-f30")}>
            {saving ? "Saving changes…" : "Edits save on confirm"}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className={cn("text-[11px] rounded-lg px-2 py-1.5", isDark ? "bg-red-900/25 text-red-200" : "bg-red-r0 text-red-r30")}>
          {error}
        </p>
      ) : null}

      {entities.length === 0 ? (
        <p className={cn("text-xs italic", isDark ? "text-neutral-500" : "text-forest-f30")}>
          No entities in this analysis.
        </p>
      ) : (
        <ul className="space-y-3 list-none p-0 m-0">
          {entities.map((ent) => (
            <li
              key={ent.id}
              className={cn(
                "rounded-xl border p-3 space-y-2",
                isDark ? "border-neutral-600 bg-neutral-900/35" : "border-sandstorm-s40 bg-sandstorm-s5/80"
              )}
            >
              <div className="flex items-start gap-2 min-w-0">
                <Layers
                  className={cn("w-4 h-4 shrink-0 mt-0.5", isDark ? "text-neutral-500" : "text-forest-f30")}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-xs font-semibold truncate",
                      isDark ? "text-neutral-100" : "text-forest-f60"
                    )}
                    title={ent.name || ent.id}
                  >
                    {ent.name || "Entity"}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] font-mono truncate",
                      isDark ? "text-neutral-500" : "text-forest-f30"
                    )}
                    title={ent.id}
                  >
                    <Hash className="w-3 h-3 inline-block align-middle opacity-70 mr-0.5" aria-hidden />
                    {ent.id}
                  </p>
                </div>
              </div>

              {editable ? (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-xs opacity-60", isDark ? "text-neutral-400" : "text-forest-f30")}>
                      Execution Interval:
                    </span>
                    <div className="min-w-[50px]">
                      <Dropdown
                        options={STAGGER_INTERVAL_OPTIONS}
                        value={getStaggerIntervalValue(ent)}
                        onChange={(value) => {
                          const parsed = parseInt(String(value), 10);
                          if (!Number.isFinite(parsed)) return;
                          applyUpdate((d) => {
                            const e = d.entities?.find((x) => x.id === ent.id);
                            if (!e) return;
                            const normalized = String(parsed);
                            const applyTo = (items?: KeywordAnalysisKeywordItem[]) => {
                              if (!items) return;
                              for (let i = 0; i < items.length; i += 1) {
                                items[i] = {
                                  ...items[i],
                                  stagger_interval_seconds: normalized,
                                };
                              }
                            };
                            applyTo(e.keywords);
                            applyTo(e.negatives);
                          });
                        }}
                        buttonClassName={cn(
                          "h-1.5 min-h-3.5 px-0.5 py-0 text-xs rounded",
                          isDark
                            ? "bg-neutral-700 border border-neutral-600 text-neutral-200"
                            : "bg-white border border-sandstorm-s40 text-forest-f60"
                        )}
                        menuClassName={cn(
                          "text-[20px]",
                          isDark ? "bg-neutral-800 border-neutral-700" : "bg-white border-sandstorm-s40"
                        )}
                        optionClassName={cn(
                          "text-[12px] py-0.5",
                          isDark ? "text-neutral-200 hover:bg-neutral-700" : "text-forest-f60 hover:bg-sandstorm-s10"
                        )}
                        align="left"
                      />
                    </div>
                  </div>
                  <p className={cn("text-[8px] opacity-80", isDark ? "text-neutral-400" : "text-forest-f30")}>
                    Delay between keyword additions
                  </p>
                </div>
              ) : null}

              {ent.rationale ? (
                <p
                  className={cn(
                    "text-[11px] leading-relaxed",
                    isDark ? "text-neutral-300" : "text-forest-f30"
                  )}
                >
                  {ent.rationale}
                </p>
              ) : null}

              {renderKeywordList(ent, "keywords")}
              {renderKeywordList(ent, "negatives")}
            </li>
          ))}
        </ul>
      )}

    </div>
  );
};
