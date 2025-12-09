import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../contexts/AuthContext';

export const Auth0Callback: React.FC = () => {
  const { isAuthenticated, isLoading: auth0Loading } = useAuth0();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [hasWaited, setHasWaited] = useState(false);

  useEffect(() => {
    // Wait for Auth0 to finish loading
    if (auth0Loading) {
      return;
    }

    // If not authenticated with Auth0, redirect to login
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    // Wait for AuthContext to finish syncing user with backend
    // The AuthContext will call getProfile() which creates the user if needed
    if (authLoading) {
      // Still loading, wait
      return;
    }

    // If we have a user, redirect to accounts
    if (user && user.id) {
      navigate('/accounts', { replace: true });
      return;
    }

    // If no user after loading completes, wait a bit more for the sync
    // This handles the case where getProfile() is still in progress
    if (!hasWaited) {
      setHasWaited(true);
      const timeout = setTimeout(() => {
        // Check again after waiting
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData && userData.id) {
              navigate('/accounts', { replace: true });
              return;
            }
          } catch (e) {
            console.error('Error parsing stored user:', e);
          }
        }
        
        // If still no user, show error
        setError('Failed to sync user with backend. Please check the console for errors.');
        setTimeout(() => navigate('/login', { replace: true }), 5000);
      }, 3000); // Wait 3 seconds for backend sync

      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, auth0Loading, authLoading, user, navigate, hasWaited]);

  // Show loading state while processing
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sandstorm-s0">
        <div className="text-red-600 text-h900 p-4">
          <div>{error}</div>
          <div className="text-sm mt-2">Redirecting to login...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sandstorm-s0">
      <div className="text-forest-f60 text-h900">
        <div>Completing sign in...</div>
        <div className="text-sm mt-2 text-forest-f40">
          {authLoading ? 'Syncing with backend...' : 'Almost there...'}
        </div>
      </div>
    </div>
  );
};

