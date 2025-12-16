import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAccountIdFromUrl } from '../../utils/urlHelpers';

interface AccountRequiredRouteProps {
  children: React.ReactNode;
}

export const AccountRequiredRoute: React.FC<AccountRequiredRouteProps> = ({ children }) => {
  const location = useLocation();
  const accountId = getAccountIdFromUrl(location.pathname);

  if (!accountId) {
    // Store the intended destination so we can redirect back after account selection
    const returnUrl = location.pathname + location.search;
    return <Navigate to={`/accounts?returnUrl=${encodeURIComponent(returnUrl)}`} replace />;
  }

  return <>{children}</>;
};

