import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { accountsService } from "../services/accounts";
import type { BrandKbEntry, BrandKbEntryCreate, BrandKbTriggerType, Channel } from "../services/accounts";
import { useAuth } from "../contexts/AuthContext";
import { useAccounts } from "../contexts/AccountsContext";
import { useSidebar } from "../contexts/SidebarContext";
import { queryKeys } from "../hooks/queries/queryKeys";
import { Sidebar } from "../components/layout/Sidebar";
import { Button, BaseModal, Loader, DeleteConfirmationModal, Banner } from "../components/ui";
import { cn } from "../lib/cn";
import { Plus, Pencil, Trash2, BookOpen, ChevronRight, X, Globe, Sparkles, Eye } from "lucide-react";
import { setPageTitle, resetPageTitle } from "../utils/pageTitle";
import { MarkdownPromptEditor } from "./workflows/components/MarkdownPromptEditor";
import { listGoogleSheetsIntegrations } from "../features/brands/google-sheets/api";
import type { GoogleSheetsIntegration } from "../features/brands/google-sheets/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

// ---------------------------------------------------------------------------
// Template data
// ---------------------------------------------------------------------------

interface KbTemplate {
  id: string;
  name: string;
  trigger_type: BrandKbTriggerType;
  badge: string;
  description: string;
  kb: string;
}

const KB_TEMPLATES: KbTemplate[] = [
  {
    id: "brand-performance",
    name: "Brand Performance Thresholds",
    trigger_type: "brand_level",
    badge: "BRAND LEVEL",
    description: "ROAS, CPA, and CPM thresholds for flagging and scaling decisions.",
    kb: "Our target ROAS is 3.5x. Any campaign below 2.5x for more than 7 days should be flagged as underperforming. CPA ceiling is $45. CPM above $18 is considered expensive for this brand. When analyzing performance, always benchmark against these thresholds first before comparing to historical trends. Never recommend scaling a campaign unless it meets the ROAS target for at least 5 consecutive days.",
  },
  {
    id: "brand-response",
    name: "Brand Response Guidelines",
    trigger_type: "brand_level",
    badge: "BRAND LEVEL",
    description: "Tone, terminology, and report structure for Prism responses.",
    kb: 'Always present spend in USD. Use "investment" instead of "cost" when discussing budget. When performance is poor, lead with the diagnosis and recommended fix, not just the metric. Avoid phrases like "underperforming badly" or "wasted spend." Use "opportunity to optimize" or "efficiency gap." When asked for a report, structure it as: Key Wins, Areas to Watch, Recommended Actions.',
  },
  {
    id: "meta-scaling",
    name: "Meta Scaling Rules",
    trigger_type: "integration_level",
    badge: "INTEGRATION LEVEL",
    description: "Budget and learning phase rules for Meta campaigns.",
    kb: "Do not recommend budget increases above 20% in a single day for any campaign. When CPA rises more than 15% after a budget change, flag it as learning phase volatility and recommend waiting 48 hours before further adjustments. For Advantage+ campaigns, do not suggest audience changes; only recommend creative swaps or budget shifts.",
  },
  {
    id: "google-search",
    name: "Google Search Priority",
    trigger_type: "integration_level",
    badge: "INTEGRATION LEVEL",
    description: "Brand vs non-brand priority and keyword optimization rules.",
    kb: "Prioritize branded search campaigns in all performance reports. Non-brand campaigns should only be evaluated after confirming brand campaigns are hitting target ROAS. When recommending keyword optimizations, focus on terms with 100+ clicks and below-average conversion rate first. Never recommend pausing exact match keywords without checking phrase match coverage.",
  },
  {
    id: "cross-platform",
    name: "Cross-Platform Budget",
    trigger_type: "brand_level",
    badge: "BRAND LEVEL",
    description: "Attribution and budget shift rules across Meta and Google.",
    kb: "When comparing Meta and Google performance together, always normalize for attribution differences. Meta uses 7-day click, 1-day view by default; Google uses last-click. When recommending budget shifts between platforms, flag this attribution gap and suggest at least 15% of total budget remains on the lower-performing platform for testing continuity.",
  },
  {
    id: "full-funnel",
    name: "Full-Funnel Analysis Rules",
    trigger_type: "brand_level",
    badge: "BRAND LEVEL",
    description: "Awareness vs performance metrics and reporting.",
    kb: "When these accounts are analyzed together, treat awareness campaigns as top-of-funnel and performance campaigns as bottom-of-funnel. Do not compare their ROAS directly. Instead, evaluate awareness by CPM and reach efficiency, and performance by ROAS and CPA. When asked about overall performance, report both metrics separately and show assisted conversion influence where available.",
  },
];

