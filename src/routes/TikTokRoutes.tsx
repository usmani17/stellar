import { Route } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AccountRequiredRoute } from "../components/auth/AccountRequiredRoute";
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
                path="/accounts/:accountId/tiktok/campaigns"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <TikTokCampaigns />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/accounts/:accountId/tiktok/campaigns/create"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <TikTokCreateCampaign />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/accounts/:accountId/tiktok/campaigns/:campaignId"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <TikTokCampaignDetail />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/accounts/:accountId/tiktok/adgroups"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <TikTokAdGroups />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/accounts/:accountId/tiktok/ads"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <TikTokAds />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/accounts/:accountId/tiktok/logs"
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
                path="/accounts/:accountId/tiktok/log-history"
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
        </>
    );
}

export default TikTokRoutes;

