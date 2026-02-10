import React, { useRef, useEffect, useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { useAssistant, ASSISTANT_PANEL_VIEW, type ThreadWithRuntime } from "../../contexts/AssistantContext";
import type { GraphId } from "../../services/ai/assistant";
import type { CurrentQuestionSchemaItem } from "../../types/agent";
import { Check, Square, X, GripVertical, ChevronDown, BarChart3, Megaphone } from "lucide-react";
import StellarLogo from "../../assets/images/steller-logo-mini.svg";
import { ASSISTANT_ICONS } from "../../assets/icons/assistant-icons";
import type { Thread, ContentBlock, ThreadMessageContent, TextContent, ToolUseContent } from "../../services/ai/threads";
import StellarMarkDown from "../ai/StellarMarkDown";
import { MessageContent } from "../ai/MessageContent";
import { isStringContent } from "../../utils/ai-formatter";
import ToolUseBlock from "../ai/ToolUseBlock";
import CampaignDraftPreview from "../ai/CampaignDraftPreview";
import { accountsService, type Account } from "../../services/accounts";

/** Set to false to hide the "Fill in the details" schema form (e.g. Logo image URL, Daily budget) in campaign setup. */
const SHOW_CAMPAIGN_SCHEMA_FORM = false;

const ASSISTANT_TEXTAREA_MIN_HEIGHT = 24;
const ASSISTANT_TEXTAREA_MAX_HEIGHT = 200;

// Helper function to check if content is a ContentBlock array
const isContentBlockArray = (content: ThreadMessageContent): content is ContentBlock[] => {
  return Array.isArray(content) && content.length > 0 && typeof content[0] === "object" && "type" in content[0];
};

// Helper function to extract plain text from content
const extractTextContent = (content: ThreadMessageContent): string => {
  if (isStringContent(content)) {
    return content;
  }
  if (isContentBlockArray(content)) {
    return content
      .filter((block) => "type" in block && block.type === "text")
      .map((block) => (block as any).text || "")
      .join("\n");
  }
  return "";
};


// Helper function to group threads by date, ordered by latest first
const groupThreadsByDate = (threads: Thread[]): Record<string, Thread[]> => {
  const groups: Record<string, Thread[]> = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Sort threads by updated_at in descending order (latest first)
  const sortedThreads = [...threads].sort((a, b) => {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  sortedThreads.forEach(thread => {
    const threadDate = new Date(thread.updated_at);
    const threadDateStr = threadDate.toDateString();
    const todayStr = today.toDateString();
    const yesterdayStr = yesterday.toDateString();

    let groupKey: string;
    if (threadDateStr === todayStr) {
      groupKey = 'Today';
    } else if (threadDateStr === yesterdayStr) {
      groupKey = 'Yesterday';
    } else {
      // Format as "Jan 15, 2026"
      groupKey = threadDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(thread);
  });

  return groups;
};

export interface SchemaFormBlockHandle {
  getValues(): Record<string, string>;
  clear(): void;
}

/** Form block for current_questions_schema; keyed by schema so it remounts when schema changes. */
const SchemaFormBlock = forwardRef<SchemaFormBlockHandle, {
  questionsSchema: CurrentQuestionSchemaItem[];
  campaignDraft: Record<string, unknown> | undefined;
  onSend: (message: string) => void;
  disabled: boolean;
  /** When form is shown, pass current text input so "Send answers" can include it; and clear callback to clear input after send. */
  inputValue?: string;
  onInputClear?: () => void;
}>(({ questionsSchema, campaignDraft, onSend, disabled, inputValue = "", onInputClear }, ref) => {
  const initialValues = useMemo(() => {
    const next: Record<string, string> = {};
    questionsSchema.forEach((item) => {
      if (item.key) {
        const draftVal = campaignDraft?.[item.key];
        next[item.key] = draftVal != null ? String(draftVal) : "";
      }
    });
    return next;
  }, [questionsSchema, campaignDraft]);
  const [values, setValues] = useState<Record<string, string>>(initialValues);

  useImperativeHandle(ref, () => ({
    getValues: () => ({ ...values }),
    clear: () => setValues(questionsSchema.reduce<Record<string, string>>((acc, item) => ({ ...acc, [item.key]: "" }), {})),
  }), [values, questionsSchema]);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const buildFormParts = (vals: Record<string, string>) =>
    questionsSchema
      .map((item) => {
        const v = vals[item.key]?.trim();
        if (v === "") return null;
        const label = item.label || item.key;
        return `${label}: ${v}`;
      })
      .filter(Boolean) as string[];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    const formParts = buildFormParts(values);
    const textPart = inputValue?.trim() ?? "";
    const combined = [formParts.length > 0 ? formParts.join("\n") : null, textPart].filter(Boolean).join("\n\n");
    if (combined) {
      onSend(combined);
      setValues(questionsSchema.reduce<Record<string, string>>((acc, item) => ({ ...acc, [item.key]: "" }), {}));
      onInputClear?.();
    }
  };

  return (
    <div className="mt-2 p-4 bg-[#F9F9F6] border border-[#E8E8E3] rounded-[10px]">
      <p className="text-sm font-medium text-[#072929] mb-3" style={{ fontFamily: "'GT America Trial', sans-serif" }}>
        Fill in the details
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {questionsSchema.map((item) => {
          const key = item.key;
          const label = item.label || key;
          const isRequired = item.required !== false;
          const inputType =
            item.ui_hint === "url" || item.ui_hint === "image_url"
              ? "url"
              : item.type === "number"
                ? "number"
                : "text";
          const value = values[key] ?? "";
          return (
            <div key={key} className="flex flex-col gap-1">
              <label
                htmlFor={`schema-${key}`}
                className="text-xs font-medium text-[#072929]"
                style={{ fontFamily: "'GT America Trial', sans-serif" }}
              >
                {label}
                {isRequired && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <input
                id={`schema-${key}`}
                type={inputType}
                value={value}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={
                  item.ui_hint === "image_url" || item.ui_hint === "url" ? "https://..." : ""
                }
                className="w-full px-3 py-2 text-sm text-[#072929] bg-white border border-[#E8E8E3] rounded-[8px] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#136D6D]/40 focus:border-[#136D6D]"
                style={{ fontFamily: "'GT America Trial', sans-serif" }}
                disabled={disabled}
              />
            </div>
          );
        })}
        <button
          type="submit"
          disabled={disabled}
          className="self-start mt-1 px-4 py-2 text-sm font-medium bg-[#136D6D] text-white rounded-[8px] hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none transition-opacity"
          style={{ fontFamily: "'GT America Trial', sans-serif" }}
        >
          Send answers
        </button>
      </form>
    </div>
  );
});

SchemaFormBlock.displayName = "SchemaFormBlock";

/** Profile item from GET /accounts/:accountId/profiles/ (channel_id, channel_name, profile name) */
interface AccountProfileOption {
  channel_id: number;
  channel_name: string;
  channel_type: string;
  id: number;
  name?: string;
  profileId?: string;
  ad_account_id?: string;
  customer_id?: string;
  advertiser_id?: string;
  advertiser_name?: string;
}

function profileDisplayName(p: AccountProfileOption): string {
  return p.name ?? p.advertiser_name ?? p.customer_id ?? p.advertiser_id ?? String(p.id);
}

function profileIdForDisplay(p: AccountProfileOption): string {
  return p.customer_id ?? p.advertiser_id ?? p.ad_account_id ?? p.profileId ?? String(p.id);
}

function marketplaceLabel(channelType: string | undefined): string {
  if (!channelType) return "—";
  const m: Record<string, string> = {
    google: "Google",
    meta: "Meta",
    tiktok: "TikTok",
    amazon: "Amazon",
    walmart: "Walmart",
  };
  return m[channelType.toLowerCase()] ?? channelType;
}

interface AssistantPanelProps {
  className?: string;
}

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
  className = "",
}) => {
  const {
    isOpen,
    messages,
    isLoading,
    inputValue,
    setInputValue,
    sendMessage,
    suggestedPrompts,
    currentThinkingSteps,
    isStreaming,
    threads,
    currentThread,
    isLoadingThreads,
    selectThread,
    startNewThread,
    cancelRun,
    selectedGraphId,
    setSelectedGraphId,
    onApplyDraft,
    closeAssistant,
    assistantScope,
    setAssistantScope,
    assistantIntent,
    setAssistantIntent,
  } = useAssistant();

  const threadWithRuntime = currentThread as ThreadWithRuntime | null;
  const campaignState = threadWithRuntime?.campaignState;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyDropdownRef = useRef<HTMLDivElement>(null);
  const schemaFormRef = useRef<SchemaFormBlockHandle | null>(null);
  const [isThreadDropdownOpen, setIsThreadDropdownOpen] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountProfiles, setAccountProfiles] = useState<AccountProfileOption[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isIntegrationProfileDropdownOpen, setIsIntegrationProfileDropdownOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const integrationProfileDropdownRef = useRef<HTMLDivElement>(null);

  // Load accounts when panel is open
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoadingAccounts(true);
    accountsService.getAccounts({ all: true })
      .then((list) => {
        if (!cancelled) setAccounts(list);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAccounts(false);
      });
    return () => { cancelled = true; };
  }, [isOpen]);

  // Load profiles when account is selected
  useEffect(() => {
    if (!assistantScope.accountId) {
      setAccountProfiles([]);
      return;
    }
    const accountIdNum = parseInt(assistantScope.accountId, 10);
    if (Number.isNaN(accountIdNum)) return;
    let cancelled = false;
    setIsLoadingProfiles(true);
    accountsService.getAccountProfiles(accountIdNum)
      .then((res) => {
        if (!cancelled && res?.profiles) setAccountProfiles(res.profiles as AccountProfileOption[]);
      })
      .catch(() => {
        if (!cancelled) setAccountProfiles([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProfiles(false);
      });
    return () => { cancelled = true; };
  }, [assistantScope.accountId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(target)) {
        setIsThreadDropdownOpen(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(target)) {
        setIsAccountDropdownOpen(false);
      }
      if (integrationProfileDropdownRef.current && !integrationProfileDropdownRef.current.contains(target)) {
        setIsIntegrationProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-grow textarea so user can see what they type; cap at ASSISTANT_TEXTAREA_MAX_HEIGHT
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const h = Math.min(ASSISTANT_TEXTAREA_MAX_HEIGHT, Math.max(ASSISTANT_TEXTAREA_MIN_HEIGHT, ta.scrollHeight));
    ta.style.height = `${h}px`;
    ta.style.overflowY = ta.scrollHeight > ASSISTANT_TEXTAREA_MAX_HEIGHT ? "auto" : "hidden";
  }, [inputValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isStreaming) return;
    if (!canChat) return;
    const textPart = inputValue.trim();
    const formValues = SHOW_CAMPAIGN_SCHEMA_FORM && hasQuestionsSchema && schemaFormRef.current ? schemaFormRef.current.getValues() : {};
    const schema = SHOW_CAMPAIGN_SCHEMA_FORM && hasQuestionsSchema ? (questionsSchema as CurrentQuestionSchemaItem[]) : [];
    const formParts =
      schema.length > 0 && Object.keys(formValues).length > 0
        ? (schema
            .map((item) => {
              const v = formValues[item.key]?.trim();
              if (!v) return null;
              return `${item.label || item.key}: ${v}`;
            })
            .filter(Boolean) as string[])
        : [];
    const formBlock = formParts.length > 0 ? formParts.join("\n") : "";
    const combined = [formBlock, textPart].filter(Boolean).join("\n\n");
    if (combined) {
      sendMessage(combined);
      setInputValue("");
      if (formParts.length > 0) schemaFormRef.current?.clear();
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.preventDefault();
    cancelRun();
  };

  const handlePromptClick = (promptText: string) => {
    if (!canChat) return;
    sendMessage(promptText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    // Shift+Enter: allow default (insert newline)
  };

  const handleThreadSelect = async (threadId: string) => {
    await selectThread(threadId);
    setIsThreadDropdownOpen(false);
  };

  const handleNewThread = () => {
    startNewThread();
    setAssistantIntent(null);
    setIsThreadDropdownOpen(false);
  };

  const handleGraphChange = (graphId: GraphId) => {
    if (graphId === selectedGraphId) return;
    setSelectedGraphId(graphId);
    startNewThread();
    setIsThreadDropdownOpen(false);
  };

  const questionsSchema = campaignState?.current_questions_schema;
  const hasQuestionsSchema = questionsSchema && questionsSchema.length > 0;
  const schemaFormKey = hasQuestionsSchema
    ? (questionsSchema as CurrentQuestionSchemaItem[]).map((q) => q.key).join(",")
    : "";

  const groupedThreads = groupThreadsByDate(threads);
  const hasMessages = messages.length > 0;

  const selectedAccount = accounts.find((a) => String(a.id) === assistantScope.accountId);
  const selectedProfileOption = accountProfiles.find(
    (p) => String(p.channel_id) === assistantScope.channelId && String(p.id) === assistantScope.profileId
  );

  const canChat = !!(
    assistantScope.accountId &&
    assistantScope.channelId &&
    assistantScope.profileId &&
    assistantIntent
  );

  const contextSection = (
    <div className="w-full max-w-md bg-[#f9f9f6] border border-[#e8e8e3] rounded-xl p-4 space-y-4">
      <p className="text-xs font-medium text-[#556179] uppercase tracking-wide text-center">
        Set up your session in 3 steps
      </p>

      {/* Step 1: Account */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-sm font-medium text-[#072929]">
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${assistantScope.accountId ? "bg-[#136D6D] text-white" : "bg-[#e8e8e3] text-[#6b7280]"}`}>
            1
          </span>
          1. Select account
        </label>
        <div className="relative" ref={accountDropdownRef}>
          <button
            type="button"
            onClick={() => setIsAccountDropdownOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-[#072929] bg-white border border-[#e8e8e3] rounded-lg hover:border-[#136D6D] transition-colors"
            aria-haspopup="listbox"
            aria-expanded={isAccountDropdownOpen}
            aria-label="Select account"
          >
            <span className="truncate text-left">
              {selectedAccount ? `${selectedAccount.name}` : "Choose an account"}
            </span>
            <ChevronDown className="w-4 h-4 shrink-0 text-[#6b7280]" />
          </button>
          {isAccountDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto bg-white rounded-lg border border-[#e8e8e3] shadow-lg z-50 py-1">
              {isLoadingAccounts ? (
                <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
              ) : accounts.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No accounts</div>
              ) : (
                accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      setAssistantScope({ accountId: String(acc.id), channelId: null, profileId: null });
                      setIsAccountDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${assistantScope.accountId === String(acc.id) ? "bg-[#136D6D]/10 text-[#072929] font-medium" : "text-[#072929] hover:bg-[#f0f0f0]"}`}
                  >
                    {acc.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Step 2: Integration & profile */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-sm font-medium text-[#072929]">
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${assistantScope.accountId ? "bg-[#136D6D] text-white" : "bg-[#e8e8e3] text-[#6b7280]"}`}>
            2
          </span>
          2. Select integration & profile
        </label>
        <div className="relative" ref={integrationProfileDropdownRef}>
          <button
            type="button"
            onClick={() => assistantScope.accountId && setIsIntegrationProfileDropdownOpen((v) => !v)}
            disabled={!assistantScope.accountId}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-[#072929] bg-white border border-[#e8e8e3] rounded-lg hover:border-[#136D6D] transition-colors disabled:opacity-60 disabled:pointer-events-none disabled:cursor-not-allowed"
            aria-haspopup="listbox"
            aria-expanded={isIntegrationProfileDropdownOpen}
            aria-label="Select integration and profile"
          >
            <span className="truncate text-left">
              {selectedProfileOption
                ? `${profileDisplayName(selectedProfileOption)} (${profileIdForDisplay(selectedProfileOption)})`
                : assistantScope.accountId
                  ? "Choose integration & profile"
                  : "Select an account first"}
            </span>
            <ChevronDown className="w-4 h-4 shrink-0 text-[#6b7280]" />
          </button>
          {isIntegrationProfileDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto bg-white rounded-lg border border-[#e8e8e3] shadow-lg z-50 py-1">
              {isLoadingProfiles ? (
                <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
              ) : accountProfiles.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No profiles. Select an account first.</div>
              ) : (
                accountProfiles.map((p) => {
                  const label = `${profileDisplayName(p)} (${profileIdForDisplay(p)})`;
                  const isSelected =
                    assistantScope.channelId === String(p.channel_id) && assistantScope.profileId === String(p.id);
                  return (
                    <button
                      key={`${p.channel_id}-${p.id}`}
                      type="button"
                      onClick={() => {
                        setAssistantScope({ channelId: String(p.channel_id), profileId: String(p.id) });
                        setIsIntegrationProfileDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${isSelected ? "bg-[#136D6D]/10 text-[#072929] font-medium" : "text-[#072929] hover:bg-[#f0f0f0]"}`}
                    >
                      {label}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Step 3: What would you like to do? */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-sm font-medium text-[#072929]">
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${assistantScope.channelId && assistantScope.profileId ? "bg-[#136D6D] text-white" : "bg-[#e8e8e3] text-[#6b7280]"}`}>
            3
          </span>
          3. What would you like to do?
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAssistantIntent(assistantIntent === "analyze" ? null : "analyze")}
            disabled={!assistantScope.accountId || !assistantScope.channelId || !assistantScope.profileId}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:pointer-events-none ${
              assistantIntent === "analyze"
                ? "bg-[#136D6D] text-white border-[#136D6D]"
                : "bg-white text-[#072929] border-[#e8e8e3] hover:border-[#136D6D]"
            }`}
            title="Analyze campaigns"
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            Analyze
          </button>
          <button
            type="button"
            onClick={() => {
              setAssistantIntent(assistantIntent === "create_campaign" ? null : "create_campaign");
              if (assistantIntent !== "create_campaign") setSelectedGraphId("campaign_setup");
            }}
            disabled={!assistantScope.accountId || !assistantScope.channelId || !assistantScope.profileId}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:pointer-events-none ${
              assistantIntent === "create_campaign"
                ? "bg-[#136D6D] text-white border-[#136D6D]"
                : "bg-white text-[#072929] border-[#e8e8e3] hover:border-[#136D6D]"
            }`}
            title="Create campaign"
          >
            <Megaphone className="w-4 h-4 shrink-0" />
            Create Campaign
          </button>
        </div>
      </div>
    </div>
  );

  const hasScopeSummary = selectedAccount || selectedProfileOption || assistantIntent;

  return (
    <div
      className={`flex flex-col h-full bg-[var(--color-semantic-background-primary)] shadow-lg ${className}`}
    >
      {/* Header: scope summary (when selected) + thread row */}
      <div className="border-b border-[#e8e8e3]">
        {hasScopeSummary && (
          <div className="px-4 py-2.5 bg-[#f9f9f6] border-b border-[#e8e8e3]">
            <div className="flex flex-wrap items-center gap-2">
              {selectedAccount && (
                <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#556179] shrink-0">
                    Account
                  </span>
                  <span
                    className="text-xs font-medium text-[#072929] truncate rounded bg-white/80 px-2 py-0.5 border border-[#e8e8e3]"
                    title={selectedAccount.name}
                  >
                    {selectedAccount.name}
                  </span>
                </div>
              )}
              {selectedProfileOption && (
                <>
                  {selectedAccount && (
                    <span className="text-[#d0d0cc] shrink-0" aria-hidden>
                      •
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#556179] shrink-0">
                      Profile
                    </span>
                    <span
                      className="text-xs font-medium text-[#072929] truncate rounded bg-white/80 px-2 py-0.5 border border-[#e8e8e3]"
                      title={`${profileDisplayName(selectedProfileOption)} (${profileIdForDisplay(selectedProfileOption)})`}
                    >
                      {profileDisplayName(selectedProfileOption)} ({profileIdForDisplay(selectedProfileOption)})
                    </span>
                  </div>
                </>
              )}
              {assistantIntent && (
                <>
                  {(selectedAccount || selectedProfileOption) && (
                    <span className="text-[#d0d0cc] shrink-0" aria-hidden>
                      •
                    </span>
                  )}
                  <span
                    className={`text-xs font-medium rounded px-2 py-0.5 shrink-0 ${
                      assistantIntent === "analyze"
                        ? "bg-[#136D6D]/12 text-[#136D6D] border border-[#136D6D]/30"
                        : "bg-[#136D6D]/12 text-[#136D6D] border border-[#136D6D]/30"
                    }`}
                  >
                    {assistantIntent === "analyze" ? "Analyze" : "Create Campaign"}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img src={ASSISTANT_ICONS.logo} alt="Stellar" className="h-6 w-6 shrink-0" />
            <span className="text-sm font-medium text-[#072929] truncate">
              {currentThread?.metadata?.title || "New Chat"}
            </span>
          </div>

        {/* Intent display: Analyze | Create Campaign (read-only, reflects initial selection) */}
        <div className="flex items-center rounded-lg border border-[#e8e8e3] p-0.5 shrink-0 mx-2">
          <span
            className={`px-2 py-1 text-xs font-medium rounded-md ${assistantIntent === "analyze" ? "bg-[#136D6D] text-white" : "text-[#6b7280] bg-transparent"}`}
          >
            Analyze
          </span>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-md ${assistantIntent === "create_campaign" ? "bg-[#136D6D] text-white" : "text-[#6b7280] bg-transparent"}`}
          >
            Create Campaign
          </span>
        </div>

        <CampaignDraftPreview
          campaignState={campaignState}
          visible={assistantIntent === "create_campaign"}
          onApplyDraft={onApplyDraft}
          className="shrink-0"
        />

        <div className="flex items-center gap-2 shrink-0">
          {/* New Thread Button */}
          <button
            onClick={handleNewThread}
            className="p-2 hover:opacity-70 transition-opacity"
            title="New conversation"
          >
            <img src={ASSISTANT_ICONS.newThread} alt="New thread" className="w-5 h-5" />
          </button>

          {/* Chat History Button + dropdown (ref so click outside closes it) */}
          <div ref={historyDropdownRef} className="relative">
          <button
            onClick={() => setIsThreadDropdownOpen(!isThreadDropdownOpen)}
            className="p-2 relative"
            title="Chat history"
          >
            <img src={ASSISTANT_ICONS.chatHistory} alt="Chat history" className="w-5 h-5" />

            {/* Dropdown Menu */}
            {isThreadDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-80 bg-white rounded-xl shadow-xl border border-[#e8e8e3] z-50 max-h-[600px] overflow-y-auto">
                {/* History Header */}
                <div className="sticky top-0 px-4 py-3 border-b border-[#e8e8e3] bg-white rounded-t-xl">
                  <h3 className="text-lg font-medium text-[#072929]">History</h3>
                </div>

                {/* Loading State */}
                {isLoadingThreads ? (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    Loading conversations...
                  </div>
                ) : threads.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    No previous conversations
                  </div>
                ) : (
                  /* Thread List Grouped by Date */
                  Object.entries(groupedThreads)
                    .sort(([keyA], [keyB]) => {
                      // Order: Today, Yesterday, then by date descending
                      const order: Record<string, number> = { 'Today': 0, 'Yesterday': 1 };
                      const orderA = order[keyA] ?? 2;
                      const orderB = order[keyB] ?? 2;

                      if (orderA !== orderB) return orderA - orderB;

                      // If both are dates, sort by date descending
                      if (orderA === 2) {
                        return new Date(keyB).getTime() - new Date(keyA).getTime();
                      }
                      return 0;
                    })
                    .map(([dateGroup, groupThreads]) => (
                      <div key={dateGroup}>
                        {/* Date Group Header with Count */}
                        <div className="flex items-center justify-between px-4 py-2 border-b border-[#e8e8e3] bg-[#f9f9f6]">
                          <span className="text-sm font-medium text-[#072929]">{dateGroup}</span>
                          <span className="text-sm text-[#072929]">{groupThreads.length} Total</span>
                        </div>

                        {/* Threads in Group */}
                        {groupThreads.map((thread) => (
                          <button
                            key={thread.thread_id}
                            onClick={() => handleThreadSelect(thread.thread_id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors border-b border-[#f0f0f0] ${currentThread?.thread_id === thread.thread_id
                              ? 'bg-[#f0f0f0] text-[#072929]'
                              : 'text-[#072929] hover:bg-[#f9f9f6]'
                              }`}
                          >
                            {/* Chat Bubble Icon */}
                            <svg className="w-4 h-4 shrink-0 text-[#072929]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <span className="truncate flex-1">{thread.metadata?.title || 'Untitled'}</span>
                            {currentThread?.thread_id === thread.thread_id && (
                              <Check className="w-4 h-4 text-[#072929] shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    ))
                )}
              </div>
            )}
          </button>
          </div>

          {/* Close Assistant */}
          <button
            type="button"
            onClick={closeAssistant}
            className="p-2 rounded-md text-[#072929] hover:bg-[#f0f0f0] transition-colors"
            title="Close assistant"
            aria-label="Close assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto interactive-scrollbar px-4 py-4">
        {!hasMessages ? (
          /* Empty State: show 3-step setup until user selects Analyze or Create Campaign; then hide setup and show prompts only */
          <div className="flex flex-col items-center justify-center h-full gap-6">
            {/* Set up your session - hidden as soon as user clicks Analyze or Create Campaign */}
            {!assistantIntent && contextSection}

            {/* Assistant Icon */}
            <div className="mb-0">
              <img src={StellarLogo} alt="Assistant" className="h-16 w-16" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              Assistant
            </h3>

            {!assistantIntent ? (
              <p className="text-sm text-gray-600 text-center px-4">
                {!assistantScope.accountId
                  ? "Select an account above to start."
                  : !assistantScope.channelId || !assistantScope.profileId
                    ? "Select an integration–profile above to start."
                    : "Click Analyze or Create Campaign above to continue."}
              </p>
            ) : (
              /* Suggested Prompts - only after user clicks Analyze or Create Campaign */
              <div className="w-full max-w-sm">
                <p className="text-sm text-gray-600 mb-3">Would you like to:</p>
                <div className="flex flex-col gap-2">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt.id}
                      onClick={() => handlePromptClick(prompt.text)}
                      className="assistant-prompt-button"
                    >
                      {prompt.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Messages List */
          <div className="flex flex-col gap-4">
            {messages.map((message, messageIndex) => {
              const lastHumanIndex = messages.map((m, i) => (m.type === "human" ? i : -1)).filter((i) => i >= 0).pop() ?? -1;
              const streamingAiIndex = lastHumanIndex + 1;
              const isStreamingThisBubble = isStreaming && message.type === "ai" && messageIndex === streamingAiIndex;
              return (
              <div
                key={message.id}
                className={`flex ${message.type === "human" ? "justify-end" : "justify-start"
                  }`}
              >
                <div
                  className={`max-w-[85%] ${message.type === "human"
                    ? "flex flex-col justify-between items-end p-3 gap-1 h-auto bg-[#e8e8e3] rounded-[12px] shadow-sm"
                    : "flex flex-col items-start p-4 gap-3 h-auto bg-[#F9F9F6] border border-[#E8E8E3] rounded-[12px] shadow-sm"
                    }`}
                >
                  {/* Human Message */}
                  {message.type === "human" && (
                    <div
                      className="text-[14px] font-normal leading-[20px] tracking-[0.1px] text-[#072929]"
                      style={{ fontFamily: "'GT America Trial', sans-serif" }}
                    >
                      <MessageContent content={extractTextContent(message.content)} />
                    </div>
                  )}

                  {/* AI Message: single bubble — "Currently analyzing" above, then content (so analyzing never hides) */}
                  {message.type === "ai" && (
                    <div className="flex flex-col items-start gap-3 w-full" style={{ fontFamily: "'GT America Trial', sans-serif" }}>
                      {/* Currently analyzing: always at top while streaming (stays visible); or from message.additional_kwargs when not streaming */}
                      {isStreamingThisBubble || (message.additional_kwargs && Object.keys(message.additional_kwargs).length > 0) ? (
                        <div className="flex flex-col gap-1.5 w-full">
                          <span className="text-[11px] font-medium uppercase tracking-wider text-[#556179]">
                            Currently analyzing
                          </span>
                          {isStreamingThisBubble && currentThinkingSteps.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {currentThinkingSteps.map((step, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-white border border-[#E8E8E3] px-2 py-1 text-xs text-[#072929]"
                                >
                                  <span className="w-1.5 h-1.5 bg-[#136D6D] rounded-full animate-pulse" />
                                  {step}
                                </span>
                              ))}
                            </div>
                          ) : message.additional_kwargs ? (
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(message.additional_kwargs).map(([key, value]) => (
                                <span
                                  key={key}
                                  className="inline-flex items-center rounded-md bg-white border border-[#E8E8E3] px-2 py-1 text-xs text-[#072929]"
                                >
                                  {key}: {String(value)}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {/* Thinking line when streaming this bubble */}
                          {isStreamingThisBubble && (
                            <div className="flex items-center gap-2 text-[#556179]">
                              <img src={StellarLogo} alt="" className="h-4 w-4 opacity-80" />
                              <span className="text-xs font-medium">Thinking</span>
                              <div className="flex gap-1 ml-1">
                                <div className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" />
                                <div className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                                <div className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}

                      {/* Text / markdown content (streamed message below analyzing) */}
                      {isContentBlockArray(message.content) ? (
                        <div className="w-full space-y-2">
                          {/* Render tool_use blocks first (above), then text (message below) */}
                          {(() => {
                            const blocks = message.content as ContentBlock[];
                            const toolBlocks = blocks.filter((b): b is ToolUseContent => b.type === "tool_use");
                            const textBlocks = blocks.filter((b): b is TextContent => b.type === "text");
                            return [...toolBlocks, ...textBlocks].map((block, idx) => (
                              <div key={idx}>
                                {block.type === "text" && (
                                  <div className="text-[14px] font-normal leading-5 tracking-[0.1px] text-[#072929]">
                                    <StellarMarkDown content={(block as any).text} type="ai" />
                                  </div>
                                )}
                                {block.type === "tool_use" && (
                                  <ToolUseBlock block={block} />
                                )}
                              </div>
                            ));
                          })()}
                        </div>
                      ) : isStringContent(message.content) ? (
                        <div className="text-[14px] font-normal leading-5 tracking-[0.1px] text-[#072929] w-full prose prose-sm max-w-none">
                          <StellarMarkDown content={message.content} type="ai" />
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ); })}

            {/* Campaign: Apply draft + validation errors */}
            {campaignState && (campaignState.draft_setup_json || (campaignState.validation_errors && campaignState.validation_errors.length > 0)) && (
              <div className="flex flex-col gap-2 mt-2 p-3 bg-[#F9F9F6] border border-[#E8E8E3] rounded-[10px]">
                {campaignState.validation_errors && campaignState.validation_errors.length > 0 && (
                  <div className="text-xs text-red-600">
                    {campaignState.validation_errors.map((err: string, i: number) => (
                      <div key={i}>{err}</div>
                    ))}
                  </div>
                )}
                {campaignState.draft_setup_json && Object.keys(campaignState.draft_setup_json).length > 0 && onApplyDraft && (
                  <button
                    type="button"
                    onClick={() => onApplyDraft(campaignState.draft_setup_json!)}
                    className="self-start px-3 py-1.5 text-xs font-medium bg-[#136D6D] text-white rounded-md hover:opacity-90"
                  >
                    Apply draft
                  </button>
                )}
                {campaignState.draft_setup_json && Object.keys(campaignState.draft_setup_json).length > 0 && !onApplyDraft && (
                  <span className="text-xs text-[#072929]">Draft ready (use Apply draft from campaign form to fill)</span>
                )}
              </div>
            )}

            {/* Campaign: current_questions_schema form fields */}
            {SHOW_CAMPAIGN_SCHEMA_FORM && hasQuestionsSchema && schemaFormKey && (
              <SchemaFormBlock
                ref={schemaFormRef}
                key={schemaFormKey}
                questionsSchema={questionsSchema as CurrentQuestionSchemaItem[]}
                campaignDraft={campaignState?.campaign_draft as Record<string, unknown> | undefined}
                onSend={sendMessage}
                disabled={isLoading || isStreaming}
                inputValue={inputValue}
                onInputClear={() => setInputValue("")}
              />
            )}

            {/* Streaming State - only when we don't yet have the streaming AI bubble (e.g. waiting for first token) */}
            {(isLoading || isStreaming) && !(messages.length > 0 && messages[messages.length - 1]?.type === "ai") && (
              <div className="flex justify-start">
                <div className="max-w-[85%] w-full p-4 bg-[#F9F9F6] border border-[#E8E8E3] rounded-[12px] shadow-sm flex flex-col gap-3">
                  {currentThinkingSteps.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-[#556179]">
                        Currently analyzing
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {currentThinkingSteps.map((step, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1.5 rounded-md bg-white border border-[#E8E8E3] px-2 py-1 text-xs text-[#072929]"
                          >
                            <span className="w-1.5 h-1.5 bg-[#136D6D] rounded-full animate-pulse" />
                            {step}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[#556179]">
                    <img src={StellarLogo} alt="" className="h-4 w-4 opacity-80" />
                    <span className="text-xs font-medium">Thinking</span>
                    <div className="flex gap-1 ml-1">
                      <div className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                      <div className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-gray-100">
        <form onSubmit={handleSubmit} className="relative">
          <div className="assistant-input-container rounded-[12px] p-3">
            <div className="flex flex-col gap-2">
              {/* Input Field: textarea for multi-line; Shift+Enter = new line, Enter = send */}
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isStreaming
                    ? "Generating response..."
                    : !canChat
                      ? "Select account and profile above to enable chat"
                      : "Ask me anything about your campaigns... (Shift+Enter for new line)"
                }
                className="w-full min-h-[24px] max-h-[200px] resize-y overflow-y-auto bg-transparent text-[14px] font-normal text-[#072929] placeholder:text-[#9ca3af] focus:outline-none py-1"
                style={{ fontFamily: "'GT America Trial', sans-serif", minHeight: ASSISTANT_TEXTAREA_MIN_HEIGHT, maxHeight: ASSISTANT_TEXTAREA_MAX_HEIGHT }}
                disabled={isLoading || isStreaming || !canChat}
                rows={1}
              />

              {/* Controls Row */}
              <div className="flex items-center justify-between">
                {/* Add Attachment Button */}
                <button
                  type="button"
                  className="p-1 hover:opacity-70 transition-opacity disabled:opacity-50 disabled:pointer-events-none"
                  title="Add attachment"
                  disabled={isStreaming || !canChat}
                >
                  <img src={ASSISTANT_ICONS.addCircle} alt="Add attachment" className="w-5 h-5" />
                </button>

                {/* Stop Button - shown during streaming */}
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                    title="Stop generating"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2.5">
                    {/* Voice Button */}
                    <button
                      type="button"
                      className="p-1 hover:opacity-70 transition-opacity disabled:opacity-50 disabled:pointer-events-none"
                      title="Voice input"
                      disabled={!canChat}
                    >
                      <img src={ASSISTANT_ICONS.mic} alt="Voice input" className="w-5 h-5" />
                    </button>

                    {/* Analytics Button */}
                    <button
                      type="button"
                      className="p-1 hover:opacity-70 transition-opacity disabled:opacity-50 disabled:pointer-events-none"
                      title="View analytics"
                      disabled={!canChat}
                    >
                      <img src={ASSISTANT_ICONS.voice} alt="View analytics" className="w-6 h-6" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const DEFAULT_PANEL_WIDTH = 550;
const MIN_PANEL_WIDTH = 380;
const MAX_PANEL_WIDTH = 900;
const ASSISTANT_PANEL_WIDTH_KEY = "stellar-assistant-panel-width";

function getStoredPanelWidth(): number {
  try {
    const stored = localStorage.getItem(ASSISTANT_PANEL_WIDTH_KEY);
    if (stored != null) {
      const n = parseInt(stored, 10);
      if (!Number.isNaN(n)) return Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, n));
    }
  } catch {
    // ignore
  }
  return DEFAULT_PANEL_WIDTH;
}

function setStoredPanelWidth(width: number): void {
  try {
    localStorage.setItem(ASSISTANT_PANEL_WIDTH_KEY, String(width));
  } catch {
    // ignore
  }
}

// Wrapper component that renders the Assistant panel with slide-up/slide-down animation
export const Assistant: React.FC<React.PropsWithChildren<Record<string, never>>> = ({
  children,
}) => {
  const { isOpen } = useAssistant();
  const [panelWidth, setPanelWidth] = useState(getStoredPanelWidth);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    setStoredPanelWidth(panelWidth);
  }, [panelWidth]);

  const isFixed = ASSISTANT_PANEL_VIEW === "fixed";
  const widthCss = `${panelWidth}px`;

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: panelWidth };
    setIsResizing(true);
    const onMove = (ev: MouseEvent) => {
      const start = dragRef.current;
      if (!start) return;
      const delta = start.startX - ev.clientX;
      setPanelWidth(Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, start.startWidth + delta)));
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
    setStoredPanelWidth(DEFAULT_PANEL_WIDTH);
  };

  return (
    <div className={`bg-[var(--color-semantic-background-primary)] overflow-x-hidden min-w-0 flex ${isFixed ? "relative" : ""}`}>
      {/* Main Content */}
      <div
        style={isOpen && isFixed ? { marginRight: widthCss } : undefined}
        className={`flex-1 overflow-x-hidden transition-all duration-300 interactive-scrollbar`}
      >
        {children}
      </div>

      {/* Assistant Sidebar - always mounted, animated from bottom */}
      <div
        className={`${isFixed ? "fixed" : "absolute"} right-0 top-0 bottom-0 z-[45] bg-[var(--color-semantic-background-primary)] transition-[transform,width] duration-200 ease-out ${
          isFixed ? "border-l border-gray-200" : "rounded-l-2xl shadow-[-8px_0_24px_rgba(0,0,0,0.15)]"
        } ${isOpen ? "translate-y-0" : "translate-y-full pointer-events-none"}`}
        style={{ width: widthCss }}
        aria-hidden={!isOpen}
      >
        {/* Resize handle - left edge, vertically centered; thin strip with grip */}
        <div
          onMouseDown={handleResizeMouseDown}
          onDoubleClick={handleResizeDoubleClick}
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 w-2 h-16 flex items-center justify-center rounded-r cursor-col-resize transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#136D6D] focus-visible:ring-offset-1 ${
            isResizing
              ? "bg-[#136D6D] text-white"
              : "bg-[#e0e0dc] hover:bg-[#136D6D]/80 text-[#072929] hover:text-white border border-r-0 border-[#d0d0cc]"
          }`}
          title="Drag to resize · Double-click to reset"
          aria-label="Resize assistant panel"
          tabIndex={0}
        >
          <GripVertical className="w-3 h-3 opacity-70" strokeWidth={2} />
        </div>
        <AssistantPanel className={`h-full ${isFixed ? "" : "rounded-l-2xl overflow-hidden"}`} />
      </div>
    </div>
  );
};


