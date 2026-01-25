import { Route } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AccountRequiredRoute } from "../components/auth/AccountRequiredRoute";
import { LegacyRedirect } from "../components/auth/LegacyRedirect";
import { Layout } from "../components/layout/Layout";
import { Campaigns } from "../pages/Campaigns";
import { CampaignDetail } from "../pages/CampaignDetail";
import { AdGroups } from "../pages/AdGroups";
import { Keywords } from "../pages/Keywords";
import { Targets } from "../pages/Targets";
import { LogHistory } from "../pages/LogHistory";

function AmazonRoutes() {
    return (
        <>
            <Route
                path="/brands/:accountId/amazon/campaigns"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <Campaigns />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/amazon/campaigns/:campaignTypeAndId"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <CampaignDetail />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/amazon/adgroups"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <AdGroups />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/amazon/keywords"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <Keywords />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/amazon/targets"
                element={
                    <ProtectedRoute>
                        <AccountRequiredRoute>
                            <Layout>
                                <Targets />
                            </Layout>
                        </AccountRequiredRoute>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/amazon/logs"
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
                path="/brands/:accountId/amazon/log-history"
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
                path="/campaigns"
                element={
                    <ProtectedRoute>
                        <LegacyRedirect pattern="amazon/campaigns" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/campaigns"
                element={
                    <ProtectedRoute>
                        <LegacyRedirect pattern="amazon/campaigns" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/brands/:accountId/campaigns/:campaignTypeAndId"
                element={
                    <ProtectedRoute>
                        <LegacyRedirect pattern="amazon/campaigns/:campaignTypeAndId" />
                    </ProtectedRoute>
                }
            />
        </>
    );
}

export default AmazonRoutes;
