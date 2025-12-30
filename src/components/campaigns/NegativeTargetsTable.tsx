import React from "react";
import { StatusBadge } from "../ui/StatusBadge";

interface NegativeTarget {
  id: number;
  profileId?: string;
  last_updated?: string;
  targetId?: number;
  name?: string; // For backward compatibility
  expression?: string;
  expressions?: string; // For SB schema
  resolvedExpression?: string;
  resolvedExpressions?: string; // For SB schema
  state?: string;
  status?: string; // For backward compatibility
  adGroupId?: number;
  campaignId?: string | number;
  creationDateTime?: string;
  lastUpdateDateTime?: string;
  servingStatus?: string;
  servingStatusDetails?: string;
}

interface NegativeTargetsTableProps {
  negativeTargets: NegativeTarget[];
  loading?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
}

export const NegativeTargetsTable: React.FC<NegativeTargetsTableProps> = ({
  negativeTargets,
  loading = false,
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
      <div className="overflow-x-auto w-full">
        {loading ? (
          <div className="text-center py-8 text-[#556179] text-[13.3px]">
            Loading negative targets...
          </div>
        ) : negativeTargets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[13.3px] text-[#556179] mb-4">
              No negative targets found
            </p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            <table className="min-w-full">
              <thead className="sticky top-0 bg-[#fefefb] z-10">
                <tr className="border-b border-[#e8e8e3]">
                  {/* ID Header */}
                  <th
                    className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] ${
                      onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                    onClick={() => onSort?.("id")}
                  >
                    <div className="flex items-center gap-1">
                      ID
                      {getSortIcon("id")}
                    </div>
                  </th>

                  {/* Profile ID Header */}
                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                    Profile ID
                  </th>

                  {/* Target ID Header */}
                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                    Target ID
                  </th>

                  {/* Expression Header */}
                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                    Expression
                  </th>

                  {/* Resolved Expression Header */}
                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                    Resolved Expression
                  </th>

                  {/* State Header */}
                  <th
                    className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] min-w-[115px] ${
                      onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                    onClick={() => onSort?.("state")}
                  >
                    <div className="flex items-center gap-1">
                      State
                      {getSortIcon("state")}
                    </div>
                  </th>

                  {/* Ad Group ID Header */}
                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                    Ad Group ID
                  </th>

                  {/* Campaign ID Header */}
                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                    Campaign ID
                  </th>

                  {/* Creation Date Time Header */}
                  <th
                    className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] ${
                      onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                    onClick={() => onSort?.("creationDateTime")}
                  >
                    <div className="flex items-center gap-1">
                      Creation Date
                      {getSortIcon("creationDateTime")}
                    </div>
                  </th>

                  {/* Last Update Date Time Header */}
                  <th
                    className={`text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] ${
                      onSort ? "cursor-pointer hover:bg-gray-50" : ""
                    }`}
                    onClick={() => onSort?.("lastUpdateDateTime")}
                  >
                    <div className="flex items-center gap-1">
                      Last Updated
                      {getSortIcon("lastUpdateDateTime")}
                    </div>
                  </th>

                  {/* Serving Status Header */}
                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                    Serving Status
                  </th>

                  {/* Serving Status Details Header */}
                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                    Serving Status Details
                  </th>

                  {/* Last Updated Header */}
                  <th className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px]">
                    Last Synced
                  </th>
                </tr>
              </thead>
              <tbody>
                {negativeTargets.map((target, index) => {
                  const isLastRow = index === negativeTargets.length - 1;
                  const expression =
                    target.expression ||
                    target.expressions ||
                    target.name ||
                    "";
                  const resolvedExpression =
                    target.resolvedExpression ||
                    target.resolvedExpressions ||
                    "";
                  return (
                    <tr
                      key={target.id}
                      className={`${
                        !isLastRow ? "border-b border-[#e8e8e3]" : ""
                      } hover:bg-gray-50 transition-colors`}
                    >
                      {/* ID */}
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {target.id || "—"}
                        </span>
                      </td>

                      {/* Profile ID */}
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {target.profileId || "—"}
                        </span>
                      </td>

                      {/* Target ID */}
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {target.targetId || "—"}
                        </span>
                      </td>

                      {/* Expression */}
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {expression || "—"}
                        </span>
                      </td>

                      {/* Resolved Expression */}
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {resolvedExpression || "—"}
                        </span>
                      </td>

                      {/* State */}
                      <td className="py-[10px] px-[10px] min-w-[115px]">
                        <StatusBadge
                          status={target.status || target.state || "Enabled"}
                          uppercase={true}
                        />
                      </td>

                      {/* Ad Group ID */}
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {target.adGroupId || "—"}
                        </span>
                      </td>

                      {/* Campaign ID */}
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {target.campaignId || "—"}
                        </span>
                      </td>

                      {/* Creation Date Time */}
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {formatDate(target.creationDateTime)}
                        </span>
                      </td>

                      {/* Last Update Date Time */}
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {formatDate(target.lastUpdateDateTime)}
                        </span>
                      </td>

                      {/* Serving Status */}
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {target.servingStatus || "—"}
                        </span>
                      </td>

                      {/* Serving Status Details */}
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {target.servingStatusDetails || "—"}
                        </span>
                      </td>

                      {/* Last Updated */}
                      <td className="py-[10px] px-[10px]">
                        <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                          {formatDate(target.last_updated)}
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
    </div>
  );
};
