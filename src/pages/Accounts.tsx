import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAccounts } from "../contexts/AccountsContext";
import { accountsService } from "../services/accounts";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { Button, Card, DeleteConfirmationModal, Menu } from "../components/ui";
import AmazonIcon from "../assets/images/ri_amazon-fill.svg";
import GoogleIcon from "../assets/images/ri_google-fill.svg";
// import WalmartIcon from "../assets/images/cbi_walmart.svg";
// import InstacartIcon from "../assets/images/cib_instacart.svg";
// import CriteoIcon from "../assets/images/criteo.svg"; // Add when Criteo icon is available

export const Accounts: React.FC = () => {
  const { accounts, loading: accountsLoading, refreshAccounts } = useAccounts();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [deletingAccountId, setDeletingAccountId] = useState<number | null>(
    null
  );
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<{
    accountId: number;
    provider: "amazon" | "google";
  } | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: "account";
    id: number;
    name: string;
  } | null>(null);

  // Refresh accounts when navigating to this page (e.g., after OAuth flow)
  const hasRefreshedRef = useRef<string>("");
  useEffect(() => {
    if (location.pathname === "/accounts") {
      const currentKey = `${location.pathname}-${location.search}`;
      if (hasRefreshedRef.current !== currentKey) {
        hasRefreshedRef.current = currentKey;
        refreshAccounts();
      }
    }
  }, [location.pathname, location.search, refreshAccounts]);

  useEffect(() => {
    setLoading(accountsLoading);
  }, [accountsLoading]);

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) {
      alert("Please enter an account name");
      return;
    }

    try {
      await accountsService.createAccount({ name: newAccountName.trim() });
      setNewAccountName("");
      setShowCreateAccount(false);
      await refreshAccounts();
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to create account");
    }
  };

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
      await accountsService.deleteAccount(id);
      await refreshAccounts();
    } catch (error) {
      console.error("Failed to delete account:", error);
      alert("Failed to delete account");
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
      <div className="flex-1 ml-[272px]">
        {/* Header */}
        <DashboardHeader />

        {/* Main Content Area */}
        <div className="p-8 bg-white">
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
            {/* Header with Create Button */}
            <div className="flex items-center justify-between">
              <h1 className="text-[24px] font-medium text-[#072929] leading-[normal]">
                Accounts
              </h1>
              <Button
                onClick={() => setShowCreateAccount(!showCreateAccount)}
                size="sm"
                className="bg-[#136d6d] text-[#fbfafc] hover:bg-[#0e5a5a] px-2 py-1.5 h-[36px] rounded-lg flex items-center gap-2 justify-center"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                Create Account
              </Button>
            </div>

            {/* Create Account Form */}
            {showCreateAccount && (
              <Card>
                <div className="p-4">
                  <div className="flex gap-[12px]">
                    <input
                      type="text"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="Account name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-[14px] focus-visible:outline-none focus:ring-1 focus:ring-[#136D6D] focus:border-[#136D6D]"
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleCreateAccount()
                      }
                    />
                    <Button
                      onClick={() => {
                        setNewAccountName("");
                        setShowCreateAccount(false);
                      }}
                      size="sm"
                      className="bg-[#f9f9f6] border border-[#072929] h-[36px] px-2 py-1.5 rounded-[8px] flex items-center justify-center"
                    >
                      <span className="text-[14px] font-semibold text-[#072929] ">
                        Cancel
                      </span>
                    </Button>
                    <Button
                      onClick={handleCreateAccount}
                      size="sm"
                      className="bg-[#136d6d] text-[#fbfafc] hover:bg-[#0e5a5a] px-2 py-1.5 h-[36px] rounded-lg flex items-center gap-2 justify-center"
                    >
                      <span className="text-[14px] font-medium">Create</span>
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Accounts Table Card */}
            <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-6 flex flex-col gap-6">
              {/* Header with Search */}
              <div className="flex items-center justify-between">
                <h2 className="text-[24px] font-medium text-[#072929] leading-[normal]">
                  All Accounts
                </h2>
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
              </div>

              {/* Table */}
              <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-x-auto overflow-y-visible relative">
                {loading || accountsLoading ? (
                  <div className="text-center py-8 text-[#556179] text-[14px]">
                    Loading accounts...
                  </div>
                ) : filteredAccounts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[14px] text-[#556179] mb-4">
                      {searchQuery ? "No accounts found" : "No accounts yet"}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => setShowCreateAccount(true)}>
                        Create Your First Account
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto relative">
                    <table className="w-full relative">
                      <thead>
                        <tr className="border-b border-[#e8e8e3]">
                          <th className="text-left py-3 px-5 text-[14px] font-medium text-[#29303f] leading-[20px]">
                            Account Name
                          </th>
                          <th className="text-left py-3 px-5 text-[14px] font-medium text-[#29303f] leading-[20px]">
                            Users
                          </th>
                          <th className="text-left py-3 px-5 text-[14px] font-medium text-[#29303f] leading-[20px]">
                            Created
                          </th>
                          <th className="text-left py-3 px-5 text-[14px] font-medium text-[#29303f] leading-[20px]">
                            Created By
                          </th>
                          <th className="text-left py-3 px-5 text-[14px] font-medium text-[#29303f] leading-[20px]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAccounts.map((account, index) => {
                          const isDeleting = deletingAccountId === account.id;
                          const isConnecting =
                            oauthLoading?.accountId === account.id;
                          const isLastRow =
                            index === filteredAccounts.length - 1;

                          return (
                            <tr
                              key={account.id}
                              className={`${
                                !isLastRow ? "border-b border-[#e8e8e3]" : ""
                              } hover:bg-gray-50 transition-colors ${
                                isDeleting ? "opacity-50" : ""
                              }`}
                            >
                              <td className="py-4 px-5">
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/accounts/${account.id}/campaigns`
                                    )
                                  }
                                  className="text-[14px] text-[#0b0f16] leading-[normal] hover:text-[#136d6d] hover:underline cursor-pointer text-left"
                                >
                                  {account.name}
                                </button>
                              </td>
                              <td className="py-4 px-5">
                                <span className="text-[14px] text-[#0b0f16] leading-[normal]">
                                  {formatUsers(account.users)}
                                </span>
                              </td>
                              <td className="py-4 px-5">
                                <span className="text-[14px] text-[#0b0f16] leading-[normal] whitespace-nowrap">
                                  {formatDate(account.created_at)}
                                </span>
                              </td>
                              <td className="py-4 px-5">
                                <span className="text-[14px] text-[#0b0f16] leading-[normal]">
                                  {account.created_by_name || "—"}
                                </span>
                              </td>
                              <td className="py-4 px-5 relative">
                                <div className="flex items-center gap-3">
                                  <Menu
                                    trigger={
                                      <Button
                                        size="sm"
                                        disabled={isConnecting || isDeleting}
                                        className="bg-[#136d6d] text-[#fbfafc] hover:bg-[#0e5a5a] px-2 py-1.5 h-[36px] rounded-lg flex items-center gap-2 w-[100px] justify-center"
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
