import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "react-datepicker/dist/react-datepicker.css";
import { useAccounts } from "../../contexts/AccountsContext";
import { useAuth } from "../../contexts/AuthContext";
import { useDateRange } from "../../contexts/DateRangeContext";
import { type Account } from "../../services/accounts";
import CustomDateRangePicker from "../ui/CustomDateRangePicker";
import { Dropdown, type DropdownOption } from "../ui/Dropdown";

export const DashboardHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const { accounts } = useAccounts();
  const { startDate, endDate, setDateRange, formatDateRange } = useDateRange();
  const navigate = useNavigate();
  const params = useParams<{ accountId?: string }>();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Update selected account when URL params change or accounts load
  useEffect(() => {
    if (params.accountId && accounts.length > 0) {
      const accountId = parseInt(params.accountId, 10);
      const account = accounts.find((a) => a.id === accountId);
      if (account) {
        setSelectedAccount(account);
      }
    } else if (accounts.length > 0 && !selectedAccount) {
      // Set first account as selected by default if no accountId in URL
      setSelectedAccount(accounts[0]);
    }
  }, [params.accountId, accounts, selectedAccount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node)
      ) {
        setIsDatePickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleAccountSelect = (value: number) => {
    const account = accounts.find((a) => a.id === value);
    if (account) {
      setSelectedAccount(account);
      // Navigate to campaigns page for the selected account
      navigate(`/accounts/${account.id}/campaigns`);
    }
  };

  // Convert accounts to dropdown options
  const accountOptions: DropdownOption<number>[] = accounts.map((account) => ({
    value: account.id,
    label: account.name,
  }));

  const toggleDatePicker = () => {
    setIsDatePickerOpen(!isDatePickerOpen);
  };

  const applyDateRange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    if (start && end) {
      setDateRange(start, end);
      setIsDatePickerOpen(false);
    }
  };

  const cancelDateRange = () => {
    setIsDatePickerOpen(false);
  };

  return (
    <div className="h-20 bg-white border-b border-[rgba(0,0,0,0.1)] flex items-center justify-between px-7">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-6">
        <Dropdown<number>
          options={accountOptions}
          value={selectedAccount?.id}
          placeholder="Select Account"
          onChange={handleAccountSelect}
          width="w-80"
          emptyMessage="No accounts available"
          renderButton={(option, isOpen, toggle) => (
            <button
              type="button"
              onClick={toggle}
              className="flex items-center gap-2 px-2 py-1.5 bg-background-field border border-gray-200 rounded-lg h-8 hover:bg-gray-50"
            >
              <div className="w-3 h-3 rounded bg-[#072929] text-white text-[6.4px] flex items-center justify-center font-semibold">
                {option ? option.label[0]?.toUpperCase() : "A"}
              </div>
              <span className="text-[9.6px] text-[#072929] font-medium">
                {option ? option.label : "Select Account"}
              </span>
              <svg
                className={`w-4 h-4 text-[#072929] transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
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
            </button>
          )}
        />
      </div>

      {/* Right: Date Range & Profile */}
      <div className="flex items-center gap-5">
        <div className="relative" ref={datePickerRef}>
          <button
            onClick={toggleDatePicker}
            className={`flex items-center gap-2 h-10 px-4 bg-background-field border ${
              isDatePickerOpen ? "border-gray-200" : "border-gray-200"
            } rounded-[12px] hover:bg-gray-50 transition-all`}
          >
            <svg
              className="w-5 h-5 text-[#072929]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-[12px] text-[#072929]">
              {formatDateRange()}
            </span>
            <svg
              className={`w-4 h-4 text-[#556179] transition-transform ${
                isDatePickerOpen ? "rotate-180" : ""
              }`}
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
          </button>
          {isDatePickerOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 px-4">
              <CustomDateRangePicker
                monthsShown={2}
                calendarClassName="custom-datepicker"
                className="custom-datepicker-cls"
                startDate={startDate}
                endDate={endDate}
                onChange={(dates) => {
                  // This is called when Apply is clicked, but we handle it in onApply
                  const [start, end] = dates;
                  if (start && end) {
                    setDateRange(start, end);
                  }
                }}
                onApply={applyDateRange}
                onCancel={cancelDateRange}
              />
            </div>
          )}
        </div>
        <div className="relative" ref={profileDropdownRef}>
          <button
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="w-8 h-8 rounded-full bg-background-field border border-gray-200 flex items-center justify-center text-gray-600 text-[11.2px] font-semibold hover:bg-gray-50 transition-colors"
          >
            {user?.first_name?.[0] || "U"}
          </button>

          {isProfileDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-2">
                <div className="px-3 py-2 text-[11.2px] text-[#313850] border-b border-gray-100">
                  <div className="font-medium">
                    {user?.first_name} {user?.last_name}
                  </div>
                  <div className="text-[9.6px] text-[#556179] mt-1">
                    {user?.email}
                  </div>
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
