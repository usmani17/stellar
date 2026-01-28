import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { parseDateToYYYYMMDD, toLocalDateString } from "../../utils/dateHelpers";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { useDateRange } from "../../contexts/DateRangeContext";
import { Button } from "../../components/ui";
import {
    tiktokLogsService,
    type TikTokLogsQueryParams,
    type TikTokLogsExportParams,
} from "../../services/tiktok/tiktokLogs";
import { TikTokLogsTable, type TikTokLog } from "./components/TikTokLogsTable";

const ENTITY_TYPE_OPTIONS = [
    { value: "", label: "All Entity Types" },
    { value: "campaign", label: "Campaign" },
    { value: "adgroup", label: "Ad Group" },
    { value: "ad", label: "Ad" },
];

// Helper to format Date to YYYY-MM-DD in local time for API calls
const formatDateForApi = (date: Date | null | undefined): string | undefined => {
    if (!date) return undefined;
    try {
        return toLocalDateString(date);
    } catch {
        return undefined;
    }
};

export const TikTokLogs: React.FC = () => {
    const { accountId } = useParams<{ accountId: string }>();
    const { sidebarWidth } = useSidebar();
    const { startDate, endDate, startDateStr, endDateStr } = useDateRange();

    // State
    const [logs, setLogs] = useState<TikTokLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(100);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [entityTypeFilter, setEntityTypeFilter] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const exportDropdownRef = useRef<HTMLDivElement>(null);
    const [exportLoading, setExportLoading] = useState(false);
    const isLoadingRef = useRef(false);

    useEffect(() => {
        setPageTitle("TikTok Logs");
        return () => resetPageTitle();
    }, []);

    const fetchLogs = useCallback(async () => {
        // Prevent duplicate concurrent calls
        if (isLoadingRef.current) {
            return;
        }

        if (!accountId) {
            setLoading(false);
            return;
        }

        try {
            isLoadingRef.current = true;
            setLoading(true);
            setError(null);

            const accountIdNum = parseInt(accountId, 10);
            if (isNaN(accountIdNum)) {
                throw new Error("Invalid account ID");
            }

            const params: TikTokLogsQueryParams = {
                page,
                page_size: pageSize,
            };

            if (searchQuery) {
                params.search = searchQuery;
            }
            if (entityTypeFilter) {
                params.entity_type = entityTypeFilter;
            }

            const formattedStartDate = formatDateForApi(startDate);
            const formattedEndDate = formatDateForApi(endDate);

            if (formattedStartDate) {
                params.start_date = formattedStartDate;
            }
            if (formattedEndDate) {
                params.end_date = formattedEndDate;
            }

            const response = await tiktokLogsService.getTikTokLogs(
                accountIdNum,
                params
            );

            setLogs(response.logs || []);
            setTotal(response.total || 0);
            setTotalPages(response.total_pages || 1);
            setLoading(false);
        } catch (err: any) {
            console.error("Error fetching TikTok logs:", err);
            if (err?.response) {
                console.error("API Error Response:", err.response.data);
                console.error("API Error Status:", err.response.status);
            }
            setError("Failed to fetch logs. Please try again.");
            setLogs([]);
            setTotalPages(1);
            setTotal(0);
            setLoading(false);
        } finally {
            isLoadingRef.current = false;
        }
    }, [accountId, page, pageSize, searchQuery, entityTypeFilter, startDate?.toISOString(), endDate?.toISOString()]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Reset to page 1 when search or filters change
    useEffect(() => {
        setPage(1);
    }, [searchQuery, entityTypeFilter, startDate?.toISOString(), endDate?.toISOString()]);

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

            const params: TikTokLogsExportParams = {
                start_date: startDateStr,
                end_date: endDateStr,
                export_type: exportType,
            };

            if (searchQuery) {
                params.search = searchQuery;
            }

            if (entityTypeFilter) {
                params.entity_type = entityTypeFilter;
            }

            if (exportType === "current_view") {
                params.page = page;
                params.page_size = pageSize;
            }

            const result = await tiktokLogsService.exportTikTokLogs(accountIdNum, params);

            // Automatically download the file
            const link = document.createElement("a");
            link.href = result.url;
            link.download = result.filename || `tiktok_logs_${toLocalDateString(new Date())}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    return (
        <div className="min-h-screen bg-white flex">
            <Sidebar />
            <div
                className="flex-1 min-w-0 w-full"
                style={{ marginLeft: `${sidebarWidth}px` }}
            >
                <DashboardHeader />
                <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white overflow-x-hidden min-w-0">
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <h1 className="text-[20px] sm:text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                                TikTok Logs
                            </h1>
                            <span className="text-[13.3px] text-[#556179]">
                                {total} {total === 1 ? "log" : "logs"} found
                            </span>
                        </div>

                        {/* Filters and Export */}
                        <div className="bg-sandstorm-s0 rounded-xl p-3 border border-sandstorm-s40">
                            {/* Header Section - Search and Export */}
                            <div className="w-full flex justify-between items-center mb-2 gap-3 flex-wrap">
                                <div className="flex flex-wrap gap-4 items-center flex-1 min-w-[300px]">
                                    {/* Search Input */}
                                    <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px]">
                                        <input
                                            type="text"
                                            placeholder="Search logs..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="px-2 py-1 bg-white border border-[#E3E3E3] rounded-lg text-xs text-[#072929] placeholder-[#556179] focus:outline-none focus:border-[#136D6D] w-full"
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchQuery("")}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#556179] hover:text-[#072929]"
                                            >
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M6 18L18 6M6 6l12 12"
                                                    />
                                                </svg>
                                            </button>
                                        )}
                                    </form>

                                    {/* Entity Type Filter */}
                                    <div className="relative min-w-[200px]">
                                        <select
                                            value={entityTypeFilter}
                                            onChange={(e) => {
                                                setEntityTypeFilter(e.target.value);
                                                setPage(1);
                                            }}
                                            className="px-2 py-1 bg-white border border-[#E3E3E3] rounded-lg text-xs text-[#072929] focus:outline-none focus:border-[#136D6D] w-full appearance-none"
                                        >
                                            {ENTITY_TYPE_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg className="w-4 h-4 text-[#556179]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Export Dropdown */}
                                <div className="relative inline-flex justify-end" ref={exportDropdownRef}>
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
                                                        { value: "all_data", label: "Export All Data" },
                                                        { value: "current_view", label: "Export Current View" },
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            className="w-full text-left px-3 py-2 text-[12px] text-[#072929] hover:bg-[#f9f9f6] transition-colors cursor-pointer flex items-center gap-3"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                await handleExport(opt.value as "all_data" | "current_view");
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

                            {/* Table Container */}
                            <div className="self-stretch bg-white rounded-lg border border-sandstorm-s40 shadow-sm overflow-hidden mb-2">
                                <TikTokLogsTable logs={logs} loading={loading} error={error} />
                            </div>

                            {/* Pagination */}
                            {!loading && logs.length > 0 && (
                                <div className="w-full flex justify-between items-center flex-nowrap mt-2">
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-sm text-[#556179]">
                                            Showing {((page - 1) * pageSize) + 1} to{" "}
                                            {Math.min(page * pageSize, total)} of {total} logs
                                        </span>
                                        <select
                                            value={pageSize}
                                            onChange={(e) => {
                                                setPageSize(Number(e.target.value));
                                                setPage(1);
                                            }}
                                            className="px-2 py-1 bg-white border border-[#E3E3E3] rounded text-sm text-[#072929] focus:outline-none focus:border-[#136D6D] flex-shrink-0"
                                        >
                                            <option value={10}>10 per page</option>
                                            <option value={25}>25 per page</option>
                                            <option value={50}>50 per page</option>
                                            <option value={100}>100 per page</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => handlePageChange(1)}
                                                disabled={page === 1}
                                                className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                                            >
                                                First
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handlePageChange(page - 1)}
                                                disabled={page === 1}
                                                className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                                            >
                                                Previous
                                            </button>
                                            <span className="px-3 py-2 text-[10.64px] text-[#556179] border-r border-gray-200">
                                                Page {page} of {totalPages}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handlePageChange(page + 1)}
                                                disabled={page === totalPages}
                                                className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                                            >
                                                Next
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handlePageChange(totalPages)}
                                                disabled={page === totalPages}
                                                className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                                            >
                                                Last
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
