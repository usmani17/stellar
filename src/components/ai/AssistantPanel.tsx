import React, { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAssistant, type ThreadWithRuntime } from "../../contexts/AssistantContext";
import type { CurrentQuestionSchemaItem } from "../../types/agent";
import { Check, Square, X, ChevronDown, BarChart3, Megaphone, ArrowUp, Plus } from "lucide-react";
import StellarLogo from "../../assets/images/steller-logo-mini.svg";
import { ASSISTANT_ICONS } from "../../assets/icons/assistant-icons";
import type { Thread, ContentBlock, ThreadMessageContent, TextContent } from "../../services/ai/threads";
import StellarMarkDown from "../ai/StellarMarkDown";
import { MessageContent } from "../ai/MessageContent";
import { isStringContent } from "../../utils/ai-formatter";
import { ToolCallsDisplay } from "../ai/ToolCallsDisplay";
import { ToolResultDisplay } from "../ai/ToolResultDisplay";
import { CampaignDraftPreview } from "../ai/CampaignDraftPreview";
import { accountsService, type Account } from "../../services/accounts";
import GoogleIcon from "../../assets/images/ri_google-fill.svg";
import AmazonIcon from "../../assets/images/amazon-fill.svg";
import MetaIcon from "../../assets/images/mingcute_meta-line.svg";
import { CampaignFormForChat, type CampaignFormForChatHandle } from "../layout/Assistant";
import { getDisplayName } from "../../utils/assistantDisplayNames";

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

/** Set to false to hide the "Fill in the details" schema form (e.g. Logo image URL, Daily budget) in campaign setup. */
const SHOW_CAMPAIGN_SCHEMA_FORM = true;

// Same as DashboardHeader: color from first letter of account/channel name
const getInitialColor = (initial: string): string => {
    const colors = [
        "#136D6D", "#072929", "#556179", "#8B5CF6", "#EC4899", "#F59E0B",
        "#10B981", "#3B82F6", "#EF4444", "#06B6D4", "#F97316", "#6366F1",
        "#14B8A6", "#A855F7", "#E11D48",
    ];
    if (!initial) return colors[0];
    const charCode = initial.charCodeAt(0);
    let index: number;
    if (charCode >= 48 && charCode <= 57) index = (charCode - 48) % colors.length;
    else if (charCode >= 65 && charCode <= 90) index = (charCode - 65) % colors.length;
    else if (charCode >= 97 && charCode <= 122) index = (charCode - 97) % colors.length;
    else index = Math.abs(charCode % colors.length);
    return colors[index];
};

const ASSISTANT_TEXTAREA_MIN_HEIGHT = 24;
const ASSISTANT_TEXTAREA_MAX_HEIGHT = 200;

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

function getToolCallsFromMessage(msg: { tool_calls?: Array<{ id?: string; name?: string; args?: Record<string, unknown> }>; content?: unknown }): Array<{ id?: string; name: string; args?: Record<string, unknown> }> {
    if (msg.tool_calls?.length) {
        return msg.tool_calls.map((tc) => ({ id: tc.id, name: tc.name ?? "", args: tc.args }));
    }
    if (Array.isArray(msg.content)) {
        return msg.content
            .filter((b): b is ContentBlock => typeof b === "object" && b != null && (b as ContentBlock).type === "tool_use")
            .map((b) => ({ id: (b as { id?: string }).id, name: (b as { name?: string }).name ?? "", args: ((b as { input?: Record<string, unknown> }).input ?? {}) as Record<string, unknown> }));
    }
    return [];
}

function profileDisplayName(p: AccountProfileOption): string {
    return p.name ?? p.advertiser_name ?? p.customer_id ?? p.advertiser_id ?? String(p.id);
}

