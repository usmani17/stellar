import React from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getDashboards, type DashboardResponse } from "../../../services/dashboard";

interface DashboardsListProps {
  accountId?: number;
}

export const DashboardsList: React.FC<DashboardsListProps> = ({ accountId }) => {
  const navigate = useNavigate();
  
  const { data: dashboards = [] } = useQuery({
    queryKey: ["dashboards", accountId],
    queryFn: () => getDashboards(accountId!),
    enabled: !!accountId,
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
            <div key={dashboard.id} className="bg-white rounded-lg border border-[#E8E8E3] p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-medium text-[#072929] mb-2">{dashboard.name}</h3>
              <p className="text-sm text-[#556179] mb-4">{dashboard.description || "No description available"}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#556179]">
                  Last updated: {dashboard.updatedAt ? new Date(dashboard.updatedAt).toLocaleDateString() : "Unknown"}
                </span>
                <button 
                  onClick={() => navigate(`/brands/${accountId}/dashboard/${dashboard.id}`)}
                  className="text-sm text-forest-f60 hover:text-[#0e5a5a] font-medium"
                >
                  View Dashboard →
                </button>
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
    </>
  );
};