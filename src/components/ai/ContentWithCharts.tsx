import {
  parseContentWithBlocks,
  type PdfReportData,
} from "../../utils/chartJsonParser";
import type { CampaignDraftData } from "../../services/ai/pixisChat";
import { ChartRender } from "./ChartRender";
import StellarMarkDown from "./StellarMarkDown";
import { CampaignDraftPreview } from "./CampaignDraftPreview";

function CampaignSetupBlock({ data }: { data: CampaignDraftData }) {

  const campaignState = data;
  console.log("Rendering CampaignSetupBlock with state:", campaignState);

  return (
      
      <CampaignDraftPreview
        className="asdasdsad"
        campaignState={campaignState}
        visible={campaignState.complete}
        layout="expandable"
        title={<div className="flex items-center gap-2 mb-3">
        <strong className="text-gray-900">
         Draft for {campaignState.platform} · {campaignState.campaign_type}
        </strong>
        {campaignState.complete && (
          <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded font-medium">
            Complete
          </span>
        )}
      </div>}
      />
  );
}

function PdfReportBlock({ data }: { data: PdfReportData }) {
  const pathPart = data.url.split("?")[0] || data.url;
  const isDocx = /\.docx$/i.test(pathPart);
  const formatLabel = isDocx ? "Word" : "PDF";
  const formattedDate = data.generated_at
    ? new Date(data.generated_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  return (
    <div className="my-3">
      <div className="flex items-center gap-3 p-4 bg-white border border-[#E8E8E3] border-l-4 border-l-[#136D6D] rounded-xl shadow-sm">
        {/* PDF or Word icon */}
        <div className="flex-shrink-0 w-12 h-12 flex flex-col items-center justify-center rounded-lg bg-[#136D6D]/10 text-[#136D6D]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span className="text-[9px] font-semibold mt-0.5 uppercase leading-tight">{formatLabel}</span>
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-[#072929] truncate">
            {data.title || "Report"}
          </div>
          {formattedDate && (
            <div className="text-[12px] text-[#556179] mt-0.5">{formattedDate}</div>
          )}
        </div>
        {/* Download button */}
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-[#136D6D] hover:bg-[#0f5a5a] rounded-lg transition-colors no-underline whitespace-nowrap"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download {formatLabel}
        </a>
      </div>
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
        ) : seg.type === "pdf-report" ? (
          <PdfReportBlock key={i} data={seg.data} />
        ) : null
      )}
    </div>
  );
}
