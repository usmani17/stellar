import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { accountsService, type Account, type Channel } from '../services/accounts';
import { channelsService } from '../services/channels';
import { Sidebar } from '../components/layout/Sidebar';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { Button, Card } from '../components/ui';

export const Accounts: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [channelsByAccount, setChannelsByAccount] = useState<Record<number, Channel[]>>({});
  const [expandedAccounts, setExpandedAccounts] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [deletingAccountId, setDeletingAccountId] = useState<number | null>(null);
  const [deletingChannelId, setDeletingChannelId] = useState<number | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<number | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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
      setSearchParams({});
      return;
    }

    if (code) {
      handleOAuthCallback(code, state || undefined);
    }
  }, [searchParams]);

  const handleOAuthCallback = async (code: string, state?: string) => {
    try {
      const channel = await accountsService.handleAmazonOAuthCallback(code, state);
      setSearchParams({});
      
      if (channel.needs_profile_selection && channel.id) {
        navigate(`/channels/${channel.id}/select-profiles`);
        return;
      }
      
      await loadAccounts();
      setOauthError(null);
    } catch (error: any) {
      setOauthError(error.response?.data?.error || 'Failed to complete Amazon OAuth');
      setSearchParams({});
    }
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const accountsData = await accountsService.getAccounts();
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      
      const channelsMap: Record<number, Channel[]> = {};
      for (const account of accountsData) {
        try {
          const channels = await channelsService.getChannels(account.id);
          channelsMap[account.id] = Array.isArray(channels) ? channels : [];
        } catch (error) {
          console.error(`Failed to load channels for account ${account.id}:`, error);
          channelsMap[account.id] = [];
        }
      }
      setChannelsByAccount(channelsMap);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) {
      alert('Please enter an account name');
      return;
    }

    try {
      await accountsService.createAccount({ account_name: newAccountName.trim() });
      setNewAccountName('');
      setShowCreateAccount(false);
      await loadAccounts();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create account');
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this account? All channels will be deleted.')) {
      return;
    }

    setDeletingAccountId(id);
    try {
      await accountsService.deleteAccount(id);
      await loadAccounts();
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account');
    } finally {
      setDeletingAccountId(null);
    }
  };

  const handleDeleteChannel = async (accountId: number, channelId: number) => {
    if (!window.confirm('Are you sure you want to delete this channel?')) {
      return;
    }

    setDeletingChannelId(channelId);
    try {
      await channelsService.deleteChannel(accountId, channelId);
      await loadAccounts();
    } catch (error) {
      console.error('Failed to delete channel:', error);
      alert('Failed to delete channel');
    } finally {
      setDeletingChannelId(null);
    }
  };

  const handleConnectAmazon = async (accountId: number) => {
    setOauthError(null);
    setOauthLoading(accountId);

    try {
      const { auth_url } = await accountsService.initiateAmazonOAuth(accountId);
      window.location.href = auth_url;
    } catch (err: any) {
      setOauthError(err.response?.data?.error || 'Failed to initiate Amazon OAuth');
      setOauthLoading(null);
    }
  };

  const toggleAccount = (accountId: number) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const getChannelTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      amazon: 'Amazon',
      google: 'Google',
      walmart: 'Walmart',
    };
    return labels[type] || type;
  };


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Filter accounts based on search query
  const filteredAccounts = accounts.filter(account =>
    account.account_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            {/* Header with Create Button */}
            <div className="flex items-center justify-between">
              <h1 className="text-[24px] font-medium text-[#313850]">Accounts</h1>
              <Button 
                onClick={() => setShowCreateAccount(!showCreateAccount)}
                size="sm"
              >
                {showCreateAccount ? 'Cancel' : 'Create Account'}
              </Button>
            </div>

            {/* Create Account Form */}
            {showCreateAccount && (
              <Card>
                <div className="p-4">
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="Account name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleCreateAccount()}
                    />
                    <Button onClick={handleCreateAccount} size="sm">
                      Create
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Accounts Table */}
            <Card>
              <div className="p-6">
                {/* Search Bar */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search accounts..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {loading ? (
                  <div className="text-center py-8 text-[#556179]">Loading accounts...</div>
                ) : filteredAccounts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[14px] text-[#556179] mb-4">
                      {searchQuery ? 'No accounts found' : 'No accounts yet'}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => setShowCreateAccount(true)}>
                        Create Your First Account
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-[12px] font-semibold text-[#556179] uppercase">
                            Account Name
                          </th>
                          <th className="text-left py-3 px-4 text-[12px] font-semibold text-[#556179] uppercase">
                            Channels
                          </th>
                          <th className="text-left py-3 px-4 text-[12px] font-semibold text-[#556179] uppercase">
                            Created
                          </th>
                          <th className="text-right py-3 px-4 text-[12px] font-semibold text-[#556179] uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAccounts.map((account) => {
                          const channels = channelsByAccount[account.id] || [];
                          const isExpanded = expandedAccounts.has(account.id);
                          
                          return (
                            <React.Fragment key={account.id}>
                              <tr className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => toggleAccount(account.id)}
                                      className="text-gray-400 hover:text-gray-600 text-sm"
                                    >
                                      {isExpanded ? '▼' : '▶'}
                                    </button>
                                    <span className="font-medium text-[14px] text-[#313850]">
                                      {account.account_name}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <span className="text-[14px] text-[#556179]">
                                    {channels.length} channel{channels.length !== 1 ? 's' : ''}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <span className="text-[14px] text-[#556179]">
                                    {formatDate(account.created_at)}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      onClick={() => handleConnectAmazon(account.id)}
                                      size="sm"
                                      disabled={oauthLoading === account.id}
                                    >
                                      {oauthLoading === account.id ? 'Connecting...' : 'Connect Amazon'}
                                    </Button>
                                    <Button
                                      onClick={() => handleDeleteAccount(account.id)}
                                      size="sm"
                                      variant="outline"
                                      disabled={deletingAccountId === account.id}
                                    >
                                      {deletingAccountId === account.id ? 'Deleting...' : 'Delete'}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                              {/* Expanded Channels Row */}
                              {isExpanded && (
                                <tr>
                                  <td colSpan={4} className="px-4 py-4 bg-gray-50">
                                    {channels.length === 0 ? (
                                      <div className="text-center py-4 text-[14px] text-[#556179]">
                                        No channels yet. Click "Connect Amazon" to add a channel.
                                      </div>
                                    ) : (
                                      <div className="overflow-x-auto">
                                        <table className="w-full">
                                          <thead>
                                            <tr className="border-b border-gray-200">
                                              <th className="text-left py-2 px-4 text-[11px] font-semibold text-[#556179] uppercase">
                                                Channel Name
                                              </th>
                                              <th className="text-left py-2 px-4 text-[11px] font-semibold text-[#556179] uppercase">
                                                Type
                                              </th>
                                              <th className="text-left py-2 px-4 text-[11px] font-semibold text-[#556179] uppercase">
                                                Created
                                              </th>
                                              <th className="text-right py-2 px-4 text-[11px] font-semibold text-[#556179] uppercase">
                                                Actions
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {channels.map((channel) => (
                                              <tr key={channel.id} className="border-b border-gray-100 hover:bg-white">
                                                <td className="py-3 px-4">
                                                  <button
                                                    onClick={() => navigate(`/accounts/${account.id}/campaigns`)}
                                                    className="text-[14px] text-[#313850] hover:text-[#0066ff] hover:underline cursor-pointer text-left"
                                                  >
                                                    {channel.channel_name}
                                                  </button>
                                                </td>
                                                <td className="py-3 px-4">
                                                  <span className="text-[14px] text-[#556179]">
                                                    {getChannelTypeLabel(channel.channel_type)}
                                                  </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                  <span className="text-[14px] text-[#556179]">
                                                    {formatDate(channel.created_at)}
                                                  </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                  <div className="flex items-center justify-end gap-2">
                                                    {channel.channel_type === 'amazon' && (
                                                      <Button
                                                        onClick={() => navigate(`/channels/${channel.id}/select-profiles`)}
                                                        size="sm"
                                                        variant="outline"
                                                      >
                                                        Profiles
                                                      </Button>
                                                    )}
                                                    <Button
                                                      onClick={() => handleDeleteChannel(account.id, channel.id)}
                                                      size="sm"
                                                      variant="outline"
                                                      disabled={deletingChannelId === channel.id}
                                                    >
                                                      {deletingChannelId === channel.id ? 'Deleting...' : 'Delete'}
                                                    </Button>
                                                  </div>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
