import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { accountsService } from "../services/accounts";

export const AmazonOAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");
      const state = searchParams.get("state");

      // Check for OAuth error
      if (errorParam) {
        setError(`Amazon OAuth error: ${errorParam}`);
        setLoading(false);
        // Redirect to accounts after 3 seconds
        setTimeout(() => {
          navigate("/accounts");
        }, 3000);
        return;
      }

      // Check for authorization code
      if (!code) {
        setError("No authorization code received from Amazon");
        setLoading(false);
        // Redirect to accounts after 3 seconds
        setTimeout(() => {
          navigate("/accounts");
        }, 3000);
        return;
      }

      try {
        // Exchange authorization code for tokens
        const account = await accountsService.handleAmazonOAuthCallback(
          code,
          state || undefined
        );

        console.log("OAuth callback response:", account);
        console.log("Account type:", typeof account);
        console.log("Account keys:", account ? Object.keys(account) : "null");

        // Always redirect to profile selection after OAuth (since we always need to select profiles)
        // Try multiple ways to get the account ID
        const accountId =
          account?.id ||
          (account as any)?.id ||
          (account as any)?.data?.id ||
          null;

        console.log("Extracted account ID:", accountId);

        if (accountId) {
          console.log(
            "Redirecting to profile selection for account:",
            accountId
          );
          // Use window.location for immediate redirect (more reliable than navigate)
          // Small delay to ensure state is saved
          setTimeout(() => {
            window.location.href = `/accounts/${accountId}/select-profiles`;
          }, 100);
          return;
        } else {
          // Fallback - redirect to accounts page if no account ID
          console.error("No account ID in response:", account);
          console.error(
            "Full response structure:",
            JSON.stringify(account, null, 2)
          );
          setError(
            "Account created but unable to redirect to profile selection. Please check the accounts page."
          );
          setLoading(false);
          setTimeout(() => {
            navigate("/accounts", { replace: true });
          }, 3000);
        }
      } catch (err: any) {
        console.error("OAuth callback error:", err);
        console.error("Error response:", err.response?.data);
        console.error("Error stack:", err.stack);
        setError(
          err.response?.data?.error || "Failed to complete Amazon OAuth"
        );
        setLoading(false);
        // Redirect to accounts after 3 seconds
        setTimeout(() => {
          navigate("/accounts");
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        {loading && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#072929] mx-auto mb-4"></div>
            <p className="text-[16px] text-[#072929]">
              Completing Amazon OAuth connection...
            </p>
          </>
        )}
        {error && (
          <>
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-4 max-w-md mx-auto">
              <p className="text-[14px] font-medium mb-2">OAuth Error</p>
              <p className="text-[14px]">{error}</p>
            </div>
            <p className="text-[14px] text-[#556179]">
              Redirecting to accounts page...
            </p>
          </>
        )}
      </div>
    </div>
  );
};
