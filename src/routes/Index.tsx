import { Routes } from "react-router-dom";

import PublicRoutes from "./PublicRoutes";
import OAuthRoutes from "./OAuthRoutes";
import ChannelRoutes from "./ChannelRoutes";
import AccountRoutes from "./AccountRoutes";
import AmazonRoutes from "./AmazonRoutes";
import GoogleRoutes from "./GoogleRoutes";
import TikTokRoutes from "./TikTokRoutes";

function AppRoutes() {
    return (
        <Routes>
            {PublicRoutes()}
            {OAuthRoutes()}
            {ChannelRoutes()}
            {AccountRoutes()}
            {AmazonRoutes()}
            {GoogleRoutes()}
            {TikTokRoutes()}
        </Routes>
    );
}

export default AppRoutes;