import { Login } from "../pages/Login";
import { CampaignFormTestPage, ChatFormTestPage, TestAIChatToolsPage } from "../pages/test-ai-chat";
import { Signup } from "../pages/Signup";
import { ForgotPassword } from "../pages/ForgotPassword";
import { ResetPassword } from "../pages/ResetPassword";
import { VerifyEmail } from "../pages/VerifyEmail";
import { PublicRoute } from "../components/auth/PublicRoute";
import { Route } from "react-router-dom";

function PublicRoutes() {
    return (
        <>
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                }
            />
            <Route
                path="/signup"
                element={
                    <PublicRoute>
                        <Signup />
                    </PublicRoute>
                }
            />
            <Route
                path="/forgot-password"
                element={
                    <PublicRoute>
                        <ForgotPassword />
                    </PublicRoute>
                }
            />
            <Route
                path="/reset-password/:uid/:token"
                element={
                    <PublicRoute>
                        <ResetPassword />
                    </PublicRoute>
                }
            />
            <Route
                path="/reset-password/:token"
                element={
                    <PublicRoute>
                        <ResetPassword />
                    </PublicRoute>
                }
            />
            <Route
                path="/verify-email/:uid/:token"
                element={<VerifyEmail />}
            />
            <Route
                path="/test-campaign-form"
                element={<CampaignFormTestPage />}
            />
            <Route
                path="/test-chat-form"
                element={<ChatFormTestPage />}
            />
            <Route
                path="/test-ai-chat-tools"
                element={<TestAIChatToolsPage />}
            />
        </>
    );
}
export default PublicRoutes;