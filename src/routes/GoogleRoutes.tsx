import { Route } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AccountRequiredRoute } from "../components/auth/AccountRequiredRoute";
import { GoogleSyncStatusWrapper } from "../components/google/GoogleSyncStatusWrapper";
import { LegacyRedirect } from "../components/auth/LegacyRedirect";
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
            <Route
                path="/accounts/:accountId/google/campaigns"
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
                path="/accounts/:accountId/google/campaigns/:campaignId"
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
                path="/accounts/:accountId/google/adgroups"
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
                path="/accounts/:accountId/google/ads"
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
                path="/accounts/:accountId/google/keywords"
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
                path="/accounts/:accountId/google/logs"
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
                path="/accounts/:accountId/google/log-history"
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
            {/* Legacy routes for backward compatibility */}
            <Route
                path="/accounts/:accountId/google-campaigns"
                element={
                    <ProtectedRoute>
                        <LegacyRedirect pattern="google/campaigns" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/accounts/:accountId/google-campaigns/:campaignId"
                element={
                    <ProtectedRoute>
                        <LegacyRedirect pattern="google/campaigns/:campaignId" />
                    </ProtectedRoute>
                }
            />
        </>
    );
}

export default GoogleRoutes;
