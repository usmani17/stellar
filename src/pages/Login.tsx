import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  AuthPageLayout, 
  AuthHeader, 
  AuthFormField, 
  AuthButton, 
  Alert, 
  Divider, 
  GoogleButton 
} from '../components/ui';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithAuth0, loginWithGoogle } = useAuth();
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

  const handleAuth0Login = async () => {
    await loginWithAuth0();
  };

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
  };

  return (
    <AuthPageLayout>
      {/* Header Section */}
      <div className="self-stretch flex flex-col justify-start items-start gap-4 sm:gap-6">
        <div className="self-stretch flex flex-col justify-start items-start gap-3 sm:gap-4">
          <AuthHeader
            title="Welcome back to PIXIS"
            description={
              <>
                <p className="mb-0">Sign in to manage your business and stay on top of your numbers.</p>
              </>
            }
          />
        </div>
      </div>

      {/* Form Section */}
      <div className="self-stretch flex flex-col justify-start items-start gap-5 sm:gap-6">
        <form onSubmit={handleSubmit} className="self-stretch flex flex-col justify-start items-start gap-5 sm:gap-6">
          {/* Input Fields */}
          <div className="self-stretch flex flex-col justify-start items-start gap-4 sm:gap-5">
            {error && (
              <Alert variant="error">{error}</Alert>
            )}

            {/* Email Input */}
            <div className="self-stretch inline-flex justify-start items-start">
              <AuthFormField
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                containerClassName="flex-1"
              />
            </div>

            {/* Password Input */}
            <div className="self-stretch inline-flex justify-start items-start">
              <AuthFormField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Create password"
                containerClassName="flex-1"
                helperText={
                  <div className="self-stretch text-right">
                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold text-forest-f60 hover:text-forest-f50 focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:ring-offset-2 rounded transition-all cursor-pointer"
                      style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}
                    >
                      Forget Password?
                    </Link>
                  </div>
                }
              />
            </div>
          </div>

          {/* Sign In Button */}
          <div className="self-stretch flex flex-col justify-start items-center">
            <AuthButton
              loading={loading}
              loadingText="Signing in..."
              className="self-stretch"
            >
              Sign in
            </AuthButton>
          </div>

          {/* Sign Up Link */}
          <div className="self-stretch text-center">
            <p 
              className="text-sm sm:text-base text-neutral-n1000 capitalize leading-tight sm:leading-4 tracking-tight"
              style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
            >
              <span>Don't have an account?</span>
              <span> </span>
              <Link 
                to="/signup" 
                className="text-forest-f60 font-semibold uppercase leading-tight sm:leading-4 tracking-tight hover:text-forest-f50 focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:ring-offset-2 rounded transition-all cursor-pointer"
                style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}
              >
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>

      {/* Divider and OAuth Buttons Section */}
      <div className="self-stretch flex flex-col justify-start items-start gap-5 sm:gap-6">
        <Divider text="or" />
        
        <div className="self-stretch flex flex-col justify-start items-start gap-4 sm:gap-5">
          <GoogleButton
            onClick={handleGoogleLogin}
            className="self-stretch"
          >
            Continue with Google
          </GoogleButton>
          
          <AuthButton
            onClick={handleAuth0Login}
            className="self-stretch"
            variant="oauth"
            type="button"
          >
            Sign in with Auth0
          </AuthButton>
        </div>
      </div>
    </AuthPageLayout>
  );
};
