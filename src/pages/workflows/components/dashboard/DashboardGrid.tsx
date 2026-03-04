import React, { useState, useEffect, useCallback } from "react";
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
import {
  getDemoLayoutState,
  setDemoLayoutState,
} from "../../utils/dashboardStorage";

const STAGGER_DELAY_MS = 500;

interface DashboardGridProps {
  config: DashboardConfig;
  accountId: number | undefined;
  workflowId: number | undefined;
  shareId?: string;
  showQueryDetails?: boolean;
  editable?: boolean;
}

function SortableWidgetWrapper({
  component,
  accountId,
  workflowId,
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
  accountId: number | undefined;
  workflowId: number | undefined;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isExpanded ? "md:col-span-2" : ""} ${isDragging ? "z-50 opacity-90" : ""}`}
    >
      <DashboardWidget
        component={component}
        accountId={accountId}
        workflowId={workflowId}
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
  workflowId,
  shareId,
  showQueryDetails = false,
  editable = false,
}) => {
  const { layout, components } = config;
  const { cols } = layout;

  const [orderedIds, setOrderedIds] = useState<string[]>(() => {
    if (!editable) return components.map((c) => c.id);
    const saved = getDemoLayoutState();
    if (saved) {
      const validIds = saved.componentIds.filter((id) =>
        components.some((c) => c.id === id)
      );
      const newIds = components
        .filter((c) => !validIds.includes(c.id))
        .map((c) => c.id);
      return [...validIds, ...newIds];
    }
    return components.map((c) => c.id);
  });
  const [expandedId, setExpandedId] = useState<string | null>(() => {
    if (!editable) return null;
    const saved = getDemoLayoutState();
    if (saved?.expandedId && components.some((c) => c.id === saved.expandedId)) {
      return saved.expandedId;
    }
    return null;
  });
  const [visualizationOverrides, setVisualizationOverrides] = useState<
    Record<string, VisualizationType>
  >(() => {
    if (!editable) return {};
    const saved = getDemoLayoutState();
    return saved?.visualizationOverrides ?? {};
  });

  useEffect(() => {
    if (!editable) return;
    setDemoLayoutState({
      componentIds: orderedIds,
      expandedId,
      visualizationOverrides,
    });
  }, [editable, orderedIds, expandedId, visualizationOverrides]);

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

  const gridCols = cols >= 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1";

  const gridContent = (
    <div
      className={`grid gap-3 ${gridCols}`}
      style={{ gridAutoRows: "minmax(280px, auto)" }}
    >
      {orderedComponents.map((comp, i) =>
        editable ? (
          <SortableWidgetWrapper
            key={comp.id}
            component={comp}
            accountId={accountId}
            workflowId={workflowId}
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
          <DashboardWidget
            key={comp.id}
            component={comp}
            accountId={accountId}
            workflowId={workflowId}
            shareId={shareId}
            staggerDelayMs={i * STAGGER_DELAY_MS}
            showQueryDetails={showQueryDetails}
          />
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
