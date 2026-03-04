import React from "react";
import { BaseModal } from "../../../components/ui";
import { setDashboardForWorkflow } from "../utils/dashboardStorage";
import { FULL_TEST_DASHBOARD_CONFIG } from "../constants/fullTestDashboard";

interface CreateDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: number;
  onCreated?: () => void;
}

export const CreateDashboardModal: React.FC<CreateDashboardModalProps> = ({
  isOpen,
  onClose,
  workflowId,
  onCreated,
}) => {
  const handleCreate = () => {
    setDashboardForWorkflow(workflowId, FULL_TEST_DASHBOARD_CONFIG);
    onCreated?.();
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg" padding="p-0">
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <h2 className="text-xl font-agrandir font-medium text-forest-f60 mb-4">
          Create Dashboard
        </h2>
        <p className="text-sm text-forest-f30 mb-4">
          Create a full test dashboard with campaign performance, multi-GAQL joins, workflow runs, daily spend chart, and keyword spend.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-[11px] font-medium border border-sandstorm-s40 bg-white text-forest-f60 hover:bg-sandstorm-s5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="create-entity-button"
          >
            <span className="text-[10.64px] text-white font-normal">
              Create Dashboard
            </span>
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
