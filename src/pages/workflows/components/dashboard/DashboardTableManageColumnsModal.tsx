import { useState, useEffect, useMemo, useCallback } from "react";
import { GripVertical, Plus, Trash2, Pencil } from "lucide-react";
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
import { BaseModal } from "../../../../components/ui";
import { Checkbox } from "../../../../components/ui";
import { DashboardTableCustomColumnModal, type CustomColumnEdit } from "./DashboardTableCustomColumnModal";
import { useDashboardTheme } from "../../contexts/DashboardThemeContext";
import { cn } from "../../../../lib/cn";

const LABEL_ALLOWED_PATTERN = /^[a-zA-Z0-9_\-\s]+$/;

function formatHeader(col: string): string {
  const lastPart = col.includes(".") ? col.split(".").pop() ?? col : col;
  return lastPart.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface ManageColumnsModalItem {
  key: string;
  label: string;
  isCustom: boolean;
  formula?: string;
}

interface DashboardTableManageColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseKeysFromData: string[];
  displayColumns: Array<{ key: string; label: string }>;
  customColumns: Array<{ key: string; label: string; formula: string }>;
  /** When present, used to initialize modal column order (preserves saved interleaved order) */
  initialColumnOrder?: string[];
  onDisplayColumnsChange: (displayColumns: Array<{ key: string; label: string }>) => void;
  onCustomColumnsChange: (customColumns: Array<{ key: string; label: string; formula: string }>) => void;
  onManageColumnsApply?: (
    displayColumns: Array<{ key: string; label: string }>,
    customColumns: Array<{ key: string; label: string; formula: string }>,
    columnOrder?: string[]
  ) => void;
  isDark?: boolean;
}

