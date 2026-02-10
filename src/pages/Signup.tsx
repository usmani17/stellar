import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { authService } from "../services/auth";
import {
  AuthPageLayout,
  AuthHeader,
  AuthFormField,
  AuthButton,
  Alert,
  Divider,
  Dropdown,
} from "../components/ui";
import auth0Icon from "../assets/images/auth0.svg";

export const Signup: React.FC = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? "";
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    company_name: "",
    role: "",
    team_size: "",
    password: "",
    password2: "",
  });
  const [inviteDetails, setInviteDetails] = useState<{
    email: string;
    workspace_name: string;
    role: string;
  } | null>(null);
  const [inviteError, setInviteError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, registerWithAuth0 } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (inviteToken) {
      authService
        .getInviteDetails(inviteToken)
        .then((data) => {
          setInviteDetails(data);
          setFormData((prev) => ({ ...prev, email: data.email }));
        })
        .catch(() => {
          setInviteError("Invalid or expired invite link.");
        });
    }
  }, [inviteToken]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (value: string) => {
    setFormData({ ...formData, role: value });
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
      const payload: Parameters<typeof register>[0] = {
        ...formData,
        company_name: inviteToken ? "" : formData.company_name,
      };
      if (inviteToken) {
        payload.invite_token = inviteToken;
      }
      await register(payload);
      navigate("/brands");
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.email?.[0] ||
        err.response?.data?.password?.[0] ||
        err.response?.data?.invite_token?.[0] ||
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
    <AuthPageLayout showGetStarted={!inviteToken}>
      <div className="flex flex-col gap-16 w-full">
        {/* Header Section */}
        <div className="flex flex-col gap-4">
          <AuthHeader
            title={inviteToken ? "Join workspace" : "Start your free Prism account"}
            description={
              inviteDetails
                ? `You're joining "${inviteDetails.workspace_name}" as ${inviteDetails.role}.`
                : "Get started in minutes. Quick setup, powerful insights."
            }
          />
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full">
          {/* Input Fields */}
          <div className="flex flex-col gap-5">
            {(error || inviteError) && <Alert variant="error">{error || inviteError}</Alert>}

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

            {/* Company Name - hide for invite signup */}
            {!inviteToken && (
              <AuthFormField
                label="Workspace Name"
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                required
                placeholder="Enter your organization name"
              />
            )}

            {/* Role - hide for invite signup */}
            {!inviteToken && (
            <div className="flex-1 inline-flex flex-col justify-start items-start gap-1 w-full">
              <label className="justify-center text-black text-base font-medium leading-5 font-poppins pb-1">
                What best describes your role
              </label>
              <Dropdown
                options={[
                  { value: "Founder/CEO", label: "Founder/CEO" },
                  { value: "Marketing Manager", label: "Marketing Manager" },
                  { value: "Media Buyer", label: "Media Buyer" },
                  { value: "Agency", label: "Agency" },
                  { value: "Other", label: "Other" },
                ]}
                value={formData.role || undefined}
                placeholder="Select your role"
                onChange={handleRoleChange}
                buttonClassName="w-full !h-12 min-h-[3rem] px-3 py-2 bg-[#FEFEFB] !rounded-xl border border-sandstorm-s40 text-sm text-neutral-n1000 font-poppins justify-between"
              />
            </div>
            )}

            {/* Team Size - hide for invite signup */}
            {!inviteToken && (
            <div className="flex-1 inline-flex flex-col justify-start items-start gap-1 w-full">
              <label className="justify-center text-black text-base font-medium leading-5 font-poppins pb-1">
                Team Size
              </label>
              <div className="flex flex-nowrap gap-0 rounded-xl border border-sandstorm-s40 overflow-hidden bg-[#FEFEFB] w-full">
                {[
                  { value: "1-50", label: "1-50" },
                  { value: "50-100", label: "50-100" },
                  { value: "100-500", label: "100-500" },
                  { value: "500+", label: "500+" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex-1 flex-shrink-0 px-4 py-3 cursor-pointer text-center text-sm font-poppins transition-colors whitespace-nowrap ${
                      formData.team_size === opt.value
                        ? "bg-forest-f60 text-white"
                        : "text-neutral-n1000 hover:bg-sandstorm-s20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="team_size"
                      value={opt.value}
                      checked={formData.team_size === opt.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            )}

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

          {/* Create Workspace Button */}
          <div className="flex flex-col items-center w-full">
            <AuthButton loading={loading} loadingText="Creating account...">
              Create workspace
            </AuthButton>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-base text-neutral-n1000 capitalize leading-normal font-poppins font-normal">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-forest-f60 hover:text-forest-f50 font-poppins"
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
