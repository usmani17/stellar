import { useState, useCallback } from "react";
import type { CampaignSetupState, AgentMessage } from "../types/agent";
import { campaignSetupAgentService } from "../services/ai/campaignSetupAgent";

export interface UseAgentChatResult {
  threadId: string | null;
  state: CampaignSetupState | null;
  messages: AgentMessage[];
  loading: boolean;
  error: string | null;
  thinkingSteps: string[];
  sendMessage: (text: string) => Promise<void>;
  resetConversation: () => void;
}

/** Extract display text from message content (string or LangChain array of parts). */
function extractMessageContent(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return (part as { text: string }).text;
        return "";
      })
      .filter(Boolean)
      .join("");
  }
  return "";
}

/** Normalize role from LangChain type or role field. */
function toRole(typeOrRole: string | undefined): "user" | "assistant" | null {
  if (!typeOrRole) return null;
  const t = String(typeOrRole).toLowerCase();
  if (t === "user" || t === "humanmessage" || t === "human") return "user";
  if (t === "assistant" || t === "aimessage" || t === "aimessagechunk" || t === "ai") return "assistant";
  return null;
}

function normalizeMessages(raw: CampaignSetupState["messages"], replyText?: string): AgentMessage[] {
  if (!raw || !Array.isArray(raw)) {
    if (replyText?.trim()) return [{ role: "assistant", content: replyText.trim() }];
    return [];
  }
  const out: AgentMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const obj = m as Record<string, unknown>;
    const typeFromId = Array.isArray(obj.id) ? (obj.id[obj.id.length - 1] as string) : undefined;
    const role = toRole((obj.role as string) ?? (obj.type as string) ?? typeFromId);
    if (!role) continue;
    const content =
      extractMessageContent(obj.content) ||
      extractMessageContent((obj.kwargs as Record<string, unknown>)?.content) ||
      extractMessageContent((obj.data as Record<string, unknown>)?.content);
    out.push({ role, content });
  }
  // Ensure latest assistant reply is visible when state.messages didn't parse or is missing the new reply
  const trimmedReply = replyText?.trim();
  if (trimmedReply) {
    const last = out[out.length - 1];
    const lastIsSameReply = last?.role === "assistant" && last.content === trimmedReply;
    if (lastIsSameReply) {
      // already have it
    } else if (last?.role === "assistant" && !last.content) {
      out[out.length - 1] = { role: "assistant", content: trimmedReply };
    } else {
      out.push({ role: "assistant", content: trimmedReply });
    }
  }
  return out;
}

export function useAgentChat(): UseAgentChatResult {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [state, setState] = useState<CampaignSetupState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);

  const messages = state
    ? normalizeMessages(state.messages, state.reply_text)
    : [];

  const sendMessage = useCallback(async (text: string) => {
    setError(null);
    setLoading(true);
    setThinkingSteps([]);
    try {
      const tid = await campaignSetupAgentService.sendMessage(text, threadId, {
        onState: setState,
        onMessage: () => {},
        onThinkingStep: setThinkingSteps,
        onError: setError,
      });
      setThreadId(tid);
    } finally {
      setLoading(false);
      setThinkingSteps([]);
    }
  }, [threadId]);

  const resetConversation = useCallback(() => {
    setThreadId(null);
    setState(null);
    setError(null);
    setThinkingSteps([]);
  }, []);

  return {
    threadId,
    state,
    messages,
    loading,
    error,
    thinkingSteps,
    sendMessage,
    resetConversation,
  };
}
