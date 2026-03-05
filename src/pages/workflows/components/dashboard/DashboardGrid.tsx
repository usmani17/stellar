import React, { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
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
import type {
  DashboardConfig,
  DashboardComponent,
  VisualizationType,
} from "../../types/dashboard";

const STAGGER_DELAY_MS = 500;

interface DashboardGridProps {
  config: DashboardConfig;
  accountId: number | undefined;
  dashboardId: number | undefined;
  shareId?: string;
  showQueryDetails?: boolean;
  editable?: boolean;
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
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: component.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandleProps = editable ? { ...attributes, ...listeners } : undefined;

  // Calculate grid span classes based on component's rows and cols
  const colSpanClass =
    component.cols >= layoutCols
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
      className={`${colSpanClass} ${rowSpanClass} ${isDragging ? "z-50 opacity-90" : ""}`}
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
      />
    </div>
  );
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  config,
  accountId,
  dashboardId,
  shareId,
  showQueryDetails = false,
  editable = false,
}) => {
  const { layout, components } = config;
  const { cols: layoutCols, rows: layoutRows } = layout;

  const [orderedIds, setOrderedIds] = useState<string[]>(() =>
    components.map((c) => c.id)
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [visualizationOverrides, setVisualizationOverrides] = useState<
    Record<string, VisualizationType>
  >({});

  const handleVisualizationChange = useCallback(
    (componentId: string, type: VisualizationType) => {
      setVisualizationOverrides((prev) => ({
        ...prev,
        [componentId]: type,
      }));
    },
    []
  );

  const orderedComponents = orderedIds
    .map((id) => components.find((c) => c.id === id))
    .filter((c): c is DashboardComponent => c != null);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setOrderedIds((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    },
    []
  );

  const handleExpandToggle = useCallback((compId: string) => {
    setExpandedId((prev) => (prev === compId ? null : compId));
  }, []);

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

  const gridContent = (
    <div
      className={`grid gap-3 ${gridColsClass}`}
      style={{ gridAutoRows: "minmax(280px, auto)" }}
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
            isExpanded={expandedId === comp.id}
            onExpandToggle={() => handleExpandToggle(comp.id)}
            editable
            effectiveVisualizationType={visualizationOverrides[comp.id]}
            onVisualizationChange={handleVisualizationChange}
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
