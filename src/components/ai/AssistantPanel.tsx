import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useAssistant, type SessionWithMessages } from "../../contexts/AssistantContext";
import type { PixisTimelineItem } from "../../services/ai/pixisChat";
import { Square, X, ChevronDown, BarChart3, ArrowUp, Plus } from "lucide-react";
import StellarLogo from "../../assets/images/steller-logo-mini.svg";
import { ASSISTANT_ICONS } from "../../assets/icons/assistant-icons";
import { MessageContent } from "../ai/MessageContent";
import { ContentWithCharts } from "../ai/ContentWithCharts";
import { CampaignDraftPreview } from "../ai/CampaignDraftPreview";
import { accountsService, type Account } from "../../services/accounts";
import GoogleIcon from "../../assets/images/ri_google-fill.svg";
import AmazonIcon from "../../assets/images/amazon-fill.svg";
import MetaIcon from "../../assets/images/mingcute_meta-line.svg";
import { CampaignFormForChat, type CampaignFormForChatHandle } from "../ai/CampaignFormForChat";

// Helper function to group sessions by date, ordered by latest first
const groupSessionsByDate = (sessions: SessionWithMessages[]): Record<string, SessionWithMessages[]> => {
    const groups: Record<string, SessionWithMessages[]> = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sorted = [...sessions]
      .filter((s) => s.id !== "__pending__")
      .sort((a, b) =>
        new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()
      );

    sorted.forEach((session) => {
        const d = new Date(session.updated_at ?? session.created_at ?? 0);
        const ds = d.toDateString();
        const todayStr = today.toDateString();
        const yesterdayStr = yesterday.toDateString();
        let groupKey: string;
        if (ds === todayStr) groupKey = "Today";
        else if (ds === yesterdayStr) groupKey = "Yesterday";
        else groupKey = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(session);
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
        isStreaming,
        sessions,
        currentSessionId,
        isLoadingSessions,
        selectSession,
        startNewSession,
        deleteSession,
        deletingSessionId,
        cancelRun,
        closeAssistant,
        assistantScope,
        setAssistantScope,
        campaignState,
    } = useAssistant();

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesScrollContainerRef = useRef<HTMLDivElement>(null);
    const userScrolledUpRef = useRef(false);
    const lastAutoScrollTimeRef = useRef(0);
    const scrollThrottleMs = 80;
    const nearBottomThreshold = 120;
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const historyDropdownRef = useRef<HTMLDivElement>(null);
    const schemaFormRef = useRef<CampaignFormForChatHandle | null>(null);
    const [isSessionDropdownOpen, setIsSessionDropdownOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<{ id: string; title: string; anchorRect: DOMRect; source: "tab" | "history" } | null>(null);

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [accountProfiles, setAccountProfiles] = useState<AccountProfileOption[]>([]);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
    const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
    const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
    const [accountSearchQuery, setAccountSearchQuery] = useState("");
    const [isIntegrationProfileDropdownOpen, setIsIntegrationProfileDropdownOpen] = useState(false);
    const [profileSearchQuery, setProfileSearchQuery] = useState("");
    const accountDropdownRef = useRef<HTMLDivElement>(null);
    const integrationProfileDropdownRef = useRef<HTMLDivElement>(null);

    // Load accounts when panel is open
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        queueMicrotask(() => setIsLoadingAccounts(true));
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
            queueMicrotask(() => setAccountProfiles([]));
            return;
        }
        const accountIdNum = parseInt(assistantScope.accountId, 10);
        if (Number.isNaN(accountIdNum)) return;
        let cancelled = false;
        queueMicrotask(() => setIsLoadingProfiles(true));
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

    // Close dropdown and delete popup when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const el = target as Element;
            const isInPopup = el.closest?.(".assistant-delete-popup");
            if (sessionToDelete && !isInPopup) setSessionToDelete(null);
            if (historyDropdownRef.current && !historyDropdownRef.current.contains(target) && !isInPopup) {
                setIsSessionDropdownOpen(false);
            }
            if (accountDropdownRef.current && !accountDropdownRef.current.contains(target)) {
                setIsAccountDropdownOpen(false);
                setAccountSearchQuery("");
            }
            if (integrationProfileDropdownRef.current && !integrationProfileDropdownRef.current.contains(target)) {
                setIsIntegrationProfileDropdownOpen(false);
                setProfileSearchQuery("");
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [sessionToDelete]);

    // Reset scroll-follow when switching sessions so we scroll to bottom for new conversation
    useEffect(() => {
        userScrolledUpRef.current = false;
    }, [currentSessionId]);

    // Auto-scroll to bottom when new messages arrive — smooth, throttled, and respect user scroll-up
    useEffect(() => {
        if (userScrolledUpRef.current) return;
        const container = messagesScrollContainerRef.current;
        if (!container) return;
        const now = Date.now();
        if (now - lastAutoScrollTimeRef.current < scrollThrottleMs) return;
        lastAutoScrollTimeRef.current = now;
        requestAnimationFrame(() => {
            const target = container.scrollHeight - container.clientHeight;
            if (target <= 0) return;
            container.scrollTo({ top: target, behavior: "smooth" });
        });
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
        const schema = SHOW_CAMPAIGN_SCHEMA_FORM && hasQuestionsSchema ? questionsSchema : [];
        const formValues = SHOW_CAMPAIGN_SCHEMA_FORM && hasQuestionsSchema && schemaFormRef.current ? schemaFormRef.current.getValues() : {};

        const formParts =
            schema.length > 0 && Object.keys(formValues).length > 0
                ? (schema
                    .map((item: any) => {
                        const v = formValues[item];
                        if (v === undefined || v === "") return null;
                        const label = item || item;
                        if (item === "channel_controls") {
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
            userScrolledUpRef.current = false;
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
        userScrolledUpRef.current = false;
        sendMessage(promptText);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
        // Shift+Enter: allow default (insert newline)
    };

    const handleSessionSelect = async (sessionId: string) => {
        await selectSession(sessionId);
        setIsSessionDropdownOpen(false);
    };

    const handleNewSession = () => {
        startNewSession();
        // Clear profile so user must select it again (account can remain selected from previous session)
        setAssistantScope({ channelId: null, profileId: null, profileName: null, marketplace: null });
        setIsSessionDropdownOpen(false);
        setIsAccountDropdownOpen(false);
        setIsIntegrationProfileDropdownOpen(false);
    };

    const handleDeleteClick = (session: SessionWithMessages, e: React.MouseEvent, source: "tab" | "history") => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setSessionToDelete({ id: session.id, title: session.title || "Untitled", anchorRect: rect, source });
    };

    const handleConfirmDelete = async () => {
        if (!sessionToDelete) return;
        await deleteSession(sessionToDelete.id);
        setSessionToDelete(null);
    };

    const handleCancelDelete = () => {
        setSessionToDelete(null);
    };

    const questionsSchema = campaignState?.keys_for_form;
    const hasQuestionsSchema = questionsSchema && questionsSchema.length > 0;

    const groupedSessions = groupSessionsByDate(sessions);
    const hasMessages = messages.length > 0;

    const selectedAccount = accounts.find((a) => String(a.id) === assistantScope.accountId);
    const selectedProfileOption = accountProfiles.find(
        (p) => String(p.channel_id) === assistantScope.channelId && p.id === assistantScope.profileId
    );

    const canChat = !!(
        assistantScope.accountId &&
        assistantScope.channelId &&
        assistantScope.profileId
    );

    const contextSection = (
        <div className="assistant-setup-card">
            <p className="assistant-setup-heading">
                Set up your session in 2 steps
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
                                <>
                                    <div className="p-2 border-b border-[#e8e8e3]">
                                        <input
                                            type="text"
                                            value={accountSearchQuery}
                                            onChange={(e) => setAccountSearchQuery(e.target.value)}
                                            placeholder="Search brands..."
                                            className="w-full px-3 py-2 text-sm border border-[#e8e8e3] rounded-lg bg-white text-[#072929] placeholder:text-[#556179] focus:outline-none focus:ring-2 focus:ring-[#136d6d] focus:border-transparent"
                                            onClick={(e) => e.stopPropagation()}
                                            aria-label="Search brands"
                                        />
                                    </div>
                                    <div className="max-h-[240px] overflow-y-auto">
                                        {(() => {
                                            const q = accountSearchQuery.trim().toLowerCase();
                                            const filtered = q
                                                ? accounts.filter((acc) =>
                                                    (acc.name ?? "").toLowerCase().includes(q)
                                                )
                                                : accounts;
                                            if (filtered.length === 0) {
                                                return (
                                                    <div className="assistant-setup-dropdown-empty py-4">
                                                        {q ? "No brands match your search" : "No accounts"}
                                                    </div>
                                                );
                                            }
                                            return filtered.map((acc) => {
                                                const initial = acc.name?.[0]?.toUpperCase() || "A";
                                                const bgColor = getInitialColor(initial);
                                                return (
                                                    <button
                                                        key={acc.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setAssistantScope({ accountId: String(acc.id), channelId: null, profileId: null, profileName: null, marketplace: null });
                                                            setIsAccountDropdownOpen(false);
                                                            setAccountSearchQuery("");
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
                                            });
                                        })()}
                                    </div>
                                </>
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
                                <>
                                    {accountProfiles.length > 5 && (
                                        <div className="p-2 border-b border-[#e8e8e3]">
                                            <input
                                                type="text"
                                                value={profileSearchQuery}
                                                onChange={(e) => setProfileSearchQuery(e.target.value)}
                                                placeholder="Search integration & profile..."
                                                className="w-full px-3 py-2 text-sm border border-[#e8e8e3] rounded-lg bg-white text-[#072929] placeholder:text-[#556179] focus:outline-none focus:ring-2 focus:ring-[#136d6d] focus:border-transparent"
                                                onClick={(e) => e.stopPropagation()}
                                                aria-label="Search integration and profile"
                                            />
                                        </div>
                                    )}
                                    <div className={accountProfiles.length > 5 ? "max-h-[240px] overflow-y-auto" : ""}>
                                        {(() => {
                                            const showSearch = accountProfiles.length > 5;
                                            const q = showSearch ? profileSearchQuery.trim().toLowerCase() : "";
                                            const filtered = showSearch && q
                                                ? accountProfiles.filter((p) => {
                                                    const label = `${profileDisplayName(p)} (${profileIdForDisplay(p)})`;
                                                    return label.toLowerCase().includes(q);
                                                })
                                                : accountProfiles;
                                            if (filtered.length === 0) {
                                                return (
                                                    <div className="assistant-setup-dropdown-empty py-4">
                                                        {showSearch && q ? "No profiles match your search" : "No profiles. Select an account first."}
                                                    </div>
                                                );
                                            }
                                            return filtered.map((p) => {
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
                                                            setProfileSearchQuery("");
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
                                            });
                                        })()}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
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
                        {isLoadingSessions ? (
                            <span className="assistant-muted-text">Loading...</span>
                        ) : sessions.filter((s) => s.id !== "__pending__").length > 0 ? (
                            [...sessions]
                                .filter((s) => s.id !== "__pending__")
                                .sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime())
                                .map((session) => (
                                    <div
                                        key={session.id}
                                        className={`assistant-tab-pill ${currentSessionId === session.id ? "assistant-tab-pill-active" : ""}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleSessionSelect(session.id)}
                                            className="assistant-tab-pill-button"
                                            title={session.title || "Untitled"}
                                            disabled={isLoading}
                                        >
                                            {isLoading && currentSessionId === session.id ? (
                                                <div className="flex gap-0.5">
                                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
                                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                                </div>
                                            ) : (
                                                <BarChart3 className="w-4 h-4 shrink-0" />
                                            )}
                                            <span className="max-w-[120px] truncate">{session.title || "Untitled"}</span>
                                        </button>
                                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeleteClick(session, e, "tab")}
                                                className="assistant-tab-delete"
                                                title="Delete conversation"
                                                aria-label="Delete conversation"
                                                disabled={deletingSessionId === session.id}
                                            >
                                                {deletingSessionId === session.id ? (
                                                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <X className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))
                        ) : null}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 pl-2">
                        <div ref={historyDropdownRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setIsSessionDropdownOpen(!isSessionDropdownOpen)}
                                className="assistant-header-icon-btn"
                                title="Chat history"
                                aria-label="Chat history"
                            >
                                <span dangerouslySetInnerHTML={{ __html: ASSISTANT_ICONS.chatHistory }} />
                            </button>
                            {isSessionDropdownOpen && (
                                <div className="assistant-history-dropdown">
                                    <div className="assistant-history-header">
                                        <h3 className="assistant-history-title">History</h3>
                                    </div>
                                    {isLoadingSessions ? (
                                        <div className="px-4 py-3 text-sm assistant-muted-text">
                                            Loading conversations...
                                        </div>
                                    ) : sessions.filter((s) => s.id !== "__pending__").length === 0 ? (
                                        <div className="px-4 py-3 text-sm assistant-muted-text">
                                            No previous conversations
                                        </div>
                                    ) : (
                                        Object.entries(groupedSessions)
                                            .sort(([keyA], [keyB]) => {
                                                const order: Record<string, number> = { Today: 0, Yesterday: 1 };
                                                const orderA = order[keyA] ?? 2;
                                                const orderB = order[keyB] ?? 2;
                                                if (orderA !== orderB) return orderA - orderB;
                                                if (orderA === 2) return new Date(keyB).getTime() - new Date(keyA).getTime();
                                                return 0;
                                            })
                                            .map(([dateGroup, groupSessions]) => (
                                                <div key={dateGroup}>
                                                    <div className="assistant-history-date-group">
                                                        <span>{dateGroup}</span>
                                                        <span>{groupSessions.length} Total</span>
                                                    </div>
                                                    {groupSessions.map((session) => (
                                                        <div
                                                            key={session.id}
                                                            className={`assistant-history-item ${currentSessionId === session.id ? "assistant-history-item-active" : ""}`}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSessionSelect(session.id)}
                                                                className="assistant-history-item-button"
                                                                disabled={isLoading}
                                                            >
                                                                {isLoading && currentSessionId === session.id ? (
                                                                    <div className="flex gap-0.5 shrink-0">
                                                                        <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" />
                                                                        <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                                                                        <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                                                    </div>
                                                                ) : (
                                                                    <BarChart3 className="w-4 h-4 shrink-0" />
                                                                )}
                                                                <span className="truncate flex-1">{session.title || "Untitled"}</span>
                                                            </button>
                                                            <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleDeleteClick(session, e, "history")}
                                                                    className="assistant-history-delete"
                                                                    title="Delete conversation"
                                                                    aria-label="Delete conversation"
                                                                    disabled={deletingSessionId === session.id}
                                                                >
                                                                    {deletingSessionId === session.id ? (
                                                                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                                    ) : (
                                                                        <X className="w-4 h-4" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))
                                    )}
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleNewSession}
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
                    {campaignState && (
                        <CampaignDraftPreview
                            campaignState={campaignState}
                            visible
                            accountId={assistantScope.accountId ?? undefined}
                            channelId={assistantScope.channelId ?? undefined}
                            className="shrink-0 ml-auto"
                        />
                    )}
                </div>
            </div>
            {/* Messages Area - min-h-0 allows flex child to shrink so overflow only when content exceeds available space */}
            <div
                ref={messagesScrollContainerRef}
                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden interactive-scrollbar px-4 py-4"
                style={{ scrollBehavior: "smooth" }}
                onScroll={() => {
                    const el = messagesScrollContainerRef.current;
                    if (!el) return;
                    const { scrollTop, scrollHeight, clientHeight } = el;
                    const distFromBottom = scrollHeight - scrollTop - clientHeight;
                    userScrolledUpRef.current = distFromBottom > nearBottomThreshold;
                }}
            >
                {isLoading && currentSessionId && !hasMessages ? (
                    /* Loading history for selected session */
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <div className="flex items-center gap-2 text-[#556179]">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-[#136D6D]/60 rounded-full animate-bounce" />
                                <span className="w-2 h-2 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                                <span className="w-2 h-2 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                            </div>
                            <span className="text-sm font-medium">Loading conversation...</span>
                        </div>
                    </div>
                ) : !hasMessages ? (
                    /* Empty State: show 3-step setup until user selects Analyze or Create Campaign; then hide setup and show prompts only */
                    <div className="flex flex-col items-center justify-center h-full gap-6">
                        {/* Assistant logo and title at top, above setup */}
                        <div className="mb-0">
                            <img src={StellarLogo} alt="Assistant" className="h-16 w-16" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">
                            Assistant
                        </h3>

                        {/* Set up your session - hidden once user has full scope */}
                        {!canChat && contextSection}

                        {!canChat ? (
                            <p className="text-sm text-gray-600 text-center px-4">
                                {!assistantScope.accountId
                                    ? "Select an account above to start."
                                    : !assistantScope.channelId || !assistantScope.profileId
                                        ? "Select an integration–profile above to start."
                                        : "Start typing to begin."}
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
                        {messages.map((message) => {
                            if (message.type === "human") {
                                return (
                                    <div key={message.id} className="flex justify-end human">
                                        <div className="min-w-0 flex flex-col justify-between items-end p-3 gap-1 h-auto bg-[#e8e8e3] rounded-[12px] shadow-sm overflow-x-auto">
                                            <div className="text-[14px] font-normal leading-[20px] tracking-[0.1px] text-[#072929] min-w-0 max-w-full overflow-x-auto" style={{ fontFamily: "'GT America Trial', sans-serif" }}>
                                                <MessageContent content={message.content} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            if (message.type === "ai") {
                                const { content, timeline, isStreaming: aiStreaming, error } = message;
                                return (
                                    <div key={message.id} className="flex justify-start ai">
                                        <div className="min-w-0 flex flex-col items-start p-4 gap-2 w-full max-w-full bg-[#F9F9F6] border border-[#E8E8E3] rounded-[12px] shadow-sm">
                                            {error && <div className="text-sm text-red-600">{error}</div>}
                                            <div className="flex flex-col gap-2 w-full" style={{ fontFamily: "'GT America Trial', sans-serif" }}>
                                                {timeline.length === 0 && aiStreaming && (
                                                    <div className="flex items-center gap-2 text-[#556179]">
                                                        <span className="text-xs font-medium">Thinking</span>
                                                        <div className="flex gap-1">
                                                            <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" />
                                                            <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                                                            <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                                        </div>
                                                    </div>
                                                )}
                                                {timeline.map((item: PixisTimelineItem, idx: number) => (
                                                    <div key={idx} className="flex items-start gap-2 w-full">
                                                        {item.type === "thinking" && (
                                                            <div className="flex items-center gap-2 text-[#556179]">
                                                                <span className="w-1.5 h-1.5 bg-[#136D6D] rounded-full animate-pulse shrink-0" />
                                                                <span className="text-xs">Processing...</span>
                                                                <div className="flex gap-1">
                                                                    <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" />
                                                                    <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                                                                    <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {item.type === "tool_call" && (
                                                            <div className="flex items-center gap-2 text-[#556179] text-sm">
                                                                <span className="w-1.5 h-1.5 bg-[#136D6D] rounded-full shrink-0" />
                                                                <span>{item.label}</span>
                                                            </div>
                                                        )}
                                                        {item.type === "text" && item.content && (
                                                            <div className="assistant-message-content">
                                                                <ContentWithCharts content={item.content} type="ai" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {timeline.length === 0 && !aiStreaming && content && (
                                                    <div className="assistant-message-content">
                                                        <ContentWithCharts content={content} type="ai" />
                                                    </div>
                                                )}
                                                {aiStreaming && timeline.length > 0 && (
                                                    <div className="flex items-center gap-2 text-[#556179]">
                                                        <span className="text-xs font-medium">Thinking</span>
                                                        <div className="flex gap-1">
                                                            <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" />
                                                            <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                                                            <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })}

                        {/* Waiting for first token */}
                        {isStreaming && (messages.length === 0 || messages[messages.length - 1]?.type !== "ai") && (
                            <div className="flex justify-start">
                                <div className="p-4 bg-[#F9F9F6] border border-[#E8E8E3] rounded-[12px] flex items-center gap-2 text-[#556179]">
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
                        {campaignState && ((campaignState.validation_error && campaignState.validation_error.length > 0) || (campaignState.draft && Object.keys(campaignState.draft).length > 0 && campaignState.draft_id)) && (
                            <div className="flex flex-col gap-2 mt-2 p-3 bg-[#F9F9F6] border border-[#E8E8E3] rounded-[10px]">
                                {campaignState.validation_error && campaignState.validation_error.length > 0 && (
                                    <div className="text-xs text-red-600">
                                          {campaignState.validation_error}
                                    </div>
                                )}
                                {campaignState.draft && Object.keys(campaignState.draft).length > 0 && campaignState.draft_id && (
                                    <span className="text-xs text-[#072929]">
                                        Draft ready.
                                        {assistantScope.accountId && assistantScope.channelId ? (
                                            <>{" "}
                                                <Link
                                                    to={`/brands/${assistantScope.accountId}/${assistantScope.channelId}/google/campaigns/${campaignState.draft_id}`}
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
                        {SHOW_CAMPAIGN_SCHEMA_FORM && hasQuestionsSchema && !isLoading && !isStreaming && (
                            <CampaignFormForChat
                                ref={schemaFormRef}
                                questionsSchema={questionsSchema as string[]}
                                campaignDraft={campaignState?.draft as Record<string, unknown> | undefined}
                                campaignType={(campaignState?.draft as Record<string, unknown> | undefined)?.campaign_type as string || campaignState?.campaign_type as string || "SEARCH"}
                                onSend={sendMessage}
                                disabled={isLoading || isStreaming}
                                profileId={assistantScope.profileId ?? undefined}
                                accountId={assistantScope.accountId ?? undefined}
                                channelId={assistantScope.channelId ?? undefined}
                            />
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

            {sessionToDelete && deletingSessionId !== sessionToDelete.id && createPortal(
                <div
                    className="assistant-delete-popup fixed z-[9999] min-w-[160px] py-2 px-2 bg-white border border-gray-200 rounded-lg shadow-lg"
                    style={{
                        top: sessionToDelete.source === "tab" ? sessionToDelete.anchorRect.bottom + 4 : undefined,
                        bottom: sessionToDelete.source === "history" ? window.innerHeight - sessionToDelete.anchorRect.top + 8 : undefined,
                        left: sessionToDelete.anchorRect.right - 160,
                    }}
                >
                    <p className="text-xs text-[#556179] px-2 mb-2">Delete this conversation?</p>
                    <div className="flex gap-1.5 justify-end">
                        <button type="button" onClick={handleCancelDelete} className="text-xs text-[#556179] hover:bg-gray-100 px-2 py-1 rounded">No</button>
                        <button type="button" onClick={handleConfirmDelete} className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded font-medium">Yes</button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
