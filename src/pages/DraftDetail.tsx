import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { Assistant } from "../components/layout/Assistant";
import { AccountsHeader } from "../components/layout/AccountsHeader";
import { entitiesDraftsService, type EntityDraft } from "../services/entitiesDrafts";
import { formatPlatform, formatCurrentStatus, formatCampaignType } from "../utils/formatDraftLabels";
import { Alert, Loader } from "../components/ui";

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

export const DraftDetail: React.FC = () => {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();

  const [draft, setDraft] = useState<EntityDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!draftId) {
      setLoading(false);
      setError("Missing draft ID");
      return;
    }
    setLoading(true);
    setError("");
    entitiesDraftsService
      .getById(draftId)
      .then(setDraft)
      .catch((err) => {
        const status = err.response?.status;
        const msg = err.response?.data?.error ?? "Failed to load draft";
        setError(status === 404 ? "Draft not found." : msg);
      })
      .finally(() => setLoading(false));
  }, [draftId]);

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
      <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
        <AccountsHeader />
        <Assistant>
          <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white overflow-x-hidden min-w-0">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/drafts")}
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
                  onClick={() => navigate("/drafts")}
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
                <h1 className="text-[20px] sm:text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                  Draft: {draft.name ?? draft.draft_id}
                </h1>

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

                  <section>
                    <h2 className="text-[16px] font-semibold text-[#072929] mb-2">Generated JSON</h2>
                    <div className="rounded-xl border border-[#e8e8e3] bg-[#f9f9f6] max-h-[280px] min-h-0 overflow-hidden">
                      <pre className="p-4 text-[13px] font-mono whitespace-pre-wrap break-all overflow-auto h-full max-h-[280px] m-0">
                        {draftJsonString || "{}"}
                      </pre>
                    </div>
                  </section>
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
