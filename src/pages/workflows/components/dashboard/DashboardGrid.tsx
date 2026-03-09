import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDndContext,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DashboardWidget } from "./DashboardWidget";
import { useDashboardTheme } from "../../contexts/DashboardThemeContext";
import type {
  DashboardConfig,
  DashboardComponent,
  VisualizationType,
} from "../../types/dashboard";

const STAGGER_DELAY_MS = 500;

const CONFIG_DEBOUNCE_MS = 300;

interface DashboardGridProps {
  config: DashboardConfig;
  accountId: number | undefined;
  dashboardId: number | undefined;
  shareId?: string;
  showQueryDetails?: boolean;
  editable?: boolean;
  onConfigChange?: (config: DashboardConfig) => void;
  /** When > 0, triggers hard refresh (bypasses backend cache) for all widgets */
  hardRefreshTrigger?: number;
}

function SortableWidgetWrapper({
  component,
  layoutCols,
  accountId,
  dashboardId,
  shareId,
  staggerDelayMs,
  showQueryDetails,
  isExpanded,
  onExpandToggle,
  editable,
  effectiveVisualizationType,
  onVisualizationChange,
  hardRefreshTrigger,
}: {
  component: DashboardComponent;
  layoutCols: number;
  accountId: number | undefined;
  dashboardId: number | undefined;
  shareId?: string;
  staggerDelayMs: number;
  showQueryDetails: boolean;
  isExpanded: boolean;
  onExpandToggle: () => void;
  editable: boolean;
  effectiveVisualizationType?: VisualizationType;
  onVisualizationChange?: (componentId: string, type: VisualizationType) => void;
  hardRefreshTrigger?: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(component.id) });

  const { active, over } = useDndContext();
  const componentIdStr = String(component.id);
  const isDropTarget = active != null && over != null && over.id === componentIdStr && active.id !== componentIdStr;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandleProps = editable ? { ...attributes, ...listeners } : undefined;
  const { isDark } = useDashboardTheme();

  // Calculate grid span classes: when expanded, span full width; otherwise use component.cols
  const colSpanClass = isExpanded
    ? layoutCols === 4
      ? "md:col-span-4"
      : layoutCols === 3
        ? "md:col-span-3"
        : "md:col-span-2"
    : component.cols >= layoutCols
      ? layoutCols === 4
        ? "md:col-span-4"
        : layoutCols === 3
          ? "md:col-span-3"
          : "md:col-span-2"
      : component.cols >= 2
        ? "md:col-span-2"
        : "col-span-1";
  const rowSpanClass = component.rows >= 2 ? "row-span-2" : "row-span-1";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${colSpanClass} ${rowSpanClass} ${isDragging ? "z-50 opacity-90" : ""} ${isDropTarget ? `outline outline-2 outline-dotted outline-offset-2 rounded-xl ${isDark ? "outline-[#2DD4BF]" : "outline-forest-f40"}` : ""}`}
    >
      <DashboardWidget
        component={component}
        accountId={accountId}
        dashboardId={dashboardId}
        shareId={shareId}
        staggerDelayMs={staggerDelayMs}
        showQueryDetails={showQueryDetails}
        editable={editable}
        isExpanded={isExpanded}
        onExpandToggle={onExpandToggle}
        dragHandleProps={dragHandleProps}
        effectiveVisualizationType={effectiveVisualizationType}
        onVisualizationChange={onVisualizationChange}
        hardRefreshTrigger={hardRefreshTrigger}
      />
    </div>
  );
}

/** Strip data from components for persistence (avoid sending large payloads) */
function buildConfigForPersistence(
  config: DashboardConfig,
  orderedIds: string[],
  visualizationOverrides: Record<string, VisualizationType>,
  _expandedId: string | null,
  layoutCols: number
): DashboardConfig {
  const orderedComponents = orderedIds
    .map((id) => config.components.find((c) => String(c.id) === id))
    .filter((c): c is DashboardComponent => c != null);

  const components = orderedComponents.map((comp) => {
    const { data: _data, ...rest } = comp;
    const compId = String(comp.id);
    const rawCols = comp.cols ?? 1;
    // Never persist expanded state to cols — expand/minimize is transient UI state.
    // If rawCols === layoutCols, it was likely persisted from a previous expand; use 1
    // so minimize works on next load and we don't get stuck in "expanded" state.
    const cols = rawCols === layoutCols ? 1 : rawCols;
    return {
      ...rest,
      visualization_type: visualizationOverrides[compId] ?? comp.visualization_type,
      cols,
      rows: comp.rows ?? 1,
    };
  });

  return { layout: config.layout, components };
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  config,
  accountId,
  dashboardId,
  shareId,
  showQueryDetails = false,
  editable = false,
  onConfigChange,
  hardRefreshTrigger,
}) => {
  if (!config || !config.layout) {
    console.error("DashboardGrid: Invalid config or layout", config);
    return <div className="p-4 text-red-500">Invalid dashboard configuration</div>;
  }
  
  const { layout, components } = config;
  const { cols: layoutCols } = layout;

  const [orderedIds, setOrderedIds] = useState<string[]>(() =>
    components.map((c) => String(c.id))
  );

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const [visualizationOverrides, setVisualizationOverrides] = useState<
    Record<string, VisualizationType>
  >({});

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onConfigChangeRef = useRef(onConfigChange);
  onConfigChangeRef.current = onConfigChange;

  const configComponentIds = useMemo(
    () => components.map((c) => String(c.id)).join(","),
    [components]
  );

  useEffect(() => {
    setOrderedIds(components.map((c) => String(c.id)));
  }, [configComponentIds]);

  const notifyConfigChange = useCallback(
    (
      newOrderedIds: string[],
      newOverrides: Record<string, VisualizationType>,
      newExpandedId: string | null
    ) => {
      if (!onConfigChangeRef.current || !accountId || !dashboardId) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        const newConfig = buildConfigForPersistence(
          config,
          newOrderedIds,
          newOverrides,
          newExpandedId,
          layoutCols
        );
        onConfigChangeRef.current?.(newConfig);
      }, CONFIG_DEBOUNCE_MS);
    },
    [config, layoutCols, accountId, dashboardId]
  );

  const handleVisualizationChange = useCallback(
    (componentId: string, type: VisualizationType) => {
      const id = String(componentId);
      setVisualizationOverrides((prev) => {
        const next = { ...prev, [id]: type };
        if (editable && onConfigChange) {
          notifyConfigChange(orderedIds, next, null);
        }
        return next;
      });
    },
    [editable, onConfigChange, orderedIds, notifyConfigChange]
  );

  const orderedComponents = orderedIds
    .map((id) => components.find((c) => String(c.id) === id))
    .filter((c): c is DashboardComponent => c != null);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const activeId = String(active.id);
      const overId = String(over.id);
      setOrderedIds((prev) => {
        const oldIndex = prev.indexOf(activeId);
        const newIndex = prev.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1) return prev;
        const next = arrayMove(prev, oldIndex, newIndex);
        if (editable && onConfigChange) {
          notifyConfigChange(next, visualizationOverrides, null);
        }
        return next;
      });
    },
    [editable, onConfigChange, visualizationOverrides, notifyConfigChange]
  );

  const handleExpandToggle = useCallback((compId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(compId)) {
        next.delete(compId);
      } else {
        next.add(compId);
      }
      if (editable && onConfigChange) {
        notifyConfigChange(orderedIds, visualizationOverrides, null);
      }
      return next;
    });
  }, [editable, onConfigChange, orderedIds, visualizationOverrides, notifyConfigChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  // Generate grid classes based on dashboard layout columns
  const gridColsClass = 
    layoutCols === 1 ? "grid-cols-1" :
    layoutCols === 2 ? "grid-cols-2" :
    layoutCols === 3 ? "grid-cols-3" :
    layoutCols === 4 ? "grid-cols-4" :
    "grid-cols-2";

  const gridAutoRows = "minmax(min-content, auto)";

  const gridContent = (
    <div
      className={`grid gap-3 ${gridColsClass}`}
      style={{ gridAutoRows, alignItems: "start" }}
    >
      {orderedComponents.map((comp, i) =>
        editable ? (
          <SortableWidgetWrapper
            key={comp.id}
            component={comp}
            layoutCols={layoutCols}
            accountId={accountId}
            dashboardId={dashboardId}
            shareId={shareId}
            staggerDelayMs={i * STAGGER_DELAY_MS}
            showQueryDetails={showQueryDetails}
            isExpanded={expandedIds.has(String(comp.id))}
            onExpandToggle={() => handleExpandToggle(String(comp.id))}
            editable
            effectiveVisualizationType={visualizationOverrides[String(comp.id)]}
            onVisualizationChange={handleVisualizationChange}
            hardRefreshTrigger={hardRefreshTrigger}
          />
        ) : (
          <div
            key={comp.id}
            className={`${
              comp.cols >= layoutCols
                ? layoutCols === 4
                  ? "md:col-span-4"
                  : layoutCols === 3
                    ? "md:col-span-3"
                    : "md:col-span-2"
                : comp.cols >= 2
                  ? "md:col-span-2"
                  : "col-span-1"
            } ${comp.rows >= 2 ? "row-span-2" : "row-span-1"}`}
          >
            <DashboardWidget
              component={comp}
              accountId={accountId}
              dashboardId={dashboardId}
              shareId={shareId}
              staggerDelayMs={i * STAGGER_DELAY_MS}
              showQueryDetails={showQueryDetails}
              hardRefreshTrigger={hardRefreshTrigger}
            />
          </div>
        )
      )}
    </div>
  );

  if (editable) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedIds}
          strategy={rectSortingStrategy}
        >
          {gridContent}
        </SortableContext>
      </DndContext>
    );
  }

  return gridContent;
};
