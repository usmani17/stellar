
import type { CampaignDraftData } from "../../services/ai/pixisChat";
import type { ThreadMessage } from "./threads";

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

function toRole(typeOrRole: string | undefined): "human" | "ai" | null {
  if (!typeOrRole) return null;
  const t = String(typeOrRole).toLowerCase();
  if (t === "user" || t === "humanmessage" || t === "human") return "human";
  if (t === "assistant" || t === "aimessage" || t === "aimessagechunk" || t === "ai") return "ai";
  return null;
}

/**
 * Normalize campaign_setup state to ThreadMessage[] for use in the shared Assistant UI.
 */
export function campaignStateToThreadMessages(state: CampaignDraftData): ThreadMessage[] {
  const raw = state.draft.messages;
  const replyText = state.draft.reply_text as string | undefined;
  const out: ThreadMessage[] = [];

  if (raw && Array.isArray(raw)) {
    for (let i = 0; i < raw.length; i++) {
      const m = raw[i];
      if (!m || typeof m !== "object") continue;
      const obj = m as Record<string, unknown>;
      const typeFromId = Array.isArray(obj.id) ? (obj.id[obj.id.length - 1] as string) : undefined;
      const role = toRole((obj.role as string) ?? (obj.type as string) ?? typeFromId);
      if (!role) continue;
      const content =
        extractMessageContent(obj.content) ||
        extractMessageContent((obj.kwargs as Record<string, unknown>)?.content) ||
        extractMessageContent((obj.data as Record<string, unknown>)?.content);
      out.push({ id: `msg-${i}-${Date.now()}`, type: role, content });
    }
  }

  const trimmedReply = replyText?.trim();
  if (trimmedReply) {
    const last = out[out.length - 1];
    const lastIsSameReply = last?.type === "ai" && last.content === trimmedReply;
    if (!lastIsSameReply) {
      if (last?.type === "ai" && !last.content) {
        out[out.length - 1] = { ...last, content: trimmedReply };
      } else {
        out.push({ id: `msg-reply-${Date.now()}`, type: "ai", content: trimmedReply });
      }
    }
  }

  return out;
}
