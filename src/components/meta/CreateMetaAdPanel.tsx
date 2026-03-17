import React, { useState, useEffect } from "react";
import { accountsService } from "../../services/accounts";
import { metaAdsService } from "../../services/meta";
import type { CreateMetaAdPayload, MetaAdStatus } from "../../types/meta";
import { Loader } from "../ui/Loader";

export interface MetaProfileOption {
  id: number;
  name: string;
}

export interface CreateMetaAdPanelProps {
  channelId: number;
  onSuccess: () => void;
  onClose: () => void;
  /** When provided (e.g. from campaign detail), filter ad sets to this campaign */
  campaignId?: string;
}

const inputClass = "campaign-input w-full";

// Simple in-memory cache for meta ad creation options.
// Lives for the lifetime of the page (cleared on full refresh).
type AdsetOption = { adset_id: string; adset_name: string };
type CreativeOption = { creative_id: string; creative_name: string };

const profilesCache = new Map<number, MetaProfileOption[]>(); // key: channelId
const adsetsCache = new Map<string, AdsetOption[]>(); // key: `${channelId}|${campaignId || ""}`
const creativesCache = new Map<number, CreativeOption[]>(); // key: channelId

export const CreateMetaAdPanel: React.FC<CreateMetaAdPanelProps> = ({
  channelId,
  onSuccess,
  onClose,
  campaignId: filterCampaignId,
}) => {
  const [name, setName] = useState("");
  const [adsetId, setAdsetId] = useState("");
  const [creativeId, setCreativeId] = useState("");
  const [status, setStatus] = useState<MetaAdStatus>("PAUSED");
  const [profileId, setProfileId] = useState<number | "">("");
  const [profiles, setProfiles] = useState<MetaProfileOption[]>([]);
  const [adsets, setAdsets] = useState<
    Array<{ adset_id: string; adset_name: string }>
  >([]);
  const [creatives, setCreatives] = useState<
    Array<{ creative_id: string; creative_name: string }>
  >([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cached = profilesCache.get(channelId);
    if (cached) {
      setProfiles(cached);
      if (cached.length > 0 && profileId === "") {
        setProfileId(cached[0].id);
      }
      setProfilesLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setProfilesLoading(true);
    accountsService
      .fetchMetaProfiles(channelId)
      .then((res) => {
        if (cancelled) return;
        const list = (res.profiles || []) as Array<{
          id?: number;
          name?: string;
        }>;
        const withId = list.filter((p) => p.id != null) as MetaProfileOption[];
        profilesCache.set(channelId, withId);
        setProfiles(withId);
        if (withId.length > 0 && profileId === "") setProfileId(withId[0].id);
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
  }, [channelId, profileId]);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `${channelId}|${filterCampaignId || ""}`;

    const cachedAdsets = adsetsCache.get(cacheKey);
    const cachedCreatives = creativesCache.get(channelId);

    if (cachedAdsets && cachedCreatives) {
      setAdsets(cachedAdsets);
      setCreatives(cachedCreatives);
      if (!adsetId && cachedAdsets.length > 0) {
        setAdsetId(cachedAdsets[0].adset_id);
      }
      if (!creativeId && cachedCreatives.length > 0) {
        setCreativeId(cachedCreatives[0].creative_id);
      }
      setOptionsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setOptionsLoading(true);
    const adsetParams = filterCampaignId
      ? {
          page: 1,
          page_size: 200,
          filters: [{ field: "campaign_id", value: filterCampaignId },
          ],
        }
      : { page: 1, page_size: 200 };
    Promise.all([
      accountsService.getMetaAdSets(channelId, adsetParams),
      accountsService.getMetaCreatives(channelId, { page: 1, page_size: 200 }),
    ])
      .then(([adsetRes, creativeRes]) => {
        if (cancelled) return;
        const mappedAdsets: AdsetOption[] = (adsetRes.adsets || [])
          .map((a: any) => ({
            adset_id: String(a.adset_id ?? ""),
            adset_name: a.adset_name ?? "",
          }))
          .filter((a: AdsetOption) => a.adset_id !== "");
        const mappedCreatives: CreativeOption[] = (creativeRes.creatives || [])
          .map((c: any) => ({
            creative_id: String(c.creative_id ?? ""),
            creative_name: c.creative_name ?? "",
          }))
          .filter((c: CreativeOption) => c.creative_id !== "");

        adsetsCache.set(cacheKey, mappedAdsets);
        creativesCache.set(channelId, mappedCreatives);

        setAdsets(mappedAdsets);
        setCreatives(mappedCreatives);
        if (!adsetId && mappedAdsets.length > 0) {
          setAdsetId(mappedAdsets[0].adset_id);
        }
        if (!creativeId && mappedCreatives.length > 0) {
          setCreativeId(mappedCreatives[0].creative_id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAdsets([]);
          setCreatives([]);
        }
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [channelId, filterCampaignId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Ad name is required.");
      return;
    }
    if (!adsetId) {
      setError("Ad set is required.");
      return;
    }
    if (!creativeId) {
      setError("Creative is required.");
      return;
    }
    if (profileId === "" || profileId == null) {
      setError("Please select an ad account.");
      return;
    }
    setSubmitLoading(true);
    try {
      const payload: CreateMetaAdPayload = {
        profile_id: Number(profileId),
        adset_id: adsetId,
        name: name.trim(),
        creative_id: creativeId,
        status,
      };
      await metaAdsService.createMetaAd(channelId, payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : err instanceof Error
            ? err.message
            : "Failed to create ad.";
      setError(String(msg));
    } finally {
      setSubmitLoading(false);
    }
  };

  const loading = profilesLoading || optionsLoading;

  const handleFillTest = () => {
    if (profiles.length > 0 && (profileId === "" || profileId == null)) {
      setProfileId(profiles[0].id);
    }
    if (adsets.length > 0 && !adsetId) {
      setAdsetId(adsets[0].adset_id);
    }
    if (creatives.length > 0 && !creativeId) {
      setCreativeId(creatives[0].creative_id);
    }
    const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
    setName((prev) =>
      prev && prev.trim().length > 0 ? prev : `Test Ad – ${ts}`,
    );
    if (!status) {
      setStatus("PAUSED");
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      <form onSubmit={handleSubmit}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-[16px] font-semibold text-[#072929]">
            Create Ad
          </h2>
        </div>

        {loading ? (
          <>
            <div className="p-4 border-b border-gray-200 py-6 flex justify-center">
              <Loader size="md" message="Loading..." />
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
                No ad accounts found. Save ad accounts in channel settings
                first.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="cancel-button">
                Cancel
              </button>
            </div>
          </>
        ) : adsets.length === 0 ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <p className="text-[12px] text-[#556179] py-4">
                No ad sets found. Create an ad set first.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="cancel-button">
                Cancel
              </button>
            </div>
          </>
        ) : creatives.length === 0 ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <p className="text-[12px] text-[#556179] py-4">
                No creatives found. Create a creative first.
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
                  Ad details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label-small">Ad account *</label>
                    <select
                      value={profileId === "" ? "" : profileId}
                      onChange={(e) =>
                        setProfileId(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      className={inputClass}
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name || `Account ${p.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label-small">Ad set *</label>
                    <select
                      value={adsetId}
                      onChange={(e) => setAdsetId(e.target.value)}
                      className={inputClass}
                    >
                      {adsets.map((a) => (
                        <option key={a.adset_id} value={a.adset_id}>
                          {a.adset_name || a.adset_id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label-small">Creative *</label>
                    <select
                      value={creativeId}
                      onChange={(e) => setCreativeId(e.target.value)}
                      className={inputClass}
                    >
                      {creatives.map((c) => (
                        <option key={c.creative_id} value={c.creative_id}>
                          {c.creative_name || c.creative_id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label-small">Ad name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Summer sale ad"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="form-label-small">Status</label>
                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value as MetaAdStatus)
                      }
                      className={inputClass}
                    >
                      <option value="PAUSED">Paused</option>
                      <option value="ACTIVE">Active</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleFillTest}
                className="secondary-button font-semibold text-[11.2px]"
              >
                Fill test data
              </button>
              <button type="button" onClick={onClose} className="cancel-button">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="create-entity-button font-semibold text-[11.2px] flex items-center gap-2"
              >
                {submitLoading ? "Creating..." : "Create ad"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};
