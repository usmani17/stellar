import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const VerifyEmailBanner: React.FC = () => {
  const { user } = useAuth();

  // Only show for workspace owner when email not yet verified
  const workspace = user?.workspace;
  if (!user || !workspace || workspace.email_verified_at) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-4">
        <div className="flex items-center">
          <svg
            className="h-5 w-5 text-amber-600 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm text-amber-800">
            <strong>Verify your email:</strong> Please check your inbox for the verification link to activate your workspace.
          </p>
        </div>
      </div>
    </div>
  );
};
