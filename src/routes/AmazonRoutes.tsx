import React, { useEffect } from "react";
import { Route, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AccountRequiredRoute } from "../components/auth/AccountRequiredRoute";
import { BrandAccessRoute } from "../components/auth/BrandAccessRoute";
import { WorkspaceRequiredRoute } from "../components/auth/WorkspaceRequiredRoute";
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
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <Campaigns />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/amazon/campaigns/:campaignTypeAndId"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <CampaignDetail />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/amazon/adgroups"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <AdGroups />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/amazon/keywords"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <Keywords />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/amazon/targets"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <Targets />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/amazon/logs"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <LogHistory />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/amazon/log-history"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <LogHistory />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            {/* Legacy routes: redirect old Amazon URLs (no channelId) to new path with channelId */}
            <Route
                path="/campaigns"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <LegacyRedirect pattern="amazon/campaigns" />
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/campaigns"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <LegacyRedirect pattern="amazon/campaigns" />
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/campaigns/:campaignTypeAndId"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <LegacyRedirect pattern="amazon/campaigns/:campaignTypeAndId" />
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/amazon/campaigns"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <AmazonChannelRedirect />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/amazon/campaigns/:campaignTypeAndId"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <AmazonChannelRedirect campaignTypeAndId />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/amazon/adgroups"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <AmazonChannelRedirect entity="adgroups" />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/amazon/keywords"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <AmazonChannelRedirect entity="keywords" />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/amazon/targets"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <AmazonChannelRedirect entity="targets" />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/amazon/logs"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <AmazonChannelRedirect entity="logs" />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/amazon/log-history"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <AmazonChannelRedirect entity="log-history" />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
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
