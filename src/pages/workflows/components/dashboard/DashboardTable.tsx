import React, { useState, useMemo, useEffect } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import type { DashboardComponent } from "../../types/dashboard";

interface DashboardTableProps {
  component: DashboardComponent;
  data: Record<string, unknown>[];
  isDark?: boolean;
}

function inferColumns(data: Record<string, unknown>[]): string[] {
  if (data.length === 0) return [];
  const first = data[0];
  return Object.keys(first as object);
}

function formatCellValue(val: unknown, col?: string): string {
  if (val == null) return "—";
  if (typeof val === "number") {
    if (col && /cost_micros|micros/i.test(col)) {
      return `$${(val / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }
    return val.toLocaleString();
  }
  return String(val);
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

export const DashboardTable: React.FC<DashboardTableProps> = ({ component, data, isDark = false }) => {
  const columns = inferColumns(data);
  const initialSort = resolveSortField(component.sort?.field, columns);
  const [sortField, setSortField] = useState<string>(initialSort || columns[0] || "");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    (component.sort?.order as "asc" | "desc") ?? "desc"
  );

  useEffect(() => {
    const resolved = resolveSortField(component.sort?.field, columns);
    if (resolved) setSortField(resolved);
  }, [component.id]);

  const sortedData = useMemo(() => {
    if (!sortField || !columns.includes(sortField) || data.length === 0) return data;
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortField];
      const bv = (b as Record<string, unknown>)[sortField];
      const aNum = typeof av === "number" ? av : 0;
      const bNum = typeof bv === "number" ? bv : 0;
      if (typeof av === "number" && typeof bv === "number") {
        return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
      }
      const aStr = String(av ?? "");
      const bStr = String(bv ?? "");
      return sortOrder === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [data, sortField, sortOrder, columns]);

  const handleSort = (col: string) => {
    if (sortField === col) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(col);
      setSortOrder("desc");
    }
  };

  return (
    <div className="overflow-x-auto dashboard-table">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
            {columns.map((col) => {
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
                    className={`inline-flex items-center gap-1.5 transition-colors ${
                      isDark ? "hover:text-neutral-100" : "hover:text-forest-f60"
                    }`}
                  >
                    {formatHeader(col)}
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
          {sortedData.map((row, i) => (
            <tr
              key={i}
              className={`border-b last:border-b-0 transition-colors ${
                isDark
                  ? "border-neutral-700/80 hover:bg-neutral-700/40"
                  : "border-sandstorm-s40/50 hover:bg-sandstorm-s10/70"
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col}
                  className={`py-3 px-4 ${isDark ? "text-neutral-200" : "text-forest-f60"}`}
                >
                  {formatCellValue(row[col], col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
