import React, { useState } from "react";
import { BaseModal } from "../../../components/ui";
import { createDashboard } from "../../../services/dashboard";
import { FULL_TEST_DASHBOARD_CONFIG } from "../constants/fullTestDashboard";
import { useChannels } from "../../../hooks/queries/useChannels";
import { useGoogleProfiles } from "../../../hooks/queries/useGoogleProfiles";

interface CreateDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: number;
  accountId?: number;
  onCreated?: (data: any) => void;
}

export const CreateDashboardModal: React.FC<CreateDashboardModalProps> = ({
  isOpen,
  onClose,
  workflowId,
  accountId,
  onCreated,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: channels = [] } = useChannels(accountId);
  const channelId = channels.length > 0 ? channels[0].id : undefined;
  const isGoogle = channels[0].channel_type === "google";
  const googleChannelId = isGoogle ? channelId : undefined;
  const {
    data: googleProfilesData,
    isLoading: isLoadingProfiles,
  } : { data: any, isLoading: boolean } = useGoogleProfiles(googleChannelId);
  const handleCreate = async () => {
    if (!accountId) {
      setError("Account ID is required");
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const data = await createDashboard(accountId, {
        name: "Workflow Dashboard",
        platform: "google",
        profileId: googleProfilesData?.[0]?.id,
        channelId: channelId,
        config: FULL_TEST_DASHBOARD_CONFIG,
        workflowId,
      });
      onCreated?.(data);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create dashboard";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg" padding="p-0">
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <h2 className="text-xl font-agrandir font-medium text-forest-f60 mb-4">
          Create Dashboard
        </h2>
        <p className="text-sm text-forest-f30 mb-4">
          Create a dashboard with campaign performance, multi-GAQL joins,
          workflow runs, daily spend chart, and keyword spend.
        </p>
        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="px-3 py-2 rounded-lg text-[11px] font-medium border border-sandstorm-s40 bg-white text-forest-f60 hover:bg-sandstorm-s5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating || isLoadingProfiles}
            className="create-entity-button disabled:opacity-50"
          >
            <span className="text-[10.64px] text-white font-normal">
              {isCreating ? "Creating..." : "Create Dashboard"}
            </span>
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
