import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDateRange } from "../../contexts/DateRangeContext";
import { Button } from "../ui";
import { Dropdown } from "../ui/Dropdown";
import { logsService } from "../../services/logs";

interface LogsTableProps {
  accountId?: string;
  campaignId?: string;
  marketplace?: string; // 'amazon', 'google', 'tiktok' - if not provided, shows all
  showHeader?: boolean;
  showExport?: boolean;
}

export const LogsTable: React.FC<LogsTableProps> = ({
  accountId,
  campaignId,
  marketplace,
  showHeader = true,
  showExport = true,
}) => {
  const { startDate, endDate } = useDateRange();
  const [logs, setLogs] = useState<
    Array<{
      id: number;
      entity: string;
      field: string;
      oldValue: string;
      newValue: string;
      changedBy: string | number;
      changedAt: string;
      method: string;
      marketplace?: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Load logs - memoized with useCallback to avoid infinite loops
  const loadLogs = useCallback(async () => {
    if (!accountId) {
      setLoading(false);
      return;
    }

    // Always show loading state when fetching
    setLoading(true);

    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      const response = await logsService.getLogs(accountIdNum, {
        campaign_id: campaignId,
        marketplace: marketplace,
        page: currentPage,
        page_size: pageSize,
        start_date: startDate
          ? startDate.toISOString().split("T")[0]
          : undefined,
        end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
      });

      // Transform API response to match component format
      const transformedLogs: Array<{
        id: number;
        entity: string;
        field: string;
        oldValue: string;
        newValue: string;
        changedBy: string | number;
        changedAt: string;
        method: string;
        marketplace?: string;
      }> = response.logs.map((log) => ({
        id: log.id,
        entity: log.entity_type || log.entity || "Unknown",
        field: log.field_name || log.field || "Unknown",
        oldValue: log.old_value || "",
        newValue: log.new_value || "",
        changedBy: log.changed_by_name || log.changed_by || "Unknown",
        changedAt: (() => {
          try {
            const date = new Date(log.changed_at || "");
            // Format as MM-DD-YYYY HH:mm to match Figma design
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            return `${month}-${day}-${year} ${hours}:${minutes}`;
          } catch (e) {
            return log.changed_at || "";
          }
        })(),
        method: log.method || "Inline",
        marketplace: log.marketplace || undefined,
      }));

      setLogs(transformedLogs);
      setTotalPages(response.total_pages || 1);
      setLoading(false);
    } catch (error: any) {
      console.error("Error loading logs:", error);
      // Log more details for debugging
      if (error?.response) {
        console.error("API Error Response:", error.response.data);
        console.error("API Error Status:", error.response.status);
      }
      setLogs([]);
      setTotalPages(1);
      setLoading(false);
    }
  }, [
    accountId,
    campaignId,
    marketplace,
    startDate,
    endDate,
    currentPage,
    pageSize,
  ]);

  // Initial load and reload when filters or page change
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  const pageSizeOptions = [
    { value: 10, label: "10" },
    { value: 20, label: "20" },
    { value: 50, label: "50" },
    { value: 100, label: "100" },
  ];

  // Handle export dropdown click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportDropdown(false);
      }
    };

    if (showExportDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showExportDropdown]);

  const handleExport = async (exportType: "all_data" | "current_view") => {
    if (!accountId) return;

    setShowExportDropdown(true);
    setExportLoading(true);
    try {
      const accountIdNum = parseInt(accountId, 10);
      if (isNaN(accountIdNum)) {
        throw new Error("Invalid account ID");
      }

      // Build params from current filters and date range
      const params: any = {
        start_date: startDate
          ? startDate.toISOString().split("T")[0]
          : undefined,
        end_date: endDate ? endDate.toISOString().split("T")[0] : undefined,
      };

      // Add campaign_id if provided
      if (campaignId) {
        params.campaign_id = campaignId;
      }

      // Add pagination for current_view
      if (exportType === "current_view") {
        params.page = currentPage;
        params.page_size = pageSize;
      }

      // Call export API
      const result = await logsService.exportLogs(accountIdNum, {
        ...params,
        export_type: exportType,
      });

      // Automatically download the file
      const link = document.createElement("a");
      link.href = result.url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Close dropdown after a short delay to show success
      setTimeout(() => {
        setShowExportDropdown(false);
      }, 500);
    } catch (error: any) {
      console.error("Failed to export logs:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to export logs. Please try again.";
      alert(errorMessage);
      setShowExportDropdown(false);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="w-full inline-flex flex-col justify-start items-start gap-4">
      {/* Main Container - All content inside sandstorm-s0 container (only when showHeader is true) */}
      {showHeader ? (
        <div className="self-stretch bg-sandstorm-s0 rounded-xl p-6 border border-sandstorm-s40">
          {/* Header Section - Title and Export Dropdown */}
          {(showHeader || showExport) && (
            <div className="w-full flex justify-between items-center mb-4">
              {showHeader ? (
                <h1 className="text-teal-950 text-2xl font-medium">
                  Log / History
                </h1>
              ) : (
                <div />
              )}
              {/* Export Dropdown */}
              {showExport && (
                <div
                  className="relative inline-flex justify-end"
                  ref={exportDropdownRef}
                >
                  <div className="relative">
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-2.5 py-1 bg-[#FEFEFB] border border-[#E3E3E3] rounded-lg flex items-center gap-1.5 h-8 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[9.5px] text-[#072929] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={(e) => {
                        if (exportLoading) return;
                        e.stopPropagation();
                        setShowExportDropdown((prev) => !prev);
                      }}
                      disabled={exportLoading}
                    >
                      {exportLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#136D6D]"></div>
                        </div>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4 text-[#072929]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <span className="text-[10.64px] text-[#072929] font-normal">
                            Export
                          </span>
                        </>
                      )}
                    </Button>
                  </div>
                  {(showExportDropdown || exportLoading) && (
                    <div className="absolute top-[38px] right-0 w-56 bg-[#FCFCF9] border border-[#E3E3E3] rounded-[12px] shadow-lg z-[100] pointer-events-auto overflow-hidden">
                      {exportLoading ? (
                        <div className="px-3 py-6 flex flex-col items-center justify-center gap-3 min-h-[120px]">
                          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#136D6D] border-t-transparent"></div>
                          <p className="text-[13px] text-[#072929] font-medium">
                            Exporting...
                          </p>
                          <p className="text-[11px] text-[#556179] text-center px-2">
                            Please wait while we prepare your file
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-y-auto">
                          {[
                            { value: "bulk_export", label: "Export All" },
                            {
                              value: "current_view",
                              label: "Export Current View",
                            },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              className="w-full text-left px-3 py-2 text-[12px] text-[#072929] hover:bg-[#f9f9f6] transition-colors cursor-pointer flex items-center gap-3"
                              onClick={async (e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const exportType =
                                  opt.value === "bulk_export"
                                    ? "all_data"
                                    : "current_view";
                                await handleExport(exportType);
                              }}
                              disabled={exportLoading}
                            >
                              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <rect
                                    width="20"
                                    height="20"
                                    rx="3.2"
                                    fill="#072929"
                                  />
                                  <path
                                    d="M15 11.2V9.1942C15 8.7034 15 8.4586 14.9145 8.2378C14.829 8.0176 14.6664 7.8436 14.3407 7.4968L11.6768 4.6552C11.3961 4.3558 11.256 4.2064 11.0816 4.1176C11.0455 4.09911 11.0085 4.08269 10.9708 4.0684C10.7891 4 10.5906 4 10.194 4C8.36869 4 7.45575 4 6.83756 4.5316C6.71274 4.63896 6.59903 4.76025 6.49838 4.8934C6 5.554 6 6.5266 6 8.4736V11.2C6 13.4626 6 14.5942 6.65925 15.2968C7.3185 15.9994 8.37881 16 10.5 16M11.0625 4.3V4.6C11.0625 6.2968 11.0625 7.1458 11.5569 7.6726C12.0508 8.2 12.8467 8.2 14.4375 8.2H14.7188M13.3125 16C13.6539 15.646 15 14.704 15 14.2C15 13.696 13.6539 12.754 13.3125 12.4M14.4375 14.2H10.5"
                                    stroke="white"
                                    strokeWidth="1.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Table Container - White card container */}
          <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              {loading ? (
                <div className="flex items-center justify-center h-64 w-full">
                  <div className="text-[#556179] text-[13.3px]">Loading...</div>
                </div>
              ) : logs.length === 0 ? (
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
                      No Logs Found
                    </h3>
                    {/* Description */}
                    <p className="text-sm text-[#556179] text-center leading-relaxed">
                      {campaignId
                        ? "There are no log entries for this campaign yet. Logs will appear here when changes are made."
                        : marketplace
                          ? `There are no log entries for ${marketplace} marketplace. Logs will appear here when changes are made.`
                          : "There are no log entries for the selected filters. Try adjusting your date range or filters."}
                    </p>
                  </div>
                </div>
              ) : (
                <table className="min-w-[1200px] w-full">
                  <thead>
                    <tr className="border-b border-[#e8e8e3]">
                      <th className="table-header min-w-[80px]">ID</th>
                      {!marketplace && (
                        <th className="table-header min-w-[120px]">
                          Marketplace
                        </th>
                      )}
                      <th className="table-header min-w-[150px]">Entity</th>
                      <th className="table-header min-w-[200px]">Field</th>
                      <th className="table-header min-w-[150px]">Old Value</th>
                      <th className="table-header min-w-[150px]">New Value</th>
                      <th className="table-header min-w-[120px]">Changed By</th>
                      <th className="table-header min-w-[150px]">Changed At</th>
                      <th className="table-header min-w-[100px]">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => {
                      const isLastRow = index === logs.length - 1;
                      return (
                        <tr
                          key={log.id}
                          className={`hover:bg-gray-50 transition-colors ${!isLastRow ? "border-b border-[#e8e8e3]" : ""
                            }`}
                        >
                          <td className="table-cell">
                            <span className="table-text">{log.id}</span>
                          </td>
                          {!marketplace && (
                            <td className="table-cell">
                              <span className="table-text">
                                {log.marketplace
                                  ? log.marketplace.charAt(0).toUpperCase() +
                                  log.marketplace.slice(1)
                                  : "—"}
                              </span>
                            </td>
                          )}
                          <td className="table-cell">
                            <span className="table-text" title={log.entity}>
                              {log.entity}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className="table-text" title={log.field}>
                              {log.field}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className="table-text">
                              {log.oldValue || "—"}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className="table-text">
                              {log.newValue || "—"}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className="table-text">
                              {typeof log.changedBy === "number"
                                ? log.changedBy
                                : log.changedBy || "—"}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className="table-text">{log.changedAt}</span>
                          </td>
                          <td className="table-cell">
                            <span className="table-text">{log.method}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div className="flex items-center justify-end gap-3 mt-4 w-full">
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10.64px] text-[#556179]">Show:</span>
                <Dropdown<number>
                  options={pageSizeOptions}
                  value={pageSize}
                  onChange={(value) => handlePageSizeChange(value)}
                  buttonClassName="px-3 py-2 border border-[#EBEBEB] rounded-lg bg-[#fefefb] text-[10.64px] text-black hover:bg-gray-50 min-w-[60px]"
                  menuClassName="border border-[#EBEBEB] rounded-lg bg-[#fefefb] shadow-lg"
                  width="w-auto"
                  align="right"
                />
              </div>
              <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${currentPage === pageNum
                          ? "bg-white text-[#136D6D] font-semibold"
                          : "text-black hover:bg-gray-50"
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                    ...
                  </span>
                )}
                {totalPages > 5 && (
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${currentPage === totalPages
                        ? "bg-white text-[#136D6D] font-semibold"
                        : "text-black hover:bg-gray-50"
                      }`}
                  >
                    {totalPages}
                  </button>
                )}
                <button
                  onClick={() =>
                    handlePageChange(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Export Dropdown - Show even when header is hidden */}
          {showExport && (
            <div className="w-full flex justify-end items-center m-0">
              <div
                className="relative inline-flex justify-end"
                ref={exportDropdownRef}
              >
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-2.5 py-1 bg-[#FEFEFB] border border-[#E3E3E3] rounded-lg flex items-center gap-1.5 h-8 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors text-[9.5px] text-[#072929] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={(e) => {
                      if (exportLoading) return;
                      e.stopPropagation();
                      setShowExportDropdown((prev) => !prev);
                    }}
                    disabled={exportLoading}
                  >
                    {exportLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#136D6D]"></div>
                      </div>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 text-[#072929]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span className="text-[10.64px] text-[#072929] font-normal">
                          Export
                        </span>
                      </>
                    )}
                  </Button>
                </div>
                {(showExportDropdown || exportLoading) && (
                  <div className="absolute top-[38px] right-0 w-56 bg-[#FCFCF9] border border-[#E3E3E3] rounded-[12px] shadow-lg z-[100] pointer-events-auto overflow-hidden">
                    {exportLoading ? (
                      <div className="px-3 py-6 flex flex-col items-center justify-center gap-3 min-h-[120px]">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#136D6D] border-t-transparent"></div>
                        <p className="text-[13px] text-[#072929] font-medium">
                          Exporting...
                        </p>
                        <p className="text-[11px] text-[#556179] text-center px-2">
                          Please wait while we prepare your file
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-y-auto">
                        {[
                          { value: "bulk_export", label: "Export All" },
                          {
                            value: "current_view",
                            label: "Export Current View",
                          },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className="w-full text-left px-3 py-2 text-[12px] text-[#072929] hover:bg-[#f9f9f6] transition-colors cursor-pointer flex items-center gap-3"
                            onClick={async (e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const exportType =
                                opt.value === "bulk_export"
                                  ? "all_data"
                                  : "current_view";
                              await handleExport(exportType);
                            }}
                            disabled={exportLoading}
                          >
                            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <rect
                                  width="20"
                                  height="20"
                                  rx="3.2"
                                  fill="#072929"
                                />
                                <path
                                  d="M15 11.2V9.1942C15 8.7034 15 8.4586 14.9145 8.2378C14.829 8.0176 14.6664 7.8436 14.3407 7.4968L11.6768 4.6552C11.3961 4.3558 11.256 4.2064 11.0816 4.1176C11.0455 4.09911 11.0085 4.08269 10.9708 4.0684C10.7891 4 10.5906 4 10.194 4C8.36869 4 7.45575 4 6.83756 4.5316C6.71274 4.63896 6.59903 4.76025 6.49838 4.8934C6 5.554 6 6.5266 6 8.4736V11.2C6 13.4626 6 14.5942 6.65925 15.2968C7.3185 15.9994 8.37881 16 10.5 16M11.0625 4.3V4.6C11.0625 6.2968 11.0625 7.1458 11.5569 7.6726C12.0508 8.2 12.8467 8.2 14.4375 8.2H14.7188M13.3125 16C13.6539 15.646 15 14.704 15 14.2C15 13.696 13.6539 12.754 13.3125 12.4M14.4375 14.2H10.5"
                                  stroke="white"
                                  strokeWidth="1.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Table Container - No outer container when showHeader is false */}
          <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              {loading ? (
                <div className="flex items-center justify-center h-64 w-full">
                  <div className="text-[#556179] text-[13.3px]">Loading...</div>
                </div>
              ) : logs.length === 0 ? (
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
                      No Logs Found
                    </h3>
                    {/* Description */}
                    <p className="text-sm text-[#556179] text-center leading-relaxed">
                      {campaignId
                        ? "There are no log entries for this campaign yet. Logs will appear here when changes are made."
                        : marketplace
                          ? `There are no log entries for ${marketplace} marketplace. Logs will appear here when changes are made.`
                          : "There are no log entries for the selected filters. Try adjusting your date range or filters."}
                    </p>
                  </div>
                </div>
              ) : (
                <table className="min-w-[1200px] w-full">
                  <thead>
                    <tr className="border-b border-[#e8e8e3]">
                      <th className="table-header min-w-[80px]">ID</th>
                      {!marketplace && (
                        <th className="table-header min-w-[120px]">
                          Marketplace
                        </th>
                      )}
                      <th className="table-header min-w-[150px]">Entity</th>
                      <th className="table-header min-w-[200px]">Field</th>
                      <th className="table-header min-w-[150px]">Old Value</th>
                      <th className="table-header min-w-[150px]">New Value</th>
                      <th className="table-header min-w-[120px]">Changed By</th>
                      <th className="table-header min-w-[150px]">Changed At</th>
                      <th className="table-header min-w-[100px]">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => {
                      const isLastRow = index === logs.length - 1;
                      return (
                        <tr
                          key={log.id}
                          className={`hover:bg-gray-50 transition-colors ${!isLastRow ? "border-b border-[#e8e8e3]" : ""
                            }`}
                        >
                          <td className="table-cell">
                            <span className="table-text">{log.id}</span>
                          </td>
                          {!marketplace && (
                            <td className="table-cell">
                              <span className="table-text">
                                {log.marketplace
                                  ? log.marketplace.charAt(0).toUpperCase() +
                                  log.marketplace.slice(1)
                                  : "—"}
                              </span>
                            </td>
                          )}
                          <td className="table-cell">
                            <span className="table-text" title={log.entity}>
                              {log.entity}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className="table-text" title={log.field}>
                              {log.field}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className="table-text">
                              {log.oldValue || "—"}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className="table-text">
                              {log.newValue || "—"}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className="table-text">
                              {typeof log.changedBy === "number"
                                ? log.changedBy
                                : log.changedBy || "—"}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className="table-text">{log.changedAt}</span>
                          </td>
                          <td className="table-cell">
                            <span className="table-text">{log.method}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div className="flex items-center justify-end gap-3 mt-4 w-full">
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10.64px] text-[#556179]">Show:</span>
                <Dropdown<number>
                  options={pageSizeOptions}
                  value={pageSize}
                  onChange={(value) => handlePageSizeChange(value)}
                  buttonClassName="px-3 py-2 border border-[#EBEBEB] rounded-lg bg-[#fefefb] text-[10.64px] text-black hover:bg-gray-50 min-w-[60px]"
                  menuClassName="border border-[#EBEBEB] rounded-lg bg-[#fefefb] shadow-lg"
                  width="w-auto"
                  align="right"
                />
              </div>
              <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${currentPage === pageNum
                          ? "bg-white text-[#136D6D] font-semibold"
                          : "text-black hover:bg-gray-50"
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                    ...
                  </span>
                )}
                {totalPages > 5 && (
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className={`px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer ${currentPage === totalPages
                        ? "bg-white text-[#136D6D] font-semibold"
                        : "text-black hover:bg-gray-50"
                      }`}
                  >
                    {totalPages}
                  </button>
                )}
                <button
                  onClick={() =>
                    handlePageChange(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
