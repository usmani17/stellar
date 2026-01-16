import React from "react";

interface StatusBadgeProps {
  status: string;
  className?: string;
  uppercase?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = "",
  uppercase = false,
}) => {
  const statusMap: Record<string, { class: string; label: string }> =
    {
      Enable: {
        class: "status-badge-enabled",
        label: "Enabled",
      },
      enabled: {
        class: "status-badge-enabled",
        label: "Enabled",
      },
      Enabled: {
        class: "status-badge-enabled",
        label: "Enabled",
      },
      ENABLED: {
        class: "status-badge-enabled",
        label: "Enabled",
      },
      ENABLE: {
        class: "status-badge-enabled",
        label: "Enabled",
      },
      Paused: {
        class: "status-badge-paused",
        label: "Paused",
      },
      paused: {
        class: "status-badge-paused",
        label: "Paused",
      },
      PAUSED: {
        class: "status-badge-paused",
        label: "Paused",
      },
      Disable: {
        class: "status-badge-paused",
        label: "Paused",
      },
      disable: {
        class: "status-badge-paused",
        label: "Paused",
      },
      DISABLE: {
        class: "status-badge-paused",
        label: "Paused",
      },
      Removed: {
        class: "status-badge-archived",
        label: "Removed",
      },
      removed: {
        class: "status-badge-archived",
        label: "Removed",
      },
      Archived: {
        class: "status-badge-archived",
        label: "Archived",
      },
      archived: {
        class: "status-badge-archived",
        label: "Archived",
      },
      ARCHIVED: {
        class: "status-badge-archived",
        label: "Archived",
      },
      Deleted: {
        class: "status-badge-archived",
        label: "Deleted",
      },
      deleted: {
        class: "status-badge-archived",
        label: "Deleted",
      },
      DELETED: {
        class: "status-badge-archived",
        label: "Deleted",
      },
      DELETE: {
        class: "status-badge-archived",
        label: "Deleted",
      },
    };

  const statusInfo =
    statusMap[status] || statusMap["Enabled"] || statusMap["Enable"];

  return (
    <span
      className={`status-badge ${statusInfo.class} ${className}`}
    >
      {uppercase ? statusInfo.label.toUpperCase() : statusInfo.label}
    </span>
  );
};
