import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  DndContext,
  pointerWithin,
  closestCorners,
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
  DashboardLayout,
  VisualizationType,
  ActionRule,
} from "../../types/dashboard";

const STAGGER_DELAY_MS = 0;

const CONFIG_DEBOUNCE_MS = 0;

/** Better for variable-sized items (expanded vs collapsed): cursor-first, then proximity fallback */
function gridCollisionDetection(args: Parameters<typeof pointerWithin>[0]) {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : closestCorners(args);
}

/** Payload for single-component update; backend merges and keeps others as-is */
export interface DashboardComponentUpdatePayload {
  layout: DashboardLayout;
  component: Omit<DashboardComponent, "data">;
}

interface DashboardGridProps {
  config: DashboardConfig;
  accountId: number | undefined;
  dashboardId: number | undefined;
  shareId?: string;
  showQueryDetails?: boolean;
  editable?: boolean;
  onConfigChange?: (config: DashboardConfig) => void;
  /** When set, single-component updates (title, viz, expand) send only this component; backend keeps others as-is */
  onComponentChange?: (payload: DashboardComponentUpdatePayload) => void;
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
  onTitleChange,
  onDisplayColumnsChange,
  onCustomColumnsChange,
  onManageColumnsApply,
  onWidgetDelete,
  onActionsChange,
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
  onTitleChange?: (componentId: string, title: string) => void;
  onDisplayColumnsChange?: (componentId: string, displayColumns: Array<{ key: string; label: string }>) => void;
  onCustomColumnsChange?: (componentId: string, customColumns: Array<{ key: string; label: string; formula: string }>) => void;
  onManageColumnsApply?: (
    componentId: string,
    displayColumns: Array<{ key: string; label: string }>,
    customColumns: Array<{ key: string; label: string; formula: string }>,
    columnOrder?: string[]
  ) => void;
  onWidgetDelete?: (componentId: string) => void;
  onActionsChange?: (componentId: string, actions: ActionRule[]) => void;
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
    transform: CSS.Translate.toString(transform),
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
        onTitleChange={onTitleChange}
        onDisplayColumnsChange={onDisplayColumnsChange}
        onCustomColumnsChange={onCustomColumnsChange}
        onManageColumnsApply={onManageColumnsApply}
        onWidgetDelete={onWidgetDelete}
        onActionsChange={onActionsChange}
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
  expandedIds: Set<string>,
  layoutCols: number
): DashboardConfig {
  const orderedComponents = orderedIds
    .map((id) => config.components.find((c) => String(c.id) === id))
    .filter((c): c is DashboardComponent => c != null);

  const components = orderedComponents.map((comp) => {
    const { data: _data, ...rest } = comp;
    const compId = String(comp.id);
    const rawCols = comp.cols ?? 1;
    // Persist full-width when expanded; otherwise use component cols (normalize saved full-width to 1 when not expanded)
    const cols = expandedIds.has(compId)
      ? layoutCols
      : rawCols === layoutCols
        ? 1
        : rawCols;
    return {
      ...rest,
      visualization_type: visualizationOverrides[compId] ?? comp.visualization_type,
      cols,
      rows: comp.rows ?? 1,
    };
  });

  return { layout: config.layout, components } as DashboardConfig;
}

