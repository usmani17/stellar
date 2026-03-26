import { useState, useMemo, useCallback, useImperativeHandle, forwardRef } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "../../../../lib/cn";
import type { DashboardComponent } from "../../types/dashboard";
import { formatDashboardValue } from "../../utils/formatDashboardValue";
import { evaluateDashboardTableFormula } from "../../utils/evaluateDashboardTableFormula";
import { DASHBOARD_TABLE_CHART_CONTENT_HEIGHT } from "./dashboardConstants";
import { DashboardTableManageColumnsModal } from "./DashboardTableManageColumnsModal";

interface DashboardTableProps {
  component: DashboardComponent;
  data: Record<string, unknown>[];
  isDark?: boolean;
  editable?: boolean;
  onDisplayColumnsChange?: (displayColumns: Array<{ key: string; label: string }>) => void;
  onCustomColumnsChange?: (customColumns: Array<{ key: string; label: string; formula: string }>) => void;
  onManageColumnsApply?: (
    displayColumns: Array<{ key: string; label: string }>,
    customColumns: Array<{ key: string; label: string; formula: string }>,
    columnOrder?: string[]
  ) => void;
}

export interface DashboardTableRef {
  openManageColumns: () => void;
}

function inferColumns(data: Record<string, unknown>[]): string[] {
  if (data.length === 0) return [];
  const first = data[0];
  return Object.keys(first as object);
}

