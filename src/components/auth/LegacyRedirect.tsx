import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

interface LegacyRedirectProps {
  pattern: string;
}

export const LegacyRedirect: React.FC<LegacyRedirectProps> = ({ pattern }) => {
  const params = useParams();
  const accountId = params.accountId;
  const campaignId = params.campaignId;
  const campaignTypeAndId = params.campaignTypeAndId;
  
  let redirectPath = `/accounts/${accountId}/${pattern}`;
  if (campaignId) {
    redirectPath = redirectPath.replace(':campaignId', campaignId);
  }
  if (campaignTypeAndId) {
    redirectPath = redirectPath.replace(':campaignTypeAndId', campaignTypeAndId);
  }
  
  return <Navigate to={redirectPath} replace />;
};

