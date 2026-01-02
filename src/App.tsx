import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "./contexts/AuthContext";
import { DateRangeProvider } from "./contexts/DateRangeContext";
import { AccountsProvider } from "./contexts/AccountsContext";
import { GlobalStateProvider } from "./contexts/GlobalStateContext";
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
import { AdGroups } from "./pages/AdGroups";
import { Keywords } from "./pages/Keywords";
import { Targets } from "./pages/Targets";
import { AmazonOAuthCallback } from "./pages/AmazonOAuthCallback";
import { GoogleOAuthCallback } from "./pages/GoogleOAuthCallback";
import { TikTokOAuthCallback } from "./pages/TikTokOAuthCallback";
import { ConnectTikTok } from "./pages/ConnectTikTok";
import { SelectAmazonProfiles } from "./pages/SelectAmazonProfiles";
import { ListAmazonProfiles } from "./pages/ListAmazonProfiles";
import { SelectGoogleAdsAccounts } from "./pages/SelectGoogleAdsAccounts";
import { GoogleCampaigns } from "./pages/google/GoogleCampaigns";
import { GoogleCampaignDetail } from "./pages/google/GoogleCampaignDetail";
import { GoogleCreateCampaign } from "./pages/google/GoogleCreateCampaign";
import { GoogleAdGroups } from "./pages/google/GoogleAdGroups";
import { GoogleAds } from "./pages/google/GoogleAds";
import { GoogleKeywords } from "./pages/google/GoogleKeywords";
import { TikTokCampaigns } from "./pages/tiktok/TikTokCampaigns";
import { TikTokCampaignDetail } from "./pages/tiktok/TikTokCampaignDetail";
import { TikTokCreateCampaign } from "./pages/tiktok/TikTokCreateCampaign";
import { Auth0Callback } from "./pages/Auth0Callback";
import { ColorExamples } from "./pages/ColorExamples";
import { Dashboards } from "./pages/Dashboards";
import { LogHistory } from "./pages/LogHistory";

function App() {
  return (
    <AuthProvider>
      <DateRangeProvider>
        <AccountsProvider>
          <GlobalStateProvider>
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
                    path="/tiktok-oauth-callback"
                    element={
                      <ProtectedRoute>
                        <TikTokOAuthCallback />
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
                    path="/log-history"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <LogHistory />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/accounts/:accountId/log-history"
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
                    path="/accounts/:accountId/log-history/:campaignId"
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
                  <Route
                    path="/accounts/:accountId/connect-tiktok"
                    element={
                      <ProtectedRoute>
                        <AccountRequiredRoute>
                          <Layout>
                            <ConnectTikTok />
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
                  <Route
                    path="/accounts/:accountId/amazon/adgroups"
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
                    path="/accounts/:accountId/amazon/keywords"
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
                    path="/accounts/:accountId/amazon/targets"
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
                  {/* Google marketplace routes */}
                  <Route
                    path="/accounts/:accountId/google/campaigns/create"
                    element={
                      <ProtectedRoute>
                        <AccountRequiredRoute>
                          <Layout>
                            <GoogleCreateCampaign />
                          </Layout>
                        </AccountRequiredRoute>
                      </ProtectedRoute>
                    }
                  />
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
                  <Route
                    path="/accounts/:accountId/google/adgroups"
                    element={
                      <ProtectedRoute>
                        <AccountRequiredRoute>
                          <Layout>
                            <GoogleAdGroups />
                          </Layout>
                        </AccountRequiredRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/accounts/:accountId/google/ads"
                    element={
                      <ProtectedRoute>
                        <AccountRequiredRoute>
                          <Layout>
                            <GoogleAds />
                          </Layout>
                        </AccountRequiredRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/accounts/:accountId/google/keywords"
                    element={
                      <ProtectedRoute>
                        <AccountRequiredRoute>
                          <Layout>
                            <GoogleKeywords />
                          </Layout>
                        </AccountRequiredRoute>
                      </ProtectedRoute>
                    }
                  />
                  {/* TikTok marketplace routes */}
                  <Route
                    path="/accounts/:accountId/tiktok/campaigns"
                    element={
                      <ProtectedRoute>
                        <AccountRequiredRoute>
                          <Layout>
                            <TikTokCampaigns />
                          </Layout>
                        </AccountRequiredRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/accounts/:accountId/tiktok/campaigns/create"
                    element={
                      <ProtectedRoute>
                        <AccountRequiredRoute>
                          <Layout>
                            <TikTokCreateCampaign />
                          </Layout>
                        </AccountRequiredRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/accounts/:accountId/tiktok/campaigns/:campaignId"
                    element={
                      <ProtectedRoute>
                        <AccountRequiredRoute>
                          <Layout>
                            <TikTokCampaignDetail />
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
              {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
            </SidebarProvider>
          </GlobalStateProvider>
        </AccountsProvider>
      </DateRangeProvider>
    </AuthProvider>
  );
}

export default App;
