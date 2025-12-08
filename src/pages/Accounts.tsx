import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { accountsService, type AmazonAccount } from '../services/accounts';
import { ProfileForm } from '../components/accounts/ProfileForm';
import { AmazonAccountCard } from '../components/accounts/AmazonAccountCard';
import { ConnectAmazonModal } from '../components/accounts/ConnectAmazonModal';
import { Button, Card } from '../components/ui';

export const Accounts: React.FC = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AmazonAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await accountsService.getAccounts();
      setAccounts(data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAccount = async (data: { account_name: string; amazon_account_id?: string }) => {
    await accountsService.createAccount(data);
    await loadAccounts();
  };

  const handleDeleteAccount = async (id: number) => {
    if (!window.confirm('Are you sure you want to disconnect this account?')) {
      return;
    }

    setDeletingId(id);
    try {
      await accountsService.deleteAccount(id);
      await loadAccounts();
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to disconnect account');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-sandstorm-s0 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-h1300 font-bold text-forest-f60 mb-2">Accounts</h1>
          <p className="text-h800 text-forest-f30">Manage your profile and connected Amazon accounts</p>
        </div>

        <div className="space-y-8">
          <ProfileForm />

          <Card
            title="Connected Amazon Accounts"
            actions={
              <Button onClick={() => setIsModalOpen(true)} size="sm">
                Connect Account
              </Button>
            }
          >
            {loading ? (
              <div className="text-center py-8 text-forest-f30">Loading accounts...</div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-forest-f30 mb-4">No Amazon accounts connected yet</p>
                <Button onClick={() => setIsModalOpen(true)}>
                  Connect Your First Account
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accounts.map((account) => (
                  <AmazonAccountCard
                    key={account.id}
                    account={account}
                    onDelete={handleDeleteAccount}
                    deleting={deletingId === account.id}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        <ConnectAmazonModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleConnectAccount}
        />
      </div>
    </div>
  );
};

