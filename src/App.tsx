import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { DateRangeProvider } from "./contexts/DateRangeContext";
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
import { SelectAmazonProfiles } from "./pages/SelectAmazonProfiles";
import { Auth0Callback } from "./pages/Auth0Callback";

function App() {
  return (
    <AuthProvider>
      <DateRangeProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
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
              path="/channels/:channelId/select-profiles"
              element={
                <ProtectedRoute>
                  <SelectAmazonProfiles />
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
              path="/accounts/:accountId/channels"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Channels />
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </DateRangeProvider>
    </AuthProvider>
  );
}

export default App;
