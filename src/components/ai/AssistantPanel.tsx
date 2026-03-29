import React, { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useAssistant, type SessionWithMessages } from "../../contexts/AssistantContext";
import { useAccounts, type AccountProfileOption } from "../../contexts/AccountsContext";
import { useAuth } from "../../contexts/AuthContext";
import type { PixisTimelineItem } from "../../services/ai/pixisChat";
import { Square, X, ChevronDown, BarChart3, ArrowUp, Plus, Users, ClipboardList, Sparkles, Search, Share2, Copy, Check, RefreshCw, FlaskConical, Clipboard, Loader2 } from "lucide-react";
import StellarLogo from "../../assets/images/steller-logo-mini.svg";
import { ASSISTANT_ICONS } from "../../assets/icons/assistant-icons";
import { MessageContent } from "../ai/MessageContent";
import { ContentWithCharts } from "../ai/ContentWithCharts";
import { CampaignDraftPreview } from "../ai/CampaignDraftPreview";
import { AssistantActivityBlock } from "../ai/AssistantActivityBlock";
import { SubagentPanel } from "../ai/SubagentPanel";
import { TodoPanel } from "../ai/TodoPanel";
import GoogleIcon from "../../assets/images/ri_google-fill.svg";
import AmazonIcon from "../../assets/images/amazon-fill.svg";
import MetaIcon from "../../assets/images/mingcute_meta-line.svg";
import { CampaignFormForChat, type CampaignFormForChatHandle } from "../ai/CampaignFormForChat";
import { deriveCampaignStateFromContent } from "../../utils/chartJsonParser";
import { groupSessionsByDate } from "../../utils/assistantSessionUtils";
import {
    INSIGHT_CARDS,
    INSIGHT_CATEGORIES,
    type InsightCategory,
} from "./insightCardsConfig";
import { createSessionShare, createThreadShare } from "../../services/ai/chatShare";

/** Set to false to hide the "Fill in the details" schema form (e.g. Logo image URL, Daily budget) in campaign setup. */
const SHOW_CAMPAIGN_SCHEMA_FORM = true;

const ASSISTANT_TEXTAREA_MIN_HEIGHT = 24;
const ASSISTANT_TEXTAREA_MAX_HEIGHT = 200;

const INSIGHT_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    Users,
    ClipboardList,
    BarChart3,
    Sparkles,
};

/** Slash commands — sent as-is to backend (no expansion) */
const SLASH_COMMANDS = [
  { cmd: "/pdf", label: "Generate PDF report" },
  { cmd: "/docx", label: "Generate Word report" },
  { cmd: "/custom-dashboard", label: "Create custom dashboard" },
  { cmd: "/dashboard-actions", label: "Create dashboard with optimization actions" },
] as const;

/** Profile item from GET /accounts/:accountId/profiles/ (channel_id, channel_name, profile name) */

/** Group profiles by platform (Google, Meta, TikTok). Amazon hidden for now. */
const PLATFORM_ORDER = ["google", "meta", "tiktok", "other"] as const;

function profileDisplayName(p: AccountProfileOption): string {
    return p.name ?? p.advertiser_name ?? p.customer_id ?? p.advertiser_id ?? String(p.id);
}

function profileIdForDisplay(p: AccountProfileOption): string {
    return p.customer_id ?? p.advertiser_id ?? p.ad_account_id ?? p.profileId ?? String(p.id);
}

export type AssistantPanelVariant = "panel" | "page";

