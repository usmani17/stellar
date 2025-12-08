import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Signup: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    company_name: '',
    password: '',
    password2: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.password2) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await register(formData);
      navigate('/accounts');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.password?.[0] ||
                          'Registration failed. Please try again.';
      setError(errorMessage);
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
              Create your Pixis account
            </h2>
            <div className="text-[20px] text-[#808080] leading-normal">
              <p className="mb-0">Get started in minutes. Quick setup, powerful insights.</p>
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

              {/* First Name and Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-base font-medium text-black leading-5">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    placeholder="First name"
                    className="w-full h-12 px-3 bg-white border border-[#e6e6e6] rounded-xl text-sm text-[#bfbfbf] placeholder:text-[#bfbfbf] focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-base font-medium text-black leading-5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                    placeholder="Last name"
                    className="w-full h-12 px-3 bg-white border border-[#e6e6e6] rounded-xl text-sm text-[#bfbfbf] placeholder:text-[#bfbfbf] focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                  />
                </div>
              </div>

              {/* Company Name */}
              <div className="flex flex-col gap-1">
                <label className="text-base font-medium text-black leading-5">
                  Company Name
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  required
                  placeholder="Your company"
                  className="w-full h-12 px-3 bg-white border border-[#e6e6e6] rounded-xl text-sm text-[#bfbfbf] placeholder:text-[#bfbfbf] focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                />
              </div>

              {/* Email Input */}
              <div className="flex flex-col gap-1">
                <label className="text-base font-medium text-black leading-5">
                  Email address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
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
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Create a password"
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
                  name="password2"
                  value={formData.password2}
                  onChange={handleChange}
                  required
                  placeholder="Confirm your password"
                  className="w-full h-12 px-3 bg-white border border-[#e6e6e6] rounded-xl text-sm text-[#bfbfbf] placeholder:text-[#bfbfbf] focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                />
              </div>
            </div>

            {/* Create Account Button */}
            <div className="flex flex-col items-center w-full">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#136d6d] hover:bg-[#0e5a5a] text-white font-semibold text-base px-6 py-5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>

            {/* Sign In Link */}
            <div className="text-center">
              <p className="text-base text-black">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-forest-f60 hover:text-forest-f50">
                  Sign In
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

