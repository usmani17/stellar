import React, { type ReactNode } from "react";
import { GoogleSyncStatusProvider } from "../../contexts/GoogleSyncStatusContext";

interface GoogleSyncStatusWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper component that provides GoogleSyncStatusContext
 * The context itself handles checking for accountId from useParams
 */
export const GoogleSyncStatusWrapper: React.FC<GoogleSyncStatusWrapperProps> = ({
  children,
}) => {
  // Always provide the context - it will handle accountId checking internally
  return (
    <GoogleSyncStatusProvider>
      {children}
    </GoogleSyncStatusProvider>
  );
};
