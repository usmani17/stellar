import React, { useState, useEffect, useMemo } from "react";
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "./Checkbox";

export interface ColumnOption {
  key: string;
  label: string;
  required?: boolean; // Required columns cannot be hidden
}

interface CustomizeColumnsProps {
  columns: ColumnOption[];
  visibleColumns: Set<string>;
  columnOrder?: string[]; // Optional: ordered list of all columns (including hidden)
  onColumnsChange: (visibleColumns: Set<string>, columnOrder: string[]) => Promise<void> | void;
  isOpen: boolean;
  onClose: () => void;
  isSaving?: boolean; // Loading state for saving preferences
}

interface SortableColumnItemProps {
  column: ColumnOption;
  isVisible: boolean;
  isRequired: boolean;
  onToggle: (key: string) => void;
}

const SortableColumnItem: React.FC<SortableColumnItemProps> = ({
  column,
  isVisible,
  isRequired,
  onToggle,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <label
        className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer ${
          isRequired ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-[#556179] hover:text-[#072929] transition-colors flex-shrink-0"
          aria-label="Drag to reorder"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>
        <Checkbox
          checked={isVisible}
          onChange={() => onToggle(column.key)}
          disabled={isRequired}
          size="small"
        />
        <span className="text-[13.3px] text-[#072929] flex-1">
          {column.label}
        </span>
        {isRequired && (
          <span className="text-[10.64px] text-[#556179] italic">
            Required
          </span>
        )}
      </label>
    </div>
  );
};

export const CustomizeColumns: React.FC<CustomizeColumnsProps> = ({
  columns,
  visibleColumns,
  columnOrder,
  onColumnsChange,
  isOpen,
  onClose,
  isSaving = false,
}) => {
  const [localVisibleColumns, setLocalVisibleColumns] = useState<Set<string>>(visibleColumns);
  const [localColumnOrder, setLocalColumnOrder] = useState<string[]>(() => {
    // Initialize order: use provided columnOrder, or default to all column keys in their original order
    if (columnOrder && columnOrder.length > 0) {
      return columnOrder;
    }
    return columns.map((col) => col.key);
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update local state when props change
  useEffect(() => {
    setLocalVisibleColumns(visibleColumns);
    if (columnOrder && columnOrder.length > 0) {
      setLocalColumnOrder(columnOrder);
    } else {
      setLocalColumnOrder(columns.map((col) => col.key));
    }
  }, [visibleColumns, columnOrder, columns]);

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalVisibleColumns(visibleColumns);
      if (columnOrder && columnOrder.length > 0) {
        setLocalColumnOrder(columnOrder);
      } else {
        setLocalColumnOrder(columns.map((col) => col.key));
      }
    }
  }, [isOpen, visibleColumns, columnOrder, columns]);

  // Get ordered columns based on localColumnOrder
  const orderedColumns = useMemo(() => {
    const columnMap = new Map(columns.map((col) => [col.key, col]));
    const ordered: ColumnOption[] = [];
    
    // First, add columns in the order specified by localColumnOrder
    for (const key of localColumnOrder) {
      const col = columnMap.get(key);
      if (col) {
        ordered.push(col);
      }
    }
    
    // Then, add any columns that weren't in the order (shouldn't happen, but safety check)
    for (const col of columns) {
      if (!ordered.find((o) => o.key === col.key)) {
        ordered.push(col);
      }
    }
    
    return ordered;
  }, [columns, localColumnOrder]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleToggleColumn = (columnKey: string) => {
    const column = columns.find((col) => col.key === columnKey);
    if (column?.required) {
      return; // Don't allow hiding required columns
    }

    const newVisible = new Set(localVisibleColumns);
    if (newVisible.has(columnKey)) {
      newVisible.delete(columnKey);
    } else {
      newVisible.add(columnKey);
    }
    setLocalVisibleColumns(newVisible);
  };

  const handleApply = async () => {
    try {
      await onColumnsChange(localVisibleColumns, localColumnOrder);
      // Modal will be closed by parent component after successful save
    } catch (error) {
      // Error handling is done by parent component
      console.error("Failed to save column preferences:", error);
    }
  };

  const handleReset = () => {
    // Reset to all columns visible and default order
    const allColumns = new Set(columns.map((col) => col.key));
    const defaultOrder = columns.map((col) => col.key);
    setLocalVisibleColumns(allColumns);
    setLocalColumnOrder(defaultOrder);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[18px] font-semibold text-[#072929]">
            Customize Columns
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#556179] hover:text-[#072929] transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <p className="text-[12.8px] text-[#556179] mb-4">
          Drag to reorder columns. Select which columns to display in the table. Required columns cannot be hidden.
        </p>

        <div className="max-h-[400px] overflow-y-auto mb-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localColumnOrder}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {orderedColumns.map((column) => {
                  const isVisible = localVisibleColumns.has(column.key);
                  const isRequired = column.required ?? false;

                  return (
                    <SortableColumnItem
                      key={column.key}
                      column={column}
                      isVisible={isVisible}
                      isRequired={isRequired}
                      onToggle={handleToggleColumn}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="px-4 py-2 text-[12.8px] text-[#556179] hover:text-[#072929] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset to Default
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-[12.8px] text-[#556179] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isSaving}
            className="px-4 py-2 text-[12.8px] bg-[#136D6D] text-white rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[80px] justify-center"
          >
            {isSaving ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              "Apply"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
