import React, { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Search, Users, ChevronLeft, ChevronRight } from "lucide-react";

import { Sidebar } from "../../components/layout/Sidebar";
import { AccountsHeader } from "../../components/layout/AccountsHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { useAuth } from "../../contexts/AuthContext";
import { Loader } from "../../components/ui";
import {
  superAdminService,
  type SuperAdminUser,
  type SuperAdminUserWorkspace,
} from "../../services/superAdmin";
import { cn } from "../../lib/cn";

const PAGE_SIZE = 100;
const MAX_VISIBLE_WS = 2;

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-forest-f60/10 text-forest-f60 border-forest-f60/20",
  admin: "bg-forest-f40/10 text-forest-f40 border-forest-f40/20",
  manager: "bg-yellow-y10/10 text-yellow-y10 border-yellow-y10/20",
  team: "bg-[#506766]/10 text-[#506766] border-[#506766]/20",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  team: "Team",
};

function getInitials(first: string, last: string, email: string): string {
  if (first || last) return `${(first || "?")[0]}${(last || "?")[0]}`.toUpperCase();
  return (email || "?")[0].toUpperCase();
}

function displayName(first: string, last: string, email: string): string {
  const full = `${first || ""} ${last || ""}`.trim();
  return full || email || "Unknown";
}

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

function WorkspacePills({ workspaces }: { workspaces: SuperAdminUserWorkspace[] }) {
  const [expanded, setExpanded] = useState(false);

  if (workspaces.length === 0) {
    return <span className="text-[12px] text-forest-f30 italic">No workspace</span>;
  }

  const visible = expanded ? workspaces : workspaces.slice(0, MAX_VISIBLE_WS);
  const hiddenCount = workspaces.length - MAX_VISIBLE_WS;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((ws) => (
        <span
          key={ws.id}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-[3px] rounded-md border text-[11px] leading-none",
            ROLE_COLORS[ws.role] || ROLE_COLORS.team,
          )}
        >
          <span className="font-medium max-w-[120px] truncate">{ws.name}</span>
          <span className="opacity-60">{ROLE_LABELS[ws.role] || ws.role}</span>
        </span>
      ))}
      {!expanded && hiddenCount > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="inline-flex items-center px-2 py-[3px] rounded-md border border-sandstorm-s40 bg-sandstorm-s5 text-[11px] text-forest-f30 hover:text-forest-f60 hover:border-forest-f40/30 transition-colors leading-none"
        >
          +{hiddenCount} more
        </button>
      )}
      {expanded && hiddenCount > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          className="inline-flex items-center px-2 py-[3px] rounded-md border border-sandstorm-s40 bg-sandstorm-s5 text-[11px] text-forest-f30 hover:text-forest-f60 transition-colors leading-none"
        >
          show less
        </button>
      )}
    </div>
  );
}

export const SuperAdminUsers: React.FC = () => {
  const { sidebarWidth } = useSidebar();
  const { user, impersonate } = useAuth();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-all-users", { page, search }],
    queryFn: () =>
      superAdminService.getAllUsers({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const total = data?.count ?? 0;
  const totalPages = data ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;
  const pageNumbers = buildPageNumbers(page, totalPages);

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <div className="flex-1" style={{ marginLeft: sidebarWidth }}>
        <AccountsHeader />
        <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white overflow-x-hidden min-w-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-[20px] font-medium text-forest-f60">
                All Users
              </h1>
              <p className="text-[13px] text-forest-f30 mt-1">
                {total} user{total !== 1 ? "s" : ""} across all workspaces
              </p>
            </div>
            <div className="search-input-container h-[36px] w-full sm:w-[280px] flex items-center gap-2 px-3">
              <Search className="w-4 h-4 text-forest-f30 shrink-0" />
              <input
                type="text"
                placeholder="Search by name or email..."
                className="bg-transparent border-none outline-none text-[13px] text-forest-f60 w-full placeholder:text-forest-f30/60"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {/* Table */}
          <div
            className="bg-sandstorm-s5 border border-sandstorm-s40 rounded-[12px] overflow-hidden relative"
            style={{ minHeight: isLoading ? "320px" : undefined }}
          >
            {isLoading && (
              <div className="loading-overlay">
                <div className="loading-overlay-content">
                  <Loader size="md" message="Loading users..." />
                </div>
              </div>
            )}

            {!isLoading && total === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Users className="w-10 h-10 text-forest-f30/40 mb-3" />
                <p className="text-[14px] text-forest-f30">
                  {search
                    ? "No users match your search."
                    : "No users found."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px]">
                  <thead>
                    <tr className="border-b border-sandstorm-s40">
                      <th className="table-header" style={{ width: "30%" }}>
                        User
                      </th>
                      <th className="table-header" style={{ width: "15%" }}>
                        Workspaces
                      </th>
                      <th className="table-header" style={{ width: "55%" }}>
                        Roles
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.results.map((u: SuperAdminUser) => {
                      const isMe = u.id === user?.id;
                      const canImpersonate = !isMe;
                      return (
                        <tr
                          key={u.id}
                          className={cn(
                            "table-row group",
                            canImpersonate && "cursor-pointer hover:bg-sandstorm-s0",
                          )}
                          onClick={
                            canImpersonate
                              ? () => impersonate(u.id)
                              : undefined
                          }
                        >
                          <td className="table-cell">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0",
                                  isMe
                                    ? "bg-forest-f60 text-white"
                                    : "bg-forest-f60/10 text-forest-f60",
                                )}
                              >
                                {getInitials(u.first_name, u.last_name, u.email)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={cn(
                                      "text-[13px] font-medium text-forest-f60 truncate",
                                      canImpersonate &&
                                        "group-hover:underline",
                                    )}
                                  >
                                    {displayName(u.first_name, u.last_name, u.email)}
                                  </span>
                                  {isMe && (
                                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-forest-f60 text-white leading-none">
                                      you
                                    </span>
                                  )}
                                </div>
                                <p className="text-[12px] text-forest-f30 truncate">
                                  {u.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="table-cell">
                            <span className="text-[13px] font-medium text-forest-f60 tabular-nums">
                              {u.workspaces.length}
                            </span>
                          </td>
                          <td className="table-cell">
                            <WorkspacePills workspaces={u.workspaces} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-[13px] text-forest-f30">
                {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg text-forest-f60 hover:bg-sandstorm-s5 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {pageNumbers.map((p, i) =>
                  p === "..." ? (
                    <span
                      key={`ellipsis-${i}`}
                      className="text-[12px] w-8 text-center text-forest-f30"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "text-[12px] w-8 h-8 rounded-lg",
                        p === page
                          ? "bg-forest-f60 text-white font-medium"
                          : "text-forest-f60 hover:bg-sandstorm-s5",
                      )}
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
                  className="p-1.5 rounded-lg text-forest-f60 hover:bg-sandstorm-s5 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
