import React from "react";
import { Checkbox } from "../ui/Checkbox";
import { StatusBadge } from "../ui/StatusBadge";
import { Loader } from "../ui/Loader";

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
  adgroups?: Array<{ adGroupId: number | string; name?: string }>; // Ad groups to map IDs to names
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
  adgroups = [],
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

  return (
    <div className="table-container" style={{ position: 'relative', minHeight: loading ? '400px' : 'auto' }}>
      <div className="overflow-x-auto">
        {creatives.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-[400px] w-full py-12 px-6">
            <div className="flex flex-col items-center justify-center max-w-md">
              {/* Icon */}
              <div className="mb-6 w-20 h-20 rounded-full bg-[#F5F5F0] flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-[#556179]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              {/* Title */}
              <h3 className="text-lg font-medium text-teal-950 mb-2">
                No Creatives Found
              </h3>
              {/* Description */}
              <p className="text-sm text-[#556179] text-center leading-relaxed">
                There are no creatives for this campaign yet. Creatives will appear here when they are created.
              </p>
            </div>
          </div>
        ) : (
          <table className="w-full min-w-max">
            <thead className="sticky top-0 bg-[#fefefb] z-10">
              <tr className="border-b border-[#e8e8e3]">
                <th className="table-header w-[35px]">
                  {onSelectAll && (
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={onSelectAll}
                    />
                  )}
                </th>
                <th
                  className={`table-header ${onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                  onClick={() => handleSort("creativeId")}
                >
                  <div className="flex items-center">
                    Creative ID
                    {getSortIcon("creativeId")}
                  </div>
                </th>
                <th
                  className={`table-header ${onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                  onClick={() => handleSort("adGroupId")}
                >
                  <div className="flex items-center">
                    Ad Group
                    {getSortIcon("adGroupId")}
                  </div>
                </th>
                <th className={`table-header ${onSort ? "cursor-pointer hover:bg-gray-50" : ""
                  }`}>
                  CreativeType
                </th>
                <th className={`table-header ${onSort ? "cursor-pointer hover:bg-gray-50" : ""
                  }`}>
                  Properties (JSON)
                </th>
                <th className={`table-header ${onSort ? "cursor-pointer hover:bg-gray-50" : ""
                  }`}>
                  Moderation Status
                </th>
                <th
                  className={`table-header ${onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                  onClick={() => handleSort("last_updated")}
                >
                  <div className="flex items-center">
                    Last Updated
                    {getSortIcon("last_updated")}
                  </div>
                </th>
                {onEdit && (
                  <th className={`table-header ${onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {creatives.map((creative) => (
              <tr
                key={creative.creativeId}
                className="table-row group"
              >
                <td className="table-cell">
                  {onSelect && (
                    <Checkbox
                      checked={selectedIds.has(Number(creative.creativeId))}
                      onChange={(checked) =>
                        onSelect(Number(creative.creativeId), checked)
                      }
                    />
                  )}
                </td>
                <td className="table-cell table-text leading-[1.26]">
                  {creative.creativeId}
                </td>
                <td className="table-cell table-text leading-[1.26]">
                  {(() => {
                    const adgroup = adgroups.find(
                      (ag) => String(ag.adGroupId) === String(creative.adGroupId)
                    );
                    return adgroup?.name || creative.adGroupId;
                  })()}
                </td>
                <td className="table-cell">
                  <StatusBadge
                    status={creative.creativeType}
                    uppercase={false}
                  />
                </td>
                <td className="table-cell table-text leading-[1.26]">
                  {getPropertySummary(creative)}
                </td>
                <td className="table-cell">
                  {creative.moderationStatus ? (
                    <StatusBadge
                      status={creative.moderationStatus}
                      uppercase={false}
                    />
                  ) : (
                    <span className="text-gray-400 text-[13.44px]">N/A</span>
                  )}
                </td>
                <td className="table-cell table-text leading-[1.26]">
                  {creative.last_updated
                    ? new Date(creative.last_updated).toLocaleDateString()
                    : "N/A"}
                </td>
                {onEdit && (
                  <td className="table-cell">
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
        )}
      </div>
      {/* Loading overlay for table */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-overlay-content">
            <Loader size="md" message="Loading creatives..." />
          </div>
        </div>
      )}
    </div>
  );
};
