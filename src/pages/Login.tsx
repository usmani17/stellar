import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from '../components/ui';

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
    <div className="min-h-screen flex items-center justify-center bg-sandstorm-s0 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-h1300 font-bold text-forest-f60 mb-2">Welcome Back</h1>
          <p className="text-h800 text-forest-f30">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-lg border border-sandstorm-s50 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-h700">
                {error}
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

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />

            <div className="flex items-center justify-between">
              <Link
                to="/forgot-password"
                className="text-h700 text-blue-b10 hover:text-blue-b20"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-h700 text-forest-f30">
              Don't have an account?{' '}
              <Link to="/signup" className="text-blue-b10 hover:text-blue-b20 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

