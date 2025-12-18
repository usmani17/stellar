import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { DateRangeProvider } from "./contexts/DateRangeContext";
import { AccountsProvider } from "./contexts/AccountsContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PublicRoute } from "./components/auth/PublicRoute";
import { AccountRequiredRoute } from "./components/auth/AccountRequiredRoute";
import { LegacyRedirect } from "./components/auth/LegacyRedirect";
import { Layout } from "./components/layout/Layout";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Accounts } from "./pages/Accounts";
import { Channels } from "./pages/Channels";
import { Campaigns } from "./pages/Campaigns";
import { CampaignDetail } from "./pages/CampaignDetail";
import { AmazonOAuthCallback } from "./pages/AmazonOAuthCallback";
import { GoogleOAuthCallback } from "./pages/GoogleOAuthCallback";
import { SelectAmazonProfiles } from "./pages/SelectAmazonProfiles";
import { ListAmazonProfiles } from "./pages/ListAmazonProfiles";
import { SelectGoogleAdsAccounts } from "./pages/SelectGoogleAdsAccounts";
import { GoogleCampaigns } from "./pages/google/GoogleCampaigns";
import { GoogleCampaignDetail } from "./pages/google/GoogleCampaignDetail";
import { Auth0Callback } from "./pages/Auth0Callback";
import { ColorExamples } from "./pages/ColorExamples";
import { Dashboards } from "./pages/Dashboards";

function App() {
  return (
    <AuthProvider>
      <DateRangeProvider>
        <AccountsProvider>
          <SidebarProvider>
            <Router>
              <Routes>
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
                  path="/reset-password/:token"
                  element={
                    <PublicRoute>
                      <ResetPassword />
                    </PublicRoute>
                  }
                />
                <Route path="/callback" element={<Auth0Callback />} />
                <Route
                  path="/return"
                  element={
                    <ProtectedRoute>
                      <AmazonOAuthCallback />
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
                  path="/channels/:channelId/select-google-accounts"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <SelectGoogleAdsAccounts />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/channels/:channelId/select-profiles"
                  element={
                    <ProtectedRoute>
                      <SelectAmazonProfiles />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/channels/:channelId/list-profiles"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <ListAmazonProfiles />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
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
                {/* Legacy routes - redirect to accounts */}
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
                {/* Account-scoped routes requiring account ID */}
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
                {/* Amazon marketplace routes */}
                <Route
                  path="/accounts/:accountId/amazon/campaigns"
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
                  path="/accounts/:accountId/amazon/campaigns/:campaignTypeAndId"
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
                {/* Google marketplace routes */}
                <Route
                  path="/accounts/:accountId/google/campaigns"
                  element={
                    <ProtectedRoute>
                      <AccountRequiredRoute>
                        <Layout>
                          <GoogleCampaigns />
                        </Layout>
                      </AccountRequiredRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/accounts/:accountId/google/campaigns/:campaignId"
                  element={
                    <ProtectedRoute>
                      <AccountRequiredRoute>
                        <Layout>
                          <GoogleCampaignDetail />
                        </Layout>
                      </AccountRequiredRoute>
                    </ProtectedRoute>
                  }
                />
                {/* Legacy routes for backward compatibility - redirect to new structure */}
                <Route
                  path="/accounts/:accountId/campaigns"
                  element={
                    <ProtectedRoute>
                      <LegacyRedirect pattern="amazon/campaigns" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/accounts/:accountId/google-campaigns"
                  element={
                    <ProtectedRoute>
                      <LegacyRedirect pattern="google/campaigns" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/accounts/:accountId/google-campaigns/:campaignId"
                  element={
                    <ProtectedRoute>
                      <LegacyRedirect pattern="google/campaigns/:campaignId" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/accounts/:accountId/campaigns/:campaignTypeAndId"
                  element={
                    <ProtectedRoute>
                      <LegacyRedirect pattern="amazon/campaigns/:campaignTypeAndId" />
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
              </Routes>
            </Router>
          </SidebarProvider>
        </AccountsProvider>
      </DateRangeProvider>
    </AuthProvider>
  );
}

export default App;
