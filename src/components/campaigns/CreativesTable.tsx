import React from "react";
import { Checkbox } from "../ui/Checkbox";
import { StatusBadge } from "../ui/StatusBadge";

export interface Creative {
  id: number;
  creativeId: number | string; // Can be string to preserve precision for large integers
  adGroupId: number | string; // Can be string to preserve precision for large integers
  creativeType: "IMAGE" | "VIDEO";
  properties: any; // Full JSON properties object
  moderationStatus?: string;
  consentToTranslate?: boolean;
  state?: string;
  last_updated?: string;
}

interface CreativesTableProps {
  creatives: Creative[];
  loading?: boolean;
  onSelectAll?: (checked: boolean) => void;
  onSelect?: (id: number, checked: boolean) => void;
  selectedIds?: Set<number>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
  onEdit?: (creative: Creative) => void;
}

export const CreativesTable: React.FC<CreativesTableProps> = ({
  creatives,
  loading = false,
  onSelectAll,
  onSelect,
  selectedIds = new Set(),
  sortBy = "id",
  sortOrder = "asc",
  onSort,
  onEdit,
}) => {
  console.log(creatives);
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

  const handleSort = (column: string) => {
    if (onSort) {
      onSort(column);
    }
  };

  // Convert creativeId to number for comparison (it may be string to preserve precision)
  const allSelected =
    creatives.length > 0 &&
    creatives.every((c) => selectedIds.has(Number(c.creativeId)));
  const someSelected = creatives.some((c) =>
    selectedIds.has(Number(c.creativeId))
  );

  const getPropertySummary = (creative: Creative): string => {
    // Return formatted JSON string of properties
    if (!creative.properties) {
      return "N/A";
    }

    try {
      // If properties is already a string, parse it first
      const props =
        typeof creative.properties === "string"
          ? JSON.parse(creative.properties)
          : creative.properties;

      // Return pretty-printed JSON (single line, compact)
      return JSON.stringify(props, null, 0)
        .replace(/\n/g, " ")
        .substring(0, 100);
    } catch (e) {
      return String(creative.properties).substring(0, 100);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#136D6D]"></div>
      </div>
    );
  }

  if (creatives.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No creatives found. Create your first creative to get started.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#EBEBEB] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#F8F9FA] border-b border-[#EBEBEB]">
            <tr>
              <th className="px-4 py-3 text-left">
                {onSelectAll && (
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={onSelectAll}
                  />
                )}
              </th>
              <th
                className="px-4 py-3 text-left text-[11.2px] font-semibold text-[#556179] uppercase cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("creativeId")}
              >
                <div className="flex items-center">
                  Creative ID
                  {getSortIcon("creativeId")}
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-[11.2px] font-semibold text-[#556179] uppercase cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("adGroupId")}
              >
                <div className="flex items-center">
                  Ad Group ID
                  {getSortIcon("adGroupId")}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-[11.2px] font-semibold text-[#556179] uppercase">
                CreativeType
              </th>
              <th className="px-4 py-3 text-left text-[11.2px] font-semibold text-[#556179] uppercase">
                Properties (JSON)
              </th>
              <th className="px-4 py-3 text-left text-[11.2px] font-semibold text-[#556179] uppercase">
                Moderation Status
              </th>
              <th
                className="px-4 py-3 text-left text-[11.2px] font-semibold text-[#556179] uppercase cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("last_updated")}
              >
                <div className="flex items-center">
                  Last Updated
                  {getSortIcon("last_updated")}
                </div>
              </th>
              {onEdit && (
                <th className="px-4 py-3 text-left text-[11.2px] font-semibold text-[#556179] uppercase">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {creatives.map((creative) => (
              <tr
                key={creative.creativeId}
                className="border-b border-[#EBEBEB] hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  {onSelect && (
                    <Checkbox
                      checked={selectedIds.has(Number(creative.creativeId))}
                      onChange={(checked) =>
                        onSelect(Number(creative.creativeId), checked)
                      }
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-[13.44px] text-[#222124]">
                  {creative.creativeId}
                </td>
                <td className="px-4 py-3 text-[13.44px] text-[#222124]">
                  {creative.adGroupId}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={creative.creativeType}
                    uppercase={false}
                  />
                </td>
                <td className="px-4 py-3 text-[13.44px] text-[#222124] font-mono text-xs break-all">
                  {getPropertySummary(creative)}
                </td>
                <td className="px-4 py-3">
                  {creative.moderationStatus ? (
                    <StatusBadge
                      status={creative.moderationStatus}
                      uppercase={false}
                    />
                  ) : (
                    <span className="text-gray-400 text-[13.44px]">N/A</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[13.44px] text-[#222124]">
                  {creative.last_updated
                    ? new Date(creative.last_updated).toLocaleDateString()
                    : "N/A"}
                </td>
                {onEdit && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onEdit(creative)}
                      className="text-[#136D6D] hover:text-[#0f5555] transition-colors"
                      title="Edit creative"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