function SortableManageColumnRow({
  item,
  label,
  isVisible,
  isCustom,
  isDark,
  onLabelChange,
  onToggleVisibility,
  onEditFormula,
  onDelete,
  onLabelBlur,
}: {
  item: ManageColumnsModalItem;
  label: string;
  isVisible: boolean;
  isCustom: boolean;
  isDark: boolean;
  onLabelChange: (key: string, label: string) => void;
  onToggleVisibility: (key: string) => void;
  onEditFormula?: (key: string) => void;
  onDelete?: (key: string) => void;
  onLabelBlur: (key: string, value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const [error, setError] = useState<string | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSaveEdit = () => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      setError("Label is required");
      return;
    }
    if (!LABEL_ALLOWED_PATTERN.test(trimmed)) {
      setError("Use only letters, numbers, spaces, hyphens, and underscores");
      return;
    }
    setError(null);
    onLabelChange(item.key, trimmed);
    onLabelBlur(item.key, trimmed);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveEdit();
    if (e.key === "Escape") {
      setEditValue(label);
      setError(null);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg transition-colors",
        isDark ? "hover:bg-neutral-700/50" : "hover:bg-sandstorm-s20/70"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "cursor-grab active:cursor-grabbing flex-shrink-0 p-0.5 -ml-0.5 rounded",
          isDark ? "text-neutral-400 hover:text-neutral-200" : "text-forest-f30 hover:text-forest-f60"
        )}
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      {!isCustom && (
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isVisible}
            onChange={() => onToggleVisibility(item.key)}
            size="small"
          />
        </div>
      )}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {isEditing ? (
          <>
            <input
              type="text"
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                setError(null);
              }}
              onBlur={handleSaveEdit}
              onKeyDown={handleKeyDown}
              autoFocus
              className={cn(
                "flex-1 min-w-0 px-2 py-1 text-[13px] rounded border outline-none",
                isDark
                  ? "bg-neutral-700 border-neutral-600 focus:border-[#2DD4BF]/60"
                  : "bg-sandstorm-s5 border-sandstorm-s40 focus:border-forest-f40"
              )}
              aria-label="Column label"
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditValue(label);
              setIsEditing(true);
            }}
            className={cn(
              "text-left text-[13px] truncate flex-1 min-w-0",
              isDark ? "text-neutral-100" : "text-forest-f60"
            )}
          >
            {label || formatHeader(item.key)}
          </button>
        )}
        {error && (
          <span className={cn("text-xs shrink-0", isDark ? "text-red-400" : "text-red-r30")}>
            {error}
          </span>
        )}
      </div>
      {isCustom && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEditFormula?.(item.key)}
            className={cn(
              "p-1.5 rounded transition-colors",
              isDark ? "text-neutral-400 hover:bg-neutral-700 hover:text-[#2DD4BF]" : "text-forest-f30 hover:bg-sandstorm-s20 hover:text-forest-f40"
            )}
            aria-label="Edit formula"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(item.key)}
            className={cn(
              "p-1.5 rounded transition-colors",
              isDark ? "text-red-400 hover:bg-red-900/30" : "text-red-r30 hover:bg-red-r0"
            )}
            aria-label="Remove column"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export function DashboardTableManageColumnsModal({
  isOpen,
  onClose,
  baseKeysFromData,
  displayColumns,
  customColumns,
  initialColumnOrder,
  onDisplayColumnsChange,
  onCustomColumnsChange,
  onManageColumnsApply,
  isDark = false,
}: DashboardTableManageColumnsModalProps) {
  const { isDark: themeDark } = useDashboardTheme();
  const dark = isDark ?? themeDark;

  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [visibleBase, setVisibleBase] = useState<Set<string>>(new Set());
  const [labelMap, setLabelMap] = useState<Record<string, string>>({});
  const [localCustomColumns, setLocalCustomColumns] = useState<Array<{ key: string; label: string; formula: string }>>([]);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [editingCustomKey, setEditingCustomKey] = useState<string | null>(null);

  const visibleBaseKeys = useMemo(() => {
    return displayColumns.map((dc) => dc.key).filter((k) => baseKeysFromData.includes(k));
  }, [displayColumns, baseKeysFromData]);

  const hiddenBaseKeys = useMemo(() => {
    return baseKeysFromData.filter((k) => !columnOrder.includes(k));
  }, [baseKeysFromData, columnOrder]);

  useEffect(() => {
    if (!isOpen) return;
    const visibleSet = new Set(visibleBaseKeys);
    setVisibleBase(visibleSet);
    const order: string[] =
      initialColumnOrder && initialColumnOrder.length > 0
        ? initialColumnOrder.filter(
            (k) => visibleBaseKeys.includes(k) || customColumns.some((c) => c.key === k)
          )
        : [...visibleBaseKeys, ...customColumns.map((c) => c.key)];
    setColumnOrder(order);
    const labels: Record<string, string> = {};
    displayColumns.forEach((dc) => {
      labels[dc.key] = dc.label;
    });
    customColumns.forEach((c) => {
      labels[c.key] = c.label;
    });
    baseKeysFromData.forEach((k) => {
      if (!(k in labels)) labels[k] = formatHeader(k);
    });
    setLabelMap(labels);
    setLocalCustomColumns([...customColumns]);
  }, [isOpen, visibleBaseKeys, customColumns, displayColumns, baseKeysFromData, initialColumnOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const orderedItems = useMemo((): ManageColumnsModalItem[] => {
    const result: ManageColumnsModalItem[] = [];
    for (const key of columnOrder) {
      if (baseKeysFromData.includes(key)) {
        result.push({
          key,
          label: labelMap[key] ?? formatHeader(key),
          isCustom: false,
        });
      } else {
        const custom = localCustomColumns.find((c) => c.key === key);
        if (custom) {
          result.push({
            key: custom.key,
            label: custom.label,
            isCustom: true,
            formula: custom.formula,
          });
        }
      }
    }
    return result;
  }, [columnOrder, baseKeysFromData, localCustomColumns, labelMap]);

  const hiddenItems = useMemo(
    () =>
      hiddenBaseKeys.map((key) => ({
        key,
        label: labelMap[key] ?? formatHeader(key),
        isCustom: false,
      })),
    [hiddenBaseKeys, labelMap]
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumnOrder((items) => {
        const idxA = items.indexOf(active.id as string);
        const idxB = items.indexOf(over.id as string);
        if (idxA < 0 || idxB < 0) return items;
        return arrayMove(items, idxA, idxB);
      });
    }
  }, []);

  const handleToggleVisibility = useCallback((key: string) => {
    if (!baseKeysFromData.includes(key)) return;
    setVisibleBase((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setColumnOrder((order) => order.filter((k) => k !== key));
      } else {
        next.add(key);
        setColumnOrder((order) => {
          const without = order.filter((k) => k !== key);
          const firstCustomIdx = without.findIndex((k) => !baseKeysFromData.includes(k));
          if (firstCustomIdx >= 0) {
            return [...without.slice(0, firstCustomIdx), key, ...without.slice(firstCustomIdx)];
          }
          return [...without, key];
        });
      }
      return next;
    });
  }, [baseKeysFromData]);

  const handleLabelChange = useCallback((key: string, newLabel: string) => {
    setLabelMap((prev) => ({ ...prev, [key]: newLabel }));
  }, []);

  const handleLabelBlur = useCallback((_key: string, _value: string) => {
    // No-op; labelMap already updated in handleLabelChange
  }, []);

  const handleEditFormula = useCallback((key: string) => {
    setEditingCustomKey(key);
    setCustomModalOpen(true);
  }, []);

  const handleAddCustomColumn = useCallback(() => {
    setEditingCustomKey(null);
    setCustomModalOpen(true);
  }, []);

  const handleCustomColumnSave = useCallback(
    (column: CustomColumnEdit) => {
      if (editingCustomKey) {
        setLocalCustomColumns((prev) =>
          prev.map((c) => (c.key === editingCustomKey ? column : c))
        );
        setColumnOrder((prev) =>
          prev.map((k) => (k === editingCustomKey ? column.key : k))
        );
        setLabelMap((prev) => ({ ...prev, [column.key]: column.label }));
      } else {
        setLocalCustomColumns((prev) => [...prev, column]);
        setColumnOrder((prev) => [...prev, column.key]);
        setLabelMap((prev) => ({ ...prev, [column.key]: column.label }));
      }
      setCustomModalOpen(false);
      setEditingCustomKey(null);
    },
    [editingCustomKey]
  );

  const handleCustomColumnDelete = useCallback((key: string) => {
    setLocalCustomColumns((prev) => prev.filter((c) => c.key !== key));
    setColumnOrder((prev) => prev.filter((k) => k !== key));
    setCustomModalOpen(false);
    setEditingCustomKey(null);
  }, []);

  const handleShowHidden = useCallback((key: string) => {
    setVisibleBase((prev) => new Set(prev).add(key));
    setColumnOrder((order) => {
      const firstCustomIdx = order.findIndex((k) => !baseKeysFromData.includes(k));
      if (firstCustomIdx >= 0) {
        return [...order.slice(0, firstCustomIdx), key, ...order.slice(firstCustomIdx)];
      }
      return [...order, key];
    });
  }, [baseKeysFromData]);

  const handleApply = useCallback(() => {
    const visibleBaseOrder = columnOrder.filter((k) => baseKeysFromData.includes(k));
    const newDisplayColumns = visibleBaseOrder.map((k) => ({
      key: k,
      label: labelMap[k] ?? formatHeader(k),
    }));
    const fullColumnOrder = columnOrder;
    if (onManageColumnsApply) {
      onManageColumnsApply(newDisplayColumns, localCustomColumns, fullColumnOrder);
    } else {
      onDisplayColumnsChange(newDisplayColumns);
      onCustomColumnsChange(localCustomColumns);
    }
    onClose();
  }, [columnOrder, labelMap, localCustomColumns, baseKeysFromData, onDisplayColumnsChange, onCustomColumnsChange, onManageColumnsApply, onClose]);

  const editingCustom = editingCustomKey
    ? localCustomColumns.find((c) => c.key === editingCustomKey) ?? null
    : null;

  const existingCustomKeys = localCustomColumns.map((c) => c.key);

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        maxWidth="max-w-lg"
      >
        <div className={cn(dark ? "text-neutral-100" : "text-forest-f60")}>
          <h2 className="text-lg font-semibold mb-2">Manage columns</h2>
          <p className="text-sm text-forest-f30 dark:text-neutral-400 mb-4">
            Drag to reorder. Check to show or hide columns. Edit labels inline. Add custom formula columns below.
          </p>

          <div className="max-h-[320px] overflow-y-auto mb-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={columnOrder}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {orderedItems.map((item) => (
                    <SortableManageColumnRow
                      key={item.key}
                      item={item}
                      label={labelMap[item.key] ?? (item.isCustom ? item.label : formatHeader(item.key))}
                      isVisible={item.isCustom || visibleBase.has(item.key)}
                      isCustom={item.isCustom}
                      isDark={dark}
                      onLabelChange={handleLabelChange}
                      onToggleVisibility={handleToggleVisibility}
                      onEditFormula={handleEditFormula}
                      onDelete={item.isCustom ? (k) => handleCustomColumnDelete(k) : undefined}
                      onLabelBlur={handleLabelBlur}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {hiddenItems.length > 0 && (
              <div className="mt-4 pt-4 border-t border-sandstorm-s40 dark:border-neutral-700">
                <p className={cn("text-xs font-medium mb-2", dark ? "text-neutral-400" : "text-forest-f30")}>
                  Hidden columns
                </p>
                <div className="space-y-1">
                  {hiddenItems.map((item) => (
                    <div
                      key={item.key}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg",
                        dark ? "text-neutral-400" : "text-forest-f30"
                      )}
                    >
                      <div className="w-4 shrink-0" aria-hidden />
                      <div className="w-4 shrink-0" aria-hidden />
                      <span className="flex-1 text-[13px] truncate">
                        {labelMap[item.key] ?? formatHeader(item.key)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleShowHidden(item.key)}
                        className={cn(
                          "text-xs font-medium px-2 py-1 rounded transition-colors",
                          dark
                            ? "text-[#2DD4BF] hover:bg-[#2DD4BF]/20"
                            : "text-forest-f40 hover:bg-forest-f40/10"
                        )}
                      >
                        Show
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddCustomColumn}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed text-sm font-medium mb-4 transition-colors",
              dark
                ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700/50 hover:border-[#2DD4BF]/50"
                : "border-sandstorm-s40 text-forest-f30 hover:bg-sandstorm-s20 hover:border-forest-f40/50"
            )}
          >
            <Plus className="w-4 h-4" />
            Add custom column
          </button>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "px-4 py-2 rounded text-sm font-medium border transition-colors",
                dark
                  ? "border-neutral-600 hover:bg-neutral-700"
                  : "border-sandstorm-s40 hover:bg-sandstorm-s20"
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className={cn(
                "px-4 py-2 rounded text-sm font-medium border transition-colors",
                dark
                  ? "border-[#2DD4BF] bg-[#2DD4BF]/20 text-[#2DD4BF] hover:bg-[#2DD4BF]/30"
                  : "border-forest-f40 bg-forest-f40 text-white hover:bg-forest-f50"
              )}
            >
              Apply
            </button>
          </div>
        </div>
      </BaseModal>

      <DashboardTableCustomColumnModal
        isOpen={customModalOpen}
        onClose={() => {
          setCustomModalOpen(false);
          setEditingCustomKey(null);
        }}
        onSave={handleCustomColumnSave}
        onDelete={editingCustom ? handleCustomColumnDelete : undefined}
        editExisting={editingCustom}
        availableColumnKeys={baseKeysFromData}
        existingCustomKeys={existingCustomKeys}
      />
    </>
  );
}
