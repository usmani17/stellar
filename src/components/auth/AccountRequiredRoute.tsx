import React from "react";
import { useLocation } from "react-router-dom";
import { getAccountIdFromUrl } from "../../utils/urlHelpers";
import { SelectBrandRequiredModal } from "../ui/SelectBrandRequiredModal";
import { Layout } from "../layout/Layout";

interface AccountRequiredRouteProps {
  children: React.ReactNode;
}

export const AccountRequiredRoute: React.FC<AccountRequiredRouteProps> = ({
  children,
}) => {
  const location = useLocation();
  const accountId = getAccountIdFromUrl(location.pathname);

  if (!accountId) {
    // Show popup forcing user to select a brand first
    const returnUrl = location.pathname + location.search;
    return (
      <Layout>
        <div className="min-h-screen bg-white" />
        <SelectBrandRequiredModal
          isOpen={true}
          returnUrl={returnUrl}
        />
      </Layout>
    );
  }

  return <>{children}</>;
};
