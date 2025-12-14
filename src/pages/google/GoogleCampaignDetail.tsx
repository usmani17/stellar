import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { Button } from "../../components/ui";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Checkbox } from "../../components/ui/Checkbox";
import { campaignsService } from "../../services/campaigns";

interface GoogleCampaignDetail {
  campaign: {
    id: number;
    campaign_id: number;
    name: string;
    status: string;
    advertising_channel_type: string;
    advertising_channel_sub_type?: string;
    start_date?: string;
    end_date?: string;
    daily_budget: number;
    account_name?: string;
    customer_id?: string;
    last_sync?: string;
  };
  description?: string;
  chart_data?: any[];
}

interface GoogleAdGroup {
  id: number;
  adgroup_id: number;
  name: string;
  status: string;
  ctr?: string;
  spends?: string;
  sales?: string;
  campaign_id?: number;
  campaign_name?: string;
}

interface GoogleAd {
  id: number;
  ad_id: number;
  ad_type?: string;
  status?: string;
  headlines?: any[];
  descriptions?: any[];
  final_urls?: string[];
  campaign_id?: number;
  campaign_name?: string;
  adgroup_id?: number;
  adgroup_name?: string;
}

interface GoogleKeyword {
  id: number;
  keyword_id: number;
  keyword_text?: string;
  match_type?: string;
  status?: string;
  cpc_bid_dollars?: number;
  campaign_id?: number;
  campaign_name?: string;
  adgroup_id?: number;
  adgroup_name?: string;
}

