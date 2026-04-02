import React, { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, Building2, LogIn } from "lucide-react";

function buildPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [];
  pages.push(1);
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

import { Sidebar } from "../../components/layout/Sidebar";
import { AccountsHeader } from "../../components/layout/AccountsHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { useAuth } from "../../contexts/AuthContext";
import { Loader } from "../../components/ui";
import { superAdminService } from "../../services/superAdmin";

const PAGE_SIZE = 25;

export const SuperAdminWorkspaces: React.FC = () => {
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();
  const { setImpersonatedWorkspace, setActiveWorkspaceId } = useAuth();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-workspaces", { page, search }],
    queryFn: () =>
      superAdminService.listWorkspaces({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const total = data?.count ?? 0;
  const totalPages = data ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;
  const pageNumbers = buildPageNumbers(page, totalPages);

  const handleImpersonate = async (workspaceId: number) => {
    const res = await superAdminService.impersonateWorkspace(workspaceId);
    setActiveWorkspaceId(res.workspace.id);
    setImpersonatedWorkspace({
      id: res.workspace.id,
      name: res.workspace.name,
    });
    navigate("/brands");
  };

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <div className="flex-1" style={{ marginLeft: sidebarWidth }}>
        <AccountsHeader />
        <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white overflow-x-hidden min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-[20px] font-medium text-forest-f60">
                All Workspaces
              </h1>
              <p className="text-[13px] text-forest-f30 mt-1">
                {total} workspace{total !== 1 ? "s" : ""} in the system
              </p>
            </div>
            <div className="search-input-container h-[36px] w-full sm:w-[280px] flex items-center gap-2 px-3">
              <Search className="w-4 h-4 text-forest-f30 shrink-0" />
              <input
                type="text"
                placeholder="Search workspaces..."
                className="bg-transparent border-none outline-none text-[13px] text-forest-f60 w-full placeholder:text-forest-f30/60"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div
            className="bg-sandstorm-s5 border border-sandstorm-s40 rounded-[12px] overflow-hidden relative"
            style={{ minHeight: isLoading ? "320px" : undefined }}
          >
            {isLoading && (
              <div className="loading-overlay">
                <div className="loading-overlay-content">
                  <Loader size="md" message="Loading workspaces..." />
                </div>
              </div>
            )}

            {!isLoading && total === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Building2 className="w-10 h-10 text-forest-f30/40 mb-3" />
                <p className="text-[14px] text-forest-f30">
                  {search
                    ? "No workspaces match your search."
                    : "No workspaces found."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-sandstorm-s40">
                      <th className="table-header">Workspace</th>
                      <th className="table-header">Owner</th>
                      <th className="table-header text-center">Users</th>
                      <th className="table-header">Created</th>
                      <th className="table-header text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.results.map((ws) => (
                      <tr key={ws.id} className="table-row group">
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-medium text-forest-f60">
                              {ws.name}
                            </span>
                            <span className="text-[11px] text-forest-f30">
                              ID: {ws.id}
                            </span>
                          </div>
                        </td>
                        <td className="table-cell">
                          {ws.owner ? (
                            <div className="flex flex-col">
                              <span className="text-[13px] text-forest-f60">
                                {ws.owner.first_name} {ws.owner.last_name}
                              </span>
                              <span className="text-[11px] text-forest-f30">
                                {ws.owner.email}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[13px] text-forest-f30">
                              —
                            </span>
                          )}
                        </td>
                        <td className="table-cell text-center">
                          <span className="text-[13px] text-forest-f60">
                            {ws.users_count}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className="text-[13px] text-forest-f60">
                            {new Date(ws.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="table-cell text-right">
                          <button
                            type="button"
                            onClick={() => handleImpersonate(ws.id)}
                            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-forest-f40 hover:text-forest-f50 hover:underline"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            Enter workspace
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-[13px] text-forest-f30">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-[12px] px-2.5 py-1.5 rounded-lg text-forest-f60 hover:bg-sandstorm-s5 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                {pageNumbers.map((p, i) =>
                  p === "..." ? (
                    <span
                      key={`ellipsis-${i}`}
                      className="text-[12px] px-1.5 py-1.5 text-forest-f30"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`text-[12px] min-w-[32px] py-1.5 rounded-lg ${
                        p === page
                          ? "bg-forest-f60 text-white font-medium"
                          : "text-forest-f60 hover:bg-sandstorm-s5"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={page === totalPages}
                  className="text-[12px] px-2.5 py-1.5 rounded-lg text-forest-f60 hover:bg-sandstorm-s5 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
