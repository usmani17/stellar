import React from "react";
import { Checkbox } from "../ui/Checkbox";
import { StatusBadge } from "../ui/StatusBadge";
import type { Target } from "../../services/campaigns";

interface TargetsTableProps {
  targets: Target[];
  loading?: boolean;
  onSelectAll?: (checked: boolean) => void;
  onSelect?: (id: number, checked: boolean) => void;
  selectedIds?: Set<number>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
}

export const TargetsTable: React.FC<TargetsTableProps> = ({
  targets,
  loading = false,
  onSelectAll,
  onSelect,
  selectedIds = new Set(),
  sortBy = "id",
  sortOrder = "asc",
  onSort,
}) => {
  const getSortIcon = (column: string) => {
    if (sortBy !== column || !onSort) {
      return (
        <svg
          className="w-4 h-4 ml-1 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    return sortOrder === "asc" ? (
      <svg
        className="w-4 h-4 ml-1 text-[#136D6D]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 ml-1 text-[#136D6D]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };
  const allSelected =
    targets.length > 0 && targets.every((tgt) => selectedIds.has(tgt.id));
  const someSelected = targets.some((tgt) => selectedIds.has(tgt.id));

  const handleSelectAll = (checked: boolean) => {
    onSelectAll?.(checked);
  };

  const handleSelect = (id: number, checked: boolean) => {
    onSelect?.(id, checked);
  };

  return (
    <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] w-full">
      {loading ? (
        <div className="text-center py-8 text-[#556179] text-[13.3px]">
          Loading targets...
        </div>
      ) : targets.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[13.3px] text-[#556179] mb-4">
            No targets found
          </p>
        </div>
      ) : (
        <div className="max-h-[600px] overflow-auto w-full overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-max">
            <thead className="sticky top-0 bg-[#fefefb] z-10">
                <tr className="border-b border-[#e8e8e3]">
                {/* Checkbox Header */}
                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] w-[35px]">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={handleSelectAll}
                      size="small"
                    />
                  </div>
                </th>

                {/* Target Name Header */}
                <th
                  className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] ${
                    onSort ? "cursor-pointer hover:bg-gray-50" : ""
                  }`}
                  onClick={() => onSort?.("name")}
                >
                  <div className="flex items-center gap-1">
                    Target
                    {getSortIcon("name")}
                  </div>
                </th>

                {/* Ad Group Header */}
                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                  Ad Group
                </th>

                {/* Profile Name Header */}
                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                  Profile
                </th>

                {/* Keyword Header */}
                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                  Keyword
                </th>

                {/* Keyword Type Header */}
                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                  Keyword Type
                </th>

                {/* Keyword Bid Header */}
                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                  Keyword Bid
                </th>

                {/* Match Type Header */}
                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                  Match Type
                </th>

                {/* Targeting Header */}
                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                  Targeting
                </th>

                {/* State Header */}
                <th
                  className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] ${
                    onSort ? "cursor-pointer hover:bg-gray-50" : ""
                  }`}
                  onClick={() => onSort?.("status")}
                >
                  <div className="flex items-center gap-1">
                    State
                    {getSortIcon("status")}
                  </div>
                </th>

                {/* Bid Header */}
                <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                  Bid
                </th>

                {/* CTR Header */}
                <th
                  className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] ${
                    onSort ? "cursor-pointer hover:bg-gray-50" : ""
                  }`}
                  onClick={() => onSort?.("ctr")}
                >
                  <div className="flex items-center gap-1">
                    CTR
                    {getSortIcon("ctr")}
                  </div>
                </th>

                {/* Spends Header */}
                <th
                  className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] ${
                    onSort ? "cursor-pointer hover:bg-gray-50" : ""
                  }`}
                  onClick={() => onSort?.("spends")}
                >
                  <div className="flex items-center gap-1">
                    Spends
                    {getSortIcon("spends")}
                  </div>
                </th>

                {/* Sales Header */}
                <th
                  className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] ${
                    onSort ? "cursor-pointer hover:bg-gray-50" : ""
                  }`}
                  onClick={() => onSort?.("sales")}
                >
                  <div className="flex items-center gap-1">
                    Sales
                    {getSortIcon("sales")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {targets.map((target, index) => {
                const isLastRow = index === targets.length - 1;
                return (
                  <tr
                    key={target.id}
                    className={`${
                      !isLastRow ? "border-b border-[#e8e8e3]" : ""
                    } hover:bg-gray-50 transition-colors`}
                  >
                    {/* Checkbox */}
                    <td className="py-[10px] px-[10px]">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={selectedIds.has(target.id)}
                          onChange={(checked) =>
                            handleSelect(target.id, checked)
                          }
                          size="small"
                        />
                      </div>
                    </td>

                    {/* Target Name */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.name}
                      </span>
                    </td>

                    {/* Ad Group */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.adgroup_name || "—"}
                      </span>
                    </td>

                    {/* Profile Name */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.profile_name || "—"}
                      </span>
                    </td>

                    {/* Keyword */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.keyword || "—"}
                      </span>
                    </td>

                    {/* Keyword Type */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.keyword_type || "—"}
                      </span>
                    </td>

                    {/* Keyword Bid */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.keyword_bid || "$0.00"}
                      </span>
                    </td>

                    {/* Match Type */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.match_type || "—"}
                      </span>
                    </td>

                    {/* Targeting */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.targeting || "—"}
                      </span>
                    </td>

                    {/* State */}
                    <td className="py-[10px] px-[10px]">
                      <StatusBadge status={target.status} />
                    </td>

                    {/* Bid */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.bid || "$0.00"}
                      </span>
                    </td>

                    {/* CTR */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.ctr}
                      </span>
                    </td>

                    {/* Spends */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.spends}
                      </span>
                    </td>

                    {/* Sales */}
                    <td className="py-[10px] px-[10px]">
                      <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                        {target.sales}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
