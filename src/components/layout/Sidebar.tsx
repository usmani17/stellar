import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="w-[272px] bg-[#F5F5F0] border-r border-[rgba(0,0,0,0.1)] h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-4">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-h1100 font-bold text-forest-f60">Stellar</h1>
        </div>

        {/* Accounts Section */}
        <div className="mb-6">
          <h2 className="text-[14px] font-normal text-[rgba(0,0,0,0.4)] mb-3 uppercase tracking-wide">Accounts</h2>
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-[#072929]">
              <div className="w-5 h-5 rounded bg-white text-[#072929] text-xs flex items-center justify-center font-semibold">A</div>
              <span className="text-[14px] text-[#e6e6e6] font-normal">Amazon</span>
              <svg className="w-4 h-4 text-[#e6e6e6] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Dashboards Section */}
        <div className="mb-6">
          <h2 className="text-[14px] font-normal text-[rgba(0,0,0,0.4)] mb-3 uppercase tracking-wide">Dashboards</h2>
          <div className="space-y-1">
            <Link
              to="/accounts"
              className={`flex items-center gap-2 px-2 py-2 rounded-xl transition-colors ${
                isActive('/accounts') ? 'bg-transparent text-black' : 'text-black hover:bg-transparent'
              }`}
            >
              <span className="text-[14px]">Overview</span>
            </Link>
          </div>
        </div>

        {/* Amazon Section */}
        <div className="mb-6">
          <h2 className="text-[14px] font-normal text-[rgba(0,0,0,0.4)] mb-3 uppercase tracking-wide">Amazon</h2>
          <div className="space-y-1">
            <Link
              to="/channels"
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-[#072929] hover:bg-transparent transition-colors"
            >
              <span className="text-[14px]">Create Campaign</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-[#072929] hover:bg-transparent transition-colors"
            >
              <span className="text-[14px]">Campaign Manager</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-[#072929] hover:bg-transparent transition-colors"
            >
              <span className="text-[14px]">Ad Groups</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-[#072929] hover:bg-transparent transition-colors"
            >
              <span className="text-[14px]">Product Target</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-[#072929] hover:bg-transparent transition-colors"
            >
              <span className="text-[14px]">Analytics</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-[#072929] hover:bg-transparent transition-colors"
            >
              <span className="text-[14px]">Blueprints</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-[#072929] hover:bg-transparent transition-colors"
            >
              <span className="text-[14px]">Settings</span>
            </Link>
          </div>
        </div>

        {/* Marketing Channels Section */}
        <div className="mb-6">
          <h2 className="text-[14px] font-normal text-[rgba(0,0,0,0.4)] mb-3 uppercase tracking-wide">Marketing Channels</h2>
          <div className="space-y-1">
            <Link
              to="/channels"
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-[#072929] hover:bg-transparent transition-colors"
            >
              <span className="text-[14px]">Google</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-[#072929] hover:bg-transparent transition-colors"
            >
              <span className="text-[14px]">Meta</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-[#072929] hover:bg-transparent transition-colors"
            >
              <span className="text-[14px]">Walmart</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-[#072929] hover:bg-transparent transition-colors"
            >
              <span className="text-[14px]">Instacart</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-[#072929] hover:bg-transparent transition-colors"
            >
              <span className="text-[14px]">Criteo</span>
            </Link>
          </div>
        </div>

        {/* Overview Section */}
        <div className="mb-6">
          <h2 className="text-[14px] font-normal text-[rgba(0,0,0,0.4)] mb-3 uppercase tracking-wide">Overview</h2>
          <div className="space-y-1">
            <Link
              to="/channels"
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px]">Trend Chart</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px]">KPI Cards</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px]">Top Keywords</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px]">Top Products</span>
            </Link>
            <Link
              to="/channels"
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-black hover:bg-transparent transition-colors"
            >
              <span className="text-[14px]">Pixels-Like Box</span>
            </Link>
          </div>
        </div>

        {/* Logout */}
        <div className="mt-auto pt-6 border-t border-[rgba(0,0,0,0.1)]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-black hover:bg-transparent transition-colors w-full"
          >
            <span className="text-[16px] font-bold">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

