import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface WorkspaceRequiredRouteProps {
  children: React.ReactNode;
}

/**
 * Requires user to have a workspace. Redirects to /no-workspace if not assigned.
 * Use inside ProtectedRoute (user is already authenticated).
 */
export const WorkspaceRequiredRoute: React.FC<WorkspaceRequiredRouteProps> = ({
  children,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sandstorm-s0">
        <div className="text-forest-f60 text-h900">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.workspace) {
    return <Navigate to="/no-workspace" replace />;
  }

  return <>{children}</>;
};
