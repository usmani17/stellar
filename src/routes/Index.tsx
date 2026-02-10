import { Route, Routes } from "react-router-dom";

import PublicRoutes from "./PublicRoutes";
import OAuthRoutes from "./OAuthRoutes";
import ChannelRoutes from "./ChannelRoutes";
import AccountRoutes from "./AccountRoutes";
import AmazonRoutes from "./AmazonRoutes";
import GoogleRoutes from "./GoogleRoutes";
import TikTokRoutes from "./TikTokRoutes";
import NotFoundRoutes from "./NotFoundRoutes";
import { AssistantProvider } from "./../contexts/AssistantContext";
import { useParams, Outlet } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { Layout } from "../components/layout/Layout";
import { AgentChatPage } from "../pages/AgentChatPage";

export const AssistantWrapper = () => {
    // ✅ useParams WORKS here because it's inside <Route>
    const { accountId, channelId } = useParams<{ accountId: string; channelId: string }>();
    if (!accountId || !channelId) {
        return <><Outlet /></>;
    }
    return (
        <AssistantProvider accountId={accountId} channelId={channelId}>
            <Outlet />
        </AssistantProvider>
    );
};
function AppRoutes() {
    return (
        <Routes>
            <Route element={<AssistantWrapper />}>
                {PublicRoutes()}
                {OAuthRoutes()}
                <Route
                    path="/agent"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <AgentChatPage />
                            </Layout>
                        </ProtectedRoute>
                    }
                />
                {ChannelRoutes()}
                {AccountRoutes()}
                {AmazonRoutes()}
                {GoogleRoutes()}
                {TikTokRoutes()}
                {NotFoundRoutes()}
            </Route>
        </Routes>
    );
}

export default AppRoutes;