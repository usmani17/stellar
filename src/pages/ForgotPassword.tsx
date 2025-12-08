import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth';

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
    <div className="min-h-screen bg-white relative">
      {/* PIXIS Logo at top left */}
      <div className="absolute left-20 top-20 h-9">
        <h1 className="text-3xl font-bold text-forest-f60">PIXIS</h1>
      </div>

      {/* Centered Card Container */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#f5f7fa] border border-[#e6e6e6] rounded-2xl p-10">
        <div className="flex flex-col gap-16 w-[576px]">
          {/* Header Section */}
          <div className="flex flex-col gap-4">
            <h2 className="text-[32px] font-semibold text-[#000205] leading-normal">
              Forget your password?
            </h2>
            <div className="text-[20px] text-[#808080] leading-normal">
              <p className="mb-0">No worries! Enter your email address and we'll send you a link to reset your password.</p>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            {/* Input Fields */}
            <div className="flex flex-col gap-5">
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

              {/* Email Input */}
              <div className="flex flex-col gap-1">
                <label className="text-base font-medium text-black leading-5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  className="w-full h-12 px-3 bg-white border border-[#e6e6e6] rounded-xl text-sm text-[#bfbfbf] placeholder:text-[#bfbfbf] focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                />
              </div>
            </div>

            {/* Send Reset Link Button */}
            <div className="flex flex-col items-center w-full">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#136d6d] hover:bg-[#0e5a5a] text-white font-semibold text-base px-6 py-5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </div>

            {/* Back To Login Link */}
            <div className="text-center">
              <Link
                to="/login"
                className="text-base text-forest-f60 hover:text-forest-f50"
              >
                Back To Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

