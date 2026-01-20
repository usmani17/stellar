import React from "react";

export interface TikTokLog {
    id: number;
    advertiser_id: string;
    action: string;
    campaign_id?: string;
    entity_type: string;
    entity_id: string;
    entity_name: string;
    field_name: string;
    old_value?: string;
    new_value?: string;
    status: string;
    error_details?: string;
    method: "Inline" | "Bulk";
    changed_by?: number;
    changed_by_name: string;
    changed_at: string;
}

interface TikTokLogsTableProps {
    logs: TikTokLog[];
    loading: boolean;
    error?: string | null;
}

export const TikTokLogsTable: React.FC<TikTokLogsTableProps> = ({
    logs,
    loading,
    error,
}) => {
    const formatTimestamp = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            return `${month}/${day}/${year} ${hours}:${minutes}`;
        } catch (e) {
            return timestamp || "";
        }
    };

    const getActionColor = (action: string) => {
        const a = action?.toUpperCase();
        switch (a) {
            case "CREATE":
                return "text-blue-b10Alt bg-[#e3eeff]";
            case "UPDATE":
                return "text-[#ff991f] bg-[#fff6e6]";
            case "DELETE":
                return "text-red-r30 bg-[#ffebe6]";
            default:
                return "text-[#556179] bg-[#f4f5f7]";
        }
    };

    if (loading) {
        return (
            <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
                <div className="text-center py-8 text-[#556179] text-[13.3px]">
                    Loading logs...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-8 flex flex-col items-center justify-center min-h-[200px]">
                <p className="text-[13.3px] text-red-500">{error}</p>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] p-8 flex flex-col items-center justify-center min-h-[400px]">
                <p className="text-[13.3px] text-[#556179]">No logs found.</p>
            </div>
        );
    }

    return (
        <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
            <div className="overflow-x-auto w-full font-inter">
                <table className="min-w-[1400px] w-full border-collapse">
                    <thead>
                        <tr className="border-b border-[#e8e8e3]">
                            <th className="table-header bg-[#f5f5f0] border-r border-[#e8e8e3] w-[160px]">Timestamp</th>
                            <th className="table-header bg-[#f5f5f0] border-r border-[#e8e8e3] w-[90px]">User</th>
                            <th className="table-header bg-[#f5f5f0] border-r border-[#e8e8e3] w-[100px]">Action</th>
                            <th className="table-header bg-[#f5f5f0] border-r border-[#e8e8e3] w-[120px]">Entity Type</th>
                            <th className="table-header bg-[#f5f5f0] border-r border-[#e8e8e3] min-w-[200px]">Entity Name</th>
                            <th className="table-header bg-[#f5f5f0] border-r border-[#e8e8e3] w-[110px]">Field</th>
                            <th className="table-header bg-[#f5f5f0] border-r border-[#e8e8e3] min-w-[110px]">Old Value</th>
                            <th className="table-header bg-[#f5f5f0] border-r border-[#e8e8e3] min-w-[110px]">New Value</th>
                            <th className="table-header bg-[#f5f5f0] border-r border-[#e8e8e3] w-[70px]">Method</th>
                            <th className="table-header bg-[#f5f5f0] w-[100px]">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-[#f9f9f6]">
                        {logs.map((log) => (
                            <tr key={log.id} className="table-row group border-b border-[#e8e8e3] hover:bg-white transition-colors">
                                <td className="table-cell table-text border-r border-[#e8e8e3] bg-[#f5f5f0] group-hover:bg-[#f0f0ed]">
                                    {formatTimestamp(log.changed_at)}
                                </td>
                                <td className="table-cell table-text border-r border-[#e8e8e3]">
                                    <span className="text-[12px] text-[#072929] truncate block" title={log.changed_by_name || "System"}>
                                        {log.changed_by_name || "System"}
                                    </span>
                                </td>
                                <td className="table-cell table-text border-r border-[#e8e8e3] text-center">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${getActionColor(log.action)}`}>
                                        {log.action}
                                    </span>
                                </td>
                                <td className="table-cell table-text border-r border-[#e8e8e3] capitalize">
                                    {log.entity_type}
                                </td>
                                <td className="table-cell table-text border-r border-[#e8e8e3] font-medium truncate max-w-[250px]" title={log.entity_name}>
                                    {log.entity_name}
                                </td>
                                <td className="table-cell table-text border-r border-[#e8e8e3] text-[12px] text-[#072929] truncate max-w-[140px]" title={log.field_name}>
                                    {log.field_name || "—"}
                                </td>
                                <td className="table-cell table-text border-r border-[#e8e8e3] text-[12px] text-[#556179] truncate max-w-[160px]" title={log.old_value || ""}>
                                    {log.old_value || "—"}
                                </td>
                                <td className="table-cell table-text border-r border-[#e8e8e3] text-[12px] text-[#136D6D] font-medium truncate max-w-[160px]" title={log.new_value || ""}>
                                    {log.new_value || "—"}
                                </td>
                                <td className="table-cell table-text border-r border-[#e8e8e3] text-center">
                                    <span className="text-[12px] text-[#072929]">
                                        {log.method}
                                    </span>
                                </td>
                                <td className="table-cell table-text text-center">
                                    <span className={`text-xs font-normal ${
                                        log.status === "success"
                                            ? "text-green-600"
                                            : log.status === "error" || log.status === "failed"
                                            ? "text-red-600"
                                            : "text-[#072929]"
                                    }`}>
                                        {log.status === "success" ? "Success" : log.status === "error" || log.status === "failed" ? "Failed" : log.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
