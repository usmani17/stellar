import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { accountsService } from "../services/accounts";
import type { Channel } from "../services/accounts";
import { useAccounts } from "../contexts/AccountsContext";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { Button, Menu } from "../components/ui";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import AmazonIcon from "../assets/images/ri_amazon-fill.svg";
import GoogleIcon from "../assets/images/ri_google-fill.svg";

export const Channels: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { accounts } = useAccounts();
  const { sidebarWidth } = useSidebar();
  const [account, setAccount] = useState<{ id: number; name: string } | null>(
    null
  );
  const [channels, setChannels] = useState<Channel[]>([]);
  const [profileCounts, setProfileCounts] = useState<
    Record<number, { selected: number; total: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<{
    accountId: number;
    provider: "amazon" | "google" | "tiktok";
  } | null>(null);
  const [editingChannel, setEditingChannel] = useState<{
    channelId: number;
    field: "channel_name";
  } | null>(null);
  const [editedChannelName, setEditedChannelName] = useState<string>("");
  const [updatingChannel, setUpdatingChannel] = useState(false);

  const loadData = useCallback(async () => {
    if (!accountId) {
      navigate("/accounts");
      return;
    }

    try {
      setLoading(true);
      const accountIdNum = parseInt(accountId, 10);

      // Only fetch channels - account name comes from context or channel response
      const channelsData = await accountsService.getAccountChannels(
        accountIdNum
      );
      const channelsArray = Array.isArray(channelsData) ? channelsData : [];

      // Set account name from context (already loaded) or from channel response
      const foundAccount = accounts.find((acc) => acc.id === accountIdNum);
      if (foundAccount) {
        setAccount({ id: foundAccount.id, name: foundAccount.name });
      } else if (channelsArray.length > 0 && channelsArray[0].account_name) {
        // Fallback: use account_name from channel if available
        setAccount({ id: accountIdNum, name: channelsArray[0].account_name });
      } else {
        // Last resort: set with just the ID
        setAccount({ id: accountIdNum, name: `Account ${accountIdNum}` });
      }

      // Set channels immediately so UI can render
      setChannels(channelsArray);

      // Extract profile counts from channel data (now included in API response)
      const counts: Record<number, { selected: number; total: number }> = {};
      channelsArray.forEach((channel) => {
        if (channel.profile_counts) {
          counts[channel.id] = channel.profile_counts;
        } else {
          counts[channel.id] = { selected: 0, total: 0 };
        }
      });
      setProfileCounts(counts);
    } catch (error) {
      console.error("Failed to load data:", error);
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }, [accountId, accounts, navigate]);

  // Set page title
  useEffect(() => {
    setPageTitle("Channels");
    return () => {
      resetPageTitle();
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConnectAmazon = async () => {
    if (!account) return;
    setOauthError(null);
    setOauthLoading({ accountId: account.id, provider: "amazon" });

    try {
      const { auth_url } = await accountsService.initiateAmazonOAuth(
        account.id
      );
      window.location.href = auth_url;
    } catch (err: any) {
      setOauthError(
        err.response?.data?.error || "Failed to initiate Amazon OAuth"
      );
      setOauthLoading(null);
    }
  };

  const handleConnectGoogle = async () => {
    if (!account) return;
    setOauthError(null);
    setOauthLoading({ accountId: account.id, provider: "google" });

    try {
      const { auth_url } = await accountsService.initiateGoogleOAuth(
        account.id
      );
      window.location.href = auth_url;
    } catch (err: any) {
      setOauthError(
        err.response?.data?.error || "Failed to initiate Google OAuth"
      );
      setOauthLoading(null);
    }
  };

  const handleConnectTikTok = async () => {
    if (!account) return;
    setOauthError(null);
    setOauthLoading({ accountId: account.id, provider: "tiktok" });

    try {
      const { auth_url } = await accountsService.initiateTikTokOAuth(
        account.id
      );
      window.location.href = auth_url;
    } catch (err: any) {
      setOauthError(
        err.response?.data?.error || "Failed to initiate TikTok OAuth"
      );
      setOauthLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatChannelType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const startEditChannelName = (channel: Channel, field: "channel_name") => {
    setEditingChannel({ channelId: channel.id, field });
    setEditedChannelName(channel.channel_name || "");
  };

  const cancelEditChannelName = () => {
    setEditingChannel(null);
    setEditedChannelName("");
  };

  const confirmEditChannelName = async (newName: string) => {
    if (!editingChannel || !newName.trim()) {
      cancelEditChannelName();
      return;
    }

    const channel = channels.find((c) => c.id === editingChannel.channelId);
    if (!channel || newName.trim() === channel.channel_name) {
      cancelEditChannelName();
      return;
    }

    setUpdatingChannel(true);
    try {
      if (!accountId) {
        throw new Error("Account ID is required");
      }
      await accountsService.updateChannel(
        parseInt(accountId, 10),
        editingChannel.channelId,
        {
          channel_name: newName.trim(),
        }
      );
      await loadData();
      cancelEditChannelName();
    } catch (error: any) {
      console.error("Failed to update channel:", error);
      alert(error.response?.data?.error || "Failed to update channel name");
    } finally {
      setUpdatingChannel(false);
    }
  };

  // Filter channels based on search query
  const filteredChannels = channels.filter((channel) =>
    (channel.channel_name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  // Menu icons
  const MoreVertIcon = () => (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  );

  const isConnecting = oauthLoading?.accountId === account?.id;

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
        {/* Header */}
        <DashboardHeader />

        {/* Main Content Area */}
        <div className="p-8 bg-white">
          {/* Back to Accounts Link */}
          <button
            onClick={() => navigate(`/accounts`)}
            className="flex items-center gap-2 text-[#072929] hover:text-[#136D6D] transition-colors mb-4"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-[14px] font-medium">Back to Accounts</span>
          </button>

          {oauthError && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-[14px]">
              {oauthError}
              <button
                onClick={() => setOauthError(null)}
                className="ml-2 text-red-800 hover:text-red-900 font-semibold"
              >
                ×
              </button>
            </div>
          )}

          <div className="space-y-6">
            {/* Channels Table Card */}
            <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-6 flex flex-col gap-6">
              {/* Header with Search and Connect Button */}
              <div className="flex items-center justify-between gap-6">
                <h2 className="text-[24px] font-medium text-[#072929] leading-[normal]">
                  {account ? `${account.name} Channels` : "Channels"}
                </h2>
                <div className="flex items-center gap-6">
                  {/* Search */}
                  <div className="bg-[#f0f0ed] border border-[#e8e8e3] rounded-[8px] h-[40px] w-[272px] flex items-center gap-2 px-[10px]">
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
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#556179] placeholder:text-[#556179]"
                    />
                  </div>
                  {/* Connect Button */}
                  <Menu
                    trigger={
                      <Button
                        size="sm"
                        disabled={isConnecting}
                        className="bg-[#136d6d] text-[#fbfafc] hover:bg-[#0e5a5a] px-2 py-1.5 h-[36px] rounded-lg flex items-center gap-2 w-[100px] justify-center"
                      >
                        <span className="text-[14px] font-medium">
                          {isConnecting ? "Connecting..." : "Connect"}
                        </span>
                      </Button>
                    }
                    items={[
                      {
                        label: "Amazon",
                        icon: (
                          <img
                            src={AmazonIcon}
                            alt="Amazon"
                            className="w-5 h-5"
                          />
                        ),
                        onClick: handleConnectAmazon,
                        disabled: isConnecting,
                      },
                      {
                        label: "Google",
                        icon: (
                          <img
                            src={GoogleIcon}
                            alt="Google"
                            className="w-5 h-5"
                          />
                        ),
                        onClick: handleConnectGoogle,
                        disabled: isConnecting,
                      },
                      {
                        label: "TikTok",
                        icon: (
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                          </svg>
                        ),
                        onClick: handleConnectTikTok,
                        disabled: isConnecting,
                      },
                    ]}
                    align="left"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-x-auto overflow-y-visible relative">
                {loading ? (
                  <div className="text-center py-8 text-[#556179] text-[14px]">
                    Loading channels...
                  </div>
                ) : filteredChannels.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[14px] text-[#556179] mb-4">
                      {searchQuery ? "No channels found" : "No channels yet"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto relative">
                    <table className="w-full relative">
                      <thead>
                        <tr className="border-b border-[#e8e8e3]">
                          <th className="text-left py-3 px-5 text-[14px] font-medium text-[#29303f] leading-[20px]">
                            Channel Name
                          </th>
                          <th className="text-left py-3 px-5 text-[14px] font-medium text-[#29303f] leading-[20px]">
                            Type
                          </th>
                          <th className="text-left py-3 px-5 text-[14px] font-medium text-[#29303f] leading-[20px]">
                            Channel Created
                          </th>
                          <th className="text-left py-3 px-5 text-[14px] font-medium text-[#29303f] leading-[20px]">
                            Profiles
                          </th>
                          <th className="text-left py-3 px-5 text-[14px] font-medium text-[#29303f] leading-[20px]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredChannels.map((channel, index) => {
                          const isLastRow =
                            index === filteredChannels.length - 1;

                          return (
                            <tr
                              key={channel.id}
                              className={`${
                                !isLastRow ? "border-b border-[#e8e8e3]" : ""
                              } hover:bg-gray-50 transition-colors`}
                            >
                              <td className="py-4 px-5 group">
                                {editingChannel?.channelId === channel.id &&
                                editingChannel.field === "channel_name" ? (
                                  <input
                                    type="text"
                                    value={editedChannelName}
                                    onChange={(e) =>
                                      setEditedChannelName(e.target.value)
                                    }
                                    onBlur={(e) => {
                                      const inputValue = e.target.value.trim();
                                      if (
                                        inputValue === channel.channel_name ||
                                        inputValue === ""
                                      ) {
                                        cancelEditChannelName();
                                      } else {
                                        confirmEditChannelName(inputValue);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.currentTarget.blur();
                                      } else if (e.key === "Escape") {
                                        cancelEditChannelName();
                                      }
                                    }}
                                    autoFocus
                                    disabled={updatingChannel}
                                    className="w-full px-2 py-1 text-[14px] text-[#0b0f16] border border-[#136d6d] rounded focus:outline-none focus:ring-2 focus:ring-[#136d6d] bg-white"
                                  />
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        if (channel.channel_type === "amazon") {
                                          navigate(
                                            `/accounts/${accountId}/campaigns`
                                          );
                                        } else if (
                                          channel.channel_type === "google"
                                        ) {
                                          navigate(
                                            `/accounts/${accountId}/google-campaigns`
                                          );
                                        }
                                      }}
                                      className="text-[14px] text-[#0b0f16] leading-[normal] hover:text-[#136d6d] hover:underline cursor-pointer text-left"
                                    >
                                      {channel.channel_name}
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditChannelName(
                                          channel,
                                          "channel_name"
                                        );
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                                      title="Edit channel name"
                                    >
                                      <svg
                                        className="w-4 h-4 text-[#556179]"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="py-4 px-5">
                                <span className="text-[14px] text-[#0b0f16] leading-[normal]">
                                  {formatChannelType(channel.channel_type)}
                                </span>
                              </td>
                              <td className="py-4 px-5">
                                <span className="text-[14px] text-[#0b0f16] leading-[normal] whitespace-nowrap">
                                  {formatDate(channel.created_at)}
                                </span>
                              </td>
                              <td className="py-4 px-5">
                                <span className="text-[14px] text-[#0b0f16] leading-[normal]">
                                  {profileCounts[channel.id]
                                    ? `${profileCounts[channel.id].selected}/${
                                        profileCounts[channel.id].total
                                      }`
                                    : "—"}
                                </span>
                              </td>
                              <td className="py-4 px-5 relative">
                                <div className="flex items-center gap-3">
                                  <Button
                                    size="sm"
                                    className="bg-[#136d6d] text-[#fbfafc] hover:bg-[#0e5a5a] px-2 py-1.5 h-[36px] rounded-lg flex items-center gap-2 justify-center"
                                    onClick={() => {
                                      if (channel.channel_type === "google") {
                                        navigate(
                                          `/channels/${channel.id}/select-google-accounts`
                                        );
                                      } else {
                                        navigate(
                                          `/channels/${channel.id}/list-profiles`
                                        );
                                      }
                                    }}
                                  >
                                    <span className="text-[14px] font-medium">
                                      Profiles
                                    </span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      // TODO: Implement delete functionality
                                      if (
                                        window.confirm(
                                          `Are you sure you want to delete channel "${channel.channel_name}"?`
                                        )
                                      ) {
                                        // Delete functionality will be implemented
                                        alert(
                                          "Delete functionality coming soon"
                                        );
                                      }
                                    }}
                                    className="px-2 py-1.5 h-[36px] rounded-lg flex items-center justify-center"
                                  >
                                    <span className="text-[14px] font-medium">
                                      Delete
                                    </span>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
