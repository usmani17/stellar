import React from "react";
import { Hash, Layers } from "lucide-react";
import { cn } from "../../../../lib/cn";

/** Shape persisted by the agent / returned in ```keyword-analysis``` blocks. */
export interface KeywordAnalysisKeywordItem {
  keyword: string;
  match_type: string;
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
        )
      : [];
    const negatives = Array.isArray(ent.negatives)
      ? ent.negatives.filter(
          (k): k is KeywordAnalysisKeywordItem =>
            isRecord(k) &&
            typeof k.keyword === "string" &&
            typeof k.match_type === "string"
        )
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

const KIND_LABELS: Record<string, string> = {
  add_keyword: "Add keywords",
  add_negative_keyword: "Add negative keywords",
};

interface KeywordAnalysisResultViewProps {
  data: KeywordAnalysisStoredPayload;
  isDark: boolean;
  className?: string;
}

export const KeywordAnalysisResultView: React.FC<KeywordAnalysisResultViewProps> = ({
  data,
  isDark,
  className,
}) => {
  const entities = data.entities ?? [];
  const kindLabel =
    (data.analysis_kind && KIND_LABELS[data.analysis_kind]) || data.analysis_kind || "Keyword analysis";
  const metaParts = [data.platform, data.entity_type].filter(Boolean).join(" · ");

  return (
    <div className={cn("space-y-3", className)}>
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
      </div>

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

              {(ent.keywords?.length ?? 0) > 0 ? (
                <div>
                  <p
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wide mb-1.5",
                      isDark ? "text-neutral-400" : "text-forest-f30"
                    )}
                  >
                    Keywords
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ent.keywords!.map((k, i) => (
                      <span
                        key={`${k.keyword}-${i}`}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] border",
                          isDark
                            ? "bg-forest-f50/25 text-neutral-100 border-forest-f40/35"
                            : "bg-forest-f40/10 text-forest-f60 border-forest-f40/25"
                        )}
                      >
                        <span className="max-w-[220px] truncate" title={k.keyword}>
                          {k.keyword}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded px-1 py-px text-[9px] font-semibold uppercase",
                            isDark ? "bg-neutral-800 text-neutral-400" : "bg-sandstorm-s0 text-forest-f30"
                          )}
                        >
                          {k.match_type}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {(ent.negatives?.length ?? 0) > 0 ? (
                <div>
                  <p
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wide mb-1.5",
                      isDark ? "text-neutral-400" : "text-forest-f30"
                    )}
                  >
                    Negative keywords
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ent.negatives!.map((k, i) => (
                      <span
                        key={`n-${k.keyword}-${i}`}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] border",
                          isDark
                            ? "bg-neutral-800/80 text-neutral-200 border-neutral-600"
                            : "bg-sandstorm-s20 text-forest-f60 border-sandstorm-s40"
                        )}
                      >
                        <span className="max-w-[220px] truncate" title={k.keyword}>
                          {k.keyword}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded px-1 py-px text-[9px] font-semibold uppercase",
                            isDark ? "bg-neutral-800 text-neutral-400" : "bg-white/80 text-forest-f30"
                          )}
                        >
                          {k.match_type}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
