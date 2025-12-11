import React from "react";
import { Checkbox } from "../ui/Checkbox";
import { StatusBadge } from "../ui/StatusBadge";
import type { AdGroup } from "../../services/campaigns";

interface AdGroupsTableProps {
  adgroups: AdGroup[];
  loading?: boolean;
  onSelectAll?: (checked: boolean) => void;
  onSelect?: (id: number, checked: boolean) => void;
  selectedIds?: Set<number>;
}

export const AdGroupsTable: React.FC<AdGroupsTableProps> = ({
  adgroups,
  loading = false,
  onSelectAll,
  onSelect,
  selectedIds = new Set(),
}) => {
  const allSelected =
    adgroups.length > 0 && adgroups.every((ag) => selectedIds.has(ag.id));
  const someSelected = adgroups.some((ag) => selectedIds.has(ag.id));

  const handleSelectAll = (checked: boolean) => {
    onSelectAll?.(checked);
  };

  const handleSelect = (id: number, checked: boolean) => {
    onSelect?.(id, checked);
  };

  return (
    <div className="rounded-2xl" style={{ backgroundColor: "#F5F5F0" }}>
      {/* Table Header */}
      <div
        className="border border-[#E6E6E6] border-b-0 rounded-t-2xl px-[34px] pt-8 pb-0 shadow-[0px_8px_20px_0px_rgba(0,0,0,0.06)]"
        style={{ backgroundColor: "#F5F5F0" }}
      ></div>

      {/* Table */}
      <div
        className="border border-[#E6E6E6] border-t-0 rounded-b-2xl shadow-[0px_14px_20px_0px_rgba(0,0,0,0.06)] overflow-hidden p-6"
        style={{ backgroundColor: "#F5F5F0" }}
      >
        <div className="bg-white rounded-xl overflow-hidden">
          {/* Table Header Row */}
          <div className="border-b border-[#E6E6E6] flex items-center h-[48px] bg-white rounded-t-xl">
            {/* Checkbox Header */}
            <div className="w-[35px] flex items-center justify-center">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onChange={handleSelectAll}
                size="small"
              />
            </div>

            {/* Ad Group Name Header */}
            <div className="w-[280px] px-4">
              <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                Ad Group Name
              </p>
            </div>

            {/* CTR Header */}
            <div className="w-[100px] text-center">
              <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                CTR
              </p>
            </div>

            {/* Status Header */}
            <div className="w-[100px] text-center">
              <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                Status
              </p>
            </div>

            {/* Spends Header */}
            <div className="w-[100px] text-center">
              <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                Spends
              </p>
            </div>

            {/* Sales Header */}
            <div className="text-center flex-1 min-w-[51px]">
              <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                Sales
              </p>
            </div>

            {/* Actions Header */}
            <div className="w-[54px] text-center mr-4">
              <p className="text-[9.6px] font-semibold text-[#556179] uppercase">
                Actions
              </p>
            </div>
          </div>
          <div className="divide-y divide-[#E6E6E6]">
            {loading ? (
              <div
                className="p-8 text-center text-[#556179]"
                style={{ backgroundColor: "#F5F5F0" }}
              >
                Loading ad groups...
              </div>
            ) : adgroups.length === 0 ? (
              <div
                className="p-8 text-center text-[#556179]"
                style={{ backgroundColor: "#F5F5F0" }}
              >
                No ad groups found
              </div>
            ) : (
              adgroups.map((adgroup) => (
                <div
                  key={adgroup.id}
                  className="flex items-center h-[48px] bg-white hover:bg-gray-50"
                >
                  {/* Checkbox */}
                  <div className="w-[35px] flex items-center justify-center">
                    <Checkbox
                      checked={selectedIds.has(adgroup.id)}
                      onChange={(checked) => handleSelect(adgroup.id, checked)}
                      size="small"
                    />
                  </div>

                  {/* Ad Group Name */}
                  <div className="w-[280px] px-4">
                    <p className="text-[12.8px] font-normal text-black truncate">
                      {adgroup.name}
                    </p>
                  </div>

                  {/* CTR */}
                  <div className="w-[100px] text-center">
                    <p className="text-[12.8px] font-normal text-black">
                      {adgroup.ctr}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="w-[100px] text-center">
                    <StatusBadge status={adgroup.status} />
                  </div>

                  {/* Spends */}
                  <div className="w-[100px] text-center">
                    <p className="text-[12.8px] font-normal text-black">
                      {adgroup.spends}
                    </p>
                  </div>

                  {/* Sales */}
                  <div className="text-center flex-1 min-w-[51px]">
                    <p className="text-[12.8px] font-normal text-black">
                      {adgroup.sales}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="w-[54px] text-center mr-4">
                    <button className="text-[#A3A8B3] hover:text-black">
                      <svg
                        className="w-5 h-5 mx-auto"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
