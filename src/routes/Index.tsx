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

export const AssistantWrapper = () => {
    // ✅ useParams WORKS here because it's inside <Route>
    const { accountId, channelId } = useParams<{ accountId: string; channelId: string }>();
    if (!accountId || !channelId) {
        return <><Outlet /></>;
    }
    return (
        <AssistantProvider accountId={parseInt(accountId)} channelId={parseInt(channelId)}>
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