interface AssistantPanelProps {
    className?: string;
    /** "panel" = slide-over (close button, history dropdown); "page" = full page (no close, no history dropdown) */
    variant?: AssistantPanelVariant;
}

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
    className = "",
    variant = "panel",
}) => {
    const {
        isOpen,
        messages,
        isLoading,
        loadingHistorySessionId,
        inputValue,
        setInputValue,
        sendMessage,
        suggestedPrompts,
        isStreaming,
        sessions,
        currentSessionId,
        streamingNewSessionId,
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
        workingOnRequest,
        runTestSse,
        todoList,
        runningSessionIds,
    } = useAssistant();

    const { user } = useAuth();
    const userInitials = user
        ? `${(user.first_name?.[0] ?? "").toUpperCase()}${(user.last_name?.[0] ?? "").toUpperCase()}` || "U"
        : "U";

    const effectiveSessionId = currentSessionId ?? streamingNewSessionId;

    // Copy AI response text to clipboard
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const handleCopyResponse = useCallback((messageId: string, text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedMessageId(messageId);
            setTimeout(() => setCopiedMessageId(null), 2000);
        });
    }, []);

    // Use AccountsContext for accounts and profiles (cached at app level)
    const {
        accounts,
        loading: isLoadingAccounts,
        getAccountProfiles,
        getAccountProfilesCached,
        allAccountsWithProfiles: contextAllAccountsWithProfiles,
        loadingAllProfiles: contextLoadingAllProfiles,
        loadAllAccountsProfiles,
        getAccountGoogleSheetsIntegrationsCached,
    } = useAccounts();

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesScrollContainerRef = useRef<HTMLDivElement>(null);
    const userScrolledUpRef = useRef(false);
    const programmaticScrollUntilRef = useRef(0);
    const lastAutoScrollTimeRef = useRef(0);
    const scrollThrottleMs = 300;
    const nearBottomThreshold = 80;
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const editableRef = useRef<HTMLDivElement>(null);
    const historyDropdownRef = useRef<HTMLDivElement>(null);
    const schemaFormRef = useRef<CampaignFormForChatHandle | null>(null);
    const campaignFormAreaRef = useRef<HTMLDivElement>(null);
    const [isSessionDropdownOpen, setIsSessionDropdownOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<{ id: string; title: string; anchorRect: DOMRect; source: "tab" | "history" } | null>(null);

    // Fetch result for single account (keyed by accountId to avoid stale display when switching)
    const [accountProfilesFetched, setAccountProfilesFetched] = useState<{
        accountId: number;
        profiles: AccountProfileOption[];
    } | null>(null);
    // Use state to track if we're showing the multi-select dropdown with all profiles
    const [isIntegrationProfileDropdownOpen, setIsIntegrationProfileDropdownOpen] = useState(false);
    /** True after user has clicked Apply (so we show "Would you like to" only after they confirm selection) */
    const [hasAppliedProfileSelection, setHasAppliedProfileSelection] = useState(false);
    const isIntegrationProfileDropdownOpenRef = useRef(isIntegrationProfileDropdownOpen);
    useEffect(() => {
        isIntegrationProfileDropdownOpenRef.current = isIntegrationProfileDropdownOpen;
    }, [isIntegrationProfileDropdownOpen]);
    const [profileSearchQuery, setProfileSearchQuery] = useState("");
    const [isSlashDropdownOpen, setIsSlashDropdownOpen] = useState(false);
    const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
    const [editableContent, setEditableContent] = useState(""); // for slash trigger; actual DOM is source of truth
    const [insightCategory, setInsightCategory] = useState<InsightCategory>("all");
    const editableSyncRafRef = useRef<number | null>(null);
    const integrationProfileDropdownRef = useRef<HTMLDivElement>(null);
    const slashDropdownRef = useRef<HTMLDivElement>(null);

    // Share modal state
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareLink, setShareLink] = useState("");
    const [shareError, setShareError] = useState<string | null>(null);
    const [shareCopied, setShareCopied] = useState(false);
    const [shareThreadId, setShareThreadId] = useState<string | null>(null);
    // Cache share links so clicking Share again shows the same link instantly (key = sessionId or sessionId:threadId)
    const shareLinkCache = useRef<Record<string, string>>({});

    const _openShareModal = async (cacheKey: string, threadId: string | null, fetchFn: () => Promise<string>) => {
        setShareError(null);
        setShareThreadId(threadId);
        setShareModalOpen(true);
        const cached = shareLinkCache.current[cacheKey];
        if (cached) {
            setShareLink(cached);
            return;
        }
        setShareLink("");
        try {
            const link = await fetchFn();
            shareLinkCache.current[cacheKey] = link;
            setShareLink(link);
        } catch {
            setShareError("Failed to create share link. Please try again.");
        }
    };

    const handleShareSession = () => {
        if (!effectiveSessionId || !assistantScope.accountId) return;
        const cacheKey = effectiveSessionId;
        _openShareModal(cacheKey, null, async () => {
            const share = await createSessionShare(Number(assistantScope.accountId), effectiveSessionId);
            return `${window.location.origin}/chat/share/${share.share_token}`;
        });
    };

    const handleShareThread = (threadId: string) => {
        if (!effectiveSessionId || !assistantScope.accountId) return;
        // msg-* IDs are temporary frontend IDs assigned during streaming — they have no match
        // in the DB (cur_session_threads.id uses real UUIDs). Fall back to a full session share.
        if (threadId.startsWith("msg-")) {
            handleShareSession();
            return;
        }
        const cacheKey = `${effectiveSessionId}:${threadId}`;
        _openShareModal(cacheKey, threadId, async () => {
            const share = await createThreadShare(Number(assistantScope.accountId), effectiveSessionId, threadId);
            return `${window.location.origin}/chat/share/${share.share_token}`;
        });
    };

    const handleCopyShareLink = () => {
        if (!shareLink) return;
        navigator.clipboard.writeText(shareLink).then(() => {
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
        });
    };

    const handleCloseShareModal = () => {
        setShareModalOpen(false);
        // Keep shareLink in state (not cleared) so reopening is instant
        setShareError(null);
        setShareCopied(false);
    };

    // Sync inputValue from context to editableContent and DOM
    useEffect(() => {
        if (inputValue && editableRef.current) {
            editableRef.current.textContent = inputValue;
            queueMicrotask(() => setEditableContent(inputValue));
        }
    }, [inputValue, isOpen]);

    // When loading a session from history that has selectedProfiles, treat as already applied
    const selectedProfilesCount = (assistantScope.selectedProfiles ?? []).length;
    useEffect(() => {
        if (currentSessionId && selectedProfilesCount > 0) {
            queueMicrotask(() => setHasAppliedProfileSelection(true));
        }
    }, [currentSessionId, selectedProfilesCount]);

    // Auto-select first account when only one exists (enables session list API call on /chat)
    useEffect(() => {
        if (
            variant === "page" &&
            !isLoadingAccounts &&
            accounts.length === 1 &&
            !assistantScope.accountId
        ) {
            setAssistantScope({
                accountId: String(accounts[0].id),
                channelId: null,
                profileId: null,
                profileName: null,
                marketplace: null,
            });
        }
    }, [variant, isLoadingAccounts, accounts, assistantScope.accountId, setAssistantScope]);

    // Derive accountProfiles: use cache when available, otherwise use fetch result (keyed by accountId)
    const accountProfiles = React.useMemo(() => {
        if (!assistantScope.accountId) return [];
        const accountIdNum = parseInt(assistantScope.accountId, 10);
        if (Number.isNaN(accountIdNum)) return [];
        const cached = getAccountProfilesCached(accountIdNum);
        if (cached) return cached;
        if (accountProfilesFetched && accountProfilesFetched.accountId === accountIdNum) {
            return accountProfilesFetched.profiles;
        }
        return [];
    }, [assistantScope.accountId, getAccountProfilesCached, accountProfilesFetched]);

    // Fetch profiles when account is selected and not in cache
    useEffect(() => {
        if (!assistantScope.accountId) return;
        const accountIdNum = parseInt(assistantScope.accountId, 10);
        if (Number.isNaN(accountIdNum)) return;
        if (getAccountProfilesCached(accountIdNum)) return; // cache hit, useMemo handles it
        let cancelled = false;
        getAccountProfiles(accountIdNum)
            .then((profiles) => {
                if (!cancelled) setAccountProfilesFetched({ accountId: accountIdNum, profiles });
            })
            .catch(() => {
                if (!cancelled) setAccountProfilesFetched({ accountId: accountIdNum, profiles: [] });
            });
        return () => { cancelled = true; };
    }, [assistantScope.accountId, getAccountProfiles, getAccountProfilesCached]);

    // Use context's allAccountsWithProfiles when available (stable reference for deps)
    const allAccountsWithProfiles = React.useMemo(
        () => contextAllAccountsWithProfiles ?? [],
        [contextAllAccountsWithProfiles]
    );

    // When combined "account & profiles" dropdown opens, load profiles for ALL accounts (for multi-select)
    useEffect(() => {
        if (!isIntegrationProfileDropdownOpen || accounts.length === 0) return;
        if (allAccountsWithProfiles.length > 0) return; // already loaded in context
        void loadAllAccountsProfiles();
    }, [isIntegrationProfileDropdownOpen, accounts, allAccountsWithProfiles.length, loadAllAccountsProfiles]);

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
            const ref = integrationProfileDropdownRef.current;
            const containsTarget = ref ? ref.contains(target) : false;
            if (ref && !containsTarget) {
                isIntegrationProfileDropdownOpenRef.current = false;
                setIsIntegrationProfileDropdownOpen(false);
                setProfileSearchQuery("");
            }
            if (slashDropdownRef.current && !slashDropdownRef.current.contains(target)) {
                setIsSlashDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [sessionToDelete]);

    useEffect(() => () => {
        if (editableSyncRafRef.current) cancelAnimationFrame(editableSyncRafRef.current);
    }, []);

    // Reset scroll-follow when switching sessions so we scroll to bottom for new conversation
    useEffect(() => {
        userScrolledUpRef.current = false;
    }, [currentSessionId]);

    // Auto-scroll to bottom when new messages arrive — instant, throttled, and respect user scroll-up
    useEffect(() => {
        if (userScrolledUpRef.current) return;
        const container = messagesScrollContainerRef.current;
        if (!container) return;
        const now = Date.now();
        if (now - lastAutoScrollTimeRef.current < scrollThrottleMs) return;
        lastAutoScrollTimeRef.current = now;
        programmaticScrollUntilRef.current = Date.now() + 150;
        requestAnimationFrame(() => {
            const target = container.scrollHeight - container.clientHeight;
            if (target <= 0) return;
            container.scrollTo({ top: target, behavior: "instant" });
        });
    }, [messages]);

    useEffect(() => {
        if (!isStreaming) {
            setShowScrollToBottom(false);
            userScrolledUpRef.current = false;
        }
    }, [isStreaming]);

    // Show slash dropdown when user types "/" (hide when input exactly matches a full command)
    const filteredSlashCommands = SLASH_COMMANDS.filter((c) => {
        const v = editableContent.trimStart();
        if (!v.startsWith("/")) return false;
        const q = v.slice(1).toLowerCase();
        return !q || c.cmd.slice(1).startsWith(q);
    });
    const isExactCommand = filteredSlashCommands.some((c) => editableContent.trim() === c.cmd);

    useEffect(() => {
        const v = editableContent.trimStart();
        if (v.startsWith("/") && !isExactCommand) {
            const afterSlash = v.slice(1).toLowerCase();
            if (afterSlash === "" || SLASH_COMMANDS.some((c) => c.cmd.slice(1).startsWith(afterSlash))) {
                queueMicrotask(() => {
                    setIsSlashDropdownOpen(true);
                    setSlashSelectedIndex(0);
                });
                return;
            }
        }
        queueMicrotask(() => setIsSlashDropdownOpen(false));
    }, [editableContent, isExactCommand]);

    // Keep selected index in range when filter narrows
    useEffect(() => {
        if (isSlashDropdownOpen && filteredSlashCommands.length > 0 && slashSelectedIndex >= filteredSlashCommands.length) {
            queueMicrotask(() => setSlashSelectedIndex(filteredSlashCommands.length - 1));
        }
    }, [isSlashDropdownOpen, filteredSlashCommands.length, slashSelectedIndex]);

    const getEditableTextBeforeCursor = (): string => {
        const el = editableRef.current;
        if (!el) return "";
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !sel.anchorNode) return "";
        if (!el.contains(sel.anchorNode)) return "";
        try {
            const range = document.createRange();
            range.setStart(el, 0);
            range.setEnd(sel.anchorNode, sel.anchorOffset);
            return range.toString();
        } catch {
            return "";
        }
    };

    const getEditableValue = (): string => {
        const el = editableRef.current;
        if (!el) return "";
        const BLOCK_TAGS = new Set(["DIV", "P"]);
        const walk = (node: Node): string => {
            if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
            if (node.nodeType === Node.ELEMENT_NODE) {
                const e = node as HTMLElement;
                if (e.dataset.cmd) return e.dataset.cmd;
                if (e.tagName?.toUpperCase() === "BR") return "\n";
                const parts: string[] = [];
                Array.from(node.childNodes).forEach((child, i) => {
                    if (child.nodeType === Node.ELEMENT_NODE) {
                        const tag = (child as HTMLElement).tagName?.toUpperCase();
                        if (tag === "BR") {
                            parts.push("\n");
                            return;
                        }
                        if (BLOCK_TAGS.has(tag) && i > 0) parts.push("\n");
                    }
                    parts.push(walk(child));
                });
                return parts.join("");
            }
            return "";
        };
        const parts: string[] = [];
        Array.from(el.childNodes).forEach((child, i) => {
            if (child.nodeType === Node.ELEMENT_NODE) {
                const tag = (child as HTMLElement).tagName?.toUpperCase();
                if (tag === "BR") {
                    parts.push("\n");
                    return;
                }
                if (BLOCK_TAGS.has(tag) && i > 0) parts.push("\n");
            }
            parts.push(walk(child));
        });
        return parts.join("");
    };

    const syncEditableContentToState = useCallback((immediate?: boolean) => {
        const value = getEditableValue();
        if (immediate || value.trimStart().startsWith("/")) {
            if (editableSyncRafRef.current) {
                cancelAnimationFrame(editableSyncRafRef.current);
                editableSyncRafRef.current = null;
            }
            setEditableContent(value);
            return;
        }
        if (editableSyncRafRef.current) return;
        editableSyncRafRef.current = requestAnimationFrame(() => {
            editableSyncRafRef.current = null;
            setEditableContent(getEditableValue());
        });
    }, []);

    const insertChipAtCursor = (cmd: string) => {
        const el = editableRef.current;
        if (!el) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        const textBefore = getEditableTextBeforeCursor();
        const match = textBefore.match(/\/[\w]*$/);
        if (match) {
            range.setStart(sel.anchorNode!, sel.anchorOffset - match[0].length);
            range.deleteContents();
        }
        const span = document.createElement("span");
        span.contentEditable = "false";
        span.dataset.cmd = cmd;
        span.className = "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[13px] font-medium bg-[#E6F2F2] text-[#136D6D] border border-[#B8E0E0] align-middle mx-0.5";
        span.innerHTML = `${cmd} <button type="button" class="inline-flex items-center justify-center ml-0.5 w-4 h-4 hover:bg-[#136D6D]/20 rounded cursor-pointer text-[#136D6D]" data-remove-chip aria-label="Remove"><svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>`;
        span.addEventListener("click", (e) => {
            const btn = (e.target as HTMLElement).closest("[data-remove-chip]");
            if (btn) {
                span.remove();
                setEditableContent(getEditableValue());
                el.focus();
            }
        });
        range.insertNode(span);
        range.setStartAfter(span);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        setEditableContent(getEditableValue());
        el.focus();
    };

    // Auto-grow editable so user can see what they type
    useEffect(() => {
        const el = editableRef.current;
        if (!el) return;
        el.style.height = "auto";
        const h = Math.min(ASSISTANT_TEXTAREA_MAX_HEIGHT, Math.max(ASSISTANT_TEXTAREA_MIN_HEIGHT, el.scrollHeight));
        el.style.height = `${h}px`;
        el.style.overflowY = el.scrollHeight > ASSISTANT_TEXTAREA_MAX_HEIGHT ? "auto" : "hidden";
    }, [editableContent]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading || isStreaming) return;
        if (!canChat) return;
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
        const messagePart = getEditableValue().trim();
        const combined = [formBlock, messagePart].filter(Boolean).join("\n\n");
        if (combined) {
            userScrolledUpRef.current = false;
            sendMessage(combined);
            if (editableRef.current) {
                editableRef.current.innerHTML = "";
                editableRef.current.focus();
            }
            setEditableContent("");
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Backspace") {
            const el = editableRef.current;
            const sel = window.getSelection();
            const textBefore = getEditableTextBeforeCursor();
            const isCursorInTextWithContentBefore = sel?.anchorNode?.nodeType === Node.TEXT_NODE && (sel.anchorOffset ?? 0) > 0;
            for (const { cmd } of SLASH_COMMANDS) {
                if (textBefore.endsWith(cmd) || textBefore.endsWith(` ${cmd}`)) {
                    if (isCursorInTextWithContentBefore) continue;
                    e.preventDefault();
                    const toRemove = textBefore.endsWith(` ${cmd}`) ? ` ${cmd}` : cmd;
                    const range = sel?.getRangeAt(0);
                    if (range && el) {
                        const start = textBefore.length - toRemove.length;
                        let count = 0;
                        let startNode: Node | null = null;
                        let startOffset = 0;
                        const walk = (node: Node): boolean => {
                            if (node.nodeType === Node.TEXT_NODE) {
                                const len = (node.textContent || "").length;
                                if (count + len >= start) {
                                    startNode = node;
                                    startOffset = start - count;
                                    return true;
                                }
                                count += len;
                            } else if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).dataset?.cmd) {
                                const len = (node as HTMLElement).dataset.cmd!.length;
                                if (count + len >= start) {
                                    startNode = node;
                                    startOffset = start === count ? 0 : 1;
                                    return true;
                                }
                                count += len;
                            } else {
                                for (let i = 0; i < node.childNodes.length; i++) {
                                    if (walk(node.childNodes[i])) return true;
                                }
                            }
                            return false;
                        };
                        walk(el);
                        if (startNode && sel) {
                            range.setStart(startNode, startOffset);
                            range.setEnd(sel.anchorNode!, sel.anchorOffset);
                            range.deleteContents();
                        }
                        setEditableContent(getEditableValue());
                    }
                    setIsSlashDropdownOpen(false);
                    el?.focus();
                    return;
                }
            }
            if (sel && sel.rangeCount > 0 && !isCursorInTextWithContentBefore) {
                const range = sel.getRangeAt(0);
                if (range.collapsed) {
                    let prev: Node | null = sel.anchorNode;
                    if (prev?.nodeType === Node.TEXT_NODE && sel.anchorOffset === 0) {
                        prev = prev.previousSibling;
                    } else if (prev?.nodeType === Node.ELEMENT_NODE) {
                        prev = prev.childNodes[sel.anchorOffset - 1] ?? prev.previousSibling;
                    } else {
                        prev = prev?.previousSibling ?? null;
                    }
                    while (prev && prev.nodeType === Node.TEXT_NODE && (prev as Text).length === 0) {
                        prev = prev.previousSibling;
                    }
                    if (prev && (prev as HTMLElement).dataset?.cmd) {
                        e.preventDefault();
                        (prev as HTMLElement).remove();
                        setEditableContent(getEditableValue());
                        el?.focus();
                        return;
                    }
                }
            }
            if (isSlashDropdownOpen) {
                const v = editableContent.trimStart();
                if (v === "/" || (v.startsWith("/") && v.length <= 1)) {
                    setIsSlashDropdownOpen(false);
                }
            }
        }
        if (isSlashDropdownOpen && filteredSlashCommands.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSlashSelectedIndex((i) => (i + 1) % filteredSlashCommands.length);
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setSlashSelectedIndex((i) => (i - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
                return;
            }
            if (e.key === "Enter") {
                e.preventDefault();
                const idx = Math.min(slashSelectedIndex, filteredSlashCommands.length - 1);
                const selected = filteredSlashCommands[idx];
                if (selected) {
                    insertChipAtCursor(selected.cmd);
                    setIsSlashDropdownOpen(false);
                }
                return;
            }
            if (e.key === "Escape") {
                e.preventDefault();
                setIsSlashDropdownOpen(false);
                return;
            }
        }
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
        setHasAppliedProfileSelection(false);
        isIntegrationProfileDropdownOpenRef.current = false;
        setAssistantScope({ channelId: null, profileId: null, profileName: null, marketplace: null, selectedProfiles: [], selectedGoogleSheetsIntegrations: [] });
        setIsSessionDropdownOpen(false);
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

    // Show loading only when content has keys_for_form (form UI will be shown) but event hasn't arrived yet
    const lastAiContent = (() => {
        const last = [...messages].reverse().find((m) => m.type === "ai");
        return last?.type === "ai" ? (last.content ?? "") : "";
    })();
    const derivedFromContent = lastAiContent
        ? deriveCampaignStateFromContent(lastAiContent)
        : null;
    const contentHasFormKeys =
        derivedFromContent?.keys_for_form && derivedFromContent.keys_for_form.length > 0;
    const campaignFormExpected =
        derivedFromContent &&
        !derivedFromContent.complete &&
        contentHasFormKeys &&
        SHOW_CAMPAIGN_SCHEMA_FORM;
    const campaignFormLoading =
        !!campaignFormExpected &&
        !hasQuestionsSchema &&
        !isStreaming;

    useEffect(() => {
        if (!hasQuestionsSchema || isStreaming) return;
        requestAnimationFrame(() => {
            campaignFormAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }, [hasQuestionsSchema, isStreaming]);

    const groupedSessions = groupSessionsByDate(sessions);
    const hasMessages = messages.length > 0;

    const selectedProfiles = assistantScope.selectedProfiles ?? [];
    const selectedProfileOption = selectedProfiles.length === 1
        ? (() => {
            const p = selectedProfiles[0];
            return accountProfiles.find(
                (ap) => String(ap.channel_id) === p.channelId && ap.id === p.profileId
            ) ?? allAccountsWithProfiles.flatMap((a) => a.profiles).find(
                (ap) => String(ap.account_id) === p.accountId && String(ap.channel_id) === p.channelId && ap.id === p.profileId
            );
        })()
        : accountProfiles.find(
            (p) => String(p.channel_id) === assistantScope.channelId && p.id === assistantScope.profileId
        );

    const selectedGoogleSheetsIntegrations = assistantScope.selectedGoogleSheetsIntegrations ?? [];

    const getSheetDisplayName = (s: { accountId: string; integrationId: number }) => {
        const accId = parseInt(s.accountId, 10);
        const integrations = !Number.isNaN(accId) ? (getAccountGoogleSheetsIntegrationsCached(accId) ?? []) : [];
        const full = integrations.find((g) => g.id === s.integrationId);
        return full?.name || full?.spreadsheet_name || "Sheet";
    };

    const isProfileSelected = (accId: number, channelId: number, profileId: number) =>
        selectedProfiles.some(
            (sp) => String(sp.accountId) === String(accId) && String(sp.channelId) === String(channelId) && sp.profileId === profileId
        );

    const isSheetSelected = (accId: number, integrationId: number) =>
        selectedGoogleSheetsIntegrations.some(
            (s) => String(s.accountId) === String(accId) && s.integrationId === integrationId
        );

    const toggleSheet = (accId: number, integrationId: number) => {
        const next = isSheetSelected(accId, integrationId)
            ? selectedGoogleSheetsIntegrations.filter(
                (s) => !(String(s.accountId) === String(accId) && s.integrationId === integrationId)
            )
            : [...selectedGoogleSheetsIntegrations, { accountId: String(accId), integrationId }];
        setAssistantScope({ selectedGoogleSheetsIntegrations: next });
    };

    const toggleProfile = (p: AccountProfileOption, accId: number) => {
        const entry = {
            accountId: String(accId),
            channelId: String(p.channel_id),
            profileId: p.id,
            profileName: profileDisplayName(p) ?? undefined,
            marketplace: (p.channel_type ?? null) ?? undefined,
        };
        const next = isProfileSelected(accId, p.channel_id, p.id)
            ? selectedProfiles.filter((sp) => !(String(sp.accountId) === String(accId) && String(sp.channelId) === String(p.channel_id) && sp.profileId === p.id))
            : [...selectedProfiles, entry];
        setAssistantScope({
            selectedProfiles: next,
            accountId: next.length > 0 ? next[0].accountId : null,
            channelId: next.length > 0 ? next[0].channelId : null,
            profileId: next.length > 0 ? next[0].profileId : null,
            profileName: next.length > 0 ? (next[0].profileName ?? null) : null,
            marketplace: next.length > 0 ? (next[0].marketplace ?? null) : null,
        });
    };

    /** Toggle all profiles in an account: select all if any unselected, deselect all if all selected */
    const toggleAccountProfiles = (accountItems: Array<{ profile: AccountProfileOption; accountId: number; accountName: string }>) => {
        if (accountItems.length === 0) return;
        const accId = accountItems[0].accountId;
        const allSelected = accountItems.every(({ profile: p }) => isProfileSelected(accId, p.channel_id, p.id));
        let next: typeof selectedProfiles;
        if (allSelected) {
            next = selectedProfiles.filter(
                (sp) => !(String(sp.accountId) === String(accId) && accountItems.some((i) => String(i.profile.channel_id) === sp.channelId && i.profile.id === sp.profileId))
            );
        } else {
            const toAdd = accountItems
                .filter(({ profile: p }) => !isProfileSelected(accId, p.channel_id, p.id))
                .map(({ profile: p }) => ({
                    accountId: String(accId),
                    channelId: String(p.channel_id),
                    profileId: p.id,
                    profileName: profileDisplayName(p) ?? undefined,
                    marketplace: (p.channel_type ?? null) ?? undefined,
                }));
            next = [...selectedProfiles.filter((sp) => String(sp.accountId) !== String(accId)), ...toAdd];
        }
        setAssistantScope({
            selectedProfiles: next,
            accountId: next.length > 0 ? next[0].accountId : null,
            channelId: next.length > 0 ? next[0].channelId : null,
            profileId: next.length > 0 ? next[0].profileId : null,
            profileName: next.length > 0 ? (next[0].profileName ?? null) : null,
            marketplace: next.length > 0 ? (next[0].marketplace ?? null) : null,
        });
    };

    const handleClearSelection = () => {
        setHasAppliedProfileSelection(false);
        setAssistantScope({
            selectedProfiles: [],
            selectedGoogleSheetsIntegrations: [],
            accountId: null,
            channelId: null,
            profileId: null,
            profileName: null,
            marketplace: null,
        });
    };

    const handleApplySelection = () => {
        if (selectedProfiles.length > 0 || selectedGoogleSheetsIntegrations.length > 0) setHasAppliedProfileSelection(true);
        isIntegrationProfileDropdownOpenRef.current = false;
        setIsIntegrationProfileDropdownOpen(false);
        setProfileSearchQuery("");
    };

    /** Account-grouped list for multi-account layout (select account → see profiles under it) */
    const accountsWithFilteredProfiles = React.useMemo(() => {
        const q = profileSearchQuery.trim().toLowerCase();
        return allAccountsWithProfiles
            .map(({ accountId, accountName, profiles, google_sheets_integrations = [] }) => {
                const sheets = (google_sheets_integrations as Array<{ name?: string; spreadsheet_name?: string }>) ?? [];
                const integrationSearchText = sheets
                    .map((g) => (g.name ?? g.spreadsheet_name ?? "").toLowerCase())
                    .filter(Boolean)
                    .join(" ");
                const accountAndSheetsLabel = `${accountName} ${integrationSearchText}`.toLowerCase();
                const accountOrSheetMatchesSearch = !!q && accountAndSheetsLabel.includes(q);
                const items = profiles
                    .filter((p) => {
                        if (q) {
                            const label = `${profileDisplayName(p)} ${profileIdForDisplay(p)} ${accountName} ${integrationSearchText}`.toLowerCase();
                            if (label.includes(q)) return true;
                            if (accountOrSheetMatchesSearch) return true;
                            return false;
                        }
                        const platform = (p.channel_type ?? "").toLowerCase() || "other";
                        if (platform === "amazon") return false; // Hide Amazon for now
                        return true;
                    })
                    .map((profile) => ({ profile, accountId, accountName }));
                return { accountId, accountName, items, google_sheets_integrations: sheets, accountOrSheetMatchesSearch };
            })
            .filter((a) => a.items.length > 0 || a.accountOrSheetMatchesSearch);
    }, [allAccountsWithProfiles, profileSearchQuery]);

    /** When multiple accounts: group by account (select account → select all its profiles). Otherwise: by platform. */
    const showAccountGroupedLayout = allAccountsWithProfiles.length > 1;

    const profilesByPlatform = React.useMemo(() => {
        const flat = accountsWithFilteredProfiles.flatMap((a) => a.items);
        const byPlatform: Record<string, typeof flat> = {};
        for (const item of flat) {
            const platform = (item.profile.channel_type ?? "").toLowerCase() || "other";
            if (!byPlatform[platform]) byPlatform[platform] = [];
            byPlatform[platform].push(item);
        }
        return PLATFORM_ORDER.filter((k) => byPlatform[k]?.length).map((platform) => ({
            platform,
            items: byPlatform[platform],
        }));
    }, [accountsWithFilteredProfiles]);

    const totalProfileCount = accountsWithFilteredProfiles.reduce((sum, { items }) => sum + items.length, 0);
    const hasMultipleAccounts = allAccountsWithProfiles.length > 1;

    const canChat = !!(
        (assistantScope.accountId &&
            assistantScope.channelId &&
            assistantScope.profileId) ||
        (assistantScope.selectedProfiles && assistantScope.selectedProfiles.length >= 1) ||
        (assistantScope.selectedGoogleSheetsIntegrations && assistantScope.selectedGoogleSheetsIntegrations.length >= 1)
    );

    /** Profile dropdown trigger + panel (reused in footer chips row) */
    const profileDropdownContent = (
        <div className="relative" ref={integrationProfileDropdownRef}>
                        <button
                        type="button"
                        onClick={(e) => {
                            if (accounts.length > 0) {
                                const target = e.target as Element;
                                const panel = integrationProfileDropdownRef.current?.querySelector('.assistant-setup-dropdown-panel');
                                const targetInPanel = panel ? panel.contains(target) : false;
                                // Use ref to avoid stale closure: when dropdown is open, never toggle from button click
                                const isOpen = isIntegrationProfileDropdownOpenRef.current;
                                if (isOpen) {
                                    return;
                                }
                                if (panel && targetInPanel) return;
                                const next = !isIntegrationProfileDropdownOpenRef.current;
                                isIntegrationProfileDropdownOpenRef.current = next;
                                setIsIntegrationProfileDropdownOpen(next);
                            }
                        }}
                        disabled={accounts.length === 0}
                        className={`assistant-setup-dropdown-trigger ${isIntegrationProfileDropdownOpen ? "pointer-events-none" : ""}`}
                        style={isIntegrationProfileDropdownOpen ? { pointerEvents: 'none' } : undefined}
                        aria-haspopup="listbox"
                        aria-expanded={isIntegrationProfileDropdownOpen}
                        aria-label="Select account(s) and profile(s)"
                    >
                        <span className="assistant-setup-dropdown-trigger-inner">
                            {selectedProfiles.length > 1 ? (
                                <>
                                    <span className="truncate">
                                        {selectedProfiles.length} profiles selected
                                        {selectedGoogleSheetsIntegrations.length > 0 && (
                                            <span className="text-[#556179] font-normal"> · {selectedGoogleSheetsIntegrations.map((s) => getSheetDisplayName(s)).join(", ")}</span>
                                        )}
                                    </span>
                                </>
                            ) : selectedProfileOption ? (
                                <>
                                    {(() => {
                                        const ct = (selectedProfileOption.channel_type ?? assistantScope.marketplace ?? "").toLowerCase();
                                        return (
                                            <>
                                                {ct === "amazon" && <img src={AmazonIcon} alt="Amazon" className="w-4 h-4 shrink-0" />}
                                                {ct === "google" && <img src={GoogleIcon} alt="Google" className="w-4 h-4 shrink-0" />}
                                                {ct === "meta" && <img src={MetaIcon} alt="Meta" className="w-4 h-4 shrink-0" />}
                                                {ct === "tiktok" && (
                                                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                                    </svg>
                                                )}
                                            </>
                                        );
                                    })()}
                                    <span className="truncate">
                                        {profileDisplayName(selectedProfileOption)} ({profileIdForDisplay(selectedProfileOption)})
                                        {selectedGoogleSheetsIntegrations.length > 0 && (
                                            <span className="text-[#556179] font-normal"> · {selectedGoogleSheetsIntegrations.map((s) => getSheetDisplayName(s)).join(", ")}</span>
                                        )}
                                    </span>
                                </>
                            ) : (
                                <span className="truncate text-[#556179]">
                                    {accounts.length === 0
                                        ? "No accounts"
                                        : selectedGoogleSheetsIntegrations.length > 0
                                            ? selectedGoogleSheetsIntegrations.map((s) => getSheetDisplayName(s)).join(", ")
                                            : "Select ad accounts..."}
                                </span>
                            )}
                        </span>
                        <ChevronDown className="assistant-setup-dropdown-chevron" />
                    </button>
                    {isIntegrationProfileDropdownOpen && (
                        <div
                            className="assistant-setup-dropdown-panel assistant-setup-dropdown-panel-overlay-trigger min-w-[280px]"
                            onMouseDown={(e) => {
                                e.stopPropagation();
                            }}
                        >
                            {contextLoadingAllProfiles ? (
                                <div className="assistant-setup-dropdown-loading">Loading accounts & profiles...</div>
                            ) : allAccountsWithProfiles.length === 0 ? (
                                <div className="assistant-setup-dropdown-empty">No accounts or profiles.</div>
                            ) : (
                                <>
                                    <div className="p-2 border-b border-[#e8e8e3]">
                                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#F5F5F2] border border-[#e8e8e3] focus-within:ring-2 focus-within:ring-[#136d6d] focus-within:border-transparent">
                                            <Search className="w-4 h-4 text-[#556179] shrink-0" aria-hidden />
                                            <input
                                                type="text"
                                                value={profileSearchQuery}
                                                onChange={(e) => setProfileSearchQuery(e.target.value)}
                                                placeholder="Search ad accounts..."
                                                className="flex-1 bg-transparent text-sm text-[#072929] placeholder:text-[#556179] focus:outline-none"
                                                onClick={(e) => e.stopPropagation()}
                                                aria-label="Search ad accounts"
                                            />
                                        </div>
                                        {hasMultipleAccounts && (
                                            <p className="text-xs text-[#556179] mt-1.5 px-1">
                                                Select one or more profiles from any account, then click Apply.
                                            </p>
                                        )}
                                        {!hasMultipleAccounts && totalProfileCount > 1 && (
                                            <p className="text-xs text-[#556179] mt-1.5 px-1">
                                                Select one or more profiles, then click Apply.
                                            </p>
                                        )}
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto">
                                        {accountsWithFilteredProfiles.length === 0 ? (
                                            <div className="assistant-setup-dropdown-empty py-6">
                                                No profiles match your search
                                            </div>
                                        ) : showAccountGroupedLayout ? (
                                            /* Group by account, then sub-group by platform within each account */
                                            accountsWithFilteredProfiles.map(({ accountId: accId, accountName: accName, items: accItems, google_sheets_integrations: accSheets }) => {
                                                const allChecked = accItems.every(({ profile: p }) => isProfileSelected(accId, p.channel_id, p.id));
                                                const sheetsCount = (accSheets as Array<{ name?: string }>)?.length ?? 0;
                                                const byPlatform: Record<string, typeof accItems> = {};
                                                for (const item of accItems) {
                                                    const plat = (item.profile.channel_type ?? "").toLowerCase() || "other";
                                                    if (!byPlatform[plat]) byPlatform[plat] = [];
                                                    byPlatform[plat].push(item);
                                                }
                                                const platformGroups = PLATFORM_ORDER.filter((k) => byPlatform[k]?.length).map((plat) => ({
                                                    platform: plat,
                                                    items: byPlatform[plat],
                                                }));
                                                const hasMixedPlatforms = platformGroups.length > 1;
                                                return (
                                                    <div key={accId} className="border-b border-[#e8e8e3] last:border-b-0">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); toggleAccountProfiles(accItems); }}
                                                            className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm font-medium text-[#136D6D] hover:bg-[#E6F2F2] bg-[#F5F5F2]"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={allChecked}
                                                                readOnly
                                                                className="rounded border-[#136d6d] text-[#136D6D] focus:ring-[#136d6d] accent-[#136D6D] pointer-events-none"
                                                            />
                                                            <span className="truncate">{accName}</span>
                                                            <span className="text-xs text-[#556179]">({accItems.length}{sheetsCount > 0 ? `, ${sheetsCount} sheet${sheetsCount !== 1 ? "s" : ""}` : ""})</span>
                                                        </button>
                                                        {hasMixedPlatforms ? (
                                                            platformGroups.map(({ platform: plat, items: platItems }) => {
                                                                const platLabel = plat.charAt(0).toUpperCase() + plat.slice(1);
                                                                return (
                                                                    <div key={plat}>
                                                                        <div className="flex items-center gap-1.5 px-3 pl-6 py-1.5 text-xs font-semibold text-[#556179] bg-[#FAFAF7] border-t border-[#e8e8e3]/60">
                                                                            {plat === "google" && <img src={GoogleIcon} alt="" className="w-3.5 h-3.5 shrink-0" />}
                                                                            {plat === "meta" && <img src={MetaIcon} alt="" className="w-3.5 h-3.5 shrink-0" />}
                                                                            {plat === "tiktok" && (
                                                                                <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                                                                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                                                                </svg>
                                                                            )}
                                                                            <span>{platLabel}</span>
                                                                        </div>
                                                                        {platItems.map(({ profile: p }) => {
                                                                            const label = `${profileDisplayName(p)} (${profileIdForDisplay(p)})`;
                                                                            const checked = isProfileSelected(accId, p.channel_id, p.id);
                                                                            return (
                                                                                <label
                                                                                    key={`${accId}-${p.channel_id}-${p.id}`}
                                                                                    className={`flex items-center gap-2 px-3 py-2 pl-9 cursor-pointer hover:bg-[#F5F5F2] ${checked ? "bg-[#E6F2F2]" : ""}`}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={checked}
                                                                                        onChange={() => toggleProfile(p, accId)}
                                                                                        className="rounded border-[#136d6d] text-[#136D6D] focus:ring-[#136d6d] accent-[#136D6D]"
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                    />
                                                                                    <span className="truncate text-sm text-[#072929]" title={label}>{label}</span>
                                                                                </label>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            accItems.map(({ profile: p }) => {
                                                                const label = `${profileDisplayName(p)} (${profileIdForDisplay(p)})`;
                                                                const checked = isProfileSelected(accId, p.channel_id, p.id);
                                                                return (
                                                                    <label
                                                                        key={`${accId}-${p.channel_id}-${p.id}`}
                                                                        className={`flex items-center gap-2 px-3 py-2 pl-6 cursor-pointer hover:bg-[#F5F5F2] ${checked ? "bg-[#E6F2F2]" : ""}`}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={checked}
                                                                            onChange={() => toggleProfile(p, accId)}
                                                                            className="rounded border-[#136d6d] text-[#136D6D] focus:ring-[#136d6d] accent-[#136D6D]"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                        <span className="truncate text-sm text-[#072929]" title={label}>{label}</span>
                                                                    </label>
                                                                );
                                                            })
                                                        )}
                                                        {sheetsCount > 0 && (
                                                            <div className="px-3 py-2 pl-6 border-t border-[#e8e8e3]/60">
                                                                <p className="text-xs font-medium text-[#556179] mb-1">Google Sheets</p>
                                                                {(accSheets as Array<{ id?: number; name?: string; spreadsheet_name?: string }>).map((s, idx) => {
                                                                    const sheetId = s.id ?? idx;
                                                                    const checked = isSheetSelected(accId, sheetId);
                                                                    return (
                                                                        <label
                                                                            key={sheetId}
                                                                            className={`flex items-center gap-2 py-1 cursor-pointer hover:bg-[#F5F5F2] rounded px-1 -mx-1 ${checked ? "bg-[#E6F2F2]" : ""}`}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={checked}
                                                                                onChange={() => toggleSheet(accId, sheetId)}
                                                                                className="rounded border-[#136d6d] text-[#136D6D] focus:ring-[#136d6d] accent-[#136D6D]"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            />
                                                                            <span className="text-xs text-[#072929] truncate" title={s.name ?? s.spreadsheet_name ?? ""}>
                                                                                {s.name ?? s.spreadsheet_name ?? "Sheet"}
                                                                            </span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            /* Single account: group by platform */
                                            profilesByPlatform.map(({ platform, items }) => {
                                                const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
                                                const PlatformIcon =
                                                    platform === "google" ? () => <img src={GoogleIcon} alt="" className="w-4 h-4 shrink-0" /> :
                                                    platform === "meta" ? () => <img src={MetaIcon} alt="" className="w-4 h-4 shrink-0" /> :
                                                    platform === "tiktok" ? () => (
                                                        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                                        </svg>
                                                    ) : () => null;
                                                return (
                                                    <div key={platform} className="border-b border-[#e8e8e3] last:border-b-0">
                                                        <div className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[#072929] bg-[#F9F9F6] sticky top-0 z-10">
                                                            <PlatformIcon />
                                                            <span>{platformLabel}</span>
                                                        </div>
                                                        {items.map(({ profile: p, accountId: accId }) => {
                                                            const label = `${profileDisplayName(p)} (${profileIdForDisplay(p)})`;
                                                            const checked = isProfileSelected(accId, p.channel_id, p.id);
                                                            return (
                                                                <label
                                                                    key={`${accId}-${p.channel_id}-${p.id}`}
                                                                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#F5F5F2] ${checked ? "bg-[#E6F2F2]" : ""}`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        onChange={() => toggleProfile(p, accId)}
                                                                        className="rounded border-[#136d6d] text-[#136D6D] focus:ring-[#136d6d] accent-[#136D6D]"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                    <span className="truncate text-sm text-[#072929]" title={label}>{label}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })
                                        )}
                                        {!showAccountGroupedLayout && allAccountsWithProfiles.length === 1 && (() => {
                                            const first = allAccountsWithProfiles[0] as { accountId: number; google_sheets_integrations?: Array<{ id?: number; name?: string; spreadsheet_name?: string }> };
                                            const sheets = first?.google_sheets_integrations ?? [];
                                            const accId = first?.accountId;
                                            if (sheets.length === 0 || accId == null) return null;
                                            return (
                                                <div className="border-t border-[#e8e8e3] p-3">
                                                    <p className="text-xs font-medium text-[#556179] mb-2">Google Sheets</p>
                                                    {sheets.map((s, idx) => {
                                                        const sheetId = s.id ?? idx;
                                                        const checked = isSheetSelected(accId, sheetId);
                                                        return (
                                                            <label
                                                                key={sheetId}
                                                                className={`flex items-center gap-2 py-1 cursor-pointer hover:bg-[#F5F5F2] rounded px-1 -mx-1 ${checked ? "bg-[#E6F2F2]" : ""}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={() => toggleSheet(accId, sheetId)}
                                                                    className="rounded border-[#136d6d] text-[#136D6D] focus:ring-[#136d6d] accent-[#136D6D]"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                <span className="text-xs text-[#072929] truncate block" title={s.name ?? s.spreadsheet_name ?? ""}>
                                                                    {s.name ?? s.spreadsheet_name ?? "Sheet"}
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="flex items-center justify-between px-3 py-2 border-t border-[#e8e8e3] bg-[#F9F9F6]">
                                        <span className="text-xs text-[#556179]">
                                            {selectedProfiles.length}/{totalProfileCount} profiles
                                            {selectedGoogleSheetsIntegrations.length > 0 && ` · ${selectedGoogleSheetsIntegrations.length} sheet${selectedGoogleSheetsIntegrations.length !== 1 ? "s" : ""}`}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleClearSelection(); }}
                                                className="text-xs text-[#556179] hover:text-[#072929] font-medium px-2 py-1"
                                            >
                                                Clear
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleApplySelection(); }}
                                                disabled={selectedProfiles.length === 0 && selectedGoogleSheetsIntegrations.length === 0}
                                                className="text-xs font-medium px-3 py-1 rounded bg-[#136D6D] text-white hover:bg-[#0f5656] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#136D6D]"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
    );

    return (
        <div
            className={`flex flex-col h-full bg-[var(--color-semantic-background-primary)] shadow-lg ${className}`}
        >
            {/* Top row: chat tabs (left) + New Chat & Close (right) — hidden when variant=page (history in sidebar) */}
            {variant === "panel" ? (
            <div className="assistant-top-row">
                <div className="assistant-top-row-inner">
                    <div className="assistant-tabs-scroll interactive-scrollbar">
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
                                            disabled={isLoading && currentSessionId === session.id}
                                        >
                                            {isLoading && currentSessionId === session.id && (
                                                <div className="flex gap-0.5">
                                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
                                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                                </div>
                                            )}
                                            <span className="max-w-[140px] truncate">{session.title || "Untitled"}</span>
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
                    <div className="assistant-top-row-actions">
                        {variant === "panel" && (
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
                                                disabled={isLoading && currentSessionId === session.id}
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
                        )}
                        {effectiveSessionId && hasMessages && (
                        <button
                            type="button"
                            onClick={handleShareSession}
                            className="assistant-header-icon-btn"
                            title="Share conversation"
                            aria-label="Share conversation"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>
                        )}
                        {/* Hidden: Test SSE button (kept for future testing)
                        {runTestSse && (
                        <button
                            type="button"
                            onClick={runTestSse}
                            className="assistant-header-icon-btn text-yellow-y10"
                            title="Test SSE replay (dev only)"
                            aria-label="Test SSE replay"
                        >
                            <FlaskConical className="w-4 h-4" />
                        </button>
                        )}
                        */}
                        <button
                            type="button"
                            onClick={handleNewSession}
                            className="assistant-header-icon-btn"
                            title="New conversation"
                            aria-label="New chat"
                        >
                            <Plus className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                        {variant === "panel" && (
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
                        )}
                    </div>
                </div>
            </div>
            ) : null}
            {/* Page variant: toolbar above messages */}
            {variant === "page" && (
                <div className="px-4 py-2 border-b border-[#E8E8E3] flex items-center gap-2">
                    {/* Todo progress + background-running banner in same toolbar row */}
                    {(() => {
                        const isRunningInBg = !!(currentSessionId && runningSessionIds.has(currentSessionId));
                        if (isStreaming && todoList && todoList.length > 0) {
                            const done = todoList.filter((t) => t.status === "TODO_STATUS_COMPLETE" || t.status === "TODO_STATUS_COMPLETED").length;
                            const allDone = done === todoList.length;
                            const active = todoList.find((t) => t.status === "TODO_STATUS_IN_PROGRESS");
                            if (!allDone) {
                                return (
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="todo-header-progress flex-1 min-w-0">
                                            <Loader2 className="w-3 h-3 animate-spin text-forest-f40 shrink-0" />
                                            <span className="todo-header-progress-count">{done}/{todoList.length}</span>
                                            {active && <span className="todo-header-progress-label">{active.content}</span>}
                                        </div>
                                        {/* Inline "safe to navigate away" hint during active streaming */}
                                        <span className="hidden sm:flex items-center gap-1.5 shrink-0 text-[11px] text-forest-f30 border border-forest-f40/20 rounded-full px-2.5 py-0.5 bg-forest-f40/5 whitespace-nowrap">
                                            <span className="relative flex h-1.5 w-1.5 shrink-0">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-f40 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-forest-f40" />
                                            </span>
                                            Safe to navigate away — will keep running
                                        </span>
                                    </div>
                                );
                            }
                        }
                        if (isRunningInBg && !isStreaming) {
                            return (
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="relative flex shrink-0 h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-f40 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-forest-f40" />
                                    </span>
                                    <p className="text-xs text-forest-f50 flex-1">
                                        Stellar is still working — you can navigate away and come back anytime.
                                    </p>
                                </div>
                            );
                        }
                        return <div className="flex-1" />;
                    })()}
                    {/* Hidden: Test SSE button (kept for future testing)
                    {runTestSse && (
                    <button
                        type="button"
                        onClick={runTestSse}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium border border-yellow-y10/40 bg-yellow-y10/10 text-yellow-y10 hover:bg-yellow-y10/20 transition-colors"
                        aria-label="Test SSE replay"
                        title="Test SSE replay (dev only)"
                    >
                        <FlaskConical className="w-3.5 h-3.5" />
                        Test SSE
                    </button>
                    )}
                    */}
                    {effectiveSessionId && hasMessages && (
                    <>
                    <button
                        type="button"
                        onClick={() => effectiveSessionId && selectSession(effectiveSessionId)}
                        disabled={isLoading || isStreaming}
                        className="flex items-center justify-center w-7 h-7 rounded text-forest-f30 hover:text-forest-f40 hover:bg-sandstorm-s40/60 transition-colors disabled:opacity-40"
                        aria-label="Refresh conversation"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                    <button
                        type="button"
                        onClick={handleShareSession}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium border border-sandstorm-s40 bg-white text-forest-f30 hover:text-forest-f40 hover:border-forest-f40/40 transition-colors"
                        aria-label="Share conversation"
                    >
                        <Share2 className="w-3.5 h-3.5" />
                        Share conversation
                    </button>
                    </>
                    )}
                </div>
            )}

            {/* Messages Area - min-h-0 allows flex child to shrink so overflow only when content exceeds available space */}
            <div className="flex-1 min-h-0 relative">
            <div
                ref={messagesScrollContainerRef}
                className="h-full overflow-y-auto overflow-x-hidden interactive-scrollbar px-4 py-4"
                onWheel={(e) => {
                    if (e.deltaY < 0 && isStreaming && !userScrolledUpRef.current) {
                        userScrolledUpRef.current = true;
                        setShowScrollToBottom(true);
                    }
                }}
                onScroll={() => {
                    if (Date.now() < programmaticScrollUntilRef.current) return;
                    const el = messagesScrollContainerRef.current;
                    if (!el) return;
                    const { scrollTop, scrollHeight, clientHeight } = el;
                    const distFromBottom = scrollHeight - scrollTop - clientHeight;
                    const isUp = distFromBottom > nearBottomThreshold;
                    const wasUp = userScrolledUpRef.current;
                    if (isUp && !wasUp) {
                        userScrolledUpRef.current = true;
                        setShowScrollToBottom(isStreaming);
                    }
                }}
            >
                {loadingHistorySessionId === currentSessionId && currentSessionId && !hasMessages ? (
                    /* Loading history for selected session — uses dedicated flag independent of isLoading */
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
                    /* Empty State: logo, hint text, and prompts (setup card is above in its own section) */
                    <div className="flex flex-col items-center justify-center h-full gap-6">
                        <div className="mb-0">
                            <img src={StellarLogo} alt="Assistant" className="h-16 w-16" />
                        </div>
                        <h3 className="text-lg font-medium text-forest-f60">
                            Assistant
                        </h3>

                        {!canChat ? (
                            <p className="text-sm text-forest-f30 text-center px-4">
                                {accounts.length === 0
                                    ? "No accounts available."
                                    : "Select account(s) & profile(s) below to start."}
                            </p>
                        ) : !hasAppliedProfileSelection ? (
                            <p className="text-sm text-forest-f30 text-center px-4">
                                Select one or more profiles below, then click Apply.
                            </p>
                        ) : variant === "page" ? (
                            /* Page variant: category filters + insight cards */
                            <div className="w-full max-w-4xl px-4">
                                <div className="flex flex-wrap gap-2 mb-6 justify-center">
                                    {INSIGHT_CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setInsightCategory(cat.id)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                insightCategory === cat.id
                                                    ? "bg-forest-f40 text-white"
                                                    : "bg-sandstorm-s40 text-forest-f60 hover:bg-sandstorm-s40/80"
                                            }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {(insightCategory === "all"
                                        ? INSIGHT_CARDS
                                        : INSIGHT_CARDS.filter((c) => c.category === insightCategory)
                                    ).map((card) => {
                                        const Icon = INSIGHT_ICON_MAP[card.iconName] ?? BarChart3;
                                        return (
                                            <button
                                                key={card.id}
                                                type="button"
                                                onClick={() => handlePromptClick(card.prompt)}
                                                className="flex flex-col items-start p-4 rounded-xl border border-sandstorm-s40 bg-sandstorm-s5 hover:border-forest-f40/40 hover:bg-forest-f40/5 transition-colors text-left"
                                            >
                                                <Icon className="w-5 h-5 text-forest-f40 mb-2" />
                                                <span className="text-xs font-medium text-forest-f30 uppercase tracking-wide mb-1">
                                                    {INSIGHT_CATEGORIES.find((c) => c.id === card.category)?.label ?? card.category}
                                                </span>
                                                <h4 className="text-sm font-medium text-forest-f60 mb-1">
                                                    {card.title}
                                                </h4>
                                                <p className="text-xs text-forest-f30 line-clamp-2 mb-3">
                                                    {card.description}
                                                </p>
                                                <span className="text-xs font-medium text-forest-f40 flex items-center gap-1">
                                                    Get Started
                                                    <ArrowUp className="w-3 h-3 rotate-90" strokeWidth={2.5} />
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="w-full max-w-sm">
                                <p className="text-sm text-forest-f30 mb-3">Would you like to:</p>
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
                    <div className="flex flex-col max-w-[1280px] mx-auto w-full">
                        {messages.map((message, mi) => {
                            if (message.type === "human") {
                                return (
                                    <React.Fragment key={message.id}>
                                        {mi > 0 && <div className="chat-turn-divider" />}
                                        <div className={`chat-message-row ${mi === 0 ? "pt-2" : ""}`}>
                                            <div className="chat-avatar chat-user-avatar">{userInitials}</div>
                                            <div className="chat-message-content">
                                                <div className="chat-message-header">
                                                    <span className="chat-message-header-label">You</span>
                                                    <div className="chat-message-actions">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyResponse(message.id, message.content)}
                                                            className="chat-action-btn"
                                                            title={copiedMessageId === message.id ? "Copied!" : "Copy prompt"}
                                                            aria-label="Copy prompt"
                                                        >
                                                            {copiedMessageId === message.id ? <Check className="w-3.5 h-3.5 text-forest-f40" /> : <Clipboard className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="chat-user-card">
                                                    <h2 className="text-lg font-bold text-forest-f60 leading-snug font-agrandir">
                                                        <MessageContent content={message.content} />
                                                    </h2>
                                                </div>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            }
                            if (message.type === "ai") {
                                const { content, timeline, isStreaming: aiStreaming, error } = message;
                                const lastText = [...timeline].reverse().find((i): i is Extract<PixisTimelineItem, { type: "text" }> => i.type === "text" && !!i.content);
                                const todoItem = timeline.find((t): t is Extract<PixisTimelineItem, { type: "todo_update" }> => t.type === "todo_update");
                                const timelineWithoutTodo = timeline.filter((t) => t.type !== "todo_update");
                                const responseText = lastText?.content || content || "";
                                const isCopied = copiedMessageId === message.id;
                                return (
                                    <div key={message.id} className="chat-message-row mt-6">
                                        <div className="chat-avatar chat-ai-avatar">
                                            <img src={StellarLogo} alt="Stellar" />
                                        </div>
                                        <div className="chat-message-content">
                                            <div className="chat-message-header">
                                                <span className="chat-message-header-label">Stellar</span>
                                                {!aiStreaming && !isStreaming && (
                                                    <div className="chat-message-actions">
                                                        {responseText && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopyResponse(message.id, responseText)}
                                                                className="chat-action-btn"
                                                                title={isCopied ? "Copied!" : "Copy response"}
                                                                aria-label="Copy response"
                                                            >
                                                                {isCopied ? <Check className="w-3.5 h-3.5 text-forest-f40" /> : <Clipboard className="w-3.5 h-3.5" />}
                                                            </button>
                                                        )}
                                                        {effectiveSessionId && assistantScope.accountId && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleShareThread(message.id)}
                                                                className="chat-action-btn"
                                                                title="Share this response"
                                                                aria-label="Share this response"
                                                            >
                                                                <Share2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {error && <div className="text-sm text-red-r30 mt-1">{error}</div>}
                                            {todoItem && todoItem.todos.length > 0 && (
                                                <div className="mt-2">
                                                    <TodoPanel todos={todoItem.todos} defaultExpanded />
                                                </div>
                                            )}
                                            <div className="flex flex-col gap-3 w-full mt-2" style={{ fontFamily: "'GT America Trial', sans-serif" }}>
                                                {(() => {
                                                    type Segment =
                                                        | { type: "activity"; items: PixisTimelineItem[] }
                                                        | { type: "subagent"; item: Extract<PixisTimelineItem, { type: "subagent" }> }
                                                        | { type: "text"; content: string; idx: number };
                                                    const isToolActivity = (i: PixisTimelineItem) => {
                                                        if (i.type === "thinking") return !!i.content?.trim();
                                                        return i.type === "tool_call";
                                                    };
                                                    const segments: Segment[] = [];
                                                    let i = 0;
                                                    while (i < timelineWithoutTodo.length) {
                                                        const item = timelineWithoutTodo[i];
                                                        if (item.type === "subagent") {
                                                            segments.push({ type: "subagent", item: item as Extract<PixisTimelineItem, { type: "subagent" }> });
                                                            i++;
                                                            continue;
                                                        }
                                                        if (isToolActivity(item)) {
                                                            const run: PixisTimelineItem[] = [];
                                                            while (i < timelineWithoutTodo.length && isToolActivity(timelineWithoutTodo[i])) {
                                                                run.push(timelineWithoutTodo[i]);
                                                                i++;
                                                            }
                                                            segments.push({ type: "activity", items: run });
                                                            continue;
                                                        }
                                                        if (item.type === "text" && item.content) {
                                                            segments.push({ type: "text", content: item.content, idx: i });
                                                            i++;
                                                            continue;
                                                        }
                                                        i++;
                                                    }
                                                    if (timeline.length === 0 && aiStreaming) {
                                                        segments.unshift({ type: "activity", items: [] });
                                                    }
                                                    const lastActivityIdx = segments.reduce((acc, s, i) => s.type === "activity" ? i : acc, -1);
                                                    return segments.map((seg, si) => {
                                                        if (seg.type === "activity") {
                                                            const showBlock = seg.items.length > 0 || (timeline.length === 0 && aiStreaming);
                                                            if (!showBlock) return null;
                                                            return (
                                                                <AssistantActivityBlock
                                                                    key={`act-${si}`}
                                                                    items={seg.items}
                                                                    defaultThoughtsExpanded
                                                                    workingOnRequest={si === lastActivityIdx && workingOnRequest}
                                                                    placeholder={
                                                                        seg.items.length === 0 && timeline.length === 0 && aiStreaming ? (
                                                                            <div className="flex items-center gap-2 text-forest-f30">
                                                                                <span className="w-1.5 h-1.5 bg-forest-f40 rounded-full animate-pulse" />
                                                                                <span className="text-[11px] font-medium">Thinking...</span>
                                                                            </div>
                                                                        ) : undefined
                                                                    }
                                                                />
                                                            );
                                                        }
                                                        if (seg.type === "subagent") {
                                                            return (
                                                                <SubagentPanel
                                                                    key={seg.item.call_id ?? `sa-${si}`}
                                                                    callId={seg.item.call_id}
                                                                    description={seg.item.description}
                                                                    subagentType={seg.item.subagentType}
                                                                    status={seg.item.status}
                                                                    steps={seg.item.steps}
                                                                    durationMs={seg.item.durationMs}
                                                                    startedAtMs={seg.item.timestamp_ms}
                                                                />
                                                            );
                                                        }
                                                        return (
                                                            <div key={`txt-${seg.idx}`} className="assistant-message-content w-full text-[14px] leading-relaxed">
                                                                <ContentWithCharts content={seg.content} type="ai" />
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                                {timeline.length === 0 && content && (
                                                    <div className="assistant-message-content w-full text-[14px] leading-relaxed">
                                                        <ContentWithCharts content={content} type="ai" />
                                                    </div>
                                                )}
                                                {aiStreaming && timeline.length > 0 && !lastText?.content && (
                                                    <div className="flex items-center gap-2 text-forest-f30">
                                                        <span className="w-1.5 h-1.5 bg-forest-f40 rounded-full animate-pulse" />
                                                        <span className="text-[11px] font-medium">Thinking...</span>
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
                            <div className="chat-message-row mt-6">
                                <div className="chat-avatar chat-ai-avatar">
                                    <img src={StellarLogo} alt="Stellar" />
                                </div>
                                <div className="chat-message-content">
                                    <div className="chat-message-header">
                                        <span className="chat-message-header-label">Stellar</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-forest-f30 mt-2">
                                        <span className="w-1.5 h-1.5 bg-forest-f40 rounded-full animate-pulse" />
                                        <span className="text-[11px] font-medium">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Campaign: validation errors or draft ready (only when saved_draft_id exists) */}
                        {campaignState && ((campaignState.validation_error && campaignState.validation_error.length > 0) || (campaignState.complete)) && (
                            <div className="flex flex-col gap-2 mt-2 p-3 bg-[#F9F9F6] border border-[#E8E8E3] rounded-[10px]">
                                {campaignState.validation_error && campaignState.validation_error.length > 0 && (
                                    <div className="text-xs text-red-600">
                                          {campaignState.validation_error}
                                    </div>
                                )}
                                {campaignState.draft && Object.keys(campaignState.draft).length > 0 && campaignState.draft_id && campaignState.complete && (
                                    <span className="text-xs text-[#072929]">
                                        Draft ready.
                                        {assistantScope.accountId && assistantScope.channelId ? (
                                            <>{" "}
                                                <Link
                                                    to={`/brands/${assistantScope.accountId}/${assistantScope.channelId}/google/campaigns/draft-${campaignState.draft_id}`}
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

                        {/* Campaign: loading + form area */}
                        <div ref={campaignFormAreaRef}>
                        {campaignFormLoading && (
                            <div className="mt-2 p-3 bg-[#F9F9F6] border border-[#E8E8E3] rounded-[10px] flex items-center gap-2 text-[#556179]">
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" />
                                    <div className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                                    <div className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                </div>
                                <span className="text-xs font-medium">Loading form...</span>
                            </div>
                        )}

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
                                plateform={assistantScope.marketplace ?? undefined}
                            />
                        )}
                        </div>

                        <div ref={messagesEndRef} className="h-12 shrink-0" />
                    </div>
                )}
            </div>
            {showScrollToBottom && (
                <button
                    type="button"
                    className="scroll-to-bottom-btn"
                    onClick={() => {
                        userScrolledUpRef.current = false;
                        setShowScrollToBottom(false);
                        programmaticScrollUntilRef.current = Date.now() + 600;
                        messagesScrollContainerRef.current?.scrollTo({
                            top: messagesScrollContainerRef.current.scrollHeight,
                            behavior: "smooth",
                        });
                    }}
                    aria-label="Scroll to bottom"
                >
                    <ChevronDown className="w-4 h-4" />
                    <span>Follow</span>
                </button>
            )}
            </div>

            {/* Input Area - profile chips at bottom of input, dropdown opens upward */}
            <div className="px-4 py-3 border-t border-gray-100 relative" ref={slashDropdownRef}>
                <form onSubmit={handleSubmit} className="relative">
                    <div className="assistant-input-container rounded-[12px] p-3 flex flex-col gap-3">
                        {/* Top: contenteditable */}
                        <div className="relative min-h-[24px] w-full">
                            {!editableContent && (
                                <span
                                    className="absolute left-0 top-0 text-[14px] text-[#9ca3af] pointer-events-none"
                                    style={{ fontFamily: "'GT America Trial', sans-serif" }}
                                >
                                    {isStreaming
                                        ? "Generating response..."
                                        : !canChat
                                            ? "Select account(s) & profile(s) below to enable chat"
                                            : "Ask me anything... Type / for commands (Shift+Enter for new line)"}
                                </span>
                            )}
                            <div
                                ref={editableRef}
                                contentEditable={!isLoading && !isStreaming && !!canChat}
                                suppressContentEditableWarning
                                onInput={() => syncEditableContentToState()}
                                onKeyDown={handleKeyDown}
                                onPaste={(e) => {
                                    e.preventDefault();
                                    const text = e.clipboardData.getData("text/plain");
                                    document.execCommand("insertText", false, text);
                                    syncEditableContentToState(true);
                                }}
                                className="min-w-[80px] min-h-[24px] max-h-[200px] overflow-y-auto bg-transparent text-[14px] font-normal text-[#072929] focus:outline-none py-0"
                                style={{ fontFamily: "'GT America Trial', sans-serif", minHeight: ASSISTANT_TEXTAREA_MIN_HEIGHT, maxHeight: ASSISTANT_TEXTAREA_MAX_HEIGHT }}
                            />
                        </div>
                        {/* Bottom of text area: chips (left) + send (right); dropdown opens upward */}
                        <div className="flex items-center justify-between gap-2 min-w-0">
                            <div className="assistant-footer-chips assistant-dropdown-open-up min-h-[28px] flex items-center gap-2 flex-wrap flex-1 min-w-0">
                                {profileDropdownContent}
                            </div>
                            {campaignState && (
                                <CampaignDraftPreview
                                    campaignState={campaignState}
                                    visible
                                    accountId={assistantScope.accountId ?? undefined}
                                    channelId={assistantScope.channelId ?? undefined}
                                    className="shrink-0"
                                />
                            )}
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
                                    disabled={!editableContent.trim() || isLoading || !canChat}
                                    className="flex items-center justify-center w-9 h-9 rounded-full bg-[#374151] hover:bg-[#1f2937] text-white transition-colors shrink-0 disabled:opacity-40 disabled:pointer-events-none"
                                    title="Send"
                                >
                                    <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Slash command dropdown */}
                    {isSlashDropdownOpen && canChat && !isStreaming && (
                        <div className="absolute bottom-full left-4 right-4 mb-1 py-1 bg-white border border-[#E8E8E3] rounded-lg shadow-lg z-50 max-h-[140px] overflow-y-auto">
                            {filteredSlashCommands.map(({ cmd, label }, idx) => (
                                <button
                                    key={cmd}
                                    type="button"
                                    onClick={() => {
                                        insertChipAtCursor(cmd);
                                        setIsSlashDropdownOpen(false);
                                        editableRef.current?.focus();
                                    }}
                                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                                        idx === Math.min(slashSelectedIndex, filteredSlashCommands.length - 1)
                                            ? "bg-[#E6F2F2] text-[#072929]"
                                            : "text-[#072929] hover:bg-[#F9F9F6]"
                                    }`}
                                >
                                    <span className="font-mono text-[#136D6D]">{cmd}</span>
                                    <span className="text-[#556179]">{label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </form>
            </div>

            {/* Share modal */}
            {shareModalOpen && createPortal(
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={handleCloseShareModal}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl border border-[#E8E8E3] w-full max-w-md mx-4 p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-base font-semibold text-forest-f60">Share conversation</h2>
                                {effectiveSessionId && (
                                    <div className="mt-1 flex flex-col gap-0.5">
                                        <p className="text-[11px] text-forest-f30 font-mono select-all break-all">
                                            Session: {effectiveSessionId}
                                        </p>
                                        {shareThreadId && (
                                            <p className="text-[11px] text-forest-f30 font-mono select-all break-all">
                                                Thread: {shareThreadId}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseShareModal}
                                className="text-forest-f30 hover:text-forest-f60 ml-4 shrink-0"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {shareError ? (
                            <p className="text-sm text-red-r30 py-4">{shareError}</p>
                        ) : !shareLink ? (
                            <div className="flex items-center gap-3 py-4">
                                <div className="w-4 h-4 border-2 border-forest-f40 border-t-transparent rounded-full animate-spin shrink-0" />
                                <span className="text-sm text-forest-f30">Creating share link…</span>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-forest-f30 mb-3">
                                    Anyone with this link can view {shareThreadId ? "this response" : "the full conversation"} without logging in.
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={shareLink}
                                        className="flex-1 min-w-0 px-3 py-2 text-xs bg-sandstorm-s0 border border-sandstorm-s40 rounded-lg text-forest-f60 font-mono select-all"
                                        onClick={(e) => (e.target as HTMLInputElement).select()}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCopyShareLink}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-forest-f40 hover:bg-forest-f50 text-white transition-colors shrink-0"
                                        aria-label="Copy link"
                                    >
                                        {shareCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        {shareCopied ? "Copied!" : "Copy"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>,
                document.body
            )}

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
