import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAccounts } from "../contexts/AccountsContext";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { AccountsHeader } from "../components/layout/AccountsHeader";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import { workspaceService, type WorkspaceUser } from "../services/workspace";
import { Alert, Dropdown, Loader, Checkbox } from "../components/ui";
import { ConfirmationModal } from "../components/ui/ConfirmationModal";
import { ErrorModal } from "../components/ui/ErrorModal";
import { type Account, type Channel } from "../services/accounts";

/** Multi-select dropdown with search - campaign filter style (FILTER / VALUE with checkboxes + search). */
function MultiSelectWithSearch({
  options,
  selectedIds,
  onChange,
  label,
  placeholder,
  emptyMessage,
  searchPlaceholder = "Search...",
}: {
  options: Array<{ id: number; label: string }>;
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  label: string;
  placeholder: string;
  emptyMessage: string;
  searchPlaceholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.trim().toLowerCase()))
    : options;

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const toggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const buttonLabel =
    selectedIds.length === 0
      ? placeholder
      : selectedIds.length === 1
        ? options.find((o) => o.id === selectedIds[0])?.label ?? "1 selected"
        : `${selectedIds.length} selected`;

  return (
    <div className="w-full max-w-[280px]" ref={containerRef}>
      <label className="form-label-small text-[#556179] uppercase tracking-wide mb-1 block">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          className="w-full text-left px-3 py-2 border border-gray-200 rounded-lg bg-[#FEFEFB] text-[13px] text-[#072929] hover:border-gray-300 flex items-center justify-between gap-2"
        >
          <span className="truncate">{buttonLabel}</span>
          <svg
            className={`w-4 h-4 text-[#556179] shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 z-[100] border border-gray-200 rounded-lg bg-[#FEFEFB] shadow-lg overflow-hidden">
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full px-2 py-1.5 text-[12px] border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#136D6D] focus:border-[#136D6D]"
              />
            </div>
            <div className="max-h-[200px] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="text-[11.2px] text-[#556179] py-2">{emptyMessage}</div>
              ) : (
                filtered.map((opt) => (
                  <div
                    key={opt.id}
                    className="py-1.5 px-2 hover:bg-gray-100 rounded cursor-pointer"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (
                        target.closest('button[role="checkbox"]') ||
                        target.tagName === "LABEL" ||
                        target.closest("label")
                      )
                        return;
                      toggle(opt.id);
                    }}
                  >
                    <Checkbox
                      checked={selectedIds.includes(opt.id)}
                      onChange={(checked) => {
                        if (checked) onChange([...selectedIds, opt.id]);
                        else onChange(selectedIds.filter((x) => x !== opt.id));
                      }}
                      label={opt.label}
                      size="small"
                      className="w-full [&_label]:text-[10px]"
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ROLE_OPTIONS = [
  { value: "manager", label: "Manager" },
  { value: "team", label: "Team" },
];

const ROLE_FILTER_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "team", label: "Team" },
];

const ROLE_LABELS: Record<string, string> = {
  owner: "Admin",
  admin: "Admin",
  manager: "Manager",
  team: "Team",
};

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;

export const AccountUsers: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const { sidebarWidth } = useSidebar();
  const accountIdNum = accountId ? parseInt(accountId, 10) : undefined;
  const account = accountIdNum
    ? accounts.find((a) => a.id === accountIdNum)
    : null;

  useEffect(() => {
    setPageTitle("Users");
    return () => resetPageTitle();
  }, []);

  useEffect(() => {
    if (!accountIdNum) {
      navigate("/brands");
    }
  }, [accountIdNum, navigate]);

  useEffect(() => {
    if (user?.role === "team") {
      navigate("/brands", { replace: true });
    }
  }, [user?.role, navigate]);

  if (user?.role === "team") {
    return null;
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
        <AccountsHeader />
        <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white overflow-x-hidden min-w-0">
          <AccountUsersContent
            accountIdNum={accountIdNum ?? 0}
            account={account ?? null}
            workspaceId={user?.workspace?.id}
          />
        </div>
      </div>
    </div>
  );
};

function AccountUsersContent({
  accountIdNum,
  account,
  workspaceId,
}: {
  accountIdNum: number;
  account: { id: number; name: string; channels?: Channel[] } | null;
  workspaceId?: number;
}) {
  const { user } = useAuth();
  const { accounts } = useAccounts();

  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(PAGE_SIZE);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [createEmail, setCreateEmail] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createRole, setCreateRole] = useState<"manager" | "team">("manager");
  const [createPassword, setCreatePassword] = useState("");
  const [createPassword2, setCreatePassword2] = useState("");
  const [createAccountIds, setCreateAccountIds] = useState<number[]>([]);
  const [createChannelIds, setCreateChannelIds] = useState<number[]>([]);
  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [assignManagerId, setAssignManagerId] = useState<number | null>(null);
  const [assignTeamId, setAssignTeamId] = useState<number | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState<WorkspaceUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [userCreateSuccessMessage, setUserCreateSuccessMessage] = useState<string | null>(null);

  const [editUser, setEditUser] = useState<WorkspaceUser | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "manager" | "team">("manager");
  const [editLoading, setEditLoading] = useState(false);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchUsers = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    workspaceService
      .getUsersPaginated(workspaceId, {
        page,
        page_size: pageSize,
        search: debouncedSearch || undefined,
        role: roleFilter || undefined,
      })
      .then((data) => {
        setUsers(data.results);
        setWorkspaceName(data.workspace_name);
        setTotalCount(data.count);
      })
      .catch(() => setError("Failed to load users"))
      .finally(() => setLoading(false));
  }, [workspaceId, page, pageSize, debouncedSearch, roleFilter]);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    fetchUsers();
  }, [workspaceId, fetchUsers]);

  // Reset to page 1 when search or role filter changes (handled by fetchUsers dependency)
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter]);

  // Pre-select current brand when opening create form for manager
  useEffect(() => {
    if (createPanelOpen && createRole === "manager" && accountIdNum && accounts.some((a) => a.id === accountIdNum)) {
      setCreateAccountIds((prev) => (prev.includes(accountIdNum) ? prev : [...prev, accountIdNum]));
    }
  }, [createPanelOpen, createRole, accountIdNum, accounts]);

  const isManagerOrOwner =
    (user?.role as string) === "admin" || user?.role === "owner" ||
    user?.role === "manager" ||
    (user?.role !== "team" && !!user?.workspace?.id);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const allChannels: Array<Channel & { account_name?: string }> = [];
  accounts.forEach((acc) => {
    (acc.channels || []).forEach((ch) => {
      allChannels.push({ ...ch, account_name: acc.name });
    });
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    if (createPassword !== createPassword2) {
      setError("Passwords do not match");
      return;
    }
    setCreateLoading(true);
    setError("");
    setMessage("");
    try {
      const { user: newUser } = await workspaceService.createUser(workspaceId, {
        email: createEmail.trim().toLowerCase(),
        first_name: createFirstName,
        last_name: createLastName,
        role: createRole,
        password: createPassword,
        password2: createPassword2,
      });
      if (createRole === "manager" && createAccountIds.length > 0) {
        await workspaceService.assignAccountsToManager(workspaceId, newUser.id, createAccountIds);
      }
      if (createRole === "team" && createChannelIds.length > 0) {
        await workspaceService.assignChannelsToTeam(workspaceId, newUser.id, createChannelIds);
      }
      try {
        await workspaceService.sendWelcomeEmail(workspaceId, newUser.id);
      } catch {
        // Non-blocking: user was created; welcome email failure is logged server-side
      }
      const displayName = [createFirstName, createLastName].filter(Boolean).join(" ") || createEmail.trim();
      const roleLabel = ROLE_LABELS[createRole] ?? createRole;
      const assignedBrands =
        createRole === "manager" && createAccountIds.length > 0
          ? createAccountIds
            .map((id) => accounts.find((a) => a.id === id)?.name)
            .filter(Boolean)
            .join(", ")
          : null;
      const assignedIntegrations =
        createRole === "team" && createChannelIds.length > 0
          ? createChannelIds
            .map((id) => {
              const ch = allChannels.find((c) => c.id === id);
              return ch ? `${ch.channel_name} (${ch.channel_type})${ch.account_name ? ` – ${ch.account_name}` : ""}` : null;
            })
            .filter(Boolean)
            .join(", ")
          : null;
      const brandLine =
        createRole === "manager"
          ? `Assigned brands: ${assignedBrands && assignedBrands.length > 0 ? assignedBrands : "None"}`
          : "";
      const integrationLine =
        createRole === "team"
          ? `Assigned integrations: ${assignedIntegrations && assignedIntegrations.length > 0 ? assignedIntegrations : "None"}`
          : "";
      const parts = [
        "User created successfully.",
        `Name: ${displayName}.`,
        `Role: ${roleLabel}.`,
        brandLine,
        integrationLine,
      ].filter(Boolean);
      setUserCreateSuccessMessage(parts.join(" "));
      setCreateEmail("");
      setCreateFirstName("");
      setCreateLastName("");
      setCreatePassword("");
      setCreatePassword2("");
      setCreateAccountIds([]);
      setCreateChannelIds([]);
      setCreatePanelOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setError(axErr.response?.data?.error || "Failed to create user");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAssignAccounts = async (accountIds: number[]) => {
    if (!workspaceId || !assignManagerId) return;
    setAssignLoading(true);
    setError("");
    setMessage("");
    try {
      await workspaceService.assignAccountsToManager(workspaceId, assignManagerId, accountIds);
      setMessage("Brands assigned to manager");
      setAssignManagerId(null);
      fetchUsers();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setError(axErr.response?.data?.error || "Failed to assign brands");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAssignChannels = async (channelIds: number[]) => {
    if (!workspaceId || !assignTeamId) return;
    setAssignLoading(true);
    setError("");
    setMessage("");
    try {
      await workspaceService.assignChannelsToTeam(workspaceId, assignTeamId, channelIds);
      setMessage("Integrations assigned to team member");
      setAssignTeamId(null);
      fetchUsers();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setError(axErr.response?.data?.error || "Failed to assign integrations");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!workspaceId || !userToDelete) return;
    setDeleteLoading(true);
    setError("");
    setMessage("");
    try {
      await workspaceService.deleteUser(workspaceId, userToDelete.id);
      setMessage("User removed from workspace");
      setUserToDelete(null);
      fetchUsers();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setError(axErr.response?.data?.error || "Failed to remove user");
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEditUser = (u: WorkspaceUser) => {
    setEditUser(u);
    setEditFirstName(u.first_name || "");
    setEditLastName(u.last_name || "");
    setEditRole(((u.role as string) === "owner" || (u.role as string) === "admin" ? "admin" : u.role) as "admin" | "manager" | "team");
    setError("");
    setMessage("");
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !editUser) return;
    setEditLoading(true);
    setError("");
    setMessage("");
    try {
      await workspaceService.updateUser(workspaceId, editUser.id, {
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        role: editRole,
      });
      setMessage("User updated");
      setEditUser(null);
      fetchUsers();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setError(axErr.response?.data?.error || "Failed to update user");
    } finally {
      setEditLoading(false);
    }
  };

  if (!workspaceId) {
    return (
      <p className="text-[#556179]">No workspace found. Contact your admin.</p>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}
      {message && (
        <Alert variant="success" className="mb-4">
          {message}
        </Alert>
      )}

      {/* Header with title and Create user / search / filter - same layout as Campaigns */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-[20px] sm:text-[22.8px] font-medium text-[#072929] leading-[1.26]">
          Users
        </h1>
        <div className="flex flex-nowrap items-center gap-2">
          {isManagerOrOwner && (
            <button
              type="button"
              onClick={() => {
                setCreatePanelOpen(!createPanelOpen);
                setError("");
                setMessage("");
              }}
              className="create-entity-button w-full"
            >
              <span className="text-[12.64px] text-white font-normal">
                Create user
              </span>
              <svg
                className={`w-5 h-5 text-white transition-transform ${createPanelOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by email or name..."
            className="campaign-input w-48"
            aria-label="Search users"
          />
          <Dropdown<string>
            options={ROLE_FILTER_OPTIONS}
            value={roleFilter}
            onChange={(v) => setRoleFilter(v)}
            placeholder="All roles"
            buttonClassName="edit-button w-32"
          />
        </div>
      </div>

      {/* Create user panel - same pattern as CreateCampaignPanel */}
      {isManagerOrOwner && createPanelOpen && (
        <div className="">
          <div className="relative border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6]">
            <form onSubmit={handleCreateUser}>
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[16px] font-semibold text-[#072929]">
                    Create user
                  </h2>
                  <button
                    type="button"
                    onClick={() => setCreatePanelOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5 text-[#556179]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-6">
                    <div>
                      <label className="form-label">First name</label>
                      <input
                        type="text"
                        value={createFirstName}
                        onChange={(e) => setCreateFirstName(e.target.value)}
                        className="campaign-input w-full"
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <label className="form-label">Last name</label>
                      <input
                        type="text"
                        value={createLastName}
                        onChange={(e) => setCreateLastName(e.target.value)}
                        className="campaign-input w-full"
                        placeholder="Last name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-6">
                    <div>
                      <label className="form-label">Email <span>*</span></label>
                      <input
                        type="email"
                        value={createEmail}
                        onChange={(e) => setCreateEmail(e.target.value)}
                        required
                        className="campaign-input w-full"
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <label className="form-label">Role</label>
                      <Dropdown<string>
                        options={ROLE_OPTIONS}
                        value={createRole}
                        onChange={(v) => setCreateRole(v as "manager" | "team")}
                        placeholder="Select role"
                        buttonClassName="edit-button w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-6">
                    <div>
                      <label className="form-label">Password <span>*</span></label>
                      <input
                        type="password"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        required
                        className="campaign-input w-full"
                        placeholder="Password"
                      />
                    </div>
                    <div>
                      <label className="form-label">Confirm password <span>*</span></label>
                      <input
                        type="password"
                        value={createPassword2}
                        onChange={(e) => setCreatePassword2(e.target.value)}
                        required
                        className="campaign-input w-full"
                        placeholder="Confirm password"
                      />
                    </div>
                  </div>
                  {createRole === "manager" && (
                    <div>
                      <MultiSelectWithSearch
                        label="Assign brands (optional)"
                        placeholder="Select brands"
                        emptyMessage="No brands in workspace"
                        searchPlaceholder="Search brands..."
                        options={accounts.map((a) => ({ id: a.id, label: a.name }))}
                        selectedIds={createAccountIds}
                        onChange={setCreateAccountIds}
                      />
                    </div>
                  )}
                  {createRole === "team" && (
                    <div>
                      <MultiSelectWithSearch
                        label="Assign integrations (optional)"
                        placeholder="Select integrations"
                        emptyMessage="No integrations in workspace"
                        searchPlaceholder="Search integrations..."
                        options={allChannels.map((ch) => ({
                          id: ch.id,
                          label: `${ch.channel_name} (${ch.channel_type})${ch.account_name ? ` – ${ch.account_name}` : ""}`,
                        }))}
                        selectedIds={createChannelIds}
                        onChange={setCreateChannelIds}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setCreatePanelOpen(false)} className="cancel-button">
                  Cancel
                </button>
                <button type="submit" disabled={createLoading} className="apply-button">
                  {createLoading ? "Creating..." : "Create user"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit user panel */}
      {isManagerOrOwner && editUser && (
        <div className="">
          <div className="relative border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6]">
            <form onSubmit={handleEditUser}>
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[16px] font-semibold text-[#072929]">
                    Edit user
                  </h2>
                  <button
                    type="button"
                    onClick={() => setEditUser(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5 text-[#556179]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-6">
                    <div>
                      <label className="form-label">First name</label>
                      <input
                        type="text"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        className="campaign-input w-full"
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <label className="form-label">Last name</label>
                      <input
                        type="text"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        className="campaign-input w-full"
                        placeholder="Last name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-6">
                    <div>
                      <label className="form-label">Email</label>
                      <input
                        type="text"
                        value={editUser.email}
                        disabled
                        className="campaign-input w-full bg-gray-100 cursor-not-allowed"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="form-label">Role</label>
                      <Dropdown<string>
                        options={
                          (user?.role as string) === "admin" || user?.role === "owner"
                            ? [
                                { value: "admin", label: "Admin" },
                                ...ROLE_OPTIONS,
                              ]
                            : ROLE_OPTIONS
                        }
                        value={editRole}
                        onChange={(v) => setEditRole(v as "admin" | "manager" | "team")}
                        placeholder="Select role"
                        buttonClassName="edit-button w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setEditUser(null)} className="cancel-button">
                  Cancel
                </button>
                <button type="submit" disabled={editLoading} className="apply-button">
                  {editLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table section - same structure as Campaigns: relative wrapper, table-container, overlay when panel open */}
      <div className="relative">
        <div className="table-container" style={{ position: "relative", minHeight: loading ? "400px" : "auto" }}>
          <div className="overflow-x-auto w-full">
            {users.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center h-[400px] w-full py-12 px-6">
                <div className="flex flex-col items-center justify-center max-w-md">
                  <div className="mb-6 w-20 h-20 rounded-full bg-[#F5F5F0] flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-[#556179]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-teal-950 mb-2">
                    No users found
                  </h3>
                  <p className="text-sm text-[#556179] text-center leading-relaxed">
                    {searchInput || roleFilter
                      ? "Try adjusting your search or role filter."
                      : `Users for ${workspaceName || "this workspace"} will appear here when they are added.`}
                  </p>
                </div>
              </div>
            ) : (
              <table className="min-w-[800px] w-full">
                <thead>
                  <tr className="border-b border-[#e8e8e3]">
                    <th className="table-header">Name</th>
                    <th className="table-header">Email</th>
                    <th className="table-header">Role</th>
                    <th className="table-header">Assigned</th>
                    {isManagerOrOwner && (
                      <th className="table-header text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="table-row group">
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">
                          {u.first_name} {u.last_name}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">{u.email}</span>
                      </td>
                      <td className="table-cell">
                        <span className="table-text leading-[1.26]">{ROLE_LABELS[u.role] || u.role}</span>
                      </td>
                      <td className="table-cell">
                        <span className="table-text leading-[1.26] text-[#556179]">
                          {u.role === "manager" && (
                            (() => {
                              const assigned_brand_names = (u.assigned_account_ids ?? [])
                                .map((id) => accounts.find((a) => a.id === id)?.name)
                                .filter((name): name is string => Boolean(name));

                              if (assigned_brand_names.length > 0) {
                                const max_visible = 3;
                                const visible = assigned_brand_names.slice(0, max_visible);
                                const remaining = assigned_brand_names.length - visible.length;
                                const full_label = assigned_brand_names.join(", ");

                                return (
                                  <div className="flex flex-wrap items-center gap-2 max-w-[420px]" title={full_label}>
                                    {visible.map((name) => (
                                      <span
                                        key={name}
                                        className="inline-flex items-center px-2 py-1 rounded-full border border-[#e8e8e3] bg-[#F5F5F0] text-[#072929] text-[12px] leading-none"
                                      >
                                        {name}
                                      </span>
                                    ))}
                                    {remaining > 0 && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full border border-[#e8e8e3] bg-white text-[#556179] text-[12px] leading-none">
                                        +{remaining}
                                      </span>
                                    )}
                                  </div>
                                );
                              }

                              return <>—</>;
                            })()
                          )}
                          {u.role === "team" && (
                            (() => {
                              const assigned_integration_names = (u.assigned_channel_ids ?? [])
                                .map((id) => {
                                  const ch = allChannels.find((c) => c.id === id);
                                  if (!ch) return null;
                                  return `${ch.channel_name} (${ch.channel_type})${ch.account_name ? ` – ${ch.account_name}` : ""}`;
                                })
                                .filter((name): name is string => Boolean(name));

                              if (assigned_integration_names.length > 0) {
                                const max_visible = 3;
                                const visible = assigned_integration_names.slice(0, max_visible);
                                const remaining = assigned_integration_names.length - visible.length;
                                const full_label = assigned_integration_names.join(", ");

                                return (
                                  <div className="flex flex-wrap items-center gap-2 max-w-[420px]" title={full_label}>
                                    {visible.map((name) => (
                                      <span
                                        key={name}
                                        className="inline-flex items-center px-2 py-1 rounded-full border border-[#e8e8e3] bg-[#F5F5F0] text-[#072929] text-[12px] leading-none"
                                      >
                                        {name}
                                      </span>
                                    ))}
                                    {remaining > 0 && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full border border-[#e8e8e3] bg-white text-[#556179] text-[12px] leading-none">
                                        +{remaining}
                                      </span>
                                    )}
                                  </div>
                                );
                              }

                              return <>—</>;
                            })()
                          )}
                          {((u.role as string) === "admin" || u.role === "owner" || (u.role !== "manager" && u.role !== "team")) && "—"}
                        </span>
                      </td>
                      {isManagerOrOwner && (
                        <td className="table-cell">
                          <div className="flex items-center justify-end gap-2">
                            {u.role === "manager" && (
                              <button
                                type="button"
                                onClick={() => setAssignManagerId(u.id)}
                                className="text-sm text-forest-f60 hover:underline"
                              >
                                Assign brands
                              </button>
                            )}
                            {u.role === "team" && (
                              <button
                                type="button"
                                onClick={() => setAssignTeamId(u.id)}
                                className="text-sm text-forest-f60 hover:underline"
                              >
                                Assign integrations
                              </button>
                            )}
                            {u.id !== user?.id && (
                              <button
                                type="button"
                                onClick={() => openEditUser(u)}
                                className="p-1.5 rounded hover:bg-gray-100 text-[#556179] hover:text-forest-f60 transition-colors"
                                title="Edit user"
                                aria-label="Edit user"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                                </svg>
                              </button>
                            )}
                            {u.id !== user?.id && (
                              <button
                                type="button"
                                onClick={() => setUserToDelete(u)}
                                className="p-1.5 rounded hover:bg-red-50 text-[#556179] hover:text-red-600 transition-colors"
                                title="Delete user"
                                aria-label="Delete user"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {loading && (
            <div className="loading-overlay">
              <div className="loading-overlay-content">
                <Loader size="md" message="Loading users..." />
              </div>
            </div>
          )}
        </div>

        {!loading && totalCount > 0 && totalPages > 1 && (
          <div className="flex items-center justify-end mt-4">
            <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
              >
                Previous
              </button>
              {(() => {
                const pageNums: number[] = [];
                if (totalPages <= 5) {
                  for (let n = 1; n <= totalPages; n++) pageNums.push(n);
                } else if (page <= 3) {
                  for (let n = 1; n <= 5; n++) pageNums.push(n);
                } else if (page >= totalPages - 2) {
                  for (let n = totalPages - 4; n <= totalPages; n++) pageNums.push(n);
                } else {
                  for (let n = page - 2; n <= page + 2; n++) pageNums.push(n);
                }
                return pageNums.map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${page === pageNum
                      ? "bg-white text-[#136D6D] font-semibold"
                      : "text-black hover:bg-gray-50"
                      }`}
                  >
                    {pageNum}
                  </button>
                ));
              })()}
              {totalPages > 5 && page < totalPages - 2 && (
                <span className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-[#222124]">
                  ...
                </span>
              )}
              {totalPages > 5 && page < totalPages - 2 && (
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  className="px-3 py-2 border-r border-gray-200 text-[10.64px] cursor-pointer text-black hover:bg-gray-50"
                >
                  {totalPages}
                </button>
              )}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
        {createPanelOpen && (
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] z-40 rounded-[12px] cursor-not-allowed" />
        )}
      </div>

      {assignManagerId && (
        <AssignBrandsModal
          key={`assign-brands-${assignManagerId}`}
          accounts={accounts}
          initialSelectedAccountIds={users.find((u) => u.id === assignManagerId)?.assigned_account_ids ?? []}
          onConfirm={handleAssignAccounts}
          onCancel={() => setAssignManagerId(null)}
          loading={assignLoading}
        />
      )}
      {assignTeamId && (
        <AssignChannelsModal
          key={`assign-channels-${assignTeamId}`}
          channels={allChannels}
          initialSelectedChannelIds={users.find((u) => u.id === assignTeamId)?.assigned_channel_ids ?? []}
          onConfirm={handleAssignChannels}
          onCancel={() => setAssignTeamId(null)}
          loading={assignLoading}
        />
      )}

      <ConfirmationModal
        isOpen={!!userToDelete}
        onClose={() => !deleteLoading && setUserToDelete(null)}
        onConfirm={handleDeleteUser}
        title="Delete user"
        message={userToDelete ? `Are you sure you want to remove "${userToDelete.first_name} ${userToDelete.last_name}" (${userToDelete.email}) from the workspace?` : ""}
        warningText="They will lose access to all brands and integrations. This action cannot be undone."
        confirmButtonLabel="Delete"
        cancelButtonLabel="Cancel"
        type="danger"
        isLoading={deleteLoading}
      />

      <ErrorModal
        isOpen={userCreateSuccessMessage != null}
        onClose={() => setUserCreateSuccessMessage(null)}
        title="Success"
        message={userCreateSuccessMessage ?? ""}
        isSuccess
      />
    </div>
  );
}

function AssignBrandsModal({
  accounts,
  initialSelectedAccountIds = [],
  onConfirm,
  onCancel,
  loading,
}: {
  accounts: Account[];
  initialSelectedAccountIds?: number[];
  onConfirm: (accountIds: number[]) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) {
  const [selected, setSelected] = useState<number[]>(initialSelectedAccountIds);
  const [searchQuery, setSearchQuery] = useState("");
  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? accounts.filter((a) => (a.name ?? "").toLowerCase().includes(q))
    : accounts;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-md w-full max-h-[80vh] flex flex-col">
        <h3 className="text-[16px] font-semibold text-[#072929] mb-4">Assign brands to manager</h3>
        <div className="mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search brands..."
            className="w-full px-3 py-2 text-sm border border-[#e8e8e3] rounded-lg bg-white text-[#072929] placeholder:text-[#556179] focus:outline-none focus:ring-2 focus:ring-[#136d6d] focus:border-transparent"
            aria-label="Search brands"
          />
        </div>
        <div className="space-y-2 mb-4 overflow-y-auto min-h-0 flex-1">
          {accounts.length === 0 && <p className="text-[#556179] text-sm">No brands in workspace</p>}
          {accounts.length > 0 && filtered.length === 0 && (
            <p className="text-[#556179] text-sm">No brands match your search</p>
          )}
          {filtered.map((a) => (
            <div key={a.id} className="w-full">
              <Checkbox
                checked={selected.includes(a.id)}
                onChange={() => toggle(a.id)}
                label={a.name ?? ""}
                className="text-[13px] text-[#072929] w-full"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2 justify-end shrink-0">
          <button type="button" onClick={onCancel} className="cancel-button">Cancel</button>
          <button type="button" onClick={() => onConfirm(selected)} disabled={loading} className="apply-button">
            {loading ? "Assigning..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignChannelsModal({
  channels,
  initialSelectedChannelIds = [],
  onConfirm,
  onCancel,
  loading,
}: {
  channels: Array<Channel & { account_name?: string }>;
  initialSelectedChannelIds?: number[];
  onConfirm: (channelIds: number[]) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) {
  const [selected, setSelected] = useState<number[]>(initialSelectedChannelIds);
  const [searchQuery, setSearchQuery] = useState("");
  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? channels.filter((ch) => {
        const label = `${ch.channel_name ?? ""} ${ch.channel_type ?? ""} ${ch.account_name ?? ""}`.toLowerCase();
        return label.includes(q);
      })
    : channels;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-md w-full max-h-[80vh] flex flex-col">
        <h3 className="text-[16px] font-semibold text-[#072929] mb-4">Assign integrations to team member</h3>
        <div className="mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search integrations..."
            className="w-full px-3 py-2 text-sm border border-[#e8e8e3] rounded-lg bg-white text-[#072929] placeholder:text-[#556179] focus:outline-none focus:ring-2 focus:ring-[#136d6d] focus:border-transparent"
            aria-label="Search integrations"
          />
        </div>
        <div className="space-y-2 mb-4 overflow-y-auto min-h-0 flex-1">
          {channels.length === 0 && (
            <p className="text-[#556179] text-sm">No integrations in workspace.</p>
          )}
          {channels.length > 0 && filtered.length === 0 && (
            <p className="text-[#556179] text-sm">No integrations match your search</p>
          )}
          {filtered.map((ch) => (
            <div key={ch.id} className="w-full">
              <Checkbox
                checked={selected.includes(ch.id)}
                onChange={() => toggle(ch.id)}
                label={`${ch.channel_name} (${ch.channel_type})${ch.account_name ? ` – ${ch.account_name}` : ""}`}
                className="text-[13px] text-[#072929] w-full"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2 justify-end shrink-0">
          <button type="button" onClick={onCancel} className="cancel-button">Cancel</button>
          <button type="button" onClick={() => onConfirm(selected)} disabled={loading} className="apply-button">
            {loading ? "Assigning..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}
