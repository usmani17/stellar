import React, { useState, useEffect } from "react";
import { accountsService } from "../../services/accounts";
import { metaCampaignsService } from "../../services/meta";
import type { CreateMetaCampaignPayload, MetaCampaignStatus } from "../../types/meta";
import { Loader } from "../ui/Loader";

const META_OBJECTIVES: { value: string; label: string; caption: string }[] = [
  { value: "OUTCOME_AWARENESS", label: "Awareness", caption: "Show your ads to people who are most likely to remember them." },
  { value: "OUTCOME_TRAFFIC", label: "Traffic", caption: "Send people to a destination, like your website, app, Instagram profile or Facebook event." },
  { value: "OUTCOME_ENGAGEMENT", label: "Engagement", caption: "Get more messages, purchases through messaging, video views, interactions, Page likes or event responses." },
  { value: "OUTCOME_LEADS", label: "Leads", caption: "Collect leads for your business or brand." },
  { value: "OUTCOME_APP_PROMOTION", label: "App Promotion", caption: "Find new people to install your app and continue using it." },
  { value: "OUTCOME_SALES", label: "Sales", caption: "Find people likely to purchase your product or service." },
];

const SPECIAL_AD_CATEGORIES: { value: string; label: string; caption: string }[] = [
  { value: "NONE", label: "None", caption: "" },
  { value: "CREDIT", label: "Financial products and services", caption: "Ads for credit cards, long-term financing, checking and saving accounts, investment services, insurance services, or other related financial opportunities." },
  { value: "EMPLOYMENT", label: "Employment", caption: "Ads for job offers, internships, professional certification programs or other related opportunities." },
  { value: "HOUSING", label: "Housing", caption: "Ads for real estate listings, homeowners insurance, mortgage loans or other related opportunities." },
  { value: "ISSUES_ELECTIONS_POLITICS", label: "Social Issues, elections or politics", caption: "Ads about social issues (such as economy, or civil and social rights), elections, or political figures or campaigns." },
];

const BUYING_TYPES: { value: string; label: string; caption: string }[] = [
  { value: "AUCTION", label: "Auction", caption: "Buy in real-time with cost effective bidding." },
  { value: "RESERVATION", label: "Reservation", caption: "Buy in advance for more predictable outcomes." },
];

export interface MetaProfileOption {
  id: number;
  name: string;
  account_id?: string;
  ad_account_id?: string;
}

export interface CreateMetaCampaignPanelProps {
  channelId: number;
  onSuccess: () => void;
  onClose: () => void;
}

const inputClass =
  "campaign-input w-full";

export const CreateMetaCampaignPanel: React.FC<CreateMetaCampaignPanelProps> = ({
  channelId,
  onSuccess,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("OUTCOME_TRAFFIC");
  const [status, setStatus] = useState<MetaCampaignStatus>("PAUSED");
  const [dailyBudget, setDailyBudget] = useState<string>("");
  const [specialAdCategories, setSpecialAdCategories] = useState("NONE");
  const [buyingType, setBuyingType] = useState("AUCTION");
  const [profileId, setProfileId] = useState<number | "">("");
  const [profiles, setProfiles] = useState<MetaProfileOption[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProfilesLoading(true);
    accountsService
      .fetchMetaProfiles(channelId)
      .then((res) => {
        if (cancelled) return;
        const list = (res.profiles || []) as Array<{ id?: number; name?: string; account_id?: string }>;
        const withId = list.filter((p) => p.id != null) as MetaProfileOption[];
        setProfiles(withId);
        if (withId.length > 0 && profileId === "") {
          setProfileId(withId[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) setProfiles([]);
      })
      .finally(() => {
        if (!cancelled) setProfilesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Campaign name is required.");
      return;
    }
    if (profileId === "" || profileId == null) {
      setError("Please select an ad account.");
      return;
    }
    setSubmitLoading(true);
    try {
      const payload: CreateMetaCampaignPayload = {
        profile_id: Number(profileId),
        name: name.trim(),
        objective,
        status,
        buying_type: buyingType,
        special_ad_categories: specialAdCategories === "NONE" ? [] : [specialAdCategories],
      };
      if (dailyBudget !== "" && !Number.isNaN(Number(dailyBudget))) {
        payload.daily_budget = Number(dailyBudget);
      }
      await metaCampaignsService.createMetaCampaign(channelId, payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : err instanceof Error
          ? err.message
          : "Failed to create campaign.";
      setError(String(message));
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      <form onSubmit={handleSubmit}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-[16px] font-semibold text-[#072929]">
            Create Meta Campaign
          </h2>
        </div>

        {profilesLoading ? (
          <>
            <div className="p-4 border-b border-gray-200 py-6 flex justify-center">
              <Loader size="md" message="Loading ad accounts..." />
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="cancel-button">
                Cancel
              </button>
            </div>
          </>
        ) : profiles.length === 0 ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <p className="text-[12px] text-[#556179] py-4">
                No ad accounts found. Connect and save ad accounts in channel settings first.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="cancel-button">
                Cancel
              </button>
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
                  Campaign details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label-small">Ad account *</label>
                    <select
                      value={profileId === "" ? "" : profileId}
                      onChange={(e) => setProfileId(e.target.value === "" ? "" : Number(e.target.value))}
                      className={inputClass}
                    >
                      <option value="">Select ad account</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name || p.account_id || `Account ${p.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label-small">Campaign name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Summer Sale"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="form-label-small">Objective</label>
                    <select
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      className={inputClass}
                    >
                      {META_OBJECTIVES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-[#556179] mt-1">
                      {META_OBJECTIVES.find((o) => o.value === objective)?.caption ?? ""}
                    </p>
                  </div>
                  <div>
                    <label className="form-label-small">Buying type</label>
                    <select
                      value={buyingType}
                      onChange={(e) => setBuyingType(e.target.value)}
                      className={inputClass}
                    >
                      {BUYING_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-[#556179] mt-1">
                      {BUYING_TYPES.find((opt) => opt.value === buyingType)?.caption ?? ""}
                    </p>
                  </div>
                  <div>
                    <label className="form-label-small">Special ad categories</label>
                    <select
                      value={specialAdCategories}
                      onChange={(e) => setSpecialAdCategories(e.target.value)}
                      className={inputClass}
                    >
                      {SPECIAL_AD_CATEGORIES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {(() => {
                      const caption = SPECIAL_AD_CATEGORIES.find((opt) => opt.value === specialAdCategories)?.caption;
                      return caption ? <p className="text-[11px] text-[#556179] mt-1">{caption}</p> : null;
                    })()}
                  </div>
                  <div>
                    <label className="form-label-small">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as MetaCampaignStatus)}
                      className={inputClass}
                    >
                      <option value="PAUSED">Paused</option>
                      <option value="ACTIVE">Active</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label-small">
                      Daily budget (optional, in account currency)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={dailyBudget}
                      onChange={(e) => setDailyBudget(e.target.value)}
                      placeholder="e.g. 20.00"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="cancel-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="create-entity-button font-semibold text-[11.2px] flex items-center gap-2"
              >
                {submitLoading ? "Creating..." : "Create campaign"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};
