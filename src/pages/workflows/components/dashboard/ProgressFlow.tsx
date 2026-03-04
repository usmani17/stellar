import React from "react";
import { Check, Database, ArrowDownToLine, LayoutGrid, Save, GitMerge, Filter } from "lucide-react";

export type ProgressStep =
  | "fetch"
  | "save"
  | "fetch2"
  | "join"
  | "analyze"
  | "display";

/** Simple pipeline: fetch → save → analyze → display */
export const SIMPLE_STEPS: ProgressStep[] = ["fetch", "save", "analyze", "display"];

/** Multi-GAQL pipeline: fetch → save → fetch2 → join → analyze → display */
export const MULTI_GAQL_STEPS: ProgressStep[] = [
  "fetch",
  "save",
  "fetch2",
  "join",
  "analyze",
  "display",
];

const STEP_LABELS: Record<ProgressStep, string> = {
  fetch: "Fetch",
  save: "Save",
  fetch2: "Fetch 2",
  join: "Join",
  analyze: "Analyze",
  display: "Display",
};
const STEP_ICONS: Record<ProgressStep, React.ReactNode> = {
  fetch: <Database className="w-5 h-5" aria-hidden />,
  save: <Save className="w-5 h-5" aria-hidden />,
  fetch2: <Database className="w-5 h-5" aria-hidden />,
  join: <GitMerge className="w-5 h-5" aria-hidden />,
  analyze: <Filter className="w-5 h-5" aria-hidden />,
  display: <LayoutGrid className="w-5 h-5" aria-hidden />,
};

interface ProgressFlowProps {
  activeStep: ProgressStep;
  steps: ProgressStep[];
  isDark?: boolean;
};

function getStepStatus(
  step: ProgressStep,
  activeStep: ProgressStep,
  steps: ProgressStep[]
): "pending" | "active" | "done" {
  const activeIdx = steps.indexOf(activeStep);
  const stepIdx = steps.indexOf(step);
  if (stepIdx < activeIdx) return "done";
  if (stepIdx === activeIdx) return "active";
  return "pending";
}

/** Spinner shown inside active node to indicate "working" */
function ActiveNodeSpinner() {
  return (
    <span className="progress-node-spinner" aria-hidden>
      <span className="progress-node-spinner-inner" />
    </span>
  );
}

export const ProgressFlow: React.FC<ProgressFlowProps> = ({
  activeStep,
  steps,
  isDark = false,
}) => (
  <div className="flex items-center justify-center gap-0 flex-wrap">
    {steps.map((step, i) => {
      const status = getStepStatus(step, activeStep, steps);
      const isLast = i === steps.length - 1;
      const pendingCls = isDark
        ? "bg-neutral-700 border-neutral-600 text-neutral-400"
        : "bg-sandstorm-s20 border-sandstorm-s50 text-forest-f30";
      const activeCls = "progress-node-active " + (isDark ? "bg-[#2DD4BF]/20 border-[#2DD4BF] text-[#2DD4BF]" : "bg-forest-f40/15 border-forest-f40 text-forest-f60");
      const doneCls = isDark ? "bg-[#2DD4BF]/25 border-[#2DD4BF] text-[#2DD4BF] progress-node-done" : "bg-forest-f0 border-forest-f40 text-forest-f40 progress-node-done";
      const isCompact = steps.length > 4;
      const iconSizeCls = isCompact ? "w-4 h-4" : "w-5 h-5";
      return (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center">
            <div
              className={`
                relative flex items-center justify-center rounded-xl border-2 transition-all duration-500 ease-out overflow-hidden
                ${isCompact ? "w-10 h-10" : "w-14 h-14"}
                ${status === "pending" ? pendingCls : ""}
                ${status === "active" ? activeCls : ""}
                ${status === "done" ? doneCls : ""}
              `}
            >
              {status === "done" ? (
                <Check className="w-7 h-7 shrink-0 progress-check" aria-hidden strokeWidth={2.5} />
              ) : status === "active" ? (
                <div className="relative flex items-center justify-center w-full h-full">
                  <ActiveNodeSpinner />
                  <span className={`absolute z-[1] ${iconSizeCls} ${isDark ? "text-[#2DD4BF]" : "text-forest-f60/90"}`}>
                    {STEP_ICONS[step]}
                  </span>
                </div>
              ) : (
                <span className={`flex items-center justify-center ${iconSizeCls}`}>{STEP_ICONS[step]}</span>
              )}
            </div>
            <span
              className={`mt-1.5 font-medium transition-colors duration-300 ${isCompact ? "text-[10px]" : "text-[12px]"} ${
                status === "pending"
                  ? isDark ? "text-neutral-500" : "text-forest-f30"
                  : isDark ? "text-neutral-200" : "text-forest-f60"
              }`}
            >
              {STEP_LABELS[step]}
            </span>
          </div>
          {!isLast && (
            <div
              className={`h-0.5 mx-0.5 rounded-full transition-all duration-500 ${isCompact ? "w-6" : "w-12"} ${
                status === "done"
                  ? (isDark ? "bg-[#2DD4BF]/60 progress-connector-done" : "bg-forest-f40/60 progress-connector-done")
                  : isDark ? "bg-neutral-600" : "bg-sandstorm-s40"
              }`}
              aria-hidden
            />
          )}
        </React.Fragment>
      );
    })}
  </div>
);
