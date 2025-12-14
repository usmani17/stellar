import React from "react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = "",
}) => {
  const statusMap: Record<string, { bg: string; text: string; label: string }> =
    {
      Enable: {
        bg: "bg-[rgba(30,199,122,0.1)]",
        text: "text-[#1ec77a]",
        label: "Enable",
      },
      Paused: {
        bg: "bg-[rgba(255,182,92,0.1)]",
        text: "text-[#ffb65c]",
        label: "Paused",
      },
      Archived: {
        bg: "bg-[rgba(163,168,179,0.1)]",
        text: "text-[#a3a8b3]",
        label: "Archived",
      },
    };

  const statusInfo = statusMap[status] || statusMap["Enable"];

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.text} ${className}`}
      style={{
        fontSize: "12px",
        fontWeight: 400,
        lineHeight: "100%",
      }}
    >
      {statusInfo.label}
    </span>
  );
};