function formatHeader(col: string): string {
  const lastPart = col.includes(".") ? col.split(".").pop() ?? col : col;
  return lastPart.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Map GAQL-style field paths to mock data column names */
function resolveSortField(configField: string | undefined, columns: string[]): string {
  if (!configField || columns.length === 0) return columns[0] ?? "";
  if (columns.includes(configField)) return configField;
  const lastPart = configField.split(".").pop() ?? configField;
  if (columns.includes(lastPart)) return lastPart;
  if (lastPart === "cost_micros" && columns.includes("spend")) return "spend";
  if (lastPart === "cost_micros" && columns.includes("cost")) return "cost";
  if (lastPart === "cost_micros" && columns.includes("total_cost_micros")) return "total_cost_micros";
  if (columns.some((c) => c.endsWith(`.${lastPart}`))) return columns.find((c) => c.endsWith(`.${lastPart}`)) ?? columns[0] ?? "";
  return columns[0] ?? "";
}

export const DashboardTable = forwardRef<DashboardTableRef, DashboardTableProps>(function DashboardTable(
  { component, data, isDark = false, editable = false, onDisplayColumnsChange, onCustomColumnsChange, onManageColumnsApply },
  ref
) {
  const baseKeysFromData = useMemo(() => inferColumns(data), [data]);
  const hasDisplayCols = component.display_columns && component.display_columns.length > 0;
  const baseColumnKeys = hasDisplayCols
    ? component.display_columns!.map((dc) => dc.key).filter((k) => baseKeysFromData.includes(k))
    : baseKeysFromData;
  const customColumns = component.custom_columns ?? [];
  const columnOrder = component.column_order;

  const displayColumnDefs: Array<{ key: string; label: string; isCustom: boolean }> = useMemo(() => {
    const getLabel = (key: string, isCustom: boolean) => {
      if (isCustom) {
        const c = customColumns.find((cc) => cc.key === key);
        return c?.label ?? formatHeader(key);
      }
      return hasDisplayCols
        ? (component.display_columns!.find((dc) => dc.key === key)?.label ?? formatHeader(key))
        : formatHeader(key);
    };
    if (columnOrder && columnOrder.length > 0) {
      const customKeys = new Set(customColumns.map((c) => c.key));
      const result: Array<{ key: string; label: string; isCustom: boolean }> = [];
      for (const key of columnOrder) {
        if (customKeys.has(key)) {
          result.push({ key, label: getLabel(key, true), isCustom: true });
        } else if (baseKeysFromData.includes(key)) {
          result.push({ key, label: getLabel(key, false), isCustom: false });
        }
      }
      return result;
    }
    const base = baseColumnKeys.map((k) => ({
      key: k,
      label: getLabel(k, false),
      isCustom: false,
    }));
    const custom = customColumns.map((c) => ({ key: c.key, label: c.label, isCustom: true }));
    return [...base, ...custom];
  }, [baseColumnKeys, baseKeysFromData, hasDisplayCols, component.display_columns, customColumns, columnOrder]);

  const columnKeys = displayColumnDefs.map((d) => d.key);
  const labelMap = Object.fromEntries(displayColumnDefs.map((d) => [d.key, d.label]));
  const allBaseKeys = baseKeysFromData;

  const dataWithCustomColumns = useMemo(() => {
    if (customColumns.length === 0) return data;
    return data.map((row) => {
      const r = { ...row } as Record<string, unknown>;
      for (const cc of customColumns) {
        const val = evaluateDashboardTableFormula(cc.formula, row, allBaseKeys);
        r[cc.key] = val === null ? "—" : val;
      }
      return r;
    });
  }, [data, customColumns, allBaseKeys]);

  const [manageModalOpen, setManageModalOpen] = useState(false);

  const initialSort = resolveSortField(component.sort?.field, columnKeys);
  const [sortField, setSortField] = useState<string>(initialSort || columnKeys[0] || "");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    (component.sort?.order as "asc" | "desc") ?? "desc"
  );

  const sortedData = useMemo(() => {
    if (!sortField || !columnKeys.includes(sortField) || dataWithCustomColumns.length === 0)
      return dataWithCustomColumns;
    return [...dataWithCustomColumns].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortField];
      const bv = (b as Record<string, unknown>)[sortField];
      if (typeof av === "number" && typeof bv === "number") {
        return sortOrder === "asc" ? av - bv : bv - av;
      }
      const aStr = String(av ?? "");
      const bStr = String(bv ?? "");
      return sortOrder === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [dataWithCustomColumns, sortField, sortOrder, columnKeys]);

  // Show all rows with vertical scrolling
  const limitedData = useMemo(() => {
    return sortedData;
  }, [sortedData]);

  const handleSort = (col: string) => {
    if (sortField === col) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(col);
      setSortOrder("desc");
    }
  };

  const openManageColumns = useCallback(() => {
    setManageModalOpen(true);
  }, []);

  useImperativeHandle(ref, () => ({ openManageColumns }), [openManageColumns]);

  const displayColumnsForModal =
    component.display_columns?.filter((dc) => baseKeysFromData.includes(dc.key)) ??
    baseKeysFromData.map((k) => ({ key: k, label: formatHeader(k) }));

  return (
    <div
      className="overflow-auto max-h-96"
      style={{ minHeight: DASHBOARD_TABLE_CHART_CONTENT_HEIGHT }}
    >
        <table className="w-full border-collapse text-[12px]">
          <thead className="sticky top-0 z-10">
            <tr>
              {displayColumnDefs.map((def) => {
                const col = def.key;
                const isSorted = sortField === col;
                return (
                  <th
                    key={col}
                    className={`text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap ${
                      isDark
                        ? "text-neutral-400 bg-neutral-700/50"
                        : "text-forest-f30 bg-sandstorm-s20/90"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(col)}
                      className={cn(
                        "inline-flex items-center gap-1.5 transition-colors w-full text-left",
                        isDark ? "hover:text-neutral-100" : "hover:text-forest-f60"
                      )}
                    >
                      {labelMap[col] ?? formatHeader(col)}
                      {isSorted ? (
                        sortOrder === "asc" ? (
                          <ChevronUp className="w-3.5 h-3.5 shrink-0" aria-hidden />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 shrink-0" aria-hidden />
                        )
                      ) : (
                        <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 opacity-50" aria-hidden />
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {limitedData.map((row, i) => (
              <tr
                key={i}
                className={`border-b last:border-b-0 transition-colors ${
                  isDark
                    ? "border-neutral-700/80 hover:bg-neutral-700/40"
                    : "border-sandstorm-s40/50 hover:bg-sandstorm-s10/70"
                }`}
              >
                {columnKeys.map((col) => (
                  <td
                    key={col}
                    className={`py-3 px-4 ${isDark ? "text-neutral-200" : "text-forest-f60"}`}
                  >
                    {formatDashboardValue(row[col], col, component.metric_formats)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      {(onDisplayColumnsChange || onCustomColumnsChange || onManageColumnsApply) && editable && (
        <DashboardTableManageColumnsModal
          isOpen={manageModalOpen}
          onClose={() => setManageModalOpen(false)}
          baseKeysFromData={allBaseKeys}
          displayColumns={displayColumnsForModal}
          customColumns={customColumns}
          initialColumnOrder={component.column_order}
          onDisplayColumnsChange={onDisplayColumnsChange ?? (() => {})}
          onCustomColumnsChange={onCustomColumnsChange ?? (() => {})}
          onManageColumnsApply={onManageColumnsApply}
          isDark={isDark}
        />
      )}
    </div>
  );
});
