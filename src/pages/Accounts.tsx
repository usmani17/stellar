import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { accountsService, type AmazonAccount } from '../services/accounts';
import { ProfileForm } from '../components/accounts/ProfileForm';
import { AmazonAccountCard } from '../components/accounts/AmazonAccountCard';
import { Sidebar } from '../components/layout/Sidebar';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { Button, Card } from '../components/ui';

export const Accounts: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<AmazonAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    if (error) {
      setOauthError(`Amazon OAuth error: ${error}`);
      // Remove error from URL
      setSearchParams({});
      return;
    }

    if (code) {
      handleOAuthCallback(code, state || undefined);
    }
  }, [searchParams]);

  const handleOAuthCallback = async (code: string, state?: string) => {
    try {
      await accountsService.handleAmazonOAuthCallback(code, state);
      // Remove code from URL
      setSearchParams({});
      // Reload accounts
      await loadAccounts();
      setOauthError(null);
    } catch (error: any) {
      setOauthError(error.response?.data?.error || 'Failed to complete Amazon OAuth');
      // Remove code from URL
      setSearchParams({});
    }
  };

  const loadAccounts = async () => {
    try {
      const data = await accountsService.getAccounts();
      // Ensure data is always an array
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      setAccounts([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAmazon = async () => {
    setOauthError(null);
    setOauthLoading(true);

    try {
      const { auth_url } = await accountsService.initiateAmazonOAuth();
      // Redirect directly to Amazon OAuth
      window.location.href = auth_url;
    } catch (err: any) {
      setOauthError(err.response?.data?.error || 'Failed to initiate Amazon OAuth');
      setOauthLoading(false);
    }
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
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-[272px]">
        {/* Header */}
        <DashboardHeader />

        {/* Main Content Area */}
        <div className="p-8 bg-white">
          {oauthError && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-[14px]">
              {oauthError}
              <button
                onClick={() => setOauthError(null)}
                className="ml-2 text-red-800 hover:text-red-900 font-semibold"
              >
                ×
              </button>
            </div>
          )}

          <div className="space-y-6">
            <ProfileForm />

            <Card
              title="Connected Amazon Accounts"
              actions={
                <Button 
                  onClick={handleConnectAmazon} 
                  size="sm"
                  disabled={oauthLoading}
                >
                  {oauthLoading ? 'Connecting...' : 'Connect Account'}
                </Button>
              }
            >
              {loading ? (
                <div className="text-center py-8 text-[#556179]">Loading accounts...</div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[14px] text-[#556179] mb-4">No Amazon accounts connected yet</p>
                  <Button 
                    onClick={handleConnectAmazon}
                    disabled={oauthLoading}
                  >
                    {oauthLoading ? 'Redirecting to Amazon...' : 'Connect Your First Account'}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.isArray(accounts) && accounts.map((account) => (
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
        </div>
      </div>
    </div>
  );
};