const TRIGGER_OPTIONS: { value: BrandKbTriggerType; label: string }[] = [
  { value: "brand_level", label: "Always active for the brand" },
  { value: "integration_level", label: "Specific to integrations under this brand" },
  { value: "profile_level", label: "Specific to profiles under this brand" },
];

const TRIGGER_BADGE_MAP: Record<BrandKbTriggerType, { label: string; className: string }> = {
  brand_level: { label: "BRAND LEVEL", className: "bg-forest-f40/10 text-forest-f40" },
  integration_level: { label: "INTEGRATION LEVEL", className: "bg-yellow-y10/10 text-yellow-y10" },
  profile_level: { label: "PROFILE LEVEL", className: "bg-[#4A6CF7]/10 text-[#4A6CF7]" },
};

const kbMarkdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-[11px] leading-relaxed mb-1.5 last:mb-0">{children}</p>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-[13px] font-semibold text-forest-f60 mt-3 mb-1 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-xs font-semibold text-forest-f60 mt-3 mb-1 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-[11px] font-semibold text-forest-f60 mt-2 mb-0.5 first:mt-0">{children}</h3>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-outside pl-4 mb-1.5 space-y-0.5 text-forest-f60">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-outside pl-4 mb-1.5 space-y-0.5 text-forest-f60">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-[11px]">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-forest-f60">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="px-1 py-0.5 rounded bg-sandstorm-s10 text-forest-f60 text-[10px]">{children}</code>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-sandstorm-s40 pl-3 my-1.5 text-forest-f30 italic text-[11px]">{children}</blockquote>
  ),
  hr: () => <hr className="my-2 border-sandstorm-s40" />,
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export const BrandKnowledge: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  useAuth();
  const { accounts, getAccountProfiles } = useAccounts();
  const { sidebarWidth } = useSidebar();
  const queryClient = useQueryClient();

  const accountIdNum = accountId ? parseInt(accountId, 10) : undefined;
  const account = accounts.find((a) => a.id === accountIdNum);

  useEffect(() => {
    setPageTitle(account ? `Knowledge — ${account.name}` : "Brand Knowledge");
    return () => resetPageTitle();
  }, [account]);

  // Fetch KB entries
  const {
    data: kbEntries = [],
    isLoading,
  } = useQuery({
    queryKey: queryKeys.accounts.brandKbEntries(accountIdNum!),
    queryFn: () => accountsService.getBrandKbEntries(accountIdNum!),
    enabled: !!accountIdNum,
  });

  // Fetch channels for integration-level scoping
  const { data: channels = [] } = useQuery({
    queryKey: queryKeys.channels.lists(accountIdNum!),
    queryFn: () => accountsService.getAccountChannels(accountIdNum!),
    enabled: !!accountIdNum,
  });

  // Fetch Google Sheets integrations (different table from channels)
  const { data: googleSheetsIntegrations = [] } = useQuery({
    queryKey: ["google-sheets-integrations", accountIdNum],
    queryFn: () => listGoogleSheetsIntegrations(accountIdNum!),
    enabled: !!accountIdNum,
  });

  // Fetch profiles for profile-level scoping
  const [profiles, setProfiles] = useState<Array<{ id: number; name?: string; channel_type?: string; customer_id?: string }>>([]);
  useEffect(() => {
    if (accountIdNum) {
      getAccountProfiles(accountIdNum).then((p) => setProfiles(p as any[])).catch(() => {});
    }
  }, [accountIdNum, getAccountProfiles]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: BrandKbEntryCreate) => accountsService.createBrandKbEntry(accountIdNum!, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.brandKbEntries(accountIdNum!) });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ kbId, data }: { kbId: number; data: Partial<BrandKbEntryCreate> }) =>
      accountsService.updateBrandKbEntry(accountIdNum!, kbId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.brandKbEntries(accountIdNum!) });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (kbId: number) => accountsService.deleteBrandKbEntry(accountIdNum!, kbId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.brandKbEntries(accountIdNum!) });
    },
  });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [editingEntry, setEditingEntry] = useState<BrandKbEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<BrandKbEntry | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [viewEntry, setViewEntry] = useState<BrandKbEntry | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formTrigger, setFormTrigger] = useState<BrandKbTriggerType>("brand_level");
  const [formChannelIds, setFormChannelIds] = useState<number[]>([]);
  const [formProfileIds, setFormProfileIds] = useState<number[]>([]);
  const [formGoogleSheetsIntegrationIds, setFormGoogleSheetsIntegrationIds] = useState<number[]>([]);
  const [formKb, setFormKb] = useState("");
  const [formWebsiteUrls, setFormWebsiteUrls] = useState<string[]>([""]);
  const [formEnhancePrompt, setFormEnhancePrompt] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setFormName("");
    setFormTrigger("brand_level");
    setFormChannelIds([]);
    setFormProfileIds([]);
    setFormGoogleSheetsIntegrationIds([]);
    setFormKb("");
    setFormWebsiteUrls([""]);
    setFormEnhancePrompt("");
    setFormErrors({});
    setModalStep(1);
    setEditingEntry(null);
  };

  const openCreate = (template?: KbTemplate) => {
    resetForm();
    if (template) {
      setFormName(template.name);
      setFormTrigger(template.trigger_type);
      setFormKb(template.kb);
    }
    setModalOpen(true);
  };

  const openEdit = async (entry: BrandKbEntry) => {
    setEditingEntry(entry);
    setFormName(entry.name);
    setFormTrigger(entry.trigger_type);
    setFormChannelIds(entry.channel_ids || []);
    setFormProfileIds(entry.profile_ids || []);
    setFormGoogleSheetsIntegrationIds(entry.google_sheets_integration_ids || []);
    setFormKb(entry.kb);
    setFormWebsiteUrls(entry.website_urls?.length ? entry.website_urls : [""]);
    setFormEnhancePrompt(entry.enhance_prompt || "");
    setFormErrors({});
    setModalStep(1);
    setModalOpen(true);

    try {
      const full = await accountsService.getBrandKbEntry(accountIdNum!, entry.id);
      setFormKb(full.kb);
      setFormEnhancePrompt(full.enhance_prompt || "");
      setEditingEntry(full);
    } catch {
      // keep truncated version if detail fetch fails
    }
  };

  const openView = async (entry: BrandKbEntry) => {
    setViewEntry(entry);
    try {
      const full = await accountsService.getBrandKbEntry(accountIdNum!, entry.id);
      setViewEntry(full);
    } catch {
      // keep truncated version if detail fetch fails
    }
  };

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = "Name is required";
    if (!formKb.trim()) errors.kb = "Instructions are required";
    if (formTrigger === "integration_level") {
      const hasChannel = formChannelIds.length > 0;
      const hasSheet = formGoogleSheetsIntegrationIds.length > 0;
      if (!hasChannel && !hasSheet) {
        errors.scope = "Select at least one ad integration or Google Sheet integration";
      }
    }
    if (formTrigger === "profile_level" && formProfileIds.length === 0) {
      errors.scope = "Select at least one profile";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    const cleanUrls = formWebsiteUrls.filter((u) => u.trim());
    const payload: BrandKbEntryCreate = {
      name: formName.trim(),
      trigger_type: formTrigger,
      kb: formKb.trim(),
      channel_ids: formTrigger === "integration_level" ? formChannelIds : [],
      profile_ids: formTrigger === "profile_level" ? formProfileIds : [],
      google_sheets_integration_ids:
        formTrigger === "integration_level" ? formGoogleSheetsIntegrationIds : [],
      website_urls: cleanUrls,
      enhance_prompt: formEnhancePrompt.trim(),
    };
    setFormErrors({});
    try {
      if (editingEntry) {
        await updateMutation.mutateAsync({ kbId: editingEntry.id, data: payload });
        setSuccessMsg("Knowledge entry updated");
      } else {
        await createMutation.mutateAsync(payload);
        setSuccessMsg("Knowledge entry created");
      }
      setModalOpen(false);
      resetForm();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      const msg = axiosErr?.response?.data?.detail || "Failed to save. Please try again.";
      setFormErrors({ submit: msg });
    }
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    await deleteMutation.mutateAsync(deleteEntry.id);
    setDeleteEntry(null);
  };

  const toggleChannelId = (id: number) => {
    setFormChannelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleProfileId = (id: number) => {
    setFormProfileIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleGoogleSheetsIntegrationId = (id: number) => {
    setFormGoogleSheetsIntegrationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Group channels for display (status is boolean, filter out soft-deleted)
  const channelOptions = useMemo(
    () => (channels as Channel[]).filter((c) => c.status && !c.deleted_at),
    [channels],
  );

  return (
    <div className="flex min-h-screen bg-sandstorm-s0">
      <Sidebar />
      <div className="flex-1 transition-all duration-300" style={{ marginLeft: sidebarWidth }}>
        <div className="p-6 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-agrandir font-bold text-forest-f60">Brand Knowledge</h1>
              <p className="text-sm text-forest-f30 mt-1">
                Enhance Prism's capabilities to help it understand the nuances of your brand.
              </p>
            </div>
            <Button onClick={() => openCreate()} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Create Knowledge
            </Button>
          </div>

          {successMsg && (
            <Banner type="success" className="mb-6" message={successMsg} dismissable onDismiss={() => setSuccessMsg(null)} />
          )}

          {/* Templates — always visible */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-forest-f60 mb-3">
              {kbEntries.length > 0 ? "Add from Templates" : "Get Started with Templates"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {KB_TEMPLATES.map((t) => {
                const badge = TRIGGER_BADGE_MAP[t.trigger_type];
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openCreate(t)}
                    className="text-left p-4 rounded-xl border border-sandstorm-s40 bg-white hover:border-forest-f40/40 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <BookOpen className="w-5 h-5 text-forest-f30" />
                      <span className="text-xs text-forest-f30 flex items-center gap-1 group-hover:text-forest-f40">
                        Use <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-forest-f60 mb-1">{t.name}</h3>
                    <span className={cn("inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2", badge.className)}>
                      {badge.label}
                    </span>
                    <p className="text-xs text-forest-f30 line-clamp-2">{t.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Existing KB entries */}
          {isLoading ? (
            <Loader message="Loading knowledge entries..." />
          ) : kbEntries.length > 0 ? (
            <>
              <h2 className="text-sm font-semibold text-forest-f60 mb-4">
                Knowledge Entries ({kbEntries.length})
              </h2>
              <div className="space-y-3">
                {kbEntries.map((entry) => {
                  const badge = TRIGGER_BADGE_MAP[entry.trigger_type] ?? TRIGGER_BADGE_MAP.brand_level;
                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-4 p-4 rounded-xl border border-sandstorm-s40 bg-white"
                    >
                      <BookOpen className="w-5 h-5 text-forest-f30 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-semibold text-forest-f60">{entry.name || "Untitled"}</h3>
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", badge.className)}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-forest-f30 line-clamp-2">{entry.kb}</p>
                        {entry.website_urls?.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Globe className="w-3 h-3 text-forest-f30" />
                            <span className="text-[10px] text-forest-f30">{entry.website_urls.length} URL{entry.website_urls.length !== 1 ? "s" : ""}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openView(entry)}
                          className="p-1.5 rounded-lg hover:bg-sandstorm-s5 text-forest-f30 hover:text-forest-f40"
                          aria-label="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(entry)}
                          className="p-1.5 rounded-lg hover:bg-sandstorm-s5 text-forest-f30 hover:text-forest-f40"
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteEntry(entry)}
                          className="p-1.5 rounded-lg hover:bg-red-r0 text-forest-f30 hover:text-red-r30"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <BaseModal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }} size="2xl">
        <div className="px-5 py-4">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <Step num={1} label="Basic" active={modalStep >= 1} done={modalStep > 1} onClick={() => setModalStep(1)} />
            <ChevronRight className="w-4 h-4 text-forest-f30" />
            <Step num={2} label="Advanced (Opt)" active={modalStep >= 2} done={false} onClick={() => { if (validateStep1()) setModalStep(2); }} />
          </div>

          {modalStep === 1 && (
            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-forest-f60 mb-1">
                  Knowledge Name<span className="text-red-r30">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Add Title"
                  maxLength={500}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-sm text-forest-f60 placeholder:text-forest-f30 focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-transparent",
                    formErrors.name ? "border-red-r30 bg-red-r0" : "border-sandstorm-s40 bg-sandstorm-s5",
                  )}
                />
                {formErrors.name && <p className="text-xs text-red-r30 mt-1">{formErrors.name}</p>}
                <p className="text-xs text-forest-f30 text-right mt-0.5">{formName.length}/500</p>
              </div>

              {/* Trigger */}
              <div>
                <label className="block text-sm font-medium text-forest-f60 mb-1">Knowledge Trigger</label>
                <select
                  value={formTrigger}
                  onChange={(e) => {
                    setFormTrigger(e.target.value as BrandKbTriggerType);
                    setFormChannelIds([]);
                    setFormProfileIds([]);
                    setFormGoogleSheetsIntegrationIds([]);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-sandstorm-s40 bg-sandstorm-s5 text-sm text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40"
                >
                  {TRIGGER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Scope selector — integration_level: channels + Google Sheets */}
              {formTrigger === "integration_level" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-forest-f60 mb-1">
                      Ad Integrations (Meta, Google Ads, etc.)
                    </label>
                    <div className="border border-sandstorm-s40 rounded-lg max-h-[140px] overflow-y-auto bg-sandstorm-s5">
                      {channelOptions.length === 0 ? (
                        <p className="text-xs text-forest-f30 p-3">No active ad integrations found.</p>
                      ) : (
                        channelOptions.map((ch) => (
                          <label
                            key={ch.id}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white text-sm",
                              formChannelIds.includes(ch.id) && "bg-[#E6F2F2]",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={formChannelIds.includes(ch.id)}
                              onChange={() => toggleChannelId(ch.id)}
                              className="rounded border-forest-f40 text-forest-f40 focus:ring-forest-f40 accent-forest-f40"
                            />
                            <span className="text-forest-f60">{ch.channel_name}</span>
                            <span className="text-[10px] text-forest-f30 capitalize">({ch.channel_type})</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-forest-f60 mb-1">
                      Google Sheets Integrations
                    </label>
                    <div className="border border-sandstorm-s40 rounded-lg max-h-[140px] overflow-y-auto bg-sandstorm-s5">
                      {googleSheetsIntegrations.length === 0 ? (
                        <p className="text-xs text-forest-f30 p-3">
                          No Google Sheet integrations. Add them under Google Sheets settings.
                        </p>
                      ) : (
                        (googleSheetsIntegrations as GoogleSheetsIntegration[]).map((int) => (
                          <label
                            key={int.id}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white text-sm",
                              formGoogleSheetsIntegrationIds.includes(int.id) && "bg-[#E6F2F2]",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={formGoogleSheetsIntegrationIds.includes(int.id)}
                              onChange={() => toggleGoogleSheetsIntegrationId(int.id)}
                              className="rounded border-forest-f40 text-forest-f40 focus:ring-forest-f40 accent-forest-f40"
                            />
                            <span className="text-forest-f60 truncate">{int.name}</span>
                            <span className="text-[10px] text-forest-f30 shrink-0">
                              ({int.sheet_name || "sheet"})
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  {formErrors.scope && <p className="text-xs text-red-r30 mt-1">{formErrors.scope}</p>}
                </div>
              )}
              {formTrigger === "profile_level" && (
                <div>
                  <label className="block text-sm font-medium text-forest-f60 mb-1">Select Profiles</label>
                  <div className="border border-sandstorm-s40 rounded-lg max-h-[160px] overflow-y-auto bg-sandstorm-s5">
                    {profiles.length === 0 ? (
                      <p className="text-xs text-forest-f30 p-3">No profiles found.</p>
                    ) : (
                      profiles.map((p) => (
                        <label
                          key={p.id}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white text-sm",
                            formProfileIds.includes(p.id) && "bg-[#E6F2F2]",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={formProfileIds.includes(p.id)}
                            onChange={() => toggleProfileId(p.id)}
                            className="rounded border-forest-f40 text-forest-f40 focus:ring-forest-f40 accent-forest-f40"
                          />
                          <span className="text-forest-f60 truncate">{p.name || p.customer_id || `Profile ${p.id}`}</span>
                          {p.channel_type && <span className="text-[10px] text-forest-f30 capitalize">({p.channel_type})</span>}
                        </label>
                      ))
                    )}
                  </div>
                  {formErrors.scope && <p className="text-xs text-red-r30 mt-1">{formErrors.scope}</p>}
                </div>
              )}

              {/* Instructions */}
              <div>
                <label className="block text-sm font-medium text-forest-f60 mb-1">
                  Instruction<span className="text-red-r30">*</span>
                </label>
                <MarkdownPromptEditor
                  value={formKb}
                  onChange={setFormKb}
                  placeholder="Write your brand knowledge instructions here..."
                  minHeight="180px"
                  error={!!formErrors.kb}
                />
                {formErrors.kb && <p className="text-xs text-red-r30 mt-1">{formErrors.kb}</p>}
                <p className="text-xs text-forest-f30 text-right mt-0.5">{formKb.length}/50000</p>
              </div>
            </div>
          )}

          {modalStep === 2 && (
            <div className="space-y-5">
              {/* Website URLs */}
              <div>
                <label className="block text-sm font-medium text-forest-f60 mb-1">Website</label>
                <p className="text-xs text-forest-f30 mb-2">Add URLs for your brand, competitors, or industry-specific content.</p>
                {formWebsiteUrls.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const next = [...formWebsiteUrls];
                        next[idx] = e.target.value;
                        setFormWebsiteUrls(next);
                      }}
                      placeholder="Paste website URL here"
                      className="flex-1 px-3 py-2 rounded-lg border border-sandstorm-s40 bg-sandstorm-s5 text-sm text-forest-f60 placeholder:text-forest-f30 focus:outline-none focus:ring-2 focus:ring-forest-f40"
                    />
                    {formWebsiteUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFormWebsiteUrls((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 text-forest-f30 hover:text-red-r30"
                        aria-label="Remove URL"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFormWebsiteUrls((prev) => [...prev, ""])}
                  className="text-xs font-medium text-forest-f40 hover:text-forest-f50"
                >
                  + Add More Links
                </button>
              </div>

              {/* Enhance Prompt Instruction */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-forest-f60 mb-1">
                  Enhance Prompt Instruction
                  <Sparkles className="w-4 h-4 text-forest-f40" />
                </label>
                <p className="text-xs text-forest-f30 mb-2">
                  Define how Prism expands prompts when users click Enhance for this brand.
                </p>
                <MarkdownPromptEditor
                  value={formEnhancePrompt}
                  onChange={setFormEnhancePrompt}
                  placeholder="Describe how Prism should expand prompts for this brand..."
                  minHeight="120px"
                />
                <p className="text-xs text-forest-f30 text-right mt-0.5">{formEnhancePrompt.length}/5000</p>
              </div>
            </div>
          )}

          {formErrors.submit && (
            <p className="text-xs text-red-r30 mt-3 text-center">{formErrors.submit}</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-sandstorm-s40">
            {modalStep === 2 && (
              <Button variant="outline" onClick={() => setModalStep(1)}>
                Back
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => { setModalOpen(false); resetForm(); }}
            >
              Cancel
            </Button>
            {modalStep === 1 ? (
              <Button onClick={() => { if (validateStep1()) setModalStep(2); }}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : editingEntry ? "Save" : "Create"}
              </Button>
            )}
          </div>
        </div>
      </BaseModal>

      {/* Delete confirmation */}
      <DeleteConfirmationModal
        isOpen={!!deleteEntry}
        onClose={() => setDeleteEntry(null)}
        onConfirm={handleDelete}
        title="Delete Knowledge Entry"
        itemName={deleteEntry?.name || "this entry"}
        itemType="channel"
        isLoading={deleteMutation.isPending}
      />

      {/* View Modal */}
      <BaseModal isOpen={!!viewEntry} onClose={() => setViewEntry(null)} size="4xl">
        {viewEntry && (() => {
          const badge = TRIGGER_BADGE_MAP[viewEntry.trigger_type] ?? TRIGGER_BADGE_MAP.brand_level;
          return (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-sm font-semibold text-forest-f60 truncate">{viewEntry.name || "Untitled"}</h2>
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", badge.className)}>
                    {badge.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewEntry(null)}
                  className="p-1 rounded-lg hover:bg-sandstorm-s5 text-forest-f30 hover:text-forest-f60 shrink-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-[11px] font-semibold text-forest-f30 uppercase tracking-wide mb-1.5">Instructions</h3>
                  <div className="bg-sandstorm-s5 rounded-lg px-4 py-3 border border-sandstorm-s40 max-h-[60vh] overflow-y-auto text-[11px] text-forest-f60">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      components={kbMarkdownComponents}
                    >
                      {viewEntry.kb || "*No instructions provided.*"}
                    </ReactMarkdown>
                  </div>
                </div>

                {viewEntry.enhance_prompt && (
                  <div>
                    <h3 className="text-[11px] font-semibold text-forest-f30 uppercase tracking-wide mb-1.5">Enhance Prompt</h3>
                    <div className="bg-sandstorm-s5 rounded-lg px-4 py-3 border border-sandstorm-s40 max-h-[30vh] overflow-y-auto text-[11px] text-forest-f60">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        components={kbMarkdownComponents}
                      >
                        {viewEntry.enhance_prompt}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {viewEntry.website_urls && viewEntry.website_urls.filter(Boolean).length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-semibold text-forest-f30 uppercase tracking-wide mb-1.5">Website URLs</h3>
                    <ul className="space-y-1">
                      {viewEntry.website_urls.filter(Boolean).map((url, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 text-xs">
                          <Globe className="w-3 h-3 text-forest-f30 shrink-0" />
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-forest-f40 hover:underline truncate"
                          >
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </BaseModal>
    </div>
  );
};

// Step indicator bubble
const Step: React.FC<{
  num: number;
  label: string;
  active: boolean;
  done: boolean;
  onClick: () => void;
}> = ({ num, label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-2"
  >
    <span
      className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold",
        active ? "bg-forest-f40 text-white" : "bg-sandstorm-s40 text-forest-f30",
      )}
    >
      {num}
    </span>
    <span className={cn("text-sm font-medium", active ? "text-forest-f60" : "text-forest-f30")}>
      {label}
    </span>
  </button>
);

