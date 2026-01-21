import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { queryClient } from "../lib/queryClient";
import { accountsService } from "../services/accounts";
import { queryKeys } from "../hooks/queries/queryKeys";
import {
  AuthPageLayout,
  AuthHeader,
  AuthFormField,
  AuthButton,
  Alert,
  Divider,
} from "../components/ui";
import auth0Icon from "../assets/images/auth0.svg";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginWithAuth0 } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ email, password });
      
      // Prefetch accounts data before navigating so they're ready when page loads
      try {
        await queryClient.prefetchQuery({
          queryKey: queryKeys.accounts.lists(),
          queryFn: async () => {
            const data = await accountsService.getAccounts();
            return Array.isArray(data) ? data : [];
          },
        });
      } catch (prefetchError) {
        // If prefetch fails, that's okay - the Accounts page will fetch on mount
        console.warn("Failed to prefetch accounts:", prefetchError);
      }
      
      navigate("/accounts");
    } catch (err: any) {
      // Better error handling - check for axios error structure
      const errorMessage = 
        err?.response?.data?.error || 
        err?.response?.data?.message ||
        err?.message ||
        "Login failed. Please check your email and password.";
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleAuth0Login = async () => {
    await loginWithAuth0();
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
                <p className="mb-0">
                  Sign in to manage your business and stay on top of your
                  numbers.
                </p>
              </>
            }
          />
        </div>
      </div>

      {/* Form Section */}
      <div className="self-stretch flex flex-col justify-start items-start gap-5 sm:gap-6">
        <form
          onSubmit={handleSubmit}
          className="self-stretch flex flex-col justify-start items-start gap-5 sm:gap-6"
        >
          {/* Input Fields */}
          <div className="self-stretch flex flex-col justify-start items-start gap-4 sm:gap-5">
            {error && <Alert variant="error">{error}</Alert>}

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
                      className="text-xs font-semibold font-poppins text-forest-f60 hover:text-forest-f50"
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
            <p className="text-base text-neutral-n1000 capitalize leading-4 tracking-tight font-poppins font-normal">
              <span>Don't have an account?</span>
              <span> </span>
              <Link
                to="/signup"
                className="text-forest-f60 font-semibold font-poppins  leading-4 tracking-tight hover:text-forest-f50"
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
          <AuthButton
            onClick={handleAuth0Login}
            className="self-stretch"
            variant="oauth"
            type="button"
          >
            <div className="flex items-center gap-2">
              <img src={auth0Icon} alt="Auth0" className="w-5 h-5" />
              <span>Sign in with Auth0</span>
            </div>
          </AuthButton>
        </div>
      </div>
    </AuthPageLayout>
  );
};
