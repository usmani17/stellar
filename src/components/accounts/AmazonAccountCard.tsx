import React from 'react';
import type { AmazonAccount } from '../../services/accounts';
import { Card } from '../ui';
import { Button } from '../ui/Button';

interface AmazonAccountCardProps {
  account: AmazonAccount;
  onDelete: (id: number) => void;
  deleting?: boolean;
}

export const AmazonAccountCard: React.FC<AmazonAccountCardProps> = ({
  account,
  onDelete,
  deleting = false,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-h1000 font-semibold text-forest-f60 mb-1">
            {account.account_name}
          </h3>
          {account.amazon_account_id && (
            <p className="text-h700 text-forest-f30 mb-2">
              Account ID: {account.amazon_account_id}
            </p>
          )}
          <p className="text-h600 text-forest-f30">
            Connected: {formatDate(account.connected_at)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(account.id)}
          disabled={deleting}
        >
          {deleting ? 'Removing...' : 'Disconnect'}
        </Button>
      </div>
    </Card>
  );
};

