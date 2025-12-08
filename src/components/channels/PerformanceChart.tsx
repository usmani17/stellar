import React from 'react';

interface PerformanceChartProps {
  data?: {
    date: string;
    sales: number;
    spend: number;
  }[];
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
  // Mock data for demonstration
  const chartData = data || [
    { date: '10 Jan', sales: 250000, spend: 120000 },
    { date: '11 Jan', sales: 280000, spend: 130000 },
    { date: '12 Jan', sales: 300000, spend: 140000 },
    { date: '13 Jan', sales: 320000, spend: 150000 },
    { date: '14 Jan', sales: 350000, spend: 160000 },
    { date: '15 Jan', sales: 380000, spend: 170000 },
    { date: '16 Jan', sales: 400000, spend: 180000 },
    { date: '17 Jan', sales: 420000, spend: 145000 },
    { date: '18 Jan', sales: 440000, spend: 190000 },
    { date: '19 Jan', sales: 450000, spend: 200000 },
    { date: '20 Jan', sales: 430000, spend: 195000 },
    { date: '21 Jan', sales: 410000, spend: 185000 },
    { date: '22 Jan', sales: 390000, spend: 175000 },
    { date: '23 Jan', sales: 370000, spend: 165000 },
    { date: '24 Jan', sales: 360000, spend: 155000 },
  ];

  const maxValue = Math.max(...chartData.map(d => Math.max(d.sales, d.spend)));
  const minValue = Math.min(...chartData.map(d => Math.min(d.sales, d.spend)));

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toString();
  };

  const getYPosition = (value: number) => {
    const range = maxValue - minValue;
    const percentage = ((value - minValue) / range) * 100;
    return 100 - percentage;
  };

  return (
    <div className="bg-[#FEFEFB] border border-[#E8E8E3] rounded-xl p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[16px] font-medium text-[#0e121b]">Performance Trends</h3>
          <div className="flex items-center gap-2">
            <div className="bg-[#FEFEFB] border border-[#E3E3E3] rounded-lg px-1.5 py-2 flex items-center gap-1 h-8">
              <div className="w-4 h-4 rounded-full bg-[#136d6d]"></div>
              <span className="text-[14px] text-[#072929]">Sales</span>
              <div className="w-6 h-6 relative">
                <div className="w-6 h-6 rounded-full bg-[#136d6d]"></div>
              </div>
            </div>
            <div className="bg-[#FEFEFB] border border-[#E3E3E3] rounded-lg px-1.5 py-2 flex items-center gap-1 h-8">
              <div className="w-4 h-4 rounded-full bg-[#136d6d]"></div>
              <span className="text-[14px] text-[#072929]">Spend</span>
              <div className="w-6 h-6 relative">
                <div className="w-6 h-6 rounded-full bg-[#D7D7D7]"></div>
              </div>
            </div>
            <div className="bg-[#FEFEFB] border border-[#E3E3E3] rounded-lg px-1.5 py-2 flex items-center gap-1 h-8">
              <div className="w-4 h-4 rounded-full bg-[#136d6d]"></div>
              <span className="text-[14px] text-[#072929]">Clicks</span>
              <div className="w-6 h-6 relative">
                <div className="w-6 h-6 rounded-full bg-[#D7D7D7]"></div>
              </div>
            </div>
            <div className="bg-[#FEFEFB] border border-[#E3E3E3] rounded-lg px-1.5 py-2 flex items-center gap-1 h-8">
              <div className="w-4 h-4 rounded-full bg-[#136d6d]"></div>
              <span className="text-[14px] text-[#072929]">Orders</span>
              <div className="w-6 h-6 relative">
                <div className="w-6 h-6 rounded-full bg-[#D7D7D7]"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <div className="text-[24px] font-medium text-[#0e121b]">$440,364.20</div>
          <div className="bg-[#e0faec] px-2 py-1 rounded-full flex items-center gap-1">
            <svg className="w-4 h-4 text-[#1fc16b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="text-[12px] font-medium text-[#1fc16b]">0.48%</span>
          </div>
        </div>
      </div>
      <div className="flex gap-5">
        {/* Y-axis labels */}
        <div className="flex flex-col text-[12px] text-[#99a0ae] text-center w-[29px]">
          <div className="flex-1 flex items-center justify-center">450k</div>
          <div className="flex-1 flex items-center justify-center">400k</div>
          <div className="flex-1 flex items-center justify-center">350k</div>
          <div className="flex-1 flex items-center justify-center">300k</div>
          <div className="flex-1 flex items-center justify-center">250k</div>
          <div className="flex-1 flex items-center justify-center">200k</div>
        </div>
        
        {/* Chart Area */}
        <div className="flex-1 relative h-[162px]">
          <svg className="w-full h-full" viewBox="0 0 800 162" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => {
              const y = 162 - (ratio * 162);
              return (
                <line key={ratio} x1="0" y1={y} x2="800" y2={y} stroke="#CACFD8" strokeWidth="1" />
              );
            })}

            {/* Sales line (blue) */}
            <polyline
              points={chartData.map((d, i) => `${(i / (chartData.length - 1)) * 800},${162 - (getYPosition(d.sales) / 100) * 162}`).join(' ')}
              fill="none"
              stroke="#3370FF"
              strokeWidth="2"
            />

            {/* Spend line (green) */}
            <polyline
              points={chartData.map((d, i) => `${(i / (chartData.length - 1)) * 800},${162 - (getYPosition(d.spend) / 100) * 162}`).join(' ')}
              fill="none"
              stroke="#136d6d"
              strokeWidth="2"
            />

            {/* Tooltip dot on spend line (around 17 Jan) */}
            <circle cx="400" cy="110" r="6" fill="#136d6d" stroke="white" strokeWidth="1.5" />
            
            {/* Tooltip */}
            <g transform="translate(400, 50)">
              <rect x="-70" y="-30" width="140" height="50" rx="6" fill="#136d6d" />
              <text x="0" y="-10" fontSize="14" fill="white" textAnchor="middle" fontWeight="500">March</text>
              <text x="0" y="8" fontSize="12" fill="white" textAnchor="middle">Spend($) : 1450</text>
              <polygon points="-5,20 0,25 5,20" fill="#136d6d" />
            </g>
          </svg>
        </div>
      </div>
      
      {/* X-axis labels */}
      <div className="flex items-center justify-center gap-0 pl-[29px] text-[12px] text-[#99a0ae] text-center">
        {chartData.filter((_, i) => i % 2 === 0).map((d, i) => (
          <div key={i} className="flex-1">
            {d.date}
          </div>
        ))}
      </div>
    </div>
  );
};

