import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const DashboardHeader: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [dateRange, setDateRange] = React.useState('Jan 1, 2025 - Feb 22, 2025');

  const isAccountsPage = location.pathname === '/accounts';
  const userName = user ? `${user.first_name} ${user.last_name}` : 'User';

  return (
    <div className="h-20 bg-white border-b border-[rgba(0,0,0,0.1)] flex items-center justify-between px-7">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-2 py-1.5 bg-[#FEFEFB] border border-[#EBEAED] rounded-lg h-8">
          <div className="w-3 h-3 rounded bg-[#072929] text-white text-[8px] flex items-center justify-center font-semibold">A</div>
          <span className="text-[12px] text-[#072929] font-medium">{userName}</span>
          <svg className="w-4 h-4 text-[#072929]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div className="flex items-center gap-2 text-[14px] text-[rgba(0,0,0,0.4)]">
          <Link to="/accounts" className={isAccountsPage ? 'text-black' : 'hover:text-[#072929]'}>Accounts</Link>
          <span>/</span>
          <Link to={isAccountsPage ? '/accounts' : '/channels'} className="text-black hover:text-[#072929]">
            {isAccountsPage ? 'Overview' : 'Overview'}
          </Link>
        </div>
      </div>

      {/* Right: Date Range & Profile */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#FEFEFB] border border-gray-200 rounded-xl">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[12px] text-gray-900">{dateRange}</span>
        </div>
        <button className="w-6 h-6 text-gray-400 hover:text-[#072929]">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-[14px] font-semibold">
          {user?.first_name?.[0] || 'U'}
        </div>
      </div>
    </div>
  );
};

