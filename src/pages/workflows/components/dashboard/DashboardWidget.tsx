import React, { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Maximize2,
  Minimize2,
  RotateCw,
  BarChart2,
  BarChart3,
  BarChartHorizontal,
  Table2,
  LineChart,
  PieChart,
  TrendingUp,
  LayoutDashboard,
  Filter,
  ScatterChart,
  Gauge,
} from "lucide-react";
import { getStepsFromQuery, type ProgressStepDef } from "./progressFlowConstants";
import { ProgressFlow } from "./ProgressFlow";
import { DashboardTable } from "./DashboardTable";
import { DashboardBarChart } from "./DashboardBarChart";
import { DashboardLineChart } from "./DashboardLineChart";
import { DashboardPieChart } from "./DashboardPieChart";
import { DashboardAreaChart } from "./DashboardAreaChart";
import { DashboardComboChart } from "./DashboardComboChart";
import { DashboardComparisonChart } from "./DashboardComparisonChart";
import { DashboardSingleMetric } from "./DashboardSingleMetric";
import { DashboardStackedBarChart } from "./DashboardStackedBarChart";
import { DashboardDonutChart } from "./DashboardDonutChart";
import { DashboardFunnelChart } from "./DashboardFunnelChart";
import { DashboardScatterPlot } from "./DashboardScatterPlot";
import { DashboardGaugeChart } from "./DashboardGaugeChart";
import { DashboardHorizontalBarChart } from "./DashboardHorizontalBarChart";
import { Dropdown } from "../../../../components/ui";
import type { DropdownOption } from "../../../../components/ui";
import type { DashboardComponent, LineChartDatum, PieChartDatum, SingleMetricDatum, FunnelChartDatum, VisualizationType } from "../../types/dashboard";
import { isMultiGaqlQuery, isMultiMetaQuery } from "../../types/dashboard";
import {
  getDashboardComponentDataStream,
  getSharedDashboardComponentDataStream,
} from "../../../../services/dashboard";
import { getMockDataForComponent } from "../../utils/dashboardMockData";
import { useDashboardTheme } from "../../contexts/DashboardThemeContext";
import { cn } from "../../../../lib/cn";

const VIZ_ICON_CLS = "w-4 h-4 shrink-0";

const isLocalEnv = import.meta.env.VITE_ENVIRONMENT === "local";

function getComponentErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const ax = err as { response?: { data?: unknown }; message?: string };
    if (ax.response?.data && typeof ax.response.data === "object" && "error" in ax.response.data) {
      const msg = (ax.response.data as { error: unknown }).error;
      return typeof msg === "string" ? msg : String(msg);
    }
    if (typeof ax.message === "string") return ax.message;
  }
  return typeof err === "string" ? err : "An error occurred";
}

const VIZ_ICONS: Record<VisualizationType, React.ReactNode> = {
  table: <Table2 className={VIZ_ICON_CLS} aria-hidden />,
  bar_chart: <BarChart2 className={VIZ_ICON_CLS} aria-hidden />,
  line_chart: <LineChart className={VIZ_ICON_CLS} aria-hidden />,
  pie_chart: <PieChart className={VIZ_ICON_CLS} aria-hidden />,
  area_chart: <TrendingUp className={VIZ_ICON_CLS} aria-hidden />,
  combo_chart: <BarChart2 className={VIZ_ICON_CLS} aria-hidden />,
  comparison_chart: <BarChart2 className={VIZ_ICON_CLS} aria-hidden />,
  single_metric: <LayoutDashboard className={VIZ_ICON_CLS} aria-hidden />,
  stacked_bar_chart: <BarChart3 className={VIZ_ICON_CLS} aria-hidden />,
  donut_chart: <PieChart className={VIZ_ICON_CLS} aria-hidden />,
  funnel_chart: <Filter className={VIZ_ICON_CLS} aria-hidden />,
  scatter_plot: <ScatterChart className={VIZ_ICON_CLS} aria-hidden />,
  gauge_chart: <Gauge className={VIZ_ICON_CLS} aria-hidden />,
  horizontal_bar_chart: <BarChartHorizontal className={VIZ_ICON_CLS} aria-hidden />,
};

