import React, { useState, useEffect } from 'react';
import { channelsService, type Channel, type CreateChannelData } from '../services/channels';
import { accountsService, type AmazonAccount } from '../services/accounts';
import { ChannelList } from '../components/channels/ChannelList';
import { ChannelForm } from '../components/channels/ChannelForm';
import { Button, Card } from '../components/ui';

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
      setChannels(channelsData);
      setAmazonAccounts(accountsData);
    } catch (error) {
      console.error('Failed to load data:', error);
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
    <div className="min-h-screen bg-sandstorm-s0 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-h1300 font-bold text-forest-f60 mb-2">Channels</h1>
          <p className="text-h800 text-forest-f30">Manage your sales channels</p>
        </div>

        <Card
          title="Your Channels"
          actions={
            <Button onClick={() => {
              setEditingChannel(null);
              setIsModalOpen(true);
            }} size="sm">
              Create Channel
            </Button>
          }
        >
          {loading ? (
            <div className="text-center py-8 text-forest-f30">Loading channels...</div>
          ) : (
            <ChannelList
              channels={channels}
              onEdit={handleEdit}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          )}
        </Card>

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
    </div>
  );
};

