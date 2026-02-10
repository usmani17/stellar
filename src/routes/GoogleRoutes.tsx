import { Route } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AccountRequiredRoute } from "../components/auth/AccountRequiredRoute";
import { WorkspaceRequiredRoute } from "../components/auth/WorkspaceRequiredRoute";
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
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                            <GoogleSyncStatusWrapper>
                                <Layout>
                                    <GoogleCampaigns />
                                </Layout>
                            </GoogleSyncStatusWrapper>
                        </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/google/campaigns/:campaignId"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                            <GoogleSyncStatusWrapper>
                                <Layout>
                                    <GoogleCampaignDetail />
                                </Layout>
                            </GoogleSyncStatusWrapper>
                        </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/google/adgroups"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                            <GoogleSyncStatusWrapper>
                                <Layout>
                                    <GoogleAdGroups />
                                </Layout>
                            </GoogleSyncStatusWrapper>
                        </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/google/ads"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                            <GoogleSyncStatusWrapper>
                                <Layout>
                                    <GoogleAds />
                                </Layout>
                            </GoogleSyncStatusWrapper>
                        </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/google/keywords"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                            <GoogleSyncStatusWrapper>
                                <Layout>
                                    <GoogleKeywords />
                                </Layout>
                            </GoogleSyncStatusWrapper>
                        </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/google/logs"
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
                path="/brands/:accountId/:channelId/google/log-history"
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

export default GoogleRoutes;
