import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { cn } from "../../../lib/cn";

interface MarkdownPromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  disabled?: boolean;
  error?: boolean;
}

export const MarkdownPromptEditor: React.FC<MarkdownPromptEditorProps> = ({
  value,
  onChange,
  placeholder = "Describe the report you want...",
  className,
  minHeight = "100px",
  disabled = false,
  error = false,
}) => {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");

  return (
    <div className={cn("border border-sandstorm-s40 rounded-lg overflow-hidden", className)}>
      <div className="flex border-b border-sandstorm-s40 bg-sandstorm-s5">
        <button
          type="button"
          onClick={() => setActiveTab("write")}
          className={cn(
            "px-3 py-2 text-[12px] font-medium transition-colors",
            activeTab === "write"
              ? "text-forest-f60 border-b-2 border-forest-f40 bg-white"
              : "text-forest-f30 hover:text-forest-f60"
          )}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={cn(
            "px-3 py-2 text-[12px] font-medium transition-colors",
            activeTab === "preview"
              ? "text-forest-f60 border-b-2 border-forest-f40 bg-white"
              : "text-forest-f30 hover:text-forest-f60"
          )}
        >
          Preview
        </button>
      </div>
      <div className="bg-white">
        {activeTab === "write" ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "campaign-input w-full resize-y text-[13px] border-0 rounded-none focus:ring-2 focus:ring-forest-f40/30",
              error && "border-red-500 focus:ring-red-500"
            )}
            style={{ minHeight }}
            spellCheck
          />
        ) : (
          <div
            className="p-3 text-[13px] text-forest-f60 overflow-y-auto"
            style={{ minHeight }}
          >
            {value ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  p: ({ children }) => (
                    <p className="text-[13px] leading-relaxed mb-2 last:mb-0">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-outside pl-5 mb-2 space-y-1 text-forest-f60">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-outside pl-5 mb-2 space-y-1 text-forest-f60">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-[13px]">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => <em className="italic">{children}</em>,
                  code: ({ children }) => (
                    <code className="px-1.5 py-0.5 rounded bg-sandstorm-s10 text-forest-f60 text-[12px]">
                      {children}
                    </code>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-base font-semibold mt-2 mb-1 first:mt-0">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-sm font-semibold mt-2 mb-1 first:mt-0">
                      {children}
                    </h2>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-sandstorm-s40 pl-3 my-2 text-forest-f30 italic">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <p className="text-forest-f30 italic text-[12px]">
                Nothing to preview. Switch to Write to add content.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
