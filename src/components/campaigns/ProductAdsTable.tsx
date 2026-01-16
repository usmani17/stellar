import React, { useRef } from "react";
import { Checkbox } from "../ui/Checkbox";
import { StatusBadge } from "../ui/StatusBadge";
import { Dropdown } from "../ui/Dropdown";
import type { ProductAd } from "../../services/campaigns";

interface ProductAdsTableProps {
  productads: ProductAd[];
  loading?: boolean;
  onSelectAll?: (checked: boolean) => void;
  onSelect?: (id: number, checked: boolean) => void;
  selectedIds?: Set<number>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
  editingField?: {
    id: number;
    field: "status";
  } | null;
  editedValue?: string;
  onEditStart?: (
    id: number,
    field: "status",
    currentValue: string
  ) => void;
  onEditChange?: (value: string) => void;
  onEditEnd?: (value?: string) => void;
  onEditCancel?: () => void;
  editLoading?: Set<number>;
  pendingChange?: {
    id: number;
    field: "status";
    newValue: string;
    oldValue: string;
  } | null;
}

export const ProductAdsTable: React.FC<ProductAdsTableProps> = ({
  productads,
  loading = false,
  onSelectAll,
  onSelect,
  selectedIds = new Set(),
  sortBy = "id",
  sortOrder = "asc",
  onSort,
  editingField,
  editedValue,
  onEditStart,
  onEditChange,
  onEditEnd,
  onEditCancel,
  editLoading,
  pendingChange,
}) => {
  const statusSelectionMadeRef = useRef<number | null>(null);

  const getSortIcon = (column: string) => {
    if (sortBy !== column || !onSort) {
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
  const allSelected =
    productads.length > 0 && productads.every((pa) => selectedIds.has(pa.id));
  const someSelected = productads.some((pa) => selectedIds.has(pa.id));

  const handleSelectAll = (checked: boolean) => {
    onSelectAll?.(checked);
  };

  const handleSelect = (id: number, checked: boolean) => {
    onSelect?.(id, checked);
  };

  return (
    <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
      <div className="overflow-x-auto w-full">
        {loading ? (
          <div className="text-center py-8 text-[#556179] text-[13.3px]">
            Loading product ads...
          </div>
        ) : productads.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[13.3px] text-[#556179] mb-4">
              No product ads found
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f5f5f0] border-b border-[#e8e8e3]">
                {onSelectAll && (
                  <th className="table-cell text-left">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th
                  className="table-header cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("adId")}
                >
                  <div className="flex items-center">
                    Ad ID
                    {getSortIcon("adId")}
                  </div>
                </th>
                <th
                  className="table-header cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("asin")}
                >
                  <div className="flex items-center">
                    ASIN
                    {getSortIcon("asin")}
                  </div>
                </th>
                <th
                  className="table-header cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("sku")}
                >
                  <div className="flex items-center">
                    SKU
                    {getSortIcon("sku")}
                  </div>
                </th>
                <th
                  className="table-header cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("status")}
                >
                  <div className="flex items-center">
                    State
                    {getSortIcon("status")}
                  </div>
                </th>
                <th
                  className="table-header cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("adGroupId")}
                >
                  <div className="flex items-center">
                    Ad Group ID
                    {getSortIcon("adGroupId")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {productads.map((productad) => (
                <tr
                  key={productad.id}
                  className="table-row group"
                >
                  {onSelect && (
                    <td className="table-cell">
                      <Checkbox
                        checked={selectedIds.has(productad.id)}
                        onChange={(checked) =>
                          handleSelect(productad.id, checked)
                        }
                      />
                    </td>
                  )}
                  <td className="table-cell table-text leading-[1.26]">
                    {productad.adId || "—"}
                  </td>
                  <td className="table-cell table-text leading-[1.26]">
                    {productad.asin || "—"}
                  </td>
                  <td className="table-cell table-text leading-[1.26]">
                    {productad.sku || "—"}
                  </td>
                  <td className="table-cell min-w-[115px]">
                    {editLoading?.has(productad.id) ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#136D6D]"></div>
                        <span className="table-text leading-[1.26]">
                          Updating...
                        </span>
                      </div>
                    ) : pendingChange?.id === productad.id &&
                      pendingChange?.field === "status" ? (
                      <div className="flex items-center gap-2">
                        <span className="table-text leading-[1.26]">
                          {pendingChange.newValue === "enabled" ||
                          pendingChange.newValue === "ENABLED"
                            ? "Enabled"
                            : "Paused"}
                        </span>
                      </div>
                    ) : editingField?.id === productad.id &&
                      editingField?.field === "status" ? (
                      <div className="flex items-center gap-2">
                        <Dropdown
                          options={[
                            { value: "enabled", label: "Enabled" },
                            { value: "paused", label: "Paused" },
                          ]}
                          value={(() => {
                            if (editedValue) return editedValue;
                            const statusLower =
                              productad.status?.toLowerCase() || "enabled";
                            return statusLower === "enable" ||
                              statusLower === "enabled"
                              ? "enabled"
                              : "paused";
                          })()}
                          onChange={(val) => {
                            // Mark that a selection was made for this product ad
                            statusSelectionMadeRef.current = productad.id;
                            const newValue = val as string;
                            onEditChange?.(newValue);
                            // Call onEditEnd with the new value immediately when a value is selected
                            onEditEnd?.(newValue);
                            // Clear the ref after a short delay to allow onClose to check it
                            setTimeout(() => {
                              if (
                                statusSelectionMadeRef.current === productad.id
                              ) {
                                statusSelectionMadeRef.current = null;
                              }
                            }, 200);
                          }}
                          onClose={() => {
                            // Only cancel if no selection was made (clicked outside)
                            if (
                              statusSelectionMadeRef.current !== productad.id
                            ) {
                              onEditCancel?.();
                            }
                            statusSelectionMadeRef.current = null;
                          }}
                          defaultOpen={true}
                          buttonClassName="w-full bg-[#FEFEFB] border border-gray-200"
                          width="w-full"
                        />
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          const statusLower =
                            productad.status?.toLowerCase() || "enabled";
                          const currentStatus =
                            statusLower === "enable" || statusLower === "enabled"
                              ? "enabled"
                              : "paused";
                          onEditStart?.(productad.id, "status", currentStatus);
                        }}
                        className="cursor-pointer"
                      >
                        <StatusBadge status={productad.status} />
                      </div>
                    )}
                  </td>
                  <td className="table-cell table-text leading-[1.26]">
                    {productad.adGroupId || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
