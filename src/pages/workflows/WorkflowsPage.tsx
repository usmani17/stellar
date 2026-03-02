import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Plus, Settings } from "lucide-react";
import { useSidebar } from "../../contexts/SidebarContext";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { setPageTitle, resetPageTitle } from "../../utils/pageTitle";
import { useWorkflows } from "./hooks/useWorkflows";
import { WorkflowsList } from "./components/WorkflowsList";
import { BrandSettingsModal } from "./components/BrandSettingsModal";
import { CreateWorkflowPanel } from "./components/CreateWorkflowPanel";
import type { Workflow } from "../../services/workflows";

export const WorkflowsPage: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const accountIdNum = accountId ? parseInt(accountId, 10) : undefined;
  const { sidebarWidth } = useSidebar();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | undefined>();
  const [updatingWorkflowId, setUpdatingWorkflowId] = useState<number | null>(null);

  const {
    workflows,
    isLoading,
    deleteWorkflow,
    isDeleting,
    updateWorkflow,
    isUpdating,
  } = useWorkflows(accountIdNum);

  useEffect(() => {
    setPageTitle("Workflows");
    return () => resetPageTitle();
  }, []);

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
        <div className="px-4 pt-[104px] pb-6 sm:px-6 lg:px-8 lg:pt-[112px] lg:pb-8 bg-sandstorm-s0 min-h-screen">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-h1100 font-agrandir text-forest-f60">
              Workflows
            </h1>
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

          <WorkflowsList
            accountId={accountIdNum}
            workflows={workflows}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={deleteWorkflow}
            isDeleting={isDeleting}
            onTogglePause={handleTogglePause}
            isUpdating={isUpdating}
            updatingWorkflowId={updatingWorkflowId}
            onCreateNew={() => setPanelOpen(true)}
          />

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
