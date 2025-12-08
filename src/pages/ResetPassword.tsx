import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/auth';
import { Button, Input } from '../components/ui';

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
    <div className="min-h-screen flex items-center justify-center bg-sandstorm-s0 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-h1300 font-bold text-forest-f60 mb-2">Set New Password</h1>
          <p className="text-h800 text-forest-f30">Enter your new password</p>
        </div>

        <div className="bg-white rounded-lg border border-sandstorm-s50 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-h700">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-h700">
                {message}
              </div>
            )}

            <Input
              label="New Password"
              type="password"
              name="new_password"
              value={formData.new_password}
              onChange={handleChange}
              required
              placeholder="Enter new password"
            />

            <Input
              label="Confirm New Password"
              type="password"
              name="new_password2"
              value={formData.new_password2}
              onChange={handleChange}
              required
              placeholder="Confirm new password"
            />

            <Button type="submit" className="w-full" disabled={loading || !!message}>
              {loading ? 'Resetting...' : message ? 'Success!' : 'Reset Password'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-h700 text-blue-b10 hover:text-blue-b20"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

