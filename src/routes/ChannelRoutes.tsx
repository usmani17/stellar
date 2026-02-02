import { Route } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
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
                        <Layout>
                            <SelectGoogleAdsAccounts />
                        </Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/channels/:channelId/select-profiles"
                element={
                    <ProtectedRoute>
                        <SelectAmazonProfiles />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/channels/:channelId/select-tiktok-profiles"
                element={
                    <ProtectedRoute>
                        <SelectTikTokProfiles />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/channels/:channelId/meta-list-profiles"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <MetaListProfiles />
                        </Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/channels/:channelId/list-profiles"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <ListAmazonProfiles />
                        </Layout>
                    </ProtectedRoute>
                }
            />
        </>
    );
}

export default ChannelRoutes;
