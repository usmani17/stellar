import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth';
import { Button, Input } from '../components/ui';

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
    <div className="min-h-screen flex items-center justify-center bg-sandstorm-s0 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-h1300 font-bold text-forest-f60 mb-2">Reset Password</h1>
          <p className="text-h800 text-forest-f30">Enter your email to receive a reset link</p>
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
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
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

