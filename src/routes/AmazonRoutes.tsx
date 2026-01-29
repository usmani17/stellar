import React, { useEffect } from "react";
import { Route, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AccountRequiredRoute } from "../components/auth/AccountRequiredRoute";
import { LegacyRedirect } from "../components/auth/LegacyRedirect";
import { Layout } from "../components/layout/Layout";
import { Campaigns } from "../pages/Campaigns";
import { CampaignDetail } from "../pages/CampaignDetail";
import { AdGroups } from "../pages/AdGroups";
import { Keywords } from "../pages/Keywords";
import { Targets } from "../pages/Targets";
import { LogHistory } from "../pages/LogHistory";
import { accountsService } from "../services/accounts";

function AmazonRoutes() {
    return (
        <>
            <Route
                path="/brands/:accountId/:channelId/amazon/campaigns"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <Campaigns />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/amazon/campaigns/:campaignTypeAndId"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <CampaignDetail />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/amazon/adgroups"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <AdGroups />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/amazon/keywords"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <Keywords />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/amazon/targets"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <Targets />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/amazon/logs"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <LogHistory />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/amazon/log-history"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <LogHistory />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            {/* Legacy routes: redirect old Amazon URLs (no channelId) to new path with channelId */}
            <Route
                path="/campaigns"
                element={
                    <ProtectedRoute>
                        <LegacyRedirect pattern="amazon/campaigns" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/campaigns"
                element={
                    <ProtectedRoute>
                        <LegacyRedirect pattern="amazon/campaigns" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/campaigns/:campaignTypeAndId"
                element={
                    <ProtectedRoute>
                        <LegacyRedirect pattern="amazon/campaigns/:campaignTypeAndId" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/amazon/campaigns"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <AmazonChannelRedirect />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/amazon/campaigns/:campaignTypeAndId"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <AmazonChannelRedirect campaignTypeAndId />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/amazon/adgroups"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <AmazonChannelRedirect entity="adgroups" />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/amazon/keywords"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <AmazonChannelRedirect entity="keywords" />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/amazon/targets"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <AmazonChannelRedirect entity="targets" />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/amazon/logs"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <AmazonChannelRedirect entity="logs" />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/amazon/log-history"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <AmazonChannelRedirect entity="log-history" />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
        </>
    );
}

/** Redirects /brands/:accountId/amazon/... to /brands/:accountId/:channelId/amazon/... using first Amazon channel */
function AmazonChannelRedirect({
    entity = 'campaigns',
    campaignTypeAndId,
}: {
    entity?: string;
    campaignTypeAndId?: boolean;
}) {
    const params = useParams<{ accountId: string; campaignTypeAndId?: string }>();
    const navigate = useNavigate();
    const accountId = params.accountId ? parseInt(params.accountId, 10) : undefined;
    const { data: channels = [] } = useQuery({
        queryKey: ['channels', accountId],
        queryFn: () => (accountId ? accountsService.getAccountChannels(accountId) : Promise.resolve([])),
        enabled: !!accountId,
    });
    const amazonChannel = channels.find((c: { channel_type: string }) => c.channel_type === 'amazon');

    useEffect(() => {
        if (!accountId || !amazonChannel) {
            navigate(accountId ? `/brands/${accountId}/integrations` : '/brands', { replace: true });
            return;
        }
        const base = `/brands/${accountId}/${amazonChannel.id}/amazon/${entity}`;
        const path = campaignTypeAndId && params.campaignTypeAndId
            ? `/brands/${accountId}/${amazonChannel.id}/amazon/campaigns/${params.campaignTypeAndId}`
            : base;
        navigate(path, { replace: true });
    }, [accountId, amazonChannel, entity, campaignTypeAndId, params.campaignTypeAndId, navigate]);

    return null;
}

export default AmazonRoutes;
