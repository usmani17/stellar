import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccounts } from '../contexts/AccountsContext';
import { accountsService, type Channel } from '../services/accounts';
import { channelsService } from '../services/channels';
import { Sidebar } from '../components/layout/Sidebar';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { Button, Card, DeleteConfirmationModal } from '../components/ui';

export const Accounts: React.FC = () => {
  const { accounts, loading: accountsLoading, refreshAccounts } = useAccounts();
  const navigate = useNavigate();
  const location = useLocation();
  const [channelsByAccount, setChannelsByAccount] = useState<Record<number, Channel[]>>({});
  const [expandedAccounts, setExpandedAccounts] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [deletingAccountId, setDeletingAccountId] = useState<number | null>(null);
  const [deletingChannelId, setDeletingChannelId] = useState<number | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<{ accountId: number; provider: 'amazon' | 'google' } | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'account' | 'channel';
    id: number;
    name: string;
    accountId?: number;
  } | null>(null);

  // Refresh accounts when navigating to this page (e.g., after OAuth flow)
  // Use a ref to track if we've already refreshed to prevent infinite loops
  const hasRefreshedRef = useRef<string>('');
  useEffect(() => {
    if (location.pathname === '/accounts') {
      // Only refresh if we haven't already refreshed for this pathname
      const currentKey = `${location.pathname}-${location.search}`;
      if (hasRefreshedRef.current !== currentKey) {
        hasRefreshedRef.current = currentKey;
        refreshAccounts();
      }
    }
  }, [location.pathname, location.search, refreshAccounts]);

  useEffect(() => {
    loadChannels(true); // Show loading on initial load
  }, [accounts]);

  // Note: OAuth callbacks are now handled by dedicated callback pages:
  // - /return for Amazon OAuth
  // - /google-oauth-callback for Google OAuth
  // This keeps the Accounts page clean and provides better separation

  const loadChannels = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Use channels from accounts response if available, otherwise fetch them
      const channelsMap: Record<number, Channel[]> = {};
      const accountsWithChannels = accounts.filter((account: any) => account.channels && Array.isArray(account.channels));
      const accountsWithoutChannels = accounts.filter((account: any) => !account.channels || !Array.isArray(account.channels));
      
      // Use channels from response if available
      accountsWithChannels.forEach((account: any) => {
        channelsMap[account.id] = account.channels;
      });
      
      // Fetch channels for accounts that don't have them (fallback)
      if (accountsWithoutChannels.length > 0) {
        const channelPromises = accountsWithoutChannels.map(async (account) => {
          try {
            const channels = await channelsService.getChannels(account.id);
            return { accountId: account.id, channels: Array.isArray(channels) ? channels : [] };
          } catch (error) {
            console.error(`Failed to load channels for account ${account.id}:`, error);
            return { accountId: account.id, channels: [] };
          }
        });
        
        const channelResults = await Promise.all(channelPromises);
        channelResults.forEach(({ accountId, channels }) => {
          channelsMap[accountId] = channels;
        });
      }
      
      setChannelsByAccount(channelsMap);
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) {
      alert('Please enter an account name');
      return;
    }

    try {
      await accountsService.createAccount({ name: newAccountName.trim() });
      setNewAccountName('');
      setShowCreateAccount(false);
      await refreshAccounts();
      await loadChannels();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create account');
    }
  };

  const handleDeleteAccount = async (id: number) => {
    const account = accounts.find(acc => acc.id === id);
    if (!account) return;
    
    setDeleteModal({
      isOpen: true,
      type: 'account',
      id,
      name: account.name,
    });
  };

  const confirmDeleteAccount = async () => {
    if (!deleteModal || deleteModal.type !== 'account') return;
    
    const id = deleteModal.id;
    setDeleteModal(null);
    setDeletingAccountId(id);
    
    try {
      // Optimistically remove from UI
      const updatedChannels = { ...channelsByAccount };
      delete updatedChannels[id];
      setChannelsByAccount(updatedChannels);
      
      // Perform delete in background
      await accountsService.deleteAccount(id);
      
      // Refresh data silently (no loading state)
      await refreshAccounts();
      await loadChannels(false); // Don't show loading
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account');
      // Reload on error to restore state
      await refreshAccounts();
      await loadChannels(false);
    } finally {
      setDeletingAccountId(null);
    }
  };

  const handleDeleteChannel = async (accountId: number, channelId: number) => {
    const channel = channelsByAccount[accountId]?.find(ch => ch.id === channelId);
    if (!channel) return;
    
    setDeleteModal({
      isOpen: true,
      type: 'channel',
      id: channelId,
      name: channel.channel_name,
      accountId,
    });
  };

  const confirmDeleteChannel = async () => {
    if (!deleteModal || deleteModal.type !== 'channel' || !deleteModal.accountId) return;
    
    const { id: channelId, accountId } = deleteModal;
    setDeleteModal(null);
    setDeletingChannelId(channelId);
    
    try {
      // Optimistically remove from UI
      const updatedChannels = { ...channelsByAccount };
      if (updatedChannels[accountId]) {
        updatedChannels[accountId] = updatedChannels[accountId].filter(ch => ch.id !== channelId);
        setChannelsByAccount(updatedChannels);
      }
      
      // Perform delete in background
      await channelsService.deleteChannel(accountId, channelId);
      
      // Refresh data silently (no loading state)
      await refreshAccounts();
      await loadChannels(false); // Don't show loading
    } catch (error) {
      console.error('Failed to delete channel:', error);
      alert('Failed to delete channel');
      // Reload on error to restore state
      await refreshAccounts();
      await loadChannels(false);
    } finally {
      setDeletingChannelId(null);
    }
  };

  const handleConnectAmazon = async (accountId: number) => {
    setOauthError(null);
    setOauthLoading({ accountId, provider: 'amazon' });

    try {
      const { auth_url } = await accountsService.initiateAmazonOAuth(accountId);
      window.location.href = auth_url;
    } catch (err: any) {
      setOauthError(err.response?.data?.error || 'Failed to initiate Amazon OAuth');
      setOauthLoading(null);
    }
  };

  const handleConnectGoogle = async (accountId: number) => {
    setOauthError(null);
    setOauthLoading({ accountId, provider: 'google' });

    try {
      const { auth_url } = await accountsService.initiateGoogleOAuth(accountId);
      window.location.href = auth_url;
    } catch (err: any) {
      setOauthError(err.response?.data?.error || 'Failed to initiate Google OAuth');
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
    (account.name || '').toLowerCase().includes(searchQuery.toLowerCase())
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

                {(loading || accountsLoading) ? (
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
                              <tr 
                                className={`border-b border-gray-100 hover:bg-gray-50 transition-opacity ${
                                  deletingAccountId === account.id ? 'opacity-50' : ''
                                }`}
                              >
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => toggleAccount(account.id)}
                                      className="text-gray-400 hover:text-gray-600 text-sm"
                                    >
                                      {isExpanded ? '▼' : '▶'}
                                    </button>
                                    <span className="font-medium text-[14px] text-[#313850]">
                                      {account.name}
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
                                      disabled={oauthLoading?.accountId === account.id}
                                    >
                                      {oauthLoading?.accountId === account.id && oauthLoading?.provider === 'amazon' ? 'Connecting...' : 'Connect Amazon'}
                                    </Button>
                                    <Button
                                      onClick={() => handleConnectGoogle(account.id)}
                                      size="sm"
                                      disabled={oauthLoading?.accountId === account.id}
                                    >
                                      {oauthLoading?.accountId === account.id && oauthLoading?.provider === 'google' ? 'Connecting...' : 'Connect Google'}
                                    </Button>
                                    <Button
                                      onClick={() => handleDeleteAccount(account.id)}
                                      size="sm"
                                      variant="outline"
                                      disabled={deletingAccountId === account.id}
                                      className="relative"
                                    >
                                      {deletingAccountId === account.id ? (
                                        <span className="flex items-center gap-2">
                                          <span className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></span>
                                          Deleting...
                                        </span>
                                      ) : (
                                        'Delete'
                                      )}
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
                                              <tr 
                                                key={channel.id} 
                                                className={`border-b border-gray-100 hover:bg-white transition-opacity ${
                                                  deletingChannelId === channel.id ? 'opacity-50' : ''
                                                }`}
                                              >
                                                <td className="py-3 px-4">
                                                  <button
                                                    onClick={() => {
                                                      if (channel.channel_type === 'google') {
                                                        navigate(`/accounts/${account.id}/google-campaigns`);
                                                      } else {
                                                        navigate(`/accounts/${account.id}/campaigns`);
                                                      }
                                                    }}
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
                                                    {channel.channel_type === 'google' && (
                                                      <Button
                                                        onClick={() => navigate(`/channels/${channel.id}/select-google-accounts`)}
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
                                                      className="relative"
                                                    >
                                                      {deletingChannelId === channel.id ? (
                                                        <span className="flex items-center gap-2">
                                                          <span className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></span>
                                                          Deleting...
                                                        </span>
                                                      ) : (
                                                        'Delete'
                                                      )}
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

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal(null)}
          onConfirm={deleteModal.type === 'account' ? confirmDeleteAccount : confirmDeleteChannel}
          title={deleteModal.type === 'account' ? 'Delete Account' : 'Delete Channel'}
          itemName={deleteModal.name}
          itemType={deleteModal.type}
          isLoading={
            (deleteModal.type === 'account' && deletingAccountId === deleteModal.id) ||
            (deleteModal.type === 'channel' && deletingChannelId === deleteModal.id)
          }
        />
      )}
    </div>
  );
};
