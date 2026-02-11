import { Navigate, Route, useParams } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AccountRequiredRoute } from "../components/auth/AccountRequiredRoute";
import { BrandAccessRoute } from "../components/auth/BrandAccessRoute";
import { WorkspaceRequiredRoute } from "../components/auth/WorkspaceRequiredRoute";
import { Layout } from "../components/layout/Layout";
import { Accounts } from "../pages/Accounts";
import { AccountProfiles } from "../pages/AccountProfiles";
import { AccountUsers } from "../pages/AccountUsers";
import { Channels } from "../pages/Channels";
import { ConnectTikTok } from "../pages/ConnectTikTok";
import { Dashboards } from "../pages/Dashboards";
import { LogHistory } from "../pages/LogHistory";
import { Profile } from "../pages/Profile";
import { WorkspaceSettings } from "../pages/WorkspaceSettings";
import { NoWorkspace } from "../pages/NoWorkspace";
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
                        <WorkspaceRequiredRoute>
                            <Layout>
                                <Navigate to="/brands" replace />
                            </Layout>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/dashboards"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <Layout>
                                <Dashboards />
                            </Layout>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <Layout>
                                <Accounts />
                            </Layout>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/log-history"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <Layout>
                                <LogHistory />
                            </Layout>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/drafts"
                element={<Navigate to="/brands" replace />}
            />
            <Route
                path="/drafts/:draftId"
                element={<Navigate to="/brands" replace />}
            />
            <Route
                path="/brands/:accountId/integrations"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <Channels />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/channels"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <ChannelsToIntegrationsRedirect />
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/profiles"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <AccountProfiles />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/users"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <AccountUsers />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/connect-tiktok"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <AccountRequiredRoute>
                                <BrandAccessRoute>
                                    <Layout>
                                        <ConnectTikTok />
                                    </Layout>
                                </BrandAccessRoute>
                            </AccountRequiredRoute>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/log-history"
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
                path="/brands/:accountId/log-history/:campaignId"
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
                path="/no-workspace"
                element={
                    <ProtectedRoute>
                        <NoWorkspace />
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
                path="/workspace/team"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <Layout>
                                <WorkspaceSettings />
                            </Layout>
                        </WorkspaceRequiredRoute>
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
                        <WorkspaceRequiredRoute>
                            <Layout>
                                <Navigate to="/brands" replace />
                            </Layout>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/channels"
                element={
                    <ProtectedRoute>
                        <WorkspaceRequiredRoute>
                            <Layout>
                                <Navigate to="/brands" replace />
                            </Layout>
                        </WorkspaceRequiredRoute>
                    </ProtectedRoute>
                }
            />
        </>
    );
}

export default AccountRoutes;
