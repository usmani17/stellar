import {
  parseContentWithBlocks,
  type CampaignSetupData,
} from "../../utils/chartJsonParser";
import type { CampaignSetupState } from "../../types/agent";
import { ChartRender } from "./ChartRender";
import StellarMarkDown from "./StellarMarkDown";
import { CampaignDraftPreview } from "./CampaignDraftPreview";

function formatDraftValue(val: unknown): string {
  if (val == null) return "";
  if (Array.isArray(val)) return val.length === 0 ? "[]" : `[${val.length} items]`;
  if (typeof val === "object")
    return (
      JSON.stringify(val).slice(0, 60) +
      (JSON.stringify(val).length > 60 ? "…" : "")
    );
  return String(val);
}

function CampaignSetupBlock({ data }: { data: CampaignSetupData }) {
  const { draft, questions, platform, campaign_type, complete, validation_error } =
    data;

  const tableRows: { entity: string; field: string; value: string }[] = [];
  const draftFlat: Record<string, unknown> = {};
  for (const [entity, fields] of Object.entries(draft)) {
    if (fields && typeof fields === "object") {
      for (const [key, val] of Object.entries(fields)) {
        if (val != null && val !== "") {
          tableRows.push({
            entity,
            field: key,
            value: formatDraftValue(val),
          });
          draftFlat[entity ? `${entity}.${key}` : key] = val;
        }
      }
    }
  }

  const validationErrors: string[] = validation_error
    ? Object.entries(validation_error).map(([k, v]) => `${k}: ${v}`)
    : [];

  const campaignState = {
    campaign_draft: draftFlat,
    campaign_type,
    platform,
    complete,
    validation_errors: validationErrors,
    current_questions_schema: Object.entries(questions).flatMap(([entity, qs]) =>
      Object.entries(qs || {}).map(([key, hint]) => ({
        key: entity ? `${entity}.${key}` : key,
        label: hint || key,
        type: "string",
        ui_hint: "text",
      }))
    ),
  } as CampaignSetupState;

  return (
    <div className="my-4 p-4 bg-[#F9F9F6] border border-[#E8E8E3] rounded-xl text-sm shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <strong className="text-[#072929] font-semibold">
          {platform} · {campaign_type}
        </strong>
        {complete && (
          <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded font-medium">
            Complete
          </span>
        )}
      </div>
      {tableRows.length > 0 && (
        <div className="overflow-x-auto mb-3 rounded-lg border border-[#E8E8E3] overflow-hidden">
          <table className="assistant-table min-w-full w-full border-collapse">
            <thead>
              <tr>
                <th className="assistant-table-th">Entity</th>
                <th className="assistant-table-th">Field</th>
                <th className="assistant-table-th">Value</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => (
                <tr key={i}>
                  <td className="assistant-table-td">{r.entity}</td>
                  <td className="assistant-table-td">{r.field}</td>
                  <td className="assistant-table-td">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CampaignDraftPreview
        campaignState={campaignState}
        visible={!complete}
        layout="expandable"
      />
    </div>
  );
}

interface ContentWithChartsProps {
  content: string;
  type?: "human" | "ai" | "tool" | "system";
}

/**
 * Renders message content with support for chart-json and campaign-setup blocks.
 * Parses ```chart-json and ```campaign-setup, renders Recharts and campaign draft UI.
 */
export function ContentWithCharts({ content, type = "ai" }: ContentWithChartsProps) {
  if (!content) return null;

  const segments = parseContentWithBlocks(content);

  return (
    <div className="block text-left space-y-4">
      {segments.map((seg, i) =>
        seg.type === "markdown" ? (
          <StellarMarkDown key={i} content={seg.content} type={type} />
        ) : seg.type === "chart" ? (
          <ChartRender key={i} config={seg.config} />
        ) : seg.type === "campaign-setup" ? (
          <CampaignSetupBlock key={i} data={seg.data} />
        ) : null
      )}
    </div>
  );
}
