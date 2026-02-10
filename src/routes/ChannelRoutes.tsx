import { Route } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { WorkspaceRequiredRoute } from "../components/auth/WorkspaceRequiredRoute";
import { Layout } from "../components/layout/Layout";
import { SelectGoogleAdsAccounts } from "../pages/SelectGoogleAdsAccounts";
import { SelectAmazonProfiles } from "../pages/SelectAmazonProfiles";
import { SelectTikTokProfiles } from "../pages/SelectTikTokProfiles";
import { ListAmazonProfiles } from "../pages/ListAmazonProfiles";
import { MetaListProfiles } from "../pages/MetaListProfiles";

function ChannelRoutes() {
    return (
        <>
            <Route
                path="/channels/:channelId/select-google-accounts"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <Layout>
                            <SelectGoogleAdsAccounts />
                        </Layout>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/channels/:channelId/select-profiles"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <SelectAmazonProfiles />
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/channels/:channelId/select-tiktok-profiles"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <SelectTikTokProfiles />
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/channels/:channelId/meta-list-profiles"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <Layout>
                            <MetaListProfiles />
                        </Layout>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/channels/:channelId/list-profiles"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <Layout>
                            <ListAmazonProfiles />
                        </Layout>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
        </>
    );
}

export default ChannelRoutes;
