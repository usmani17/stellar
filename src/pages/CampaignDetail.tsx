import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { Button } from '../components/ui';

export const CampaignDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [isStatusEnabled, setIsStatusEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('Campaign Type');
  const [chartToggles, setChartToggles] = useState({
    sales: true,
    spend: true,
    clicks: false,
    orders: false,
  });

  const tabs = ['Campaign Type', 'Ad Group', 'Keywords', 'Product Targets', 'Product Ads', 'Logs'];

  const kpiCards = [
    { label: 'Budget', value: '$ 12,758', bgColor: 'bg-white' },
    { label: 'Spends Today', value: '$ 34,452', bgColor: 'bg-[#E6F1FD]' },
    { label: 'Sales Today', value: '$ 48,452', bgColor: 'bg-[rgba(78,92,255,0.1)]' },
    { label: 'ACOS', value: '25.7%', bgColor: 'bg-[#E6F1FD]' },
    { label: 'ROAS', value: '3.52 x', bgColor: 'bg-white' },
    { label: 'Avg CPC', value: '$ 758', bgColor: 'bg-white', change: '+11.01%', isPositive: true },
    { label: 'Impressions', value: '34,452', bgColor: 'bg-[#E6F1FD]', change: '-0.03%', isPositive: false },
    { label: 'CTR', value: '25.7%', bgColor: 'bg-white', change: '-12%', isPositive: false },
  ];

  const topKeywords = [
    { name: 'Running Shoes', ctr: '1.8%', status: 'Enable', spends: '$45', sales: '$9840' },
    { name: 'Trail Shoes', ctr: '1.8%', status: 'Paused', spends: '$45', sales: '$9840' },
    { name: "Men's Trainers", ctr: '1.8%', status: 'Enable', spends: '$45', sales: '$9840' },
  ];

  const topProducts = [
    { name: 'Air Runner Pro', asin: 'B09Q5...', sales: '$120' },
    { name: 'Trail Blaze 2', asin: 'B09Q5...', sales: '$920' },
    { name: 'City Sprint', asin: 'B09Q5...', sales: '$720' },
  ];

  const aiDiagnosis = [
    'Detect inconsistent performance patterns across campaign. Aligning bidding strategies may improve stability.',
    'Several keywords exhibit increased cost with low return . Consider optimization or applying strategic negatives.',
    'Impression share decline suggests pacing limits. Reevaluate daily budget allocation for optimal exposure.',
  ];

  const toggleChartMetric = (metric: keyof typeof chartToggles) => {
    setChartToggles(prev => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-[272px]">
        {/* Header */}
        <DashboardHeader />

        {/* Main Content Area */}
        <div className="p-8 bg-white">
          {/* Campaign Header */}
          <div className="bg-white border border-[#E8E8E3] border-b-0 rounded-t-2xl shadow-[0px_8px_20px_0px_rgba(0,0,0,0.06)] mb-0 px-[34px] py-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2.5">
                <h1 className="text-[24px] font-semibold text-black">
                  Campaign - Holiday Push 2015
                </h1>
                <p className="text-[16px] font-normal text-[#808080]">
                  Smart campaign running on storefront + sponsored ads
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsStatusEnabled(!isStatusEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isStatusEnabled ? 'bg-[#136d6d]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isStatusEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-[16px] font-normal text-[#808080]">Status</span>
                </div>
                <Button
                  className="bg-[#136d6d] text-white px-4 py-3 h-[42px] rounded-lg flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-[14px] font-semibold">Sync Now</span>
                </Button>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex gap-7">
              {kpiCards.slice(0, 4).map((card, index) => (
                <div
                  key={index}
                  className={`flex-1 ${card.bgColor} rounded-[20px] p-6 min-w-[200px]`}
                >
                  <p className="text-[14px] font-normal text-black mb-2">{card.label}</p>
                  <p className="text-[24px] font-semibold text-black">{card.value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-7">
              <div className={`${kpiCards[4].bgColor} rounded-[20px] p-6 w-[257px]`}>
                <p className="text-[14px] font-normal text-black mb-2">{kpiCards[4].label}</p>
                <p className="text-[24px] font-semibold text-black">{kpiCards[4].value}</p>
              </div>
            </div>
            <div className="flex gap-7">
              {kpiCards.slice(5).map((card, index) => (
                <div
                  key={index + 5}
                  className={`flex-1 ${card.bgColor} rounded-[20px] p-6 min-w-[200px]`}
                >
                  <p className="text-[14px] font-normal text-black mb-2">{card.label}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-[24px] font-semibold text-black">{card.value}</p>
                    {card.change && (
                      <div className="flex items-center gap-2">
                        <span className={`text-[12px] font-normal ${card.isPositive ? 'text-black' : 'text-black'}`}>
                          {card.change}
                        </span>
                        <svg
                          className={`w-4 h-4 ${card.isPositive ? 'text-black' : 'text-black'}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          {card.isPositive ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          )}
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tab Navigation & Chart Section */}
          <div className="bg-[#F5F7FA] border border-[#E8E8E3] rounded-2xl shadow-[0px_8px_20px_0px_rgba(0,0,0,0.06)] p-3 mt-4">
            {/* Tabs */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-3 rounded-lg text-[12px] font-semibold transition-colors ${
                      activeTab === tab
                        ? 'bg-white border border-[#EBEAED] text-[#072929] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.06)]'
                        : 'bg-transparent text-[#072929]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <Button className="bg-[#136d6d] text-white px-4 py-3 h-[42px] rounded-lg text-[14px] font-semibold">
                Sync
              </Button>
            </div>

            {/* Chart Section */}
            <div className="bg-white border border-[#E6E6E6] rounded-[20px] p-6 mb-4">
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 items-center">
                    <div className="text-[14px] text-black">|</div>
                    <div className="flex gap-4">
                      {[
                        { key: 'sales', label: 'Sales', color: '#1ec77a' },
                        { key: 'spend', label: 'Spend', color: '#7a4dff' },
                        { key: 'clicks', label: 'Clicks', color: '#169aa3' },
                        { key: 'orders', label: 'Orders', color: '#ea33de' },
                      ].map((metric) => (
                        <div
                          key={metric.key}
                          className="border border-gray-300 rounded-lg px-3 py-2.5 flex items-center gap-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: metric.color }} />
                            <span className="text-[13px] font-normal text-black">{metric.label}</span>
                          </div>
                          <button
                            onClick={() => toggleChartMetric(metric.key as keyof typeof chartToggles)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              chartToggles[metric.key as keyof typeof chartToggles]
                                ? 'bg-[#7a4dff]'
                                : 'bg-[#a3a8b3]'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                chartToggles[metric.key as keyof typeof chartToggles]
                                  ? 'translate-x-5'
                                  : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-[14px] font-medium text-[#0066ff]">Total Revenue</p>
              </div>

              {/* Chart Placeholder */}
              <div className="h-[223px] bg-gray-50 rounded-lg flex items-center justify-center">
                <p className="text-[14px] text-gray-400">Chart visualization will be implemented here</p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center justify-center gap-7 mt-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#169aa3]" />
                  <span className="text-[12px] font-semibold text-[#169aa3]">Clicks</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#1ec77a]" />
                  <span className="text-[12px] font-semibold text-[#1ec77a]">Sales</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#7a4dff]" />
                  <span className="text-[12px] font-semibold text-[#7a4dff]">Spends</span>
                </div>
              </div>
            </div>

            {/* Top Keywords & Top Products */}
            <div className="flex gap-7 mb-4">
              {/* Top Keywords Table */}
              <div className="bg-white rounded-2xl flex-1">
                <div className="bg-white border border-[#E8E8E3] border-b-0 rounded-t-2xl px-[34px] py-4">
                  <h2 className="text-[18px] font-semibold text-black">Top Keywords</h2>
                </div>
                <div className="border border-[#E6E6E6] rounded-b-2xl shadow-[0px_14px_20px_0px_rgba(0,0,0,0.06)]">
                  <div className="bg-[#F5F7FA] h-[37px]" />
                  <div className="divide-y divide-[#E6E6E6]">
                    {topKeywords.map((keyword, index) => (
                      <div key={index} className="flex items-center h-[50px] px-4">
                        <div className="w-[27px] flex items-center justify-center mr-4">
                          <input
                            type="checkbox"
                            className="w-6 h-6 border-[#A3A8B3] rounded"
                          />
                        </div>
                        <div className="flex-1 min-w-[135px]">
                          <p className="text-[16px] font-normal text-black">{keyword.name}</p>
                        </div>
                        <div className="w-[58px] text-center">
                          <p className="text-[16px] font-normal text-black">{keyword.ctr}</p>
                        </div>
                        <div className="w-[49.53px] text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-[12px] font-semibold ${
                              keyword.status === 'Enable'
                                ? 'bg-[rgba(30,199,122,0.1)] text-[#1ec77a]'
                                : 'bg-[rgba(255,182,92,0.1)] text-[#ffb65c]'
                            }`}
                          >
                            {keyword.status}
                          </span>
                        </div>
                        <div className="w-[67.1px] text-center">
                          <p className="text-[16px] font-normal text-black">{keyword.spends}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[16px] font-normal text-black">{keyword.sales}</p>
                        </div>
                        <div className="w-[54px] text-center">
                          <button className="text-[#A3A8B3] hover:text-black">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-white border border-[#E8E8E3] rounded-2xl flex-1 p-5">
                <h2 className="text-[18px] font-semibold text-black mb-4">Top Products</h2>
                <div className="flex flex-col gap-3">
                  {topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between h-10">
                      <div>
                        <p className="text-[14px] font-semibold text-black">{product.name}</p>
                        <p className="text-[12px] font-medium text-[#808080]">
                          ASIN: {product.asin} • Sales: {product.sales}
                        </p>
                      </div>
                      <button className="text-[12px] font-medium text-[#808080] hover:text-black">
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Diagnosis Section */}
            <div className="bg-white border border-[#E8E8E3] rounded-2xl p-7">
              <div className="flex items-end gap-4 mb-4">
                <div className="bg-[#F5F7FA] rounded-xl p-2.5 w-[50px] h-[50px] flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#072929]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-[18px] font-semibold text-black mb-1">AI Diagnosis</h3>
                  <p className="text-[14px] font-medium text-[#808080]">
                    Automated insights created by our analysis engine
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2.5">
                  <div className="w-3 h-1.5" />
                  <div className="bg-[#F5F7FA] px-2.5 py-1.5 rounded-lg shadow-[0px_4px_4px_0px_rgba(0,0,0,0.05)]">
                    <p className="text-[14px] font-medium text-black">Confidence: High</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 mb-4">
                {aiDiagnosis.map((diagnosis, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#808080] mt-2" />
                    <p className="text-[14px] font-medium text-[#808080]">{diagnosis}</p>
                  </div>
                ))}
              </div>

              <div className="bg-[#F5F7FA] border border-[#E8E8E3] rounded-xl p-4 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.04)] relative">
                <div className="flex gap-2">
                  <div className="pt-1.5">
                    <svg className="w-2 h-3.5 text-[#ffb65c]" fill="currentColor" viewBox="0 0 8 14">
                      <path d="M0 0h8v14H0z" />
                    </svg>
                  </div>
                  <div className="text-[16px] font-medium text-[#808080]">
                    <p className="mb-0">AI Tip: Enhance campaign performance by refining keywords targeting and redistributing budget toward consistently</p>
                    <p>performing segments.</p>
                  </div>
                </div>
                <div className="absolute inset-0 pointer-events-none shadow-[0px_1px_4px_0px_inset_rgba(0,0,0,0.25)] rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

