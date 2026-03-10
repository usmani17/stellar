import React, { useState } from "react";
import { metaCampaignsService } from "../../services/meta";
import type { UpdateMetaCampaignPayload, MetaCampaignStatus } from "../../types/meta";

export interface EditMetaCampaignPanelProps {
  channelId: number;
  campaignId: string;
  initialName: string;
  initialStatus?: string;
  initialDailyBudget?: number;
  onSuccess: () => void;
  onClose: () => void;
}

export const EditMetaCampaignPanel: React.FC<EditMetaCampaignPanelProps> = ({
  channelId,
  campaignId,
  initialName,
  initialStatus = "PAUSED",
  initialDailyBudget,
  onSuccess,
  onClose,
}) => {
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<MetaCampaignStatus>(
    (initialStatus?.toUpperCase() as MetaCampaignStatus) || "PAUSED"
  );
  const [dailyBudget, setDailyBudget] = useState<string>(
    initialDailyBudget != null ? String(initialDailyBudget) : ""
  );
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload: UpdateMetaCampaignPayload = {};
    if (name.trim() !== initialName) payload.name = name.trim();
    if (status !== (initialStatus?.toUpperCase() || "PAUSED")) payload.status = status;
    const budgetNum = dailyBudget !== "" ? Number(dailyBudget) : undefined;
    if (budgetNum !== undefined && !Number.isNaN(budgetNum) && budgetNum !== initialDailyBudget) {
      payload.daily_budget = budgetNum;
    }
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    setSubmitLoading(true);
    try {
      await metaCampaignsService.updateMetaCampaign(channelId, campaignId, payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : err instanceof Error
            ? err.message
            : "Failed to update campaign.";
      setError(String(message));
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-[#f9f9f6] mb-4">
      <h3 className="text-[14px] font-semibold text-[#072929] mb-4">Edit campaign</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-800">{error}</div>
        )}
        <div>
          <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">Campaign name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full max-w-md bg-[#FEFEFB] px-4 py-2.5 border border-gray-200 rounded-lg text-[12px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
          />
        </div>
        <div>
          <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as MetaCampaignStatus)}
            className="w-full max-w-md bg-[#FEFEFB] px-4 py-2.5 border border-gray-200 rounded-lg text-[12px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
          >
            <option value="PAUSED">Paused</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div>
          <label className="block text-[10.64px] font-semibold text-[#556179] mb-1 uppercase">
            Daily budget (optional)
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={dailyBudget}
            onChange={(e) => setDailyBudget(e.target.value)}
            placeholder="e.g. 20.00"
            className="w-full max-w-md bg-[#FEFEFB] px-4 py-2.5 border border-gray-200 rounded-lg text-[12px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
          />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button type="submit" disabled={submitLoading} className="create-entity-button btn-sm">
            {submitLoading ? "Saving..." : "Save"}
          </button>
          <button type="button" onClick={onClose} className="cancel-button">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
