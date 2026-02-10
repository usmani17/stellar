import { Route } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AccountRequiredRoute } from "../components/auth/AccountRequiredRoute";
import { WorkspaceRequiredRoute } from "../components/auth/WorkspaceRequiredRoute";
import { Layout } from "../components/layout/Layout";
import { TikTokCampaigns } from "../pages/tiktok/TikTokCampaigns";
import { TikTokCampaignDetail } from "../pages/tiktok/TikTokCampaignDetail";
import { TikTokCreateCampaign } from "../pages/tiktok/TikTokCreateCampaign";
import { TikTokAdGroups } from "../pages/tiktok/TikTokAdGroups";
import { TikTokAds } from "../pages/tiktok/TikTokAds";
import { LogHistory } from "../pages/LogHistory";

function TikTokRoutes() {
    return (
        <>
            <Route
                path="/brands/:accountId/tiktok/campaigns"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                            <Layout>
                                <TikTokCampaigns />
                            </Layout>
                        </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/tiktok/campaigns/create"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                            <Layout>
                                <TikTokCreateCampaign />
                            </Layout>
                        </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/tiktok/campaigns/:campaignId"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                            <Layout>
                                <TikTokCampaignDetail />
                            </Layout>
                        </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/tiktok/adgroups"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                            <Layout>
                                <TikTokAdGroups />
                            </Layout>
                        </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/tiktok/ads"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                            <Layout>
                                <TikTokAds />
                            </Layout>
                        </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/tiktok/logs"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                            <Layout>
                                <LogHistory />
                            </Layout>
                        </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/tiktok/log-history"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                            <Layout>
                                <LogHistory />
                            </Layout>
                        </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
        </>
    );
}

export default TikTokRoutes;

