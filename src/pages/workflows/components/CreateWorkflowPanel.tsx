import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, Eye, GripVertical, FileText, Wand2, Plus, Trash2 } from "lucide-react";
import { Dropdown, Radio, Alert, Loader } from "../../../components/ui";
import type { DropdownOption } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import { useChannels } from "../../../hooks/queries/useChannels";
import { useGoogleProfiles } from "../../../hooks/queries/useGoogleProfiles";
import { useWorkflows } from "../hooks/useWorkflows";
import { useBrandSettings } from "../hooks/useBrandSettings";
import { ScheduleBuilder } from "./ScheduleBuilder";
import { NextRunsPreview } from "./NextRunsPreview";
import { WorkflowPreviewModal } from "./WorkflowPreviewModal";
import { PromptBuilderModal } from "./PromptBuilderModal";
import { MarkdownPromptEditor } from "./MarkdownPromptEditor";
import {
  getCurrentTimezone,
  formatTimezoneDisplayParts,
  getTimezoneOptions,
  normalizeSchedule,
  sanitizeScheduleForApi,
  toWeekdaysArray,
  toMonthDaysArray,
} from "../utils/scheduleUtils";
import type { Workflow, ScheduleConfig, DeliveryAction } from "../../../services/workflows";

interface CreateWorkflowPanelProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: number | undefined;
  editingWorkflow?: Workflow;
}

const defaultSchedule: ScheduleConfig = {
  frequency: "daily",
  time: "09:00",
  timezone: getCurrentTimezone(),
};

const PANEL_WIDTH_KEY = "stellar-create-workflow-panel-width";
const DEFAULT_PANEL_WIDTH = 600;
const MIN_PANEL_WIDTH = 400;
const MAX_PANEL_WIDTH = 900;

function getStoredPanelWidth(): number {
  try {
    const stored = localStorage.getItem(PANEL_WIDTH_KEY);
    if (stored != null) {
      const n = parseInt(stored, 10);
      if (!Number.isNaN(n)) return Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, n));
    }
  } catch {
    // ignore
  }
  return DEFAULT_PANEL_WIDTH;
}

