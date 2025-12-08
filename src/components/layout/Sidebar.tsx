import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/campaigns') {
      return location.pathname.startsWith('/campaigns');
    }
    return location.pathname === path;
  };

  return (
    <div className="w-[272px] bg-white border-r border-[rgba(0,0,0,0.1)] h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-4">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-h1100 font-bold text-forest-f60">Stellar</h1>
        </div>

        {/* Accounts Section */}
        <div className="mb-6">
          <div className="space-y-1">
            <Link
              to="/accounts"
              className={`flex items-center gap-2 p-2 rounded-xl transition-colors ${
                isActive('/accounts') 
                  ? 'bg-[rgba(0,0,0,0.04)] text-black' 
                  : 'text-black hover:bg-transparent'
              }`}
            >
              <span className="text-[14px] font-normal leading-[20px]">Accounts</span>
            </Link>
          </div>
        </div>

        {/* Dashboards Section */}
        <div className="mb-6">
          <h2 className="text-[14px] font-normal text-[rgba(0,0,0,0.4)] mb-3 uppercase tracking-wide">Dashboards</h2>
          <div className="space-y-1">
            <Link
              to="/accounts"
              className={`flex items-center gap-2 p-2 rounded-xl transition-colors ${
                isActive('/accounts') 
                  ? 'bg-[rgba(0,0,0,0.04)] text-black' 
                  : 'text-black hover:bg-transparent'
              }`}
            >
              <span className="text-[14px] font-normal leading-[20px]">Overview</span>
            </Link>
          </div>
        </div>

        {/* Amazon Section */}
        <div className="mb-6">
          <h2 className="text-[14px] font-normal text-[rgba(0,0,0,0.4)] mb-3 uppercase tracking-wide">Amazon</h2>
          <div className="space-y-1">
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px] font-normal leading-[20px]">Create Campaign</span>
            </Link>
            <Link
              to="/campaigns"
              className={`flex items-center gap-2 p-2 rounded-xl transition-colors ${
                isActive('/campaigns') 
                  ? 'bg-[rgba(0,0,0,0.04)] text-black' 
                  : 'text-black hover:bg-transparent'
              }`}
            >
              <span className="text-[14px] font-normal leading-[20px]">Campaigns</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px] font-normal leading-[20px]">Ad Groups</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px] font-normal leading-[20px]">Product Target</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px] font-normal leading-[20px]">Analytics</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px] font-normal leading-[20px]">Blueprints</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px] font-normal leading-[20px]">Settings</span>
            </Link>
          </div>
        </div>

        {/* Marketing Channels Section */}
        <div className="mb-6">
          <h2 className="text-[14px] font-normal text-[rgba(0,0,0,0.4)] mb-3 uppercase tracking-wide">Marketing Channels</h2>
          <div className="space-y-1">
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px] font-normal leading-[20px]">Google</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px] font-normal leading-[20px]">Meta</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px] font-normal leading-[20px]">Walmart</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px] font-normal leading-[20px]">Instacart</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px] font-normal leading-[20px]">Criteo</span>
            </Link>
          </div>
        </div>

        {/* Overview Section */}
        <div className="mb-6">
          <h2 className="text-[14px] font-normal text-[rgba(0,0,0,0.4)] mb-3 uppercase tracking-wide">Overview</h2>
          <div className="space-y-1">
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px] font-normal leading-[20px]">Trend Chart</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px] font-normal leading-[20px]">KPI Cards</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px] font-normal leading-[20px]">Top Keywords</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px] font-normal leading-[20px]">Top Products</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 p-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px] font-normal leading-[20px]">Pixels-Like Box</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

