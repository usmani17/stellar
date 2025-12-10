import React from "react";

interface KPICardProps {
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  change,
  isPositive,
  className = "",
}) => {
  return (
    <div
      className={className}
      style={{
        padding: "16px",
        background: "#FCFCF9",
        borderRadius: "10px",
        outline: "1px #E8E8E3 solid",
        outlineOffset: "-1px",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        gap: "12px",
        display: "flex",
        minHeight: "112px",
        maxWidth: "100%",
      }}
    >
      <p
        style={{
          color: "#072929",
          fontSize: "14px",
          fontFamily: "GT America Trial",
          fontWeight: 400,
          lineHeight: "100%",
          wordWrap: "break-word",
        }}
        className="mb-0"
      >
        {label}
      </p>
      <div className="flex items-center justify-between w-full">
        <p
          style={{
            color: "#072929",
            fontSize: "24px",
            fontFamily: "GT America Trial",
            fontWeight: 500,
            lineHeight: "100%",
          }}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {change && (
          <div className="flex items-center gap-2">
            <span
              className={`text-[12px] font-normal ${
                isPositive ? "text-black" : "text-black"
              }`}
            >
              {change}
            </span>
            <svg
              className={`w-4 h-4 ${isPositive ? "text-black" : "text-black"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isPositive ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              )}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
