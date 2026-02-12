import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { Assistant } from "../components/layout/Assistant";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { entitiesDraftsService, type EntityDraft } from "../services/ai/entitiesDrafts";
import { formatPlatform, formatCurrentStatus, formatCampaignType } from "../utils/formatDraftLabels";
import { Alert, Loader } from "../components/ui";
import { CreateGoogleCampaignPanel, type CreateGoogleCampaignData } from "../components/google/CreateGoogleCampaignPanel";
import { getDefaultFormData } from "../components/google/campaigns/utils";
import { googleAdwordsCampaignsService } from "../services/googleAdwords/googleAdwordsCampaigns";
import { SHOULD_CREATE_ASSET_GROUP_ON_PMAX_CREATION } from "../components/google/CreateGooglePmaxAssetGroupPanel";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function parseDraftToInitialData(draft: EntityDraft): Partial<CreateGoogleCampaignData> | null {
  const rawJson = draft.draft_json;
  if (rawJson == null) return null;
  let parsed: Record<string, unknown>;
  if (typeof rawJson === "string") {
    try {
      parsed = JSON.parse(rawJson) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else {
    parsed = rawJson as Record<string, unknown>;
  }
  const ct = ((draft.campaign_type || parsed.campaign_type) as string) || "SEARCH";
  const campaignType = String(ct).toUpperCase();
  const defaults = getDefaultFormData(campaignType) as CreateGoogleCampaignData;
  const merged: Partial<CreateGoogleCampaignData> = {
    ...defaults,
    campaign_type: (defaults.campaign_type || campaignType || "SEARCH") as CreateGoogleCampaignData["campaign_type"],
    ...(parsed as Partial<CreateGoogleCampaignData>),
  };
  if (draft.profile_id && !merged.profile_id) {
    merged.profile_id = String(draft.profile_id);
  }
  // Normalize types for form compatibility
  if (merged.budget_amount != null && typeof merged.budget_amount !== "number") {
    const num = parseFloat(String(merged.budget_amount));
    merged.budget_amount = !isNaN(num) ? num : 0;
  }
  if (merged.name != null && typeof merged.name !== "string") {
    merged.name = String(merged.name);
  }
  if (merged.start_date != null && typeof merged.start_date === "string" && merged.start_date.length >= 10) {
    merged.start_date = merged.start_date.slice(0, 10);
  }
  if (merged.end_date != null && typeof merged.end_date === "string" && merged.end_date.length >= 10) {
    merged.end_date = merged.end_date.slice(0, 10);
  }
  return merged;
}

export const DraftDetail: React.FC = () => {
  const { accountId: accountIdParam, channelId: channelIdParam, draftId } = useParams<{ accountId?: string; channelId?: string; draftId: string }>();
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();

  const accountIdNum = accountIdParam != null ? parseInt(accountIdParam, 10) : null;
  const channelIdNum = channelIdParam != null ? parseInt(channelIdParam, 10) : null;
  const isGoogleScoped = accountIdNum != null && !isNaN(accountIdNum) && channelIdNum != null && !isNaN(channelIdNum);
  const draftsListPath = isGoogleScoped ? `/brands/${accountIdNum}/${channelIdNum}/google/drafts` : "/drafts";

  const [draft, setDraft] = useState<EntityDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<{ campaignId: string | number; campaignName: string } | null>(null);

  useEffect(() => {
    if (!draftId) {
      setLoading(false);
      setError("Missing draft ID");
      return;
    }
    setLoading(true);
    setError("");
    entitiesDraftsService
      .getById(draftId, accountIdNum ?? undefined, channelIdNum ?? undefined)
      .then(setDraft)
      .catch((err) => {
        const status = err.response?.status;
        const msg = err.response?.data?.error ?? "Failed to load draft";
        setError(status === 404 ? "Draft not found." : msg);
      })
      .finally(() => setLoading(false));
  }, [draftId, accountIdNum, channelIdNum]);

  const canPublish =
    draft &&
    (draft.status || "").toLowerCase() === "draft" &&
    (draft.platform || "").toLowerCase() === "google" &&
    (draft.level || "").toLowerCase() === "campaign";

  const handlePublish = () => {
    if (!draftId || !draft || publishLoading) return;
    setPublishLoading(true);
    setPublishError("");
    setPublishSuccess(false);
    entitiesDraftsService
      .publish(draftId, accountIdNum ?? undefined, channelIdNum ?? undefined)
      .then((res) => {
        setPublishSuccess(true);
        if (res.draft) setDraft(res.draft);
      })
      .catch((err) => {
        const msg = err.response?.data?.error ?? "Failed to publish draft";
        setPublishError(msg);
      })
      .finally(() => setPublishLoading(false));
  };

  const isGoogleCampaignDraft =
    draft &&
    (draft.platform || "").toLowerCase() === "google" &&
    (draft.level || "").toLowerCase() === "campaign";

  const initialCampaignData = useMemo(() => {
    if (!draft || !isGoogleCampaignDraft) return null;
    return parseDraftToInitialData(draft);
  }, [draft, isGoogleCampaignDraft]);

  const handleCreateGoogleCampaign = async (data: CreateGoogleCampaignData) => {
    if (!accountIdNum || !channelIdNum || isNaN(accountIdNum) || isNaN(channelIdNum)) {
      setCreateError("Account and channel are required");
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(null);
    try {
      let payload: Record<string, unknown> = { ...(data as unknown as Record<string, unknown>) };
      if (draft?.profile_id && !payload.profile_id) {
        payload.profile_id = String(draft.profile_id);
      }
      if (
        data.campaign_type === "PERFORMANCE_MAX" &&
        !SHOULD_CREATE_ASSET_GROUP_ON_PMAX_CREATION
      ) {
        const {
          asset_group_name,
          headlines,
          descriptions,
          long_headlines,
          marketing_image_url,
          square_marketing_image_url,
          headline_asset_resource_names,
          description_asset_resource_names,
          long_headline_asset_resource_names,
          marketing_image_asset_resource_name,
          square_marketing_image_asset_resource_name,
          video_asset_resource_names,
          sitelink_asset_resource_names,
          callout_asset_resource_names,
          headline_asset_ids,
          description_asset_ids,
          long_headline_asset_ids,
          marketing_image_asset_id,
          square_marketing_image_asset_id,
          video_asset_ids,
          sitelink_asset_ids,
          callout_asset_ids,
          ...rest
        } = payload;
        payload = rest;
      }
      const response = await googleAdwordsCampaignsService.createGoogleCampaign(
        accountIdNum,
        channelIdNum,
        payload as Parameters<typeof googleAdwordsCampaignsService.createGoogleCampaign>[2]
      );
      const newCampaignId = response?.campaign_id;
      setCreateSuccess({
        campaignId: newCampaignId ?? "",
        campaignName: data.name,
      });
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: string } }; message?: string };
      const msg =
        errObj?.response?.data?.error ??
        errObj?.message ??
        "Failed to create campaign";
      setCreateError(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  const rawJson = draft?.draft_json;
  const draftJsonString =
    rawJson == null
      ? ""
      : typeof rawJson === "string"
        ? (() => {
            try {
              return JSON.stringify(JSON.parse(rawJson), null, 2);
            } catch {
              return rawJson;
            }
          })()
        : JSON.stringify(rawJson, null, 2);

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <div className="flex-1 min-w-0 w-full flex flex-col" style={{ marginLeft: `${sidebarWidth}px` }}>
        <DashboardHeader />
        <Assistant>
          <div className="px-4 pt-[104px] pb-6 sm:px-6 lg:px-8 lg:pt-[112px] lg:pb-8 bg-white overflow-x-hidden min-w-0">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(draftsListPath)}
                className="text-sm text-forest-f60 hover:underline"
              >
                ← Drafts
              </button>
            </div>

            {error && (
              <Alert variant="error">
                {error}{" "}
                <button
                  type="button"
                  onClick={() => navigate(draftsListPath)}
                  className="underline ml-1"
                >
                  Back to list
                </button>
              </Alert>
            )}

            {loading && (
              <div className="flex justify-center py-12">
                <Loader size="md" message="Loading draft..." />
              </div>
            )}

            {!loading && draft && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h1 className="text-[20px] sm:text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                    Draft: {draft.name ?? draft.draft_id}
                  </h1>
                  {canPublish && !isGoogleCampaignDraft && (
                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={publishLoading}
                      className="px-4 py-2 text-sm font-medium bg-[#136D6D] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {publishLoading ? "Publishing…" : "Publish"}
                    </button>
                  )}
                </div>

                {publishSuccess && (
                  <Alert variant="success">Draft published successfully. Status updated.</Alert>
                )}
                {publishError && (
                  <Alert variant="error">
                    {publishError}
                  </Alert>
                )}
                {createSuccess && (
                  <Alert variant="success">
                    Campaign &quot;{createSuccess.campaignName}&quot; created successfully!{" "}
                    {createSuccess.campaignId && (
                      <button
                        type="button"
                        onClick={() =>
                          accountIdNum &&
                          channelIdNum &&
                          navigate(
                            `/brands/${accountIdNum}/${channelIdNum}/google/campaigns/${createSuccess.campaignId}`
                          )
                        }
                        className="underline ml-1 font-medium"
                      >
                        View Campaign
                      </button>
                    )}
                  </Alert>
                )}
                {createError && (
                  <Alert variant="error">{createError}</Alert>
                )}

                <div className="space-y-6">
                  {/* Overview */}
                  <section className="rounded-xl border border-[#e8e8e3] bg-[#fefefb] p-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-[#556179] mb-3">Overview</h2>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div><dt className="text-[#556179]">Platform</dt><dd className="font-medium text-[#072929]">{formatPlatform(draft.platform)}</dd></div>
                      <div><dt className="text-[#556179]">Status</dt><dd className="font-medium text-[#072929]">{formatCurrentStatus(draft.status)}</dd></div>
                      {draft.campaign_type && (
                        <div><dt className="text-[#556179]">Campaign type</dt><dd className="font-medium text-[#072929]">{formatCampaignType(draft.campaign_type)}</dd></div>
                      )}
                      <div><dt className="text-[#556179]">Updated</dt><dd className="text-[#072929]">{formatDate(draft.updated_at)}</dd></div>
                    </dl>
                  </section>

                  {/* Context: Account, Integration, Profile, User (names only) */}
                  <section className="rounded-xl border border-[#e8e8e3] bg-[#fefefb] p-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-[#556179] mb-3">Context</h2>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div><dt className="text-[#556179]">Account</dt><dd className="font-medium text-[#072929]">{draft.account_name ?? "—"}</dd></div>
                      <div><dt className="text-[#556179]">Integration</dt><dd className="font-medium text-[#072929]">{draft.integration_name ?? "—"}</dd></div>
                      <div><dt className="text-[#556179]">Profile</dt><dd className="font-medium text-[#072929]">{draft.profile_name ?? "—"}</dd></div>
                      <div><dt className="text-[#556179]">Created by</dt><dd className="font-medium text-[#072929]">{draft.user_name ?? "—"}</dd></div>
                    </dl>
                  </section>

                  {(draft.reviewed_at != null || (draft.review_notes != null && draft.review_notes !== "")) && (
                    <section className="rounded-xl border border-[#e8e8e3] bg-[#fefefb] p-4">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#556179] mb-3">Review</h2>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        {draft.reviewed_at != null && <div><dt className="text-[#556179]">Reviewed</dt><dd className="text-[#072929]">{formatDate(draft.reviewed_at)} by {draft.reviewed_by ?? "—"}</dd></div>}
                        {draft.review_notes != null && draft.review_notes !== "" && <div className="sm:col-span-2"><dt className="text-[#556179]">Notes</dt><dd className="text-[#072929]">{draft.review_notes}</dd></div>}
                      </dl>
                    </section>
                  )}

                  {(draft.applied_at != null || draft.applied_entity_id != null) && (
                    <section className="rounded-xl border border-[#e8e8e3] bg-[#fefefb] p-4">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#556179] mb-3">Applied</h2>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        {draft.applied_at != null && <div><dt className="text-[#556179]">Applied at</dt><dd className="text-[#072929]">{formatDate(draft.applied_at)}</dd></div>}
                        {draft.applied_entity_id != null && <div><dt className="text-[#556179]">Entity</dt><dd className="text-[#072929] font-mono text-xs">{draft.applied_entity_id}</dd></div>}
                      </dl>
                    </section>
                  )}

                  {draft.error && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                      <p className="text-[#556179] text-xs font-semibold uppercase tracking-wide mb-1">Error</p>
                      <p className="text-red-800 text-sm whitespace-pre-wrap">{draft.error}</p>
                    </div>
                  )}

                  {isGoogleCampaignDraft && accountIdNum && channelIdNum ? (
                    <section>
                      <CreateGoogleCampaignPanel
                        isOpen={true}
                        onClose={() => navigate(draftsListPath)}
                        onSubmit={handleCreateGoogleCampaign}
                        accountId={String(accountIdNum)}
                        channelId={String(channelIdNum)}
                        loading={createLoading}
                        submitError={createError}
                        mode="create"
                        initialData={initialCampaignData}
                        hideProfileSelector={true}
                        hideCampaignType={true}
                      />
                    </section>
                  ) : (
                    <section>
                      <h2 className="text-[16px] font-semibold text-[#072929] mb-2">Generated JSON</h2>
                      <div className="rounded-xl border border-[#e8e8e3] bg-[#f9f9f6] max-h-[280px] min-h-0 overflow-hidden">
                        <pre className="p-4 text-[13px] font-mono whitespace-pre-wrap break-all overflow-auto h-full max-h-[280px] m-0">
                          {draftJsonString || "{}"}
                        </pre>
                      </div>
                    </section>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        </Assistant>
      </div>
    </div>
  );
};