export const GoogleCampaignDetail: React.FC = () => {
  const { accountId, campaignId } = useParams<{
    accountId: string;
    campaignId: string;
  }>();
  const navigate = useNavigate();
  const [isStatusEnabled, setIsStatusEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [campaignDetail, setCampaignDetail] = useState<GoogleCampaignDetail | null>(null);
  const [adgroups, setAdgroups] = useState<GoogleAdGroup[]>([]);
  const [adgroupsLoading, setAdgroupsLoading] = useState(false);
  const [selectedAdGroupIds, setSelectedAdGroupIds] = useState<Set<number>>(new Set());
  const [ads, setAds] = useState<GoogleAd[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [selectedAdIds, setSelectedAdIds] = useState<Set<number>>(new Set());
  const [keywords, setKeywords] = useState<GoogleKeyword[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<Set<number>>(new Set());
  const [syncingAdGroups, setSyncingAdGroups] = useState(false);
  const [syncingAds, setSyncingAds] = useState(false);
  const [syncingKeywords, setSyncingKeywords] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{type: 'adgroups' | 'ads' | 'keywords' | null; message: string | null}>({type: null, message: null});

  const tabs = [
    "Overview",
    "Ad Groups",
    "Ads",
    "Keywords",
  ];

  useEffect(() => {
    if (accountId && campaignId) {
      loadCampaignDetail();
    }
  }, [accountId, campaignId]);

  useEffect(() => {
    if (accountId && campaignId && activeTab === "Ad Groups") {
      loadAdGroups();
    }
  }, [accountId, campaignId, activeTab]);

  useEffect(() => {
    if (accountId && campaignId && activeTab === "Ads") {
      loadAds();
    }
  }, [accountId, campaignId, activeTab]);

  useEffect(() => {
    if (accountId && campaignId && activeTab === "Keywords") {
      loadKeywords();
    }
  }, [accountId, campaignId, activeTab]);

  const loadCampaignDetail = async () => {
    try {
      setLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setLoading(false);
        return;
      }

      const data = await campaignsService.getGoogleCampaignDetail(
        accountIdNum,
        parseInt(campaignId, 10)
      );

      setCampaignDetail(data);
      setIsStatusEnabled(
        data.campaign.status === "ENABLED" || data.campaign.status === "enabled"
      );
    } catch (error) {
      console.error("Failed to load Google campaign detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdGroups = async () => {
    try {
      setAdgroupsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setAdgroupsLoading(false);
        return;
      }

      const data = await campaignsService.getGoogleAdGroups(
        accountIdNum,
        parseInt(campaignId, 10)
      );

      setAdgroups(data.adgroups || []);
    } catch (error) {
      console.error("Failed to load ad groups:", error);
      setAdgroups([]);
    } finally {
      setAdgroupsLoading(false);
    }
  };

  const loadAds = async () => {
    try {
      setAdsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setAdsLoading(false);
        return;
      }

      const data = await campaignsService.getGoogleAds(
        accountIdNum,
        parseInt(campaignId, 10)
      );

      setAds(data.ads || []);
    } catch (error) {
      console.error("Failed to load ads:", error);
      setAds([]);
    } finally {
      setAdsLoading(false);
    }
  };

  const loadKeywords = async () => {
    try {
      setKeywordsLoading(true);
      const accountIdNum = parseInt(accountId!, 10);

      if (isNaN(accountIdNum) || !campaignId) {
        setKeywordsLoading(false);
        return;
      }

      const data = await campaignsService.getGoogleKeywords(
        accountIdNum,
        parseInt(campaignId, 10)
      );

      setKeywords(data.keywords || []);
    } catch (error) {
      console.error("Failed to load keywords:", error);
      setKeywords([]);
    } finally {
      setKeywordsLoading(false);
    }
  };

  const handleSelectAllAdGroups = (checked: boolean) => {
    if (checked) {
      setSelectedAdGroupIds(new Set(adgroups.map((ag) => ag.id)));
    } else {
      setSelectedAdGroupIds(new Set());
    }
  };

  const handleSelectAdGroup = (id: number, checked: boolean) => {
    setSelectedAdGroupIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAllAds = (checked: boolean) => {
    if (checked) {
      setSelectedAdIds(new Set(ads.map((ad) => ad.id)));
    } else {
      setSelectedAdIds(new Set());
    }
  };

  const handleSelectAd = (id: number, checked: boolean) => {
    setSelectedAdIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAllKeywords = (checked: boolean) => {
    if (checked) {
      setSelectedKeywordIds(new Set(keywords.map((kw) => kw.id)));
    } else {
      setSelectedKeywordIds(new Set());
    }
  };

  const handleSelectKeyword = (id: number, checked: boolean) => {
    setSelectedKeywordIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSyncAdGroups = async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncingAdGroups(true);
      setSyncMessage({type: null, message: null});
      const result = await campaignsService.syncGoogleAdGroups(accountIdNum);
      let message = result.message || `Successfully synced ${result.synced} ad groups`;
      
      if (result.errors && result.errors.length > 0) {
        const errorDetails = result.error_details || result.errors;
        const errorText = errorDetails.slice(0, 3).join('; ');
        message += ` Errors: ${errorText}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }
      
      setSyncMessage({type: 'adgroups', message});
      await loadAdGroups();
      
      if (result.synced > 0 && !result.errors) {
        setTimeout(() => setSyncMessage({type: null, message: null}), 5000);
      } else if (result.errors) {
        setTimeout(() => setSyncMessage({type: null, message: null}), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync ad groups:", error);
      const errorMessage = error.response?.data?.error || error.message || "Failed to sync ad groups from Google Ads";
      setSyncMessage({type: 'adgroups', message: errorMessage});
      setTimeout(() => setSyncMessage({type: null, message: null}), 8000);
    } finally {
      setSyncingAdGroups(false);
    }
  };

  const handleSyncAds = async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncingAds(true);
      setSyncMessage({type: null, message: null});
      const result = await campaignsService.syncGoogleAds(accountIdNum);
      let message = result.message || `Successfully synced ${result.synced} ads`;
      
      if (result.errors && result.errors.length > 0) {
        const errorDetails = result.error_details || result.errors;
        const errorText = errorDetails.slice(0, 3).join('; ');
        message += ` Errors: ${errorText}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }
      
      setSyncMessage({type: 'ads', message});
      await loadAds();
      
      if (result.synced > 0 && !result.errors) {
        setTimeout(() => setSyncMessage({type: null, message: null}), 5000);
      } else if (result.errors) {
        setTimeout(() => setSyncMessage({type: null, message: null}), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync ads:", error);
      const errorMessage = error.response?.data?.error || error.message || "Failed to sync ads from Google Ads";
      setSyncMessage({type: 'ads', message: errorMessage});
      setTimeout(() => setSyncMessage({type: null, message: null}), 8000);
    } finally {
      setSyncingAds(false);
    }
  };

  const handleSyncKeywords = async () => {
    if (!accountId) return;
    const accountIdNum = parseInt(accountId, 10);
    if (isNaN(accountIdNum)) return;

    try {
      setSyncingKeywords(true);
      setSyncMessage({type: null, message: null});
      const result = await campaignsService.syncGoogleKeywords(accountIdNum);
      let message = result.message || `Successfully synced ${result.synced} keywords`;
      
      if (result.errors && result.errors.length > 0) {
        const errorDetails = result.error_details || result.errors;
        const errorText = errorDetails.slice(0, 3).join('; ');
        message += ` Errors: ${errorText}`;
        if (result.errors.length > 3) {
          message += ` (and ${result.errors.length - 3} more)`;
        }
      }
      
      setSyncMessage({type: 'keywords', message});
      await loadKeywords();
      
      if (result.synced > 0 && !result.errors) {
        setTimeout(() => setSyncMessage({type: null, message: null}), 5000);
      } else if (result.errors) {
        setTimeout(() => setSyncMessage({type: null, message: null}), 15000);
      }
    } catch (error: any) {
      console.error("Failed to sync keywords:", error);
      const errorMessage = error.response?.data?.error || error.message || "Failed to sync keywords from Google Ads";
      setSyncMessage({type: 'keywords', message: errorMessage});
      setTimeout(() => setSyncMessage({type: null, message: null}), 8000);
    } finally {
      setSyncingKeywords(false);
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
          {/* Campaign Header */}
          <div
            className="border border-[#E8E8E3] rounded-2xl shadow-[0px_8px_20px_0px_rgba(0,0,0,0.06)] mb-4 px-[34px] py-[22px]"
            style={{ backgroundColor: "white" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2.5">
                <h1
                  style={{
                    color: "#072929",
                    fontSize: "28px",
                    fontFamily: "Agrandir",
                    fontWeight: 400,
                    wordWrap: "break-word",
                  }}
                >
                  {loading
                    ? "Loading..."
                    : campaignDetail
                    ? `Campaign - ${campaignDetail.campaign.name}`
                    : "Campaign Not Found"}
                </h1>
                <p
                  className="text-[#808080] text-[16px] leading-[100%]"
                >
                  {loading
                    ? "Loading..."
                    : campaignDetail?.description ||
                      `${campaignDetail?.campaign.advertising_channel_type || 'Campaign'} campaign`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsStatusEnabled(!isStatusEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isStatusEnabled ? "bg-[#136D6D]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isStatusEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-[#808080] text-[16px] leading-[100%]">
                    Status
                  </span>
                </div>
                <Button 
                  variant="primary"
                  onClick={() => navigate(`/accounts/${accountId}/google-campaigns`)}
                >
                  Back to Campaigns
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-[#E6E6E6]">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-[16px] font-medium transition-colors border-b-2 cursor-pointer ${
                  activeTab === tab
                    ? "border-[#136D6D] text-[#136D6D]"
                    : "border-transparent text-[#556179] hover:text-[#072929]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "Overview" && (
            <div className="space-y-6">
              {/* Campaign Info Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#FEFEFB] border border-[#E8E8E3] rounded-xl p-4">
                  <p className="text-[14px] text-[#556179] mb-2">Status</p>
                  {campaignDetail && (
                    <StatusBadge status={campaignDetail.campaign.status} />
                  )}
                </div>
                <div className="bg-[#FEFEFB] border border-[#E8E8E3] rounded-xl p-4">
                  <p className="text-[14px] text-[#556179] mb-2">Channel Type</p>
                  <p className="text-[16px] font-medium text-[#072929]">
                    {campaignDetail?.campaign.advertising_channel_type || "-"}
                  </p>
                </div>
                <div className="bg-[#FEFEFB] border border-[#E8E8E3] rounded-xl p-4">
                  <p className="text-[14px] text-[#556179] mb-2">Daily Budget</p>
                  <p className="text-[16px] font-medium text-[#072929]">
                    ${campaignDetail?.campaign.daily_budget?.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div className="bg-[#FEFEFB] border border-[#E8E8E3] rounded-xl p-4">
                  <p className="text-[14px] text-[#556179] mb-2">Account</p>
                  <p className="text-[16px] font-medium text-[#072929]">
                    {campaignDetail?.campaign.account_name || campaignDetail?.campaign.customer_id || "-"}
                  </p>
                </div>
              </div>

              {/* Dates */}
              {(campaignDetail?.campaign.start_date || campaignDetail?.campaign.end_date) && (
                <div className="bg-[#FEFEFB] border border-[#E8E8E3] rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {campaignDetail.campaign.start_date && (
                      <div>
                        <p className="text-[14px] text-[#556179] mb-2">Start Date</p>
                        <p className="text-[16px] font-medium text-[#072929]">
                          {campaignDetail.campaign.start_date}
                        </p>
                      </div>
                    )}
                    {campaignDetail.campaign.end_date && (
                      <div>
                        <p className="text-[14px] text-[#556179] mb-2">End Date</p>
                        <p className="text-[16px] font-medium text-[#072929]">
                          {campaignDetail.campaign.end_date}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "Ad Groups" && (
            <div className="space-y-4">
              {/* Sync Message */}
              {syncMessage.type === 'adgroups' && syncMessage.message && (
                <div className={`px-4 py-3 rounded-lg text-[14px] ${
                  syncMessage.message.includes("error") || syncMessage.message.includes("Failed")
                    ? "bg-red-50 border border-red-200 text-red-700"
                    : "bg-blue-50 border border-blue-200 text-blue-700"
                }`}>
                  {syncMessage.message}
                </div>
              )}
              
              {/* Header with Sync Button */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[22.4px] font-semibold text-black">Ad Groups</h2>
                <Button
                  onClick={handleSyncAdGroups}
                  disabled={syncingAdGroups}
                  className="px-4 py-2 bg-[#136D6D] text-white rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50"
                >
                  {syncingAdGroups ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      Syncing...
                    </span>
                  ) : (
                    "Sync Ad Groups from Google Ads"
                  )}
                </Button>
              </div>

              <div className="border border-[#E6E6E6] rounded-2xl shadow-[0px_14px_20px_0px_rgba(0,0,0,0.06)] bg-white">
                <div className="flex items-center h-[56px] px-5 border-b border-[#E6E6E6] bg-white">
                <div className="w-[62px] flex items-center justify-center">
                  <Checkbox
                    checked={adgroups.length > 0 && adgroups.every((ag) => selectedAdGroupIds.has(ag.id))}
                    onChange={handleSelectAllAdGroups}
                    size="small"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-[16px] font-medium text-[#072929]">Ad Group Name</p>
                </div>
                <div className="w-[100px] text-center">
                  <p className="text-[16px] font-medium text-[#072929]">Status</p>
                </div>
                <div className="w-[120px] text-center">
                  <p className="text-[16px] font-medium text-[#072929]">CTR</p>
                </div>
                <div className="w-[120px] text-center">
                  <p className="text-[16px] font-medium text-[#072929]">Spends</p>
                </div>
                <div className="w-[120px] text-center">
                  <p className="text-[16px] font-medium text-[#072929]">Sales</p>
                </div>
              </div>
              <div className="divide-y divide-[#E6E6E6]">
                {adgroupsLoading ? (
                  <div className="p-8 text-center text-[#556179]">Loading ad groups...</div>
                ) : adgroups.length > 0 ? (
                  adgroups.map((adgroup) => (
                    <div key={adgroup.id} className="flex items-center h-[56px] px-5">
                      <div className="w-[62px] flex items-center justify-center">
                        <Checkbox
                          checked={selectedAdGroupIds.has(adgroup.id)}
                          onChange={(checked) => handleSelectAdGroup(adgroup.id, checked)}
                          size="small"
                        />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <p className="text-[16px] text-[#072929]">{adgroup.name}</p>
                      </div>
                      <div className="w-[100px] text-center">
                        <StatusBadge status={adgroup.status} />
                      </div>
                      <div className="w-[120px] text-center">
                        <p className="text-[16px] text-[#072929]">{adgroup.ctr || "0%"}</p>
                      </div>
                      <div className="w-[120px] text-center">
                        <p className="text-[16px] text-[#072929]">{adgroup.spends || "$0.00"}</p>
                      </div>
                      <div className="w-[120px] text-center">
                        <p className="text-[16px] text-[#072929]">{adgroup.sales || "$0.00"}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-[#556179]">No ad groups found</div>
                )}
              </div>
              </div>
            </div>
          )}

          {activeTab === "Ads" && (
            <div className="space-y-4">
              {/* Sync Message */}
              {syncMessage.type === 'ads' && syncMessage.message && (
                <div className={`px-4 py-3 rounded-lg text-[14px] ${
                  syncMessage.message.includes("error") || syncMessage.message.includes("Failed")
                    ? "bg-red-50 border border-red-200 text-red-700"
                    : "bg-blue-50 border border-blue-200 text-blue-700"
                }`}>
                  {syncMessage.message}
                </div>
              )}
              
              {/* Header with Sync Button */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[22.4px] font-semibold text-black">Ads</h2>
                <Button
                  onClick={handleSyncAds}
                  disabled={syncingAds}
                  className="px-4 py-2 bg-[#136D6D] text-white rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50"
                >
                  {syncingAds ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      Syncing...
                    </span>
                  ) : (
                    "Sync Ads from Google Ads"
                  )}
                </Button>
              </div>

              <div className="border border-[#E6E6E6] rounded-2xl shadow-[0px_14px_20px_0px_rgba(0,0,0,0.06)] bg-white">
                <div className="flex items-center h-[56px] px-5 border-b border-[#E6E6E6] bg-white">
                <div className="w-[62px] flex items-center justify-center">
                  <Checkbox
                    checked={ads.length > 0 && ads.every((ad) => selectedAdIds.has(ad.id))}
                    onChange={handleSelectAllAds}
                    size="small"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-[16px] font-medium text-[#072929]">Ad Type</p>
                </div>
                <div className="w-[150px]">
                  <p className="text-[16px] font-medium text-[#072929]">Ad Group</p>
                </div>
                <div className="w-[100px] text-center">
                  <p className="text-[16px] font-medium text-[#072929]">Status</p>
                </div>
                <div className="w-[200px]">
                  <p className="text-[16px] font-medium text-[#072929]">Headlines</p>
                </div>
                <div className="w-[200px]">
                  <p className="text-[16px] font-medium text-[#072929]">Final URLs</p>
                </div>
              </div>
              <div className="divide-y divide-[#E6E6E6]">
                {adsLoading ? (
                  <div className="p-8 text-center text-[#556179]">Loading ads...</div>
                ) : ads.length > 0 ? (
                  ads.map((ad) => (
                    <div key={ad.id} className="flex items-center min-h-[56px] px-5 py-3">
                      <div className="w-[62px] flex items-center justify-center">
                        <Checkbox
                          checked={selectedAdIds.has(ad.id)}
                          onChange={(checked) => handleSelectAd(ad.id, checked)}
                          size="small"
                        />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <p className="text-[16px] text-[#072929]">{ad.ad_type || "-"}</p>
                      </div>
                      <div className="w-[150px]">
                        <p className="text-[14px] text-[#556179]">{ad.adgroup_name || "-"}</p>
                      </div>
                      <div className="w-[100px] text-center">
                        {ad.status && <StatusBadge status={ad.status} />}
                      </div>
                      <div className="w-[200px]">
                        <p className="text-[14px] text-[#556179]">
                          {ad.headlines && Array.isArray(ad.headlines) && ad.headlines.length > 0
                            ? ad.headlines.map((h: any) => h.text || h).join(", ")
                            : "-"}
                        </p>
                      </div>
                      <div className="w-[200px]">
                        <p className="text-[14px] text-[#556179] truncate">
                          {ad.final_urls && ad.final_urls.length > 0
                            ? ad.final_urls[0]
                            : "-"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-[#556179]">No ads found</div>
                )}
              </div>
              </div>
            </div>
          )}

          {activeTab === "Keywords" && (
            <div className="space-y-4">
              {/* Sync Message */}
              {syncMessage.type === 'keywords' && syncMessage.message && (
                <div className={`px-4 py-3 rounded-lg text-[14px] ${
                  syncMessage.message.includes("error") || syncMessage.message.includes("Failed")
                    ? "bg-red-50 border border-red-200 text-red-700"
                    : "bg-blue-50 border border-blue-200 text-blue-700"
                }`}>
                  {syncMessage.message}
                </div>
              )}
              
              {/* Header with Sync Button */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[22.4px] font-semibold text-black">Keywords</h2>
                <Button
                  onClick={handleSyncKeywords}
                  disabled={syncingKeywords}
                  className="px-4 py-2 bg-[#136D6D] text-white rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50"
                >
                  {syncingKeywords ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      Syncing...
                    </span>
                  ) : (
                    "Sync Keywords from Google Ads"
                  )}
                </Button>
              </div>

              <div className="border border-[#E6E6E6] rounded-2xl shadow-[0px_14px_20px_0px_rgba(0,0,0,0.06)] bg-white">
                <div className="flex items-center h-[56px] px-5 border-b border-[#E6E6E6] bg-white">
                <div className="w-[62px] flex items-center justify-center">
                  <Checkbox
                    checked={keywords.length > 0 && keywords.every((kw) => selectedKeywordIds.has(kw.id))}
                    onChange={handleSelectAllKeywords}
                    size="small"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-[16px] font-medium text-[#072929]">Keyword</p>
                </div>
                <div className="w-[120px] text-center">
                  <p className="text-[16px] font-medium text-[#072929]">Match Type</p>
                </div>
                <div className="w-[150px]">
                  <p className="text-[16px] font-medium text-[#072929]">Ad Group</p>
                </div>
                <div className="w-[100px] text-center">
                  <p className="text-[16px] font-medium text-[#072929]">Status</p>
                </div>
                <div className="w-[120px] text-center">
                  <p className="text-[16px] font-medium text-[#072929]">CPC Bid</p>
                </div>
              </div>
              <div className="divide-y divide-[#E6E6E6]">
                {keywordsLoading ? (
                  <div className="p-8 text-center text-[#556179]">Loading keywords...</div>
                ) : keywords.length > 0 ? (
                  keywords.map((keyword) => (
                    <div key={keyword.id} className="flex items-center h-[56px] px-5">
                      <div className="w-[62px] flex items-center justify-center">
                        <Checkbox
                          checked={selectedKeywordIds.has(keyword.id)}
                          onChange={(checked) => handleSelectKeyword(keyword.id, checked)}
                          size="small"
                        />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <p className="text-[16px] text-[#072929]">{keyword.keyword_text || "-"}</p>
                      </div>
                      <div className="w-[120px] text-center">
                        <p className="text-[16px] text-[#072929]">{keyword.match_type || "-"}</p>
                      </div>
                      <div className="w-[150px]">
                        <p className="text-[14px] text-[#556179]">{keyword.adgroup_name || "-"}</p>
                      </div>
                      <div className="w-[100px] text-center">
                        {keyword.status && <StatusBadge status={keyword.status} />}
                      </div>
                      <div className="w-[120px] text-center">
                        <p className="text-[16px] text-[#072929]">
                          ${keyword.cpc_bid_dollars?.toFixed(2) || "0.00"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-[#556179]">No keywords found</div>
                )}
              </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
