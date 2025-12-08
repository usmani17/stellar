import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/accounts');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
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
              Welcome back to PIXIS
            </h2>
            <div className="text-[20px] text-[#808080] leading-normal">
              <p className="mb-0">Sign in to manage your business and stay on top of your</p>
              <p>numbers.</p>
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

              {/* Password Input */}
              <div className="flex flex-col gap-1">
                <label className="text-base font-medium text-black leading-5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Create password"
                  className="w-full h-12 px-3 bg-white border border-[#e6e6e6] rounded-xl text-sm text-[#bfbfbf] placeholder:text-[#bfbfbf] focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                />
                <div className="flex justify-end mt-1">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-forest-f60 hover:text-forest-f50"
                  >
                    Forget Password?
                  </Link>
                </div>
              </div>
            </div>

            {/* Sign In Button */}
            <div className="flex flex-col items-center w-full">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#136d6d] hover:bg-[#0e5a5a] text-white font-semibold text-base px-6 py-5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <p className="text-base text-black">
                Don't have an account?{' '}
                <Link to="/signup" className="font-semibold text-forest-f60 hover:text-forest-f50">
                  Sign up
                </Link>
              </p>
            </div>
          </form>

          {/* Divider and Google Button Section */}
          <div className="flex flex-col gap-16">
            {/* Divider with "or" */}
            <div className="flex items-center gap-2.5">
              <div className="flex-1 h-px bg-[#e6e6e6]"></div>
              <span className="text-sm font-medium text-black">or</span>
              <div className="flex-1 h-px bg-[#e6e6e6]"></div>
            </div>

            {/* Google Button */}
            <button
              type="button"
              onClick={() => {
                // Google OAuth integration would go here
                console.log('Google sign in');
              }}
              className="w-full h-14 bg-white border border-[#e6e6e6] rounded-2xl flex items-center justify-center gap-2.5 hover:bg-sandstorm-s5 transition-colors"
            >
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M30.0014 16.3109C30.0014 15.1598 29.9061 14.3198 29.6998 13.4487H16.2871V18.6442H24.1601C24.0014 19.9354 23.1442 21.8798 21.2394 23.1866L21.2127 23.3604L25.4536 26.58L25.7474 26.6087C28.4458 24.1666 30.0014 20.5732 30.0014 16.3109Z" fill="#4285F4"/>
                  <path d="M16.2863 30C20.1434 30 23.3814 28.7555 25.7466 26.6089L21.2386 23.1866C19.8889 24.011 18.0134 24.5866 16.2863 24.5866C12.5089 24.5866 9.30225 22.1444 8.15928 18.7688L7.99176 18.7822L3.58208 22.1272L3.52441 22.2843C5.87359 26.8577 10.699 30 16.2863 30Z" fill="#34A853"/>
                  <path d="M8.16007 18.7688C7.85807 17.8977 7.68401 16.9643 7.68401 16C7.68401 15.0359 7.85807 14.1025 8.14425 13.2314L8.13623 13.0454L3.67119 9.64739L3.52518 9.71548C2.55696 11.6133 2.00098 13.7445 2.00098 16C2.00098 18.2555 2.55696 20.3867 3.52518 22.2845L8.16007 18.7688Z" fill="#FBBC05"/>
                  <path d="M16.2864 7.41333C18.9689 7.41333 20.7784 8.54885 21.8102 9.49778L25.8239 5.54C23.3658 3.17777 20.1435 2 16.2864 2C10.699 2 5.87359 5.14222 3.52441 9.71556L8.14352 13.2311C9.30252 9.85555 12.5091 7.41333 16.2864 7.41333Z" fill="#EB4335"/>
                </svg>
              </div>
              <span className="text-base text-black">Continue with Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

