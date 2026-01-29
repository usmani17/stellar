import React from "react";
import { useChartCollapse } from "../../../../hooks/useChartCollapse";
import { PerformanceChart } from "../../../../components/charts/PerformanceChart";
import { Checkbox } from "../../../../components/ui/Checkbox";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import type { CampaignDetail } from "../../../../services/campaigns";

interface OverviewTabProps {
  chartData: Array<{
    date: string;
    sales?: number;
    spend?: number;
    impressions?: number;
    clicks?: number;
    orders?: number;
    acos?: number;
    roas?: number;
  }>;
  chartToggles: {
    sales: boolean;
    spend: boolean;
    impressions: boolean;
    clicks: boolean;
    orders: boolean;
    acos: boolean;
    roas: boolean;
  };
  onToggleChartMetric: (
    metric:
      | "sales"
      | "spend"
      | "impressions"
      | "clicks"
      | "orders"
      | "acos"
      | "roas"
  ) => void;
  campaignDetail: CampaignDetail | null;
  loading: boolean;
  campaignType: string | null;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  chartData,
  chartToggles,
  onToggleChartMetric,
  campaignDetail,
  loading,
  campaignType,
}) => {
  // Chart collapse state with localStorage persistence
  const [isChartCollapsed, toggleChartCollapse] = useChartCollapse(
    "campaigns-overview-chart-collapsed"
  );

  const currency =
    campaignDetail?.campaign?.profile_currency_code?.trim() || "USD";
  const formatCurrency = (value: number, currencyCode?: string) => {
    const code = (currencyCode?.trim() || currency).toUpperCase();
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      currencyDisplay: "code",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  };

  return (
    <>
      {/* Chart Section */}
      <PerformanceChart
        data={chartData}
        toggles={chartToggles}
        onToggle={onToggleChartMetric}
        title="Performance Trends"
        isCollapsed={isChartCollapsed}
        onCollapseToggle={toggleChartCollapse}
      />

      {/* Top Keywords & Top Products */}
      <div className="flex gap-6 mb-4">
        {/* Top Keywords Table - Hidden for SD campaigns */}
        {campaignType !== "SD" && (
          <div className="flex-1">
            <div className="mb-2">
              <h3 className="text-[#072929] text-[18px] font-semibold leading-[100%]">
                Top Keywords
              </h3>
            </div>
            <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
              <div className="overflow-x-auto w-full">
                {loading ? (
                  <div className="text-center py-8 text-[#556179] text-[13.3px]">
                    Loading keywords...
                  </div>
                ) : campaignDetail &&
                  campaignDetail.top_keywords.length > 0 ? (
                  <table className="min-w-full w-full">
                    <thead>
                      <tr className="border-b border-[#e8e8e3]">
                        <th className="table-header w-[35px]">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={false}
                              onChange={() => {}}
                              size="small"
                            />
                          </div>
                        </th>
                        <th className="table-header">
                          Keyword Name
                        </th>
                        <th className="table-header">
                          CTR
                        </th>
                        <th className="table-header">
                          Status
                        </th>
                        <th className="table-header">
                          Spends
                        </th>
                        <th className="table-header">
                          Sales
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignDetail.top_keywords.map((keyword, index) => {
                        const isLastRow =
                          index === campaignDetail.top_keywords.length - 1;
                        return (
                          <tr
                            key={index}
                            className={`${
                              !isLastRow
                                ? "border-b border-[#e8e8e3]"
                                : ""
                            } hover:bg-gray-50 transition-colors`}
                          >
                            <td className="table-cell">
                              <div className="flex items-center justify-center">
                                <Checkbox
                                  checked={false}
                                  onChange={() => {}}
                                  size="small"
                                />
                              </div>
                            </td>
                            <td className="table-cell">
                              <span className="table-text leading-[1.26]">
                                {keyword.name}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="table-text leading-[1.26]">
                                {keyword.ctr}
                              </span>
                            </td>
                            <td className="table-cell">
                              <StatusBadge status={keyword.status} />
                            </td>
                            <td className="table-cell">
                              <span className="table-text leading-[1.26]">
                                {formatCurrency(
                                  typeof keyword.spends === "number"
                                    ? keyword.spends
                                    : parseFloat(String(keyword.spends ?? "").replace(/[^0-9.-]/g, "")) || 0,
                                  currency
                                )}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="table-text leading-[1.26]">
                                {formatCurrency(
                                  typeof keyword.sales === "number"
                                    ? keyword.sales
                                    : parseFloat(String(keyword.sales ?? "").replace(/[^0-9.-]/g, "")) || 0,
                                  currency
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-[13.3px] text-[#556179] mb-4">
                      No keywords data available
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Top Products Table */}
        <div className={campaignType === "SD" ? "w-full" : "flex-1"}>
          <div className="mb-2">
            <h3 className="text-[#072929] text-[18px] font-semibold leading-[100%]">
              Top Products
            </h3>
          </div>
          <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              {loading ? (
                <div className="text-center py-8 text-[#556179] text-[13.3px]">
                  Loading products...
                </div>
              ) : campaignDetail &&
                campaignDetail.top_products.length > 0 ? (
                <table className="min-w-full w-full">
                  <thead>
                    <tr className="border-b border-[#e8e8e3]">
                      <th className="table-header w-[35px]">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={false}
                            onChange={() => {}}
                            size="small"
                          />
                        </div>
                      </th>
                      <th className="table-header">
                        Product Name
                      </th>
                      <th className="table-header">
                        ASIN
                      </th>
                      <th className="table-header">
                        Sales
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignDetail.top_products.map((product, index) => {
                      const isLastRow =
                        index === campaignDetail.top_products.length - 1;
                      return (
                        <tr
                          key={index}
                          className={`${
                            !isLastRow ? "border-b border-[#e8e8e3]" : ""
                          } hover:bg-gray-50 transition-colors`}
                        >
                          <td className="table-cell">
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={false}
                                onChange={() => {}}
                                size="small"
                              />
                            </div>
                          </td>
                          <td className="table-cell">
                            <span className="table-text leading-[1.26]">
                              {product.name}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className="table-text leading-[1.26]">
                              {product.asin}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className="table-text leading-[1.26]">
                              {formatCurrency(
                                typeof product.sales === "number"
                                  ? product.sales
                                  : parseFloat(String(product.sales ?? "").replace(/[^0-9.-]/g, "")) || 0,
                                currency
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[13.3px] text-[#556179] mb-4">
                    No products data available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};


