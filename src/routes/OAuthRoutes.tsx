import { Route } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AmazonOAuthCallback } from "../pages/AmazonOAuthCallback";
import { GoogleOAuthCallback } from "../pages/GoogleOAuthCallback";
import { MetaOAuthCallback } from "../pages/MetaOAuthCallback";
import { TikTokOAuthCallback } from "../pages/TikTokOAuthCallback";
import { Auth0Callback } from "../pages/Auth0Callback";

function OAuthRoutes() {
    return (
        <>
            <Route path="/callback" element={<Auth0Callback />} />
            <Route
                path="/amazon-oauth-callback"
                element={
                    <ProtectedRoute>
                        <AmazonOAuthCallback />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/meta-oauth-callback"
                element={
                    <ProtectedRoute>
                        <MetaOAuthCallback />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/google-oauth-callback"
                element={
                    <ProtectedRoute>
                        <GoogleOAuthCallback />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/tiktok-oauth-callback"
                element={
                    <ProtectedRoute>
                        <TikTokOAuthCallback />
                    </ProtectedRoute>
                }
            />
        </>
    );
}

export default OAuthRoutes;
