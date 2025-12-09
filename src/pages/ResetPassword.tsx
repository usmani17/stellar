import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { 
  AuthPageLayout, 
  AuthHeader, 
  AuthFormField, 
  AuthButton, 
  Alert 
} from '../components/ui';

export const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    new_password: '',
    new_password2: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uid, setUid] = useState('');

  useEffect(() => {
    if (token) {
      // Token format: uid/token
      const parts = token.split('/');
      if (parts.length >= 2) {
        setUid(parts[0]);
      } else {
        // If only token provided, try to extract from URL
        const urlParams = new URLSearchParams(window.location.search);
        const uidParam = urlParams.get('uid');
        if (uidParam) {
          setUid(uidParam);
        }
      }
    }
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (formData.new_password !== formData.new_password2) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Invalid reset token');
      return;
    }

    setLoading(true);

    try {
      const tokenPart = token.includes('/') ? token.split('/')[1] : token;
      const uidPart = uid || (token.includes('/') ? token.split('/')[0] : '');
      
      await authService.confirmPasswordReset(
        tokenPart,
        uidPart,
        formData.new_password,
        formData.new_password2
      );
      setMessage('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
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
            title="Reset password"
            description="Enter your new password below to complete the reset process."
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

            {/* Password Input */}
            <AuthFormField
              label="Password"
              type="password"
              name="new_password"
              value={formData.new_password}
              onChange={handleChange}
              required
              placeholder="Enter new password"
            />

            {/* Confirm Password Input */}
            <AuthFormField
              label="Confirm Password"
              type="password"
              name="new_password2"
              value={formData.new_password2}
              onChange={handleChange}
              required
              placeholder="Confirm new password"
            />
          </div>

          {/* Save Password Button */}
          <div className="flex flex-col items-center w-full">
            <AuthButton
              loading={loading}
              loadingText="Saving..."
              disabled={loading || !!message}
            >
              {message ? 'Success!' : 'Save password'}
            </AuthButton>
          </div>
        </form>
      </div>
    </AuthPageLayout>
  );
};