const VIZ_TYPE_OPTIONS: DropdownOption<VisualizationType>[] = [
  { value: "table", label: "Table" },
  { value: "bar_chart", label: "Bar chart" },
  { value: "line_chart", label: "Line chart" },
  { value: "pie_chart", label: "Pie chart" },
  { value: "area_chart", label: "Area chart" },
  { value: "combo_chart", label: "Combo chart" },
  { value: "comparison_chart", label: "Comparison chart" },
  { value: "single_metric", label: "Single metric" },
  { value: "stacked_bar_chart", label: "Stacked bar" },
  { value: "donut_chart", label: "Donut chart" },
  { value: "funnel_chart", label: "Funnel" },
  { value: "scatter_plot", label: "Scatter plot" },
  { value: "gauge_chart", label: "Gauge" },
  { value: "horizontal_bar_chart", label: "Horizontal bar" },
];

interface DashboardWidgetProps {
  component: DashboardComponent;
  accountId: number | undefined;
  dashboardId: number | undefined;
  shareId?: string;
  staggerDelayMs?: number;
  showQueryDetails?: boolean;
  editable?: boolean;
  isExpanded?: boolean;
  onExpandToggle?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  /** Override chart type (e.g., user switched from line to bar in demo) */
  effectiveVisualizationType?: VisualizationType;
  onVisualizationChange?: (componentId: string, type: VisualizationType) => void;
  /** When > 0, triggers hard refresh (bypasses backend cache) */
  hardRefreshTrigger?: number;
  /** Called when user renames the widget title (editable mode); parent should persist via update config API */
  onTitleChange?: (componentId: string, title: string) => void;
}

