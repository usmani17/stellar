import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { accountsService } from "../services/accounts";
import type { Channel } from "../services/accounts";
import { useAccounts } from "../contexts/AccountsContext";
import { useChannelsHelpers } from "../contexts/GlobalStateContext";
import { useChannels } from "../hooks/queries/useChannels";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { Button, Menu, DeleteConfirmationModal } from "../components/ui";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import AmazonIcon from "../assets/images/amazon-fill.svg";
import GoogleIcon from "../assets/images/ri_google-fill.svg";
import { Banner } from "../components/ui/Banner";

export const Channels: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { accounts } = useAccounts();
  const { refreshChannels } = useChannelsHelpers();
  const { sidebarWidth } = useSidebar();
  const [account, setAccount] = useState<{ id: number; name: string } | null>(
    null
  );
  const [profileCounts, setProfileCounts] = useState<
    Record<number, { selected: number; total: number }>
  >({});
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
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    channelId: number;
    channelName: string;
  } | null>(null);
  const [deletingChannelId, setDeletingChannelId] = useState<number | null>(
    null
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get account ID number
  const accountIdNum = accountId ? parseInt(accountId, 10) : undefined;

  // Use React Query hook for channels
  const { data: channels = [], isLoading: loading } = useChannels(accountIdNum);

  // Set page title
  useEffect(() => {
    setPageTitle("Integrations");
    return () => {
      resetPageTitle();
    };
  }, []);

  // Check for profiles saved success message on mount
  useEffect(() => {
    const profilesSuccess = localStorage.getItem('profiles_saved_success');
    if (profilesSuccess) {
      try {
        const data = JSON.parse(profilesSuccess);
        // Use the message from backend which includes sync information
        setSuccessMessage(data.message || 'Profiles saved successfully');
        localStorage.removeItem('profiles_saved_success');
        // Auto-dismiss after 8 seconds to give users time to read the sync message
        setTimeout(() => {
          setSuccessMessage(null);
        }, 8000);
      } catch (e) {
        console.error('Failed to parse success message:', e);
        localStorage.removeItem('profiles_saved_success');
      }
    }
  }, []);

  // Set brand  name when accountId or brands change
  useEffect(() => {
    if (!accountIdNum) {
      navigate("/brands");
      return;
    }

    // Set brand name from context
    const foundAccount = accounts.find((acc) => acc.id === accountIdNum);
    if (foundAccount) {
      setAccount({ id: foundAccount.id, name: foundAccount.name });
    } else {
      // Last resort: set with just the ID
      setAccount({ id: accountIdNum, name: `Account ${accountIdNum}` });
    }
  }, [accountIdNum, accounts, navigate]);

  // Update profile counts when channels change
  useEffect(() => {
    if (channels.length > 0) {
      const counts: Record<number, { selected: number; total: number }> = {};
      channels.forEach((channel) => {
        if (channel.profile_counts) {
          counts[channel.id] = channel.profile_counts;
        } else {
          counts[channel.id] = { selected: 0, total: 0 };
        }
      });
      setProfileCounts(counts);

      // Update brand name from channel if not found in brands context
      if (!account && channels.length > 0 && channels[0].account_name) {
        setAccount({ id: accountIdNum!, name: channels[0].account_name });
      }
    }
  }, [channels, account, accountIdNum]);

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
    if (!editingChannel || !newName.trim() || !accountIdNum) {
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
      await accountsService.updateChannel(
        accountIdNum,
        editingChannel.channelId,
        {
          channel_name: newName.trim(),
        }
      );
      // Refresh channels from global context after update
      await refreshChannels(accountIdNum);
      cancelEditChannelName();
    } catch (error: any) {
      console.error("Failed to update channel:", error);
      alert(error.response?.data?.error || "Failed to update channel name");
    } finally {
      setUpdatingChannel(false);
    }
  };

  const handleDeleteChannel = (channel: Channel) => {
    setDeleteModal({
      isOpen: true,
      channelId: channel.id,
      channelName: channel.channel_name || "Unknown Channel",
    });
  };

  const confirmDeleteChannel = async () => {
    if (!deleteModal || !accountIdNum) {
      setDeleteModal(null);
      return;
    }

    setDeletingChannelId(deleteModal.channelId);
    try {
      await accountsService.deleteChannel(accountIdNum, deleteModal.channelId);
      // Refresh channels from global context after deletion
      await refreshChannels(accountIdNum);
      setDeleteModal(null);
    } catch (error: any) {
      console.error("Failed to delete channel:", error);
      alert(error.response?.data?.error || "Failed to delete channel");
    } finally {
      setDeletingChannelId(null);
    }
  };

  // Filter channels based on search query
  const filteredChannels = channels.filter((channel) =>
    (channel.channel_name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
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
          {successMessage && (
            <Banner
              type="success"
              message={successMessage}
              dismissable={true}
              onDismiss={() => setSuccessMessage(null)}
              className="mb-6"
            />
          )}
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
            {/* Header with Connect Button and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-[22px] sm:text-[24px] font-medium text-[#072929] leading-[normal]">
                Integrations
              </h1>
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="search-input-container h-[40px] w-full md:w-[272px] flex items-center gap-2 px-[10px]">
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
                      disabled={isConnecting}
                      className="create-entity-button"
                    >
                      <span>{isConnecting ? "Connecting..." : "Connect"}</span>
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
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header">Channel Name</th>
                      <th className="table-header">Type</th>
                      <th className="table-header">Channel Created</th>
                      <th className="table-header">Connected Profiles Count</th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      // Loading skeleton rows
                      Array.from({ length: 3 }).map((_, index) => (
                        <tr key={`skeleton-${index}`} className="table-row">
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-32"></div>
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-24"></div>
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-20"></div>
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-24"></div>
                          </td>
                          <td className="table-cell">
                            <div className="h-9 bg-gray-200 rounded animate-pulse w-24"></div>
                          </td>
                        </tr>
                      ))
                    ) : filteredChannels.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="table-cell text-center py-8">
                          <p className="text-[14px] text-[#556179] mb-4">
                            {searchQuery
                              ? "No integrations found"
                              : "No integrations yet"}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredChannels.map((channel) => {
                        return (
                          <tr key={channel.id} className="table-row group">
                            <td className="table-cell group">
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
                                      className="w-5 h-5 flex-shrink-0"
                                    />
                                  )}
                                  {channel.channel_type === "tiktok" && (
                                    <svg
                                      className="w-5 h-5 flex-shrink-0"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                    </svg>
                                  )}
                                  <button
                                    onClick={() => {
                                      if (channel.channel_type === "amazon") {
                                        navigate(
                                          `/brands/${accountId}/campaigns`
                                        );
                                      } else if (
                                        channel.channel_type === "google"
                                      ) {
                                        navigate(
                                          `/brands/${accountId}/${channel.id}/google/campaigns`
                                        );
                                      } else if (
                                        channel.channel_type === "tiktok"
                                      ) {
                                        navigate(
                                          `/brands/${accountId}/tiktok/campaigns`
                                        );
                                      }
                                    }}
                                    className="table-edit-link"
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
                                    className="table-edit-icon"
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
                            <td className="table-cell">
                              <span className="table-text">
                                {formatChannelType(channel.channel_type)}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="table-text whitespace-nowrap">
                                {formatDate(channel.created_at)}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="table-text">
                                {profileCounts[channel.id]
                                  ? profileCounts[channel.id].selected
                                  : "—"}
                              </span>
                            </td>
                            <td className="table-cell relative">
                              <div className="flex items-center gap-3">
                                <Button
                                  size="sm"
                                  className="connect-button"
                                  onClick={async () => {
                                    if (channel.channel_type === "google") {
                                      // Navigate directly to selection page (loads from database)
                                      navigate(
                                        `/channels/${channel.id}/select-google-accounts`,
                                        { state: { accountId } }
                                      );
                                    } else if (
                                      channel.channel_type === "tiktok"
                                    ) {
                                      navigate(
                                        `/channels/${channel.id}/select-tiktok-profiles`
                                      );
                                    } else {
                                      navigate(
                                        `/channels/${channel.id}/list-profiles`
                                      );
                                    }
                                  }}
                                >
                                  <span>
                                    Select Profiles
                                  </span>
                                </Button>
                                <button
                                  onClick={() => handleDeleteChannel(channel)}
                                  disabled={deletingChannelId === channel.id}
                                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={deletingChannelId === channel.id ? "Deleting..." : "Delete channel"}
                                >
                                  {deletingChannelId === channel.id ? (
                                    <svg
                                      className="w-5 h-5 text-gray-400 animate-spin"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      />
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      />
                                    </svg>
                                  ) : (
                                    <svg
                                      className="w-5 h-5 text-gray-600 hover:text-red-600 transition-colors"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal(null)}
          onConfirm={confirmDeleteChannel}
          title="Delete Channel"
          itemName={deleteModal.channelName}
          itemType="channel"
          isLoading={deletingChannelId === deleteModal.channelId}
        />
      )}
    </div>
  );
};
