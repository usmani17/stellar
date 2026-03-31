import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { Sidebar } from "../layout/Sidebar";
import { AccountsHeader } from "../layout/AccountsHeader";
import { useSidebar } from "../../contexts/SidebarContext";
import { Loader } from "../ui";

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
const BrandAccessLoading: React.FC = () => {
  const { sidebarWidth } = useSidebar();
  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <div className="flex-1 w-full" style={{ marginLeft: `${sidebarWidth}px` }}>
        <AccountsHeader />
        <div className="px-4 py-6 sm:px-6 lg:p-8 bg-white min-h-[calc(100vh-64px)] flex items-center justify-center">
          <Loader size="lg" message="Loading..." />
        </div>
      </div>
    </div>
  );
};

export const BrandAccessRoute: React.FC<BrandAccessRouteProps> = ({
  children,
}) => {
  const { accountId: accountIdParam, channelId: channelIdParam } = useParams<{
    accountId?: string;
    channelId?: string;
  }>();
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">("loading");

  const accountId =
    accountIdParam != null ? parseInt(accountIdParam, 10) : null;
  const channelId =
    channelIdParam != null ? parseInt(channelIdParam, 10) : null;
  const hasValidAccount = accountId != null && !isNaN(accountId);
  const hasValidChannel =
    channelId != null && !isNaN(channelId) && hasValidAccount;

  useEffect(() => {
    let cancelled = false;

    if (!hasValidAccount) {
      queueMicrotask(() => {
        if (!cancelled) setStatus("allowed");
      });
      return () => { cancelled = true; };
    }

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
    return <BrandAccessLoading />;
  }

  if (status === "denied") {
    // Redirect without passing accessError so Brands/Users pages stay clean (message only on Integrations/Profiles)
    return <Navigate to="/brands" replace state={{}} />;
  }

  return <>{children}</>;
};