type WidgetStatus =
  | "pending"
  | "loading"
  | "ready"
  | "error";

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  component,
  accountId,
  dashboardId,
  shareId,
  staggerDelayMs = 0,
  editable = false,
  isExpanded = false,
  onExpandToggle,
  dragHandleProps,
  effectiveVisualizationType,
  onVisualizationChange,
  hardRefreshTrigger = 0,
  onTitleChange,
}) => {
  const vizType = effectiveVisualizationType ?? component.visualization_type;
  const [status, setStatus] = useState<WidgetStatus>("pending");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(component.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<DashboardComponent>({} as DashboardComponent);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [streamActiveStep, setStreamActiveStep] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const mountedRef = useRef(true);
  const hasFetchedRef = useRef(false);
  const inFlightRef = useRef(false);
  const lastComponentIdRef = useRef(component.id);
  const isMulti = isMultiGaqlQuery(component.query) || isMultiMetaQuery(component.query);
  const steps: ProgressStepDef[] =
    (component.progress_steps?.length && component.progress_steps) ||
    getStepsFromQuery(component.query);
  const availableVizOptions = component.suggested_types?.length
    ? VIZ_TYPE_OPTIONS.filter(
        (opt) => opt.value === component.visualization_type || component.suggested_types!.includes(opt.value)
      )
    : VIZ_TYPE_OPTIONS;

  const handleRefresh = () => {
    hasFetchedRef.current = false;
    setErrorMessage(null);
    setStatus("pending");
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    if (!isEditingTitle) setEditTitleValue(component.title);
  }, [component.title, isEditingTitle]);

  useEffect(() => {
    if (isEditingTitle) titleInputRef.current?.focus();
  }, [isEditingTitle]);

  const saveTitle = () => {
    const trimmed = editTitleValue.trim();
    if (trimmed && trimmed !== component.title) {
      onTitleChange?.(component.id, trimmed);
    }
    setIsEditingTitle(false);
  };

  useEffect(() => {
    if (hardRefreshTrigger > 0) hasFetchedRef.current = false;
  }, [hardRefreshTrigger]);

  useEffect(() => {
    if (lastComponentIdRef.current !== component.id) {
      lastComponentIdRef.current = component.id;
      hasFetchedRef.current = false;
      inFlightRef.current = false;
    }
    if (hasFetchedRef.current || inFlightRef.current) return;

    mountedRef.current = true;
    inFlightRef.current = true;
    const run = async () => {
      if (refreshTrigger === 0 && staggerDelayMs > 0) await new Promise((r) => setTimeout(r, staggerDelayMs));
      if (!mountedRef.current) return;

      const componentForMock = {
        ...component,
        visualization_type: vizType,
      };

      if (shareId) {
        setStatus("loading");
        setStreamActiveStep(null);
        setErrorMessage(null);
        try {
          const result = await getSharedDashboardComponentDataStream(
            shareId,
            component.id,
            component,
            (event) => {
              if (!mountedRef.current) return;
              setStreamActiveStep(event.stage);
              if (event.stage === "display" && event.data != null) {
                setData(event.data as DashboardComponent);
                setStatus("ready");
                setStreamActiveStep(null);
                setErrorMessage(null);
                hasFetchedRef.current = true;
              }
            },
            component.channel_id ?? undefined,
            component.profile_id ?? undefined,
            hardRefreshTrigger > 0
          );
          if (mountedRef.current && !hasFetchedRef.current) {
            setData(result);
            setStatus("ready");
            setStreamActiveStep(null);
            setErrorMessage(null);
          }
          hasFetchedRef.current = true;
        } catch (err) {
          setStreamActiveStep(null);
          setErrorMessage(getComponentErrorMessage(err));
          setStatus("error");
        } finally {
          inFlightRef.current = false;
        }
        return;
      }

      if (accountId && dashboardId) {
        setStatus("loading");
        setStreamActiveStep(null);
        setErrorMessage(null);
        try {
          const result = await getDashboardComponentDataStream(
            accountId,
            dashboardId,
            component.id,
            component,
            (event) => {
              if (!mountedRef.current) return;
              setStreamActiveStep(event.stage);
              if (event.stage === "display" && event.data != null) {
                setData(event.data as DashboardComponent);
                setStatus("ready");
                setStreamActiveStep(null);
                setErrorMessage(null);
                hasFetchedRef.current = true;
              }
            },
            component.channel_id ?? undefined,
            component.profile_id ?? undefined,
            hardRefreshTrigger > 0
          );
          if (mountedRef.current && !hasFetchedRef.current) {
            setData(result);
            setStatus("ready");
            setStreamActiveStep(null);
            setErrorMessage(null);
          }
          hasFetchedRef.current = true;
          return;
        } catch (err) {
          setStreamActiveStep(null);
          setErrorMessage(getComponentErrorMessage(err));
          setStatus("error");
          return;
        } finally {
          inFlightRef.current = false;
        }
      }

      setStatus("loading");
      const rows: DashboardComponent = {
        data: getMockDataForComponent(componentForMock),
      } as DashboardComponent;
      setData(rows);
      setStatus("ready");
      hasFetchedRef.current = true;
      inFlightRef.current = false;
    };
    void run();
    return () => {
      mountedRef.current = false;
      inFlightRef.current = false;
    };
  }, [component, staggerDelayMs, isMulti, shareId, vizType, accountId, dashboardId, refreshTrigger, hardRefreshTrigger]);

  function getActiveStepId(s: WidgetStatus): string {
    if (s === "ready") return steps[steps.length - 1]?.id ?? "display";
    if (s === "error") return steps[0]?.id ?? "fetch";
    if (s === "loading") return steps[0]?.id ?? "fetch";
    return steps[0]?.id ?? "fetch";
  }
  const activeStep: string = streamActiveStep ?? getActiveStepId(status);
  const { isDark } = useDashboardTheme();

  return (
    <div
      className={cn(
        "rounded-xl flex flex-col overflow-hidden transition-all duration-200",
        vizType === "single_metric" ? "min-h-[140px]" : "min-h-[280px]",
        isDark
          ? "border border-neutral-700 bg-neutral-800 shadow-lg hover:shadow-xl"
          : "border border-sandstorm-s40/80 bg-white shadow-[0_1px_2px_rgba(7,41,41,0.04)] hover:shadow-[0_4px_12px_rgba(7,41,41,0.06)]"
      )}
    >
      <div
        className={`flex flex-col border-b flex-shrink-0 ${isDark
          ? "border-neutral-700 bg-neutral-800/80"
          : "border-sandstorm-s40/60 bg-sandstorm-s5/50"
          }`}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {editable && dragHandleProps && (
            <div
              {...dragHandleProps}
              className="p-1 -ml-1 rounded-lg cursor-grab active:cursor-grabbing hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
              aria-label="Drag to reorder"
            >
              <GripVertical className={`w-4 h-4 ${isDark ? "text-neutral-400" : "text-forest-f30"}`} />
            </div>
          )}
          <div
            className={`w-1 h-6 rounded-full shrink-0 ${isDark ? "bg-[#2DD4BF]/60" : "bg-forest-f40/40"}`}
            aria-hidden
          />
          {editable && onTitleChange && isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") {
                  setEditTitleValue(component.title);
                  setIsEditingTitle(false);
                  titleInputRef.current?.blur();
                }
              }}
              className={cn(
                "text-[12px] font-semibold flex-1 min-w-0 rounded px-1.5 py-0.5 -mx-1.5",
                isDark
                  ? "text-neutral-100 bg-neutral-700 border border-neutral-600 focus:border-[#2DD4BF]/60 outline-none"
                  : "text-forest-f60 bg-sandstorm-s20 border border-sandstorm-s40 focus:border-forest-f40 outline-none"
              )}
              aria-label="Widget title"
            />
          ) : (
            <h3
              role={editable && onTitleChange ? "button" : undefined}
              tabIndex={editable && onTitleChange ? 0 : undefined}
              onClick={editable && onTitleChange ? () => { setEditTitleValue(component.title); setIsEditingTitle(true); } : undefined}
              onKeyDown={
                editable && onTitleChange
                  ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditTitleValue(component.title); setIsEditingTitle(true); } }
                  : undefined
              }
              className={cn(
                "text-[12px] font-semibold truncate flex-1 min-w-0",
                isDark ? "text-neutral-100" : "text-forest-f60",
                editable && onTitleChange && "cursor-text hover:underline decoration-dotted"
              )}
            >
              {component.title}
            </h3>
          )}
          <div className="flex items-center gap-1 shrink-0">
            {editable && onExpandToggle && (
              <button
                type="button"
                onClick={onExpandToggle}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors ${isDark ? "text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200" : "text-forest-f30 hover:bg-sandstorm-s20 hover:text-forest-f60"
                  }`}
                aria-label={isExpanded ? "Collapse" : "Expand to full width"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
            {editable && onVisualizationChange && vizType !== "single_metric" && (
              <Dropdown<VisualizationType>
                options={availableVizOptions}
                value={vizType}
                onChange={(value: VisualizationType) =>
                  onVisualizationChange(component.id, value)
                }
                closeOnSelect
                position="bottom"
                width="w-36"
                menuClassName="!min-w-[140px]"
                className="shrink-0 w-8 h-8 flex items-center justify-center"
                renderButton={(
                  _opt: DropdownOption<VisualizationType> | null,
                  isOpen: boolean,
                  toggle: () => void
                ) => (
                  <button
                    type="button"
                    onClick={toggle}
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isDark
                      ? "text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
                      : "text-forest-f30 hover:bg-sandstorm-s20 hover:text-forest-f60"
                      }`}
                    aria-label={`Chart type: ${vizType.replace(/_/g, " ")}. Click to change.`}
                  >
                    {VIZ_ICONS[vizType]}
                    {isOpen ? <ChevronUp className="w-2.5 h-2.5 ml-0.5" /> : <ChevronDown className="w-2.5 h-2.5 ml-0.5" />}
                  </button>
                )}
                renderOption={(opt: DropdownOption<VisualizationType>, isSelected: boolean) => (
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px]">
                      {VIZ_ICONS[opt.value as VisualizationType]}
                      {opt.label}
                    </span>
                    {isSelected && (
                      <svg
                        className="w-3 h-3 text-forest-f40 shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                )}
              />
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={status !== "ready" && status !== "error"}
              className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isDark
                  ? "text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  : "text-forest-f30 hover:bg-sandstorm-s20 hover:text-forest-f60 disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
              aria-label="Refresh this widget"
            >
              <RotateCw className={`w-4 h-4 ${status !== "ready" ? "animate-spin" : ""}`} aria-hidden />
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        {status === "error" ? (
          <div
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-3 py-8 px-4 text-center",
              isDark ? "text-neutral-300" : "text-forest-f30"
            )}
          >
            <p className="text-sm font-medium">Failed to load</p>
            {isLocalEnv && errorMessage ? (
              <p className="text-xs max-w-full break-words">{errorMessage}</p>
            ) : (
              <p className="text-xs">Use the refresh button above to retry.</p>
            )}
          </div>
        ) : status === "ready" && data?.error ? (
          <div
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-3 py-8 px-4 text-center",
              isDark ? "text-red-300/90" : "text-red-r30"
            )}
          >
            <p className="text-sm font-medium">Query error</p>
            {isLocalEnv ? (
              <p className="text-xs max-w-full break-words">{data.error}</p>
            ) : (
              <p className="text-xs">An error occurred while loading this component.</p>
            )}
            <p className={cn("text-xs", isDark ? "text-neutral-400" : "text-forest-f30")}>
              Use the refresh button above to retry.
            </p>
          </div>
        ) : status !== "ready" ? (
          <div className="flex-1 flex items-center justify-center py-8 px-4">
            <ProgressFlow
              activeStep={activeStep as React.ComponentProps<typeof ProgressFlow>["activeStep"]}
              steps={steps as unknown as React.ComponentProps<typeof ProgressFlow>["steps"]}
              isDark={isDark}
            />
          </div>
        ) : vizType === "table" ? (
          <div className="flex-1 min-h-0 overflow-auto dashboard-table-wrapper pb-4">
            <DashboardTable key={component.id} component={component} data={data.data} isDark={isDark} />
          </div>
        ) : vizType === "line_chart" ? (
          <div className="flex-1 min-h-[200px] flex items-center justify-center px-3 pb-3">
            <DashboardLineChart component={component} data={data.data as LineChartDatum[]} isDark={isDark} />
          </div>
        ) : vizType === "pie_chart" ? (
          <div className="flex-1 min-h-[200px] flex items-center justify-center px-3 pb-3">
            <DashboardPieChart component={component} data={data.data as PieChartDatum[]} isDark={isDark} />
          </div>
        ) : vizType === "area_chart" ? (
          <div className="flex-1 min-h-[200px] flex items-center justify-center px-3 pb-3">
            <DashboardAreaChart component={component} data={data.data} isDark={isDark} />
          </div>
        ) : vizType === "combo_chart" ? (
          <div className="flex-1 min-h-[200px] flex items-center justify-center px-3 pb-3">
            <DashboardComboChart component={component} data={data.data} isDark={isDark} />
          </div>
        ) : vizType === "comparison_chart" ? (
          <div className="flex-1 min-h-[200px] flex items-center justify-center px-3 pb-3">
            <DashboardComparisonChart component={component} data={data.data} isDark={isDark} />
          </div>
        ) : vizType === "single_metric" ? (
          <div className="flex flex-col items-start w-full">
            <DashboardSingleMetric component={component} data={data.data as SingleMetricDatum[]} isDark={isDark} />
          </div>
        ) : vizType === "stacked_bar_chart" ? (
          <div className="flex-1 min-h-[200px] flex items-center justify-center px-3 pb-3">
            <DashboardStackedBarChart component={component} data={data.data as Record<string, unknown>[]} isDark={isDark} />
          </div>
        ) : vizType === "donut_chart" ? (
          <div className="flex-1 min-h-[200px] flex items-center justify-center px-3 pb-3">
            <DashboardDonutChart component={component} data={data.data as PieChartDatum[]} isDark={isDark} />
          </div>
        ) : vizType === "funnel_chart" ? (
          <div className="flex-1 min-h-[200px] flex items-center justify-center px-3 pb-3">
            <DashboardFunnelChart component={component} data={data.data as FunnelChartDatum[]} isDark={isDark} />
          </div>
        ) : vizType === "scatter_plot" ? (
          <div className="flex-1 min-h-[200px] flex items-center justify-center px-3 pb-3">
            <DashboardScatterPlot component={component} data={data.data as Record<string, unknown>[]} isDark={isDark} />
          </div>
        ) : vizType === "gauge_chart" ? (
          <div className="flex-1 min-h-[200px] flex items-center justify-center px-3 pb-3">
            <DashboardGaugeChart component={component} data={data.data as Record<string, unknown>[]} isDark={isDark} />
          </div>
        ) : vizType === "horizontal_bar_chart" ? (
          <div className="flex-1 min-h-[200px] flex items-center justify-center px-3 pb-3">
            <DashboardHorizontalBarChart component={component} data={data.data as Record<string, unknown>[]} isDark={isDark} />
          </div>
        ) : (
          <div className="flex-1 min-h-[200px] flex items-center justify-center px-3 pb-3">
            <DashboardBarChart component={component} data={data.data} isDark={isDark} />
          </div>
        )}
      </div>
    </div>
  );
};
