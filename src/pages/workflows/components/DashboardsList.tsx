import React, { useState } from "react";
import { Plus, Link2, User, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDashboards, softDeleteDashboard, type DashboardResponse } from "../../../services/dashboard";
import { ConfirmationModal } from "../../../components/ui";
import { cn } from "../../../lib/cn";

interface DashboardsListProps {
  accountId?: number;
}

export const DashboardsList: React.FC<DashboardsListProps> = ({ accountId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dashboardToDelete, setDashboardToDelete] = useState<{ id: number; name: string } | null>(null);

  const { data: dashboards = [] } = useQuery({
    queryKey: ["dashboards", accountId],
    queryFn: () => getDashboards(accountId!),
    enabled: !!accountId,
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      accountId && dashboardToDelete
        ? softDeleteDashboard(accountId, dashboardToDelete.id)
        : Promise.reject(new Error("Missing account or dashboard")),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboards", accountId] });
      setDashboardToDelete(null);
    },
    onError: () => {
      setDashboardToDelete(null);
    },
  });

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-h1100 font-agrandir text-forest-f60">
          Dashboards
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {/* TODO: Implement create dashboard */}}
            className="create-entity-button"
          >
            <Plus className="w-5 h-5 text-white" />
            <span className="text-[10.64px] text-white font-normal">
              Create Dashboard
            </span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dashboards.length > 0 ? (
          dashboards.map((dashboard: DashboardResponse) => (
            <div key={dashboard.id} className="bg-white rounded-lg border border-[#E8E8E3] p-6 hover:shadow-md transition-shadow flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-medium text-[#072929] mb-2">{dashboard.name}</h3>
              </div>

              {/* Integration and Profile Info */}
              <div className="space-y-3">
                {dashboard.channelName && (
                  <div className="flex items-center gap-2.5">
                    <Link2 className="w-4 h-4 shrink-0 text-forest-f30" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-forest-f30">
                        Integration
                      </p>
                      <p className="truncate text-sm text-forest-f60">{dashboard.channelName || "All Integrations"}</p>
                    </div>
                  </div>
                )}
                {dashboard.profileName && (
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 shrink-0 text-forest-f30" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-forest-f30">
                        Profile
                      </p>
                      <p className="truncate text-sm text-forest-f60">{dashboard.profileName || "All Profiles"}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mt-auto pt-4 border-t border-[#E8E8E3]">
                <span className="text-xs text-[#556179]">
                  Last updated: {dashboard.updatedAt ? new Date(dashboard.updatedAt).toLocaleDateString() : "Unknown"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDashboardToDelete({ id: dashboard.id, name: dashboard.name });
                    }}
                    className={cn(
                      "p-1.5 rounded-md text-forest-f30 hover:text-red-r30 hover:bg-red-r0 transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-red-r30 focus:ring-offset-1"
                    )}
                    aria-label={`Delete dashboard ${dashboard.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/brands/${accountId}/dashboards/${dashboard.id}`)}
                    className="text-sm text-forest-f60 hover:text-[#0e5a5a] font-medium whitespace-nowrap"
                  >
                    View Dashboard →
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          /* Empty state when no dashboards */
          <div className="col-span-full bg-white rounded-lg border-2 border-dashed border-[#E8E8E3] p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 text-[#556179]">
              <svg fill="none" stroke="currentColor" viewBox="0 0 48 48" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A9.971 9.971 0 0124 24c4.21 0 7.954 2.648 9.287 6.286" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-[#072929] mb-1">No custom dashboards yet</h3>
            <p className="text-sm text-[#556179] mb-4">Create your first dashboard to visualize your data</p>
            <button 
              onClick={() => {/* TODO: Implement create dashboard */}}
              className="inline-flex items-center gap-2 px-4 py-2 bg-forest-f60 text-white rounded-lg hover:bg-[#0e5a5a] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Dashboard
            </button>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!dashboardToDelete}
        onClose={() => !deleteMutation.isPending && setDashboardToDelete(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Remove dashboard"
        message={
          dashboardToDelete
            ? `Are you sure you want to remove "${dashboardToDelete.name}"? It will no longer appear in your list.`
            : ""
        }
        confirmButtonLabel="Remove"
        cancelButtonLabel="Cancel"
        type="danger"
        isLoading={deleteMutation.isPending}
        loadingLabel="Removing…"
      />
    </>
  );
};