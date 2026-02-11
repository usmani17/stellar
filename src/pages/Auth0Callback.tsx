import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export const Auth0Callback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, updateUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      // Get tokens from URL parameters (backend redirects here with tokens)
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Check for errors
      if (errorParam) {
        setError(errorDescription || errorParam);
        setTimeout(() => navigate('/login', { replace: true }), 5000);
        return;
      }

      // If no tokens, this might be a direct visit - redirect to login
      if (!accessToken) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        // Store tokens
        localStorage.setItem('accessToken', accessToken);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        // Fetch user profile from backend
        // The backend will automatically create the user if it doesn't exist
        try {
          const backendUser = await api.get('/users/profile/');
          const userData = backendUser.data;
          
          localStorage.setItem('user', JSON.stringify(userData));
          updateUser(userData);
          
          const redirectTo = sessionStorage.getItem('loginRedirect');
          sessionStorage.removeItem('loginRedirect');
          if (redirectTo) {
            navigate(redirectTo, { replace: true });
            return;
          }
          if (!userData.workspace) {
            navigate('/signup/complete', { replace: true });
            return;
          }
          navigate('/brands', { replace: true });
        } catch (profileError: any) {
          console.error('Error fetching user profile:', profileError);
          
          // Retry with exponential backoff
          const maxRetries = 3;
          const retry = async (retryCount: number) => {
            if (retryCount >= maxRetries) {
              setError('Failed to fetch user profile. Please try logging in again.');
              setTimeout(() => navigate('/login', { replace: true }), 5000);
              return;
            }

            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
            setTimeout(async () => {
              try {
                const backendUser = await api.get('/users/profile/');
                const userData = backendUser.data;
                localStorage.setItem('user', JSON.stringify(userData));
                updateUser(userData);
                const redirectTo = sessionStorage.getItem('loginRedirect');
                sessionStorage.removeItem('loginRedirect');
                if (redirectTo) {
                  navigate(redirectTo, { replace: true });
                  return;
                }
                if (!userData.workspace) {
                  navigate('/signup/complete', { replace: true });
                  return;
                }
                navigate('/brands', { replace: true });
              } catch (retryError) {
                retry(retryCount + 1);
              }
            }, delay);
          };

          if (profileError?.response?.status === 403 || profileError?.response?.status === 401) {
            retry(0);
          } else {
            setError('Failed to fetch user profile. Please try logging in again.');
            setTimeout(() => navigate('/login', { replace: true }), 5000);
          }
        }
      } catch (error) {
        console.error('Error processing Auth0 callback:', error);
        setError('Failed to process authentication. Please try again.');
        setTimeout(() => navigate('/login', { replace: true }), 5000);
      } finally {
        setProcessing(false);
      }
    };

    processCallback();
  }, [searchParams, navigate, updateUser]);

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
          {processing ? 'Processing authentication...' : 'Almost there...'}
        </div>
      </div>
    </div>
  );
};

