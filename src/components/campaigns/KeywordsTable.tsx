import React from "react";
import { Checkbox } from "../ui/Checkbox";
import { StatusBadge } from "../ui/StatusBadge";
import type { Keyword } from "../../services/campaigns";

interface KeywordsTableProps {
  keywords: Keyword[];
  loading?: boolean;
  onSelectAll?: (checked: boolean) => void;
  onSelect?: (id: number, checked: boolean) => void;
  selectedIds?: Set<number>;
}

export const KeywordsTable: React.FC<KeywordsTableProps> = ({
  keywords,
  loading = false,
  onSelectAll,
  onSelect,
  selectedIds = new Set(),
}) => {
  const allSelected =
    keywords.length > 0 && keywords.every((kw) => selectedIds.has(kw.id));
  const someSelected = keywords.some((kw) => selectedIds.has(kw.id));

  const handleSelectAll = (checked: boolean) => {
    onSelectAll?.(checked);
  };

  const handleSelect = (id: number, checked: boolean) => {
    onSelect?.(id, checked);
  };

  return (
    <div className="rounded-2xl" style={{ backgroundColor: "#F5F5F0" }}>
      {/* Table Header */}
      <div
        className="border border-gray-200 border-b-0 rounded-t-2xl px-[34px] pt-8 pb-0 shadow-[0px_8px_20px_0px_rgba(0,0,0,0.06)]"
        style={{ backgroundColor: "#F5F5F0" }}
      ></div>

      {/* Table */}
      <div
        className="border border-gray-200 border-t-0 rounded-b-2xl shadow-[0px_14px_20px_0px_rgba(0,0,0,0.06)] overflow-hidden p-6"
        style={{ backgroundColor: "#F5F5F0" }}
      >
        <div className="bg-white rounded-xl overflow-hidden">
          {/* Table Header Row */}
          <div className="border-b border-gray-200 flex items-center h-[48px] bg-white rounded-t-xl">
            {/* Checkbox Header */}
            <div className="w-[35px] flex items-center justify-center">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onChange={handleSelectAll}
                size="small"
              />
            </div>

            {/* Keyword Header */}
            <div className="w-[280px] px-4">
              <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                Keyword
              </p>
            </div>

            {/* Ad Group Header */}
            <div className="w-[200px] px-4">
              <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                Ad Group
              </p>
            </div>

            {/* CTR Header */}
            <div className="w-[100px] text-center">
              <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                CTR
              </p>
            </div>

            {/* Status Header */}
            <div className="w-[100px] text-center">
              <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                Status
              </p>
            </div>

            {/* Spends Header */}
            <div className="w-[100px] text-center">
              <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                Spends
              </p>
            </div>

            {/* Sales Header */}
            <div className="text-center flex-1 min-w-[51px]">
              <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                Sales
              </p>
            </div>

            {/* Actions Header */}
            <div className="w-[54px] text-center mr-4">
              <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                Actions
              </p>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div
                className="p-8 text-center text-[#556179]"
                style={{ backgroundColor: "#F5F5F0" }}
              >
                Loading keywords...
              </div>
            ) : keywords.length === 0 ? (
              <div
                className="p-8 text-center text-[#556179]"
                style={{ backgroundColor: "#F5F5F0" }}
              >
                No keywords found
              </div>
            ) : (
              keywords.map((keyword) => (
                <div
                  key={keyword.id}
                  className="flex items-center h-[48px] bg-white hover:bg-gray-50"
                >
                  {/* Checkbox */}
                  <div className="w-[35px] flex items-center justify-center">
                    <Checkbox
                      checked={selectedIds.has(keyword.id)}
                      onChange={(checked) => handleSelect(keyword.id, checked)}
                      size="small"
                    />
                  </div>

                  {/* Keyword Name */}
                  <div className="w-[280px] px-4">
                    <p className="text-[12.8px] font-normal text-black truncate">
                      {keyword.name}
                    </p>
                  </div>

                  {/* Ad Group */}
                  <div className="w-[200px] px-4">
                    <p className="text-[12.8px] font-normal text-black truncate">
                      {keyword.adgroup_name || "-"}
                    </p>
                  </div>

                  {/* CTR */}
                  <div className="w-[100px] text-center">
                    <p className="text-[12.8px] font-normal text-black">
                      {keyword.ctr}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="w-[100px] text-center">
                    <StatusBadge status={keyword.status} />
                  </div>

                  {/* Spends */}
                  <div className="w-[100px] text-center">
                    <p className="text-[12.8px] font-normal text-black">
                      {keyword.spends}
                    </p>
                  </div>

                  {/* Sales */}
                  <div className="text-center flex-1 min-w-[51px]">
                    <p className="text-[12.8px] font-normal text-black">
                      {keyword.sales}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="w-[54px] text-center mr-4">
                    <button className="text-[#A3A8B3] hover:text-black border border-gray-200 rounded-lg items-center hover:bg-gray-50 transition-colors">
                      <svg
                        className="w-5 h-5 mx-auto"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
