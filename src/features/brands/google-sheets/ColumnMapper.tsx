import React, { useState } from "react";
import { Button } from "../../../components/ui";
import type { ColumnMapping } from "./api";

interface Props {
  mapping: ColumnMapping[];
  previewColumns: string[];
  loading?: boolean;
  onChange: (next: ColumnMapping[]) => void;
}

const TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "DateTime" },
  { value: "currency", label: "Currency" },
  { value: "percentage", label: "Percentage" },
];

export const ColumnMapper: React.FC<Props> = ({
  mapping,
  previewColumns,
  loading,
  onChange,
}) => {
  const [localMapping, setLocalMapping] = useState<ColumnMapping[]>(() => {
    if (mapping.length) return mapping;
    return previewColumns.map((name, idx) => ({
      column_name: name,
      type: "text",
      ignore: false,
      is_key: false,
      position: idx + 1,
    }));
  });

  const updateField = (
    index: number,
    field: keyof ColumnMapping,
    value: any,
  ) => {
    const next = [...localMapping];
    next[index] = { ...next[index], [field]: value };
    setLocalMapping(next);
  };

  const handleSave = () => {
    onChange(localMapping);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border border-sandstorm-s40 rounded-[8px]">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="px-3 py-2 text-[12px] font-medium text-forest-f30 bg-sandstorm-s10">
                Column
              </th>
              <th className="px-3 py-2 text-[12px] font-medium text-forest-f30 bg-sandstorm-s10">
                Type
              </th>
              <th className="px-3 py-2 text-[12px] font-medium text-forest-f30 bg-sandstorm-s10">
                Key
              </th>
              <th className="px-3 py-2 text-[12px] font-medium text-forest-f30 bg-sandstorm-s10">
                Ignore
              </th>
            </tr>
          </thead>
          <tbody>
            {localMapping.map((col, idx) => (
              <tr key={col.column_name} className="border-t border-sandstorm-s40">
                <td className="px-3 py-1 text-[13px] text-forest-f60">
                  {col.column_name}
                </td>
                <td className="px-3 py-1">
                  <select
                    value={col.type}
                    onChange={(e) => updateField(idx, "type", e.target.value)}
                    className="w-full rounded-md border border-sandstorm-s40 bg-sandstorm-s5 px-2 py-1 text-[12px] text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40"
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={!!col.is_key}
                    onChange={(e) =>
                      updateField(idx, "is_key", e.target.checked)
                    }
                  />
                </td>
                <td className="px-3 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={!!col.ignore}
                    onChange={(e) =>
                      updateField(idx, "ignore", e.target.checked)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Mapping"}
        </Button>
      </div>
    </div>
  );
};

export default ColumnMapper;

