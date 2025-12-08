import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from '../components/ui';

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
    <div className="min-h-screen flex items-center justify-center bg-sandstorm-s0 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-h1300 font-bold text-forest-f60 mb-2">Create Account</h1>
          <p className="text-h800 text-forest-f30">Sign up to get started</p>
        </div>

        <div className="bg-white rounded-lg border border-sandstorm-s50 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-h700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                placeholder="John"
              />
              <Input
                label="Last Name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                placeholder="Doe"
              />
            </div>

            <Input
              label="Company Name"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              required
              placeholder="Your Company"
            />

            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="john@example.com"
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Create a password"
            />

            <Input
              label="Confirm Password"
              type="password"
              name="password2"
              value={formData.password2}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-h700 text-forest-f30">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-b10 hover:text-blue-b20 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

