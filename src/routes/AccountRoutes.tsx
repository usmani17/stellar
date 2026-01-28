import { Navigate, Route, useParams } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AccountRequiredRoute } from "../components/auth/AccountRequiredRoute";
import { Layout } from "../components/layout/Layout";
import { Accounts } from "../pages/Accounts";
import { AccountProfiles } from "../pages/AccountProfiles";
import { AccountUsers } from "../pages/AccountUsers";
import { Channels } from "../pages/Channels";
import { ConnectTikTok } from "../pages/ConnectTikTok";
import { Dashboards } from "../pages/Dashboards";
import { LogHistory } from "../pages/LogHistory";
import { Profile } from "../pages/Profile";
import { ColorExamples } from "../pages/ColorExamples";

function ChannelsToIntegrationsRedirect() {
    const { accountId } = useParams<{ accountId: string }>();
    return <Navigate to={accountId ? `/brands/${accountId}/integrations` : "/brands"} replace />;
}

function AccountRoutes() {
    return (
        <>
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <Navigate to="/brands" replace />
                        </Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/dashboards"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <Dashboards />
                        </Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <Accounts />
                        </Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/log-history"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <LogHistory />
                        </Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/integrations"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <Channels />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/channels"
                element={
                    <ProtectedRoute>
                        <ChannelsToIntegrationsRedirect />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/profiles"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <AccountProfiles />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/users"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <AccountUsers />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/connect-tiktok"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <ConnectTikTok />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/log-history"
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
                path="/brands/:accountId/log-history/:campaignId"
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
                path="/profile"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <Profile />
                        </Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/color-examples"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <ColorExamples />
                        </Layout>
                    </ProtectedRoute>
                }
            />
            {/* Legacy routes for backward compatibility */}
            <Route
                path="/campaigns"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <Navigate to="/brands" replace />
                        </Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/channels"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <Navigate to="/brands" replace />
                        </Layout>
                    </ProtectedRoute>
                }
            />
        </>
    );
}

export default AccountRoutes;
