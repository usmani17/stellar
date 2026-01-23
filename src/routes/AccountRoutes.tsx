import { Navigate, Route } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AccountRequiredRoute } from "../components/auth/AccountRequiredRoute";
import { Layout } from "../components/layout/Layout";
import { Accounts } from "../pages/Accounts";
import { Channels } from "../pages/Channels";
import { ConnectTikTok } from "../pages/ConnectTikTok";
import { Dashboards } from "../pages/Dashboards";
import { LogHistory } from "../pages/LogHistory";
import { Profile } from "../pages/Profile";
import { ColorExamples } from "../pages/ColorExamples";

function AccountRoutes() {
    return (
        <>
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <Navigate to="/accounts" replace />
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
                path="/accounts"
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
                path="/accounts/:accountId/channels"
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
                path="/accounts/:accountId/connect-tiktok"
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
                path="/accounts/:accountId/log-history"
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
                path="/accounts/:accountId/log-history/:campaignId"
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
                            <Navigate to="/accounts" replace />
                        </Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/channels"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <Navigate to="/accounts" replace />
                        </Layout>
                    </ProtectedRoute>
                }
            />
        </>
    );
}

export default AccountRoutes;
