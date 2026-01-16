import React, { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Checkbox } from "../../../components/ui/Checkbox";
import { Dropdown } from "../../../components/ui/Dropdown";

export interface TikTokAd {
    ad_id: string;
    ad_name: string;
    adgroup_id?: string;
    adgroup_name: string;
    campaign_id?: string;
    campaign_name: string;
    ad_format: string;
    operation_status: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpm?: number;
}

interface TikTokAdsTableProps {
    ads: TikTokAd[];
    loading: boolean;
    sortBy: string;
    sortOrder: "asc" | "desc";
    onSort: (column: string) => void;
    // Selection Props
    selectedIds: Set<string>;
    onSelect: (id: string, checked: boolean) => void;
    onSelectAll: (checked: boolean) => void;
    // Summary Props
    summary?: {
        total_ads: number;
        total_spend: number;
        total_impressions: number;
        total_clicks: number;
        total_conversions: number;
        avg_ctr: number;
        avg_cpc: number;
    } | null;
    // Inline Edit Callbacks
    onUpdateAdName?: (adId: string, newName: string) => void;
    onUpdateAdStatus?: (adId: string, newStatus: string) => void;
}

export const TikTokAdsTable: React.FC<TikTokAdsTableProps> = ({
    ads,
    loading,
    sortBy,
    sortOrder,
    onSort,
    selectedIds,
    onSelect,
    onSelectAll,
    summary,
    onUpdateAdName,
    onUpdateAdStatus,
}) => {
    // Internal Inline Edit State
    const [editingCell, setEditingCell] = useState<{
        ad_id: string;
        field: "ad_name" | "operation_status";
    } | null>(null);
    const [editedValue, setEditedValue] = useState<string>("");
    const [isCancelling, setIsCancelling] = useState(false);
    const isStartingEditRef = useRef(false);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(value);
    };

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat("en-US").format(value);
    };

    const formatPercentage = (value: number) => {
        return `${value.toFixed(2)}%`;
    };

    const getSortIcon = (column: string) => {
        if (sortBy !== column) {
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

    // Inline Edit Logic
    const startInlineEdit = (
        ad: TikTokAd,
        field: "ad_name" | "operation_status"
    ) => {
        isStartingEditRef.current = true;
        setEditingCell({ ad_id: ad.ad_id, field });
        setEditedValue(field === "ad_name" ? ad.ad_name : ad.operation_status);

        setTimeout(() => {
            isStartingEditRef.current = false;
        }, 300);
    };

    const cancelInlineEdit = () => {
        setIsCancelling(true);
        setEditingCell(null);
        setEditedValue("");
        setTimeout(() => {
            setIsCancelling(false);
        }, 100);
    };

    const handleInlineEditChange = (value: string) => {
        setEditedValue(value);
    };

    const confirmInlineEdit = (newValueOverride?: string) => {
        if (!editingCell || isCancelling) return;

        const ad = ads.find((a) => a.ad_id === editingCell.ad_id);
        if (!ad) return;

        const valueToCheck =
            newValueOverride !== undefined ? newValueOverride : editedValue;

        // Check if value actually changed
        const currentValue =
            editingCell.field === "ad_name" ? ad.ad_name : ad.operation_status;

        if (valueToCheck === currentValue) {
            cancelInlineEdit();
            return;
        }

        // Trigger callback
        if (editingCell.field === "ad_name" && onUpdateAdName) {
            onUpdateAdName(editingCell.ad_id, valueToCheck);
        } else if (editingCell.field === "operation_status" && onUpdateAdStatus) {
            onUpdateAdStatus(editingCell.ad_id, valueToCheck);
        }

        setEditingCell(null);
        setEditedValue("");
    };

    // Cancel inline edit when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isStartingEditRef.current) return;

            if (editingCell) {
                const target = event.target as HTMLElement;
                const isDropdownContainer = target.closest(".dropdown-container");
                const isDropdownMenu =
                    target.closest('[class*="z-50"]') ||
                    target.closest('[class*="z-[100000]"]') || // Dropdown portal z-index
                    target.closest('[class*="shadow-lg"]');
                const isInput = target.closest("input");
                const isModal = target.closest('[class*="fixed"]');

                if (!isInput && !isDropdownMenu && !isModal && !isDropdownContainer) {
                    setTimeout(() => {
                        if (editingCell && !isCancelling) {
                            cancelInlineEdit();
                        }
                    }, 150);
                }
            }
        };

        if (editingCell) {
            const timeout = setTimeout(() => {
                document.addEventListener("mousedown", handleClickOutside);
            }, 300);

            return () => {
                clearTimeout(timeout);
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }
    }, [editingCell, isCancelling]);

    const allSelected = ads.length > 0 && ads.every((ad) => selectedIds.has(ad.ad_id));
    const isIndeterminate =
        selectedIds.size > 0 && selectedIds.size < ads.length;

    return (
        <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
                {loading ? (
                    <div className="text-center py-8 text-[#556179] text-[13.3px]">
                        Loading ads...
                    </div>
                ) : ads.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-[13.3px] text-[#556179] mb-4">
                            No ads found
                        </p>
                    </div>
                ) : (
                    <div className="max-h-[600px] overflow-y-auto">
                        <table className="min-w-[1400px] w-full">
                            <thead className="sticky top-0 bg-sandstorm-s20 z-10">
                                <tr className="border-b border-[#e8e8e3]">
                                    {/* Checkbox Header */}
                                    <th className="table-header w-[35px]">
                                        <div className="flex items-center justify-center">
                                            <Checkbox
                                                checked={allSelected}
                                                indeterminate={isIndeterminate}
                                                onChange={onSelectAll}
                                            />
                                        </div>
                                    </th>

                                    {/* Ad Name */}
                                    <th
                                        className="table-header"
                                        onClick={() => onSort("ad_name")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Ad Name
                                            {getSortIcon("ad_name")}
                                        </div>
                                    </th>

                                    {/* Ad Group Name */}
                                    <th
                                        className="table-header"
                                        onClick={() => onSort("adgroup_name")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Ad Group
                                            {getSortIcon("adgroup_name")}
                                        </div>
                                    </th>

                                    {/* Campaign Name */}
                                    <th
                                        className="table-header"
                                        onClick={() => onSort("campaign_name")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Campaign
                                            {getSortIcon("campaign_name")}
                                        </div>
                                    </th>

                                    {/* Ad Format */}
                                    <th
                                        className="table-header"
                                        onClick={() => onSort("ad_format")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Format
                                            {getSortIcon("ad_format")}
                                        </div>
                                    </th>

                                    {/* Status */}
                                    <th
                                        className="table-header"
                                        onClick={() => onSort("operation_status")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Status
                                            {getSortIcon("operation_status")}
                                        </div>
                                    </th>

                                    {/* Spend */}
                                    <th
                                        className="table-header"
                                        onClick={() => onSort("spend")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Spend
                                            {getSortIcon("spend")}
                                        </div>
                                    </th>

                                    {/* Impressions */}
                                    <th
                                        className="table-header"
                                        onClick={() => onSort("impressions")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Impressions
                                            {getSortIcon("impressions")}
                                        </div>
                                    </th>

                                    {/* Clicks */}
                                    <th
                                        className="table-header"
                                        onClick={() => onSort("clicks")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Clicks
                                            {getSortIcon("clicks")}
                                        </div>
                                    </th>

                                    {/* Conversions */}
                                    <th
                                        className="table-header"
                                        onClick={() => onSort("conversions")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Conversions
                                            {getSortIcon("conversions")}
                                        </div>
                                    </th>

                                    {/* CTR */}
                                    <th
                                        className="table-header"
                                        onClick={() => onSort("ctr")}
                                    >
                                        <div className="flex items-center gap-1">
                                            CTR
                                            {getSortIcon("ctr")}
                                        </div>
                                    </th>

                                    {/* CPC */}
                                    <th
                                        className="table-header"
                                        onClick={() => onSort("cpc")}
                                    >
                                        <div className="flex items-center gap-1">
                                            CPC
                                            {getSortIcon("cpc")}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Summary Row */}
                                {summary && (
                                    <tr className="table-summary-row">
                                        <td className="table-cell"></td>
                                        <td className="table-cell table-text leading-[1.26]">
                                            Total ({summary.total_ads})
                                        </td>
                                        <td className="table-cell"></td>
                                        <td className="table-cell"></td>
                                        <td className="table-cell"></td>
                                        <td className="table-cell"></td>
                                        <td className="table-cell table-text leading-[1.26]">
                                            {formatCurrency(summary.total_spend)}
                                        </td>
                                        <td className="table-cell table-text leading-[1.26]">
                                            {formatNumber(summary.total_impressions)}
                                        </td>
                                        <td className="table-cell table-text leading-[1.26]">
                                            {formatNumber(summary.total_clicks)}
                                        </td>
                                        <td className="table-cell table-text leading-[1.26]">
                                            {formatNumber(summary.total_conversions)}
                                        </td>
                                        <td className="table-cell table-text leading-[1.26]">
                                            {formatPercentage(summary.avg_ctr)}
                                        </td>
                                        <td className="table-cell table-text leading-[1.26]">
                                            {formatCurrency(summary.avg_cpc)}
                                        </td>
                                    </tr>
                                )}

                                {ads.map((item) => {
                                    const isSelected = selectedIds.has(item.ad_id);
                                    return (
                                        <tr
                                            key={item.ad_id}
                                            className="table-row group"
                                        >
                                            <td className="table-cell">
                                                <div className="flex items-center justify-center">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onChange={(checked) =>
                                                            onSelect(item.ad_id, checked)
                                                        }
                                                    />
                                                </div>
                                            </td>
                                            <td className="table-cell">
                                                {editingCell?.ad_id === item.ad_id && editingCell?.field === "ad_name" ? (
                                                    <input
                                                        type="text"
                                                        value={editedValue}
                                                        onChange={(e) => handleInlineEditChange(e.target.value)}
                                                        onBlur={(e) => {
                                                            if (isCancelling) return;
                                                            confirmInlineEdit(e.target.value);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.currentTarget.blur();
                                                            } else if (e.key === "Escape") {
                                                                cancelInlineEdit();
                                                            }
                                                        }}
                                                        autoFocus
                                                        maxLength={512}
                                                        className="table-text leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-full min-w-[150px] max-w-[200px]"
                                                    />
                                                ) : (
                                                    <div
                                                        className={`table-text leading-[1.26] font-medium text-left truncate block w-full whitespace-nowrap ${onUpdateAdName
                                                            ? "cursor-pointer hover:underline"
                                                            : ""
                                                            }`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onUpdateAdName) {
                                                                startInlineEdit(item, "ad_name");
                                                            }
                                                        }}
                                                        title={item.ad_name}
                                                    >
                                                        {item.ad_name}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="table-cell">
                                                <div className="table-text leading-[1.26] text-left">
                                                    {item.adgroup_name}
                                                </div>
                                            </td>
                                            <td className="table-cell">
                                                <div className="table-text leading-[1.26] text-left">
                                                    {item.campaign_id ? (
                                                        <Link to={`/accounts/${1}/tiktok/campaigns/${item.campaign_id}`} className="hover:underline hover:text-[#136D6D]">
                                                            {item.campaign_name}
                                                        </Link>
                                                    ) : (
                                                        item.campaign_name
                                                    )}
                                                </div>
                                            </td>
                                            <td className="table-cell">
                                                <span className="table-text leading-[1.26]">
                                                    {item.ad_format}
                                                </span>
                                            </td>
                                            <td className="table-cell">
                                                {editingCell?.ad_id === item.ad_id && editingCell?.field === "operation_status" ? (
                                                    <div className="dropdown-container w-[100px]">
                                                        <Dropdown
                                                            options={[
                                                                { value: "ENABLE", label: "Enable" },
                                                                { value: "DISABLE", label: "Disable" },
                                                                { value: "DELETE", label: "Delete" },
                                                            ]}
                                                            value={editedValue}
                                                            onChange={(value) => {
                                                                handleInlineEditChange(value);
                                                                confirmInlineEdit(value);
                                                            }}
                                                            onClose={cancelInlineEdit}
                                                            defaultOpen={true}
                                                            closeOnSelect={true}
                                                            buttonClassName="w-full px-2 py-1 text-[13.3px] text-black border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#136D6D]"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={`text-[13.3px] leading-[1.26] ${onUpdateAdStatus
                                                            ? "cursor-pointer hover:underline"
                                                            : ""
                                                            }`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onUpdateAdStatus) {
                                                                startInlineEdit(item, "operation_status");
                                                            }
                                                        }}
                                                    >
                                                        <StatusBadge status={item.operation_status} />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="table-cell">
                                                <span className="table-text leading-[1.26]">
                                                    {formatCurrency(item.spend)}
                                                </span>
                                            </td>
                                            <td className="table-cell">
                                                <span className="table-text leading-[1.26]">
                                                    {formatNumber(item.impressions)}
                                                </span>
                                            </td>
                                            <td className="table-cell">
                                                <span className="table-text leading-[1.26]">
                                                    {formatNumber(item.clicks)}
                                                </span>
                                            </td>
                                            <td className="table-cell">
                                                <span className="table-text leading-[1.26]">
                                                    {formatNumber(item.conversions)}
                                                </span>
                                            </td>
                                            <td className="table-cell">
                                                <span className="table-text leading-[1.26]">
                                                    {formatPercentage(item.ctr)}
                                                </span>
                                            </td>
                                            <td className="table-cell">
                                                <span className="table-text leading-[1.26]">
                                                    {formatCurrency(item.cpc)}
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
