import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';

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
              Reset password
            </h2>
            <div className="text-[20px] text-[#808080] leading-normal">
              <p className="mb-0">Enter your new password below to complete the reset process.</p>
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

              {/* Password Input */}
              <div className="flex flex-col gap-1">
                <label className="text-base font-medium text-black leading-5">
                  Password
                </label>
                <input
                  type="password"
                  name="new_password"
                  value={formData.new_password}
                  onChange={handleChange}
                  required
                  placeholder="Enter new password"
                  className="w-full h-12 px-3 bg-white border border-[#e6e6e6] rounded-xl text-sm text-[#bfbfbf] placeholder:text-[#bfbfbf] focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                />
              </div>

              {/* Confirm Password Input */}
              <div className="flex flex-col gap-1">
                <label className="text-base font-medium text-black leading-5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="new_password2"
                  value={formData.new_password2}
                  onChange={handleChange}
                  required
                  placeholder="Confirm new password"
                  className="w-full h-12 px-3 bg-white border border-[#e6e6e6] rounded-xl text-sm text-[#bfbfbf] placeholder:text-[#bfbfbf] focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                />
              </div>
            </div>

            {/* Save Password Button */}
            <div className="flex flex-col items-center w-full">
              <button
                type="submit"
                disabled={loading || !!message}
                className="w-full bg-[#136d6d] hover:bg-[#0e5a5a] text-white font-semibold text-base px-6 py-5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : message ? 'Success!' : 'Save password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

