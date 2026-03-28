import React from "react";
import { Check, Loader2 } from "lucide-react";

interface ToolCallRowProps {
  label: string;
  status: "running" | "completed";
}

export const ToolCallRow: React.FC<ToolCallRowProps> = ({ label, status }) => (
  <div className="tool-call-row">
    {status === "running" ? (
      <Loader2 className="w-3 h-3 animate-spin text-forest-f40 shrink-0" />
    ) : (
      <Check className="w-3 h-3 text-forest-f40 shrink-0" />
    )}
    <span className="truncate">{label}</span>
  </div>
);
