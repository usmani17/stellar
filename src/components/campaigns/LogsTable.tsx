import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDateRange } from "../../contexts/DateRangeContext";
import { Button } from "../ui";
import { logsService } from "../../services/logs";

interface LogsTableProps {
  accountId?: string;
  campaignId?: string;
  showHeader?: boolean;
  showExport?: boolean;
}

export const LogsTable: React.FC<LogsTableProps> = ({
  accountId,
  campaignId,
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
      changedBy: string;
      changedAt: string;
      method: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const isInitialLoadRef = useRef(true);
  const POLLING_INTERVAL = 5000; // 5 seconds

  // Load logs - memoized with useCallback to avoid infinite loops
  const loadLogs = useCallback(
    async (isPolling = false) => {
      if (!accountId) {
        setLoading(false);
        return;
      }

      // Only show loading state on initial load, not during polling
      if (!isPolling) {
        setLoading(true);
      }

      try {
        const accountIdNum = parseInt(accountId, 10);
        if (isNaN(accountIdNum)) {
          throw new Error("Invalid account ID");
        }

        const response = await logsService.getLogs(accountIdNum, {
          campaign_id: campaignId,
          page: currentPage,
          page_size: 10,
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
          changedBy: string;
          changedAt: string;
          method: string;
        }> = response.logs.map((log) => ({
          id: log.id,
          entity: log.entity,
          field: log.field,
          oldValue: log.old_value || "",
          newValue: log.new_value || "",
          changedBy: log.changed_by_name || "Unknown",
          changedAt: (() => {
            try {
              const date = new Date(log.changed_at);
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
          method: log.method,
        }));

        setLogs(transformedLogs);
        setTotalPages(response.total_pages || 1);
        setLoading(false);
        isInitialLoadRef.current = false;
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
        isInitialLoadRef.current = false;
      }
    },
    [accountId, campaignId, startDate, endDate, currentPage]
  );

  // Initial load and reload when filters change
  useEffect(() => {
    // Clear existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Load logs immediately
    isInitialLoadRef.current = true;
    loadLogs(false);

    // Set up polling interval for real-time updates
    pollingIntervalRef.current = setInterval(() => {
      loadLogs(true); // Pass true to indicate this is a polling request
    }, POLLING_INTERVAL);

    // Cleanup function
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [accountId, campaignId, startDate, endDate, loadLogs]);

  // Handle page changes separately (don't reset polling, just reload)
  useEffect(() => {
    if (!isInitialLoadRef.current && accountId) {
      loadLogs(true); // Use polling mode to avoid showing loading spinner
    }
  }, [currentPage, loadLogs, accountId]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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

  const handleExport = async (_exportType: "all_data" | "current_view") => {
    if (!accountId) return;

    setShowExportDropdown(true);
    setExportLoading(true);
    try {
      // TODO: Implement actual export API call
      // For now, just simulate the export
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Close dropdown after a short delay to show success
      setTimeout(() => {
        setShowExportDropdown(false);
      }, 500);
    } catch (error: any) {
      console.error("Failed to export logs:", error);
      setShowExportDropdown(false);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="w-full inline-flex flex-col justify-start items-start gap-4">
      {/* Main Container - All content inside sandstorm-s0 container */}
      <div className="self-stretch bg-sandstorm-s0 rounded-xl p-6 border border-sandstorm-s40">
        {/* Header Section - Title and Export Dropdown */}
        {showHeader && (
          <div className="w-full flex justify-between items-center mb-4">
            <h1 className="text-teal-950 text-2xl font-medium">
              Log / History
            </h1>
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
        <div className="self-stretch bg-white rounded-lg border border-sandstorm-s40 shadow-sm overflow-hidden mb-4">
          {loading ? (
            <div className="flex items-center justify-center h-64 w-full">
              <div className="text-forest-f60">Loading...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[616px] w-full py-12 px-6">
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
                    : "There are no log entries for the selected filters. Try adjusting your date range or filters."}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-[616px] w-full flex items-start overflow-auto">
              {/* Entity Column */}
              <div className="flex flex-col justify-start items-start flex-shrink-0">
                <div className="self-stretch h-14 px-5 py-3 border-b border-stone-200 flex flex-col justify-center items-start">
                  <div className="self-stretch justify-start text-teal-950 text-sm font-medium leading-5">
                    Entity
                  </div>
                </div>
                {logs.map((log) => (
                  <div
                    key={`entity-${log.id}`}
                    className="self-stretch h-14 px-5 py-2 border-b border-stone-200 flex flex-col justify-center items-start"
                  >
                    <div className="justify-center text-teal-950 text-sm font-normal">
                      {log.entity}
                    </div>
                  </div>
                ))}
              </div>

              {/* Field Column */}
              <div className="w-80 flex flex-col justify-start items-start flex-shrink-0">
                <div className="self-stretch h-14 px-5 py-3 border-b border-stone-200 flex flex-col justify-center items-start">
                  <div className="self-stretch justify-start text-teal-950 text-sm font-medium leading-5">
                    Field
                  </div>
                </div>
                {logs.map((log) => (
                  <div
                    key={`field-${log.id}`}
                    className="self-stretch h-14 px-5 py-2 border-b border-stone-200 flex flex-col justify-center items-start"
                  >
                    <div className="self-stretch justify-center text-teal-950 text-sm font-normal">
                      {log.field}
                    </div>
                  </div>
                ))}
              </div>

              {/* Old Value Column */}
              <div className="flex flex-col justify-start items-start flex-shrink-0">
                <div className="self-stretch h-14 px-5 py-3 border-b border-stone-200 flex flex-col justify-center items-start">
                  <div className="self-stretch justify-start text-teal-950 text-sm font-medium leading-5">
                    Old Value
                  </div>
                </div>
                {logs.map((log) => (
                  <div
                    key={`old-${log.id}`}
                    className="self-stretch h-14 px-5 py-2 border-b border-stone-200 flex flex-col justify-center items-start"
                  >
                    <div className="justify-center text-teal-950 text-sm font-normal">
                      {log.oldValue}
                    </div>
                  </div>
                ))}
              </div>

              {/* New Value Column */}
              <div className="flex flex-col justify-start items-start flex-shrink-0">
                <div className="self-stretch h-14 px-5 py-3 border-b border-stone-200 flex flex-col justify-center items-start">
                  <div className="self-stretch justify-start text-teal-950 text-sm font-medium leading-5">
                    New Value
                  </div>
                </div>
                {logs.map((log) => (
                  <div
                    key={`new-${log.id}`}
                    className="self-stretch h-14 px-5 py-2 border-b border-stone-200 flex flex-col justify-center items-start"
                  >
                    <div className="justify-center text-teal-950 text-sm font-normal">
                      {log.newValue}
                    </div>
                  </div>
                ))}
              </div>

              {/* Changed By Column */}
              <div className="flex flex-col justify-start items-start flex-shrink-0">
                <div className="self-stretch h-14 px-5 py-3 border-b border-stone-200 flex flex-col justify-center items-start">
                  <div className="self-stretch justify-start text-teal-950 text-sm font-medium leading-5">
                    Changed By
                  </div>
                </div>
                {logs.map((log) => (
                  <div
                    key={`by-${log.id}`}
                    className="self-stretch h-14 px-5 py-2 border-b border-stone-200 flex flex-col justify-center items-start"
                  >
                    <div className="justify-center text-teal-950 text-sm font-normal">
                      {log.changedBy}
                    </div>
                  </div>
                ))}
              </div>

              {/* Changed At Column */}
              <div className="flex flex-col justify-start items-start flex-shrink-0">
                <div className="self-stretch h-14 px-5 py-3 border-b border-stone-200 flex flex-col justify-center items-start">
                  <div className="justify-start text-teal-950 text-sm font-medium leading-5">
                    Changed At
                  </div>
                </div>
                {logs.map((log) => (
                  <div
                    key={`at-${log.id}`}
                    className="self-stretch h-14 px-5 py-2 border-b border-stone-200 flex flex-col justify-center items-start"
                  >
                    <div className="justify-center text-teal-950 text-sm font-normal">
                      {log.changedAt}
                    </div>
                  </div>
                ))}
              </div>

              {/* Method Column */}
              <div className="flex-1 flex flex-col justify-start items-start min-w-0">
                <div className="self-stretch h-14 px-5 py-3 border-b border-stone-200 flex flex-col justify-center items-start">
                  <div className="justify-start text-teal-950 text-sm font-medium leading-5">
                    Method
                  </div>
                </div>
                {logs.map((log) => (
                  <div
                    key={`method-${log.id}`}
                    className="self-stretch h-14 px-5 py-2 border-b border-stone-200 flex flex-col justify-center items-start"
                  >
                    <div className="justify-center text-teal-950 text-sm font-normal">
                      {log.method}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pagination - Figma Style */}
        {!loading && logs.length > 0 && (
          <div className="w-full flex items-center justify-end gap-2">
            <span className="text-sm text-teal-950">Page</span>
            <div className="relative">
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= totalPages) {
                    handlePageChange(page);
                  }
                }}
                className="w-16 px-2 py-1.5 border border-stone-200 rounded text-sm text-teal-950 text-center focus:outline-none focus:ring-2 focus:ring-forest-f40"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                <button
                  onClick={() => {
                    if (currentPage < totalPages) {
                      handlePageChange(currentPage + 1);
                    }
                  }}
                  disabled={currentPage >= totalPages}
                  className="h-2.5 w-3 flex items-center justify-center text-teal-950 hover:text-forest-f40 disabled:opacity-30 disabled:cursor-not-allowed"
                  type="button"
                >
                  <svg
                    className="w-2 h-2"
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
                </button>
                <button
                  onClick={() => {
                    if (currentPage > 1) {
                      handlePageChange(currentPage - 1);
                    }
                  }}
                  disabled={currentPage <= 1}
                  className="h-2.5 w-3 flex items-center justify-center text-teal-950 hover:text-forest-f40 disabled:opacity-30 disabled:cursor-not-allowed"
                  type="button"
                >
                  <svg
                    className="w-2 h-2"
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
                </button>
              </div>
            </div>
            <span className="text-sm text-teal-950">
              of {totalPages} Result
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
