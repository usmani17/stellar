import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import { useAuth } from "../contexts/AuthContext";
import { useSidebar } from "../contexts/SidebarContext";
import { accountsService, type Account } from "../services/accounts";
import {
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
} from "../hooks/mutations/useAccountMutations";
import { useAccountsPaginated } from "../hooks/queries/useAccountsPaginated";
import { queryKeys } from "../hooks/queries/queryKeys";
import { Sidebar } from "../components/layout/Sidebar";
import { AccountsHeader } from "../components/layout/AccountsHeader";
import { Button, Card, DeleteConfirmationModal, Loader, BaseModal } from "../components/ui";
import { Banner } from "../components/ui/Banner";
import { GOOGLE_ONLY_UI } from "../constants/featureFlags";
import AmazonIcon from "../assets/images/amazon-fill.svg";
import GoogleIcon from "../assets/images/ri_google-fill.svg";
import { X } from "lucide-react";
// import WalmartIcon from "../assets/images/cbi_walmart.svg";
// import InstacartIcon from "../assets/images/cib_instacart.svg";
// import CriteoIcon from "../assets/images/criteo.svg"; // Add when Criteo icon is available

const BRANDS_PAGE_SIZE = 10;
/** Large page fetch when searching so client-side filter + pagination match result count */
const BRANDS_SEARCH_FETCH_SIZE = 5000;

