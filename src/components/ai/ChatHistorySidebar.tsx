import React, { useState, useMemo } from "react";
import { useAssistant } from "../../contexts/AssistantContext";
import { useChatHistorySidebar } from "../../contexts/ChatHistorySidebarContext";
import { groupSessionsByDate } from "../../utils/assistantSessionUtils";
import { Plus, Search, BarChart3 } from "lucide-react";
import { cn } from "../../lib/cn";

const CHAT_HISTORY_SIDEBAR_WIDTH = 260;
const CHAT_HISTORY_SIDEBAR_COLLAPSED = 0;

export const ChatHistorySidebar: React.FC = () => {
  const { isExpanded, setExpanded } = useChatHistorySidebar();
  const {
    sessions,
    currentSessionId,
    selectSession,
    startNewSession,
    isLoadingSessions,
    setAssistantScope,
  } = useAssistant();

  const [searchQuery, setSearchQuery] = useState("");

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
        <div className="relative">
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
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto interactive-scrollbar py-2">
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
              {groupSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => handleSessionSelect(session.id)}
                  disabled={isLoadingSessions}
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
                </button>
              ))}
            </div>
          ))
        )}
      </div>
        </>
      )}
    </aside>
  );
};
