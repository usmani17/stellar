import React from 'react';
import type { Channel } from '../../services/channels';
import { Card } from '../ui';
import { Button } from '../ui/Button';

interface ChannelListProps {
  channels: Channel[];
  onEdit: (channel: Channel) => void;
  onDelete: (id: number) => void;
  deletingId?: number | null;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  onEdit,
  onDelete,
  deletingId,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (channels.length === 0) {
    return (
      <div className="text-center py-8 text-forest-f30">
        No channels created yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {channels.map((channel) => (
        <Card key={channel.id}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-h1000 font-semibold text-forest-f60">
                  {channel.channel_name}
                </h3>
                <span className={`px-2 py-1 rounded text-h600 ${getStatusColor(channel.status)}`}>
                  {channel.status}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-h700 text-forest-f30">
                  Type: <span className="font-medium text-forest-f60 capitalize">{channel.channel_type}</span>
                </p>
                {channel.amazon_account_name && (
                  <p className="text-h700 text-forest-f30">
                    Account: <span className="font-medium text-forest-f60">{channel.amazon_account_name}</span>
                  </p>
                )}
                <p className="text-h600 text-forest-f30">
                  Created: {formatDate(channel.created_at)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(channel)}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(channel.id)}
                disabled={deletingId === channel.id}
              >
                {deletingId === channel.id ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

