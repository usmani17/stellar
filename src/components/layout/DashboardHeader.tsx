import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "react-datepicker/dist/react-datepicker.css";
import { useAccounts } from "../../contexts/AccountsContext";
import { useAuth } from "../../contexts/AuthContext";
import { useDateRange } from "../../contexts/DateRangeContext";
import {
  accountsService,
  type Account,
  type Channel,
} from "../../services/accounts";
import CustomDateRangePicker from "../ui/CustomDateRangePicker";

export const DashboardHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const { accounts } = useAccounts();
  const { startDate, endDate, setDateRange, formatDateRange } = useDateRange();
  const navigate = useNavigate();
  const params = useParams<{ accountId?: string }>();

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

  const [hoveredAccountId, setHoveredAccountId] = useState<number | null>(null);
  const closeHoverTimerRef = useRef<number | null>(null);

  const [channelsByAccount, setChannelsByAccount] = useState<
    Record<number, Channel[]>
  >({});
  const [channelsLoadingId, setChannelsLoadingId] = useState<number | null>(
    null
  );

  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // Update selected account when URL params change or accounts load
  useEffect(() => {
    if (params.accountId && accounts.length > 0) {
      const accountId = parseInt(params.accountId, 10);
      const account = accounts.find((a) => a.id === accountId);
      if (account) {
        setSelectedAccount(account);
      }
    } else if (accounts.length > 0 && !selectedAccount) {
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
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAccountDropdownOpen(false);
        setHoveredAccountId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const clearCloseTimer = () => {
    if (closeHoverTimerRef.current) {
      window.clearTimeout(closeHoverTimerRef.current);
      closeHoverTimerRef.current = null;
    }
  };

  const scheduleCloseHoveredAccount = (accountId: number) => {
    clearCloseTimer();
    closeHoverTimerRef.current = window.setTimeout(() => {
      setHoveredAccountId((prev) => (prev === accountId ? null : prev));
    }, 150);
  };

  // Load channels lazily when hovering an account
  const handleAccountHover = async (accountId: number) => {
    clearCloseTimer();
    setHoveredAccountId(accountId);

    if (channelsByAccount[accountId] || channelsLoadingId === accountId) {
      return;
    }

    const accountFromList = accounts.find((a) => a.id === accountId);
    if (accountFromList && accountFromList.channels) {
      setChannelsByAccount((prev) => ({
        ...prev,
        [accountId]: accountFromList.channels!,
      }));
      return;
    }

    setChannelsLoadingId(accountId);
    try {
      const channels = await accountsService.getAccountChannels(accountId);
      setChannelsByAccount((prev) => ({
        ...prev,
        [accountId]: channels,
      }));
    } catch (e) {
      console.error("Failed to load channels for account", accountId, e);
    } finally {
      setChannelsLoadingId((prev) => (prev === accountId ? null : prev));
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleAccountSelect = (value: number) => {
    const account = accounts.find((a) => a.id === value);
    if (account) {
      setSelectedAccount(account);
      navigate(`/accounts/${account.id}/campaigns`);
    }
  };

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
      <div
        className="flex items-center gap-3 relative"
        ref={accountDropdownRef}
      >
        <button
          type="button"
          onClick={() => setIsAccountDropdownOpen((prev) => !prev)}
          className="flex items-center gap-2 px-2 py-1.5 bg-background-field border border-gray-200 rounded-lg h-8 hover:bg-gray-50"
        >
          <div className="w-3 h-3 rounded bg-[#072929] text-white text-[7.04px] flex items-center justify-center font-semibold">
            {selectedAccount?.name?.[0]?.toUpperCase() || "A"}
          </div>
          <span className="text-[10.56px] text-[#072929] font-medium">
            {selectedAccount?.name || "Select Account"}
          </span>
          <svg
            className={`w-4 h-4 text-[#072929] transition-transform ${
              isAccountDropdownOpen ? "rotate-180" : ""
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

        {isAccountDropdownOpen && (
          <div className="absolute top-[60px] left-0 z-40 bg-white border border-gray-200 rounded-lg shadow-lg w-72">
            <ul className="max-h-80 overflow-y-auto py-1">
              {accounts.map((account) => (
                <li
                  key={account.id}
                  className="relative"
                  onMouseEnter={() => handleAccountHover(account.id)}
                  onMouseLeave={() => scheduleCloseHoveredAccount(account.id)}
                >
                  <button
                    type="button"
                    onClick={() => {
                      handleAccountSelect(account.id);
                      setIsAccountDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-[12.32px] text-[#313850] hover:bg-gray-50"
                  >
                    <span className="truncate">{account.name}</span>
                    <svg
                      className="w-3 h-3 text-[#556179] ml-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>

                  {/* Nested channels submenu */}
                  {hoveredAccountId === account.id && (
                    <div
                      className="absolute top-0 left-full bg-white border border-gray-200 rounded-lg shadow-lg w-64 z-50"
                      onMouseEnter={() => {
                        clearCloseTimer();
                        setHoveredAccountId(account.id);
                      }}
                      onMouseLeave={() =>
                        scheduleCloseHoveredAccount(account.id)
                      }
                    >
                      <ul className="py-1">
                        {channelsLoadingId === account.id &&
                          !channelsByAccount[account.id] && (
                            <li>
                              <div className="px-3 py-2 text-[12.32px] text-[#556179]">
                                Loading channels...
                              </div>
                            </li>
                          )}

                        {channelsByAccount[account.id] &&
                          channelsByAccount[account.id].length === 0 && (
                            <li>
                              <div className="px-3 py-2 text-[12.32px] text-[#556179]">
                                No channels
                              </div>
                            </li>
                          )}

                        {channelsByAccount[account.id] &&
                          channelsByAccount[account.id].map((channel) => (
                            <li key={channel.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (channel.channel_type === "google") {
                                    navigate(
                                      `/accounts/${account.id}/google-campaigns`
                                    );
                                  } else if (
                                    channel.channel_type === "amazon"
                                  ) {
                                    navigate(
                                      `/accounts/${account.id}/campaigns`
                                    );
                                  } else if (
                                    channel.channel_type === "walmart"
                                  ) {
                                    // TODO: add walmart route when available
                                  }
                                  setIsAccountDropdownOpen(false);
                                  setHoveredAccountId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[12.32px] text-[#313850] hover:bg-gray-50"
                              >
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-background-field text-[10px] font-semibold text-[#072929]">
                                  {channel.channel_type === "google"
                                    ? "G"
                                    : channel.channel_type === "amazon"
                                    ? "A"
                                    : "W"}
                                </span>
                                <span className="truncate">
                                  {channel.channel_name}
                                </span>
                              </button>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Right: Date Range & Profile */}
      <div className="flex items-center gap-5">
        <div className="relative" ref={datePickerRef}>
          <button
            onClick={toggleDatePicker}
            className="flex items-center gap-2 h-10 px-4 bg-background-field border border-gray-200 rounded-[12px] hover:bg-gray-50 transition-all"
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
            <span className="text-[13.2px] text-[#072929]">
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
            className="w-8 h-8 rounded-full bg-background-field border border-gray-200 flex items-center justify-center text-gray-600 text-[12.32px] font-semibold hover:bg-gray-50 transition-colors"
          >
            {user?.first_name?.[0] || "U"}
          </button>

          {isProfileDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-2">
                <div className="px-3 py-2 text-[12.32px] text-[#313850] border-b border-gray-100">
                  <div className="font-medium">
                    {user?.first_name} {user?.last_name}
                  </div>
                  <div className="text-[10.56px] text-[#556179] mt-1">
                    {user?.email}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded text-[12.32px] text-[#313850] hover:bg-gray-50 transition-colors"
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
