import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDateRange } from "../../../../contexts/DateRangeContext";
import { toLocalDateString } from "../../../../utils/dateHelpers";
import { Button } from "../../../../components/ui";
import { tiktokLogsService } from "../../../../services/tiktok/tiktokLogs";
import type { TikTokLogEntry } from "../../../../services/tiktok/tiktokLogs";

interface TikTokCampaignDetailLogsTabProps {
    accountId: string;
    campaignId?: string;
}

export const TikTokCampaignDetailLogsTab: React.FC<TikTokCampaignDetailLogsTabProps> = ({
    accountId,
    campaignId,
}) => {
    const { startDate, endDate, startDateStr, endDateStr } = useDateRange();
    const [logs, setLogs] = useState<TikTokLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(100);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const exportDropdownRef = useRef<HTMLDivElement>(null);
    const [exportLoading, setExportLoading] = useState(false);
    const isLoadingRef = useRef(false);
    // Load logs - memoized with useCallback
    const loadLogs = useCallback(async () => {
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

            const accountIdNum = parseInt(accountId, 10);
            if (isNaN(accountIdNum)) {
                throw new Error("Invalid account ID");
            }

            const response = await tiktokLogsService.getTikTokLogs(accountIdNum, {
                campaign_id: campaignId,
                page: currentPage,
                page_size: pageSize,
                search: search || undefined,
                start_date: startDateStr,
                end_date: endDateStr,
            });

            setLogs(response.logs);
            setTotalPages(response.total_pages || 1);
            setTotal(response.total || 0);
            setLoading(false);
        } catch (error: any) {
            console.error("Error loading TikTok logs:", error);
            if (error?.response) {
                console.error("API Error Response:", error.response.data);
                console.error("API Error Status:", error.response.status);
            }
            setLogs([]);
            setTotalPages(1);
            setTotal(0);
            setLoading(false);
        } finally {
            isLoadingRef.current = false;
        }
    }, [accountId, campaignId, startDateStr, endDateStr, currentPage, pageSize, search]);

    // Initial load and reload when filters or page change
    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, startDateStr, endDateStr]);

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

    const handleExport = async (exportType: "all_data" | "current_view") => {
        if (!accountId) return;

        setShowExportDropdown(true);
        setExportLoading(true);
        try {
            const accountIdNum = parseInt(accountId, 10);
            if (isNaN(accountIdNum)) {
                throw new Error("Invalid account ID");
            }

            const params: any = {
                start_date: startDateStr,
                end_date: endDateStr,
                export_type: exportType,
            };

            if (campaignId) {
                params.campaign_id = campaignId;
            }

            if (search) {
                params.search = search;
            }

            if (exportType === "current_view") {
                params.page = currentPage;
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

    const formatTimestamp = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            return `${month}/${day}/${year} ${hours}:${minutes}`;
        } catch (e) {
            return timestamp || "";
        }
    };

    const getActionColor = (action: string) => {
        const a = action?.toUpperCase();
        switch (a) {
            case "CREATE":
                return "text-blue-b10Alt bg-[#e3eeff]";
            case "UPDATE":
                return "text-[#ff991f] bg-[#fff6e6]";
            case "DELETE":
                return "text-red-r30 bg-[#ffebe6]";
            default:
                return "text-[#556179] bg-[#f4f5f7]";
        }
    };

    return (
        <div className="w-full inline-flex flex-col justify-start items-start">
            <div className="self-stretch bg-sandstorm-s0 rounded-xl p-3 border border-sandstorm-s40">
                {/* Header Section - Search and Export */}
                <div className="w-full flex justify-end items-center mb-2 gap-3">
                    <div className="flex items-center gap-3">
                        {/* Search Input */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search logs..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="px-2 py-1 bg-white border border-[#E3E3E3] rounded-lg text-xs text-[#072929] placeholder-[#556179] focus:outline-none focus:border-[#136D6D] w-56"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
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
                </div>

                {/* Table Container */}
                <div className="self-stretch bg-white rounded-lg border border-sandstorm-s40 shadow-sm overflow-hidden mb-2">
                    {loading ? (
                        <div className="flex items-center justify-center h-[calc(100vh-300px)] w-full">
                            <div className="text-forest-f60">Loading...</div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[calc(100vh-300px)] w-full py-8 px-4">
                            <div className="flex flex-col items-center justify-center max-w-md">
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
                                <h3 className="text-lg font-medium text-teal-950 mb-2">
                                    No Logs Found
                                </h3>
                                <p className="text-sm text-[#556179] text-center leading-relaxed">
                                    {campaignId
                                        ? "There are no log entries for this campaign yet. Logs will appear here when changes are made."
                                        : "There are no log entries for the selected filters. Try adjusting your date range or search."}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[calc(100vh-300px)] w-full flex items-start overflow-auto">
                            {/* Timestamp Column */}
                            <div className="flex flex-col justify-start items-start flex-shrink-0 min-w-[120px]">
                                <div className="self-stretch h-10 px-2 py-2 border-b border-[#e8e8e3] flex flex-col justify-center items-start">
                                    <div className="self-stretch justify-start text-teal-950 text-xs font-medium">
                                        Timestamp
                                    </div>
                                </div>
                                {logs.map((log) => (
                                    <div
                                        key={`timestamp-${log.id}`}
                                        className="self-stretch h-10 px-2 py-1.5 border-b border-[#e8e8e3] flex flex-col justify-center items-start"
                                    >
                                        <div className="justify-center text-teal-950 text-xs font-normal">
                                            {formatTimestamp(log.changed_at)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* User Column */}
                            <div className="flex flex-col justify-start items-start flex-shrink-0 min-w-[90px]">
                                <div className="self-stretch h-10 px-2 py-2 border-b border-[#e8e8e3] flex flex-col justify-center items-start">
                                    <div className="self-stretch justify-start text-teal-950 text-xs font-medium">
                                        User
                                    </div>
                                </div>
                                {logs.map((log) => (
                                    <div
                                        key={`user-${log.id}`}
                                        className="self-stretch h-10 px-2 py-1.5 border-b border-[#e8e8e3] flex flex-col justify-center items-start"
                                    >
                                        <div className="justify-center text-teal-950 text-xs font-normal truncate w-full" title={log.changed_by_name || "System"}>
                                            {log.changed_by_name || "System"}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Action Column */}
                            <div className="flex flex-col justify-start items-start flex-shrink-0 min-w-[70px]">
                                <div className="self-stretch h-10 px-2 py-2 border-b border-[#e8e8e3] flex flex-col justify-center items-start">
                                    <div className="self-stretch justify-start text-teal-950 text-xs font-medium">
                                        Action
                                    </div>
                                </div>
                                {logs.map((log) => (
                                    <div
                                        key={`action-${log.id}`}
                                        className="self-stretch h-10 px-2 py-1.5 border-b border-[#e8e8e3] flex flex-col justify-center items-start"
                                    >
                                        <div className="justify-center text-teal-950 text-xs font-normal">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Entity Type Column */}
                            <div className="flex flex-col justify-start items-start flex-shrink-0 min-w-[90px]">
                                <div className="self-stretch h-10 px-2 py-2 border-b border-[#e8e8e3] flex flex-col justify-center items-start">
                                    <div className="self-stretch justify-start text-teal-950 text-xs font-medium">
                                        Entity Type
                                    </div>
                                </div>
                                {logs.map((log) => (
                                    <div
                                        key={`entity-type-${log.id}`}
                                        className="self-stretch h-10 px-2 py-1.5 border-b border-[#e8e8e3] flex flex-col justify-center items-start"
                                    >
                                        <div className="justify-center text-teal-950 text-xs font-normal capitalize">
                                            {log.entity_type}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Entity Name Column */}
                            <div className="flex flex-col justify-start items-start flex-1 min-w-[200px]">
                                <div className="self-stretch h-10 px-2 py-2 border-b border-[#e8e8e3] flex flex-col justify-center items-start">
                                    <div className="self-stretch justify-start text-teal-950 text-xs font-medium">
                                        Entity Name
                                    </div>
                                </div>
                                {logs.map((log) => (
                                    <div
                                        key={`entity-name-${log.id}`}
                                        className="self-stretch h-10 px-2 py-1.5 border-b border-[#e8e8e3] flex flex-col justify-center items-start min-w-0"
                                    >
                                        <div
                                            className="justify-center text-teal-950 text-xs font-normal truncate w-full"
                                            title={log.entity_name}
                                        >
                                            {log.entity_name}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Field Column */}
                            <div className="flex flex-col justify-start items-start flex-shrink-0 min-w-[110px] max-w-[140px]">
                                <div className="self-stretch h-10 px-2 py-2 border-b border-[#e8e8e3] flex flex-col justify-center items-start">
                                    <div className="self-stretch justify-start text-teal-950 text-xs font-medium">
                                        Field
                                    </div>
                                </div>
                                {logs.map((log) => (
                                    <div
                                        key={`field-${log.id}`}
                                        className="self-stretch h-10 px-2 py-1.5 border-b border-[#e8e8e3] flex flex-col justify-center items-start min-w-0"
                                    >
                                        <div
                                            className="justify-center text-teal-950 text-xs font-normal truncate w-full"
                                            title={log.field_name}
                                        >
                                            {log.field_name || "—"}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Old Value Column */}
                            <div className="flex flex-col justify-start items-start flex-shrink-0 min-w-[110px] max-w-[160px]">
                                <div className="self-stretch h-10 px-2 py-2 border-b border-[#e8e8e3] flex flex-col justify-center items-start">
                                    <div className="self-stretch justify-start text-teal-950 text-xs font-medium">
                                        Old Value
                                    </div>
                                </div>
                                {logs.map((log) => (
                                    <div
                                        key={`old-value-${log.id}`}
                                        className="self-stretch h-10 px-2 py-1.5 border-b border-[#e8e8e3] flex flex-col justify-center items-start min-w-0"
                                    >
                                        <div
                                            className="justify-center text-[#556179] text-xs font-normal truncate w-full"
                                            title={log.old_value || ""}
                                        >
                                            {log.old_value || "—"}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* New Value Column */}
                            <div className="flex flex-col justify-start items-start flex-shrink-0 min-w-[110px] max-w-[160px]">
                                <div className="self-stretch h-10 px-2 py-2 border-b border-[#e8e8e3] flex flex-col justify-center items-start">
                                    <div className="self-stretch justify-start text-teal-950 text-xs font-medium">
                                        New Value
                                    </div>
                                </div>
                                {logs.map((log) => (
                                    <div
                                        key={`new-value-${log.id}`}
                                        className="self-stretch h-10 px-2 py-1.5 border-b border-[#e8e8e3] flex flex-col justify-center items-start min-w-0"
                                    >
                                        <div
                                            className="justify-center text-[#556179] text-xs font-normal truncate w-full"
                                            title={log.new_value || ""}
                                        >
                                            {log.new_value || "—"}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Method Column */}
                            <div className="flex flex-col justify-start items-start flex-shrink-0 min-w-[70px]">
                                <div className="self-stretch h-10 px-2 py-2 border-b border-[#e8e8e3] flex flex-col justify-center items-start">
                                    <div className="self-stretch justify-start text-teal-950 text-xs font-medium">
                                        Method
                                    </div>
                                </div>
                                {logs.map((log) => (
                                    <div
                                        key={`method-${log.id}`}
                                        className="self-stretch h-10 px-2 py-1.5 border-b border-[#e8e8e3] flex flex-col justify-center items-start"
                                    >
                                        <div className="justify-center text-teal-950 text-xs font-normal">
                                            {log.method}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Status Column */}
                            <div className="flex flex-col justify-start items-start flex-shrink-0 min-w-[70px]">
                                <div className="self-stretch h-10 px-2 py-2 border-b border-[#e8e8e3] flex flex-col justify-center items-start">
                                    <div className="self-stretch justify-start text-teal-950 text-xs font-medium">
                                        Status
                                    </div>
                                </div>
                                {logs.map((log) => (
                                    <div
                                        key={`status-${log.id}`}
                                        className="self-stretch h-10 px-2 py-1.5 border-b border-[#e8e8e3] flex flex-col justify-center items-start"
                                    >
                                        <div
                                            className={`justify-center text-xs font-normal ${
                                                log.status === "success"
                                                    ? "text-green-600"
                                                    : log.status === "error" || log.status === "failed"
                                                    ? "text-red-600"
                                                    : "text-teal-950"
                                            }`}
                                        >
                                            {log.status === "success" ? "Success" : log.status === "error" || log.status === "failed" ? "Failed" : log.status}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {!loading && logs.length > 0 && (
                    <div className="w-full flex justify-between items-center flex-nowrap mt-2">
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm text-[#556179]">
                                Showing {((currentPage - 1) * pageSize) + 1} to{" "}
                                {Math.min(currentPage * pageSize, total)} of {total} logs
                            </span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
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
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                                >
                                    First
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                                >
                                    Previous
                                </button>
                                <span className="px-3 py-2 text-[10.64px] text-[#556179] border-r border-gray-200">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                                >
                                    Next
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePageChange(totalPages)}
                                    disabled={currentPage === totalPages}
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
    );
};
