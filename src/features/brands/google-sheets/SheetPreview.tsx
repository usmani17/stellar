import React, { useState } from "react";

const PREVIEW_PAGE_SIZE = 10;

interface Props {
  columns: string[];
  rows: any[][];
}

export const SheetPreview: React.FC<Props> = ({ columns, rows }) => {
  const [currentPage, setCurrentPage] = useState(1);

  if (!columns.length) {
    return (
      <p className="text-[13px] text-forest-f30">
        No preview available. Select a spreadsheet and sheet range first.
      </p>
    );
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / PREVIEW_PAGE_SIZE));
  const start = (currentPage - 1) * PREVIEW_PAGE_SIZE;
  const pageRows = rows.slice(start, start + PREVIEW_PAGE_SIZE);

  return (
    <div className="space-y-3">
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
            {pageRows.map((row, idx) => (
              <tr key={start + idx} className="border-t border-sandstorm-s40">
                {columns.map((c, colIdx) => (
                  <td
                    key={`${start + idx}-${c}`}
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

      {rows.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-forest-f30">
            Showing {start + 1}–{Math.min(start + PREVIEW_PAGE_SIZE, rows.length)} of {rows.length} rows
          </p>
          {totalPages > 1 && (
            <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                pageNum = Math.max(1, Math.min(pageNum, totalPages));
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${
                      currentPage === pageNum
                        ? "bg-white text-[#136D6D] font-semibold"
                        : "text-black hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SheetPreview;

