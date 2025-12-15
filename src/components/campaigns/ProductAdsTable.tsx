import React from "react";
import { Checkbox } from "../ui/Checkbox";
import { StatusBadge } from "../ui/StatusBadge";
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
}) => {
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
                  <th className="py-[10px] px-[10px] text-left">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th
                  className="py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] text-left cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("adId")}
                >
                  <div className="flex items-center">
                    Ad ID
                    {getSortIcon("adId")}
                  </div>
                </th>
                <th
                  className="py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] text-left cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("asin")}
                >
                  <div className="flex items-center">
                    ASIN
                    {getSortIcon("asin")}
                  </div>
                </th>
                <th
                  className="py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] text-left cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("sku")}
                >
                  <div className="flex items-center">
                    SKU
                    {getSortIcon("sku")}
                  </div>
                </th>
                <th
                  className="py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] text-left cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSort?.("status")}
                >
                  <div className="flex items-center">
                    State
                    {getSortIcon("status")}
                  </div>
                </th>
                <th
                  className="py-[10px] px-[10px] text-[13.3px] font-medium text-[#29303f] leading-[16.2px] text-left cursor-pointer hover:bg-gray-50 transition-colors"
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
                  className="border-b border-[#e8e8e3] hover:bg-gray-50 transition-colors"
                >
                  {onSelect && (
                    <td className="py-[10px] px-[10px]">
                      <Checkbox
                        checked={selectedIds.has(productad.id)}
                        onChange={(checked) =>
                          handleSelect(productad.id, checked)
                        }
                      />
                    </td>
                  )}
                  <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                    {productad.adId || "—"}
                  </td>
                  <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                    {productad.asin || "—"}
                  </td>
                  <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                    {productad.sku || "—"}
                  </td>
                  <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
                    <StatusBadge status={productad.status} />
                  </td>
                  <td className="py-[10px] px-[10px] text-[13.3px] text-[#0b0f16] leading-[1.26]">
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
