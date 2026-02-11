import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSidebar } from "../contexts/SidebarContext";
import { Sidebar } from "../components/layout/Sidebar";
import { Assistant } from "../components/layout/Assistant";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import { entitiesDraftsService, type EntityDraftListItem, type EntityDraft } from "../services/ai/entitiesDrafts";
import { formatPlatform, formatCurrentStatus, formatCampaignType } from "../utils/formatDraftLabels";
import { Alert, Loader, BaseModal } from "../components/ui";
import { Dropdown } from "../components/ui/Dropdown";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "pending_apply", label: "Pending Apply" },
  { value: "applying", label: "Applying" },
  { value: "applied", label: "Applied" },
  { value: "failed", label: "Failed" },
];

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
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

export const DraftsList: React.FC = () => {
  const { accountId: accountIdParam, channelId: channelIdParam } = useParams<{ accountId?: string; channelId?: string }>();
  const { user } = useAuth();
  const { sidebarWidth } = useSidebar();
  const workspaceId = user?.workspace?.id;

  const accountIdNum = accountIdParam != null ? parseInt(accountIdParam, 10) : null;
  const channelIdNum = channelIdParam != null ? parseInt(channelIdParam, 10) : null;
  const isGoogleScoped = accountIdNum != null && !isNaN(accountIdNum) && channelIdNum != null && !isNaN(channelIdNum);

  const [drafts, setDrafts] = useState<EntityDraftListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewDraftId, setViewDraftId] = useState<string | null>(null);
  const [viewDraft, setViewDraft] = useState<EntityDraft | null>(null);
  const [viewDraftLoading, setViewDraftLoading] = useState(false);
  const [viewDraftError, setViewDraftError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [publishSuccess, setPublishSuccess] = useState(false);

  useEffect(() => {
    setPageTitle("Drafts");
    return () => resetPageTitle();
  }, []);

  const effectiveAccountId = accountIdNum ?? undefined;
  const effectiveIntegrationId = channelIdNum ?? undefined;

  const fetchDrafts = useCallback(() => {
    if (workspaceId == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    entitiesDraftsService
      .list({
        workspace_id: workspaceId,
        page,
        page_size: pageSize,
        status: statusFilter || undefined,
        account_id: effectiveAccountId,
        channel_id: effectiveIntegrationId,
        order_by: "created_at",
        order: "desc",
      })
      .then((data) => {
        setDrafts(data.drafts);
        setTotal(data.total);
      })
      .catch(() => setError("Failed to load drafts"))
      .finally(() => setLoading(false));
  }, [workspaceId, page, pageSize, statusFilter, effectiveAccountId, effectiveIntegrationId]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, isGoogleScoped]);

  useEffect(() => {
    if (workspaceId == null) return;
    entitiesDraftsService
      .getFilterOptions(String(workspaceId), effectiveAccountId, effectiveIntegrationId)
      .catch(() => {});
  }, [workspaceId, effectiveAccountId, effectiveIntegrationId]);

  useEffect(() => {
    if (!viewDraftId) {
      setViewDraft(null);
      setViewDraftError("");
      setPublishError("");
      setPublishSuccess(false);
      return;
    }
    setViewDraftLoading(true);
    setViewDraftError("");
    setPublishError("");
    setPublishSuccess(false);
    entitiesDraftsService
      .getById(viewDraftId, effectiveAccountId, effectiveIntegrationId)
      .then((d) => {
        setViewDraft(d);
        setViewDraftLoading(false);
      })
      .catch((err) => {
        setViewDraftError(err.response?.data?.error ?? "Failed to load draft");
        setViewDraftLoading(false);
      });
  }, [viewDraftId]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleRefresh = () => {
    setRefreshing(true);
    if (workspaceId == null) {
      setRefreshing(false);
      return;
    }
    setError("");
    entitiesDraftsService
      .list({
        workspace_id: workspaceId,
        page,
        page_size: pageSize,
        status: statusFilter || undefined,
        account_id: effectiveAccountId,
        channel_id: effectiveIntegrationId,
        order_by: "created_at",
        order: "desc",
      })
      .then((data) => {
        setDrafts(data.drafts);
        setTotal(data.total);
      })
      .catch(() => setError("Failed to load drafts"))
      .finally(() => setRefreshing(false));
  };

  const viewDraftJsonString =
    viewDraft?.draft_json == null
      ? ""
      : typeof viewDraft.draft_json === "string"
        ? (() => {
            try {
              return JSON.stringify(JSON.parse(viewDraft.draft_json), null, 2);
            } catch {
              return viewDraft.draft_json;
            }
          })()
        : JSON.stringify(viewDraft.draft_json, null, 2);

  const canPublish =
    viewDraft &&
    viewDraftId &&
    (viewDraft.status || "").toLowerCase() === "draft" &&
    (viewDraft.platform || "").toLowerCase() === "google" &&
    (viewDraft.level || "").toLowerCase() === "campaign";

  const handlePublish = () => {
    if (!viewDraftId || !viewDraft || publishLoading) return;
    setPublishLoading(true);
    setPublishError("");
    setPublishSuccess(false);
    entitiesDraftsService
      .publish(viewDraftId, effectiveAccountId, effectiveIntegrationId)
      .then((res) => {
        setPublishSuccess(true);
        if (res.draft) setViewDraft(res.draft);
        fetchDrafts();
      })
      .catch((err) => {
        setPublishError(err.response?.data?.error ?? "Failed to publish draft");
      })
      .finally(() => setPublishLoading(false));
  };

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <div className="flex-1 min-w-0 w-full flex flex-col" style={{ marginLeft: `${sidebarWidth}px` }}>
        <DashboardHeader />
        <Assistant>
          <div className="px-4 pt-[104px] pb-6 sm:px-6 lg:px-8 lg:pt-[112px] lg:pb-8 bg-white overflow-x-hidden min-w-0">
          <div className="space-y-6">
            {error && (
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <h1 className="text-[20px] sm:text-[22.8px] font-medium text-[#072929] leading-[1.26]">
                  Drafts
                </h1>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={loading || refreshing || !workspaceId}
                  className="p-2 rounded-lg text-[#556179] hover:bg-[#f0f0eb] hover:text-[#072929] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Refresh list"
                  aria-label="Refresh list"
                >
                  <svg
                    className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex flex-nowrap items-center gap-3 shrink-0">
                <Dropdown<string>
                  options={STATUS_OPTIONS}
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v)}
                  placeholder="Status"
                  buttonClassName="edit-button w-[160px]"
                  align="right"
                />
              </div>
            </div>

            <div className="relative">
              <div
                className="table-container"
                style={{ position: "relative", minHeight: loading ? "400px" : "auto" }}
              >
                <div className="overflow-x-auto w-full">
                  {!workspaceId ? (
                    <p className="text-[#556179] py-8">No workspace found. Contact your admin.</p>
                  ) : drafts.length === 0 && !loading ? (
                    <div className="flex flex-col items-center justify-center h-[400px] w-full py-12 px-6">
                      <div className="flex flex-col items-center justify-center max-w-md">
                        <div className="mb-6 w-20 h-20 rounded-full bg-[#F5F5F0] flex items-center justify-center">
                          <svg
                            className="w-10 h-10 text-[#556179]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-teal-950 mb-2">No drafts yet</h3>
                        <p className="text-sm text-[#556179] text-center leading-relaxed">
                          Drafts from the assistant will appear here when you create campaigns or other entities.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <table className="min-w-[800px] w-full">
                      <thead className="">
                        <tr className="border-b border-[#e8e8e3]">
                          <th className="table-header min-w-[200px]">Name</th>
                          <th className="table-header min-w-[100px]">Platform</th>
                          <th className="table-header min-w-[100px]">Status</th>
                          <th className="table-header min-w-[160px]">Created</th>
                          <th className="table-header min-w-[80px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drafts.map((d) => (
                          <tr
                            key={d.draft_id}
                            className="table-row group cursor-pointer hover:bg-[#f9f9f6]"
                            onClick={() => setViewDraftId(d.draft_id)}
                          >
                            <td className="table-cell">
                              <span className="table-text leading-[1.26]">
                                {d.name ?? "—"}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="table-text leading-[1.26]">{formatPlatform(d.platform)}</span>
                            </td>
                            <td className="table-cell">
                              <span className="table-text leading-[1.26] text-[#556179]">
                                {formatCurrentStatus(d.status)}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="table-text leading-[1.26] text-[#556179]">
                                {formatDate(d.created_at)}
                              </span>
                            </td>
                            <td className="table-cell">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewDraftId(d.draft_id);
                                }}
                                className="text-sm text-forest-f60 hover:underline"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {loading && (
                  <div className="loading-overlay">
                    <div className="loading-overlay-content">
                      <Loader size="md" message="Loading drafts..." />
                    </div>
                  </div>
                )}
              </div>

              {!loading && total > 0 && totalPages > 1 && (
                <div className="flex items-center justify-end mt-4">
                  <div className="flex items-center border border-[#EBEBEB] rounded-lg bg-[#fefefb] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-2 border-r border-gray-200 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (page <= 3) pageNum = i + 1;
                      else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = page - 2 + i;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setPage(pageNum)}
                          className={`px-3 py-2 border-r border-gray-200 text-[10.64px] min-w-[40px] cursor-pointer ${
                            page === pageNum
                              ? "bg-white text-[#136D6D] font-semibold"
                              : "text-black hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-2 text-[10.64px] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </Assistant>
      </div>

      <BaseModal
        isOpen={!!viewDraftId}
        onClose={() => setViewDraftId(null)}
        maxWidth="max-w-3xl"
        maxHeight="max-h-[85vh]"
        containerClassName="p-0"
        closeOnBackdropClick
      >
        <div className="flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[#e8e8e3] shrink-0">
            <h2 className="text-lg font-semibold text-[#072929] truncate min-w-0">
              Draft: {viewDraft?.name ?? drafts.find((d) => d.draft_id === viewDraftId)?.name ?? viewDraftId ?? "—"}
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              {canPublish && (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishLoading}
                  className="px-3 py-1.5 text-sm font-medium bg-[#136D6D] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {publishLoading ? "Publishing…" : "Publish"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewDraftId(null)}
                className="p-1 rounded hover:bg-[#f0f0eb] text-[#556179]"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="overflow-y-auto p-6">
            {publishSuccess && (
              <Alert variant="success" className="mb-4">Draft published successfully. Status updated.</Alert>
            )}
            {publishError && (
              <Alert variant="error" className="mb-4">{publishError}</Alert>
            )}
            {viewDraftLoading && (
              <div className="flex justify-center py-12">
                <Loader size="md" message="Loading draft..." />
              </div>
            )}
            {viewDraftError && !viewDraftLoading && (
              <div className="space-y-3">
                <Alert variant="error">{viewDraftError}</Alert>
                <button
                  type="button"
                  onClick={() => setViewDraftId(null)}
                  className="text-sm text-forest-f60 hover:underline"
                >
                  Close
                </button>
              </div>
            )}
            {!viewDraftLoading && !viewDraftError && viewDraft && (
              <>
                <div className="space-y-4">
                  {/* Overview */}
                  <section className="rounded-xl border border-[#e8e8e3] bg-[#fefefb] p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[#556179] mb-3">Overview</h3>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div><dt className="text-[#556179]">Platform</dt><dd className="font-medium text-[#072929]">{formatPlatform(viewDraft.platform)}</dd></div>
                      <div><dt className="text-[#556179]">Status</dt><dd className="font-medium text-[#072929]">{formatCurrentStatus(viewDraft.status)}</dd></div>
                      {viewDraft.campaign_type && <div><dt className="text-[#556179]">Campaign type</dt><dd className="font-medium text-[#072929]">{formatCampaignType(viewDraft.campaign_type)}</dd></div>}
                      <div><dt className="text-[#556179]">Updated</dt><dd className="text-[#072929]">{formatDate(viewDraft.updated_at)}</dd></div>
                    </dl>
                  </section>

                  {/* Context: names only */}
                  <section className="rounded-xl border border-[#e8e8e3] bg-[#fefefb] p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[#556179] mb-3">Context</h3>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div><dt className="text-[#556179]">Account</dt><dd className="font-medium text-[#072929]">{viewDraft.account_name ?? "—"}</dd></div>
                      <div><dt className="text-[#556179]">Integration</dt><dd className="font-medium text-[#072929]">{viewDraft.integration_name ?? "—"}</dd></div>
                      <div><dt className="text-[#556179]">Profile</dt><dd className="font-medium text-[#072929]">{viewDraft.profile_name ?? "—"}</dd></div>
                      <div><dt className="text-[#556179]">Created by</dt><dd className="font-medium text-[#072929]">{viewDraft.user_name ?? "—"}</dd></div>
                    </dl>
                  </section>

                  {(viewDraft.reviewed_at != null || (viewDraft.review_notes != null && viewDraft.review_notes !== "")) && (
                    <section className="rounded-xl border border-[#e8e8e3] bg-[#fefefb] p-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#556179] mb-3">Review</h3>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        {viewDraft.reviewed_at != null && <div><dt className="text-[#556179]">Reviewed</dt><dd className="text-[#072929]">{formatDate(viewDraft.reviewed_at)} by {viewDraft.reviewed_by ?? "—"}</dd></div>}
                        {viewDraft.review_notes != null && viewDraft.review_notes !== "" && <div className="col-span-2"><dt className="text-[#556179]">Notes</dt><dd className="text-[#072929]">{viewDraft.review_notes}</dd></div>}
                      </dl>
                    </section>
                  )}

                  {(viewDraft.applied_at != null || viewDraft.applied_entity_id != null) && (
                    <section className="rounded-xl border border-[#e8e8e3] bg-[#fefefb] p-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#556179] mb-3">Applied</h3>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        {viewDraft.applied_at != null && <div><dt className="text-[#556179]">Applied at</dt><dd className="text-[#072929]">{formatDate(viewDraft.applied_at)}</dd></div>}
                        {viewDraft.applied_entity_id != null && <div><dt className="text-[#556179]">Entity</dt><dd className="text-[#072929] font-mono text-xs">{viewDraft.applied_entity_id}</dd></div>}
                      </dl>
                    </section>
                  )}

                  {viewDraft.error && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                      <p className="text-[#556179] text-xs font-semibold uppercase tracking-wide mb-1">Error</p>
                      <p className="text-red-800 text-sm whitespace-pre-wrap">{viewDraft.error}</p>
                    </div>
                  )}

                  <section>
                    <h3 className="text-[16px] font-semibold text-[#072929] mb-2">Generated JSON</h3>
                    <div className="rounded-xl border border-[#e8e8e3] bg-[#f9f9f6] max-h-[280px] min-h-0 overflow-hidden">
                      <pre className="p-4 text-[13px] font-mono whitespace-pre-wrap break-all overflow-auto h-full max-h-[280px] m-0">
                        {viewDraftJsonString || "{}"}
                      </pre>
                    </div>
                  </section>
                </div>
              </>
            )}
          </div>
        </div>
      </BaseModal>
    </div>
  );
};