function componentForPayload(comp: DashboardComponent): Omit<DashboardComponent, "data"> {
  const { data: _d, ...rest } = comp;
  return rest;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  config,
  accountId,
  dashboardId,
  shareId,
  showQueryDetails = false,
  editable = false,
  onConfigChange,
  onComponentChange,
  hardRefreshTrigger,
}) => {
  if (!config || !config.layout) {
    console.error("DashboardGrid: Invalid config or layout", config);
    return <div className="p-4 text-red-500">Invalid dashboard configuration</div>;
  }

  const components = useMemo(
    () => (config.components || []).filter((c) => !c.deleted_at),
    [config.components]
  );
  const { layout } = config;
  const { cols: layoutCols } = layout;

  const [orderedIds, setOrderedIds] = useState<string[]>(() =>
    components.map((c) => String(c.id))
  );

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    new Set(components.filter((c) => (c.cols ?? 1) === layoutCols).map((c) => String(c.id)))
  );

  const [visualizationOverrides, setVisualizationOverrides] = useState<
    Record<string, VisualizationType>
  >({});

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onConfigChangeRef = useRef(onConfigChange);
  const expandedIdsRef = useRef(expandedIds);
  const configRef = useRef(config);
  const lastExpandSentRef = useRef<{ compId: string; cols: number; ts: number } | null>(null);
  onConfigChangeRef.current = onConfigChange;
  expandedIdsRef.current = expandedIds;
  configRef.current = config;

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
      _newExpandedIds: Set<string>
    ) => {
      if (!onConfigChangeRef.current || !accountId || !dashboardId) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        // Use refs to get latest state when callback fires (handles expand-then-drag race)
        const cfg = configRef.current;
        const cols = cfg?.layout?.cols ?? layoutCols;
        const expandedToUse = expandedIdsRef.current;
        const newConfig = buildConfigForPersistence(
          cfg,
          newOrderedIds,
          newOverrides,
          expandedToUse,
          cols
        );
        onConfigChangeRef.current?.(newConfig);
      }, CONFIG_DEBOUNCE_MS);
    },
    [config, layoutCols, accountId, dashboardId]
  );

  const handleVisualizationChange = useCallback(
    (componentId: string, type: VisualizationType) => {
      const id = String(componentId);
      const comp = config.components.find((c) => String(c.id) === id);
      if (onComponentChange && comp && accountId && dashboardId) {
        onComponentChange({
          layout: config.layout,
          component: { ...componentForPayload(comp), visualization_type: type },
        });
      }
      setVisualizationOverrides((prev) => {
        const next = { ...prev, [id]: type };
        if (editable && onConfigChange && !onComponentChange) {
          notifyConfigChange(orderedIds, next, expandedIds);
        }
        return next;
      });
    },
    [config, editable, onConfigChange, onComponentChange, accountId, dashboardId, orderedIds, expandedIds, notifyConfigChange]
  );

  const handleTitleChange = useCallback(
    (componentId: string, title: string) => {
      if (!config) return;
      const comp = config.components.find((c) => String(c.id) === componentId);
      if (!comp) return;
      if (onComponentChange && accountId && dashboardId) {
        onComponentChange({
          layout: config.layout,
          component: { ...componentForPayload(comp), title },
        });
        return;
      }
      if (onConfigChange) {
        const newComponents = config.components.map((c) =>
          String(c.id) === componentId ? { ...c, title } : c
        );
        onConfigChange({ ...config, components: newComponents });
      }
    },
    [config, onConfigChange, onComponentChange, accountId, dashboardId]
  );

  const handleDisplayColumnsChange = useCallback(
    (componentId: string, displayColumns: Array<{ key: string; label: string }>) => {
      if (!config) return;
      const comp = config.components.find((c) => String(c.id) === componentId);
      if (!comp || !onComponentChange || !accountId || !dashboardId) return;
      onComponentChange({
        layout: config.layout,
        component: { ...componentForPayload(comp), display_columns: displayColumns },
      });
    },
    [config, onComponentChange, accountId, dashboardId]
  );

  const handleCustomColumnsChange = useCallback(
    (componentId: string, customColumns: Array<{ key: string; label: string; formula: string }>) => {
      if (!config) return;
      const comp = config.components.find((c) => String(c.id) === componentId);
      if (!comp || !onComponentChange || !accountId || !dashboardId) return;
      onComponentChange({
        layout: config.layout,
        component: { ...componentForPayload(comp), custom_columns: customColumns },
      });
    },
    [config, onComponentChange, accountId, dashboardId]
  );

  const handleManageColumnsApply = useCallback(
    (
      componentId: string,
      displayColumns: Array<{ key: string; label: string }>,
      customColumns: Array<{ key: string; label: string; formula: string }>,
      columnOrder?: string[]
    ) => {
      if (!config) return;
      const comp = config.components.find((c) => String(c.id) === componentId);
      if (!comp || !onComponentChange || !accountId || !dashboardId) return;
      onComponentChange({
        layout: config.layout,
        component: {
          ...componentForPayload(comp),
          display_columns: displayColumns,
          custom_columns: customColumns,
          ...(columnOrder && columnOrder.length > 0 && { column_order: columnOrder }),
        },
      });
    },
    [config, onComponentChange, accountId, dashboardId]
  );

  const handleWidgetDelete = useCallback(
    (componentId: string) => {
      if (!config) return;
      if (onComponentChange && accountId && dashboardId) {
        onComponentChange({
          layout: config.layout,
          component: {
            id: componentId,
            deleted_at: new Date().toISOString(),
          } as Omit<DashboardComponent, "data">,
        });
      } else if (onConfigChange) {
        const filtered = config.components
          .filter((c) => String(c.id) !== componentId)
          .map((c) => componentForPayload(c));
        onConfigChange({
          ...config,
          components: filtered,
        } as DashboardConfig);
      }
    },
    [config, onConfigChange, onComponentChange, accountId, dashboardId]
  );

  const handleActionsChange = useCallback(
    (componentId: string, actions: ActionRule[]) => {
      if (!config) return;
      const comp = config.components.find((c) => String(c.id) === componentId);
      if (!comp) return;
      if (onComponentChange && accountId && dashboardId) {
        onComponentChange({
          layout: config.layout,
          component: { ...componentForPayload(comp), actions },
        });
      }
    },
    [config, onComponentChange, accountId, dashboardId]
  );

  const orderedComponents = orderedIds
    .map((id) => components.find((c) => String(c.id) === id))
    .filter((c): c is DashboardComponent => c != null);

  const kpiComponents = orderedComponents.filter((c) => c.visualization_type === "single_metric");
  const nonKpiComponents = orderedComponents.filter((c) => c.visualization_type !== "single_metric");
  const sortableIds = nonKpiComponents.map((c) => String(c.id));

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
          notifyConfigChange(next, visualizationOverrides, expandedIdsRef.current);
        }
        return next;
      });
    },
    [editable, onConfigChange, visualizationOverrides, expandedIds, notifyConfigChange]
  );

  const handleExpandToggle = useCallback(
    (compId: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        const wasExpanded = next.has(compId);
        if (wasExpanded) {
          next.delete(compId);
        } else {
          next.add(compId);
        }
        const comp = config.components.find((c) => String(c.id) === compId);
        const newCols = next.has(compId)
          ? layoutCols
          : (comp && comp.cols === layoutCols ? 1 : (comp?.cols ?? 1));
        if (onComponentChange && comp && accountId && dashboardId) {
          const now = Date.now();
          const last = lastExpandSentRef.current;
          const isDup = last && last.compId === compId && last.cols === newCols && now - last.ts < 150;
          if (!isDup) {
            lastExpandSentRef.current = { compId, cols: newCols, ts: now };
            onComponentChange({
              layout: config.layout,
              component: { ...componentForPayload(comp), cols: newCols },
            });
          }
        }
        if (editable && onConfigChange && !onComponentChange) {
          notifyConfigChange(orderedIds, visualizationOverrides, next);
        }
        return next;
      });
    },
    [
      config,
      editable,
      onConfigChange,
      onComponentChange,
      accountId,
      dashboardId,
      layoutCols,
      orderedIds,
      visualizationOverrides,
      notifyConfigChange,
    ]
  );

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
    <div className="flex flex-col gap-3 w-full">
      {kpiComponents.length > 0 && (
        <div className="w-full flex flex-wrap gap-3">
          {kpiComponents.map((comp, i) => (
            <div key={comp.id} className="flex-1 min-w-[140px]">
              <DashboardWidget
                component={comp}
                accountId={accountId}
                dashboardId={dashboardId}
                shareId={shareId}
                staggerDelayMs={i * STAGGER_DELAY_MS}
                showQueryDetails={showQueryDetails}
                editable={false}
                hardRefreshTrigger={hardRefreshTrigger}
              />
            </div>
          ))}
        </div>
      )}
      <div
        className={`grid gap-3 ${gridColsClass} flex-1`}
        style={{ gridAutoRows, alignItems: "start" }}
      >
      {nonKpiComponents.map((comp, i) =>
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
            onTitleChange={handleTitleChange}
            onDisplayColumnsChange={onComponentChange ? handleDisplayColumnsChange : undefined}
            onCustomColumnsChange={onComponentChange ? handleCustomColumnsChange : undefined}
            onManageColumnsApply={onComponentChange ? handleManageColumnsApply : undefined}
            onWidgetDelete={editable && onConfigChange ? handleWidgetDelete : undefined}
            onActionsChange={onComponentChange ? handleActionsChange : undefined}
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
    </div>
  );

  if (editable) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={gridCollisionDetection}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortableIds}
          strategy={rectSortingStrategy}
        >
          {gridContent}
        </SortableContext>
      </DndContext>
    );
  }

  return gridContent;
};
