import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAuth } from '../../contexts/AuthContext';
import { useDateRange } from '../../contexts/DateRangeContext';
import { accountsService, type Account } from '../../services/accounts';

export const DashboardHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const { startDate, endDate, setDateRange, formatDateRange } = useDateRange();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ accountId?: string }>();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const isAccountsPage = location.pathname === '/accounts';
  const userName = user ? `${user.first_name} ${user.last_name}` : 'User';

  useEffect(() => {
    loadAccounts();
  }, []);

  // Update selected account when URL params change
  useEffect(() => {
    if (params.accountId && accounts.length > 0) {
      const accountId = parseInt(params.accountId, 10);
      const account = accounts.find(a => a.id === accountId);
      if (account) {
        setSelectedAccount(account);
      }
    }
  }, [params.accountId, accounts]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadAccounts = async () => {
    try {
      const accountsData = await accountsService.getAccounts();
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      
      // Set first account as selected by default if no accountId in URL
      if (accountsData.length > 0 && !params.accountId && !selectedAccount) {
        setSelectedAccount(accountsData[0]);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const handleAccountSelect = (account: Account) => {
    setSelectedAccount(account);
    setIsDropdownOpen(false);
    // Navigate to campaigns page for the selected account
    navigate(`/accounts/${account.id}/campaigns`);
  };

  return (
    <div className="h-20 bg-white border-b border-[rgba(0,0,0,0.1)] flex items-center justify-between px-7">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-6">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-2 py-1.5 bg-[#FEFEFB] border border-[#EBEAED] rounded-lg h-8 hover:bg-gray-50"
          >
            <div className="w-3 h-3 rounded bg-[#072929] text-white text-[6.4px] flex items-center justify-center font-semibold">
              {selectedAccount ? selectedAccount.account_name[0].toUpperCase() : 'A'}
            </div>
            <span className="text-[9.6px] text-[#072929] font-medium">
              {selectedAccount ? selectedAccount.account_name : 'Select Account'}
            </span>
            <svg className="w-4 h-4 text-[#072929]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              <div className="p-2">
                {accounts.length === 0 ? (
                  <div className="px-3 py-2 text-[11.2px] text-[#556179]">
                    No accounts available
                  </div>
                ) : (
                  accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleAccountSelect(account)}
                      className={`w-full text-left px-3 py-2 rounded text-[11.2px] hover:bg-gray-50 ${
                        selectedAccount?.id === account.id
                          ? 'bg-[#F0F0ED] text-[#072929] font-medium'
                          : 'text-[#313850]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{account.account_name}</span>
                        {selectedAccount?.id === account.id && (
                          <svg className="w-4 h-4 text-[#072929]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Date Range & Profile */}
      <div className="flex items-center gap-5">
        <div className="relative" ref={datePickerRef}>
          <button
            onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
            className={`flex items-center gap-2 px-3 py-2 bg-[#FEFEFB] border ${
              isDatePickerOpen ? 'border-[#0066ff]' : 'border-gray-200'
            } rounded-xl hover:bg-gray-50 transition-all`}
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[9.6px] text-gray-900 font-normal">{formatDateRange()}</span>
            <svg 
              className={`w-4 h-4 text-gray-400 transition-transform ${isDatePickerOpen ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isDatePickerOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-lg border border-[#E6E6E6] overflow-hidden">
              <DatePicker
                selected={startDate}
                onChange={(dates) => {
                  if (Array.isArray(dates)) {
                    const [start, end] = dates;
                    if (start && end) {
                      setDateRange(start, end);
                      setIsDatePickerOpen(false);
                    } else if (start) {
                      setDateRange(start, endDate);
                    }
                  } else if (dates) {
                    setDateRange(dates, endDate);
                  }
                }}
                startDate={startDate}
                endDate={endDate}
                selectsRange
                inline
                maxDate={new Date()}
                calendarClassName="custom-datepicker"
                dateFormat="MMM d, yyyy"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
              />
            </div>
          )}
        </div>
        <div className="relative" ref={profileDropdownRef}>
          <button
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-[11.2px] font-semibold hover:bg-gray-300 transition-colors"
          >
            {user?.first_name?.[0] || 'U'}
          </button>
          
          {isProfileDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-2">
                <div className="px-3 py-2 text-[11.2px] text-[#313850] border-b border-gray-100">
                  <div className="font-medium">{user?.first_name} {user?.last_name}</div>
                  <div className="text-[9.6px] text-[#556179] mt-1">{user?.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded text-[11.2px] text-[#313850] hover:bg-gray-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

