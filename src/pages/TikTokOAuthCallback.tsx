import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { accountsService } from "../services/accounts";
import { useAccounts } from "../contexts/AccountsContext";

export const TikTokOAuthCallback: React.FC = () => {
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
      // TikTok sends auth_code, not code
      const authCode =
        searchParams.get("auth_code") || searchParams.get("code");
      const errorParam = searchParams.get("error");
      const state = searchParams.get("state");

      // Check for OAuth error
      if (errorParam) {
        setError(`TikTok OAuth error: ${errorParam}`);
        setLoading(false);
        setTimeout(() => {
          navigate("/accounts");
        }, 3000);
        return;
      }

      // Check for authorization code
      if (!authCode) {
        setError("No authorization code received from TikTok");
        setLoading(false);
        setTimeout(() => {
          navigate("/accounts");
        }, 3000);
        return;
      }

      try {
        // Exchange authorization code for tokens
        const channel = await accountsService.handleTikTokOAuthCallback(
          authCode,
          state || undefined
        );

        console.log("TikTok OAuth callback response:", channel);

        // Extract channel ID and redirect to TikTok profiles selection
        const channelId =
          channel?.id ||
          (channel as any)?.id ||
          (channel as any)?.data?.id ||
          null;

        if (channelId) {
          console.log(
            "Redirecting to TikTok advertiser selection for channel:",
            channelId
          );
          // Use window.location for immediate redirect (more reliable than navigate)
          setTimeout(() => {
            window.location.href = `/channels/${channelId}/select-tiktok-profiles`;
          }, 100);
          return;
        } else {
          // Fallback - refresh accounts and navigate there
          await refreshAccounts();
          setLoading(false);
          navigate("/accounts", { replace: true });
        }
      } catch (err: any) {
        console.error("TikTok OAuth callback error:", err);
        setError(
          err.response?.data?.error ||
            err.response?.data?.message ||
            err.message ||
            "Failed to complete TikTok OAuth"
        );
        setLoading(false);
        setTimeout(() => {
          navigate("/accounts");
        }, 5000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshAccounts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#072929] mx-auto mb-4"></div>
          <p className="text-[16px] text-[#072929]">
            Completing TikTok OAuth connection...
          </p>
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
              TikTok OAuth Error
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
