import { Route } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AccountRequiredRoute } from "../components/auth/AccountRequiredRoute";
import { BrandAccessRoute } from "../components/auth/BrandAccessRoute";
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
                                <BrandAccessRoute>
                                    <Layout>
                                        <TikTokCampaigns />
                                    </Layout>
                                </BrandAccessRoute>
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
                                <BrandAccessRoute>
                                    <Layout>
                                        <TikTokCreateCampaign />
                                    </Layout>
                                </BrandAccessRoute>
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
                                <BrandAccessRoute>
                                    <Layout>
                                        <TikTokCampaignDetail />
                                    </Layout>
                                </BrandAccessRoute>
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
                                <BrandAccessRoute>
                                    <Layout>
                                        <TikTokAdGroups />
                                    </Layout>
                                </BrandAccessRoute>
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
                                <BrandAccessRoute>
                                    <Layout>
                                        <TikTokAds />
                                    </Layout>
                                </BrandAccessRoute>
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
                path="/brands/:accountId/tiktok/log-history"
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
        </>
    );
}

export default TikTokRoutes;

