import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { DateRangeProvider } from "./contexts/DateRangeContext";
import { AccountsProvider } from "./contexts/AccountsContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
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
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
                path="/reset-password/:token"
                element={<ResetPassword />}
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
              <Route
                path="/accounts/:accountId/channels"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Channels />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounts/:accountId/campaigns"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Campaigns />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounts/:accountId/google-campaigns"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <GoogleCampaigns />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounts/:accountId/google-campaigns/:campaignId"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <GoogleCampaignDetail />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounts/:accountId/campaigns/:campaignId"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <CampaignDetail />
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
            </Routes>
          </Router>
        </AccountsProvider>
      </DateRangeProvider>
    </AuthProvider>
  );
}

export default App;
