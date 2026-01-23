import React, { useState, useRef } from "react";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { Dropdown } from "../../../../components/ui/Dropdown";
import { campaignsService } from "../../../../services/campaigns";
import type { TikTokAd } from "./types";

interface TikTokAdTableProps {
    ads: TikTokAd[];
    loading: boolean;
    selectedAdIds: Set<string>;
    onSelectAll: (checked: boolean) => void;
    onSelectAd: (id: string, checked: boolean) => void;
    sortBy: string;
    sortOrder: "asc" | "desc";
    onSort: (column: string) => void;
    onRefresh: () => void;
    accountId: number;
    showColumns?: ("ad_name" | "operation_status" | "spend" | "impressions" | "clicks" | "conversions" | "ctr" | "cpc" | "sales")[];
}

export const TikTokAdTable: React.FC<TikTokAdTableProps> = ({
    ads,
    loading,
    selectedAdIds,
    onSelectAll,
    onSelectAd,
    sortBy,
    sortOrder,
    onSort,
    onRefresh,
    accountId,
    showColumns = ["ad_name", "operation_status", "spend", "impressions", "clicks", "conversions", "ctr", "cpc", "sales"],
}) => {
    // Inline edit state
    const [editingCell, setEditingCell] = useState<{
        ad_id: string;
        field: "ad_name" | "operation_status";
    } | null>(null);
    const [editedValue, setEditedValue] = useState<string>("");
    const [isCancelling, setIsCancelling] = useState(false);
    const isStartingEditRef = useRef(false);

    // Inline edit confirmation modal state
    const [showInlineEditModal, setShowInlineEditModal] = useState(false);
    const [pendingInlineEdit, setPendingInlineEdit] = useState<{
        ad: TikTokAd;
        field: "ad_name" | "operation_status";
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

    const startInlineEdit = (ad: TikTokAd, field: "ad_name" | "operation_status") => {
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

    const confirmInlineEdit = (valueToSave: string) => {
        if (!editingCell || !accountId) return;

        const ad = ads.find(a => a.ad_id === editingCell.ad_id);
        if (!ad) return;

        // Check if value actually changed
        const currentValue = editingCell.field === "ad_name" ? ad.ad_name : ad.operation_status;
        if (valueToSave === currentValue) {
            cancelInlineEdit();
            return;
        }

        setPendingInlineEdit({
            ad,
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
            if (pendingInlineEdit.field === "ad_name") {
                payload.ad_name = pendingInlineEdit.newValue;
            } else if (pendingInlineEdit.field === "operation_status") {
                payload.operation_status = pendingInlineEdit.newValue;
            }

            await campaignsService.updateTikTokAd(accountId, pendingInlineEdit.ad.ad_id, payload);

            onRefresh();
        } catch (error: any) {
            console.error("Inline update failed:", error);
            const errorMessage = error.response?.data?.message || error.message || "Failed to update ad";
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

    const isVisible = (column: NonNullable<TikTokAdTableProps["showColumns"]>[number]) => showColumns.includes(column);

    return (
        <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
                {loading ? (
                    <div className="text-center py-8 text-[#556179] text-[13.3px]">Loading ads...</div>
                ) : ads.length === 0 ? (
                    <div className="text-center py-8 text-[#556179] text-[13.3px]">No ads found</div>
                ) : (
                    <table className="w-full min-w-full">
                        <thead className="bg-[#f5f5f0]">
                            <tr className="border-b border-[#e8e8e3]">
                                <th className="table-header w-[40px]">
                                    <div className="flex items-center justify-center">
                                        <Checkbox
                                            checked={ads.length > 0 && ads.every(ad => selectedAdIds.has(ad.ad_id))}
                                            onChange={onSelectAll}
                                        />
                                    </div>
                                </th>
                                {isVisible("ad_name") && (
                                    <th className="table-header cursor-pointer hover:bg-gray-100" onClick={() => onSort("ad_name")}>
                                        <div className="flex items-center gap-1">Ad Name {getSortIcon("ad_name")}</div>
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
                            {ads.map((item, index) => {
                                const isLastRow = index === ads.length - 1;
                                const isSelected = selectedAdIds.has(item.ad_id);
                                return (
                                    <tr
                                        key={item.ad_id}
                                        className={`hover:bg-gray-50 transition-colors ${!isLastRow ? "border-b border-[#e8e8e3]" : ""} ${isSelected ? "bg-gray-50" : ""}`}
                                    >
                                        <td className="table-cell">
                                            <div className="flex items-center justify-center">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onChange={(checked) => onSelectAd(item.ad_id, checked)}
                                                />
                                            </div>
                                        </td>
                                        {isVisible("ad_name") && (
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
                                                        onClick={() => startInlineEdit(item, "ad_name")}
                                                        title={item.ad_name}
                                                    >
                                                        {item.ad_name}
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
                                                {editingCell?.ad_id === item.ad_id && editingCell?.field === "operation_status" ? (
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
                            Confirm {pendingInlineEdit.field === "ad_name" ? "Name" : "Status"} Change
                        </h3>
                        <div className="mb-4">
                            <p className="text-[12.16px] text-[#556179] mb-2">
                                Ad: <span className="font-semibold text-[#072929]">{pendingInlineEdit.ad.ad_name}</span>
                            </p>
                            <div className="bg-sandstorm-s10 border border-sandstorm-s40 rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[12.16px] text-[#556179]">
                                        {pendingInlineEdit.field === "ad_name" ? "Name" : "Status"}:
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[12.16px] text-[#556179]">
                                            {pendingInlineEdit.field === "operation_status" ? pendingInlineEdit.ad.operation_status : pendingInlineEdit.ad.ad_name}
                                        </span>
                                        <span className="text-[12.16px] text-[#556179]">→</span>
                                        <span className="text-[12.16px] font-semibold text-[#072929]">
                                            {pendingInlineEdit.newValue}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => { setShowInlineEditModal(false); setPendingInlineEdit(null); }} className="px-4 py-2 bg-[#FEFEFB] border border-gray-200 text-button-text text-text-primary rounded-lg items-center hover:bg-gray-100 transition-colors">Cancel</button>
                            <button onClick={runInlineEdit} disabled={inlineEditLoading} className="px-4 py-2 bg-[#136D6D] text-white text-[10.64px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {inlineEditLoading ? "Saving..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
