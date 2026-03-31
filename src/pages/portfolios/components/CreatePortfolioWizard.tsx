import React, { useState, useMemo, useEffect, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, Search, Check, Star, CheckCircle } from "lucide-react";
import { BaseModal, Button, Loader, Radio, Checkbox, Chip } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import { useCreatePortfolio, useUpdatePortfolio } from "../../../hooks/mutations/usePortfolioMutations";
import { portfoliosService } from "../../../services/portfolios";
import { googleAdwordsConversionActionsService } from "../../../services/googleAdwords/googleAdwordsConversionActions";
import type { CreatePortfolioPayload, UpdatePortfolioPayload, MetricsPreviewResponse, Portfolio } from "../../../services/portfolios";
import type { GoogleConversionAction } from "../../../services/googleAdwords/googleAdwordsConversionActions";

interface Campaign {
  campaignId: string;
  campaignName: string;
  campaignType?: string;
  campaignStatus?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  accountId: number;
  channelId: number;
  profileId?: number | null;
  platform: "google" | "meta" | "tiktok" | "amazon";
  preSelectedCampaigns?: Campaign[];
  editPortfolio?: Portfolio | null;
}

const CREATE_STEPS = [
  { id: 1, label: "Select Campaigns" },
  { id: 2, label: "Portfolio Settings" },
  { id: 3, label: "Review & Create" },
];

const EDIT_STEPS = [
  { id: 2, label: "Portfolio Settings" },
  { id: 3, label: "Review & Save" },
];

const TARGET_TYPES = [
  { value: "CPC", label: "CPC", fullLabel: "Target CPC" },
  { value: "CPM", label: "CPM", fullLabel: "Target CPM" },
  { value: "CPA", label: "CPA", fullLabel: "Target Cost Per Action" },
  { value: "ROAS", label: "ROAS", fullLabel: "Target ROAS" },
];

interface DefaultMetricDef {
  metric_name: string;
  key: keyof MetricsPreviewResponse;
}

const COMMON_METRICS: DefaultMetricDef[] = [
  { metric_name: "Clicks", key: "clicks" },
  { metric_name: "Impressions", key: "impressions" },
  { metric_name: "Spend", key: "spend" },
  { metric_name: "CTR", key: "ctr" },
  { metric_name: "CPC", key: "cpc" },
  { metric_name: "CPM", key: "cpm" },
  { metric_name: "Conversions", key: "conversions" },
  { metric_name: "Revenue", key: "revenue" },
  { metric_name: "ROAS", key: "roas" },
];

const PLATFORM_METRICS: Record<string, DefaultMetricDef[]> = {
  google: COMMON_METRICS,
  amazon: COMMON_METRICS,
  tiktok: COMMON_METRICS,
  meta: [
    { metric_name: "Clicks", key: "clicks" },
    { metric_name: "Impressions", key: "impressions" },
    { metric_name: "Spend", key: "spend" },
    { metric_name: "Reach", key: "reach" },
    { metric_name: "CTR", key: "ctr" },
    { metric_name: "CPC", key: "cpc" },
    { metric_name: "CPM", key: "cpm" },
    { metric_name: "Conversions", key: "conversions" },
    { metric_name: "Revenue", key: "revenue" },
    { metric_name: "ROAS", key: "roas" },
  ],
};

