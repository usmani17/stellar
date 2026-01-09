import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Checkbox } from "../../../components/ui/Checkbox";
import { Dropdown } from "../../../components/ui/Dropdown";

export interface TikTokAdGroup {
    adgroup_id: string; // Using string as per interface, though API might return number
    adgroup_name: string;
    campaign_id?: string; // Added for linking
    campaign_name: string;
    operation_status: string;
    budget: number;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpc: number;
}

interface TikTokAdGroupsTableProps {
    adgroups: TikTokAdGroup[];
    loading: boolean;
    sortBy: string;
    sortOrder: "asc" | "desc";
    onSort: (column: string) => void;
    // Selection Props
    selectedIds: Set<string>; // Assuming IDs are strings based on interface
    onSelect: (id: string, checked: boolean) => void;
    onSelectAll: (checked: boolean) => void;
    // Summary Props
    summary?: {
        total_adgroups: number;
        total_spend: number;
        total_impressions: number;
        total_clicks: number;
        total_conversions: number;
        avg_ctr: number;
        avg_cpc: number;
    } | null;
    // Inline Edit Props (optional)
    onUpdateAdGroupName?: (adgroup_id: string, newName: string) => Promise<void>;
    onUpdateAdGroupStatus?: (adgroup_id: string, newStatus: string) => Promise<void>;
    onUpdateAdGroupBudget?: (adgroup_id: string, newBudget: number) => Promise<void>;
}

