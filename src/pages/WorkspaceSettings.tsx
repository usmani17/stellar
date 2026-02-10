import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAccounts } from "../contexts/AccountsContext";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { workspaceService, type WorkspaceUser } from "../services/workspace";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import { Alert, Dropdown } from "../components/ui";
import { type Account, type Channel } from "../services/accounts";

const ROLE_OPTIONS = [
  { value: "manager", label: "Manager" },
  { value: "team", label: "Team" },
];

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  team: "Team",
};

export const WorkspaceSettings: React.FC = () => {
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const { sidebarWidth } = useSidebar();
  const workspace = user?.workspace;

  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "team">("manager");
  const [inviteLoading, setInviteLoading] = useState(false);

  // Create user form
  const [createEmail, setCreateEmail] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createRole, setCreateRole] = useState<"manager" | "team">("manager");
  const [createPassword, setCreatePassword] = useState("");
  const [createPassword2, setCreatePassword2] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Panel state - which form is open
  const [invitePanelOpen, setInvitePanelOpen] = useState(false);
  const [createPanelOpen, setCreatePanelOpen] = useState(false);

  // Assign modals
  const [assignManagerId, setAssignManagerId] = useState<number | null>(null);
  const [assignTeamId, setAssignTeamId] = useState<number | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  useEffect(() => {
    setPageTitle("Workspace Team");
    return () => resetPageTitle();
  }, []);

  useEffect(() => {
    if (!workspace?.id) {
      setLoading(false);
      return;
    }
    workspaceService
      .getUsers(workspace.id)
      .then((data) => {
        setUsers(data.users);
        setWorkspaceName(data.workspace_name);
      })
      .catch(() => setError("Failed to load workspace users"))
      .finally(() => setLoading(false));
  }, [workspace?.id]);

  const isOwner = users.some((u) => u.id === user?.id && u.role === "owner");
  const isManagerOrOwner = users.some(
    (u) =>
      u.id === user?.id &&
      (u.role === "owner" || u.role === "manager")
  );

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.id) return;
    setInviteLoading(true);
    setError("");
    setMessage("");
    try {
      await workspaceService.invite(workspace.id, {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      });
      setMessage(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      setInvitePanelOpen(false);
      workspaceService.getUsers(workspace.id).then((d) => setUsers(d.users));
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send invite");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.id) return;
    if (createPassword !== createPassword2) {
      setError("Passwords do not match");
      return;
    }
    setCreateLoading(true);
    setError("");
    setMessage("");
    try {
      await workspaceService.createUser(workspace.id, {
        email: createEmail.trim().toLowerCase(),
        first_name: createFirstName,
        last_name: createLastName,
        role: createRole,
        password: createPassword,
        password2: createPassword2,
      });
      setMessage("User created successfully");
      setCreateEmail("");
      setCreateFirstName("");
      setCreateLastName("");
      setCreatePassword("");
      setCreatePassword2("");
      setCreatePanelOpen(false);
      workspaceService.getUsers(workspace.id).then((d) => setUsers(d.users));
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create user");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAssignAccounts = async (accountIds: number[]) => {
    if (!workspace?.id || !assignManagerId) return;
    setAssignLoading(true);
    setError("");
    setMessage("");
    try {
      await workspaceService.assignAccountsToManager(
        workspace.id,
        assignManagerId,
        accountIds
      );
      setMessage("Brands assigned to manager");
      setAssignManagerId(null);
      workspaceService.getUsers(workspace.id).then((d) => setUsers(d.users));
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to assign brands");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAssignChannels = async (channelIds: number[]) => {
    if (!workspace?.id || !assignTeamId) return;
    setAssignLoading(true);
    setError("");
    setMessage("");
    try {
      await workspaceService.assignChannelsToTeam(
        workspace.id,
        assignTeamId,
        channelIds
      );
      setMessage("Integrations assigned to team member");
      setAssignTeamId(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to assign integrations");
    } finally {
      setAssignLoading(false);
    }
  };

  // Collect all channels from workspace accounts
  const allChannels: Array<Channel & { account_name?: string }> = [];
  accounts.forEach((acc) => {
    (acc.channels || []).forEach((ch) => {
      allChannels.push({
        ...ch,
        account_name: acc.name,
      });
    });
  });

  if (!workspace) {
    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar />
        <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
          <DashboardHeader />
          <div className="p-8">
            <p className="text-[#556179]">No workspace found. Contact your admin.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
        <DashboardHeader />
        <div className="p-8">
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

          {loading ? (
            <p className="text-[#556179]">Loading...</p>
          ) : (
            <div className="space-y-6">
              {/* Header with buttons and table */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-[20px] sm:text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                  {workspaceName || "Workspace"} – Team
                </h1>
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInvitePanelOpen(!invitePanelOpen);
                        setCreatePanelOpen(false);
                      }}
                      className={`create-entity-button ${invitePanelOpen ? "opacity-90" : ""}`}
                    >
                      <span className="text-[10.64px] text-white font-normal">
                        Invite by email
                      </span>
                      <svg
                        className={`w-5 h-5 text-white transition-transform ${
                          invitePanelOpen ? "rotate-180" : ""
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
                    <button
                      type="button"
                      onClick={() => {
                        setCreatePanelOpen(!createPanelOpen);
                        setInvitePanelOpen(false);
                      }}
                      className={`create-entity-button ${createPanelOpen ? "opacity-90" : ""}`}
                    >
                      <span className="text-[10.64px] text-white font-normal">
                        Create user directly
                      </span>
                      <svg
                        className={`w-5 h-5 text-white transition-transform ${
                          createPanelOpen ? "rotate-180" : ""
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
                  </div>
                )}
              </div>

              {/* Invite panel - Owner only */}
              {isOwner && invitePanelOpen && (
                <div className="relative z-[999998]">
                  <div className="relative border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6]">
                    <form onSubmit={handleInvite}>
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-[16px] font-semibold text-[#072929]">
                            Invite by email
                          </h2>
                          <button
                            type="button"
                            onClick={() => setInvitePanelOpen(false)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            aria-label="Close"
                          >
                            <svg className="w-5 h-5 text-[#556179]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-6">
                          <div>
                            <label className="form-label">Email <span>*</span></label>
                            <input
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              required
                              className="campaign-input w-full"
                              placeholder="user@example.com"
                            />
                          </div>
                          <div>
                            <label className="form-label">Role</label>
                            <Dropdown<string>
                              options={ROLE_OPTIONS}
                              value={inviteRole}
                              onChange={(v) => setInviteRole(v as "manager" | "team")}
                              placeholder="Select role"
                              buttonClassName="edit-button w-full"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setInvitePanelOpen(false)}
                          className="cancel-button"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={inviteLoading}
                          className="apply-button"
                        >
                          {inviteLoading ? "Sending..." : "Send invite"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Create user panel - Owner only */}
              {isOwner && createPanelOpen && (
                <div className="relative z-[999998]">
                  <div className="relative border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6]">
                    <form onSubmit={handleCreateUser}>
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-[16px] font-semibold text-[#072929]">
                            Create user directly
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
                        </div>
                      </div>
                      <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setCreatePanelOpen(false)}
                          className="cancel-button"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={createLoading}
                          className="apply-button"
                        >
                          {createLoading ? "Creating..." : "Create user"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Users list */}
              <section>
                <div className="border border-[#E8E8E3] rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#F9F9F6]">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium text-[#072929]">
                          Name
                        </th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-[#072929]">
                          Email
                        </th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-[#072929]">
                          Role
                        </th>
                        {(isOwner || isManagerOrOwner) && (
                          <th className="text-left px-4 py-3 text-sm font-medium text-[#072929]">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-t border-[#E8E8E3]">
                          <td className="px-4 py-3">
                            {u.first_name} {u.last_name}
                          </td>
                          <td className="px-4 py-3">{u.email}</td>
                          <td className="px-4 py-3">
                            {ROLE_LABELS[u.role] || u.role}
                          </td>
                          {(isOwner || isManagerOrOwner) && (
                            <td className="px-4 py-3">
                              {u.role === "manager" && isOwner && (
                                <button
                                  onClick={() => setAssignManagerId(u.id)}
                                  className="text-sm text-forest-f60 hover:underline"
                                >
                                  Assign brands
                                </button>
                              )}
                              {u.role === "team" && isManagerOrOwner && (
                                <button
                                  onClick={() => setAssignTeamId(u.id)}
                                  className="text-sm text-forest-f60 hover:underline"
                                >
                                  Assign integrations
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Assign brands modal */}
              {assignManagerId && (
                <AssignBrandsModal
                  accounts={accounts}
                  onConfirm={handleAssignAccounts}
                  onCancel={() => setAssignManagerId(null)}
                  loading={assignLoading}
                />
              )}

              {/* Assign channels modal */}
              {assignTeamId && (
                <AssignChannelsModal
                  channels={allChannels}
                  onConfirm={handleAssignChannels}
                  onCancel={() => setAssignTeamId(null)}
                  loading={assignLoading}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function AssignBrandsModal({
  accounts,
  onConfirm,
  onCancel,
  loading,
}: {
  accounts: Account[];
  onConfirm: (accountIds: number[]) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const toggle = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-md w-full max-h-[80vh] overflow-auto">
        <h3 className="text-[16px] font-semibold text-[#072929] mb-4">Assign brands to manager</h3>
        <div className="space-y-2 mb-4">
          {accounts.map((a) => (
            <label key={a.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(a.id)}
                onChange={() => toggle(a.id)}
              />
              <span className="text-[13px] text-[#072929]">{a.name}</span>
            </label>
          ))}
          {accounts.length === 0 && (
            <p className="text-[#556179] text-sm">No brands in workspace</p>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="cancel-button">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={loading}
            className="apply-button"
          >
            {loading ? "Assigning..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignChannelsModal({
  channels,
  onConfirm,
  onCancel,
  loading,
}: {
  channels: Array<Channel & { account_name?: string }>;
  onConfirm: (channelIds: number[]) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const toggle = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-md w-full max-h-[80vh] overflow-auto">
        <h3 className="text-[16px] font-semibold text-[#072929] mb-4">
          Assign integrations to team member
        </h3>
        <div className="space-y-2 mb-4">
          {channels.map((ch) => (
            <label key={ch.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(ch.id)}
                onChange={() => toggle(ch.id)}
              />
              <span className="text-[13px] text-[#072929]">
                {ch.channel_name} ({ch.channel_type}){" "}
                {ch.account_name && ` – ${ch.account_name}`}
              </span>
            </label>
          ))}
          {channels.length === 0 && (
            <p className="text-[#556179] text-sm">
              No integrations in workspace. Add brands and integrations first.
            </p>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="cancel-button">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={loading}
            className="apply-button"
          >
            {loading ? "Assigning..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}