export const Accounts: React.FC = () => {
  const { user } = useAuth();
  const isTeam = user?.role === "team";
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const normalizedSearchQuery = searchQuery.trim();
  const isSearchActive = normalizedSearchQuery.length > 0;

  const {
    accounts,
    totalPages,
    isLoading: accountsLoading,
    isFetching,
  } = useAccountsPaginated(currentPage, BRANDS_PAGE_SIZE, {
    enabled: !isSearchActive,
  });

  const searchAccountsQuery = useQuery({
    queryKey: queryKeys.accounts.listPaginated(1, BRANDS_SEARCH_FETCH_SIZE),
    queryFn: () =>
      accountsService.getAccountsPaginated({
        page: 1,
        page_size: BRANDS_SEARCH_FETCH_SIZE,
      }),
    enabled: isSearchActive,
    staleTime: 60_000,
  });

  const baseAccounts: Account[] = isSearchActive
    ? (searchAccountsQuery.data?.results ?? [])
    : accounts;

  const filteredAccounts = isSearchActive
    ? baseAccounts.filter((account) =>
        (account.name || "")
          .toLowerCase()
          .includes(normalizedSearchQuery.toLowerCase())
      )
    : baseAccounts;

  const effectiveTotalPages = isSearchActive
    ? Math.max(1, Math.ceil(filteredAccounts.length / BRANDS_PAGE_SIZE))
    : totalPages;

  const displayAccounts = isSearchActive
    ? filteredAccounts.slice(
        (currentPage - 1) * BRANDS_PAGE_SIZE,
        currentPage * BRANDS_PAGE_SIZE
      )
    : filteredAccounts;

  const tableLoading =
    accountsLoading || (isSearchActive && searchAccountsQuery.isLoading);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.max(1, Math.min(newPage, effectiveTotalPages)));
  };

  const prevSearchQueryRef = useRef(searchQuery);
  useEffect(() => {
    const prev = prevSearchQueryRef.current;
    prevSearchQueryRef.current = searchQuery;
    if (prev !== searchQuery) {
      setCurrentPage(1);
    } else {
      setCurrentPage((p) => Math.min(p, effectiveTotalPages));
    }
  }, [searchQuery, effectiveTotalPages]);

  const { sidebarWidth } = useSidebar();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [deletingAccountId, setDeletingAccountId] = useState<number | null>(
    null
  );
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<{
    accountId: number;
    provider: "amazon" | "google" | "tiktok" | "meta";
  } | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [kbModal, setKbModal] = useState<{
    brandId: number;
    brandName: string;
    kb: string;
    loading: boolean;
    saving: boolean;
  } | null>(null);

  const queryClient = useQueryClient();
  const { data: brandKbList = [] } = useQuery({
    queryKey: queryKeys.accounts.brandKbList(),
    queryFn: () => accountsService.getBrandKbList(),
    enabled: !isTeam,
  });
  const brandKbByBrandId = React.useMemo(() => {
    const map: Record<number, string> = {};
    brandKbList.forEach((item) => {
      if (item.integration_id == null) map[item.brand_id] = item.kb;
    });
    return map;
  }, [brandKbList]);

  const setBrandKbMutation = useMutation({
    mutationFn: ({ brandId, kb }: { brandId: number; kb: string }) =>
      accountsService.setBrandKb(brandId, { kb }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.brandKbList() });
      setKbModal(null);
    },
  });

  useEffect(() => {
    if (!kbModal?.brandId || !kbModal.loading) return;
    let cancelled = false;
    accountsService
      .getBrandKb(kbModal.brandId)
      .then((res) => {
        if (!cancelled && kbModal)
          setKbModal((prev) => (prev ? { ...prev, kb: res.kb ?? "", loading: false } : null));
      })
      .catch(() => {
        if (!cancelled)
          setKbModal((prev) => (prev ? { ...prev, kb: "", loading: false } : null));
      });
    return () => {
      cancelled = true;
    };
  }, [kbModal?.brandId, kbModal?.loading]);

  const openKbModal = (account: Account) => {
    setKbModal({
      brandId: account.id,
      brandName: account.name,
      kb: "",
      loading: true,
      saving: false,
    });
  };

  const closeKbModal = () => {
    if (!kbModal?.saving && !setBrandKbMutation.isPending) setKbModal(null);
  };

  const handleSaveKb = () => {
    if (!kbModal?.brandId) return;
    setKbModal((prev) => (prev ? { ...prev, saving: true } : null));
    setBrandKbMutation.mutate(
      { brandId: kbModal.brandId, kb: kbModal.kb },
      {
        onSettled: () => {
          setKbModal((prev) => (prev ? { ...prev, saving: false } : null));
        },
      },
    );
  };

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
    setLoading(tableLoading);
  }, [tableLoading]);

  // Check for success messages on mount (channel created or profiles saved)
  useEffect(() => {
    const channelSuccess = localStorage.getItem('channel_created_success');
    const profilesSuccess = localStorage.getItem('profiles_saved_success');

    if (channelSuccess) {
      try {
        const { message } = JSON.parse(channelSuccess);
        setSuccessMessage(message);
        localStorage.removeItem('channel_created_success');
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      } catch (e) {
        console.error('Failed to parse success message:', e);
        localStorage.removeItem('channel_created_success');
      }
    } else if (profilesSuccess) {
      try {
        const { message } = JSON.parse(profilesSuccess);
        setSuccessMessage(message);
        localStorage.removeItem('profiles_saved_success');
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      } catch (e) {
        console.error('Failed to parse success message:', e);
        localStorage.removeItem('profiles_saved_success');
      }
    }
  }, []);

  // Reset stale connect-loading state when returning to this page.
  useEffect(() => {
    const resetOauthLoading = () => {
      setOauthLoading(null);
    };

    resetOauthLoading();
    window.addEventListener("pageshow", resetOauthLoading);
    window.addEventListener("focus", resetOauthLoading);

    return () => {
      window.removeEventListener("pageshow", resetOauthLoading);
      window.removeEventListener("focus", resetOauthLoading);
    };
  }, []);

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) {
      alert("Please enter an brand name");
      return;
    }

    try {
      await createAccountMutation.mutateAsync({
        name: newAccountName.trim(),
      });
      setNewAccountName("");
      setShowCreateAccount(false);
      setSuccessMessage("Brand created successfully!");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to create brand");
    }
  };

  // Scroll to create brand form when it's shown
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
    const account = baseAccounts.find((acc: Account) => acc.id === id);
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
      setSuccessMessage("Brand deleted successfully!");
      setTimeout(() => setSuccessMessage(null), 5000);
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

  const handleConnectMeta = async (accountId: number) => {
    setOauthError(null);
    setOauthLoading({ accountId, provider: "meta" });

    try {
      const { auth_url } = await accountsService.initiateMetaOAuth(accountId);
      window.location.href = auth_url;
    } catch (err: any) {
      setOauthError(
        err.response?.data?.error || "Failed to initiate Meta OAuth"
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

    const account = baseAccounts.find((a) => a.id === editingAccount.accountId);
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
      alert(error.response?.data?.error || "Failed to update brand name");
    }
  };

  // Menu icons
  const ViewChannelsIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
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
            {/* Header with Create Button and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-[22px] sm:text-[24px] font-medium text-[#072929] leading-[normal]">
                Brands
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
                    placeholder="Search brands..."
                    className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#556179] placeholder:text-[#556179]"
                  />
                  {searchQuery.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSearching(false);
                        if (searchTimeoutRef.current) {
                          clearTimeout(searchTimeoutRef.current);
                          searchTimeoutRef.current = null;
                        }
                      }}
                      className="p-0.5 text-[#556179] hover:text-[#072929] transition-colors"
                      aria-label="Clear search"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
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
                {!isTeam && (
                  <button
                    onClick={() => setShowCreateAccount(!showCreateAccount)}
                    className="create-entity-button"
                  >
                    Create Brand
                  </button>
                )}
              </div>
            </div>

            {/* Create Brand Form */}
            {!isTeam && showCreateAccount && (
              <div ref={createAccountFormRef}>
                <Card>
                  <div className="p-4">
                    <div className="flex gap-[12px]">
                      <input
                        type="text"
                        value={newAccountName}
                        onChange={(e) => setNewAccountName(e.target.value)}
                        placeholder="Brand name"
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
                      <th className="table-header max-w-[300px]">Brand Name</th>
                      <th className="table-header">Created At</th>
                      <th className="table-header">Created By</th>
                      {!isTeam && <th className="table-header">Integrations</th>}
                      <th className="table-header">KB</th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableLoading ? (
                      // Loading skeleton rows
                        Array.from({ length: 3 }).map((_, index) => (
                          <tr key={`skeleton-${index}`} className="table-row">
                            <td className="table-cell max-w-[300px]">
                              <div className="h-5 bg-gray-200 rounded animate-pulse w-32"></div>
                            </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-20"></div>
                          </td>
                          <td className="table-cell">
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-24"></div>
                          </td>
                          {!isTeam && (
                            <td className="table-cell">
                              <div className="h-9 bg-gray-200 rounded animate-pulse w-24"></div>
                            </td>
                          )}
                          <td className="table-cell">
                            <div className="h-9 bg-gray-200 rounded animate-pulse w-20"></div>
                          </td>
                          <td className="table-cell">
                            <div className="h-9 bg-gray-200 rounded animate-pulse w-32"></div>
                          </td>
                        </tr>
                      ))
                    ) : filteredAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={isTeam ? 5 : 6} className="table-cell text-center py-8">
                          <p className="text-[14px] text-[#556179] mb-4">
                            {isSearchActive
                              ? "No brands found"
                              : "No brands yet"}
                          </p>
                          {!isSearchActive && !isTeam && (
                            <div className="flex justify-center">
                              <Button
                                onClick={() => setShowCreateAccount(true)}
                                className="rounded-lg"
                              >
                                Create your first brand
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      displayAccounts.map((account) => {
                        const isDeleting = deletingAccountId === account.id;
                        const isConnecting =
                          oauthLoading?.accountId === account.id;

                        return (
                          <tr
                            key={account.id}
                            className={`table-row group ${isDeleting ? "opacity-50" : ""
                              }`}
                          >
                            <td className="table-cell max-w-[300px]">
                              {!isTeam && editingAccount?.accountId === account.id ? (
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
                                <div className="flex items-center gap-2 min-w-0">
                                  <button
                                    onClick={() => {
                                      navigate(
                                        `/brands/${account.id}/integrations`
                                      );
                                    }}
                                    className="table-edit-link min-w-0 truncate"
                                  >
                                    {account.name}
                                  </button>
                                  {!isTeam && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditAccountName(account);
                                      }}
                                      className="table-edit-icon"
                                      title="Edit brand name"
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
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="table-cell">
                              <span className="table-text whitespace-nowrap">
                                {formatDate(account.created_at)}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="table-text">
                                {account.created_by ?? account.created_by_name ?? "—"}
                              </span>
                            </td>
                            {!isTeam && (
                              <td className="table-cell">
                                <div className="flex items-center gap-2">
                                  {!GOOGLE_ONLY_UI && (
                                  <button
                                    onClick={() => handleConnectAmazon(account.id)}
                                    disabled={isConnecting || isDeleting}
                                    className="flex items-center gap-2 px-3 py-1.5 h-[32px] rounded-lg border border-gray-200 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Connect Amazon"
                                  >
                                    <img
                                      src={AmazonIcon}
                                      alt="Amazon"
                                      className="w-4 h-4"
                                    />
                                    <span className="text-[12px] font-medium text-[#072929]">
                                      Amazon
                                    </span>
                                  </button>
                                  )}
                                  <button
                                    onClick={() => handleConnectGoogle(account.id)}
                                    disabled={isConnecting || isDeleting}
                                    className="flex items-center gap-2 px-3 py-1.5 h-[32px] rounded-lg border border-gray-200 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Connect Google"
                                  >
                                    <img
                                      src={GoogleIcon}
                                      alt="Google"
                                      className="w-4 h-4"
                                    />
                                    <span className="text-[12px] font-medium text-[#072929]">
                                      Google
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => navigate(`/brands/${account.id}/google-sheets/integrations`)}
                                    disabled={isConnecting || isDeleting}
                                    className="flex items-center gap-2 px-3 py-1.5 h-[32px] rounded-lg border border-gray-200 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Google Sheets Integrations"
                                  >
                                    <img
                                      src={GoogleIcon}
                                      alt="Google"
                                      className="w-4 h-4"
                                    />
                                    <span className="text-[12px] font-medium text-[#072929]">
                                      Sheets
                                    </span>
                                  </button>
                                  {!GOOGLE_ONLY_UI && (
                                  <button
                                    onClick={() => handleConnectTikTok(account.id)}
                                    disabled={isConnecting || isDeleting}
                                    className="flex items-center gap-2 px-3 py-1.5 h-[32px] rounded-lg border border-gray-200 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Connect TikTok"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                    </svg>
                                    <span className="text-[12px] font-medium text-[#072929]">
                                      TikTok
                                    </span>
                                  </button>
                                  )}
                                  <button
                                    onClick={() => handleConnectMeta(account.id)}
                                    disabled={isConnecting || isDeleting}
                                    className="flex items-center gap-2 px-3 py-1.5 h-[32px] rounded-lg border border-gray-200 hover:border-[#136D6D] hover:bg-[#f5f5f0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Connect Meta"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                    <span className="text-[12px] font-medium text-[#072929]">
                                      Meta
                                    </span>
                                  </button>
                                </div>
                              </td>
                            )}
                            <td className="table-cell">
                              {!isTeam && (
                                <div className="flex items-center gap-2">
                                  <span className="table-text max-w-[200px] truncate block" title={brandKbByBrandId[account.id] || ""}>
                                    {brandKbByBrandId[account.id] || "—"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => openKbModal(account)}
                                    disabled={isDeleting}
                                    className="table-edit-icon !opacity-100 pointer-events-auto cursor-pointer p-1.5 rounded hover:bg-gray-100 text-forest-f30 hover:text-forest-f60"
                                    title="Edit KB"
                                    aria-label="Edit KB"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                              {isTeam && <span className="table-text">—</span>}
                            </td>
                            <td className="table-cell">
                              <div className="flex items-center gap-2 justify-end md:justify-start">
                                {isTeam ? (
                                  // Team: only link to integrations
                                  <Button
                                    size="sm"
                                    disabled={isDeleting}
                                    onClick={() => {
                                      navigate(
                                        `/brands/${account.id}/integrations`
                                      );
                                    }}
                                    className="connect-button"
                                  >
                                    <span className="">Integrations</span>
                                  </Button>
                                ) : account.channels_count && account.channels_count > 0 ? (
                                  <>
                                    <Button
                                      size="sm"
                                      disabled={isDeleting}
                                      onClick={() => {
                                        navigate(
                                          `/brands/${account.id}/integrations`
                                        );
                                      }}
                                      className="connect-button"
                                    >
                                      <span className="">
                                        Integrations
                                      </span>
                                    </Button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteAccount(account.id)
                                      }
                                      disabled={isDeleting}
                                      className="p-2 rounded-lg text-[#556179] hover:bg-gray-100 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Delete"
                                      aria-label="Delete"
                                    >
                                      <DeleteIcon />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteAccount(account.id)
                                    }
                                    disabled={isDeleting}
                                    className="p-2 rounded-lg text-[#556179] hover:bg-gray-100 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Delete"
                                    aria-label="Delete"
                                  >
                                    <DeleteIcon />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {/* Loading overlay for refreshing after creation/update/delete */}
              {(createAccountMutation.isPending ||
                updateAccountMutation.isPending ||
                deleteAccountMutation.isPending ||
                (isFetching && accounts.length > 0 && !isSearchActive) ||
                (isSearchActive &&
                  searchAccountsQuery.isFetching &&
                  (searchAccountsQuery.data?.results?.length ?? 0) > 0)) && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center rounded-[12px] z-10">
                    <Loader size="md" message="Loading accounts..." />
                  </div>
                )}
            </div>

            {/* Pagination - outside table container, same as campaigns page */}
            {!tableLoading && filteredAccounts.length > 0 && effectiveTotalPages > 1 && (
              <div className="flex items-center justify-end mt-4">
                <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, effectiveTotalPages) }, (_, i) => {
                    let pageNum: number;
                    if (effectiveTotalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= effectiveTotalPages - 2) {
                      pageNum = effectiveTotalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    pageNum = Math.max(1, Math.min(pageNum, effectiveTotalPages));
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${currentPage === pageNum
                            ? "bg-white text-[#136D6D] font-semibold"
                            : "text-black hover:bg-gray-50"
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {effectiveTotalPages > 5 && currentPage < effectiveTotalPages - 2 && (
                    <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                      ...
                    </span>
                  )}
                  {effectiveTotalPages > 5 && currentPage < effectiveTotalPages - 2 && (
                    <button
                      onClick={() => handlePageChange(effectiveTotalPages)}
                      className="px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer text-black hover:bg-gray-50"
                    >
                      {effectiveTotalPages}
                    </button>
                  )}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === effectiveTotalPages}
                    className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
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

      <BaseModal
        isOpen={!!kbModal}
        onClose={closeKbModal}
        size="xl"
        maxWidth="max-w-2xl"
        disableBackdropClick={kbModal?.saving || kbModal?.loading || setBrandKbMutation.isPending}
      >
        <div className="space-y-4">
          <h2 className="text-[18px] font-medium text-forest-f60">
            Edit KB — {kbModal?.brandName ?? ""}
          </h2>
          {kbModal?.loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader size="md" message="Loading KB..." />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[13px] text-forest-f30 mb-1">Knowledge base</label>
                <textarea
                  value={kbModal?.kb ?? ""}
                  onChange={(e) =>
                    setKbModal((prev) => (prev ? { ...prev, kb: e.target.value } : null))
                  }
                  rows={8}
                  className="w-full rounded-md border border-sandstorm-s40 bg-sandstorm-s5 px-3 py-2 text-[14px] text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40 resize-y"
                  placeholder="Add brand knowledge base content..."
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={closeKbModal} className="cancel-button">
                  Cancel
                </button>
                <Button
                  onClick={handleSaveKb}
                  disabled={kbModal?.saving || setBrandKbMutation.isPending}
                >
                  {kbModal?.saving || setBrandKbMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </>
          )}
        </div>
      </BaseModal>
    </div>
  );
};
