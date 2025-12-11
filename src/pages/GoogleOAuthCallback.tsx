import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { accountsService } from "../services/accounts";
import { useAccounts } from "../contexts/AccountsContext";

export const GoogleOAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshAccounts } = useAccounts();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasProcessedRef = useRef(false); // Prevent duplicate processing

  useEffect(() => {
    // Prevent React strict mode from calling this twice
    if (hasProcessedRef.current) {
      return;
    }

    const handleCallback = async () => {
      hasProcessedRef.current = true;
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");
      const state = searchParams.get("state");

      // Check for OAuth error
      if (errorParam) {
        setError(`Google OAuth error: ${errorParam}`);
        setLoading(false);
        setTimeout(() => {
          navigate("/accounts");
        }, 3000);
        return;
      }

      // Check for authorization code
      if (!code) {
        setError("No authorization code received from Google");
        setLoading(false);
        setTimeout(() => {
          navigate("/accounts");
        }, 3000);
        return;
      }

      try {
        // Exchange authorization code for tokens
        const response = await accountsService.handleGoogleOAuthCallback(
          code,
          state || undefined
        );

        console.log("Google OAuth callback response:", response);

        // Check if there's an error (e.g., no Google Ads accounts)
        if (response.error) {
          setError(
            response.message || response.error || "No Google Ads accounts found for this Google account"
          );
          setLoading(false);
          setTimeout(() => {
            navigate("/accounts", { replace: true });
          }, 5000);
          return;
        }

        // Check if account selection is needed
        if (response.needs_account_selection && response.id) {
          // Refresh accounts to show the new channel
          await refreshAccounts();
          // Redirect to account selection page with channelId (like Amazon)
          setLoading(false);
          navigate(`/channels/${response.id}/select-google-accounts`, { replace: true });
        } else {
          // Channel created directly (shouldn't happen with new flow)
          await refreshAccounts();
          setLoading(false);
          navigate("/accounts", { replace: true });
        }
      } catch (err: any) {
        console.error("Google OAuth callback error:", err);
        setError(
          err.response?.data?.error ||
            err.response?.data?.message ||
            err.message ||
            "Failed to complete Google OAuth"
        );
        setLoading(false);
        setTimeout(() => {
          navigate("/accounts", { replace: true });
        }, 5000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Completing Google OAuth...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Google OAuth Error
            </h2>
            <p className="text-red-600 mb-4">{error}</p>
            <p className="text-sm text-gray-600">
              Redirecting to accounts page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

