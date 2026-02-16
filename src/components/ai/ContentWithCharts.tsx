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
    <div className="my-4 p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl text-sm">
      <div className="flex items-center gap-2 mb-3">
        <strong className="text-gray-900">
          {platform} · {campaign_type}
        </strong>
        {complete && (
          <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded font-medium">
            Complete
          </span>
        )}
      </div>
      {tableRows.length > 0 && (
        <div className="overflow-x-auto mb-3">
          <table className="min-w-full border border-gray-200 rounded">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-600">
                  Entity
                </th>
                <th className="border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-600">
                  Field
                </th>
                <th className="border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-600">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => (
                <tr key={i}>
                  <td className="border border-gray-200 px-3 py-2 text-gray-700">
                    {r.entity}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-700">
                    {r.field}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-700">
                    {r.value}
                  </td>
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
    <span className="block whitespace-pre-wrap text-left">
      {segments.map((seg, i) =>
        seg.type === "markdown" ? (
          <StellarMarkDown key={i} content={seg.content} type={type} />
        ) : seg.type === "chart" ? (
          <ChartRender key={i} config={seg.config} />
        ) : seg.type === "campaign-setup" ? (
          <CampaignSetupBlock key={i} data={seg.data} />
        ) : null
      )}
    </span>
  );
}
