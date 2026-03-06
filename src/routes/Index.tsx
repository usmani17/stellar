import { Route, Routes } from "react-router-dom";

import PublicRoutes from "./PublicRoutes";
import OAuthRoutes from "./OAuthRoutes";
import ChannelRoutes from "./ChannelRoutes";
import AccountRoutes from "./AccountRoutes";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { WorkspaceRequiredRoute } from "../components/auth/WorkspaceRequiredRoute";
import { Layout } from "../components/layout/Layout";
import { AssistantPage } from "../pages/AssistantPage";
import AmazonRoutes from "./AmazonRoutes";
import GoogleRoutes from "./GoogleRoutes";
import MetaRoutes from "./MetaRoutes";
import TikTokRoutes from "./TikTokRoutes";
import NotFoundRoutes from "./NotFoundRoutes";
import { AssistantProvider } from "./../contexts/AssistantContext";
import { useParams, Outlet } from "react-router-dom";

export const AssistantWrapper = () => {
    // useParams: accountId/channelId only present on channel-scoped routes (e.g. /brands/:accountId/.../google/:channelId/...)
    const { accountId, channelId } = useParams<{ accountId: string; channelId: string }>();
    return (
        <AssistantProvider accountId={accountId ?? undefined} channelId={channelId ?? undefined}>
            <Outlet />
        </AssistantProvider>
    );
};
function AppRoutes() {
    return (
        <Routes>
            <Route element={<AssistantWrapper />}>
                <Route
                    path="/chat"
                    element={
                        <ProtectedRoute>
                            <WorkspaceRequiredRoute>
                                <Layout>
                                    <AssistantPage />
                                </Layout>
                            </WorkspaceRequiredRoute>
                        </ProtectedRoute>
                    }
                />
                {PublicRoutes()}
                {OAuthRoutes()}
                {ChannelRoutes()}
                {AccountRoutes()}
                {AmazonRoutes()}
                {GoogleRoutes()}
                {MetaRoutes()}
                {TikTokRoutes()}
                {NotFoundRoutes()}
            </Route>
        </Routes>
    );
}

export default AppRoutes;