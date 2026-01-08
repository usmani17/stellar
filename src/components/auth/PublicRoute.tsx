import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * PublicRoute component that redirects authenticated users away from public pages
 * (like login, signup) to the dashboard/accounts page
 */
export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sandstorm-s0">
        <div className="text-forest-f60 text-h900">Loading...</div>
      </div>
    );
  }

  // If user is authenticated, redirect to accounts page
  if (user) {
    return <Navigate to="/accounts" replace />;
  }

  // User is not authenticated, show the public page
  return <>{children}</>;
};




