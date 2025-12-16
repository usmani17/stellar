import React, { useState, useEffect } from 'react';
import type { AmazonAccount } from '../../services/accounts';
import { accountsService } from '../../services/accounts';
import { Card } from '../ui';
import { Button } from '../ui/Button';

interface AmazonProfile {
  id: number;
  profile_id: string;
  profile_name: string;
  is_selected: boolean;
  country_code?: string;
  currency_code?: string;
  timezone?: string;
  account_info?: {
    type?: string;
    marketplaceStringId?: string;
    validPaymentMethod?: boolean;
    [key: string]: any;
  };
}

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
  const [profiles, setProfiles] = useState<AmazonProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadProfiles();
  }, [account.id]);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await accountsService.getProfiles(account.id);
      setProfiles(data.profiles || []);
      setSelectedCount(data.selected || 0);
      setTotalCount(data.total || 0);
    } catch (error) {
      console.error('Failed to load profiles:', error);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleProfile = async (profileId: string) => {
    const profile = profiles.find(p => p.profile_id === profileId);
    if (!profile) return;

    const newSelectedStatus = !profile.is_selected;
    const selectedIds = profiles
      .filter(p => p.profile_id === profileId ? newSelectedStatus : p.is_selected)
      .map(p => p.profile_id);

    try {
      setSaving(true);
      await accountsService.saveProfiles(account.id, selectedIds);
      await loadProfiles();
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile selection');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="bg-[#FEFEFB]">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-[14px] font-medium text-[#0b0f16] mb-1">
            {account.name}
          </h3>
          {account.amazon_account_id && (
            <p className="text-[14px] text-[#556179] mb-2">
              Account ID: {account.amazon_account_id}
            </p>
          )}
          <p className="text-[12px] text-[#556179] mb-2">
            Connected: {formatDate(account.connected_at)}
          </p>
          {totalCount > 0 && (
            <p className="text-[12px] text-[#556179] font-medium">
              Profiles: {selectedCount} of {totalCount} connected
            </p>
          )}
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

      {loading ? (
        <div className="text-center py-4 text-[12px] text-[#556179]">
          Loading profiles...
        </div>
      ) : profiles.length > 0 ? (
        <div className="space-y-2 border-t border-[#E8E8E3] pt-4">
          {profiles.map((profile) => {
            const profileType = profile.account_info?.type || '';
            const marketplaceId = profile.account_info?.marketplaceStringId || '';
            
            return (
              <div
                key={profile.id}
                className="p-3 rounded-lg hover:bg-gray-50 transition-colors border border-[#E8E8E3]"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={profile.is_selected}
                    onChange={() => toggleProfile(profile.profile_id)}
                    disabled={saving}
                    className="mt-1 w-4 h-4 text-[#072929] border-gray-200 rounded focus:ring-[#072929] cursor-pointer"
                  />
                  <div className="flex-1 cursor-pointer" onClick={() => toggleProfile(profile.profile_id)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-medium text-[#0b0f16]">
                        {profile.profile_name || profile.account_info?.name || profile.profile_id}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#556179]">
                      <span>ID: {profile.profile_id}</span>
                      <span>Name: {profile.profile_name || profile.account_info?.name || 'N/A'}</span>
                      {profileType && <span>Type: {profileType}</span>}
                      {marketplaceId && <span>Marketplace: {marketplaceId}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-4 text-[12px] text-[#556179] border-t border-[#E8E8E3] pt-4">
          No profiles available. Connect profiles after OAuth.
        </div>
      )}
    </Card>
  );
};

