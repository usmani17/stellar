import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { accountsService } from "../services/accounts";

export const MetaOAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) {
      return;
    }

    const handleCallback = async () => {
      hasProcessedRef.current = true;
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");
      const state = searchParams.get("state");

      if (errorParam) {
        setError(`Meta OAuth error: ${errorParam}`);
        setLoading(false);
        setTimeout(() => {
          navigate("/brands");
        }, 3000);
        return;
      }

      if (!code) {
        setError("No authorization code received from Meta");
        setLoading(false);
        setTimeout(() => {
          navigate("/brands");
        }, 3000);
        return;
      }

      try {
        const channel = await accountsService.handleMetaOAuthCallback(
          code,
          state || undefined
        );

        const channelId = (channel as any)?.id;
        const accountId =
          (channel as any)?.account_id ??
          (channel as any)?.account ??
          null;

        if (channelId) {
          localStorage.setItem(
            "channel_created_success",
            JSON.stringify({
              message: "Meta channel connected successfully! Select your ad accounts.",
              type: "success",
            })
          );
          setTimeout(() => {
            window.location.href = `/channels/${channelId}/meta-list-profiles`;
          }, 100);
          return;
        }

        if (accountId) {
          localStorage.setItem(
            "channel_created_success",
            JSON.stringify({
              message: "Meta channel connected successfully!",
              type: "success",
            })
          );
          setTimeout(() => {
            window.location.href = `/brands/${accountId}/integrations`;
          }, 100);
          return;
        }

        setError(
          "Channel created but unable to redirect. Please check the integrations page."
        );
        setLoading(false);
        setTimeout(() => {
          navigate("/brands", { replace: true });
        }, 3000);
      } catch (err: any) {
        console.error("Meta OAuth callback error:", err);
        setError(
          err.response?.data?.error || "Failed to complete Meta OAuth"
        );
        setLoading(false);
        setTimeout(() => {
          navigate("/brands");
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
              Completing Meta OAuth connection...
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
