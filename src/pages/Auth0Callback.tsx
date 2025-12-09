import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

export const Auth0Callback: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // Redirect to accounts page after successful authentication
        navigate('/accounts', { replace: true });
      } else {
        // If not authenticated, redirect to login
        navigate('/login', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading state while processing
  return (
    <div className="min-h-screen flex items-center justify-center bg-sandstorm-s0">
      <div className="text-forest-f60 text-h900">Completing sign in...</div>
    </div>
  );
};

