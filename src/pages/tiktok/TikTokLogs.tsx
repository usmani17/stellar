import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { parseDateToYYYYMMDD } from "../../utils/dateHelpers";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { useDateRange } from "../../contexts/DateRangeContext";
// import { Button } from "../../components/ui";
import {
    tiktokLogsService,
    type TikTokLogsQueryParams,
} from "../../services/tiktok/tiktokLogs";
import { TikTokLogsTable, type TikTokLog } from "./components/TikTokLogsTable";

const ENTITY_TYPE_OPTIONS = [
    { value: "", label: "All Entity Types" },
    { value: "campaign", label: "Campaign" },
    { value: "adgroup", label: "Ad Group" },
    { value: "ad", label: "Ad" },
];

// Helper to format Date to YYYY-MM-DD string for API calls - moved outside component
const formatDateForApi = (date: Date | null | undefined): string | undefined => {
    if (!date) return undefined;
    try {
        return parseDateToYYYYMMDD(date.toISOString());
    } catch {
        return undefined;
    }
};

export const TikTokLogs: React.FC = () => {
    const { accountId } = useParams<{ accountId: string }>();
    const { sidebarWidth } = useSidebar();
    const { startDate, endDate } = useDateRange();

    // State
    const [logs, setLogs] = useState<TikTokLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(50);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [entityTypeFilter, setEntityTypeFilter] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setPageTitle("TikTok Logs");
        return () => resetPageTitle();
    }, []);

    const fetchLogs = useCallback(async () => {
        if (!accountId) return;

        setLoading(true);
        setError(null);
        try {
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
                parseInt(accountId),
                params
            );

            setLogs(response.logs || []);
            setTotal(response.total || 0);
            setTotalPages(response.total_pages || 1);
        } catch (err) {
            console.error("Error fetching TikTok logs:", err);
            setError("Failed to fetch logs. Please try again.");
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [accountId, page, pageSize, searchQuery, entityTypeFilter, startDate, endDate]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // handleExport removed

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchLogs();
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

                        {/* Filters */}
                        <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-6">
                            <div className="flex flex-wrap gap-4 items-center">
                                {/* Search */}
                                <form onSubmit={handleSearch} className="flex-1 min-w-[300px]">
                                    <div className="relative search-input-container">
                                        <input
                                            type="text"
                                            placeholder="Search logs..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-[#f0f0ed] border-none rounded-lg focus:outline-none text-[13.3px] text-[#0b0f16] font-['GT_America_Trial']"
                                        />
                                        <svg
                                            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#556179]"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                            />
                                        </svg>
                                    </div>
                                </form>

                                {/* Entity Type Filter */}
                                <div className="relative min-w-[200px]">
                                    <select
                                        value={entityTypeFilter}
                                        onChange={(e) => {
                                            setEntityTypeFilter(e.target.value);
                                            setPage(1);
                                        }}
                                        className="w-full pl-4 pr-10 py-2 bg-[#f0f0ed] border border-[#e8e8e3] rounded-lg focus:outline-none appearance-none text-[13.3px] text-[#0b0f16]"
                                    >
                                        {ENTITY_TYPE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                        <svg className="w-4 h-4 text-[#556179]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Logs Table Wrapper */}
                        <div className="w-full">
                            <TikTokLogsTable logs={logs} loading={loading} error={error} />
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-end mt-4">
                                <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                                    >
                                        Previous
                                    </button>
                                    <span className="px-4 py-2 border-r border-gray-200 text-[10.64px] text-black bg-white font-semibold">
                                        {page} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
