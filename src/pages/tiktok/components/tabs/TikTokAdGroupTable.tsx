import React, { useState, useRef } from "react";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { Dropdown } from "../../../../components/ui/Dropdown";
import { campaignsService } from "../../../../services/campaigns";
import type { TikTokAdGroup } from "./types";

interface TikTokAdGroupTableProps {
    adgroups: TikTokAdGroup[];
    loading: boolean;
    selectedAdGroupIds: Set<string>;
    onSelectAll: (checked: boolean) => void;
    onSelectAdGroup: (id: string, checked: boolean) => void;
    sortBy: string;
    sortOrder: "asc" | "desc";
    onSort: (column: string) => void;
    onRefresh: () => void;
    accountId: number;
    showColumns?: ("adgroup_name" | "operation_status" | "budget" | "spend" | "impressions" | "clicks" | "conversions" | "ctr" | "cpc" | "sales")[];
}

export const TikTokAdGroupTable: React.FC<TikTokAdGroupTableProps> = ({
    adgroups,
    loading,
    selectedAdGroupIds,
    onSelectAll,
    onSelectAdGroup,
    sortBy,
    sortOrder,
    onSort,
    onRefresh,
    accountId,
    showColumns = ["adgroup_name", "operation_status", "budget", "spend", "impressions", "clicks", "conversions", "ctr", "cpc", "sales"],
}) => {
    // Inline edit state
    const [editingCell, setEditingCell] = useState<{
        adgroup_id: string;
        field: "adgroup_name" | "operation_status" | "budget";
    } | null>(null);
    const [editedValue, setEditedValue] = useState<string>("");
    const [isCancelling, setIsCancelling] = useState(false);
    const isStartingEditRef = useRef(false);

    // Inline edit confirmation modal state
    const [showInlineEditModal, setShowInlineEditModal] = useState(false);
    const [pendingInlineEdit, setPendingInlineEdit] = useState<{
        adgroup: TikTokAdGroup;
        field: "adgroup_name" | "operation_status" | "budget";
        newValue: string;
    } | null>(null);
    const [inlineEditLoading, setInlineEditLoading] = useState(false);

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
        return `${(value || 0).toFixed(2)}%`;
    };

    const startInlineEdit = (adgroup: TikTokAdGroup, field: "adgroup_name" | "operation_status" | "budget") => {
        isStartingEditRef.current = true;
        setEditingCell({ adgroup_id: adgroup.adgroup_id, field });
        if (field === "budget") {
            setEditedValue((adgroup.budget || 0).toString());
        } else if (field === "adgroup_name") {
            setEditedValue(adgroup.adgroup_name);
        } else {
            setEditedValue(adgroup.operation_status);
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

    const confirmInlineEdit = (valueToSave: string) => {
        if (!editingCell || !accountId) return;

        const adgroup = adgroups.find(ag => ag.adgroup_id === editingCell.adgroup_id);
        if (!adgroup) return;

        // Check if value actually changed
        let currentValue = "";
        if (editingCell.field === "budget") {
            currentValue = (adgroup.budget || 0).toString();
        } else if (editingCell.field === "adgroup_name") {
            currentValue = adgroup.adgroup_name;
        } else {
            currentValue = adgroup.operation_status;
        }

        if (valueToSave === currentValue) {
            cancelInlineEdit();
            return;
        }

        setPendingInlineEdit({
            adgroup,
            field: editingCell.field,
            newValue: valueToSave,
        });
        setShowInlineEditModal(true);
    };

    const runInlineEdit = async () => {
        if (!pendingInlineEdit || !accountId) return;

        setInlineEditLoading(true);
        try {
            const payload: any = {};
            if (pendingInlineEdit.field === "adgroup_name") {
                payload.adgroup_name = pendingInlineEdit.newValue;
            } else if (pendingInlineEdit.field === "operation_status") {
                payload.operation_status = pendingInlineEdit.newValue;
            } else if (pendingInlineEdit.field === "budget") {
                payload.budget = parseFloat(pendingInlineEdit.newValue);
            }

            await campaignsService.updateTikTokAdGroup(accountId, pendingInlineEdit.adgroup.adgroup_id, payload);

            onRefresh();
        } catch (error: any) {
            console.error("Inline update failed:", error);
            const errorMessage = error.response?.data?.message || error.message || "Failed to update ad group";
            alert(errorMessage);
        } finally {
            setInlineEditLoading(false);
            setShowInlineEditModal(false);
            setPendingInlineEdit(null);
            cancelInlineEdit();
        }
    };

    const getSortIcon = (column: string) => {
        if (sortBy !== column) {
            return (
                <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            );
        }
        return sortOrder === "asc" ? (
            <svg className="w-4 h-4 ml-1 text-[#136D6D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
        ) : (
            <svg className="w-4 h-4 ml-1 text-[#136D6D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        );
    };

    const isVisible = (column: NonNullable<TikTokAdGroupTableProps["showColumns"]>[number]) => showColumns.includes(column);

    return (
        <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
                {loading ? (
                    <div className="text-center py-8 text-[#556179] text-[13.3px]">Loading ad groups...</div>
                ) : adgroups.length === 0 ? (
                    <div className="text-center py-8 text-[#556179] text-[13.3px]">No ad groups found</div>
                ) : (
                    <table className="w-full min-w-full">
                        <thead className="bg-[#f5f5f0]">
                            <tr className="border-b border-[#e8e8e3]">
                                <th className="table-header w-[40px]">
                                    <div className="flex items-center justify-center">
                                        <Checkbox
                                            checked={adgroups.length > 0 && adgroups.every(ag => selectedAdGroupIds.has(ag.adgroup_id))}
                                            onChange={onSelectAll}
                                        />
                                    </div>
                                </th>
                                {isVisible("adgroup_name") && (
                                    <th className="table-header cursor-pointer hover:bg-gray-100" onClick={() => onSort("adgroup_name")}>
                                        <div className="flex items-center gap-1">Ad Group Name {getSortIcon("adgroup_name")}</div>
                                    </th>
                                )}
                                {isVisible("ctr") && (
                                    <th className="table-header cursor-pointer hover:bg-gray-100" onClick={() => onSort("ctr")}>
                                        <div className="flex items-center gap-1">CTR {getSortIcon("ctr")}</div>
                                    </th>
                                )}
                                {isVisible("operation_status") && (
                                    <th className="table-header cursor-pointer hover:bg-gray-100" onClick={() => onSort("operation_status")}>
                                        <div className="flex items-center gap-1">Status {getSortIcon("operation_status")}</div>
                                    </th>
                                )}
                                {isVisible("budget") && (
                                    <th className="table-header cursor-pointer hover:bg-gray-100" onClick={() => onSort("budget")}>
                                        <div className="flex items-center gap-1">Budget {getSortIcon("budget")}</div>
                                    </th>
                                )}
                                {isVisible("spend") && (
                                    <th className="table-header cursor-pointer hover:bg-gray-100" onClick={() => onSort("spend")}>
                                        <div className="flex items-center gap-1">Spend {getSortIcon("spend")}</div>
                                    </th>
                                )}
                                {isVisible("impressions") && (
                                    <th className="table-header cursor-pointer hover:bg-gray-100" onClick={() => onSort("impressions")}>
                                        <div className="flex items-center gap-1">Impressions {getSortIcon("impressions")}</div>
                                    </th>
                                )}
                                {isVisible("clicks") && (
                                    <th className="table-header cursor-pointer hover:bg-gray-100" onClick={() => onSort("clicks")}>
                                        <div className="flex items-center gap-1">Clicks {getSortIcon("clicks")}</div>
                                    </th>
                                )}
                                {isVisible("conversions") && (
                                    <th className="table-header cursor-pointer hover:bg-gray-100" onClick={() => onSort("conversions")}>
                                        <div className="flex items-center gap-1">Conversions {getSortIcon("conversions")}</div>
                                    </th>
                                )}
                                {isVisible("cpc") && (
                                    <th className="table-header cursor-pointer hover:bg-gray-100" onClick={() => onSort("cpc")}>
                                        <div className="flex items-center gap-1">CPC {getSortIcon("cpc")}</div>
                                    </th>
                                )}
                                {isVisible("sales") && (
                                    <th className="table-header cursor-pointer hover:bg-gray-100" onClick={() => onSort("sales")}>
                                        <div className="flex items-center gap-1">Sales {getSortIcon("sales")}</div>
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {adgroups.map((item, index) => {
                                const isLastRow = index === adgroups.length - 1;
                                const isSelected = selectedAdGroupIds.has(item.adgroup_id);
                                return (
                                    <tr
                                        key={item.adgroup_id}
                                        className={`hover:bg-gray-50 transition-colors ${!isLastRow ? "border-b border-[#e8e8e3]" : ""} ${isSelected ? "bg-gray-50" : ""}`}
                                    >
                                        <td className="table-cell">
                                            <div className="flex items-center justify-center">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onChange={(checked) => onSelectAdGroup(item.adgroup_id, checked)}
                                                />
                                            </div>
                                        </td>
                                        {isVisible("adgroup_name") && (
                                            <td className="table-cell">
                                                {editingCell?.adgroup_id === item.adgroup_id && editingCell?.field === "adgroup_name" ? (
                                                    <input
                                                        type="text"
                                                        value={editedValue}
                                                        onChange={(e) => handleInlineEditChange(e.target.value)}
                                                        onBlur={(e) => {
                                                            if (isCancelling) return;
                                                            confirmInlineEdit(e.target.value);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") e.currentTarget.blur();
                                                            else if (e.key === "Escape") cancelInlineEdit();
                                                        }}
                                                        autoFocus
                                                        maxLength={512}
                                                        className="table-text leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-full"
                                                    />
                                                ) : (
                                                    <div
                                                        className="text-[13.3px] text-[#0b0f16] cursor-pointer hover:underline truncate block w-full whitespace-nowrap"
                                                        onClick={() => startInlineEdit(item, "adgroup_name")}
                                                        title={item.adgroup_name}
                                                    >
                                                        {item.adgroup_name}
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                        {isVisible("ctr") && (
                                            <td className="table-cell table-text">
                                                {formatPercentage(item.ctr)}
                                            </td>
                                        )}
                                        {isVisible("operation_status") && (
                                            <td className="table-cell">
                                                {editingCell?.adgroup_id === item.adgroup_id && editingCell?.field === "operation_status" ? (
                                                    <div className="dropdown-container">
                                                        <Dropdown
                                                            options={[
                                                                { value: "ENABLE", label: "Enable" },
                                                                { value: "DISABLE", label: "Disable" },
                                                                { value: "DELETE", label: "Delete" },
                                                            ]}
                                                            value={editedValue}
                                                            onChange={(value: string) => {
                                                                handleInlineEditChange(value);
                                                                confirmInlineEdit(value);
                                                            }}
                                                            defaultOpen={true}
                                                            closeOnSelect={true}
                                                            onClose={cancelInlineEdit}
                                                            buttonClassName="w-full px-2 py-1 text-[13.3px] text-black border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#136D6D]"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="cursor-pointer hover:underline" onClick={() => startInlineEdit(item, "operation_status")}>
                                                        <StatusBadge status={item.operation_status} />
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                        {isVisible("budget") && (
                                            <td className="table-cell">
                                                {editingCell?.adgroup_id === item.adgroup_id && editingCell?.field === "budget" ? (
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editedValue}
                                                        onChange={(e) => handleInlineEditChange(e.target.value)}
                                                        onBlur={(e) => {
                                                            if (isCancelling) return;
                                                            confirmInlineEdit(e.target.value);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") e.currentTarget.blur();
                                                            else if (e.key === "Escape") cancelInlineEdit();
                                                        }}
                                                        autoFocus
                                                        className="table-text leading-[1.26] border border-[#e8e8e3] rounded px-2 py-1 w-full"
                                                    />
                                                ) : (
                                                    <div className="text-[13.3px] text-[#0b0f16] cursor-pointer hover:underline" onClick={() => startInlineEdit(item, "budget")}>
                                                        {formatCurrency(item.budget)}
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                        {isVisible("spend") && (
                                            <td className="table-cell table-text">
                                                {formatCurrency(item.spend)}
                                            </td>
                                        )}
                                        {isVisible("impressions") && (
                                            <td className="table-cell table-text">
                                                {formatNumber(item.impressions)}
                                            </td>
                                        )}
                                        {isVisible("clicks") && (
                                            <td className="table-cell table-text">
                                                {formatNumber(item.clicks)}
                                            </td>
                                        )}
                                        {isVisible("conversions") && (
                                            <td className="table-cell table-text">
                                                {formatNumber(item.conversions)}
                                            </td>
                                        )}
                                        {isVisible("cpc") && (
                                            <td className="table-cell table-text">
                                                {formatCurrency(item.cpc)}
                                            </td>
                                        )}
                                        {isVisible("sales") && (
                                            <td className="table-cell table-text">
                                                {formatCurrency(item.sales)}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Inline Edit Confirmation Modal */}
            {showInlineEditModal && pendingInlineEdit && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]">
                    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-[17.1px] font-semibold text-[#072929] mb-4">
                            Confirm {pendingInlineEdit.field === "adgroup_name" ? "Name" : pendingInlineEdit.field === "budget" ? "Budget" : "Status"} Change
                        </h3>
                        <div className="mb-4">
                            <p className="text-[12.16px] text-[#556179] mb-2">
                                Ad Group: <span className="font-semibold text-[#072929]">{pendingInlineEdit.adgroup.adgroup_name}</span>
                            </p>
                            <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[12.16px] text-[#556179]">
                                        {pendingInlineEdit.field === "adgroup_name" ? "Name" : pendingInlineEdit.field === "budget" ? "Budget" : "Status"}:
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[12.16px] text-[#556179]">
                                            {pendingInlineEdit.field === "budget" ? formatCurrency(pendingInlineEdit.adgroup.budget) : pendingInlineEdit.field === "operation_status" ? pendingInlineEdit.adgroup.operation_status : pendingInlineEdit.adgroup.adgroup_name}
                                        </span>
                                        <span className="text-[12.16px] text-[#556179]">→</span>
                                        <span className="text-[12.16px] font-semibold text-[#072929]">
                                            {pendingInlineEdit.field === "budget" ? formatCurrency(parseFloat(pendingInlineEdit.newValue)) : pendingInlineEdit.newValue}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => { setShowInlineEditModal(false); setPendingInlineEdit(null); }} className="cancel-button">Cancel</button>
                            <button onClick={runInlineEdit} disabled={inlineEditLoading} className="create-entity-button btn-sm">
                                {inlineEditLoading ? "Saving..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
