import React, { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { ArrowLeft } from "lucide-react";

/**
 * Meta ad set detail page (placeholder).
 * Route: /brands/:accountId/:channelId/meta/adsets/:adsetId
 */
export function MetaAdsetDetail() {
  const { accountId, channelId, adsetId } = useParams<{
    accountId: string;
    channelId: string;
    adsetId: string;
  }>();
  const { sidebarCollapsed } = useSidebar();

  useEffect(() => {
    setPageTitle("Meta Ad Set");
    return () => resetPageTitle();
  }, []);

  const listPath = `/brands/${accountId}/${channelId}/meta/adsets`;

  return (
    <div className="flex min-h-screen bg-[#fefefb]">
      <Sidebar />
      <div
        className={`flex flex-1 flex-col transition-all duration-300 ${
          sidebarCollapsed ? "ml-[72px]" : "ml-[260px]"
        }`}
      >
        <DashboardHeader />
        <main className="flex-1 p-6">
          <Link
            to={listPath}
            className="inline-flex items-center gap-2 text-sm text-[#136D6D] hover:underline mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to ad sets
          </Link>
          <div className="rounded-lg border border-[#e8e8e3] bg-white p-6">
            <h1 className="text-lg font-semibold text-[#072929] mb-2">
              Meta Ad Set
            </h1>
            <p className="text-[#556179]">
              Ad Set ID: <code className="text-[#072929]">{adsetId}</code>
            </p>
            <p className="text-sm text-[#556179] mt-4">
              Detail view coming soon.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
