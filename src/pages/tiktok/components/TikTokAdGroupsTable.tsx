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
    // Selection Props - matching TikTokCampaignsTable pattern
    selectedAdgroups?: Set<string | number>;
    onSelectionChange?: (selected: Set<string | number>) => void;
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
    // Inline Edit Props (optional) - callbacks trigger confirmation modal in parent
    onUpdateAdGroupName?: (adgroup_id: string, newName: string) => void;
    onUpdateAdGroupStatus?: (adgroup_id: string, newStatus: string) => void;
    onUpdateAdGroupBudget?: (adgroup_id: string, newBudget: number) => void;
}

export const TikTokAdGroupsTable: React.FC<TikTokAdGroupsTableProps> = ({
    adgroups,
    loading,
    sortBy,
    sortOrder,
    onSort,
    selectedAdgroups = new Set(),
    onSelectionChange,
    summary,
    onUpdateAdGroupName,
    onUpdateAdGroupStatus,
    onUpdateAdGroupBudget,
}) => {
    // Helper to check if ad group is deleted
    const isDeleted = (adgroup: TikTokAdGroup): boolean => {
        const statusLower = adgroup.operation_status?.toLowerCase() || "";
        return statusLower === "deleted" || statusLower === "delete";
    };

    const handleSelectAdgroup = (adgroupId: string, checked: boolean) => {
        if (!onSelectionChange) return;
        const newSelected = new Set(selectedAdgroups);
        if (checked) {
            newSelected.add(adgroupId);
        } else {
            newSelected.delete(adgroupId);
        }
        onSelectionChange(newSelected);
    };

    const handleSelectAll = (checked: boolean) => {
        if (!onSelectionChange) return;
        if (checked) {
            // Only select non-deleted ad groups
            const selectableIds = new Set(
                adgroups
                    .filter(ag => !isDeleted(ag))
                    .map(ag => ag.adgroup_id)
            );
            onSelectionChange(selectableIds);
        } else {
            onSelectionChange(new Set());
        }
    };

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

    const confirmInlineEdit = (newValueOverride?: string) => {
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

        // Call the appropriate update handler (parent shows confirmation modal)
        if (editingCell.field === "adgroup_name" && onUpdateAdGroupName) {
            onUpdateAdGroupName(editingCell.adgroup_id, valueToCheck.trim());
        } else if (editingCell.field === "operation_status" && onUpdateAdGroupStatus) {
            onUpdateAdGroupStatus(editingCell.adgroup_id, valueToCheck.trim());
        } else if (editingCell.field === "budget" && onUpdateAdGroupBudget) {
            const budgetValue = parseFloat(valueToCheck.trim()) || 0;
            onUpdateAdGroupBudget(editingCell.adgroup_id, budgetValue);
        }

        // Clear editing state - parent modal handles the rest
        setEditingCell(null);
        setEditedValue("");
    };

    // Cancel inline edit when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isStartingEditRef.current) {
                return;
            }

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

    // Only count non-deleted ad groups for "all selected" check
    const selectableAdgroups = adgroups.filter(ag => !isDeleted(ag));
    const allSelected = selectableAdgroups.length > 0 && selectableAdgroups.every(ag => selectedAdgroups.has(ag.adgroup_id));
    const someSelected = selectableAdgroups.some(ag => selectedAdgroups.has(ag.adgroup_id));

    return (
        <div className="table-container">
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
                                    <th className="table-header w-[35px]">
                                        <div className="flex items-center justify-center">
                                            <Checkbox
                                                checked={allSelected}
                                                indeterminate={someSelected && !allSelected}
                                                onChange={(checked) => handleSelectAll(checked)}
                                                size="small"
                                            />
                                        </div>
                                    </th>

                                    {/* Ad Group Name */}
                                    <th
                                        className="table-header"
                                        onClick={() => onSort("adgroup_name")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Ad Group Name
                                            {getSortIcon("adgroup_name")}
                                        </div>
                                    </th>

                                    {/* Campaign Name */}
                                    <th
                                        className="table-header"
                                        onClick={() => onSort("campaign_name")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Campaign Name
                                            {getSortIcon("campaign_name")}
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

                                    {/* Budget */}
                                    <th
                                        className="table-header"
                                        onClick={() => onSort("budget")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Budget
                                            {getSortIcon("budget")}
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
                                            Total ({summary.total_adgroups})
                                        </td>
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

                                {adgroups.map((item) => {
                                    const isSelected = selectedAdgroups.has(item.adgroup_id);
                                    const adgroupIsDeleted = isDeleted(item);
                                    return (
                                        <tr
                                            key={item.adgroup_id}
                                            className={`table-row group ${adgroupIsDeleted ? "opacity-60" : ""
                                                }`}
                                        >
                                            <td className="table-cell">
                                                <div className="flex items-center justify-center">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onChange={(checked) =>
                                                            handleSelectAdgroup(item.adgroup_id, checked)
                                                        }
                                                        size="small"
                                                    />
                                                </div>
                                            </td>
                                            {/* Ad Group Name - Editable */}
                                            <td className="table-cell">
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
                                                        className="table-text leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-full min-w-[150px] max-w-[200px]"
                                                    />
                                                ) : (
                                                    <div
                                                        className={`text-[13.3px] text-left truncate block w-full whitespace-nowrap ${false // isArchived - add this check if needed
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
                                            <td className="table-cell">
                                                <div className="table-text leading-[1.26] text-left">
                                                    {/* If we had campaign ID, we'd link it. For now just text or optional link */}
                                                    {item.campaign_id ? (
                                                        <Link to={`/brands/${1}/tiktok-campaigns/${item.campaign_id}`} className="hover:underline hover:text-[#136D6D]">
                                                            {item.campaign_name}
                                                        </Link>
                                                    ) : (
                                                        item.campaign_name
                                                    )}
                                                </div>
                                            </td>
                                            {/* Status - Editable (read-only for deleted) */}
                                            <td className="table-cell">
                                                {adgroupIsDeleted ? (
                                                    <div className="text-[13.3px] leading-[1.26] cursor-not-allowed">
                                                        <StatusBadge status="DELETED" />
                                                    </div>
                                                ) : editingCell?.adgroup_id === item.adgroup_id && editingCell?.field === "operation_status" ? (
                                                    <div className="dropdown-container">
                                                        <Dropdown
                                                            options={[
                                                                { value: "ENABLE", label: "Enable" },
                                                                { value: "DISABLE", label: "Pause" },
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
                                                            buttonClassName="inline-edit-dropdown"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={`text-[13.3px] leading-[1.26] ${onUpdateAdGroupStatus ? "cursor-pointer hover:underline" : ""
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
                                            {/* Budget - Editable (read-only for deleted) */}
                                            <td className="table-cell">
                                                {adgroupIsDeleted ? (
                                                    <div className="text-[13.3px] text-gray-400 cursor-not-allowed">
                                                        {formatCurrency(item.budget)}
                                                    </div>
                                                ) : editingCell?.adgroup_id === item.adgroup_id && editingCell?.field === "budget" ? (
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
                                                        className="table-text leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-full min-w-[150px] max-w-[200px]"
                                                    />
                                                ) : (
                                                    <div
                                                        className={`text-[13.3px] text-left truncate block w-full whitespace-nowrap ${onUpdateAdGroupBudget ? "text-[#0b0f16] cursor-pointer hover:underline" : "text-[#0b0f16]"
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
