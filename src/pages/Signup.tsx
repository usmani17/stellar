import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  AuthPageLayout,
  AuthHeader,
  AuthFormField,
  AuthButton,
  Alert,
  Divider,
} from "../components/ui";
import auth0Icon from "../assets/images/auth0.svg";

export const Signup: React.FC = () => {
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    company_name: "",
    password: "",
    password2: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, registerWithAuth0 } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.password2) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await register(formData);
      navigate("/accounts");
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.password?.[0] ||
        "Registration failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth0Signup = async () => {
    await registerWithAuth0();
  };

  return (
    <AuthPageLayout showGetStarted={true}>
      <div className="flex flex-col gap-16 w-full">
        {/* Header Section */}
        <div className="flex flex-col gap-4">
          <AuthHeader
            title="Create your Pixis account"
            description="Get started in minutes. Quick setup, powerful insights."
          />
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full">
          {/* Input Fields */}
          <div className="flex flex-col gap-5">
            {error && <Alert variant="error">{error}</Alert>}

            {/* First Name and Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AuthFormField
                label="First Name"
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                placeholder="First name"
              />
              <AuthFormField
                label="Last Name"
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                placeholder="Last name"
              />
            </div>

            {/* Company Name */}
            <AuthFormField
              label="Company Name"
              type="text"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              required
              placeholder="Your company"
            />

            {/* Email Input */}
            <AuthFormField
              label="Email address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />

            {/* Password Input */}
            <AuthFormField
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Create a password"
            />

            {/* Confirm Password Input */}
            <AuthFormField
              label="Confirm Password"
              type="password"
              name="password2"
              value={formData.password2}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
            />
          </div>

          {/* Create Account Button */}
          <div className="flex flex-col items-center w-full">
            <AuthButton loading={loading} loadingText="Creating account...">
              Create account
            </AuthButton>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <p
              className="text-base text-neutral-n1000 capitalize leading-normal"
              className="font-poppins font-normal"
            >
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-forest-f60 hover:text-forest-f50"
                className="font-poppins font-semibold"
              >
                Sign In
              </Link>
            </p>
          </div>
        </form>

        {/* Divider and OAuth Buttons Section */}
        <div className="flex flex-col gap-6 w-full">
          <Divider text="or" />

          <AuthButton
            onClick={handleAuth0Signup}
            variant="oauth"
            type="button"
            className="w-full"
          >
            <div className="flex items-center gap-2">
              <img src={auth0Icon} alt="Auth0" className="w-5 h-5" />
              <span>Create account with Auth0</span>
            </div>
          </AuthButton>
        </div>
      </div>
    </AuthPageLayout>
  );
};
