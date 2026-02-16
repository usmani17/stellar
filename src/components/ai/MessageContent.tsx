import React from "react";

/**
 * Renders message content with multiline support and JSON (in code blocks or raw) formatted.
 * Shared by AgentChatPage and Assistant panel for campaign_setup and chat output.
 */
export function MessageContent({ content }: { content: string }) {
  if (!content) return null;

  const parts: Array<{ type: "text" | "json"; value: string }> = [];
  const re = /```(?:json)?\s*\n?([\s\S]*?)```/gi;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, m.index) });
    }
    const raw = (m[1] ?? "").trim();
    let value = raw;
    try {
      const parsed = JSON.parse(raw);
      value = JSON.stringify(parsed, null, 2);
    } catch {
      // keep raw if not valid JSON
    }
    parts.push({ type: "json", value });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  if (parts.length === 1 && parts[0].type === "text") {
    const trimmed = parts[0].value.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      let jsonFormatted: string | null = null;
      try {
        const parsed = JSON.parse(trimmed);
        jsonFormatted = JSON.stringify(parsed, null, 2);
      } catch {
        // not valid JSON, fall through
      }
      if (jsonFormatted !== null) {
        return (
          <pre className="my-0 rounded bg-gray-100 p-2 text-xs overflow-x-auto text-left font-mono whitespace-pre-wrap wrap-break-word">
            <code>{jsonFormatted}</code>
          </pre>
        );
      }
    }
  }

  return (
    <span className="block whitespace-pre-wrap wrap-break-word text-left">
      {parts.map((part, i) =>
        part.type === "json" ? (
          <pre
            key={i}
            className="my-2 rounded bg-gray-100 p-2 text-xs overflow-x-auto text-left font-mono"
          >
            <code>{part.value}</code>
          </pre>
        ) : (
          <span key={i}>{part.value}</span>
        )
      )}
    </span>
  );
}
