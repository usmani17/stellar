import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import "react-datepicker/dist/react-datepicker.css";
import { useAccounts } from "../../contexts/AccountsContext";
import { useChannels } from "../../hooks/queries/useChannels";
import { useAuth } from "../../contexts/AuthContext";
import { useDateRange } from "../../contexts/DateRangeContext";
import {
  buildMarketplaceRoute,
  getMarketplaceFromUrl,
} from "../../utils/urlHelpers";
import { type Account, type Channel } from "../../services/accounts";
import CustomDateRangePicker from "../ui/CustomDateRangePicker";

// Component to render channels list for an account (uses React Query hook properly)
const AccountChannelsList: React.FC<{
  accountId: number;
  navigate: ReturnType<typeof useNavigate>;
  onClose: () => void;
}> = ({ accountId, navigate, onClose }) => {
  const { data: accountChannels = [], isLoading: channelsLoading } =
    useChannels(accountId);

  return (
    <div
      className="absolute top-0 left-full w-64 bg-[#FEFEFB] border border-[#e8e8e3] rounded-[10px] shadow-lg z-50"
      onMouseEnter={(e) => {
        e.stopPropagation();
      }}
    >
      <ul>
        {channelsLoading ? (
          <li className="px-3 py-2 text-[12.32px] text-[#556179]">
            Loading...
          </li>
        ) : accountChannels.length === 0 ? (
          <li className="px-3 py-2 text-[12.32px] text-[#556179]">
            No channels
          </li>
        ) : (
          accountChannels.map((channel) => (
            <li key={channel.id}>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  navigate(
                    buildMarketplaceRoute(
                      accountId,
                      channel.channel_type,
                      "campaigns"
                    )
                  );
                  onClose();
                }}
                className="w-full text-left px-3 py-2 text-[12.32px] hover:bg-gray-50"
              >
                {channel.channel_name}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export const DashboardHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const { accounts } = useAccounts();
  const { startDate, endDate, setDateRange, formatDateRange } = useDateRange();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ accountId?: string }>();

  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [expandedAccountId, setExpandedAccountId] = useState<number | null>(
    null
  );
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  // Sync selected account
  useEffect(() => {
    if (params.accountId && accounts.length) {
      const acc = accounts.find((a) => a.id === Number(params.accountId));
      if (acc) setSelectedAccount(acc);
    } else if (accounts.length && !selectedAccount) {
      setSelectedAccount(accounts[0]);
    }
  }, [params.accountId, accounts, selectedAccount]);

  // Note: Channels are now loaded automatically via React Query hooks
  // No need to manually load channels - the useChannels hook handles it

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;

      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(t)
      ) {
        setIsAccountDropdownOpen(false);
        setExpandedAccountId(null);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(t)) {
        setIsDatePickerOpen(false);
      }
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(t)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Get current marketplace/channel from URL
  const currentMarketplace = getMarketplaceFromUrl(location.pathname);

  // Use React Query hook for selected account's channels
  const { data: selectedAccountChannels = [] } = useChannels(
    selectedAccount?.id
  );
  const selectedChannel = selectedAccount
    ? selectedAccountChannels.find(
        (ch) => ch.channel_type === currentMarketplace
      )
    : null;

  return (
    <div className="h-20 bg-white border-b border-[rgba(0,0,0,0.1)] flex items-center justify-between px-7">
      {/* ACCOUNT */}
      <div
        ref={accountDropdownRef}
        className="relative flex items-center gap-3"
      >
        <button
          onClick={() => {
            const open = !isAccountDropdownOpen;
            setIsAccountDropdownOpen(open);
            if (open && selectedAccount) {
              setExpandedAccountId(selectedAccount.id);
            } else {
              setExpandedAccountId(null);
            }
          }}
          className="flex items-center gap-2 h-10 px-4 bg-[#FEFEFB] border border-gray-200 rounded-[12px] hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors"
        >
          <div className="w-5 h-5 rounded bg-[#072929] text-white text-[10px] flex items-center justify-center font-semibold">
            {selectedAccount?.name?.[0]?.toUpperCase() || "A"}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[13.2px] text-[#072929]">
              {selectedAccount?.name || "Select Account"}
            </span>
            {selectedChannel && (
              <>
                <span className="text-[13.2px] text-[#556179]">•</span>
                <span className="text-[13.2px] text-[#556179]">
                  {selectedChannel.channel_name}
                </span>
              </>
            )}
          </div>
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
          <div className="absolute top-[60px] left-0 z-40 bg-[#FEFEFB] border border-[#e8e8e3] rounded-[10px] shadow-lg w-72">
            <ul className="py-1">
              {accounts.map((account) => (
                <li key={account.id} className="relative">
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseEnter={() => {
                      if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                        hoverTimeoutRef.current = null;
                      }
                      setExpandedAccountId(account.id);
                    }}
                    onMouseLeave={() => {
                      hoverTimeoutRef.current = window.setTimeout(() => {
                        setExpandedAccountId(null);
                      }, 150);
                    }}
                    onClick={() => {
                      setSelectedAccount(account);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-[12.32px] hover:bg-gray-50"
                  >
                    <span>{account.name}</span>
                    <svg
                      className="w-3 h-3 text-[#556179]"
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

                  {expandedAccountId === account.id && (
                    <AccountChannelsList
                      accountId={account.id}
                      navigate={navigate}
                      onClose={() => {
                        setIsAccountDropdownOpen(false);
                        setExpandedAccountId(null);
                      }}
                      onMouseEnter={() => {
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                          hoverTimeoutRef.current = null;
                        }
                        setExpandedAccountId(account.id);
                      }}
                      onMouseLeave={() => {
                        setExpandedAccountId(null);
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-5">
        <div className="relative" ref={datePickerRef}>
          <button
            onClick={() => setIsDatePickerOpen((p) => !p)}
            className="flex items-center gap-2 h-10 px-4 bg-[#FEFEFB] border border-gray-200 rounded-[12px] hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors"
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
                onApply={(dates) => {
                  const [start, end] = dates;
                  if (start && end) {
                    setDateRange(start, end);
                    setIsDatePickerOpen(false);
                  }
                }}
                onCancel={() => setIsDatePickerOpen(false)}
              />
            </div>
          )}
        </div>

        <div className="relative" ref={profileDropdownRef}>
          <button
            onClick={() => setIsProfileDropdownOpen((p) => !p)}
            className="w-8 h-8 rounded-full bg-[#FEFEFB] border border-gray-200 flex items-center justify-center text-gray-600 text-[12.32px] font-semibold hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors"
          >
            {user?.first_name?.[0] || "U"}
          </button>

          {isProfileDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg z-50">
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
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
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
