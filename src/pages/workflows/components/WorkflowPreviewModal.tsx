import React from "react";
import { BaseModal } from "../../../components/ui";
import { FileText, MessageSquare, X } from "lucide-react";

interface WorkflowPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** User's prompt - shown in dummy messages */
  prompt: string;
  format: "pdf" | "docx";
  integrationName?: string;
  profileName?: string;
}

const DUMMY_MESSAGES = [
  {
    role: "user" as const,
    content: "Generate a weekly performance report for my Google Ads account.",
    time: "9:00 AM",
  },
  {
    role: "assistant" as const,
    content:
      "I've started generating your report. Fetching performance data from your connected account...",
    time: "9:00 AM",
  },
  {
    role: "assistant" as const,
    content:
      "Data fetched successfully. Analyzing metrics and building the report structure.",
    time: "9:01 AM",
  },
  {
    role: "assistant" as const,
    content:
      "Report generated successfully. Your PDF report is ready. You can download it below.",
    time: "9:02 AM",
  },
];

export const WorkflowPreviewModal: React.FC<WorkflowPreviewModalProps> = ({
  isOpen,
  onClose,
  prompt,
  format,
  integrationName = "All Channels",
  profileName = "All Profiles",
}) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      maxWidth="max-w-2xl"
      maxHeight="max-h-[85vh]"
      zIndex="z-[210]"
      padding="p-0"
      containerClassName=""
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sandstorm-s40">
          <h2 className="text-lg font-agrandir font-medium text-forest-f60">
            Workflow Preview
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-sandstorm-s10 text-forest-f30 transition-colors"
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <p className="text-sm text-forest-f30">
            This is a preview of what your workflow run will look like. In a
            real run, the assistant will process your prompt and generate the
            report.
          </p>

          {/* Assistant Messages */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-forest-f40" />
              <h3 className="text-sm font-medium text-forest-f60">
                Assistant Messages
              </h3>
            </div>
            <div className="space-y-3">
              {/* First message uses actual prompt */}
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-lg bg-forest-f40 px-4 py-2.5 text-sm text-white">
                  <p className="whitespace-pre-wrap">
                    {prompt || "Generate a weekly performance report..."}
                  </p>
                  <span className="text-xs opacity-80 mt-1 block">
                    You · {DUMMY_MESSAGES[0].time}
                  </span>
                </div>
              </div>
              {DUMMY_MESSAGES.slice(1).map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-forest-f40 text-white"
                        : "bg-sandstorm-s5 border border-sandstorm-s40 text-forest-f60"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <span
                      className={`text-xs mt-1 block ${
                        msg.role === "user" ? "opacity-80" : "text-forest-f30"
                      }`}
                    >
                      Assistant · {msg.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report Preview */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-forest-f40" />
              <h3 className="text-sm font-medium text-forest-f60">
                Generated Report
              </h3>
            </div>
            <div className="rounded-lg border border-sandstorm-s40 bg-sandstorm-s5 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-14 rounded bg-red-100 flex items-center justify-center shrink-0">
                  <span className="text-red-600 font-bold text-xs">
                    {format.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-forest-f60">
                    {integrationName} — {profileName} Report
                  </p>
                  <p className="text-xs text-forest-f30 mt-1">
                    Generated based on your prompt. In a real run, this would be
                    a downloadable {format.toUpperCase()} file.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded bg-forest-f40 text-white text-xs font-medium">
                      Preview (dummy)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
