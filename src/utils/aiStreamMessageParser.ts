/**
 * Parsing utilities for LangGraph stream messages.
 * Handles conversion from SDK format to ThreadMessage, tool block extraction,
 * and merging accumulated tool content (to fix SDK dropping tool_calls when stream ends).
 */

import type { ContentBlock, ThreadMessage } from "../services/ai/threads";

/** SDK tool call format from stream.getToolCalls() */
export type StreamToolCall = { call: { id?: string; name: string; args?: Record<string, unknown> } };

/** Raw stream message from LangGraph SDK */
type RawStreamMessage = { type?: string; content?: unknown; id?: string; additional_kwargs?: Record<string, unknown> };

/**
 * Parse a single raw stream message into ThreadMessage format.
 * Uses getToolCalls to extract tool_use blocks (SDK may drop them when merging).
 */
export function parseStreamMessage(
  m: RawStreamMessage,
  idx: number,
  getToolCalls: ((msg: unknown) => StreamToolCall[]) | undefined
): ThreadMessage {
  const type = (m.type === "human" ? "human" : "ai") as "human" | "ai";
  const rawContent = m.content ?? "";
  let content: ThreadMessage["content"] = rawContent as ThreadMessage["content"];

  if (type === "ai" && getToolCalls) {
    const toolCalls = getToolCalls(m);
    if (toolCalls?.length > 0) {
      const toolBlocks: ContentBlock[] = toolCalls.map((tc) => ({
        type: "tool_use" as const,
        id: tc.call.id ?? `tool-${tc.call.name}`,
        name: tc.call.name,
        input: (tc.call.args ?? {}) as Record<string, unknown>,
      }));
      const text =
        typeof rawContent === "string"
          ? rawContent
          : Array.isArray(rawContent)
            ? (rawContent as { type?: string; text?: string }[])
                .filter((p) => p?.type === "text")
                .map((p) => p?.text ?? "")
                .join("")
            : "";
      content = (text ? [...toolBlocks, { type: "text" as const, text }] : toolBlocks) as ThreadMessage["content"];
    }
  }

  return {
    id: m.id ?? `msg-${idx}`,
    type,
    content,
    additional_kwargs: m.additional_kwargs,
  } as ThreadMessage;
}

/**
 * Parse raw stream messages into ThreadMessage[].
 */
export function parseStreamMessages(
  rawMessages: RawStreamMessage[],
  getToolCalls: ((msg: unknown) => StreamToolCall[]) | undefined
): ThreadMessage[] {
  if (!rawMessages?.length) return [];
  return rawMessages.map((m, idx) => parseStreamMessage(m, idx, getToolCalls));
}

/** Extract tool_use blocks from message content */
export function extractToolBlocksFromContent(content: unknown): ContentBlock[] {
  if (!Array.isArray(content)) return [];
  return content.filter(
    (b): b is ContentBlock =>
      typeof b === "object" && b != null && (b as { type?: string }).type === "tool_use"
  );
}

/** Accumulated tool content: by message id and by AI index */
export interface AccumulatedToolContent {
  byId: Map<string, ThreadMessage["content"]>;
  byAiIndex: ThreadMessage["content"][];
}

/** Extract text block from content (for merging with tool blocks). Handles string, array, or single object. */
function extractTextBlock(content: unknown): ContentBlock | null {
  if (content == null) return null;
  if (typeof content === "string") return content ? { type: "text", text: content } : null;
  if (Array.isArray(content)) {
    const textBlock = content.find(
      (b: unknown) =>
        typeof b === "object" && b != null && (b as { type?: string }).type === "text"
    );
    if (textBlock && typeof (textBlock as { text?: string }).text === "string") {
      return textBlock as ContentBlock;
    }
    // Fallback: join any text-like content
    const parts = content
      .filter((b): b is { text?: string } => typeof b === "object" && b != null && "text" in b)
      .map((b) => b.text ?? "")
      .filter(Boolean);
    return parts.length ? { type: "text", text: parts.join("\n") } : null;
  }
  // Single object e.g. { type: "text", text: "..." }
  if (typeof content === "object" && (content as { type?: string }).type === "text") {
    const text = (content as { text?: string }).text;
    return typeof text === "string" ? { type: "text", text } : null;
  }
  return null;
}