function formatL30D(value: number | undefined | null, key: string): string {
  if (value === undefined || value === null) return "--";
  if (value === 0) return "0";
  if (["spend", "revenue", "cpc", "cpm", "cpa"].includes(key)) {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (["ctr"].includes(key)) {
    return `${value.toFixed(2)}%`;
  }
  if (["roas"].includes(key)) {
    return `${value.toFixed(2)}x`;
  }
  return value.toLocaleString();
}

export const CreatePortfolioWizard: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  accountId,
  channelId,
  profileId,
  platform,
  preSelectedCampaigns = [],
  editPortfolio,
}) => {
  const isEditMode = !!editPortfolio;
  const editCampaigns: Campaign[] = useMemo(
    () =>
      editPortfolio?.campaigns?.map((c) => ({
        campaignId: c.campaignId,
        campaignName: c.campaignName,
        campaignType: c.campaignType,
        campaignStatus: c.campaignStatus,
      })) ?? [],
    [editPortfolio],
  );

  const initialCampaigns = isEditMode ? editCampaigns : preSelectedCampaigns;

  const [step, setStep] = useState(isEditMode ? 2 : 1);
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [campaignSearch, setCampaignSearch] = useState("");

  const [name, setName] = useState(editPortfolio?.name ?? "");
  const [totalBudget, setTotalBudget] = useState(
    editPortfolio?.totalBudget != null ? String(editPortfolio.totalBudget) : "",
  );
  const [startDate, setStartDate] = useState(editPortfolio?.startDate ?? "");
  const [endDate, setEndDate] = useState(editPortfolio?.endDate ?? "");

  const editMetricType = editPortfolio?.metricType ?? "default";
  const [metricType, setMetricType] = useState<"default" | "conversion">(editMetricType);
  const [metricSearch, setMetricSearch] = useState("");
  const [selectedDefaultMetric, setSelectedDefaultMetric] = useState(
    editMetricType === "default" && editPortfolio?.metrics?.length
      ? editPortfolio.metrics[0].metricName
      : "Clicks",
  );
  const [selectedConversionMetrics, setSelectedConversionMetrics] = useState<string[]>(
    editMetricType === "conversion" && editPortfolio?.metrics
      ? editPortfolio.metrics.map((m) => m.metricName)
      : [],
  );

  const [targetType, setTargetType] = useState(editPortfolio?.targetType ?? "");
  const [targetValue, setTargetValue] = useState(
    editPortfolio?.targetValue != null ? String(editPortfolio.targetValue) : "",
  );

  const [parsedTags, setParsedTags] = useState<string[]>(editPortfolio?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // L30D metrics preview
  const [l30dData, setL30dData] = useState<MetricsPreviewResponse | null>(null);
  const [l30dLoading, setL30dLoading] = useState(false);

  // Conversion actions from API
  const [conversionActions, setConversionActions] = useState<GoogleConversionAction[]>([]);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [conversionFetched, setConversionFetched] = useState(false);

  const createMutation = useCreatePortfolio(accountId);
  const updateMutation = useUpdatePortfolio(accountId, editPortfolio?.id ?? 0);

  const campaignFingerprint = useMemo(
    () => campaigns.map((c) => c.campaignId).sort().join(","),
    [campaigns],
  );

  useEffect(() => {
    setL30dData(null);
  }, [campaignFingerprint]);

  // Fetch L30D metrics when entering Step 2
  const fetchL30d = useCallback(async () => {
    if (!profileId || campaigns.length === 0) return;
    setL30dLoading(true);
    try {
      const data = await portfoliosService.getMetricsPreview(accountId, {
        platform,
        profileId,
        campaignIds: campaigns.map((c) => c.campaignId),
      });
      setL30dData(data);
    } catch {
      setL30dData(null);
    } finally {
      setL30dLoading(false);
    }
  }, [accountId, platform, profileId, campaigns]);

  useEffect(() => {
    if (step === 2 && !l30dData && !l30dLoading) {
      fetchL30d();
    }
  }, [step, l30dData, l30dLoading, fetchL30d]);

  // Fetch conversion actions when user switches to "Conversion Metrics"
  const fetchConversionActions = useCallback(async () => {
    if (!profileId || conversionFetched) return;
    if (platform !== "google") return;
    setConversionLoading(true);
    try {
      const resp = await googleAdwordsConversionActionsService.listConversionActions(
        accountId,
        channelId,
        profileId,
      );
      setConversionActions(resp.conversion_actions || []);
    } catch {
      setConversionActions([]);
    } finally {
      setConversionLoading(false);
      setConversionFetched(true);
    }
  }, [accountId, channelId, profileId, platform, conversionFetched]);

  useEffect(() => {
    if (metricType === "conversion" && !conversionFetched && !conversionLoading) {
      fetchConversionActions();
    }
  }, [metricType, conversionFetched, conversionLoading, fetchConversionActions]);

  const filteredCampaigns = useMemo(() => {
    if (!campaignSearch.trim()) return campaigns;
    const q = campaignSearch.toLowerCase();
    return campaigns.filter((c) => c.campaignName.toLowerCase().includes(q));
  }, [campaigns, campaignSearch]);

  const platformMetrics = PLATFORM_METRICS[platform] || COMMON_METRICS;

  const filteredDefaultMetrics = useMemo(() => {
    if (!metricSearch.trim()) return platformMetrics;
    const q = metricSearch.toLowerCase();
    return platformMetrics.filter((m) => m.metric_name.toLowerCase().includes(q));
  }, [metricSearch, platformMetrics]);

  const filteredConversionActions = useMemo(() => {
    if (!metricSearch.trim()) return conversionActions;
    const q = metricSearch.toLowerCase();
    return conversionActions.filter((a) => a.name.toLowerCase().includes(q));
  }, [conversionActions, metricSearch]);

  const removeCampaign = (campaignId: string) => {
    setCampaigns((prev) => prev.filter((c) => c.campaignId !== campaignId));
  };

  const handleAddTag = () => {
    const val = tagInput.trim();
    if (val && !parsedTags.includes(val)) {
      setParsedTags((prev) => [...prev, val]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setParsedTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
    if (e.key === "Backspace" && tagInput === "" && parsedTags.length > 0) {
      setParsedTags((prev) => prev.slice(0, -1));
    }
  };

  const toggleConversionMetric = (metricName: string) => {
    setSelectedConversionMetrics((prev) =>
      prev.includes(metricName)
        ? prev.filter((m) => m !== metricName)
        : [...prev, metricName],
    );
  };

  const handleSelectAllConversion = () => {
    if (selectedConversionMetrics.length === conversionActions.length) {
      setSelectedConversionMetrics([]);
    } else {
      setSelectedConversionMetrics(conversionActions.map((a) => a.name));
    }
  };

  const handleClearMetrics = () => {
    if (metricType === "default") {
      setSelectedDefaultMetric("");
    } else {
      setSelectedConversionMetrics([]);
    }
  };

  const canProceedStep1 = campaigns.length > 0;
  const canProceedStep2 = name.trim() !== "" && totalBudget !== "" && parseFloat(totalBudget) > 0;

  const selectedMetricNames = metricType === "default"
    ? (selectedDefaultMetric ? [selectedDefaultMetric] : [])
    : selectedConversionMetrics;

  const handleSubmit = async () => {
    setError("");
    if (!startDate || !endDate) {
      setError("Start Date and End Date are required.");
      return;
    }
    const campaignsPayload = campaigns.map((c) => ({
      campaign_id: c.campaignId,
      campaign_name: c.campaignName,
      campaign_type: c.campaignType || "",
      campaign_status: c.campaignStatus || "",
    }));
    const metricsPayload = selectedMetricNames.map((m) => ({
      metric_name: m,
      metric_type: metricType,
      is_recommended: metricType === "default" && ["Clicks", "Impressions", "Spend"].includes(m),
    }));

    try {
      if (isEditMode) {
        const payload: UpdatePortfolioPayload = {
          name: name.trim(),
          totalBudget: parseFloat(totalBudget),
          startDate: startDate || null,
          endDate: endDate || null,
          metricType,
          targetType: targetType || null,
          targetValue: targetValue ? parseFloat(targetValue) : null,
          tags: parsedTags,
          campaigns: campaignsPayload,
          metrics: metricsPayload,
        };
        await updateMutation.mutateAsync(payload);
        setSuccessMessage(`Portfolio "${name.trim()}" updated successfully!`);
      } else {
        const payload: CreatePortfolioPayload = {
          name: name.trim(),
          platform,
          channelId,
          profileId: profileId ?? undefined,
          totalBudget: parseFloat(totalBudget),
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          metricType,
          targetType: targetType || undefined,
          targetValue: targetValue ? parseFloat(targetValue) : undefined,
          tags: parsedTags,
          campaigns: campaignsPayload,
          metrics: metricsPayload,
        };
        await createMutation.mutateAsync(payload);
        setSuccessMessage(`Portfolio "${name.trim()}" created successfully!`);
      }
      onSuccess?.();
      setTimeout(() => {
        setSuccessMessage("");
        handleClose();
      }, 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        `Failed to ${isEditMode ? "update" : "create"} portfolio`;
      setError(msg);
    }
  };

  const handleClose = () => {
    if (!isEditMode) {
      setStep(1);
      setName("");
      setTotalBudget("");
      setStartDate("");
      setEndDate("");
      setMetricType("default");
      setMetricSearch("");
      setSelectedDefaultMetric("Clicks");
      setSelectedConversionMetrics([]);
      setTargetType("");
      setTargetValue("");
      setParsedTags([]);
      setTagInput("");
      setL30dData(null);
      setConversionActions([]);
      setConversionFetched(false);
    }
    setError("");
    setSuccessMessage("");
    onClose();
  };

  const STEPS = isEditMode ? EDIT_STEPS : CREATE_STEPS;
  const targetLabel = TARGET_TYPES.find((t) => t.value === targetType)?.fullLabel ?? "Target";

  // Find the "recommended" conversion action (highest primary_for_goal or first)
  const recommendedConversionName = useMemo(() => {
    const primary = conversionActions.find((a) => a.primary_for_goal);
    return primary?.name || conversionActions[0]?.name || null;
  }, [conversionActions]);

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} size="4xl" padding="p-0">
      <div className="flex flex-col" style={{ minHeight: "600px" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sandstorm-s40">
          <h2 className="text-[18px] font-medium text-forest-f60">
            {isEditMode ? "Edit Portfolio" : "Create Portfolio"}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-sandstorm-s10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-forest-f30" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-sandstorm-s40 bg-sandstorm-s0">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium",
                    step === s.id
                      ? "bg-forest-f40 text-white"
                      : step > s.id
                        ? "bg-forest-f40/20 text-forest-f40"
                        : "bg-sandstorm-s20 text-forest-f30",
                  )}
                >
                  {step > s.id ? <Check className="w-3.5 h-3.5" /> : s.id}
                </div>
                <span
                  className={cn(
                    "text-[13px]",
                    step === s.id ? "text-forest-f60 font-medium" : "text-forest-f30",
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-forest-f30 mx-1" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Success overlay */}
          {successMessage && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 rounded-full bg-forest-f0 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-forest-f40" />
              </div>
              <p className="text-[16px] font-medium text-forest-f60">{successMessage}</p>
              <p className="text-[13px] text-forest-f30">Redirecting...</p>
            </div>
          )}

          {/* ── Step 1: Select Campaigns ── */}
          {!successMessage && step === 1 && (
            <div className="space-y-4">
              <div>
                <p className="text-[14px] text-forest-f60 font-medium mb-1">
                  Selected Campaigns ({campaigns.length})
                </p>
                <p className="text-[13px] text-forest-f30 mb-3">
                  These campaigns were selected from the campaign listing.
                  You can remove any before continuing.
                </p>
              </div>

              {campaigns.length > 5 && (
                <div className="search-input-container h-[36px] w-full flex items-center gap-2 px-[10px]">
                  <Search className="w-4 h-4 text-forest-f30 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search campaigns..."
                    className="bg-transparent border-none outline-none text-[13px] text-forest-f60 w-full"
                    value={campaignSearch}
                    onChange={(e) => setCampaignSearch(e.target.value)}
                  />
                </div>
              )}

              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[14px] text-forest-f30">
                    No campaigns selected. Please go back to the campaign page and select campaigns first.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto">
                  {filteredCampaigns.map((c) => (
                    <div
                      key={c.campaignId}
                      className="flex items-center justify-between px-3 py-2.5 bg-sandstorm-s5 border border-sandstorm-s40 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-forest-f60 truncate">
                          {c.campaignName}
                        </p>
                        <p className="text-[11px] text-forest-f30">
                          {c.campaignType} &middot; {c.campaignStatus}
                        </p>
                      </div>
                      <button
                        onClick={() => removeCampaign(c.campaignId)}
                        className="ml-2 p-1 rounded hover:bg-sandstorm-s20 transition-colors"
                        aria-label={`Remove ${c.campaignName}`}
                      >
                        <X className="w-4 h-4 text-forest-f30" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Portfolio Settings ── */}
          {!successMessage && step === 2 && (
            <div className="space-y-6">
              {/* Portfolio Name + Total Budget */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Portfolio Name *</label>
                  <input
                    type="text"
                    className="campaign-input w-full"
                    placeholder="e.g. Q4 Performance Campaign Group"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Total Budget *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-forest-f30">$</span>
                    <input
                      type="number"
                      className="campaign-input w-full"
                      style={{ paddingLeft: 28 }}
                      placeholder="10000"
                      min={0}
                      step="0.01"
                      value={totalBudget}
                      onChange={(e) => setTotalBudget(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Start Date + End Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Start Date *</label>
                  <input
                    type="date"
                    className="campaign-input w-full"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">End Date *</label>
                  <input
                    type="date"
                    className="campaign-input w-full"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Track Performance By */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="form-label !mb-0">Track Performance By</label>
                  <button
                    type="button"
                    onClick={handleClearMetrics}
                    className="text-[13px] font-semibold text-forest-f60 hover:text-forest-f40 transition-colors"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex items-center gap-5 mb-3">
                  <Radio
                    name="metricType"
                    value="default"
                    checked={metricType === "default"}
                    onChange={() => { setMetricType("default"); setMetricSearch(""); }}
                    label="Default Metrics"
                  />
                  <Radio
                    name="metricType"
                    value="conversion"
                    checked={metricType === "conversion"}
                    onChange={() => { setMetricType("conversion"); setMetricSearch(""); }}
                    label="Conversion Metrics"
                  />
                </div>

                {/* Metrics searchable list */}
                <div className="border border-sandstorm-s40 rounded-lg bg-sandstorm-s0 overflow-hidden">
                  <div className="search-input-container !rounded-none !border-x-0 !border-t-0 h-[40px] flex items-center gap-2 px-3">
                    <Search className="w-4 h-4 text-forest-f30 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search metrics..."
                      className="bg-transparent border-none outline-none text-[12px] text-forest-f60 w-full"
                      value={metricSearch}
                      onChange={(e) => setMetricSearch(e.target.value)}
                    />
                  </div>

                  <div className="max-h-[220px] overflow-y-auto">
                    {/* Default Metrics */}
                    {metricType === "default" && (
                      <>
                        {l30dLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader size="sm" />
                            <span className="ml-2 text-[12px] text-forest-f30">Loading metrics...</span>
                          </div>
                        ) : (
                          filteredDefaultMetrics.map((m) => (
                            <div
                              key={m.metric_name}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 border-b border-sandstorm-s40 last:border-b-0 hover:bg-sandstorm-s5 transition-colors cursor-pointer",
                                selectedDefaultMetric === m.metric_name && "bg-sandstorm-s5",
                              )}
                              onClick={() => setSelectedDefaultMetric(m.metric_name)}
                            >
                              <Radio
                                name="defaultMetric"
                                value={m.metric_name}
                                checked={selectedDefaultMetric === m.metric_name}
                                onChange={() => setSelectedDefaultMetric(m.metric_name)}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-forest-f60">{m.metric_name}</p>
                                <p className="text-[11px] text-forest-f30">
                                  L30D: {l30dData ? formatL30D(l30dData[m.key], m.key) : "--"}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                        {!l30dLoading && filteredDefaultMetrics.length === 0 && (
                          <div className="px-4 py-6 text-center text-[13px] text-forest-f30">
                            No metrics found
                          </div>
                        )}
                      </>
                    )}

                    {/* Conversion Metrics */}
                    {metricType === "conversion" && (
                      <>
                        {conversionLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader size="sm" />
                            <span className="ml-2 text-[12px] text-forest-f30">Loading conversion actions...</span>
                          </div>
                        ) : platform !== "google" ? (
                          <div className="px-4 py-6 text-center text-[13px] text-forest-f30">
                            Conversion metrics are available for Google accounts. Support for {platform} coming soon.
                          </div>
                        ) : conversionActions.length === 0 ? (
                          <div className="px-4 py-6 text-center text-[13px] text-forest-f30">
                            No conversion actions found for this account.
                          </div>
                        ) : (
                          <>
                            {!metricSearch.trim() && (
                              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-sandstorm-s40">
                                <Checkbox
                                  checked={selectedConversionMetrics.length === conversionActions.length && conversionActions.length > 0}
                                  indeterminate={selectedConversionMetrics.length > 0 && selectedConversionMetrics.length < conversionActions.length}
                                  onChange={handleSelectAllConversion}
                                />
                                <span className="text-[13px] font-medium text-forest-f40">
                                  Select All ({conversionActions.length})
                                </span>
                              </div>
                            )}

                            <div className="px-4 pt-2 pb-1">
                              <span className="text-[11px] font-semibold text-forest-f40 uppercase tracking-wide">
                                All Metrics
                              </span>
                            </div>

                            {filteredConversionActions.map((action) => (
                              <div
                                key={action.id}
                                className={cn(
                                  "flex items-center gap-3 px-4 py-3 border-b border-sandstorm-s40 last:border-b-0 hover:bg-sandstorm-s5 transition-colors cursor-pointer",
                                  selectedConversionMetrics.includes(action.name) && "bg-sandstorm-s5",
                                )}
                                onClick={() => toggleConversionMetric(action.name)}
                              >
                                <Checkbox
                                  checked={selectedConversionMetrics.includes(action.name)}
                                  onChange={() => toggleConversionMetric(action.name)}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[13px] font-medium text-forest-f60">{action.name}</p>
                                    {recommendedConversionName === action.name && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-forest-f40">
                                        (<Star className="w-3 h-3 fill-forest-f40" /> Recommended)
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-forest-f30">
                                    {action.category ? action.category.replace(/_/g, " ").toLowerCase() : "conversion"}
                                    {action.status ? ` \u00B7 ${action.status.toLowerCase()}` : ""}
                                  </p>
                                </div>
                              </div>
                            ))}

                            {filteredConversionActions.length === 0 && (
                              <div className="px-4 py-6 text-center text-[13px] text-forest-f30">
                                No conversion actions match your search
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Target Type + Target Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Target Type</label>
                  <div className="flex items-center gap-4 mt-1">
                    {TARGET_TYPES.map((t) => (
                      <Radio
                        key={t.value}
                        name="targetType"
                        value={t.value}
                        checked={targetType === t.value}
                        onChange={() => setTargetType(t.value)}
                        label={t.label}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="form-label">{targetLabel}</label>
                  <input
                    type="number"
                    className="campaign-input w-full"
                    placeholder={targetLabel}
                    min={0}
                    step="0.01"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="form-label">Tags</label>
                <div
                  className="flex flex-wrap items-center gap-2 min-h-[40px] px-3 py-2 bg-[#FEFEFB] border border-[#e5e7eb] rounded-lg transition-all focus-within:border-[#136D6D] focus-within:shadow-[0_0_0_1px_rgba(19,109,109,0.1)]"
                >
                  {parsedTags.map((tag) => (
                    <Chip key={tag} variant="default" onClose={() => handleRemoveTag(tag)}>
                      {tag}
                    </Chip>
                  ))}
                  <input
                    type="text"
                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-[12px] text-forest-f60 placeholder:text-[#9ca3af]"
                    placeholder={parsedTags.length === 0 ? "Type and press Enter to add tags..." : "Add more..."}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={handleAddTag}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Review & Create ── */}
          {!successMessage && step === 3 && (
            <div className="space-y-5">
              <h3 className="text-[15px] font-medium text-forest-f60">
                Review Portfolio
              </h3>

              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-[13px]">
                <div>
                  <span className="text-forest-f30">Name</span>
                  <p className="text-forest-f60 font-medium">{name}</p>
                </div>
                <div>
                  <span className="text-forest-f30">Platform</span>
                  <p className="text-forest-f60 font-medium capitalize">{platform}</p>
                </div>
                <div>
                  <span className="text-forest-f30">Total Budget</span>
                  <p className="text-forest-f60 font-medium">
                    ${parseFloat(totalBudget || "0").toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-forest-f30">Campaigns</span>
                  <p className="text-forest-f60 font-medium">{campaigns.length}</p>
                </div>
                {startDate && (
                  <div>
                    <span className="text-forest-f30">Start Date</span>
                    <p className="text-forest-f60 font-medium">{startDate}</p>
                  </div>
                )}
                {endDate && (
                  <div>
                    <span className="text-forest-f30">End Date</span>
                    <p className="text-forest-f60 font-medium">{endDate}</p>
                  </div>
                )}
                {targetType && (
                  <>
                    <div>
                      <span className="text-forest-f30">Target</span>
                      <p className="text-forest-f60 font-medium">{targetType}</p>
                    </div>
                    {targetValue && (
                      <div>
                        <span className="text-forest-f30">Target Value</span>
                        <p className="text-forest-f60 font-medium">{targetValue}</p>
                      </div>
                    )}
                  </>
                )}
                <div className="col-span-2">
                  <span className="text-forest-f30">Performance Tracking</span>
                  <p className="text-forest-f60 font-medium capitalize">{metricType} Metrics</p>
                </div>
                <div className="col-span-2">
                  <span className="text-forest-f30">Tracked Metrics</span>
                  <p className="text-forest-f60 font-medium">
                    {selectedMetricNames.length > 0 ? selectedMetricNames.join(", ") : "None selected"}
                  </p>
                </div>
                {parsedTags.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-forest-f30">Tags</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {parsedTags.map((tag) => (
                        <Chip key={tag} variant="outline">{tag}</Chip>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[13px] text-forest-f30 mb-2">Campaigns</p>
                <div className="max-h-[200px] overflow-y-auto space-y-1">
                  {campaigns.map((c) => (
                    <div
                      key={c.campaignId}
                      className="px-3 py-2 bg-sandstorm-s5 border border-sandstorm-s40 rounded text-[12px] text-forest-f60"
                    >
                      {c.campaignName}
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-r0 border border-red-200 rounded-lg text-[13px] text-red-r30">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!successMessage && <div className="flex items-center justify-between px-6 py-4 border-t border-sandstorm-s40">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1 text-[13px] text-forest-f30 hover:text-forest-f60 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-[13px] text-forest-f30 hover:text-forest-f60 transition-colors"
            >
              Cancel
            </button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                className="create-entity-button"
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isEditMode ? updateMutation.isPending : createMutation.isPending}
                className="create-entity-button"
              >
                {(isEditMode ? updateMutation.isPending : createMutation.isPending) ? (
                  <span className="flex items-center gap-2">
                    <Loader size="sm" /> {isEditMode ? "Updating..." : "Creating..."}
                  </span>
                ) : isEditMode ? (
                  "Update Portfolio"
                ) : (
                  "Create Portfolio"
                )}
              </Button>
            )}
          </div>
        </div>}
      </div>
    </BaseModal>
  );
};
