import { Route } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AccountRequiredRoute } from "../components/auth/AccountRequiredRoute";
import { BrandAccessRoute } from "../components/auth/BrandAccessRoute";
import { WorkspaceRequiredRoute } from "../components/auth/WorkspaceRequiredRoute";
import { GoogleSyncStatusWrapper } from "../components/google/GoogleSyncStatusWrapper";
import { Layout } from "../components/layout/Layout";
import { GoogleCampaigns } from "../pages/google/GoogleCampaigns";
import { GoogleCampaignDetail } from "../pages/google/GoogleCampaignDetail";
import { GoogleAdGroups } from "../pages/google/GoogleAdGroups";
import { GoogleAds } from "../pages/google/GoogleAds";
import { GoogleKeywords } from "../pages/google/GoogleKeywords";
import { LogHistory } from "../pages/LogHistory";
import { DraftsList } from "../pages/DraftsList";
import { DraftDetail } from "../pages/DraftDetail";

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
                                <BrandAccessRoute>
                                    <GoogleSyncStatusWrapper>
                                        <Layout>
                                            <GoogleCampaigns />
                                        </Layout>
                                    </GoogleSyncStatusWrapper>
                                </BrandAccessRoute>
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
                                <BrandAccessRoute>
                                    <GoogleSyncStatusWrapper>
                                        <Layout>
                                            <GoogleCampaignDetail />
                                        </Layout>
                                    </GoogleSyncStatusWrapper>
                                </BrandAccessRoute>
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
                                <BrandAccessRoute>
                                    <GoogleSyncStatusWrapper>
                                        <Layout>
                                            <GoogleAdGroups />
                                        </Layout>
                                    </GoogleSyncStatusWrapper>
                                </BrandAccessRoute>
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
                                <BrandAccessRoute>
                                    <GoogleSyncStatusWrapper>
                                        <Layout>
                                            <GoogleAds />
                                        </Layout>
                                    </GoogleSyncStatusWrapper>
                                </BrandAccessRoute>
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
                                <BrandAccessRoute>
                                    <GoogleSyncStatusWrapper>
                                        <Layout>
                                            <GoogleKeywords />
                                        </Layout>
                                    </GoogleSyncStatusWrapper>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/google/drafts"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <DraftsList />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/:channelId/google/drafts/:draftId"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <DraftDetail />
                                    </Layout>
                                </BrandAccessRoute>
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
                path="/brands/:accountId/:channelId/google/log-history"
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

export default GoogleRoutes;
