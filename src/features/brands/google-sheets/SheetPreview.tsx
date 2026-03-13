import React from "react";

interface Props {
  columns: string[];
  rows: any[][];
}

export const SheetPreview: React.FC<Props> = ({ columns, rows }) => {
  if (!columns.length) {
    return (
      <p className="text-[13px] text-forest-f30">
        No preview available. Select a spreadsheet and sheet range first.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border border-sandstorm-s40 rounded-[8px]">
      <table className="w-full text-left">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="px-3 py-2 text-[12px] font-medium text-forest-f30 bg-sandstorm-s10"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((row, idx) => (
            <tr key={idx} className="border-t border-sandstorm-s40">
              {columns.map((c, colIdx) => (
                <td
                  key={`${idx}-${c}`}
                  className="px-3 py-1 text-[12px] text-forest-f30"
                >
                  {row[colIdx] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SheetPreview;

