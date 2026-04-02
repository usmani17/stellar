import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

export const SuperAdminRoute: React.FC<SuperAdminRouteProps> = ({
  children,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user || !user.is_super_admin) {
    return <Navigate to="/chat" replace />;
  }

  return <>{children}</>;
};

