import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BaseModal } from "../../../components/ui";
import { getDashboards } from "../../../services/dashboard";
import { useChannels } from "../../../hooks/queries/useChannels";
import { useGoogleProfiles } from "../../../hooks/queries/useGoogleProfiles";
import { useAssistant } from "../../../contexts/AssistantContext";
import type { Workflow } from "../../../services/workflows";

interface CreateDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: Workflow;
  accountId?: number;
}

export const CreateDashboardModal: React.FC<CreateDashboardModalProps> = ({
  isOpen,
  onClose,
  workflow,
  accountId,
}) => {
  const [error, setError] = useState<string | null>(null);
  const { openAssistant, setInputValue, setAssistantScope, startNewSession } = useAssistant();

  const { data: channels = [] } = useChannels(accountId);
  const channelId = channels.length > 0 ? channels[0].id : undefined;
  const isGoogle = channels.length > 0 && channels[0].channel_type === "google";
  const googleChannelId = isGoogle ? channelId : undefined;
  const {
    data: googleProfilesData,
    isLoading: isLoadingProfiles,
  } : { data: any, isLoading: boolean } = useGoogleProfiles(googleChannelId);

  // Fetch dashboards for this account
  const { data: dashboards = [] } = useQuery({
    queryKey: ["dashboards", accountId],
    queryFn: () => (accountId ? getDashboards(accountId) : Promise.resolve([])),
    enabled: Boolean(accountId && isOpen && workflow),
  });

  // Find dashboard for this workflow
  const existingDashboard = workflow ? dashboards.find((d) => d.workflowId === workflow.id) : undefined;
  const dashboardId = existingDashboard?.id;
  const isUpdate = Boolean(dashboardId);

  const handleCreate = async () => {
    if (!accountId) {
      setError("Account ID is required");
      return;
    }

    if (!workflow) {
      setError("Workflow is required");
      return;
    }

    // Open assistant with pre-filled message; include workflow prompt only for create
    const message =
      isUpdate && dashboardId
        ? `Update dashboard (ID: ${dashboardId} : ${existingDashboard?.name}) for workflow (id ${workflow.id} : ${workflow.name})`
        : `${workflow.prompt}\n\nCreate a dashboard for above with workflow id (${workflow.id} : ${workflow.name})`;

    startNewSession();
    setAssistantScope({
      accountId: accountId.toString(),
      channelId: channelId?.toString(),
      profileId: googleProfilesData?.[0]?.id ? Number(googleProfilesData[0].id) : undefined,
    });
    setInputValue(message);
    openAssistant();
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg" padding="p-0">
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <h2 className="text-xl font-agrandir font-medium text-forest-f60 mb-4">
          {isUpdate ? "Update Dashboard" : "Create Dashboard"}
        </h2>
        <p className="text-sm text-forest-f30 mb-4">
          {isUpdate
            ? "Our AI assistant will help you update this dashboard with the latest data and insights."
            : "Our AI assistant will create a customized dashboard for you based on your workflow requirements."}
        </p>
        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={false}
            className="px-3 py-2 rounded-lg text-[11px] font-medium border border-sandstorm-s40 bg-white text-forest-f60 hover:bg-sandstorm-s5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isLoadingProfiles || !workflow}
            className="create-entity-button disabled:opacity-50"
          >
            <span className="text-[10.64px] text-white font-normal">
              {isUpdate ? "Update Dashboard" : "Create Dashboard"}
            </span>
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
