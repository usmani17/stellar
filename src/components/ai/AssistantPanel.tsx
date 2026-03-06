import React, { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useAssistant, type SessionWithMessages } from "../../contexts/AssistantContext";
import type { PixisTimelineItem } from "../../services/ai/pixisChat";
import { Square, X, ChevronDown, BarChart3, ArrowUp, Plus, Users, ClipboardList, Sparkles } from "lucide-react";
import StellarLogo from "../../assets/images/steller-logo-mini.svg";
import { ASSISTANT_ICONS } from "../../assets/icons/assistant-icons";
import { MessageContent } from "../ai/MessageContent";
import { ContentWithCharts } from "../ai/ContentWithCharts";
import { CampaignDraftPreview } from "../ai/CampaignDraftPreview";
import { AssistantActivityBlock } from "../ai/AssistantActivityBlock";
import { accountsService, type Account } from "../../services/accounts";
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
  { cmd: "/dashboard", label: "Create custom dashboard" },
] as const;

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
    const editableRef = useRef<HTMLDivElement>(null);
    const historyDropdownRef = useRef<HTMLDivElement>(null);
    const schemaFormRef = useRef<CampaignFormForChatHandle | null>(null);
    const campaignFormAreaRef = useRef<HTMLDivElement>(null);
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
    const [isSlashDropdownOpen, setIsSlashDropdownOpen] = useState(false);
    const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
    const [editableContent, setEditableContent] = useState(""); // for slash trigger; actual DOM is source of truth
    const [insightCategory, setInsightCategory] = useState<InsightCategory>("all");
    const editableSyncRafRef = useRef<number | null>(null);
    const accountDropdownRef = useRef<HTMLDivElement>(null);
    const integrationProfileDropdownRef = useRef<HTMLDivElement>(null);
    const slashDropdownRef = useRef<HTMLDivElement>(null);

    // Sync inputValue from context to editableContent and DOM
    useEffect(() => {
        if (inputValue && editableRef.current) {
            setEditableContent(inputValue);
            // Update the actual DOM element
            editableRef.current.textContent = inputValue;
        }
    }, [inputValue, isOpen]);

    // Load accounts when panel is open or when on chat page (variant=page)
    useEffect(() => {
        if (!isOpen && variant !== "page") return;
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
    }, [isOpen, variant]);

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
                                            disabled={isLoading}
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
                        )}
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
                    /* Empty State: show 3-step setup until user selects Analyze or Create Campaign; then hide setup and show prompts or insight cards */
                    <div className="flex flex-col items-center justify-center h-full gap-6">
                        {/* Assistant logo and title at top, above setup */}
                        <div className="mb-0">
                            <img src={StellarLogo} alt="Assistant" className="h-16 w-16" />
                        </div>
                        <h3 className="text-lg font-medium text-forest-f60">
                            Assistant
                        </h3>

                        {/* Set up your session - hidden once user has full scope */}
                        {!canChat && contextSection}

                        {!canChat ? (
                            <p className="text-sm text-forest-f30 text-center px-4">
                                {!assistantScope.accountId
                                    ? "Select an account above to start."
                                    : !assistantScope.channelId || !assistantScope.profileId
                                        ? "Select an integration–profile above to start."
                                        : "Start typing to begin."}
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
                                const sortedTimeline = [...timeline].sort((a, b) => {
                                  const tsA = "timestamp_ms" in a && typeof a.timestamp_ms === "number" ? a.timestamp_ms : Number.MAX_SAFE_INTEGER;
                                  const tsB = "timestamp_ms" in b && typeof b.timestamp_ms === "number" ? b.timestamp_ms : Number.MAX_SAFE_INTEGER;
                                  return tsA - tsB;
                                });
                                const lastText = [...sortedTimeline].reverse().find((i): i is Extract<PixisTimelineItem, { type: "text" }> => i.type === "text" && !!i.content);
                                return (
                                    <div key={message.id} className="flex justify-start ai">
                                        <div className="min-w-0 flex flex-col items-start p-4 gap-3 w-full max-w-full bg-[#F9F9F6] border border-[#E8E8E3] rounded-[12px] shadow-sm">
                                            {error && <div className="text-sm text-red-600">{error}</div>}
                                            <div className="flex flex-col gap-3 w-full" style={{ fontFamily: "'GT America Trial', sans-serif" }}>
                                                {(() => {
                                                    type Segment = { type: "activity"; items: PixisTimelineItem[] } | { type: "text"; content: string; idx: number };
                                                    const isActivity = (i: PixisTimelineItem) =>
                                                        (i.type === "thinking" && !!i.content?.trim()) || i.type === "tool_call";
                                                    const segments: Segment[] = [];
                                                    let i = 0;
                                                    while (i < sortedTimeline.length) {
                                                        const item = sortedTimeline[i];
                                                        if (isActivity(item)) {
                                                            const run: PixisTimelineItem[] = [];
                                                            while (i < sortedTimeline.length && isActivity(sortedTimeline[i])) {
                                                                run.push(sortedTimeline[i]);
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
                                                    // Only show the last text segment — earlier ones are superseded by streaming
                                                    // (tool_call interleaving causes multiple text blocks with overlapping content)
                                                    const textSegs = segments.filter((s): s is Extract<typeof s, { type: "text" }> => s.type === "text");
                                                    const lastTextIdx = textSegs.length > 1 ? segments.lastIndexOf(textSegs[textSegs.length - 1]) : -1;
                                                    const segmentsToRender = lastTextIdx >= 0 && textSegs.length > 1
                                                        ? segments.filter((s, i) => s.type !== "text" || i === lastTextIdx)
                                                        : segments;
                                                    return segmentsToRender.map((seg, si) => {
                                                        if (seg.type === "activity") {
                                                            const showBlock = seg.items.length > 0 || (timeline.length === 0 && aiStreaming);
                                                            if (!showBlock) return null;
                                                            return (
                                                                <AssistantActivityBlock
                                                                    key={`act-${si}`}
                                                                    items={seg.items}
                                                                    defaultThoughtsExpanded
                                                                    placeholder={
                                                                        seg.items.length === 0 && timeline.length === 0 && aiStreaming ? (
                                                                            <div className="flex items-center gap-2 text-[#556179]">
                                                                                <span className="text-xs font-medium">Thinking</span>
                                                                                <div className="flex gap-1">
                                                                                    <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" />
                                                                                    <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                                                                                    <span className="w-1.5 h-1.5 bg-[#136D6D]/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                                                                </div>
                                                                            </div>
                                                                        ) : undefined
                                                                    }
                                                                />
                                                            );
                                                        }
                                                        return (
                                                            <div key={`txt-${seg.idx}`} className="assistant-message-content w-full">
                                                                <ContentWithCharts content={seg.content} type="ai" />
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                                {timeline.length === 0 && content && (
                                                    <div className="assistant-message-content w-full">
                                                        <ContentWithCharts content={content} type="ai" />
                                                    </div>
                                                )}
                                                {aiStreaming && timeline.length > 0 && !lastText?.content && (
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

                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area - Cursor-style: upper row = description/input, lower row = agent + send; no plus icon */}
            <div className="px-4 py-3 border-t border-gray-100 relative" ref={slashDropdownRef}>
                <form onSubmit={handleSubmit} className="relative">
                    <div className="assistant-input-container rounded-[12px] p-3 flex flex-col gap-3">
                        {/* Upper row: contenteditable with inline chips (tags) */}
                        <div className="relative min-h-[24px] w-full">
                            {!editableContent && (
                                <span
                                    className="absolute left-0 top-0 text-[14px] text-[#9ca3af] pointer-events-none"
                                    style={{ fontFamily: "'GT America Trial', sans-serif" }}
                                >
                                    {isStreaming
                                        ? "Generating response..."
                                        : !canChat
                                            ? "Select account and profile above to enable chat"
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
