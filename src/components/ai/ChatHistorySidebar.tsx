import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useAssistant } from "../../contexts/AssistantContext";
import {
  useChatHistorySidebar,
  type ChatHistorySidebarContextType,
} from "../../contexts/ChatHistorySidebarContext";
import { groupSessionsByDate } from "../../utils/assistantSessionUtils";
import { Plus, Search, BarChart3, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

const CHAT_HISTORY_SIDEBAR_WIDTH = 260;
const CHAT_HISTORY_SIDEBAR_COLLAPSED = 0;

export const ChatHistorySidebar: React.FC = () => {
  const { isExpanded, setExpanded }: ChatHistorySidebarContextType =
    useChatHistorySidebar();
  const {
    sessions,
    currentSessionId,
    selectSession,
    startNewSession,
    isLoadingSessions,
    setAssistantScope,
    loadSessions,
    loadMoreSessions,
    hasMoreSessions,
    isLoadingMoreSessions,
    runningSessionIds,
  } = useAssistant();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Re-attach scroll listener whenever the sidebar expands (div renders) or loadMoreSessions changes.
  // isExpanded in deps ensures we attach after the scrollable div mounts.
  useEffect(() => {
    if (!isExpanded) return;
    // Small delay to let the DOM paint after expand
    const attach = () => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const handleScroll = () => {
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
          loadMoreSessions();
        }
      };
      el.addEventListener("scroll", handleScroll, { passive: true });
      return () => el.removeEventListener("scroll", handleScroll);
    };
    // requestAnimationFrame ensures the div has rendered before we query the ref
    let cleanup: (() => void) | undefined;
    const raf = requestAnimationFrame(() => { cleanup = attach(); });
    return () => {
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, [isExpanded, loadMoreSessions]);

  const [searchQuery, setSearchQuery] = useState("");

  // Fixed-position tooltip state — avoids overflow-hidden clipping
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const tooltipHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = useCallback((text: string, e: React.MouseEvent) => {
    if (tooltipHideTimer.current) clearTimeout(tooltipHideTimer.current);
    setTooltip({ text, x: e.clientX, y: e.clientY });
  }, []);

  const hideTooltip = useCallback(() => {
    tooltipHideTimer.current = setTimeout(() => setTooltip(null), 80);
  }, []);

  const groupedSessions = useMemo(() => {
    const filtered =
      searchQuery.trim() === ""
        ? sessions
        : sessions.filter((s) =>
            (s.title ?? "Untitled")
              .toLowerCase()
              .includes(searchQuery.trim().toLowerCase())
          );
    return groupSessionsByDate(filtered);
  }, [sessions, searchQuery]);

  const handleNewChat = () => {
    startNewSession();
    setAssistantScope({
      channelId: null,
      profileId: null,
      profileName: null,
      marketplace: null,
    });
  };

  const handleSessionSelect = async (sessionId: string) => {
    await selectSession(sessionId);
  };

  const sortedGroups = Object.entries(groupedSessions).sort(
    ([keyA], [keyB]) => {
      const order: Record<string, number> = { Today: 0, Yesterday: 1 };
      const orderA = order[keyA] ?? 2;
      const orderB = order[keyB] ?? 2;
      if (orderA !== orderB) return orderA - orderB;
      if (orderA === 2)
        return new Date(keyB).getTime() - new Date(keyA).getTime();
      return 0;
    }
  );

  return (
    <aside
      className="flex flex-col shrink-0 min-h-0 border-r border-sandstorm-s40 bg-sandstorm-s0 overflow-hidden transition-[width] duration-200 ease-out"
      style={{ width: isExpanded ? CHAT_HISTORY_SIDEBAR_WIDTH : CHAT_HISTORY_SIDEBAR_COLLAPSED }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Expanded: full sidebar (fully collapsed when not expanded) */}
      {isExpanded && (
        <>
      <div className="p-3 border-b border-sandstorm-s40 min-w-[260px]">
        <button
          type="button"
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-forest-f40 hover:bg-forest-f50 text-white text-sm font-medium transition-colors"
          aria-label="New chat"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          New Chat
        </button>
      </div>

      <div className="p-2 border-b border-sandstorm-s40">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-f30"
              aria-hidden
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats"
              className="w-full pl-9 pr-3 py-2 text-sm border border-sandstorm-s40 rounded-lg bg-white text-forest-f60 placeholder:text-forest-f30 focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-transparent"
              aria-label="Search chats"
            />
          </div>
          <button
            type="button"
            onClick={() => loadSessions()}
            disabled={isLoadingSessions}
            className="flex items-center justify-center w-7 h-7 rounded-md text-forest-f30 hover:text-forest-f40 hover:bg-sandstorm-s40/60 transition-colors disabled:opacity-40 shrink-0"
            aria-label="Refresh chat history"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSessions ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto interactive-scrollbar py-2">
        <div className="px-3 py-2">
          <h3 className="text-[11px] font-medium text-forest-f30 uppercase tracking-wide">
            Previous 30 days
          </h3>
        </div>

        {isLoadingSessions ? (
          <div className="px-4 py-6 text-sm text-forest-f30">
            Loading conversations...
          </div>
        ) : sortedGroups.length === 0 ? (
          <div className="px-4 py-6 text-sm text-forest-f30">
            {searchQuery.trim()
              ? "No chats match your search"
              : "No previous conversations"}
          </div>
        ) : (
          sortedGroups.map(([dateGroup, groupSessions]) => (
            <div key={dateGroup} className="mb-4">
              <div className="px-3 py-1 flex items-center justify-between text-[11px] text-forest-f30">
                <span>{dateGroup}</span>
                <span>{groupSessions.length}</span>
              </div>
              {groupSessions.map((session) => {
                const isRunning = runningSessionIds.has(session.id);
                // Full query: first human message when loaded, otherwise title
                const firstHuman = session.messages?.find((m) => m.type === "human");
                const fullQuery = (firstHuman?.type === "human" ? firstHuman.content : null)
                  ?? session.title
                  ?? null;
                return (
                  <div key={session.id}>
                    <button
                      type="button"
                      onClick={() => handleSessionSelect(session.id)}
                      disabled={isLoadingSessions}
                      onMouseEnter={fullQuery ? (e) => showTooltip(fullQuery, e) : undefined}
                      onMouseMove={fullQuery ? (e) => showTooltip(fullQuery, e) : undefined}
                      onMouseLeave={fullQuery ? hideTooltip : undefined}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                        currentSessionId === session.id
                          ? "bg-forest-f40/10 text-forest-f60 font-medium"
                          : "text-forest-f60 hover:bg-sandstorm-s40/50"
                      )}
                    >
                      <BarChart3
                        className={cn(
                          "w-4 h-4 shrink-0",
                          currentSessionId === session.id
                            ? "text-forest-f40"
                            : "text-forest-f30"
                        )}
                      />
                      <span className="truncate flex-1">
                        {session.title || "Untitled"}
                      </span>
                      {isRunning && (
                        <span
                          className="relative flex shrink-0 h-2 w-2"
                          aria-label="Agent running"
                        >
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-f40 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-forest-f40" />
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Infinite scroll: spinner while loading next page */}
        {isLoadingMoreSessions && (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-forest-f30" />
          </div>
        )}

        {/* End of list indicator */}
        {!hasMoreSessions && sessions.length > 0 && !searchQuery.trim() && (
          <div className="px-4 py-3 text-center text-[11px] text-forest-f30">
            All conversations loaded
          </div>
        )}
      </div>
        </>
      )}

      {/* Fixed tooltip rendered outside overflow-hidden sidebar */}
      {tooltip && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ left: tooltip.x + 14, top: tooltip.y - 8 }}
        >
          <div className="w-64 rounded-lg border border-sandstorm-s40 bg-white shadow-xl px-3 py-2.5">
            <p className="text-[11px] font-medium text-forest-f30 uppercase tracking-wide mb-1">
              Query
            </p>
            <p className="text-xs text-forest-f60 leading-relaxed break-words line-clamp-6">
              {tooltip.text}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};
