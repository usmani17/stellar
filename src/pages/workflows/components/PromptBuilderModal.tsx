import React, { useState } from "react";
import { BaseModal } from "../../../components/ui";
import { X, Sparkles, FileText } from "lucide-react";
import { Loader } from "../../../components/ui";
import { cn } from "../../../lib/cn";

const PROMPT_TEMPLATES: { id: string; label: string; prompt: string }[] = [
  {
    id: "weekly-performance",
    label: "Weekly performance report",
    prompt:
      "Generate a weekly performance report covering impressions, clicks, CTR, CPC, conversions, and spend. Include top-performing campaigns and ad groups, trend analysis, and actionable recommendations.",
  },
  {
    id: "monthly-summary",
    label: "Monthly summary & insights",
    prompt:
      "Create a comprehensive monthly summary with key metrics, YoY comparisons, budget pacing analysis, and strategic recommendations for the next month.",
  },
  {
    id: "campaign-optimization",
    label: "Campaign optimization insights",
    prompt:
      "Analyze campaign performance and provide optimization recommendations. Focus on underperforming areas, bid adjustments, audience insights, and creative performance.",
  },
  {
    id: "keywords-analysis",
    label: "Top keywords & search terms",
    prompt:
      "Summarize top-performing keywords and search terms. Include quality score trends, negative keyword opportunities, and recommendation for scaling or pausing.",
  },
  {
    id: "conversion-attribution",
    label: "Conversion & attribution report",
    prompt:
      "Report on conversion metrics, attribution across campaigns, and ROI analysis. Include funnel insights and recommendations for conversion optimization.",
  },
  {
    id: "custom",
    label: "Start from scratch",
    prompt: "",
  },
];

interface PromptBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt: string;
  onApply: (prompt: string) => void;
}

export const PromptBuilderModal: React.FC<PromptBuilderModalProps> = ({
  isOpen,
  onClose,
  initialPrompt,
  onApply,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [useCase, setUseCase] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setPrompt(initialPrompt);
      setUseCase("");
      setSelectedTemplateId("");
    }
  }, [isOpen, initialPrompt]);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const t = PROMPT_TEMPLATES.find((x) => x.id === templateId);
    setPrompt(t?.prompt ?? "");
  };

  const handleGenerateFromUseCase = async () => {
    if (!useCase.trim()) return;
    setIsGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      setPrompt(
        `Generate a report based on the following use case: "${useCase.trim()}". ` +
          "Include relevant metrics, trends, insights, and actionable recommendations tailored to this request."
      );
      setSelectedTemplateId("");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    onApply(prompt.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      maxWidth="max-w-lg"
      padding="p-0"
      containerClassName=""
      zIndex="z-[210]"
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-sandstorm-s40">
          <h2 className="text-base font-agrandir font-medium text-forest-f60">
            Build prompt
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-sandstorm-s10 text-forest-f30 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Templates */}
          <div>
            <label className="block text-[13px] font-medium text-forest-f60 mb-2">
              Select a template
            </label>
            <div className="flex flex-wrap gap-2">
              {PROMPT_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTemplate(t.id)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-left text-[12px] font-medium transition-colors border",
                    selectedTemplateId === t.id
                      ? "bg-forest-f40 text-white border-forest-f40 hover:bg-forest-f50"
                      : "bg-white text-forest-f60 border-sandstorm-s40 hover:bg-sandstorm-s20 hover:border-forest-f40"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Use case + Generate */}
          <div>
            <label className="block text-[13px] font-medium text-forest-f60 mb-1">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-forest-f40" />
                Describe your use case to get a tailored prompt
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                placeholder="e.g. I want weekly insights on my best campaigns"
                className="campaign-input flex-1"
              />
              <button
                type="button"
                onClick={handleGenerateFromUseCase}
                disabled={!useCase.trim() || isGenerating}
                className="create-entity-button px-4 py-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader size="sm" showMessage={false} />
                    <span className="text-[10.64px] text-white font-normal">
                      Generating...
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
                    <span className="text-[10.64px] text-white font-normal">
                      Generate
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Prompt preview/edit */}
          <div>
            <label className="block text-[13px] font-medium text-forest-f60 mb-1">
              <span className="inline-flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-forest-f40" />
                Prompt
              </span>
            </label>
            <textarea
              className="campaign-input w-full min-h-[100px] resize-y text-[13px]"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (selectedTemplateId) setSelectedTemplateId("");
              }}
              placeholder="Select a template, generate from your use case, or type your own..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-sandstorm-s40">
          <button onClick={onClose} className="edit-button">
            <span className="text-[10.64px] text-[#072929] font-normal">
              Cancel
            </span>
          </button>
          <button onClick={handleApply} className="create-entity-button">
            <span className="text-[10.64px] text-white font-normal">
              Apply
            </span>
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
