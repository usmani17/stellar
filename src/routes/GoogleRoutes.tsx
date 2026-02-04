import { Route } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AccountRequiredRoute } from "../components/auth/AccountRequiredRoute";
import { GoogleSyncStatusWrapper } from "../components/google/GoogleSyncStatusWrapper";
import { Layout } from "../components/layout/Layout";
import { GoogleCampaigns } from "../pages/google/GoogleCampaigns";
import { GoogleCampaignDetail } from "../pages/google/GoogleCampaignDetail";
import { GoogleAdGroups } from "../pages/google/GoogleAdGroups";
import { GoogleAds } from "../pages/google/GoogleAds";
import { GoogleKeywords } from "../pages/google/GoogleKeywords";
import { LogHistory } from "../pages/LogHistory";

function GoogleRoutes() {
    return (
        <>
            {/* Routes with channelId - use /brands/:accountId/:channelId/google/logs (sidebar links already use full URL) */}
            <Route
                path="/brands/:accountId/:channelId/google/campaigns"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <GoogleSyncStatusWrapper>
                                <Layout>
                                    <GoogleCampaigns />
                                </Layout>
                            </GoogleSyncStatusWrapper>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/google/campaigns/:campaignId"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <GoogleSyncStatusWrapper>
                                <Layout>
                                    <GoogleCampaignDetail />
                                </Layout>
                            </GoogleSyncStatusWrapper>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/google/adgroups"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <GoogleSyncStatusWrapper>
                                <Layout>
                                    <GoogleAdGroups />
                                </Layout>
                            </GoogleSyncStatusWrapper>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/google/ads"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <GoogleSyncStatusWrapper>
                                <Layout>
                                    <GoogleAds />
                                </Layout>
                            </GoogleSyncStatusWrapper>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/google/keywords"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <GoogleSyncStatusWrapper>
                                <Layout>
                                    <GoogleKeywords />
                                </Layout>
                            </GoogleSyncStatusWrapper>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/google/logs"
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
                path="/brands/:accountId/:channelId/google/log-history"
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

export default GoogleRoutes;