function profileIdForDisplay(p: AccountProfileOption): string {
    return p.customer_id ?? p.advertiser_id ?? p.ad_account_id ?? p.profileId ?? String(p.id);
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
        deleteThread,
        cancelRun,
        setSelectedGraphId,
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
    const schemaFormRef = useRef<CampaignFormForChatHandle | null>(null);
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
        const schema = SHOW_CAMPAIGN_SCHEMA_FORM && hasQuestionsSchema ? (questionsSchema as CurrentQuestionSchemaItem[]) : [];
        const formValues = SHOW_CAMPAIGN_SCHEMA_FORM && hasQuestionsSchema && schemaFormRef.current ? schemaFormRef.current.getValues() : {};

        const formParts =
            schema.length > 0 && Object.keys(formValues).length > 0
                ? (schema
                    .map((item) => {
                        const v = formValues[item.key];
                        if (v === undefined || v === "") return null;
                        const label = item.label || item.key;
                        if (item.ui_hint === "channel_controls") {
                            try {
                                const obj = JSON.parse(v) as Record<string, boolean>;
                                const parts = Object.entries(obj).map(([k, val]) => `${k}:${val}`);
                                if (parts.length === 0) return null;
                                return `${label}: ${parts.join(", ")}`;
                            } catch {
                                return null;
                            }
                        }
                        return `${label}: ${typeof v === "string" ? v.trim() : v}`;
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

    const questionsSchema = campaignState?.current_questions_schema;
    const hasQuestionsSchema = questionsSchema && questionsSchema.length > 0;
    const schemaFormKey = hasQuestionsSchema
        ? (questionsSchema as CurrentQuestionSchemaItem[]).map((q) => q.key).join(",")
        : "";

    // Log the suggestion questions we show in "Fill in the details" so you can verify correct schema from AI.
    // Use schemaFormKey (stable string) as dependency to avoid running on every stream update (questionsSchema is a new ref each time).
    useEffect(() => {
        if (!schemaFormKey || !questionsSchema?.length) return;
        console.log("[Assistant] Fill-in-the-details form questions (from AI):", questionsSchema);
    }, [schemaFormKey]);

    const groupedThreads = groupThreadsByDate(threads);
    const hasMessages = messages.length > 0;

    const selectedAccount = accounts.find((a) => String(a.id) === assistantScope.accountId);
    const selectedProfileOption = accountProfiles.find(
        (p) => String(p.channel_id) === assistantScope.channelId && p.id === assistantScope.profileId
    );

    const canChat = !!(
        assistantScope.accountId &&
        assistantScope.channelId &&
        assistantScope.profileId &&
        assistantIntent
    );

    const contextSection = (
        <div className="assistant-setup-card">
            <p className="assistant-setup-heading">
                Set up your session in 3 steps
            </p>

            {/* Step 1: Account */}
            <div className="assistant-setup-step">
                <label className="assistant-setup-label">
                    <span className={`assistant-setup-step-num ${assistantScope.accountId ? "assistant-setup-step-num-active" : ""}`}>
                        1
                    </span>
                    Select account
                </label>
                <div className="relative" ref={accountDropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsAccountDropdownOpen((v) => !v)}
                        className="assistant-setup-dropdown-trigger"
                        aria-haspopup="listbox"
                        aria-expanded={isAccountDropdownOpen}
                        aria-label="Select account"
                    >
                        <span className="assistant-setup-dropdown-trigger-inner">
                            {selectedAccount && (
                                <div
                                    className="assistant-setup-account-initial"
                                    style={{
                                        backgroundColor: getInitialColor(selectedAccount.name?.[0]?.toUpperCase() || "A"),
                                    }}
                                >
                                    {selectedAccount.name?.[0]?.toUpperCase() || "A"}
                                </div>
                            )}
                            <span className="truncate">
                                {selectedAccount ? selectedAccount.name : "Choose an account"}
                            </span>
                        </span>
                        <ChevronDown className="assistant-setup-dropdown-chevron" />
                    </button>
                    {isAccountDropdownOpen && (
                        <div className="assistant-setup-dropdown-panel">
                            {isLoadingAccounts ? (
                                <div className="assistant-setup-dropdown-loading">Loading...</div>
                            ) : accounts.length === 0 ? (
                                <div className="assistant-setup-dropdown-empty">No accounts</div>
                            ) : (
                                accounts.map((acc) => {
                                    const initial = acc.name?.[0]?.toUpperCase() || "A";
                                    const bgColor = getInitialColor(initial);
                                    return (
                                        <button
                                            key={acc.id}
                                            type="button"
                                            onClick={() => {
                                                setAssistantScope({ accountId: String(acc.id), channelId: null, profileId: null, profileName: null, marketplace: null });
                                                setIsAccountDropdownOpen(false);
                                            }}
                                            className={`assistant-setup-dropdown-item ${assistantScope.accountId === String(acc.id) ? "assistant-setup-dropdown-item-active" : ""}`}
                                        >
                                            <div
                                                className="assistant-setup-account-initial"
                                                style={{ backgroundColor: bgColor }}
                                            >
                                                {initial}
                                            </div>
                                            <span className="truncate">{acc.name}</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Step 2: Integration & profile */}
            <div className="assistant-setup-step">
                <label className="assistant-setup-label">
                    <span className={`assistant-setup-step-num ${assistantScope.accountId ? "assistant-setup-step-num-active" : ""}`}>
                        2
                    </span>
                    Select integration & profile
                </label>
                <div className="relative" ref={integrationProfileDropdownRef}>
                    <button
                        type="button"
                        onClick={() => assistantScope.accountId && setIsIntegrationProfileDropdownOpen((v) => !v)}
                        disabled={!assistantScope.accountId}
                        className="assistant-setup-dropdown-trigger"
                        aria-haspopup="listbox"
                        aria-expanded={isIntegrationProfileDropdownOpen}
                        aria-label="Select integration and profile"
                    >
                        <span className="assistant-setup-dropdown-trigger-inner">
                            {selectedProfileOption && (() => {
                                const ct = (selectedProfileOption.channel_type ?? assistantScope.marketplace ?? "").toLowerCase();
                                return (
                                    <>
                                        {ct === "amazon" && (
                                            <img src={AmazonIcon} alt="Amazon" className="w-4 h-4 shrink-0" />
                                        )}
                                        {ct === "google" && (
                                            <img src={GoogleIcon} alt="Google" className="w-4 h-4 shrink-0" />
                                        )}
                                        {ct === "meta" && (
                                            <img src={MetaIcon} alt="Meta" className="w-4 h-4 shrink-0" />
                                        )}
                                        {ct === "tiktok" && (
                                            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                            </svg>
                                        )}
                                    </>
                                );
                            })()}
                            <span className="truncate">
                                {selectedProfileOption
                                    ? `${profileDisplayName(selectedProfileOption)} (${profileIdForDisplay(selectedProfileOption)})`
                                    : assistantScope.accountId
                                        ? "Choose integration & profile"
                                        : "Select an account first"}
                            </span>
                        </span>
                        <ChevronDown className="assistant-setup-dropdown-chevron" />
                    </button>
                    {isIntegrationProfileDropdownOpen && (
                        <div className="assistant-setup-dropdown-panel">
                            {isLoadingProfiles ? (
                                <div className="assistant-setup-dropdown-loading">Loading...</div>
                            ) : accountProfiles.length === 0 ? (
                                <div className="assistant-setup-dropdown-empty">No profiles. Select an account first.</div>
                            ) : (
                                accountProfiles.map((p) => {
                                    const label = `${profileDisplayName(p)} (${profileIdForDisplay(p)})`;
                                    const isSelected =
                                        assistantScope.channelId === String(p.channel_id) && assistantScope.profileId === p.id;
                                    const channelType = (p.channel_type ?? "").toLowerCase();
                                    return (
                                        <button
                                            key={`${p.channel_id}-${p.id}`}
                                            type="button"
                                            onClick={() => {
                                                setAssistantScope({
                                                    channelId: String(p.channel_id),
                                                    profileId: p.id,
                                                    profileName: profileDisplayName(p),
                                                    marketplace: p.channel_type ?? null,
                                                });
                                                setIsIntegrationProfileDropdownOpen(false);
                                            }}
                                            className={`assistant-setup-dropdown-item ${isSelected ? "assistant-setup-dropdown-item-active" : ""}`}
                                        >
                                            {channelType === "amazon" && <img src={AmazonIcon} alt="Amazon" className="w-4 h-4 shrink-0" />}
                                            {channelType === "google" && <img src={GoogleIcon} alt="Google" className="w-4 h-4 shrink-0" />}
                                            {channelType === "meta" && <img src={MetaIcon} alt="Meta" className="w-4 h-4 shrink-0" />}
                                            {channelType === "tiktok" && (
                                                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                                </svg>
                                            )}
                                            <span className="truncate">{label}</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Step 3: What would you like to do? */}
            <div className="assistant-setup-step">
                <label className="assistant-setup-label">
                    <span className={`assistant-setup-step-num ${assistantScope.channelId && assistantScope.profileId ? "assistant-setup-step-num-active" : ""}`}>
                        3
                    </span>
                    What would you like to do?
                </label>
                <div className="assistant-setup-intent-btns">
                    <button
                        type="button"
                        onClick={() => setAssistantIntent(assistantIntent === "analyze" ? null : "analyze")}
                        disabled={!assistantScope.accountId || !assistantScope.channelId || !assistantScope.profileId}
                        className={`assistant-setup-intent-btn ${assistantIntent === "analyze" ? "assistant-setup-intent-btn-active" : ""}`}
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
                        className={`assistant-setup-intent-btn ${assistantIntent === "create_campaign" ? "assistant-setup-intent-btn-active" : ""}`}
                        title="Create campaign"
                    >
                        <Megaphone className="w-4 h-4 shrink-0" />
                        Create Campaign
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div
            className={`flex flex-col h-full bg-[var(--color-semantic-background-primary)] shadow-lg ${className}`}
        >
            {/* Top row: chat tabs (left) + New Chat & Close (right) */}
            <div className="assistant-top-row">
                <div className="assistant-top-row-inner">
                    <div className="assistant-tabs-scroll interactive-scrollbar" style={{ scrollbarWidth: 'thin' }}>
                        {isLoadingThreads ? (
                            <span className="assistant-muted-text">Loading...</span>
                        ) : threads.length > 0 ? (
                            [...threads]
                                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                                .map((thread) => (
                                    <div
                                        key={thread.thread_id}
                                        className={`assistant-tab-pill ${currentThread?.thread_id === thread.thread_id ? "assistant-tab-pill-active" : ""}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleThreadSelect(thread.thread_id)}
                                            className="assistant-tab-pill-button"
                                            title={thread.metadata?.title || 'Untitled'}
                                        >
                                            <svg className="w-4 h-4 shrink-0 text-current opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                            </svg>
                                            <span className="max-w-[120px] truncate">{thread.metadata?.title || 'Untitled'}</span>
                                            {currentThread?.thread_id === thread.thread_id && (
                                                <Check className="w-4 h-4 shrink-0 text-[var(--color-semantic-status-primary)]" />
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteThread(thread.thread_id);
                                            }}
                                            className="assistant-tab-delete"
                                            title="Delete conversation"
                                            aria-label="Delete conversation"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                        ) : null}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 pl-2">
                        <div ref={historyDropdownRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setIsThreadDropdownOpen(!isThreadDropdownOpen)}
                                className="assistant-header-icon-btn"
                                title="Chat history"
                                aria-label="Chat history"
                            >
                                <img src={ASSISTANT_ICONS.chatHistory} alt="Chat history" className="w-5 h-5" />
                            </button>
                            {isThreadDropdownOpen && (
                                <div className="assistant-history-dropdown">
                                    <div className="assistant-history-header">
                                        <h3 className="assistant-history-title">History</h3>
                                    </div>
                                    {isLoadingThreads ? (
                                        <div className="px-4 py-3 text-sm assistant-muted-text">
                                            Loading conversations...
                                        </div>
                                    ) : threads.length === 0 ? (
                                        <div className="px-4 py-3 text-sm assistant-muted-text">
                                            No previous conversations
                                        </div>
                                    ) : (
                                        Object.entries(groupedThreads)
                                            .sort(([keyA], [keyB]) => {
                                                const order: Record<string, number> = { 'Today': 0, 'Yesterday': 1 };
                                                const orderA = order[keyA] ?? 2;
                                                const orderB = order[keyB] ?? 2;
                                                if (orderA !== orderB) return orderA - orderB;
                                                if (orderA === 2) {
                                                    return new Date(keyB).getTime() - new Date(keyA).getTime();
                                                }
                                                return 0;
                                            })
                                            .map(([dateGroup, groupThreads]) => (
                                                <div key={dateGroup}>
                                                    <div className="assistant-history-date-group">
                                                        <span>{dateGroup}</span>
                                                        <span>{groupThreads.length} Total</span>
                                                    </div>
                                                    {groupThreads.map((thread) => (
                                                        <div
                                                            key={thread.thread_id}
                                                            className={`assistant-history-item ${currentThread?.thread_id === thread.thread_id ? "assistant-history-item-active" : ""}`}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => handleThreadSelect(thread.thread_id)}
                                                                className="assistant-history-item-button"
                                                            >
                                                                <svg className="w-4 h-4 shrink-0 text-[var(--color-semantic-text-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                                                </svg>
                                                                <span className="truncate flex-1">{thread.metadata?.title || 'Untitled'}</span>
                                                                {currentThread?.thread_id === thread.thread_id && (
                                                                    <Check className="w-4 h-4 text-[var(--color-semantic-text-primary)] shrink-0" />
                                                                )}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteThread(thread.thread_id);
                                                                    setIsThreadDropdownOpen(false);
                                                                }}
                                                                className="assistant-history-delete"
                                                                title="Delete conversation"
                                                                aria-label="Delete conversation"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))
                                    )}
                                </div>
                            )}
                        </div>
                        {assistantIntent === "create_campaign" && (
                            <CampaignDraftPreview
                                campaignState={campaignState}
                                visible
                                accountId={assistantScope.accountId ?? undefined}
                                channelId={assistantScope.channelId ?? undefined}
                                className="shrink-0"
                            />
                        )}
                        <button
                            type="button"
                            onClick={handleNewThread}
                            className="assistant-header-icon-btn"
                            title="New conversation"
                            aria-label="New chat"
                        >
                            <Plus className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                closeAssistant();
                            }}
                            className="assistant-header-icon-btn"
                            title="Close assistant"
                            aria-label="Close assistant"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
            {/* Second row: account/channel (left only) */}
            <div className="assistant-account-row">
                <div className="assistant-account-row-inner">
                    {selectedAccount && (
                        <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                            <div
                                className="w-5 h-5 rounded flex-shrink-0 text-white text-[10px] flex items-center justify-center font-semibold"
                                style={{
                                    backgroundColor: getInitialColor(selectedAccount.name?.[0]?.toUpperCase() || "A"),
                                }}
                            >
                                {selectedAccount.name?.[0]?.toUpperCase() || "A"}
                            </div>
                            <span className="assistant-account-label" title={selectedAccount.name}>
                                {selectedAccount.name}
                            </span>
                        </div>
                    )}
                    {selectedProfileOption && (
                        <>
                            {selectedAccount && (
                                <span className="assistant-channel-label shrink-0" aria-hidden>•</span>
                            )}
                            <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                                {assistantScope.marketplace === "amazon" && (
                                    <img src={AmazonIcon} alt="Amazon" className="w-4 h-4 flex-shrink-0" />
                                )}
                                {assistantScope.marketplace === "google" && (
                                    <img src={GoogleIcon} alt="Google" className="w-4 h-4 flex-shrink-0" />
                                )}
                                {assistantScope.marketplace === "meta" && (
                                    <img src={MetaIcon} alt="Meta" className="w-4 h-4 flex-shrink-0" />
                                )}
                                {assistantScope.marketplace === "tiktok" && (
                                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                    </svg>
                                )}
                                <span
                                    className="assistant-channel-label truncate"
                                    title={`${profileDisplayName(selectedProfileOption)} (${profileIdForDisplay(selectedProfileOption)})`}
                                >
                                    {profileDisplayName(selectedProfileOption)} ({profileIdForDisplay(selectedProfileOption)})
                                </span>
                            </div>
                        </>
                    )}
                    {assistantIntent && (selectedAccount || selectedProfileOption) && (
                        <>
                            <span className="text-[var(--color-neutral-300)] shrink-0" aria-hidden>•</span>
                            <span className="assistant-intent-badge">
                                {assistantIntent === "analyze" ? "Analyze" : "Create Campaign"}
                            </span>
                        </>
                    )}
                </div>
            </div>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto interactive-scrollbar px-4 py-4">
                {!hasMessages ? (
                    /* Empty State: show 3-step setup until user selects Analyze or Create Campaign; then hide setup and show prompts only */
                    <div className="flex flex-col items-center justify-center h-full gap-6">
                        {/* Assistant logo and title at top, above setup */}
                        <div className="mb-0">
                            <img src={StellarLogo} alt="Assistant" className="h-16 w-16" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">
                            Assistant
                        </h3>

                        {/* Set up your session - hidden as soon as user clicks Analyze or Create Campaign */}
                        {!assistantIntent && contextSection}

                        {!assistantIntent ? (
                            <p className="text-sm text-gray-600 text-center px-4">
                                {!assistantScope.accountId
                                    ? "Select an account above to start."
                                    : !assistantScope.channelId || !assistantScope.profileId
                                        ? "Select an integration–profile above to start."
                                        : "Click Analyze or Create Campaign above to continue."}
                            </p>
                        ) : (
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
                            const msgType = (message as { type?: string }).type;

                            if (msgType === "human") {
                                return (
                                    <div key={message.id} className="flex justify-end human">
                                        <div className=" min-w-0 flex flex-col justify-between items-end p-3 gap-1 h-auto bg-[#e8e8e3] rounded-[12px] shadow-sm overflow-x-auto">
                                            <div
                                                className="text-[14px] font-normal leading-[20px] tracking-[0.1px] text-[#072929] min-w-0 max-w-full overflow-x-auto"
                                                style={{ fontFamily: "'GT America Trial', sans-serif" }}
                                            >
                                                <MessageContent content={extractTextContent(message.content)} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            if (msgType === "tool") {
                                const toolMsg = message as { name?: string; tool_call_id?: string; content?: unknown };
                                return (
                                    <ToolResultDisplay
                                        name={toolMsg.name}
                                        toolCallId={toolMsg.tool_call_id}
                                        content={toolMsg.content ?? ""}
                                    />
                                );
                            }

                            if (msgType === "ai") {
                                const toolCalls = getToolCallsFromMessage(message);
                                if (!message.content) return null;
                                return (
                                    <div key={message.id} className="flex justify-start ai">
                                        <div className=" min-w-0 flex flex-col items-start p-4 gap-3 h-auto bg-[#F9F9F6] border border-[#E8E8E3] rounded-[12px] shadow-sm">
                                            {/* AI Message: single bubble — "Currently analyzing" / "Steps taken" above, then content (so steps never hide) */}
                                            <div className="flex flex-col items-start gap-3 w-full" style={{ fontFamily: "'GT America Trial', sans-serif" }}>
                                                {/* Steps: streaming (currentThinkingSteps) or completed (message.additional_kwargs.thinkingSteps); fallback to other additional_kwargs */}
                                                {(() => {
                                                    const completedSteps = (message.additional_kwargs?.thinkingSteps as string[] | undefined) ?? [];
                                                    const hasStreamingSteps = isStreamingThisBubble && currentThinkingSteps.length > 0;
                                                    const hasCompletedSteps = completedSteps.length > 0;
                                                    const hasOtherKwargs = message.additional_kwargs && Object.keys(message.additional_kwargs).filter(k => k !== "thinkingSteps").length > 0;
                                                    const showStepsBlock = hasStreamingSteps || hasCompletedSteps || hasOtherKwargs;
                                                    const steps = hasStreamingSteps ? currentThinkingSteps : completedSteps;
                                                    const isCompleted = hasCompletedSteps && !isStreamingThisBubble;
                                                    if (!showStepsBlock) return null;
                                                    return (
                                                        <div className="flex flex-col gap-1.5 w-full">
                                                            <span className="text-[11px] font-medium uppercase tracking-wider text-[#556179]">
                                                                {isCompleted ? "Steps taken" : "Currently analyzing"}
                                                            </span>
                                                            {steps.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {steps.map((step, index) => (
                                                                        <span
                                                                            key={index}
                                                                            className={`inline-flex items-center gap-1.5 rounded-md border border-[#E8E8E3] px-2 py-1 text-xs text-[#072929] ${isCompleted ? "bg-[#E8E8E3]/50" : "bg-white"}`}
                                                                        >
                                                                            {isCompleted ? (
                                                                                <Check className="w-3 h-3 text-[#136D6D] shrink-0" />
                                                                            ) : (
                                                                                <span className="w-1.5 h-1.5 bg-[#136D6D] rounded-full animate-pulse shrink-0" />
                                                                            )}
                                                                            {getDisplayName(step, "node")}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : hasOtherKwargs ? (
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {Object.entries(message.additional_kwargs ?? {}).filter(([k]) => k !== "thinkingSteps").map(([key, value]) => (
                                                                        <span
                                                                            key={key}
                                                                            className="inline-flex items-center rounded-md bg-white border border-[#E8E8E3] px-2 py-1 text-xs text-[#072929]"
                                                                        >
                                                                            {key}: {String(value)}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    );
                                                })()}

                                                {toolCalls.length > 0 && (
                                                    <ToolCallsDisplay toolCalls={toolCalls} compact />
                                                )}

                                                {/* Text / markdown content (streamed message below analyzing) */}
                                                {isContentBlockArray(message.content) ? (
                                                    <div className="w-full space-y-2">
                                                        {(() => {
                                                            const blocks = message.content as ContentBlock[];
                                                            const textBlocks = blocks.filter((b): b is TextContent => b.type === "text");
                                                            return textBlocks.map((block, idx) => (
                                                                <div key={idx} className="text-[14px] font-normal leading-5 tracking-[0.1px] text-[#072929]">
                                                                    <StellarMarkDown content={(block as TextContent).text} type="ai" />
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
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })}

                        {/* Thinking at the very end when streaming — only when last message is AI (otherwise we show the "waiting for first token" block below) */}
                        {isStreaming && messages.length > 0 && messages[messages.length - 1]?.type === "ai" && (
                            <div className="flex justify-start">
                                <div className=" p-4 bg-[#F9F9F6] border border-[#E8E8E3] rounded-[12px] flex items-center gap-2 text-[#556179]">
                                    <img src={StellarLogo} alt="" className="h-4 w-4 opacity-80" />
                                    <span className="text-xs font-medium">Thinking</span>
                                    <div className="flex gap-1 ml-1">
                                        <div className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" />
                                        <div className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                                        <div className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Campaign: validation errors or draft ready (only when saved_draft_id exists) */}
                        {campaignState && ((campaignState.validation_errors && campaignState.validation_errors.length > 0) || (campaignState.draft_setup_json && Object.keys(campaignState.draft_setup_json).length > 0 && campaignState.saved_draft_id)) && (
                            <div className="flex flex-col gap-2 mt-2 p-3 bg-[#F9F9F6] border border-[#E8E8E3] rounded-[10px]">
                                {campaignState.validation_errors && campaignState.validation_errors.length > 0 && (
                                    <div className="text-xs text-red-600">
                                        {campaignState.validation_errors.map((err: string, i: number) => (
                                            <div key={i}>{err}</div>
                                        ))}
                                    </div>
                                )}
                                {campaignState.draft_setup_json && Object.keys(campaignState.draft_setup_json).length > 0 && campaignState.saved_draft_id && (
                                    <span className="text-xs text-[#072929]">
                                        Draft ready.
                                        {assistantScope.accountId && assistantScope.channelId ? (
                                            <>{" "}
                                                <Link
                                                    to={`/brands/${assistantScope.accountId}/${assistantScope.channelId}/google/drafts/${campaignState.saved_draft_id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[#136D6D] font-medium hover:underline"
                                                >
                                                    View draft
                                                </Link>
                                            </>
                                        ) : null}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Campaign: form fields — use CampaignFormForChat (reuses campaign form components) for full campaign support */}
                        {SHOW_CAMPAIGN_SCHEMA_FORM && hasQuestionsSchema && schemaFormKey && !isLoading && !isStreaming && (
                            <CampaignFormForChat
                                ref={schemaFormRef}
                                key={schemaFormKey}
                                questionsSchema={questionsSchema as CurrentQuestionSchemaItem[]}
                                campaignDraft={campaignState?.campaign_draft as Record<string, unknown> | undefined}
                                campaignType={(campaignState?.campaign_draft as Record<string, unknown> | undefined)?.campaign_type as string || campaignState?.campaign_type as string || "SEARCH"}
                                onSend={sendMessage}
                                disabled={isLoading || isStreaming}
                                profileId={assistantScope.profileId ?? undefined}
                                accountId={assistantScope.accountId ?? undefined}
                                channelId={assistantScope.channelId ?? undefined}
                                googleProfiles={accountProfiles.map((p) => ({
                                    value: String(p.id),
                                    label: profileDisplayName(p),
                                    customer_id: p.customer_id ?? "",
                                    customer_id_raw: (p.customer_id ?? "").replace(/-/g, ""),
                                    profile_id: p.id,
                                }))}
                            />
                        )}

                        {/* Streaming State - only when we don't yet have the streaming AI bubble (e.g. waiting for first token) */}
                        {(isLoading || isStreaming) && !(messages.length > 0 && messages[messages.length - 1]?.type === "ai") && (
                            <div className="flex justify-start">
                                <div className=" w-full p-4 bg-[#F9F9F6] border border-[#E8E8E3] rounded-[12px] shadow-sm flex flex-col gap-3">
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
                                                        {getDisplayName(step, "node")}
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

            {/* Input Area - Cursor-style: upper row = description/input, lower row = agent + send; no plus icon */}
            <div className="px-4 py-3 border-t border-gray-100">
                <form onSubmit={handleSubmit} className="relative">
                    <div className="assistant-input-container rounded-[12px] p-3 flex flex-col gap-3">
                        {/* Upper row: description / message input */}
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
                            className="w-full min-h-[24px] max-h-[200px] resize-none overflow-y-auto bg-transparent text-[14px] font-normal text-[#072929] placeholder:text-[#9ca3af] focus:outline-none py-0"
                            style={{ fontFamily: "'GT America Trial', sans-serif", minHeight: ASSISTANT_TEXTAREA_MIN_HEIGHT, maxHeight: ASSISTANT_TEXTAREA_MAX_HEIGHT }}
                            disabled={isLoading || isStreaming || !canChat}
                            rows={1}
                        />
                        {/* Lower row: send/stop only (agent selection is in setup card Step 3) */}
                        <div className="flex items-center justify-end gap-2">
                            {isStreaming ? (
                                <button
                                    type="button"
                                    onClick={handleStop}
                                    className="flex items-center justify-center w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shrink-0"
                                    title="Stop generating"
                                >
                                    <Square className="w-4 h-4 fill-current" />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={!inputValue.trim() || isLoading || !canChat}
                                    className="flex items-center justify-center w-9 h-9 rounded-full bg-[#374151] hover:bg-[#1f2937] text-white transition-colors shrink-0 disabled:opacity-40 disabled:pointer-events-none"
                                    title="Send"
                                >
                                    <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
