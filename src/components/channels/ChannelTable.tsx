import React, { useState } from 'react';
import type { Channel } from '../../services/channels';

interface ChannelTableProps {
  channels: Channel[];
  onEdit: (channel: Channel) => void;
  onDelete: (id: number) => void;
  deletingId?: number | null;
}

export const ChannelTable: React.FC<ChannelTableProps> = ({
  channels,
  onEdit,
  onDelete,
  deletingId,
}) => {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Ensure channels is always an array before filtering
  const channelsArray = Array.isArray(channels) ? channels : [];
  const filteredChannels = channelsArray.filter(channel =>
    channel.channel_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.channel_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(new Set(filteredChannels.map(c => c.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-[#D6E5E5] text-[#0E4E4E]',
      inactive: 'bg-[#E4E4D7] text-[#0B0F16]',
      pending: 'bg-[#FFECD6] text-[#FF991F]',
      paused: 'bg-[#FFECD6] text-[#FF991F]',
      archived: 'bg-[#E4E4D7] text-[#0B0F16]',
      expired: 'bg-[#FFEBE6] text-[#CE1313]',
    };

    const statusMap: Record<string, string> = {
      active: 'Enable',
      inactive: 'Default',
      pending: 'Pending',
      paused: 'Paused',
      archived: 'Default',
      expired: 'Expired',
    };

    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[status as keyof typeof styles] || styles.inactive}`}>
        {statusMap[status] || status}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  // Mock data for metrics (in real app, these would come from the API)
  const getMockMetrics = (channel: Channel) => {
    return {
      dailyBudget: 9840,
      spends: 45000,
      sales: 9840,
      acos: 24.9,
      roas: 4.02,
      lastSync: channel.updated_at,
    };
  };

  return (
    <div className="bg-[#F9F9F6] border border-[#E8E8E3] rounded-xl">
      {/* Header */}
      <div className="p-6 border-b border-[#E8E8E3]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[24px] font-medium text-[#072929]">
            Campaign Manager (Overview of all active campaigns)
          </h3>
          
          {/* Search */}
          <div className="relative w-[272px]">
            <input
              type="text"
              placeholder="Search by name or Account ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 pl-10 bg-[#F0F0ED] border border-[#E8E8E3] rounded-lg text-[14px] text-[#556179] focus:outline-none focus:ring-2 focus:ring-[#136d6d] focus:border-[#136d6d]"
            />
            <svg
              className="absolute left-3 top-2.5 w-3 h-3 text-[#556179]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="bg-[#FEFEFB] border border-[#E8E8E3] rounded-xl">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-5 py-3 text-left border-b border-[#E8E8E3]">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === filteredChannels.length && filteredChannels.length > 0}
                    onChange={handleSelectAll}
                    className="w-8 h-8 rounded border-2 border-[#E3E3E3] bg-white text-[#136d6d] focus:ring-[#136d6d]"
                  />
                </th>
                <th className="px-5 py-3 text-left text-[14px] font-medium text-[#29303f] border-b border-[#E8E8E3]">Campaign Name</th>
                <th className="px-5 py-3 text-left text-[14px] font-medium text-[#29303f] border-b border-[#E8E8E3]">Type</th>
                <th className="px-5 py-3 text-left text-[14px] font-medium text-[#29303f] border-b border-[#E8E8E3]">Status</th>
                <th className="px-5 py-3 text-left text-[14px] font-medium text-[#29303f] border-b border-[#E8E8E3]">Daily Budget</th>
                <th className="px-5 py-3 text-left text-[14px] font-medium text-[#29303f] border-b border-[#E8E8E3]">Spends</th>
                <th className="px-5 py-3 text-left text-[14px] font-medium text-[#29303f] border-b border-[#E8E8E3]">Sales</th>
                <th className="px-5 py-3 text-left text-[14px] font-medium text-[#29303f] border-b border-[#E8E8E3]">ACOS</th>
                <th className="px-5 py-3 text-left text-[14px] font-medium text-[#29303f] border-b border-[#E8E8E3]">ROAS</th>
                <th className="px-5 py-3 text-left text-[14px] font-medium text-[#29303f] border-b border-[#E8E8E3]">Last Sync</th>
                <th className="px-5 py-3 text-left text-[14px] font-medium text-[#29303f] border-b border-[#E8E8E3]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredChannels.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-8 text-center text-[#556179]">
                    No channels found
                  </td>
                </tr>
              ) : (
                filteredChannels.map((channel) => {
                  const metrics = getMockMetrics(channel);
                  return (
                    <tr key={channel.id} className="border-b border-[#E8E8E3] hover:bg-[#FEFEFB]">
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(channel.id)}
                          onChange={() => handleSelectRow(channel.id)}
                          className="w-8 h-8 rounded border-2 border-[#E3E3E3] bg-white text-[#136d6d] focus:ring-[#136d6d]"
                        />
                      </td>
                      <td className="px-5 py-4 text-[14px] text-[#0b0f16] font-normal">{channel.channel_name}</td>
                      <td className="px-5 py-4 text-[14px] text-[#0b0f16] font-normal">{channel.channel_type.toUpperCase()}</td>
                      <td className="px-5 py-4">{getStatusBadge(channel.status)}</td>
                      <td className="px-5 py-4 text-[14px] text-[#0b0f16] font-normal">{formatCurrency(metrics.dailyBudget)}</td>
                      <td className="px-5 py-4 text-[14px] text-[#0b0f16] font-normal">{formatCurrency(metrics.spends)}</td>
                      <td className="px-5 py-4 text-[14px] text-[#0b0f16] font-normal">{formatCurrency(metrics.sales)}</td>
                      <td className="px-5 py-4 text-[14px] text-[#0b0f16] font-normal">{metrics.acos}%</td>
                      <td className="px-5 py-4 text-[14px] text-[#0b0f16] font-normal">{metrics.roas.toFixed(2)} x</td>
                      <td className="px-5 py-4 text-[14px] text-[#0b0f16] font-normal">{formatTimeAgo(metrics.lastSync)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => onEdit(channel)}
                            className="p-3 hover:bg-gray-100 rounded-lg"
                          >
                            <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="p-6 border-t border-[#E8E8E3] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[14px] text-black">Showing</span>
          <div className="bg-white border border-[#EBEBEB] rounded-lg px-3 py-2 flex items-center gap-2 w-[68px]">
            <span className="text-[12px] text-[#858585]">10</span>
            <svg className="w-3.5 h-3.5 text-[#858585]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <span className="text-[14px] text-black">
            of <span className="font-bold">100</span> Result
          </span>
        </div>
        <div className="bg-white border border-[#EBEBEB] rounded-lg flex items-center">
          <button className="px-2.5 py-2.5 border-r border-[#E6E6E6] text-[14px] text-black hover:bg-gray-50">
            Previous
          </button>
          <button className="px-2.5 py-2.5 border-r border-[#E6E6E6] w-10 text-[14px] text-black hover:bg-gray-50">1</button>
          <button className="px-2.5 py-2.5 border-r border-[#E6E6E6] w-10 text-[14px] font-semibold text-[#4e5cff] bg-white">2</button>
          <button className="px-2.5 py-2.5 border-r border-[#E6E6E6] w-10 text-[14px] text-black hover:bg-gray-50">3</button>
          <button className="px-2.5 py-2.5 border-r border-[#E6E6E6] w-10 text-[14px] text-[#222124] hover:bg-gray-50">...</button>
          <button className="px-2.5 py-2.5 border-r border-[#E6E6E6] w-10 text-[14px] text-black hover:bg-gray-50">5</button>
          <button className="px-2.5 py-2.5 border-r border-[#E6E6E6] w-10 text-[14px] text-black hover:bg-gray-50">6</button>
          <button className="px-2.5 py-2.5 text-[14px] text-black hover:bg-gray-50">Next</button>
        </div>
      </div>
    </div>
  );
};

