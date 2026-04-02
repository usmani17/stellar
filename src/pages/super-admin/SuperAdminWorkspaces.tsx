import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { useAuth } from "../../contexts/AuthContext";
import { Banner, Button, KPICard, Loader } from "../../components/ui";
import { superAdminService } from "../../services/superAdmin";

const PAGE_SIZE = 20;

export const SuperAdminWorkspaces: React.FC = () => {
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();
  const { impersonatedWorkspace, setImpersonatedWorkspace, setActiveWorkspaceId } =
    useAuth();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["super-admin-workspaces", { page, search }],
    queryFn: () =>
      superAdminService.listWorkspaces({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
      }),
    keepPreviousData: true,
  });

  const total = data?.count ?? 0;
  const totalPages = data ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

  const handleImpersonate = async (workspaceId: number, name: string) => {
    const res = await superAdminService.impersonateWorkspace(workspaceId);
    setActiveWorkspaceId(res.workspace.id);
    setImpersonatedWorkspace({ id: res.workspace.id, name: res.workspace.name });
    navigate("/brands");
  };

  return (
    <div className="min-h-screen bg-sandstorm-s0 flex">
      <Sidebar />
      <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
        <DashboardHeader />
        <div className="px-4 pt-[104px] pb-6 sm:px-6 lg:px-8 lg:pt-[112px] lg:pb-8">
          <div className="space-y-6">
            {impersonatedWorkspace && (
              <Banner
                type="warning"
                message={`You are viewing workspace "${impersonatedWorkspace.name}". Some actions may bypass normal permissions.`}
              />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-[24px] font-medium text-forest-f60">
                  Super Admin – Workspaces
                </h1>
                <p className="text-[14px] text-forest-f30 mt-1">
                  Browse all workspaces and jump into any workspace context.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="search-input-container h-[40px] w-full md:w-[272px] flex items-center gap-2 px-[10px]">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  {isFetching ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <KPICard label="Total Workspaces" value={data?.count ?? 0} />
            </div>

            <div
              className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden relative"
              style={{ minHeight: isLoading ? "320px" : undefined }}
            >
              {isLoading && (
                <div className="loading-overlay">
                  <div className="loading-overlay-content">
                    <Loader size="md" message="Loading workspaces..." />
                  </div>
                </div>
              )}

              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Name</th>
                    <th className="table-header">Owner</th>
                    <th className="table-header">Users</th>
                    <th className="table-header">Created</th>
                    <th className="table-header w-40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading && (data?.results.length ?? 0) === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="table-cell text-center py-10 text-[14px] text-forest-f30"
                      >
                        No workspaces found.
                      </td>
                    </tr>
                  )}
                  {data?.results.map((ws) => (
                    <tr key={ws.id} className="table-row">
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
                          <span className="text-[13px] text-forest-f60">
                            {ws.owner.email}
                          </span>
                        ) : (
                          <span className="text-[13px] text-forest-f30">—</span>
                        )}
                      </td>
                      <td className="table-cell text-[13px] text-forest-f60">
                        {ws.users_count}
                      </td>
                      <td className="table-cell text-[13px] text-forest-f60">
                        {new Date(ws.created_at).toLocaleDateString()}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleImpersonate(ws.id, ws.name)
                            }
                          >
                            Login as workspace
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-forest-f30">
                  Showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-[12px] px-3 py-1.5"
                  >
                    Previous
                  </Button>
                  <span className="text-[13px] text-forest-f30">
                    {page} / {totalPages}
                  </span>
                  <Button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={page === totalPages}
                    className="text-[12px] px-3 py-1.5"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

