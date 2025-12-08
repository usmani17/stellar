import React, { useState, useEffect } from 'react';
import { channelsService, type Channel, type CreateChannelData } from '../services/channels';
import { accountsService, type AmazonAccount } from '../services/accounts';
import { ChannelForm } from '../components/channels/ChannelForm';
import { ChannelTable } from '../components/channels/ChannelTable';
import { PerformanceChart } from '../components/channels/PerformanceChart';
import { Sidebar } from '../components/layout/Sidebar';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { Button } from '../components/ui';

export const Channels: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [amazonAccounts, setAmazonAccounts] = useState<AmazonAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [channelsData, accountsData] = await Promise.all([
        channelsService.getChannels(),
        accountsService.getAccounts(),
      ]);
      // Ensure data is always an array
      setChannels(Array.isArray(channelsData) ? channelsData : []);
      setAmazonAccounts(Array.isArray(accountsData) ? accountsData : []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setChannels([]);
      setAmazonAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async (data: CreateChannelData) => {
    if (editingChannel) {
      await channelsService.updateChannel(editingChannel.id, data);
    } else {
      await channelsService.createChannel(data);
    }
    await loadData();
    setEditingChannel(null);
    setIsModalOpen(false);
  };

  const handleEdit = (channel: Channel) => {
    setEditingChannel(channel);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this channel?')) {
      return;
    }

    setDeletingId(id);
    try {
      await channelsService.deleteChannel(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete channel:', error);
      alert('Failed to delete channel');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-[272px]">
        {/* Header */}
        <DashboardHeader />

        {/* Main Content Area */}
        <div className="p-8 bg-white">
          {/* Filter Bar */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-[24px] text-black font-normal">Ethan James</div>
              <button className="px-3 py-2 bg-[#FEFEFB] border border-[#E3E3E3] rounded-xl flex items-center gap-2 h-10">
                <svg className="w-5 h-5 text-[#072929]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="text-[14px] text-[#072929]">Add Filter</span>
                <svg className="w-5 h-5 text-[#E3E3E3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <Button
              onClick={() => {
                setEditingChannel(null);
                setIsModalOpen(true);
              }}
            >
              Create Channel
            </Button>
          </div>

          {/* Performance Chart */}
          <div className="mb-8">
            <PerformanceChart />
          </div>

          {/* Channel Table */}
          {loading ? (
            <div className="bg-white border border-neutral-n30 rounded-lg p-8 text-center text-neutral-n400">
              Loading channels...
            </div>
          ) : (
            <ChannelTable
              channels={channels}
              onEdit={handleEdit}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          )}
        </div>
      </div>

      {/* Channel Form Modal */}
      <ChannelForm
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingChannel(null);
        }}
        onSubmit={handleCreateChannel}
        channel={editingChannel}
        amazonAccounts={amazonAccounts}
      />
    </div>
  );
};

