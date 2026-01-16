import React from "react";

interface LogEntry {
    id: string;
    timestamp: string;
    user: string;
    action: string;
    details: string;
}

// Mock data or empty logic
const mockLogs: LogEntry[] = [
    {
        id: "1",
        timestamp: "2024-03-20 10:30 AM",
        user: "System",
        action: "Campaign Synced",
        details: "Campaign metrics updated from TikTok API",
    },
    // Add more mock data as needed
];

export const TikTokCampaignDetailLogsTab: React.FC = () => {
    return (
        <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[800px]">
                    <thead className="bg-[#f5f5f0]">
                        <tr className="border-b border-[#e8e8e3]">
                            <th className="table-header">
                                Timestamp
                            </th>
                            <th className="table-header">
                                User
                            </th>
                            <th className="table-header">
                                Action
                            </th>
                            <th className="table-header">
                                Details
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockLogs.length > 0 ? (
                            mockLogs.map((log, index) => {
                                const isLastRow = index === mockLogs.length - 1;
                                return (
                                    <tr
                                        key={log.id}
                                        className={`hover:bg-gray-50 transition-colors ${!isLastRow ? "border-b border-[#e8e8e3]" : ""}`}
                                    >
                                        <td className="py-[10px] px-[20px] text-[13.3px] text-[#0b0f16]">
                                            {log.timestamp}
                                        </td>
                                        <td className="table-cell text-[13.3px] text-[#0b0f16]">
                                            {log.user}
                                        </td>
                                        <td className="table-cell text-[13.3px] text-[#0b0f16] font-medium">
                                            {log.action}
                                        </td>
                                        <td className="table-cell text-[13.3px] text-[#556179]">
                                            {log.details}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr className="border-b border-[#e8e8e3]">
                                <td colSpan={4} className="py-8 text-center text-[13.3px] text-[#556179]">
                                    No logs found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
