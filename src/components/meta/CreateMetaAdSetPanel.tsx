import React, { useState, useEffect } from "react";
import { accountsService } from "../../services/accounts";
import { metaAdSetsService } from "../../services/meta";
import type { CreateMetaAdSetPayload, MetaAdSetStatus } from "../../types/meta";
import { Loader } from "../ui/Loader";

export interface MetaProfileOption {
  id: number;
  name: string;
  account_id?: string;
}

export interface CreateMetaAdSetPanelProps {
  channelId: number;
  onSuccess: () => void;
  onClose: () => void;
  /** When provided (e.g. from campaign detail), pre-select this campaign and hide campaign dropdown */
  campaignId?: string;
  accountId?: string;
}

const inputClass =
  "campaign-input w-full";

export const CreateMetaAdSetPanel: React.FC<CreateMetaAdSetPanelProps> = ({
  channelId,
  onSuccess,
  onClose,
  campaignId: initialCampaignId,
}) => {
  const [name, setName] = useState("");
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? "");
  const [status, setStatus] = useState<MetaAdSetStatus>("PAUSED");
  const [dailyBudget, setDailyBudget] = useState<string>("");
  const [profileId, setProfileId] = useState<number | "">("");
  const [profiles, setProfiles] = useState<MetaProfileOption[]>([]);
  const [campaigns, setCampaigns] = useState<Array<{ campaign_id: string; campaign_name: string }>>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCampaignLocked = Boolean(initialCampaignId);

  useEffect(() => {
    if (initialCampaignId) {
      setCampaignId(initialCampaignId);
    }
  }, [initialCampaignId]);

  useEffect(() => {
    let cancelled = false;
    setProfilesLoading(true);
    accountsService
      .fetchMetaProfiles(channelId)
      .then((res) => {
        if (cancelled) return;
        const list = (res.profiles || []) as Array<{ id?: number; name?: string }>;
        const withId = list.filter((p) => p.id != null) as MetaProfileOption[];
        setProfiles(withId);
        if (withId.length > 0 && profileId === "") setProfileId(withId[0].id);
      })
      .catch(() => { if (!cancelled) setProfiles([]); })
      .finally(() => { if (!cancelled) setProfilesLoading(false); });
    return () => { cancelled = true; };
  }, [channelId]);

  useEffect(() => {
    if (isCampaignLocked) {
      setCampaignsLoading(false);
      return;
    }
    let cancelled = false;
    setCampaignsLoading(true);
    accountsService
      .getMetaCampaigns(channelId, { page: 1, page_size: 200 })
      .then((res) => {
        if (cancelled) return;
        const list = (res.campaigns || []).map((c: { campaign_id?: string; campaign_name?: string }) => ({
          campaign_id: String(c.campaign_id ?? ""),
          campaign_name: c.campaign_name ?? "",
        })).filter((c: { campaign_id: string }) => c.campaign_id);
        setCampaigns(list);
        if (list.length > 0 && !campaignId) setCampaignId(list[0].campaign_id);
      })
      .catch(() => { if (!cancelled) setCampaigns([]); })
      .finally(() => { if (!cancelled) setCampaignsLoading(false); });
    return () => { cancelled = true; };
  }, [channelId, isCampaignLocked, campaignId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Ad set name is required."); return; }
    if (!campaignId) { setError("Campaign is required."); return; }
    if (profileId === "" || profileId == null) { setError("Please select an ad account."); return; }
    setSubmitLoading(true);
    try {
      const payload: CreateMetaAdSetPayload = {
        profile_id: Number(profileId),
        campaign_id: campaignId,
        name: name.trim(),
        status,
      };
      if (dailyBudget !== "" && !Number.isNaN(Number(dailyBudget))) payload.daily_budget = Number(dailyBudget);
      await metaAdSetsService.createMetaAdSet(channelId, payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : err instanceof Error ? err.message : "Failed to create ad set.";
      setError(String(msg));
    } finally {
      setSubmitLoading(false);
    }
  };

  const loading = profilesLoading || (campaignsLoading && !isCampaignLocked);

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      <form onSubmit={handleSubmit}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-[16px] font-semibold text-[#072929]">
            Create Ad Set
          </h2>
        </div>

        {loading ? (
          <>
            <div className="p-4 border-b border-gray-200 py-6 flex justify-center">
              <Loader size="md" message="Loading..." />
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
            </div>
          </>
        ) : profiles.length === 0 ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <p className="text-[12px] text-[#556179] py-4">
                No ad accounts found. Save ad accounts in channel settings first.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
            </div>
          </>
        ) : (isCampaignLocked && !campaignId) || (!isCampaignLocked && campaigns.length === 0) ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <p className="text-[12px] text-[#556179] py-4">
                No campaigns found. Create a campaign first.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border-b border-gray-200">
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-800">
                  {error}
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-[14px] font-semibold text-[#072929] mb-4">
                  Ad set details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label-small">Ad account *</label>
                    <select
                      value={profileId === "" ? "" : profileId}
                      onChange={(e) => setProfileId(e.target.value === "" ? "" : Number(e.target.value))}
                      className={inputClass}
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.name || `Account ${p.id}`}</option>
                      ))}
                    </select>
                  </div>
                  {!isCampaignLocked && (
                    <div>
                      <label className="form-label-small">Campaign *</label>
                      <select
                        value={campaignId}
                        onChange={(e) => setCampaignId(e.target.value)}
                        className={inputClass}
                      >
                        {campaigns.map((c) => (
                          <option key={c.campaign_id} value={c.campaign_id}>{c.campaign_name || c.campaign_id}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="form-label-small">Ad set name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. US 18-35"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="form-label-small">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as MetaAdSetStatus)}
                      className={inputClass}
                    >
                      <option value="PAUSED">Paused</option>
                      <option value="ACTIVE">Active</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label-small">Daily budget (optional)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={dailyBudget}
                      onChange={(e) => setDailyBudget(e.target.value)}
                      placeholder="e.g. 10.00"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="cancel-button">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="create-entity-button font-semibold text-[11.2px] flex items-center gap-2"
              >
                {submitLoading ? "Creating..." : "Create ad set"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};
