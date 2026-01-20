import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import { useAccounts } from "../contexts/AccountsContext";
import { useSidebar } from "../contexts/SidebarContext";
import { accountsService, type Account } from "../services/accounts";
import {
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
} from "../hooks/mutations/useAccountMutations";
import { Sidebar } from "../components/layout/Sidebar";
import { AccountsHeader } from "../components/layout/AccountsHeader";
import { Button, Card, DeleteConfirmationModal, Menu } from "../components/ui";
import AmazonIcon from "../assets/images/ri_amazon-fill.svg";
import GoogleIcon from "../assets/images/ri_google-fill.svg";
// import WalmartIcon from "../assets/images/cbi_walmart.svg";
// import InstacartIcon from "../assets/images/cib_instacart.svg";
// import CriteoIcon from "../assets/images/criteo.svg"; // Add when Criteo icon is available

export const Accounts: React.FC = () => {
  const { accounts, loading: accountsLoading } = useAccounts();
  const { sidebarWidth } = useSidebar();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [deletingAccountId, setDeletingAccountId] = useState<number | null>(
    null
  );
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<{
    accountId: number;
    provider: "amazon" | "google" | "tiktok";
  } | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: "account";
    id: number;
    name: string;
  } | null>(null);
  const [editingAccount, setEditingAccount] = useState<{
    accountId: number;
    field: "name";
  } | null>(null);
  const [editedAccountName, setEditedAccountName] = useState<string>("");

  // React Query mutation hooks
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();
  const deleteAccountMutation = useDeleteAccount();

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Set page title
  useEffect(() => {
    setPageTitle("Accounts");
    return () => {
      resetPageTitle();
    };
  }, []);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setLoading(accountsLoading);
  }, [accountsLoading]);

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) {
      alert("Please enter an account name");
      return;
    }

    try {
      await createAccountMutation.mutateAsync({
        name: newAccountName.trim(),
      });
      setNewAccountName("");
      setShowCreateAccount(false);
      // React Query automatically invalidates and refetches accounts list
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to create account");
    }
  };

  // Scroll to create account form when it's shown
  const createAccountFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showCreateAccount && createAccountFormRef.current) {
      // Small delay to ensure the form is rendered
      setTimeout(() => {
        createAccountFormRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [showCreateAccount]);

  const handleDeleteAccount = async (id: number) => {
    const account = accounts.find((acc) => acc.id === id);
    if (!account) return;

    setDeleteModal({
      isOpen: true,
      type: "account",
      id,
      name: account.name,
    });
  };

  const confirmDeleteAccount = async () => {
    if (!deleteModal || deleteModal.type !== "account") return;

    const id = deleteModal.id;
    setDeleteModal(null);
    setDeletingAccountId(id);

    try {
      await deleteAccountMutation.mutateAsync(id);
      // React Query automatically invalidates and refetches accounts list
    } catch (error: any) {
      console.error("Failed to delete account:", error);
      alert(error.response?.data?.error || "Failed to delete account");
    } finally {
      setDeletingAccountId(null);
    }
  };

  const handleConnectAmazon = async (accountId: number) => {
    setOauthError(null);
    setOauthLoading({ accountId, provider: "amazon" });

    try {
      const { auth_url } = await accountsService.initiateAmazonOAuth(accountId);
      window.location.href = auth_url;
    } catch (err: any) {
      setOauthError(
        err.response?.data?.error || "Failed to initiate Amazon OAuth"
      );
      setOauthLoading(null);
    }
  };

  const handleConnectGoogle = async (accountId: number) => {
    setOauthError(null);
    setOauthLoading({ accountId, provider: "google" });

    try {
      const { auth_url } = await accountsService.initiateGoogleOAuth(accountId);
      window.location.href = auth_url;
    } catch (err: any) {
      setOauthError(
        err.response?.data?.error || "Failed to initiate Google OAuth"
      );
      setOauthLoading(null);
    }
  };

  const handleConnectTikTok = async (accountId: number) => {
    setOauthError(null);
    setOauthLoading({ accountId, provider: "tiktok" });

    try {
      const { auth_url } = await accountsService.initiateTikTokOAuth(accountId);
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

  const formatUsers = (
    users?: Array<{ id: number; name: string; email: string }>
  ) => {
    if (!users || users.length === 0) return "—";
    return users.map((u) => u.name || u.email).join(", ");
  };

  const startEditAccountName = (account: Account) => {
    setEditingAccount({ accountId: account.id, field: "name" });
    setEditedAccountName(account.name || "");
  };

  const cancelEditAccountName = () => {
    setEditingAccount(null);
    setEditedAccountName("");
  };

  const confirmEditAccountName = async (newName: string) => {
    if (!editingAccount || !newName.trim()) {
      cancelEditAccountName();
      return;
    }

    const account = accounts.find((a) => a.id === editingAccount.accountId);
    if (!account || newName.trim() === account.name) {
      cancelEditAccountName();
      return;
    }

    try {
      await updateAccountMutation.mutateAsync({
        id: editingAccount.accountId,
        data: {
          name: newName.trim(),
        },
      });
      cancelEditAccountName();
      // React Query automatically invalidates and refetches accounts list
    } catch (error: any) {
      console.error("Failed to update account:", error);
      alert(error.response?.data?.error || "Failed to update account name");
    }
  };

  // Filter accounts based on search query
  const filteredAccounts = accounts.filter((account) =>
    (account.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Menu icons
  const ViewChannelsIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    </svg>
  );

  const AssignUserIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M16 7c0-2.21-1.79-4-4-4S8 4.79 8 7s1.79 4 4 4 4-1.79 4-4zm-4 6c-3.31 0-6 2.69-6 6v2h12v-2c0-3.31-2.69-6-6-6z" />
    </svg>
  );

  const DeleteIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        className="flex-1 w-full"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {/* Header without account selector/date range */}
        <AccountsHeader />

        {/* Main Content Area */}
        <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white">
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
            {/* Header with Create Button and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-[22px] sm:text-[24px] font-medium text-[#072929] leading-[normal]">
                Accounts
              </h1>
              <div className="flex items-center gap-2">
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
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearching(true);
                      // Clear previous timeout
                      if (searchTimeoutRef.current) {
                        clearTimeout(searchTimeoutRef.current);
                      }
                      // Clear searching state after a short delay (debounce effect)
                      searchTimeoutRef.current = setTimeout(() => {
                        setSearching(false);
                        searchTimeoutRef.current = null;
                      }, 300);
                    }}
                    placeholder="Search..."
                    className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#556179] placeholder:text-[#556179]"
                  />
                  {searching && (
                    <svg
                      className="animate-spin h-4 w-4 text-[#556179]"
                      xmlns="http://www.w3.org/2000/svg"
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                </div>
                <button
                  onClick={() => setShowCreateAccount(!showCreateAccount)}
                  className="create-entity-button"
                >
                  Create Account
                </button>
              </div>
            </div>

            {/* Create Account Form */}
            {showCreateAccount && (
              <div ref={createAccountFormRef}>
                <Card>
                  <div className="p-4">
                    <div className="flex gap-[12px]">
                      <input
                        type="text"
                        value={newAccountName}
                        onChange={(e) => setNewAccountName(e.target.value)}
                        placeholder="Account name"
                        className="campaign-input w-full"
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleCreateAccount()
                        }
                      />
                      <button
                        onClick={() => {
                          setNewAccountName("");
                          setShowCreateAccount(false);
                        }}
                        className="cancel-button"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateAccount}
                        disabled={createAccountMutation.isPending}
                        className="create-entity-button"
                      >
                        {createAccountMutation.isPending ? (
                          <>
                            <svg
                              className="animate-spin h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
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
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Creating...
                          </>
                        ) : (
                          <span className="">Create</span>
                        )}
                      </button>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Table */}
            <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-x-auto overflow-y-visible relative">
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header">Account Name</th>
                      <th className="table-header">Users</th>
                      <th className="table-header">Created</th>
                      <th className="table-header">Created By</th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading || accountsLoading ? (
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
                    ) : filteredAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="table-cell text-center py-8">
                          <p className="text-[14px] text-[#556179] mb-4">
                            {searchQuery
                              ? "No accounts found"
                              : "No accounts yet"}
                          </p>
                          {!searchQuery && (
                            <div className="flex justify-center">
                              <Button
                                onClick={() => setShowCreateAccount(true)}
                                className="rounded-lg"
                              >
                                Create Your First Account
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredAccounts.map((account) => {
                        const isDeleting = deletingAccountId === account.id;
                        const isConnecting =
                          oauthLoading?.accountId === account.id;

                        return (
                          <tr
                            key={account.id}
                            className={`table-row group ${
                              isDeleting ? "opacity-50" : ""
                            }`}
                          >
                            <td className="table-cell">
                              {editingAccount?.accountId === account.id ? (
                                <input
                                  type="text"
                                  value={editedAccountName}
                                  onChange={(e) =>
                                    setEditedAccountName(e.target.value)
                                  }
                                  onBlur={(e) => {
                                    const inputValue = e.target.value.trim();
                                    if (
                                      inputValue === account.name ||
                                      inputValue === ""
                                    ) {
                                      cancelEditAccountName();
                                    } else {
                                      confirmEditAccountName(inputValue);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.currentTarget.blur();
                                    } else if (e.key === "Escape") {
                                      cancelEditAccountName();
                                    }
                                  }}
                                  autoFocus
                                  disabled={updateAccountMutation.isPending}
                                  className="w-full px-2 py-1 text-[14px] text-[#0b0f16] border border-[#136d6d] rounded focus:outline-none focus:ring-2 focus:ring-[#136d6d] bg-white"
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      navigate(
                                        `/accounts/${account.id}/channels`
                                      );
                                    }}
                                    className="table-edit-link"
                                  >
                                    {account.name}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditAccountName(account);
                                    }}
                                    className="table-edit-icon"
                                    title="Edit account name"
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
                                {formatUsers(account.users)}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="table-text whitespace-nowrap">
                                {formatDate(account.created_at)}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="table-text">
                                {account.created_by_name || "—"}
                              </span>
                            </td>
                            <td className="table-cell">
                              <div className="flex items-center gap-2 justify-end md:justify-start">
                                <div className="relative z-20">
                                  <Menu
                                    trigger={
                                      <Button
                                        size="sm"
                                        disabled={isConnecting || isDeleting}
                                        className="bg-[#136d6d] text-[#fbfafc] hover:bg-[#0e5a5a] hover:!text-white px-2 py-1.5 h-[36px] rounded-lg flex items-center gap-2 w-[100px] justify-center"
                                      >
                                        <span className="text-[14px] font-medium">
                                          {isConnecting
                                            ? "Connecting..."
                                            : "Connect"}
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
                                        onClick: () =>
                                          handleConnectAmazon(account.id),
                                        disabled: isConnecting || isDeleting,
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
                                        onClick: () =>
                                          handleConnectGoogle(account.id),
                                        disabled: isConnecting || isDeleting,
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
                                        onClick: () =>
                                          handleConnectTikTok(account.id),
                                        disabled: isConnecting || isDeleting,
                                      },
                                      // Hide these for now - uncomment when ready to implement
                                      // {
                                      //   label: "Walmart",
                                      //   icon: (
                                      //     <img
                                      //       src={WalmartIcon}
                                      //       alt="Walmart"
                                      //       className="w-5 h-5"
                                      //     />
                                      //   ),
                                      //   onClick: () => {
                                      //     // TODO: Implement Walmart OAuth
                                      //     alert("Walmart integration coming soon");
                                      //   },
                                      //   disabled: isConnecting || isDeleting,
                                      // },
                                      // {
                                      //   label: "Instacart",
                                      //   icon: (
                                      //     <img
                                      //       src={InstacartIcon}
                                      //       alt="Instacart"
                                      //       className="w-5 h-5"
                                      //     />
                                      //   ),
                                      //   onClick: () => {
                                      //     // TODO: Implement Instacart OAuth
                                      //     alert("Instacart integration coming soon");
                                      //   },
                                      //   disabled: isConnecting || isDeleting,
                                      // },
                                      // {
                                      //   label: "Criteo",
                                      //   icon: (
                                      //     <img
                                      //       src={CriteoIcon}
                                      //       alt="Criteo"
                                      //       className="w-5 h-5"
                                      //     />
                                      //   ),
                                      //   onClick: () => {
                                      //     // TODO: Implement Criteo OAuth
                                      //     alert("Criteo integration coming soon");
                                      //   },
                                      //   disabled: isConnecting || isDeleting,
                                      // },
                                    ]}
                                    align="left"
                                  />
                                </div>
                                <div className="relative z-30">
                                  <Menu
                                    items={[
                                      {
                                        label: "View Channels",
                                        icon: <ViewChannelsIcon />,
                                        onClick: () => {
                                          navigate(
                                            `/accounts/${account.id}/channels`
                                          );
                                        },
                                      },
                                      {
                                        label: "Assign User",
                                        icon: <AssignUserIcon />,
                                        onClick: () => {
                                          // TODO: Implement assign user functionality
                                          alert(
                                            "Assign User functionality coming soon"
                                          );
                                        },
                                      },
                                      {
                                        label: "Delete",
                                        icon: <DeleteIcon />,
                                        onClick: () =>
                                          handleDeleteAccount(account.id),
                                      },
                                    ]}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {/* Loading overlay for refreshing after creation */}
              {(createAccountMutation.isPending ||
                updateAccountMutation.isPending ||
                deleteAccountMutation.isPending ||
                (accountsLoading && accounts.length > 0)) && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center rounded-[12px] z-10">
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="animate-spin h-8 w-8 text-[#136d6d]"
                      xmlns="http://www.w3.org/2000/svg"
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <p className="text-[14px] text-[#556179]">
                      {createAccountMutation.isPending
                        ? "Creating account..."
                        : updateAccountMutation.isPending
                        ? "Updating account..."
                        : deleteAccountMutation.isPending
                        ? "Deleting account..."
                        : "Refreshing accounts..."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal(null)}
          onConfirm={confirmDeleteAccount}
          title="Delete Account"
          itemName={deleteModal.name}
          itemType="account"
          isLoading={deletingAccountId === deleteModal.id}
        />
      )}
    </div>
  );
};
