import { Route } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AccountRequiredRoute } from "../components/auth/AccountRequiredRoute";
import { BrandAccessRoute } from "../components/auth/BrandAccessRoute";
import { WorkspaceRequiredRoute } from "../components/auth/WorkspaceRequiredRoute";
import { Layout } from "../components/layout/Layout";
import { MetaCampaigns } from "../pages/meta/MetaCampaigns";
import { MetaCampaignDetail } from "../pages/meta/MetaCampaignDetail";
import { MetaAdSets } from "../pages/meta/MetaAdSets";
import { MetaAdsetDetail } from "../pages/meta/MetaAdsetDetail";
import { MetaAds } from "../pages/meta/MetaAds";
import { MetaAdDetail } from "../pages/meta/MetaAdDetail";
import { MetaCreatives } from "../pages/meta/MetaCreatives";

function MetaRoutes() {
    return (
        <>
            <Route
                path="/brands/:accountId/:channelId/meta/campaigns"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <MetaCampaigns />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/meta/campaigns/:campaignId"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <MetaCampaignDetail />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/meta/adsets"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <MetaAdSets />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/meta/adsets/:adsetId"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <MetaAdsetDetail />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/meta/ads"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <MetaAds />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/meta/ads/:adId"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <MetaAdDetail />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/meta/creatives"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <MetaCreatives />
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

export default MetaRoutes;
