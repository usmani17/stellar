import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * PublicRoute component that redirects authenticated users away from public pages
 * (like login, signup) to the dashboard/accounts page.
 * Note: verify-email is NOT wrapped in PublicRoute - users may be logged in when
 * clicking the link from their email and must be able to complete verification.
 */
export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sandstorm-s0">
        {/* <Loader size="md" message="Loading..." /> */}
      </div>
    );
  }

  // If user is authenticated, redirect to brands page
  if (user) {
    return <Navigate to="/brands" replace />;
  }

  // User is not authenticated, show the public page
  return <>{children}</>;
};






