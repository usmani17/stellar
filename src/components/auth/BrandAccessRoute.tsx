import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import api from "../../services/api";

interface BrandAccessRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard that enforces the same ACL as backend middleware.
 * For URLs like /brands/60/72/amazon/campaigns (accountId=60, channelId=72),
 * calls the backend; backend ACL returns 403 if user (by role) has no access.
 * - Owner: full access
 * - Manager: only if assigned to account (AccountManager)
 * - Team: only if assigned to channel (ChannelTeamMember) for channel-scoped routes
 */
export const BrandAccessRoute: React.FC<BrandAccessRouteProps> = ({
  children,
}) => {
  const { accountId: accountIdParam, channelId: channelIdParam } = useParams<{
    accountId?: string;
    channelId?: string;
  }>();
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const accountId =
    accountIdParam != null ? parseInt(accountIdParam, 10) : null;
  const channelId =
    channelIdParam != null ? parseInt(channelIdParam, 10) : null;
  const hasValidAccount = accountId != null && !isNaN(accountId);
  const hasValidChannel =
    channelId != null && !isNaN(channelId) && hasValidAccount;

  useEffect(() => {
    if (!hasValidAccount) {
      setStatus("allowed");
      return;
    }

    let cancelled = false;

    const check = async () => {
      try {
        if (hasValidChannel) {
          await api.get(`/accounts/${accountId}/channels/${channelId}/`);
        } else {
          await api.get(`/accounts/${accountId}/`);
        }
        if (!cancelled) {
          setStatus("allowed");
        }
      } catch (err: any) {
        if (cancelled) return;
        const statusCode = err.response?.status;
        const data = err.response?.data;
        const message =
          typeof data?.error === "string"
            ? data.error
            : "You do not have access to this brand or integration.";
        setErrorMessage(message);
        if (statusCode === 403 || statusCode === 404) {
          setStatus("denied");
        } else {
          setStatus("allowed");
        }
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [hasValidAccount, hasValidChannel, accountId, channelId]);

  if (!hasValidAccount) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return <div className="min-h-screen bg-[#fefefb]" />;
  }

  if (status === "denied") {
    return (
      <Navigate
        to="/brands"
        replace
        state={{ accessError: errorMessage || "You do not have access to this brand or integration." }}
      />
    );
  }

  return <>{children}</>;
};
