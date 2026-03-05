import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Plus, Settings } from "lucide-react";
import { useSidebar } from "../../contexts/SidebarContext";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch";
import { useWorkflows } from "./hooks/useWorkflows";
import { WorkflowsList } from "./components/WorkflowsList";
import { DashboardsList } from "./components/DashboardsList";
import { BrandSettingsModal } from "./components/BrandSettingsModal";
import { CreateWorkflowPanel } from "./components/CreateWorkflowPanel";
import { Loader } from "../../components/ui";
import type { Workflow } from "../../services/workflows";
import { Assistant } from "../../components/layout/Assistant";

export const WorkflowsPage: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const accountIdNum = accountId ? parseInt(accountId, 10) : undefined;
  const { sidebarWidth } = useSidebar();

  // Get initial tab from URL, default to "workflows"
  const initialTab = (searchParams.get("tab") as "workflows" | "dashboards") || "workflows";
  const [activeTab, setActiveTab] = useState<"workflows" | "dashboards">(initialTab);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | undefined>();
  const [updatingWorkflowId, setUpdatingWorkflowId] = useState<number | null>(null);
  const [searchInputValue, setSearchInputValue, debouncedSearchValue] =
    useDebouncedSearch("", 400);

  const {
    workflows,
    isSearching,
    deleteWorkflow,
    isDeleting,
    updateWorkflow,
    isUpdating,
  } = useWorkflows(accountIdNum, { search: debouncedSearchValue });

  useEffect(() => {
    setPageTitle("Workflows");
    return () => resetPageTitle();
  }, []);

  // Update URL when tab changes
  const handleTabChange = (tab: "workflows" | "dashboards") => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setPanelOpen(true);
  };

  const handleClosePanel = () => {
    setPanelOpen(false);
    setEditingWorkflow(undefined);
  };

  const handleTogglePause = async (workflow: Workflow) => {
    setUpdatingWorkflowId(workflow.id);
    try {
      await updateWorkflow({
        id: workflow.id,
        payload: {
          status: workflow.status === "active" ? "paused" : "active",
        },
      });
    } finally {
      setUpdatingWorkflowId(null);
    }
  };

  return (
    <>
      <Sidebar />
      <div
        className="transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <DashboardHeader />
        <Assistant />
        <div className="px-4 pt-[104px] pb-6 sm:px-6 lg:px-8 lg:pt-[112px] lg:pb-8 bg-sandstorm-s0 min-h-screen">
          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-[#E8E8E3]">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => handleTabChange("workflows")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "workflows"
                      ? "border-forest-f60 text-forest-f60"
                      : "border-transparent text-[#556179] hover:text-[#072929] hover:border-gray-300"
                  }`}
                >
                  Workflows
                </button>
                <button
                  onClick={() => handleTabChange("dashboards")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "dashboards"
                      ? "border-forest-f60 text-forest-f60"
                      : "border-transparent text-[#556179] hover:text-[#072929] hover:border-gray-300"
                  }`}
                >
                  Dashboards
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "workflows" && (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <h1 className="text-h1100 font-agrandir text-forest-f60">
                  Workflows
                </h1>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                  <div className="search-input-container flex gap-[8px] h-[40px] items-center p-[10px] w-full sm:w-[272px]">
                    <div className="relative shrink-0 size-[12px]" aria-hidden>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M5.5 9.5C7.70914 9.5 9.5 7.70914 9.5 5.5C9.5 3.29086 7.70914 1.5 5.5 1.5C3.29086 1.5 1.5 3.29086 1.5 5.5C1.5 7.70914 3.29086 9.5 5.5 9.5Z"
                          stroke="#556179"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M10.5 10.5L8.5 8.5"
                          stroke="#556179"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={searchInputValue}
                      onChange={(e) => setSearchInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      placeholder="Search workflows by name"
                      className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#556179] placeholder:text-[#556179] font-sans font-normal min-w-0"
                      autoComplete="off"
                      aria-label="Search workflows by name"
                    />
                    {isSearching && (
                      <div className="relative shrink-0 size-4">
                        <Loader size="sm" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="edit-button inline-flex items-center gap-2"
                    aria-label="Report settings"
                  >
                    <Settings className="w-5 h-5 text-forest-f60" />
                    <span className="text-[10.64px] text-forest-f60 font-normal">
                      Settings
                    </span>
                  </button>
                  <button
                    onClick={() => setPanelOpen(true)}
                    className="create-entity-button"
                  >
                    <Plus className="w-5 h-5 text-white" />
                    <span className="text-[10.64px] text-white font-normal">
                      Create Workflow
                    </span>
                  </button>
                  </div>
                </div>
              </div>

              <WorkflowsList
                accountId={accountIdNum}
                workflows={workflows}
                onEdit={handleEdit}
                onDelete={deleteWorkflow}
                isDeleting={isDeleting}
                onTogglePause={handleTogglePause}
                isUpdating={isUpdating}
                updatingWorkflowId={updatingWorkflowId}
                onCreateNew={() => setPanelOpen(true)}
              />
            </>
          )}

          {activeTab === "dashboards" && (
            <DashboardsList accountId={accountIdNum} />
          )}

          <BrandSettingsModal
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            accountId={accountIdNum}
          />

          <CreateWorkflowPanel
            isOpen={panelOpen}
            onClose={handleClosePanel}
            accountId={accountIdNum}
            editingWorkflow={editingWorkflow}
          />
        </div>
      </div>
    </>
  );
};