/**
 * Merge accumulated tool content into messages.
 * Uses tool blocks from accumulated + text from current message so we keep BOTH (accumulated may lack final text).
 */
export function mergeAccumulatedToolBlocks(
  messages: ThreadMessage[],
  accumulated: AccumulatedToolContent
): ThreadMessage[] {
  const { byId, byAiIndex } = accumulated;
  if (byId.size === 0 && byAiIndex.length === 0) return messages;

  let aiIdx = 0;
  const merged = messages.map((msg) => {
    if ((msg as { type?: string }).type !== "ai") return msg;
    const accumById = msg.id ? byId.get(msg.id) : undefined;
    const accumByIdx = byAiIndex[aiIdx];
    const accumContent = accumById ?? accumByIdx;
    aiIdx += 1;
    const toolBlocks = Array.isArray(accumContent)
      ? extractToolBlocksFromContent(accumContent)
      : [];
    const useAccum = toolBlocks.length > 0;
    if (!useAccum) return { ...msg };
    // Merge: tool blocks from accumulated + text (prefer current msg, fallback to accumulated)
    const textFromMsg = extractTextBlock(msg.content);
    const textFromAccum = extractTextBlock(accumContent);
    let textBlock = textFromMsg ?? textFromAccum;
    // Fallback: if msg.content is a non-empty string, use it (format may not have been parsed)
    if (!textBlock && typeof msg.content === "string" && msg.content.trim()) {
      textBlock = { type: "text", text: msg.content };
    }
    const newContent: ContentBlock[] = [...toolBlocks];
    if (textBlock && (textBlock as { text?: string }).text) newContent.push(textBlock);
    return { ...msg, content: newContent.length ? newContent : msg.content };
  });

  // Extra accumulated blocks when indices don't align (SDK collapsed messages)
  if (aiIdx < byAiIndex.length) {
    const extraBlocks = byAiIndex.slice(aiIdx).flatMap((c) => extractToolBlocksFromContent(c));
    if (extraBlocks.length > 0) {
      let lastAiIdx = -1;
      for (let i = merged.length - 1; i >= 0; i--) {
        if ((merged[i] as { type?: string }).type === "ai") {
          lastAiIdx = i;
          break;
        }
      }
      if (lastAiIdx >= 0) {
        const last = merged[lastAiIdx] as ThreadMessage;
        const curContent = last.content;
        const curBlocks = Array.isArray(curContent) ? curContent : [];
        const existingToolBlocks = extractToolBlocksFromContent(curContent);
        const textBlock = curBlocks.find(
          (b: unknown) =>
            typeof b === "object" && b != null && (b as { type?: string }).type === "text"
        );
        const newContent = [...existingToolBlocks, ...extraBlocks];
        if (textBlock) newContent.push(textBlock as ContentBlock);
        merged[lastAiIdx] = {
          ...last,
          content: newContent.length ? newContent : curContent,
        };
      }
    }
  }

  return merged;
}

/**
 * Apply thinking steps to the last AI message.
 */
export function applyThinkingStepsToLastAi(
  messages: ThreadMessage[],
  thinkingSteps: string[]
): ThreadMessage[] {
  if (thinkingSteps.length === 0) return messages;
  let lastAiIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if ((messages[i] as { type?: string }).type === "ai") {
      lastAiIdx = i;
      break;
    }
  }
  if (lastAiIdx < 0) return messages;
  const lastMsg = messages[lastAiIdx] as ThreadMessage;
  return [
    ...messages.slice(0, lastAiIdx),
    {
      ...lastMsg,
      additional_kwargs: {
        ...(lastMsg.additional_kwargs ?? {}),
        thinkingSteps,
      },
    },
    ...messages.slice(lastAiIdx + 1),
  ];
}

/**
 * Whether to skip updating messages in onFinish (we have locally accumulated tool blocks).
 */
export function shouldSkipOnFinishMessages(accumulated: AccumulatedToolContent): boolean {
  return accumulated.byId.size > 0 || accumulated.byAiIndex.length > 0;
}
