import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { accountsService } from "../services/accounts";

export const ConnectTikTok: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!accountId) {
      setError("Account ID is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await accountsService.initiateTikTokOAuth(
        parseInt(accountId)
      );
      
      // Redirect to TikTok authorization page
      window.location.href = response.auth_url;
    } catch (err: any) {
      console.error("Failed to initiate TikTok OAuth:", err);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to connect to TikTok"
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#072929] mb-2">
            Connect TikTok Account
          </h1>
          <p className="text-[#556179] text-sm">
            Connect your TikTok Business account to manage your advertising campaigns
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full bg-[#072929] hover:bg-[#0a3a3a] text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
                <span>Connect to TikTok</span>
              </>
            )}
          </button>

          <button
            onClick={() => navigate("/accounts")}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            By connecting, you authorize us to access your TikTok Business account
            for campaign management and reporting purposes.
          </p>
        </div>
      </div>
    </div>
  );
};

