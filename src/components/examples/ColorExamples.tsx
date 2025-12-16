import React from "react";

/**
 * Examples of using Token Studio colors and custom colors in components
 */

// Example 1: Updated Button Component using Token Studio colors
export const ExampleButton: React.FC<{
  variant?: "primary" | "secondary" | "danger" | "success";
  children: React.ReactNode;
}> = ({ variant = "primary", children }) => {
  const variants = {
    primary: "bg-forest-f40 hover:bg-forest-f50 text-white font-semibold",
    secondary:
      "bg-white border border-sandstorm-s40 hover:border-sandstorm-s50 text-black font-semibold",
    danger: "bg-red-500 hover:bg-red-600 text-white font-semibold",
    success: "bg-green-500 hover:bg-green-600 text-white font-semibold",
  };

  return (
    <button
      className={`px-4 py-2 rounded-lg transition-colors ${variants[variant]}`}
    >
      {children}
    </button>
  );
};

// Example 2: Alert/Notification Component
export const Alert: React.FC<{
  type: "success" | "error" | "warning" | "info";
  message: string;
}> = ({ type, message }) => {
  const styles = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  return (
    <div className={`border rounded-lg p-4 ${styles[type]}`}>{message}</div>
  );
};

// Example 3: Status Badge Component
export const ExampleStatusBadge: React.FC<{
  status: "active" | "inactive" | "pending";
}> = ({ status }) => {
  const styles = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
    pending: "bg-yellow-100 text-yellow-800",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
};

// Example 4: Card Component with Token Studio colors
export const ExampleCard: React.FC<{
  title: string;
  description: string;
  children?: React.ReactNode;
}> = ({ title, description, children }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-gray-900 text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      {children}
    </div>
  );
};

// Example 5: Input Field with focus states
export const ExampleInput: React.FC<{
  label: string;
  placeholder?: string;
}> = ({ label, placeholder }) => {
  return (
    <div>
      <label className="block text-gray-700 text-sm font-medium mb-2">
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 
                   focus:border-blue-500 focus:ring-2 focus:ring-blue-200 
                   transition-colors"
      />
    </div>
  );
};

// Example 6: Table with alternating row colors
export const ExampleTable: React.FC<{
  items: Array<{ id: string; name: string; status: string }>;
}> = ({ items }) => {
  return (
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-2 text-left text-gray-700 font-semibold">
            Name
          </th>
          <th className="px-4 py-2 text-left text-gray-700 font-semibold">
            Status
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr
            key={item.id}
            className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
          >
            <td className="px-4 py-2 text-gray-900">{item.name}</td>
            <td className="px-4 py-2">
              <ExampleStatusBadge
                status={item.status as "active" | "inactive" | "pending"}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Example 7: Icon with color variants
export const ExampleIcon: React.FC<{ type: "success" | "error" | "info" }> = ({
  type,
}) => {
  const colors = {
    success: "text-green-500",
    error: "text-red-500",
    info: "text-blue-500",
  };

  return (
    <svg
      className={`w-5 h-5 ${colors[type]}`}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
    </svg>
  );
};

// Example 8: Gradient backgrounds
export const ExampleGradient: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white p-8 rounded-xl">
      {children}
    </div>
  );
};

// Example 9: Combining Token Studio and Custom colors
export const ExampleMixed: React.FC = () => {
  return (
    <div className="bg-sandstorm-s0 border border-gray-200 rounded-xl p-6">
      <h2 className="text-forest-f60 mb-4 text-xl font-semibold">
        Mixed Colors Example
      </h2>
      <p className="text-gray-600 mb-4">
        This card uses custom sandstorm background with Token Studio gray border
        and text.
      </p>
      <div className="flex gap-2">
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
          Token Studio Blue
        </button>
        <button className="bg-forest-f40 hover:bg-forest-f50 text-white px-4 py-2 rounded">
          Custom Forest
        </button>
      </div>
    </div>
  );
};

// Example 10: Campaign Status Badge (based on your Campaigns page)
export const CampaignStatusBadge: React.FC<{ status: string }> = ({
  status,
}) => {
  const statusColors: Record<string, string> = {
    Enable: "bg-green-100 text-green-800 border-green-200",
    Paused: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Archived: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium border ${
        statusColors[status] || statusColors.Archived
      }`}
    >
      {status}
    </span>
  );
};

// Example 11: KPI Card (based on your dashboard)
export const KPICard: React.FC<{
  label: string;
  value: string;
  trend?: "up" | "down";
}> = ({ label, value, trend }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-gray-600 text-sm mb-1">{label}</p>
      <p className="text-gray-900 text-2xl font-semibold">{value}</p>
      {trend && (
        <span
          className={`text-xs ${
            trend === "up" ? "text-green-600" : "text-red-600"
          }`}
        >
          {trend === "up" ? "↑" : "↓"} 12%
        </span>
      )}
    </div>
  );
};

// Example 12: Filter Chip (based on your FilterPanel)
export const FilterChip: React.FC<{
  label: string;
  active?: boolean;
  onRemove?: () => void;
}> = ({ label, active = false, onRemove }) => {
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
        active
          ? "bg-blue-100 text-blue-800 border border-blue-200"
          : "bg-gray-100 text-gray-700 border border-gray-200"
      }`}
    >
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      )}
    </span>
  );
};