export const TikTokAdGroupsTable: React.FC<TikTokAdGroupsTableProps> = ({
    adgroups,
    loading,
    sortBy,
    sortOrder,
    onSort,
    selectedIds,
    onSelect,
    onSelectAll,
    summary,
    onUpdateAdGroupName,
    onUpdateAdGroupStatus,
    onUpdateAdGroupBudget,
}) => {
    // Inline edit state
    const [editingCell, setEditingCell] = useState<{
        adgroup_id: string;
        field: "adgroup_name" | "operation_status" | "budget";
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

    // Inline edit handlers
    const startInlineEdit = (
        adgroup: TikTokAdGroup,
        field: "adgroup_name" | "operation_status" | "budget"
    ) => {
        isStartingEditRef.current = true;
        setEditingCell({ adgroup_id: adgroup.adgroup_id, field });
        if (field === "adgroup_name") {
            setEditedValue(adgroup.adgroup_name || "");
        } else if (field === "operation_status") {
            setEditedValue(adgroup.operation_status || "ENABLE");
        } else if (field === "budget") {
            setEditedValue((adgroup.budget || 0).toString());
        }
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

    const confirmInlineEdit = async (newValueOverride?: string) => {
        if (!editingCell || isCancelling) return;

        const adgroup = adgroups.find(
            (ag) => ag.adgroup_id === editingCell.adgroup_id
        );
        if (!adgroup) return;

        const valueToCheck =
            newValueOverride !== undefined ? newValueOverride : editedValue;

        // Check if value actually changed
        let hasChanged = false;
        if (editingCell.field === "budget") {
            const newBudgetStr = valueToCheck.trim();
            const newBudget = newBudgetStr === "" ? 0 : parseFloat(newBudgetStr);
            const oldBudget = adgroup.budget || 0;

            if (isNaN(newBudget)) {
                cancelInlineEdit();
                return;
            }
            hasChanged = Math.abs(newBudget - oldBudget) > 0.01;
        } else if (editingCell.field === "operation_status") {
            const oldValue = (adgroup.operation_status || "ENABLE").trim();
            const newValue = valueToCheck.trim();
            hasChanged = newValue !== oldValue;
        } else if (editingCell.field === "adgroup_name") {
            const oldValue = (adgroup.adgroup_name || "").trim();
            const newValue = valueToCheck.trim();
            hasChanged = newValue !== oldValue && newValue.length > 0;
        }

        if (!hasChanged) {
            cancelInlineEdit();
            return;
        }

        // Call the appropriate update handler
        try {
            if (editingCell.field === "adgroup_name" && onUpdateAdGroupName) {
                await onUpdateAdGroupName(editingCell.adgroup_id, valueToCheck.trim());
            } else if (editingCell.field === "operation_status" && onUpdateAdGroupStatus) {
                await onUpdateAdGroupStatus(editingCell.adgroup_id, valueToCheck.trim());
            } else if (editingCell.field === "budget" && onUpdateAdGroupBudget) {
                const budgetValue = parseFloat(valueToCheck.trim()) || 0;
                await onUpdateAdGroupBudget(editingCell.adgroup_id, budgetValue);
            }
            setEditingCell(null);
            setEditedValue("");
        } catch (error) {
            console.error("Error updating ad group:", error);
            cancelInlineEdit();
        }
    };

    // Cancel inline edit when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isStartingEditRef.current) {
                return;
            }

            if (editingCell) {
                const target = event.target as HTMLElement;
                const isDropdownMenu =
                    target.closest('[class*="z-50"]') ||
                    target.closest('[class*="shadow-lg"]') ||
                    target.closest('button[type="button"]');
                const isInput = target.closest("input");
                const isModal = target.closest('[class*="fixed"]');

                if (!isInput && !isDropdownMenu && !isModal) {
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

    const allSelected = adgroups.length > 0 && adgroups.every((ag) => selectedIds.has(ag.adgroup_id));
    const isIndeterminate =
        selectedIds.size > 0 && selectedIds.size < adgroups.length;

    return (
        <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
                {loading ? (
                    <div className="text-center py-8 text-[#556179] text-[13.3px]">
                        Loading ad groups...
                    </div>
                ) : adgroups.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-[13.3px] text-[#556179] mb-4">
                            No ad groups found
                        </p>
                    </div>
                ) : (
                    <div className="max-h-[600px] overflow-y-auto">
                        <table className="min-w-[1200px] w-full">
                            <thead className="sticky top-0 bg-sandstorm-s20 z-10">
                                <tr className="border-b border-[#e8e8e3]">
                                    {/* Checkbox Header */}
                                    <th className="text-left py-[10px] px-[10px] w-[35px]">
                                        <div className="flex items-center justify-center">
                                            <Checkbox
                                                checked={allSelected}
                                                indeterminate={isIndeterminate}
                                                onChange={onSelectAll}
                                            />
                                        </div>
                                    </th>

                                    {/* Ad Group Name */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("adgroup_name")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Ad Group Name
                                            {getSortIcon("adgroup_name")}
                                        </div>
                                    </th>

                                    {/* Campaign Name */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("campaign_name")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Campaign Name
                                            {getSortIcon("campaign_name")}
                                        </div>
                                    </th>

                                    {/* Status */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("operation_status")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Status
                                            {getSortIcon("operation_status")}
                                        </div>
                                    </th>

                                    {/* Budget */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("budget")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Budget
                                            {getSortIcon("budget")}
                                        </div>
                                    </th>

                                    {/* Spend */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("spend")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Spend
                                            {getSortIcon("spend")}
                                        </div>
                                    </th>

                                    {/* Impressions */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("impressions")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Impressions
                                            {getSortIcon("impressions")}
                                        </div>
                                    </th>

                                    {/* Clicks */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("clicks")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Clicks
                                            {getSortIcon("clicks")}
                                        </div>
                                    </th>

                                    {/* Conversions */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("conversions")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Conversions
                                            {getSortIcon("conversions")}
                                        </div>
                                    </th>

                                    {/* CTR */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
                                        onClick={() => onSort("ctr")}
                                    >
                                        <div className="flex items-center gap-1">
                                            CTR
                                            {getSortIcon("ctr")}
                                        </div>
                                    </th>

                                    {/* CPC */}
                                    <th
                                        className="text-left py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] cursor-pointer hover:bg-gray-50"
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
                                    <tr className="bg-[#f5f5f0] font-semibold">
                                        <td className="py-[10px] px-[10px]"></td>
                                        <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            Total ({summary.total_adgroups})
                                        </td>
                                        <td className="py-[10px] px-[10px]"></td>
                                        <td className="py-[10px] px-[10px]"></td>
                                        <td className="py-[10px] px-[10px]"></td>
                                        <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {formatCurrency(summary.total_spend)}
                                        </td>
                                        <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {formatNumber(summary.total_impressions)}
                                        </td>
                                        <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {formatNumber(summary.total_clicks)}
                                        </td>
                                        <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {formatNumber(summary.total_conversions)}
                                        </td>
                                        <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {formatPercentage(summary.avg_ctr)}
                                        </td>
                                        <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                            {formatCurrency(summary.avg_cpc)}
                                        </td>
                                    </tr>
                                )}

                                {adgroups.map((item) => {
                                    const isSelected = selectedIds.has(item.adgroup_id);
                                    return (
                                        <tr
                                            key={item.adgroup_id}
                                            className="group border-b border-[#e8e8e3] hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="py-[10px] px-[10px]">
                                                <div className="flex items-center justify-center">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onChange={(checked) =>
                                                            onSelect(item.adgroup_id, checked)
                                                        }
                                                    />
                                                </div>
                                            </td>
                                            {/* Ad Group Name - Editable */}
                                            <td className="py-[10px] px-[10px]">
                                                {editingCell?.adgroup_id === item.adgroup_id && editingCell?.field === "adgroup_name" ? (
                                                    <input
                                                        type="text"
                                                        value={editedValue}
                                                        onChange={(e) => handleInlineEditChange(e.target.value)}
                                                        onBlur={(e) => {
                                                            if (isCancelling) return;
                                                            const inputValue = e.target.value;
                                                            if (inputValue === item.adgroup_name || inputValue === "") {
                                                                cancelInlineEdit();
                                                            } else {
                                                                confirmInlineEdit(inputValue);
                                                            }
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
                                                        className="text-[13.3px] text-[#0b0f16] leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-full min-w-[150px] max-w-[200px]"
                                                    />
                                                ) : (
                                                    <div
                                                        className={`text-[13.3px] text-left truncate block w-full whitespace-nowrap ${
                                                            false // isArchived - add this check if needed
                                                                ? "text-gray-400 cursor-not-allowed"
                                                                : "text-[#0b0f16] cursor-pointer hover:underline"
                                                        }`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onUpdateAdGroupName) {
                                                                startInlineEdit(item, "adgroup_name");
                                                            }
                                                        }}
                                                        title={item.adgroup_name}
                                                    >
                                                        {item.adgroup_name}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-[10px] px-[10px]">
                                                <div className="text-[13.3px] text-[#0b0f16] leading-[1.26] text-left">
                                                    {/* If we had campaign ID, we'd link it. For now just text or optional link */}
                                                    {item.campaign_id ? (
                                                        <Link to={`/accounts/${1}/tiktok-campaigns/${item.campaign_id}`} className="hover:underline hover:text-[#136D6D]">
                                                            {item.campaign_name}
                                                        </Link>
                                                    ) : (
                                                        item.campaign_name
                                                    )}
                                                </div>
                                            </td>
                                            {/* Status - Editable */}
                                            <td className="py-[10px] px-[10px]">
                                                {editingCell?.adgroup_id === item.adgroup_id && editingCell?.field === "operation_status" ? (
                                                    <div className="dropdown-container">
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
                                                            defaultOpen={true}
                                                            closeOnSelect={true}
                                                            buttonClassName="w-full px-2 py-1 text-[13.3px] text-black border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#136D6D]"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={`text-[13.3px] leading-[1.26] ${
                                                            false // isArchived - add this check if needed
                                                                ? "cursor-not-allowed opacity-60"
                                                                : onUpdateAdGroupStatus ? "cursor-pointer hover:underline" : ""
                                                        }`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onUpdateAdGroupStatus) {
                                                                startInlineEdit(item, "operation_status");
                                                            }
                                                        }}
                                                    >
                                                        <StatusBadge status={item.operation_status} />
                                                    </div>
                                                )}
                                            </td>
                                            {/* Budget - Editable */}
                                            <td className="py-[10px] px-[10px]">
                                                {editingCell?.adgroup_id === item.adgroup_id && editingCell?.field === "budget" ? (
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={editedValue}
                                                        onChange={(e) => handleInlineEditChange(e.target.value)}
                                                        onBlur={(e) => {
                                                            if (isCancelling) return;
                                                            const inputValue = e.target.value;
                                                            const oldValue = (item.budget || 0).toString();
                                                            if (inputValue === oldValue || inputValue === "") {
                                                                cancelInlineEdit();
                                                            } else {
                                                                confirmInlineEdit(inputValue);
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.currentTarget.blur();
                                                            } else if (e.key === "Escape") {
                                                                cancelInlineEdit();
                                                            }
                                                        }}
                                                        autoFocus
                                                        className="text-[13.3px] text-[#0b0f16] leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-full min-w-[150px] max-w-[200px]"
                                                    />
                                                ) : (
                                                    <div
                                                        className={`text-[13.3px] text-left truncate block w-full whitespace-nowrap ${
                                                            false // isArchived - add this check if needed
                                                                ? "text-gray-400 cursor-not-allowed"
                                                                : onUpdateAdGroupBudget ? "text-[#0b0f16] cursor-pointer hover:underline" : "text-[#0b0f16]"
                                                        }`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onUpdateAdGroupBudget) {
                                                                startInlineEdit(item, "budget");
                                                            }
                                                        }}
                                                    >
                                                        {formatCurrency(item.budget)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-[10px] px-[10px]">
                                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                                    {formatCurrency(item.spend)}
                                                </span>
                                            </td>
                                            <td className="py-[10px] px-[10px]">
                                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                                    {formatNumber(item.impressions)}
                                                </span>
                                            </td>
                                            <td className="py-[10px] px-[10px]">
                                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                                    {formatNumber(item.clicks)}
                                                </span>
                                            </td>
                                            <td className="py-[10px] px-[10px]">
                                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                                    {formatNumber(item.conversions)}
                                                </span>
                                            </td>
                                            <td className="py-[10px] px-[10px]">
                                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
                                                    {formatPercentage(item.ctr)}
                                                </span>
                                            </td>
                                            <td className="py-[10px] px-[10px]">
                                                <span className="text-[13.3px] text-[#0b0f16] leading-[1.26]">
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
