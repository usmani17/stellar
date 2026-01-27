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
  getEntityFromUrl,
} from "../../utils/urlHelpers";
import { SyncStatusIndicator } from "../google/SyncStatusIndicator";
import { type Account, accountsService } from "../../services/accounts";
import CustomDateRangePicker from "../ui/CustomDateRangePicker";
import GoogleIcon from "../../assets/images/ri_google-fill.svg";
import AmazonIcon from "../../assets/images/amazon-fill.svg";

// Generate a color based on the first letter of the brand name
const getInitialColor = (initial: string): string => {
  const colors = [
    "#136D6D", // Teal
    "#072929", // Dark teal
    "#556179", // Slate
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#F59E0B", // Amber
    "#10B981", // Green
    "#3B82F6", // Blue
    "#EF4444", // Red
    "#06B6D4", // Cyan
    "#F97316", // Orange
    "#6366F1", // Indigo
    "#14B8A6", // Teal variant
    "#A855F7", // Purple variant
    "#E11D48", // Rose
  ];

  if (!initial) return colors[0];
  const charCode = initial.toUpperCase().charCodeAt(0);
  const index = (charCode - 65) % colors.length; // A-Z maps to 0-25, then wraps
  return colors[index];
};

// Component to render channels list for an account (uses channels from accounts data)
const AccountChannelsList: React.FC<{
  accountId: number;
  channels: Array<{ id: number; channel_name: string; channel_type: string }>;
  navigate: ReturnType<typeof useNavigate>;
  onClose: () => void;
}> = ({ accountId, channels, navigate, onClose }) => {
  return (
    <div
      className="w-64 bg-[#FEFEFB] border-t border-r border-b border-[#e8e8e3] rounded-tr-[10px] rounded-br-[10px] shadow-lg z-50 -ml-px overflow-hidden"
      onMouseEnter={(e) => {
        e.stopPropagation();
      }}
    >
      <ul className="overflow-hidden">
        {channels.length === 0 ? (
          <li className="px-3 py-2 text-[12.32px] text-[#556179]">
            No channels
          </li>
        ) : (
          channels.map((channel, index) => (
            <li key={channel.id} className="overflow-hidden">
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  navigate(
                    buildMarketplaceRoute(
                      accountId,
                      channel.channel_type,
                      "campaigns",
                    ),
                  );
                  onClose();
                }}
                className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[12.32px] hover:bg-gray-50 transition-colors ${
                  index === 0 ? "rounded-tr-[10px]" : ""
                } ${index === channels.length - 1 ? "rounded-br-[10px]" : ""}`}
              >
                {channel.channel_type === "amazon" && (
                  <img
                    src={AmazonIcon}
                    alt="Amazon"
                    className="w-5 h-5 flex-shrink-0"
                  />
                )}
                {channel.channel_type === "google" && (
                  <img
                    src={GoogleIcon}
                    alt="Google"
                    className="w-4 h-4 flex-shrink-0"
                  />
                )}
                {channel.channel_type === "tiktok" && (
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                )}
                <span>{channel.channel_name}</span>
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
  const params = useParams<{ accountId?: string; channelId?: string }>();

  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [expandedAccountId, setExpandedAccountId] = useState<number | null>(
    null,
  );
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  // Sync selected account based on accountId or channelId
  useEffect(() => {
    let isCancelled = false;

    if (params.accountId && accounts.length) {
      const acc = accounts.find((a) => a.id === Number(params.accountId));
      if (acc) {
        setSelectedAccount(acc);
        return;
      }
    }

    if (params.channelId && accounts.length) {
      const channelIdNum = Number(params.channelId);

      // First, check if channels are already in accounts data (from backend)
      const accountWithChannel = accounts.find((account) => {
        if (account.channels && account.channels.length > 0) {
          return account.channels.some((ch) => ch.id === channelIdNum);
        }
        return false;
      });

      if (accountWithChannel && !isCancelled) {
        setSelectedAccount(accountWithChannel);
        return;
      }

      // If channels not in accounts data, fetch them (fallback)
      const findAccountFromChannel = async () => {
        // Check all accounts in parallel for better performance
        const promises = accounts.map(async (account) => {
          try {
            const channels = await accountsService.getAccountChannels(
              account.id,
            );
            const channel = channels.find((ch) => ch.id === channelIdNum);
            if (channel) {
              // If channel is in this account's list, this account owns it
              return account.id;
            }
          } catch (error) {
            console.error(
              `Failed to fetch channels for account ${account.id}:`,
              error,
            );
          }
          return null;
        });

        const results = await Promise.all(promises);

        // Find the first non-null result (the account that owns the channel)
        for (let i = 0; i < results.length; i++) {
          if (results[i] !== null && !isCancelled) {
            const accountId = results[i];
            const acc = accounts.find((a) => a.id === accountId);
            if (acc) {
              setSelectedAccount(acc);
              return;
            }
          }
        }
      };

      findAccountFromChannel();

      return () => {
        isCancelled = true;
      };
    }

    if (accounts.length && !selectedAccount && !params.channelId) {
      setSelectedAccount(accounts[0]);
    }
  }, [params.accountId, params.channelId, accounts]);

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
  const currentEntity = getEntityFromUrl(location.pathname);

  // Check if we're on a Google page with a valid entity type
  const isGooglePage = currentMarketplace === "google";
  const validEntityTypes = ["campaigns", "adgroups", "ads", "keywords"];
  const entityType = validEntityTypes.includes(currentEntity || "")
    ? (currentEntity as "campaigns" | "adgroups" | "ads" | "keywords")
    : null;

  // Hide date picker and account dropdown on profile page, integrations page, and account selection pages
  const isProfilePage = location.pathname === "/profile";
  const isIntegrationsPage = /^\/brands\/\d+\/integrations$/.test(location.pathname);
  const isAccountSelectionPage =
    /^\/channels\/\d+\/(select-google-accounts|select-tiktok-profiles|list-profiles)$/.test(
      location.pathname,
    );
  const shouldHideDatePicker =
    isProfilePage || isIntegrationsPage || isAccountSelectionPage;

  // Use channels from accounts data if available, otherwise fall back to API call
  // This avoids unnecessary API calls when channels are already included in accounts response
  const { data: selectedAccountChannelsFromApi = [] } = useChannels(
    selectedAccount?.id && !selectedAccount?.channels
      ? selectedAccount.id
      : undefined,
  );
  const selectedAccountChannels =
    selectedAccount?.channels || selectedAccountChannelsFromApi;
  const selectedChannel = selectedAccount
    ? selectedAccountChannels.find(
        (ch) => ch.channel_type === currentMarketplace,
      )
    : null;

  return (
    <div className="h-20 bg-white border-b border-[rgba(0,0,0,0.1)] flex items-center px-7">
      {/* ACCOUNT */}
      {!isProfilePage && (
        <div
          ref={accountDropdownRef}
          className="relative flex items-center gap-3"
        >
          <button
            onClick={() => {
              if (accounts.length === 0) {
                // If no accounts, redirect to accounts page to create one
                navigate("/brands");
                return;
              }
              const open = !isAccountDropdownOpen;
              setIsAccountDropdownOpen(open);
              if (open && selectedAccount) {
                setExpandedAccountId(selectedAccount.id);
              } else {
                setExpandedAccountId(null);
              }
            }}
            className="account-dropdown-button"
          >
            <div
              className="w-5 h-5 rounded text-white text-[10px] flex items-center justify-center font-semibold"
              style={{
                backgroundColor: getInitialColor(
                  selectedAccount?.name?.[0]?.toUpperCase() ||
                    (accounts.length === 0 ? "!" : "A"),
                ),
              }}
            >
              {selectedAccount?.name?.[0]?.toUpperCase() ||
                (accounts.length === 0 ? "!" : "A")}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[13.2px] text-[#072929]">
                {selectedAccount?.name ||
                  (accounts.length === 0
                    ? "No Accounts - Click to Create"
                    : "Select Account")}
              </span>
              {selectedChannel && (
                <>
                  <span className="text-[13.2px] text-[#556179]">•</span>
                  <div className="flex items-center gap-1.5">
                    {selectedChannel.channel_type === "amazon" && (
                      <img src={AmazonIcon} alt="Amazon" className="w-4 h-4" />
                    )}
                    {selectedChannel.channel_type === "google" && (
                      <img src={GoogleIcon} alt="Google" className="w-4 h-4" />
                    )}
                    {selectedChannel.channel_type === "tiktok" && (
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                      </svg>
                    )}
                    <span className="text-[13.2px] text-[#556179]">
                      {selectedChannel.channel_name}
                    </span>
                  </div>
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
            <div className="absolute top-[42px] left-0 z-40 bg-[#FEFEFB] border border-[#e8e8e3] rounded-[10px] shadow-lg w-72">
              {/* Header with title and close button */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e8e3]">
                <h3 className="text-[13.2px] font-semibold text-[#072929]">
                  Switch between brands
                </h3>
                <button
                  onClick={() => setIsAccountDropdownOpen(false)}
                  className="w-5 h-5 flex items-center justify-center text-[#556179] hover:text-[#072929] transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <ul>
                {accounts.length === 0 ? (
                  <li className="px-3 py-4 text-center">
                    <p className="text-[12.32px] text-[#556179] mb-3">
                      No accounts found
                    </p>
                    <button
                      onClick={() => {
                        navigate("/brands");
                        setIsAccountDropdownOpen(false);
                      }}
                      className="text-[12.32px] text-[#136D6D] hover:text-[#0e5a5a] font-medium underline"
                    >
                      Create your first account
                    </button>
                  </li>
                ) : (
                  accounts.map((account) => {
                    const initial = account.name?.[0]?.toUpperCase() || "A";
                    const bgColor = getInitialColor(initial);

                    return (
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
                            navigate(`/brands/${account.id}/integrations`);
                            setIsAccountDropdownOpen(false);
                            setExpandedAccountId(null);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-[12.32px] text-left ${
                            expandedAccountId === account.id
                              ? "bg-gray-50"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <div
                            className="w-5 h-5 rounded text-white text-[10px] flex items-center justify-center font-semibold flex-shrink-0"
                            style={{ backgroundColor: bgColor }}
                          >
                            {initial}
                          </div>
                          <span className="flex-1 text-left">
                            {account.name}
                          </span>
                          <svg
                            className="w-3 h-3 text-[#556179] flex-shrink-0 ml-auto"
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
                          <div
                            className="absolute top-0 left-full"
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
                          >
                            <AccountChannelsList
                              accountId={account.id}
                              channels={account.channels || []}
                              navigate={navigate}
                              onClose={() => {
                                setIsAccountDropdownOpen(false);
                                setExpandedAccountId(null);
                              }}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* RIGHT */}
      <div className="flex items-center gap-5 ml-auto">
        {!shouldHideDatePicker && (
          <>
            {/* Sync Status Indicator - Only show on Google pages */}
            {isGooglePage && entityType && (
              <div className="flex items-center">
                <SyncStatusIndicator entityType={entityType} />
              </div>
            )}
            <div className="relative" ref={datePickerRef}>
              <button
                onClick={() => setIsDatePickerOpen((p) => !p)}
                className="account-dropdown-button"
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
                <div className="absolute right-0 top-full mt-2 z-[999999] px-4">
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
          </>
        )}
      </div>

      {/* User Settings - Bottom Left (Fixed Position) */}
      <div className="fixed bottom-6 left-6 z-50" ref={profileDropdownRef}>
        <button
          onClick={() => setIsProfileDropdownOpen((p) => !p)}
          className="profile-avatar-button"
        >
          {user?.first_name?.[0] || "U"}
        </button>

        {isProfileDropdownOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#FEFEFB] border border-gray-200 rounded-lg shadow-lg z-50">
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
                  setIsProfileDropdownOpen(false);
                  navigate("/profile");
                }}
                className="w-full text-left px-3 py-2 rounded text-[12.32px] text-[#313850] hover:bg-gray-50 transition-colors"
              >
                Profile
              </button>
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
  );
};
