import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth';
import { 
  AuthPageLayout, 
  AuthHeader, 
  AuthFormField, 
  AuthButton, 
  Alert 
} from '../components/ui';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await authService.requestPasswordReset(email);
      setMessage('If the email exists, a password reset link has been sent.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout>
      <div className="flex flex-col gap-16 w-full">
        {/* Header Section */}
        <div className="flex flex-col gap-4">
          <AuthHeader
            title="Forget your password?"
            description="No worries! Enter your email address and we'll send you a link to reset your password."
          />
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full">
          {/* Input Fields */}
          <div className="flex flex-col gap-5">
            {error && (
              <Alert variant="error">{error}</Alert>
            )}

            {message && (
              <Alert variant="success">{message}</Alert>
            )}

            {/* Email Input */}
            <AuthFormField
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>

          {/* Send Reset Link Button */}
          <div className="flex flex-col items-center w-full">
            <AuthButton
              loading={loading}
              loadingText="Sending..."
            >
              Send reset link
            </AuthButton>
          </div>

          {/* Back To Login Link */}
          <div className="text-center">
            <Link
              to="/login"
              className="text-base text-forest-f60 hover:text-forest-f50"
              style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
            >
              Back To Login
            </Link>
          </div>
        </form>
      </div>
    </AuthPageLayout>
  );
};