export const CreateWorkflowPanel: React.FC<CreateWorkflowPanelProps> = ({
  isOpen,
  onClose,
  accountId,
  editingWorkflow,
}) => {
  const { createWorkflow, isCreating, updateWorkflow, isUpdating } =
    useWorkflows(accountId);
  const { data: channels = [] } = useChannels(accountId);
  const { settings: brandSettings } = useBrandSettings(accountId);

  const [name, setName] = useState("");
  const [channelId, setChannelId] = useState<number | undefined>();
  const [profileId, setProfileId] = useState<number | undefined>();
  const [profileName, setProfileName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [promptBuilderOpen, setPromptBuilderOpen] = useState(false);
  const [format, setFormat] = useState<"pdf" | "docx">("pdf");
  const [useDefaultDelivery, setUseDefaultDelivery] = useState(true);
  const [deliveryAction, setDeliveryAction] = useState<DeliveryAction>({
    type: "email",
    emails: [""],
  });
  const [schedule, setSchedule] = useState<ScheduleConfig>(defaultSchedule);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(getStoredPanelWidth);
  const [isResizing, setIsResizing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const selectedChannel = channels.find((c) => c.id === channelId);
  const isGoogle = selectedChannel?.channel_type === "google";

  const googleChannelId = isGoogle ? channelId : undefined;
  const {
    data: googleProfilesData,
    isLoading: isLoadingProfiles,
  } = useGoogleProfiles(googleChannelId);
  const googleProfiles = googleProfilesData?.profiles ?? [];

  // Reset form on open/close or editing change
  useEffect(() => {
    if (!isOpen) {
      setPreviewOpen(false);
      setPromptBuilderOpen(false);
      return;
    }
    if (editingWorkflow) {
      setName(editingWorkflow.name || "");
      setChannelId(editingWorkflow.channelId ?? undefined);
      setProfileId(editingWorkflow.profileId ?? undefined);
      setProfileName(editingWorkflow.profileName);
      setPrompt(editingWorkflow.prompt);
      setFormat(editingWorkflow.format);
      setUseDefaultDelivery(editingWorkflow.deliveryAction == null);
      const da = editingWorkflow.deliveryAction;
      if (da?.type === "slack") {
        setDeliveryAction({
          type: "slack",
          webhookUrl: da.webhookUrl ?? "",
        });
      } else {
        const emails =
          da?.emails?.filter(Boolean) ?? [];
        setDeliveryAction({
          type: "email",
          emails: emails.length ? emails : [""],
        });
      }
      setSchedule(normalizeSchedule(editingWorkflow.schedule));
    } else {
      setName("");
      setChannelId(undefined);
      setProfileId(undefined);
      setProfileName("");
      setPrompt("");
      setFormat("pdf");
      setUseDefaultDelivery(true);
      setDeliveryAction({ type: "email", emails: [""] });
      setSchedule({ ...defaultSchedule, timezone: getCurrentTimezone() });
    }
    setErrors({});
  }, [isOpen, editingWorkflow]);

  // Reset profile when channel changes
  useEffect(() => {
    if (!editingWorkflow) {
      setProfileId(undefined);
      setProfileName("");
    }
  }, [channelId]);

  // Persist panel width
  useEffect(() => {
    try {
      localStorage.setItem(PANEL_WIDTH_KEY, String(panelWidth));
    } catch {
      // ignore
    }
  }, [panelWidth]);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { startX: e.clientX, startWidth: panelWidth };
    setIsResizing(true);
    const onMove = (ev: MouseEvent) => {
      const start = dragRef.current;
      if (!start) return;
      const delta = start.startX - ev.clientX;
      setPanelWidth(
        Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, start.startWidth + delta))
      );
    };
    const onUp = () => {
      dragRef.current = null;
      setIsResizing(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleResizeDoubleClick = () => {
    setPanelWidth(DEFAULT_PANEL_WIDTH);
  };

  const channelOptions: DropdownOption<number>[] = channels.map((c) => ({
    value: c.id,
    label: c.channel_name,
  }));

  const profileOptions: DropdownOption<number>[] = useMemo(() => {
    if (isGoogle) {
      return googleProfiles
        .filter((p) => p.is_selected)
        .map((p) => ({
          value: p.id,
          label: `${p.name} (${p.customer_id})`,
        }));
    }
    // For non-Google, use channel itself as the profile
    if (selectedChannel) {
      return [
        {
          value: selectedChannel.id,
          label: selectedChannel.channel_name,
        },
      ];
    }
    return [];
  }, [isGoogle, googleProfiles, selectedChannel]);

  const timezoneOptions: DropdownOption<string>[] = useMemo(() => {
    return getTimezoneOptions().map((tz) => ({
      value: tz.value,
      label: tz.label,
    }));
  }, []);

  const tzParts = formatTimezoneDisplayParts(schedule.timezone || getCurrentTimezone());

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!prompt.trim()) e.prompt = "Prompt is required";
    if (!useDefaultDelivery) {
      if (deliveryAction.type === "email") {
        const emails = (deliveryAction.emails ?? []).map((s) => s.trim()).filter(Boolean);
        if (emails.length === 0) e.delivery = "Add at least one email address";
        else if (emails.some((addr) => !emailRegex.test(addr)))
          e.delivery = "Enter valid email addresses";
      } else if (deliveryAction.type === "slack") {
        if (!deliveryAction.webhookUrl?.trim())
          e.delivery = "Enter a Slack webhook URL";
      }
    }
    if (
      schedule.frequency === "once" &&
      !schedule.date
    )
      e.schedule = "Select a date";
    if (
      schedule.frequency === "weekly" &&
      toWeekdaysArray(schedule.weekdays).length === 0
    )
      e.schedule = "Select at least one day";
    if (
      schedule.frequency === "monthly" &&
      toMonthDaysArray(schedule.monthDays).length === 0
    )
      e.schedule = "Select at least one day";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    const isValid = validate();
    if (!isValid) {
      contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!accountId) return;
    try {
      const payload = {
        name: name.trim(),
        accountId,
        channelId,
        channelName: selectedChannel?.channel_name ?? "",
        profileId,
        profileName,
        prompt: prompt.trim(),
        format,
        deliveryAction: useDefaultDelivery
          ? null
          : deliveryAction.type === "email"
            ? {
              type: "email" as const,
              emails: (deliveryAction.emails ?? [])
                .map((s) => s.trim())
                .filter(Boolean),
            }
            : {
              type: "slack" as const,
              webhookUrl: deliveryAction.webhookUrl?.trim() ?? "",
            },
        schedule: sanitizeScheduleForApi(schedule),
      };

      if (editingWorkflow) {
        await updateWorkflow({ id: editingWorkflow.id, payload });
      } else {
        await createWorkflow(payload);
      }
      onClose();
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    }
  };

  if (!isOpen) return null;

  const isSaving = isCreating || isUpdating;

  return (
    <>
      {/* Backdrop — prevent close during save */}
      <div
        className={cn(
          "fixed inset-0 z-[190] transition-colors",
          isSaving ? "bg-black/50 cursor-wait" : "bg-black/40"
        )}
        onClick={isSaving ? undefined : onClose}
      />
      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full bg-white shadow-xl z-[200] flex flex-col animate-slide-in-right"
        style={{ width: `${panelWidth}px`, minWidth: `${MIN_PANEL_WIDTH}px` }}
      >
        {/* Resize handle - left edge */}
        <div
          onMouseDown={handleResizeMouseDown}
          onDoubleClick={handleResizeDoubleClick}
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-[201] w-2 h-16 flex items-center justify-center rounded-r cursor-col-resize transition-colors outline-none focus-visible:ring-2 focus-visible:ring-forest-f40 focus-visible:ring-offset-1 ${isResizing
              ? "bg-forest-f40 text-white"
              : "bg-sandstorm-s40 hover:bg-forest-f40/80 text-forest-f60 hover:text-white border border-r-0 border-sandstorm-s40"
            }`}
          title="Drag to resize · Double-click to reset"
          aria-label="Resize panel"
          tabIndex={0}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3 h-3 opacity-70" strokeWidth={2} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-sandstorm-s40">
          <h2 className="text-base font-agrandir font-medium text-forest-f60">
            {editingWorkflow ? "Edit Workflow" : "Create Workflow"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-sandstorm-s10 text-forest-f30 transition-colors"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto px-5 py-3 space-y-5"
        >
          {errors.form && (
            <Alert variant="error">{errors.form}</Alert>
          )}

          <div>
            <label className="block text-[13px] font-medium text-forest-f60 mb-1">
              Workflow Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name)
                  setErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="e.g. Weekly Performance Report"
              className={cn(
                "campaign-input w-full",
                errors.name && "border-red-500 focus:ring-red-500"
              )}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            )}
          </div>
          {/* Section: Basic (Name + Target) */}
          <div className="rounded-lg border border-sandstorm-s40 bg-sandstorm-s5 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-forest-f60 border-b border-sandstorm-s40 pb-2 -mt-0.5">
              Target
            </h3>


            {channels.length === 0 ? (
              <Alert variant="warning">
                No integrations found. Add integrations first to create a
                workflow.
              </Alert>
            ) : (
              <>
                <div>
                  <label className="block text-[13px] font-medium text-forest-f60 mb-1">
                    Integration
                  </label>
                  <Dropdown
                    options={channelOptions}
                    value={channelId}
                    onChange={(val) => {
                      setChannelId(val);
                      if (errors.channel)
                        setErrors((prev) => ({ ...prev, channel: "" }));
                    }}
                    placeholder="Select integration"
                    searchable
                  />
                  {errors.channel && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.channel}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-forest-f60 mb-1">
                    Profile
                  </label>
                  {channelId && isGoogle && isLoadingProfiles ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-sandstorm-s5 rounded-lg border border-sandstorm-s40">
                      <Loader size="sm" showMessage={false} />
                      <span className="text-sm text-forest-f30">
                        Loading profiles...
                      </span>
                    </div>
                  ) : channelId && profileOptions.length === 0 ? (
                    <Alert variant="warning">
                      No profiles available. Connect profiles for this
                      integration first.
                    </Alert>
                  ) : (
                    <Dropdown
                      options={profileOptions}
                      value={profileId}
                      onChange={(val, opt) => {
                        setProfileId(val);
                        setProfileName(opt.label);
                        if (errors.profile)
                          setErrors((prev) => ({ ...prev, profile: "" }));
                      }}
                      placeholder="Select profile"
                      searchable
                      disabled={!channelId}
                    />
                  )}
                  {errors.profile && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.profile}
                    </p>
                  )}
                </div>
              </>
            )}
            {!channelId && (
              <p className="text-xs text-forest-f30 italic">
                No integration selected — report will include all integrations.
              </p>
            )}
            {channelId && !profileId && (
              <p className="text-xs text-forest-f30 italic">
                No profile selected — report will include all profiles for this integration.
              </p>
            )}
          </div>

          {/* Section: Action */}
          <div className="rounded-lg border border-sandstorm-s40 bg-sandstorm-s5 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-forest-f60 border-b border-sandstorm-s40 pb-2 -mt-0.5">
              Action
            </h3>

            {/* Prompt */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="text-[13px] font-medium text-forest-f60">
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-forest-f40" />
                    Prompt
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setPromptBuilderOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] text-forest-f40 hover:bg-forest-f0 border border-forest-f40/40 transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Build prompt
                </button>
              </div>
              <MarkdownPromptEditor
                value={prompt}
                onChange={(val) => {
                  setPrompt(val);
                  if (errors.prompt) setErrors((prev) => ({ ...prev, prompt: "" }));
                }}
                placeholder="Describe the report you want to generate, or click Build prompt... (markdown supported)"
                minHeight="72px"
                error={!!errors.prompt}
              />
              {errors.prompt && (
                <p className="mt-1 text-xs text-red-600">{errors.prompt}</p>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-medium text-forest-f60 mb-1">
                Output Format
              </label>
              <div className="flex items-center gap-4">
                <Radio
                  checked={format === "pdf"}
                  onChange={() => setFormat("pdf")}
                  label="PDF"
                />
                <Radio
                  checked={format === "docx"}
                  onChange={() => setFormat("docx")}
                  label="DOCX"
                />
              </div>
            </div>
          </div>

          {/* Section: Delivery */}
          <div className="rounded-lg border border-sandstorm-s40 bg-sandstorm-s5 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-forest-f60 border-b border-sandstorm-s40 pb-2 -mt-0.5">
              Delivery
            </h3>
            <p className="text-[13px] text-forest-f60">
              Where to send the report after it’s generated.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useDefaultDelivery}
                onChange={(e) => setUseDefaultDelivery(e.target.checked)}
                className="w-4 h-4 text-[#136D6D] focus:ring-[#136D6D] border-gray-300 accent-[#136D6D] mt-0.5"
              />
              <span className="text-[13px] text-forest-f60">
                Use default from Report Settings
                {brandSettings?.deliveryAction?.type === "email" &&
                  (brandSettings.deliveryAction.emails?.length ? (
                    <span className="text-forest-f30 ml-1">
                      ({brandSettings.deliveryAction.emails.length === 1
                        ? brandSettings.deliveryAction.emails[0]
                        : `${brandSettings.deliveryAction.emails.length} emails`})
                    </span>
                  ) : null)}
                {brandSettings?.deliveryAction?.type === "slack" &&
                  brandSettings.deliveryAction.webhookUrl && (
                    <span className="text-forest-f30 ml-1">(Slack)</span>
                  )}
              </span>
            </label>
            {!useDefaultDelivery && (
              <div className="space-y-3">
                <div className="flex gap-4">
                  <Radio
                    name="delivery-type"
                    checked={deliveryAction.type === "email"}
                    onChange={() =>
                      setDeliveryAction({
                        type: "email",
                        emails:
                          (deliveryAction.emails ?? [""]).filter(Boolean)
                            .length > 0
                            ? deliveryAction.emails ?? [""]
                            : [""],
                      })
                    }
                    label="Email"
                  />
                  <Radio
                    name="delivery-type"
                    checked={deliveryAction.type === "slack"}
                    onChange={() =>
                      setDeliveryAction({
                        type: "slack",
                        webhookUrl: deliveryAction.webhookUrl ?? "",
                      })
                    }
                    label="Slack"
                  />
                </div>
                {deliveryAction.type === "email" && (
                  <div>
                    <label className="block text-[13px] font-medium text-forest-f60 mb-1">
                      Email addresses
                    </label>
                    {(deliveryAction.emails ?? [""]).map((email, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 mb-2 last:mb-0"
                      >
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            const next = [...(deliveryAction.emails ?? [""])];
                            next[i] = e.target.value;
                            setDeliveryAction((prev) =>
                              prev.type === "email"
                                ? { ...prev, emails: next }
                                : prev
                            );
                          }}
                          placeholder="report@company.com"
                          className={cn(
                            "campaign-input flex-1 min-w-0",
                            errors.delivery &&
                            "border-red-500 focus:ring-red-500"
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = (deliveryAction.emails ?? [""]).filter(
                              (_, j) => j !== i
                            );
                            setDeliveryAction((prev) =>
                              prev.type === "email"
                                ? {
                                  ...prev,
                                  emails: next.length ? next : [""],
                                }
                                : prev
                            );
                          }}
                          className="p-2 text-forest-f30 hover:text-red-r30 rounded transition-colors"
                          aria-label="Remove email"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setDeliveryAction((prev) =>
                          prev.type === "email"
                            ? {
                              ...prev,
                              emails: [...(prev.emails ?? [""]), ""],
                            }
                            : prev
                        )
                      }
                      className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-forest-f40 hover:text-forest-f50"
                    >
                      <Plus className="w-4 h-4" />
                      Add email
                    </button>
                  </div>
                )}
                {deliveryAction.type === "slack" && (
                  <div>
                    <label className="block text-[13px] font-medium text-forest-f60 mb-1">
                      Slack webhook URL
                    </label>
                    <input
                      type="url"
                      value={deliveryAction.webhookUrl ?? ""}
                      onChange={(e) =>
                        setDeliveryAction((prev) =>
                          prev.type === "slack"
                            ? { ...prev, webhookUrl: e.target.value }
                            : prev
                        )
                      }
                      placeholder="https://hooks.slack.com/services/..."
                      className={cn(
                        "campaign-input w-full",
                        errors.delivery && "border-red-500 focus:ring-red-500"
                      )}
                    />
                  </div>
                )}
                {errors.delivery && (
                  <p className="mt-1 text-xs text-red-600">{errors.delivery}</p>
                )}
              </div>
            )}
            {useDefaultDelivery &&
              !(
                (brandSettings?.deliveryAction?.type === "email" &&
                  ((brandSettings.deliveryAction.emails?.length ?? 0) > 0)) ||
                (brandSettings?.deliveryAction?.type === "slack" &&
                  !!brandSettings.deliveryAction.webhookUrl)
              ) && (
                <p className="text-xs text-yellow-y10">
                  Set a default delivery in Report Settings, or choose Custom
                  delivery below.
                </p>
              )}
          </div>

          {/* Section: Schedule */}
          <div className="rounded-lg border border-sandstorm-s40 bg-sandstorm-s5 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-forest-f60 border-b border-sandstorm-s40 pb-2 -mt-0.5">
              Schedule
            </h3>
            <ScheduleBuilder
              value={schedule}
              onChange={(config) => {
                setSchedule(config);
                if (errors.schedule)
                  setErrors((prev) => ({ ...prev, schedule: "" }));
              }}
            />
            {errors.schedule && (
              <p className="text-xs text-red-600">{errors.schedule}</p>
            )}

            {/* Timezone (inside Schedule section) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-forest-f60">
                  Timezone
                </label>
                {tzParts && (
                  <span className="text-[11px] text-forest-f30 tabular-nums">
                    Current: {tzParts.time} {tzParts.abbrev}
                  </span>
                )}
              </div>
              <Dropdown
                options={timezoneOptions}
                value={schedule.timezone}
                onChange={(val) =>
                  setSchedule((prev) => ({ ...prev, timezone: val }))
                }
                placeholder="Select timezone"
                searchable
                searchPlaceholder="Search timezones..."
              />
            </div>

            {/* Next Runs Preview (inside Schedule section) */}
            <NextRunsPreview schedule={schedule} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-start gap-2 px-5 py-3 border-t border-sandstorm-s40">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            disabled={!prompt.trim()}
            className="edit-button flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="w-4 h-4 text-[#072929]" />
            <span className="text-[10.64px] text-[#072929] font-normal">
              Preview
            </span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="create-entity-button inline-flex items-center gap-2"
          >
            {isSaving && (
              <Loader size="sm" showMessage={false} variant="white" />
            )}
            <span className="text-[10.64px] text-white font-normal">
              {isSaving
                ? "Saving..."
                : editingWorkflow
                  ? "Update Workflow"
                  : "Save Workflow"}
            </span>
          </button>
        </div>
      </div>

      <WorkflowPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        mode="preview"
        prompt={prompt.trim() || "Generate a performance report..."}
        format={format}
        integrationName={selectedChannel?.channel_name}
        profileName={profileName || undefined}
        accountId={accountId}
        executePayload={
          accountId
            ? {
              accountId,
              channelId: channelId ?? undefined,
              profileId: profileId ?? undefined,
              accountName: editingWorkflow?.accountName,
              channelName: selectedChannel?.channel_name,
              profileName: profileName || undefined,
              prompt: prompt.trim() || "Generate a performance report...",
              format,
              workflowId: editingWorkflow?.id ?? undefined,
              workflowName: name?.trim() || editingWorkflow?.name,
              logoUrl: brandSettings?.logoUrl || undefined,
              primaryColor: brandSettings?.primaryColor || undefined,
            }
            : undefined
        }
        workflowId={editingWorkflow?.id ?? undefined}
      />

      <PromptBuilderModal
        isOpen={promptBuilderOpen}
        onClose={() => setPromptBuilderOpen(false)}
        initialPrompt={prompt}
        onApply={(p) => {
          setPrompt(p);
          if (errors.prompt) setErrors((prev) => ({ ...prev, prompt: "" }));
        }}
      />
    </>
  );
};
